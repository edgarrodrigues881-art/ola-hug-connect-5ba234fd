import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function oplog(client: any, userId: string, event: string, details: string, deviceId?: string | null, meta?: any) {
  try { await client.from("operation_logs").insert({ user_id: userId, device_id: deviceId || null, event, details, meta: meta || {} }); } catch (_e) { /* ignore */ }
}

// ── Parallel batch helper ──
async function processBatch<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(fn));
    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
  }
  return results;
}

// ── Process a single device sync ──
async function syncOneDevice(
  device: any,
  serviceClient: any,
  userId: string,
  globalDeadline: number,
): Promise<any> {
  // Abort if we're running out of time (leave 5s buffer)
  if (Date.now() > globalDeadline) {
    return { id: device.id, name: device.name, found: false, status: device.status, error: "Skipped — time limit" };
  }

  const deviceToken = device.uazapi_token;
  const deviceBaseUrl = (device.uazapi_base_url || "").replace(/\/+$/, "");

  if (!deviceToken || !deviceBaseUrl) {
    return { id: device.id, name: device.name, found: false, status: device.status, error: "No token configured" };
  }

  let newStatus = device.status;
  let formattedPhone = device.number || "";
  let profilePicture = device.profile_picture || null;

  try {
    const controller = new AbortController();
    // Shorter timeout per device (6s instead of 10s) to fit more in the window
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let res: Response;
    try {
      res = await fetch(`${deviceBaseUrl}/instance/status`, {
        method: "GET",
        headers: { "token": deviceToken, "Accept": "application/json" },
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      const isTimeout = fetchErr?.name === "AbortError";
      return {
        id: device.id, name: device.name, found: false,
        status: device.status, error: isTimeout ? "Timeout" : `Network: ${fetchErr?.message}`,
      };
    }
    clearTimeout(timeoutId);

    // 401: token invalid
    if (res.status === 401) {
      await res.text();
      await serviceClient.from("devices").update({
        status: "Disconnected", uazapi_token: null, uazapi_base_url: null, proxy_id: null,
      }).eq("id", device.id);
      await serviceClient.from("user_api_tokens").update({
        status: "invalid", device_id: null, assigned_at: null,
      }).eq("device_id", device.id);
      if (device.proxy_id) {
        await serviceClient.from("proxies").update({ status: "USADA" }).eq("id", device.proxy_id);
      }
      await oplog(serviceClient, userId, "uazapi_error", `Token inválido (401) para "${device.name}"`, device.id, { status: 401 });
      return { id: device.id, name: device.name, found: false, status: "Disconnected", error: "Token invalid" };
    }

    // 404: strike system
    if (res.status === 404) {
      await res.text();
      const { data: recent404s } = await serviceClient
        .from("operation_logs").select("id")
        .eq("device_id", device.id).eq("event", "sync_404_strike")
        .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

      const strikeCount = (recent404s?.length || 0) + 1;
      const STRIKE_THRESHOLD = 3;

      await oplog(serviceClient, userId, "sync_404_strike",
        `"${device.name}" 404 (strike ${strikeCount}/${STRIKE_THRESHOLD})`, device.id, { strike: strikeCount });

      if (strikeCount < STRIKE_THRESHOLD) {
        await serviceClient.from("devices").update({ status: "Disconnected" }).eq("id", device.id);
        return { id: device.id, name: device.name, found: false, status: "Disconnected", error: `404 strike ${strikeCount}/${STRIKE_THRESHOLD}` };
      }

      // Confirmed gone — release
      await serviceClient.from("devices").update({
        status: "Disconnected", uazapi_token: null, uazapi_base_url: null, proxy_id: null,
      }).eq("id", device.id);
      await serviceClient.from("user_api_tokens").update({
        status: "available", device_id: null, assigned_at: null, healthy: false,
      }).eq("device_id", device.id);
      if (device.proxy_id) {
        await serviceClient.from("proxies").update({ status: "USADA" }).eq("id", device.proxy_id);
      }
      // Pause warmup
      const { data: activeCycles404 } = await serviceClient
        .from("warmup_cycles").select("id, phase")
        .eq("device_id", device.id).eq("is_running", true)
        .neq("phase", "completed");
      for (const cycle of (activeCycles404 || [])) {
        await serviceClient.from("warmup_cycles").update({
          is_running: false, phase: "paused", previous_phase: cycle.phase,
          last_error: "Auto-pausado: instância inexistente (404 confirmado)",
        }).eq("id", cycle.id);
        await serviceClient.from("warmup_jobs").update({ status: "cancelled" })
          .eq("cycle_id", cycle.id).eq("status", "pending");
      }
      return { id: device.id, name: device.name, found: false, status: "Disconnected", error: "Instance gone — released" };
    }

    if (!res.ok) {
      await res.text();
      return { id: device.id, name: device.name, found: false, status: device.status, error: `API ${res.status}` };
    }

    const data = await res.json();
    const inst = data.instance || data || {};
    const state = inst.status || data.state;
    const isConnected = state === "connected" || state === "authenticated";
    const phone = inst.owner || inst.phone || data.phone || "";

    if (isConnected && phone) {
      const raw = String(phone).replace(/\D/g, "");
      if (raw.startsWith("55") && raw.length === 13) {
        formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
      } else if (raw.startsWith("55") && raw.length === 12) {
        formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 8)}-${raw.slice(8)}`;
      } else if (raw.startsWith("55") && raw.length >= 10) {
        formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, raw.length - 4)}-${raw.slice(raw.length - 4)}`;
      } else if (raw) {
        formattedPhone = `+${raw}`;
      }
    } else if (!isConnected) {
      formattedPhone = device.number || "";
    }

    profilePicture = isConnected ? (inst.profilePicUrl || device.profile_picture || null) : (device.profile_picture || null);
    const syncedProfileName = isConnected ? (inst.profileName || inst.pushname || "") : (device.profile_name || "");
    newStatus = isConnected ? "Ready" : "Disconnected";

    const statusChanged = newStatus !== device.status;
    const phoneChanged = formattedPhone !== (device.number || "");
    const picChanged = profilePicture !== (device.profile_picture || null);
    const nameChanged = (syncedProfileName || "") !== (device.profile_name || "");

    if (statusChanged || phoneChanged || picChanged || nameChanged) {
      await serviceClient.from("devices").update({
        status: newStatus,
        number: formattedPhone,
        profile_picture: profilePicture,
        profile_name: syncedProfileName || device.profile_name || "",
      }).eq("id", device.id);

      if (statusChanged) {
        const eventName = newStatus === "Disconnected" ? "instance_disconnected" : "instance_connected";
        await oplog(serviceClient, userId, eventName, `"${device.name}" → ${newStatus}`, device.id, { previous: device.status, phone: formattedPhone });

        // ── Instant WhatsApp notification (fire-and-forget, don't block) ──
        if (device.login_type !== "report_wa") {
          notifyStatusChange(serviceClient, userId, device, newStatus, formattedPhone, syncedProfileName).catch(() => {});
        }

        // ── Auto-pause warmup on disconnect ──
        if (newStatus === "Disconnected") {
          await handleWarmupPause(serviceClient, userId, device);
        }
        // ── Auto-resume warmup on reconnect ──
        if (newStatus === "Ready") {
          await handleWarmupResume(serviceClient, userId, device);
        }

        // ── Make webhook ──
        const makeUrl = Deno.env.get("MAKE_WEBHOOK_URL");
        if (makeUrl) {
          fetch(makeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: newStatus === "Ready" ? "instance.connected" : "instance.disconnected",
              client_id: userId,
              instance: { id: device.id, name: device.name, type: device.instance_type || "principal", status: newStatus === "Ready" ? "conectada" : "desconectada" },
              timestamp: new Date().toISOString(),
            }),
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error(`Error syncing device ${device.name}:`, err);
  }

  return { id: device.id, name: device.name, found: true, status: newStatus, phone: formattedPhone };
}

// ── Notification helper (extracted to avoid blocking sync loop) ──
async function notifyStatusChange(serviceClient: any, userId: string, device: any, newStatus: string, formattedPhone: string, syncedProfileName: string) {
  try {
    const { data: rwConfig } = await serviceClient
      .from("report_wa_configs")
      .select("device_id, alert_disconnect, group_id, connection_status, toggle_instances")
      .eq("user_id", userId).not("device_id", "is", null).maybeSingle();

    const alertEnabled = rwConfig?.alert_disconnect || rwConfig?.toggle_instances;
    if (!alertEnabled || !rwConfig?.group_id || rwConfig?.connection_status !== "connected") return;

    const { data: rwDevice } = await serviceClient
      .from("devices").select("uazapi_token, uazapi_base_url")
      .eq("id", rwConfig.device_id).single();

    if (!rwDevice?.uazapi_token || !rwDevice?.uazapi_base_url) return;

    const rwBase = rwDevice.uazapi_base_url.replace(/\/+$/, "");
    const nowBRT = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    const isConn = newStatus === "Ready";
    const reportPhone = isConn ? (formattedPhone || device.number || "N/A") : (device.number || formattedPhone || "N/A");
    const chipName = syncedProfileName || device.profile_name || device.name;
    const msg = isConn
      ? `✅ INSTÂNCIA CONECTADA\n\n🔹 Instância: ${device.name}\n📱 Chip: ${chipName}\n📞 Número: ${reportPhone}\n\n🟢 Status: Online\n⏱ Conectado às: ${nowBRT}`
      : `⚠️ ALERTA DE CONEXÃO\n\n🖥 Instância: ${device.name}\n📞 Número: ${reportPhone}\n\n❌ Status: Desconectado\n⏱ Horário: ${nowBRT}\n\nA instância perdeu a conexão com o WhatsApp.\n\nPara voltar a funcionar, é necessário reconectar.`;

    const endpoints = [
      { path: "/chat/send-text", body: { to: rwConfig.group_id, body: msg } },
      { path: "/send/text", body: { number: rwConfig.group_id, text: msg } },
    ];
    for (const ep of endpoints) {
      try {
        const r = await fetch(`${rwBase}${ep.path}`, {
          method: "POST",
          headers: { token: rwDevice.uazapi_token, "Content-Type": "application/json" },
          body: JSON.stringify(ep.body),
        });
        if (r.ok) {
          await serviceClient.from("report_wa_logs").insert({
            user_id: userId, level: isConn ? "INFO" : "WARN",
            message: `Instância "${device.name}" ${isConn ? "conectada" : "desconectada"} — alerta enviado`,
          });
          return;
        }
        await r.text();
      } catch (_) {}
    }
  } catch (_) {}
}

// ── Warmup pause on disconnect ──
async function handleWarmupPause(serviceClient: any, userId: string, device: any) {
  const { data: activeCycles } = await serviceClient
    .from("warmup_cycles").select("id, phase")
    .eq("device_id", device.id).eq("is_running", true)
    .neq("phase", "completed").neq("phase", "paused");

  for (const cycle of (activeCycles || [])) {
    await serviceClient.from("warmup_cycles").update({
      is_running: false, phase: "paused", previous_phase: cycle.phase,
      last_error: "Auto-pausado: instância desconectada",
    }).eq("id", cycle.id);
    await serviceClient.from("warmup_jobs").update({ status: "cancelled" })
      .eq("cycle_id", cycle.id).eq("status", "pending");
    await serviceClient.from("warmup_audit_logs").insert({
      user_id: userId, device_id: device.id, cycle_id: cycle.id,
      level: "warn", event_type: "auto_paused_disconnected",
      message: `Aquecimento pausado: instância desconectada (fase: ${cycle.phase})`,
    });
  }
}

// ── Warmup resume on reconnect ──
async function handleWarmupResume(serviceClient: any, userId: string, device: any) {
  const { data: pausedCycles } = await serviceClient
    .from("warmup_cycles")
    .select("id, first_24h_ends_at, day_index, days_total, user_id, previous_phase, last_error, daily_interaction_budget_target, daily_interaction_budget_used")
    .eq("device_id", device.id).eq("phase", "paused").eq("is_running", false);

  for (const cycle of (pausedCycles || [])) {
    if (cycle.last_error !== "Auto-pausado: instância desconectada") continue;

    const nowDate = new Date();
    const first24hEnds = new Date(cycle.first_24h_ends_at);
    let resumePhase = cycle.previous_phase || "groups_only";
    if (nowDate < first24hEnds) resumePhase = "pre_24h";
    if (["error", "completed", "paused"].includes(resumePhase)) resumePhase = "groups_only";

    await serviceClient.from("warmup_cycles").update({
      is_running: true, phase: resumePhase, previous_phase: null, last_error: null,
      next_run_at: nowDate.toISOString(),
    }).eq("id", cycle.id);

    const tomorrow = new Date(nowDate);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(3, 5, 0, 0);
    await serviceClient.from("warmup_jobs").insert({
      user_id: cycle.user_id, device_id: device.id, cycle_id: cycle.id,
      job_type: "daily_reset", payload: {}, run_at: tomorrow.toISOString(), status: "pending",
    });

    if (["autosave_enabled", "community_enabled"].includes(resumePhase)) {
      const remaining = (cycle.daily_interaction_budget_target || 25) - (cycle.daily_interaction_budget_used || 0);
      if (remaining > 0) {
        const windowStart = Math.max(nowDate.getTime(), new Date(nowDate).setUTCHours(11, 0, 0, 0));
        const windowEnd = new Date(nowDate).setUTCHours(24, 0, 0, 0);
        if (windowStart < windowEnd) {
          const interactionCount = Math.min(remaining, 15);
          const windowMs = windowEnd - windowStart;
          const jobs: any[] = [];
          for (let i = 0; i < interactionCount; i++) {
            const baseOffset = (windowMs / interactionCount) * i;
            const jitter = Math.floor(Math.random() * (windowMs / interactionCount * 0.4));
            jobs.push({
              user_id: cycle.user_id, device_id: device.id, cycle_id: cycle.id,
              job_type: "autosave_interaction", payload: {},
              run_at: new Date(windowStart + baseOffset + jitter).toISOString(), status: "pending",
            });
          }
          if (jobs.length > 0) await serviceClient.from("warmup_jobs").insert(jobs);
        }
      }
    }

    await serviceClient.from("warmup_audit_logs").insert({
      user_id: userId, device_id: device.id, cycle_id: cycle.id,
      level: "info", event_type: "auto_resumed_connected",
      message: `Aquecimento retomado: instância reconectada (fase: ${resumePhase})`,
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch ALL devices (handle >1000 with pagination)
    let allDevices: any[] = [];
    let from = 0;
    const PAGE_SIZE = 500;
    while (true) {
      const { data: page, error: devError } = await serviceClient
        .from("devices")
        .select("id, name, number, status, uazapi_token, uazapi_base_url, proxy_id, instance_type, login_type, user_id, profile_name, profile_picture")
        .eq("user_id", userId)
        .range(from, from + PAGE_SIZE - 1);
      if (devError) throw devError;
      if (!page || page.length === 0) break;
      allDevices = allDevices.concat(page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    // Global deadline: 50s from now (edge function limit ~60s, leave buffer)
    const globalDeadline = Date.now() + 50_000;

    // Process in parallel batches of 25
    const BATCH_CONCURRENCY = 25;
    const results = await processBatch(allDevices, BATCH_CONCURRENCY, (device) =>
      syncOneDevice(device, serviceClient, userId, globalDeadline)
    );

    // Sync proxy statuses (batch update)
    const { data: allDevicesAfter } = await supabase.from("devices").select("proxy_id").eq("user_id", userId);
    const { data: allProxies } = await supabase.from("proxies").select("id, status").eq("user_id", userId);
    const linkedProxyIds = new Set((allDevicesAfter || []).filter((d: any) => d.proxy_id).map((d: any) => d.proxy_id));

    let proxiesUpdated = 0;
    for (const proxy of (allProxies || [])) {
      const isLinked = linkedProxyIds.has(proxy.id);
      let correctStatus: string;
      if (isLinked) correctStatus = "USANDO";
      else if (proxy.status === "USANDO") correctStatus = "USADA";
      else correctStatus = proxy.status;

      if (proxy.status !== correctStatus) {
        await supabase.from("proxies").update({ status: correctStatus } as any).eq("id", proxy.id);
        proxiesUpdated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: allDevices.length, synced: results.length, proxiesUpdated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Sync error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
