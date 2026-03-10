import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Accept either: service_role key, anon key (from pg_cron), or INTERNAL_TICK_SECRET
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const tickSecret = Deno.env.get("INTERNAL_TICK_SECRET") || "";

  let callerUserId: string | null = null;

  // If called with a real user token (not anon key), extract user_id to filter
  if (token && token !== anonKey && token !== serviceRoleKey && token !== tickSecret) {
    try {
      const anonClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      if (user) callerUserId = user.id;
    } catch {}
  }

  try {
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // If called from cron (anon key), process ALL configs. If from user, filter by user.
    let query = serviceClient
      .from("report_wa_configs")
      .select("user_id, device_id, group_id, group_name, toggle_campaigns, toggle_warmup, toggle_instances, alert_disconnect, alert_campaign_end, alert_high_failures, connection_status, warmup_group_id, warmup_group_name, campaigns_group_id, campaigns_group_name, connection_group_id, connection_group_name")
      .not("device_id", "is", null);

    if (callerUserId) {
      query = query.eq("user_id", callerUserId);
    }

    const { data: configs } = await query;

    if (!configs || configs.length === 0) {
      console.log(`[report-wa-cron] No configs found${callerUserId ? ` for user ${callerUserId}` : ""}`);
      return new Response(JSON.stringify({ message: "No configs to check" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[report-wa-cron] Processing ${configs.length} config(s)`);

    async function getDeviceCredentials(deviceId: string, userId: string) {
      const { data: device } = await serviceClient
        .from("devices")
        .select("uazapi_token, uazapi_base_url, name, number")
        .eq("id", deviceId)
        .eq("user_id", userId)
        .single();
      if (!device) return null;
      const baseUrl = (device.uazapi_base_url || "").replace(/\/+$/, "");
      const apiToken = device.uazapi_token || "";
      if (!baseUrl || !apiToken) return null;
      return { baseUrl, token: apiToken, device };
    }

    async function uazapiRequest(baseUrl: string, apiToken: string, path: string, method = "GET", reqBody?: unknown) {
      const headers: Record<string, string> = { token: apiToken, Accept: "application/json" };
      if (reqBody) headers["Content-Type"] = "application/json";
      const opts: RequestInit = { method, headers };
      if (reqBody) opts.body = JSON.stringify(reqBody);
      let res = await fetch(`${baseUrl}${path}`, opts);
      if (res.status === 405 && method === "POST") {
        res = await fetch(`${baseUrl}${path}`, { method: "GET", headers: { token: apiToken, Accept: "application/json" } });
      }
      return res;
    }

    async function sendToGroup(creds: { baseUrl: string; token: string }, groupId: string, message: string): Promise<boolean> {
      if (!groupId) {
        console.log(`[report-wa-cron] sendToGroup: no groupId provided`);
        return false;
      }
      console.log(`[report-wa-cron] sendToGroup: attempting to send to ${groupId} via ${creds.baseUrl}`);
      const sendAttempts = [
        { path: "/send/text", body: { number: groupId, text: message } },
        { path: "/chat/send-text", body: { to: groupId, body: message } },
        { path: "/message/sendText", body: { chatId: groupId, text: message } },
        { path: "/message/sendText", body: { to: groupId, text: message } },
      ];
      for (const attempt of sendAttempts) {
        try {
          console.log(`[report-wa-cron] trying ${attempt.path}...`);
          const res = await uazapiRequest(creds.baseUrl, creds.token, attempt.path, "POST", attempt.body);
          const rawText = await res.text();
          console.log(`[report-wa-cron] ${attempt.path} status=${res.status} response=${rawText.substring(0, 300)}`);
          let data: any = {};
          try { data = JSON.parse(rawText); } catch {}
          // Check for actual success indicators
          if (res.status >= 200 && res.status < 300) {
            if (data.error || data.code === 404) {
              console.log(`[report-wa-cron] ${attempt.path} returned error in body, trying next...`);
              continue;
            }
            // Check if there's a message ID or key indicating actual delivery
            const hasMessageId = data.id || data.key?.id || data.messageId || data.message?.id || data.result?.id;
            if (hasMessageId) {
              console.log(`[report-wa-cron] ✅ Message sent successfully via ${attempt.path}, messageId present`);
              return true;
            }
            // If status=true or sent=true
            if (data.status === true || data.sent === true || data.success === true) {
              console.log(`[report-wa-cron] ✅ Message sent successfully via ${attempt.path}, status flag true`);
              return true;
            }
            // Fallback: if 200 and no error, consider success
            console.log(`[report-wa-cron] ✅ Message sent via ${attempt.path} (200 OK, no error)`);
            return true;
          }
        } catch (e) {
          console.log(`[report-wa-cron] ${attempt.path} exception: ${e instanceof Error ? e.message : e}`);
        }
      }
      console.log(`[report-wa-cron] ❌ All send attempts failed for group ${groupId}`);
      return false;
    }

    async function wasRecentlySent(userId: string, pattern: string, minutesAgo = 5): Promise<boolean> {
      const since = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
      const { data } = await serviceClient
        .from("report_wa_logs")
        .select("id")
        .eq("user_id", userId)
        .ilike("message", pattern)
        .gte("created_at", since)
        .limit(1);
      return !!(data && data.length > 0);
    }

    async function logEvent(userId: string, level: string, message: string) {
      await serviceClient.from("report_wa_logs").insert({ user_id: userId, level, message });
    }

    const now = new Date();
    const nowBRT = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    let totalSent = 0;

    for (const config of configs) {
      const creds = await getDeviceCredentials(config.device_id!, config.user_id);
      if (!creds) continue;
      if (config.connection_status !== "connected") continue;

      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // ═══ CONNECTION ALERTS — now handled INSTANTLY by sync-devices ═══
      // The cron no longer sends connection/disconnection alerts.
      // They are sent in real-time from the sync-devices function.

      // ═══ CAMPAIGN ALERTS → campaigns_group_id ═══
      if (config.toggle_campaigns) {
        const campaignsGroupId = config.campaigns_group_id || config.group_id;
        if (campaignsGroupId) {
          // Started campaigns
          const { data: startedCampaigns } = await serviceClient
            .from("campaigns")
            .select("id, name, status, total_contacts, started_at, updated_at")
            .eq("user_id", config.user_id)
            .eq("status", "sending")
            .gte("started_at", fiveMinAgo);

          for (const camp of (startedCampaigns || [])) {
            const alreadySent = await wasRecentlySent(config.user_id, `%campanha%${camp.name}%iniciada%`);
            if (!alreadySent) {
              const msg = `📣 CAMPANHA INICIADA\n\nCampanha: ${camp.name}\n\n👥 Total de contatos: ${camp.total_contacts || 0}\n\n⏱ Início: ${nowBRT}\n\nO envio de mensagens foi iniciado.`;
              const sent = await sendToGroup(creds, campaignsGroupId, msg);
              if (sent) totalSent++;
              await logEvent(config.user_id, "INFO", `Campanha "${camp.name}" iniciada — alerta enviado`);
            }
          }

          // Paused campaigns
          const { data: pausedCampaigns } = await serviceClient
            .from("campaigns")
            .select("id, name, status, sent_count, total_contacts, updated_at")
            .eq("user_id", config.user_id)
            .eq("status", "paused")
            .gte("updated_at", fiveMinAgo);

          for (const camp of (pausedCampaigns || [])) {
            const alreadySent = await wasRecentlySent(config.user_id, `%campanha%${camp.name}%pausada%`);
            if (!alreadySent) {
              const msg = `⏸ CAMPANHA PAUSADA\n\nCampanha: ${camp.name}\n\n📊 Progresso:\n✅ Enviadas: ${camp.sent_count || 0}/${camp.total_contacts || 0}\n\n⏱ Horário: ${nowBRT}\n\nA campanha foi pausada pelo operador.`;
              const sent = await sendToGroup(creds, campaignsGroupId, msg);
              if (sent) totalSent++;
              await logEvent(config.user_id, "INFO", `Campanha "${camp.name}" pausada — alerta enviado`);
            }
          }

          // Completed/failed campaigns
          const { data: finishedCampaigns } = await serviceClient
            .from("campaigns")
            .select("id, name, status, sent_count, delivered_count, failed_count, total_contacts, started_at, completed_at, updated_at")
            .eq("user_id", config.user_id)
            .in("status", ["completed", "failed"])
            .gte("updated_at", fiveMinAgo);

          for (const camp of (finishedCampaigns || [])) {
            const statusLabel = camp.status === "completed" ? "FINALIZADA" : "ERRO";
            const alreadySent = await wasRecentlySent(config.user_id, `%campanha%${camp.name}%${statusLabel.toLowerCase()}%`);
            if (!alreadySent) {
              const pending = Math.max(0, (camp.total_contacts || 0) - (camp.sent_count || 0) - (camp.failed_count || 0));
              let duration = "";
              if (camp.started_at && camp.completed_at) {
                const diffMs = new Date(camp.completed_at).getTime() - new Date(camp.started_at).getTime();
                const mins = Math.floor(diffMs / 60000);
                const secs = Math.floor((diffMs % 60000) / 1000);
                duration = mins > 0 ? `${mins}min ${secs}s` : `${secs}s`;
              }
              const icon = camp.status === "completed" ? "📣" : "❌";
              const msg = `${icon} CAMPANHA ${statusLabel}\n\nCampanha: ${camp.name}\n\n📊 Resultado da campanha\n\n👥 Total de contatos: ${camp.total_contacts || 0}\n\n✅ Mensagens enviadas: ${camp.sent_count || 0}\n📬 Mensagens entregues: ${camp.delivered_count || 0}\n\n❌ Falhas registradas: ${camp.failed_count || 0}\n⏳ Pendentes: ${pending}\n\n⏱ Tempo total de execução:\n${duration || "N/A"}\n\nStatus da campanha: ${camp.status === "completed" ? "Concluída" : "Erro"}`;
              const sent = await sendToGroup(creds, campaignsGroupId, msg);
              if (sent) totalSent++;
              await logEvent(config.user_id, "INFO", `Campanha "${camp.name}" ${statusLabel.toLowerCase()} — alerta enviado`);
            }
          }

          // High failure rate detection
          if (config.alert_high_failures) {
            const { data: activeCampaigns } = await serviceClient
              .from("campaigns")
              .select("id, name, sent_count, failed_count, total_contacts")
              .eq("user_id", config.user_id)
              .eq("status", "sending");

            for (const camp of (activeCampaigns || [])) {
              const totalAttempts = (camp.sent_count || 0) + (camp.failed_count || 0);
              if (totalAttempts >= 10 && (camp.failed_count || 0) / totalAttempts > 0.3) {
                const alreadySent = await wasRecentlySent(config.user_id, `%${camp.name}%falhas detectadas%`, 15);
                if (!alreadySent) {
                  const rate = Math.round(((camp.failed_count || 0) / totalAttempts) * 100);
                  const msg = `🚨 FALHAS DETECTADAS\n\nCampanha: ${camp.name}\n\n⚠️ Taxa de falha: ${rate}%\n❌ Falhas: ${camp.failed_count || 0}/${totalAttempts}\n\n⏱ Horário: ${nowBRT}\n\nA taxa de falha está acima de 30%. Considere pausar a campanha para investigação.`;
                  const sent = await sendToGroup(creds, campaignsGroupId, msg);
                  if (sent) totalSent++;
                  await logEvent(config.user_id, "WARN", `Campanha "${camp.name}" falhas detectadas (${rate}%) — alerta enviado`);
                }
              }
            }
          }
        }
      }

      // ═══ WARMUP ALERTS → warmup_group_id ═══
      if (config.toggle_warmup) {
        const warmupGroupId = config.warmup_group_id || config.group_id;
        if (warmupGroupId) {
          // Check for completed warmup cycles (24h report)
          const { data: completedCycles } = await serviceClient
            .from("warmup_cycles")
            .select("id, device_id, day_index, days_total, phase, daily_interaction_budget_used, daily_unique_recipients_used, started_at, updated_at")
            .eq("user_id", config.user_id)
            .eq("is_running", true);

          for (const cycle of (completedCycles || [])) {
            // Check if 24h passed since last report for this cycle
            const alreadySent = await wasRecentlySent(config.user_id, `%aquecimento%${cycle.device_id.substring(0, 8)}%`, 60 * 23);
            if (alreadySent) continue;

            // Get device info
            const { data: dev } = await serviceClient
              .from("devices")
              .select("name, number, status")
              .eq("id", cycle.device_id)
              .maybeSingle();

            if (!dev) continue;

            // Get warmup logs for last 24h
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: warmupLogs } = await serviceClient
              .from("warmup_logs")
              .select("id, status")
              .eq("user_id", config.user_id)
              .eq("device_id", cycle.device_id)
              .gte("created_at", oneDayAgo);

            if (!warmupLogs || warmupLogs.length === 0) continue;

            const sent = warmupLogs.filter(l => l.status === "sent").length;
            const failed = warmupLogs.filter(l => l.status !== "sent").length;

            const msg = `🔥 RELATÓRIO DE AQUECIMENTO (24H)\n\nInstância: ${dev.name}\nNúmero: ${dev.number || "N/A"}\n\n📊 Atividades registradas\n\n📨 Mensagens enviadas: ${sent}\n❌ Falhas: ${failed}\n📊 Total de interações: ${warmupLogs.length}\n\n🗓 Dia do ciclo: ${cycle.day_index}/${cycle.days_total}\n📍 Fase: ${cycle.phase}\n\n🔎 Status atual da instância:\n${dev.status === "Ready" ? "🟢 Online" : "🔴 Offline"}\n\nRelatório gerado automaticamente após o ciclo de aquecimento de 24h.`;
            const didSend = await sendToGroup(creds, warmupGroupId, msg);
            if (didSend) totalSent++;
            await logEvent(config.user_id, "INFO", `Resumo aquecimento ${cycle.device_id.substring(0, 8)} enviado: ${sent} ok, ${failed} falhas`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("report-wa-cron error");
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
