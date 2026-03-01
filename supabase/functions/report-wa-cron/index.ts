import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all users with report configs that have a device and group configured
    const { data: configs } = await serviceClient
      .from("report_wa_configs")
      .select("user_id, device_id, group_id, group_name, toggle_campaigns, toggle_warmup, toggle_instances, alert_disconnect, alert_high_failures, connection_status")
      .not("device_id", "is", null)
      .not("group_id", "is", null);

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: "No configs to check" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Helper: get device credentials
    async function getDeviceCredentials(deviceId: string, userId: string) {
      const { data: device } = await serviceClient
        .from("devices")
        .select("uazapi_token, uazapi_base_url, name, number")
        .eq("id", deviceId)
        .eq("user_id", userId)
        .single();
      if (!device) return null;
      const baseUrl = (device.uazapi_base_url || Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");
      const token = device.uazapi_token || Deno.env.get("UAZAPI_TOKEN") || "";
      if (!baseUrl || !token) return null;
      return { baseUrl, token, device };
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

    let totalSent = 0;

    for (const config of configs) {
      const creds = await getDeviceCredentials(config.device_id!, config.user_id);
      if (!creds) continue;

      // Only process if the report instance is connected
      if (config.connection_status !== "connected") continue;

      const pendingMessages: string[] = [];
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // 1) Device disconnections
      if (config.alert_disconnect) {
        const { data: allDevices } = await serviceClient
          .from("devices")
          .select("id, name, number, status")
          .eq("user_id", config.user_id);

        for (const dev of (allDevices || [])) {
          if (!["Disconnected", "disconnected"].includes(dev.status)) continue;
          const { data: recent } = await serviceClient
            .from("report_wa_logs")
            .select("id")
            .eq("user_id", config.user_id)
            .ilike("message", `%${dev.name}%desconect%`)
            .gte("created_at", fiveMinAgo)
            .limit(1);
          if (!recent || recent.length === 0) {
            pendingMessages.push(`⚠️ Instância "${dev.name}"${dev.number ? ` (${dev.number})` : ""} desconectada.`);
            await serviceClient.from("report_wa_logs").insert({
              user_id: config.user_id, level: "WARN",
              message: `Instância "${dev.name}" desconectada — alerta enviado`,
            });
          }
        }
      }

      // 2) Campaign events
      if (config.toggle_campaigns) {
        const { data: campaigns } = await serviceClient
          .from("campaigns")
          .select("id, name, status, sent_count, failed_count, updated_at")
          .eq("user_id", config.user_id)
          .in("status", ["completed", "paused", "failed"])
          .gte("updated_at", fiveMinAgo);

        for (const camp of (campaigns || [])) {
          const { data: recent } = await serviceClient
            .from("report_wa_logs")
            .select("id")
            .eq("user_id", config.user_id)
            .ilike("message", `%campanha%${camp.name}%`)
            .gte("created_at", fiveMinAgo)
            .limit(1);
          if (!recent || recent.length === 0) {
            const st = camp.status === "completed" ? "✅ finalizada" : camp.status === "paused" ? "⏸ pausada" : "❌ falhou";
            pendingMessages.push(`Campanha "${camp.name}" ${st}. Enviadas: ${camp.sent_count || 0}, Falhas: ${camp.failed_count || 0}.`);
            await serviceClient.from("report_wa_logs").insert({
              user_id: config.user_id, level: "INFO",
              message: `Campanha "${camp.name}" ${st} — alerta enviado`,
            });
          }
        }
      }

      // 3) Warmup daily summary
      if (config.toggle_warmup) {
        const { data: recentLog } = await serviceClient
          .from("report_wa_logs")
          .select("id")
          .eq("user_id", config.user_id)
          .ilike("message", "%resumo aquecimento%")
          .gte("created_at", new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!recentLog || recentLog.length === 0) {
          const { data: warmupLogs } = await serviceClient
            .from("warmup_logs")
            .select("id, status")
            .eq("user_id", config.user_id)
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          if (warmupLogs && warmupLogs.length > 0) {
            const sent = warmupLogs.filter(l => l.status === "sent").length;
            const failed = warmupLogs.filter(l => l.status !== "sent").length;
            pendingMessages.push(`🔥 Resumo aquecimento (24h): ${sent} enviadas, ${failed} falhas.`);
            await serviceClient.from("report_wa_logs").insert({
              user_id: config.user_id, level: "INFO",
              message: `Resumo aquecimento enviado: ${sent} ok, ${failed} falhas`,
            });
          }
        }
      }

      // Send with micro-delay
      for (let i = 0; i < pendingMessages.length; i++) {
        if (i > 0) {
          const delay = 5000 + Math.random() * 5000;
          await new Promise(r => setTimeout(r, delay));
        }
        try {
          await uazapiRequest(creds.baseUrl, creds.token, "/message/sendText", "POST", {
            to: config.group_id,
            text: `[Relatório Automático]\n${pendingMessages[i]}`,
          });
          totalSent++;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : "Erro";
          await serviceClient.from("report_wa_logs").insert({
            user_id: config.user_id, level: "ERROR",
            message: `Falha ao enviar evento: ${errMsg}`,
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, totalSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("report-wa-cron error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
