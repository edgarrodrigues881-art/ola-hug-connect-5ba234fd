import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authUser) return json({ error: "Unauthorized" }, 401);
    const userId = authUser.id;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || new URL(req.url).searchParams.get("action") || "";

    // Helper: get device credentials
    async function getDeviceCredentials(deviceId: string) {
      const { data: device } = await serviceClient
        .from("devices")
        .select("uazapi_token, uazapi_base_url, name, number")
        .eq("id", deviceId)
        .eq("user_id", userId)
        .single();
      if (!device) throw new Error("Dispositivo não encontrado");
      const baseUrl = (device.uazapi_base_url || Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");
      const token = device.uazapi_token || Deno.env.get("UAZAPI_TOKEN") || "";
      if (!baseUrl || !token) throw new Error("Credenciais do dispositivo não configuradas");
      return { baseUrl, token, device };
    }

    // Helper: uazapi request with fallback
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

    // ─── ACTION: connect (generate QR for a specific device) ───
    if (action === "connect") {
      const { deviceId } = body;
      if (!deviceId) return json({ error: "deviceId obrigatório" }, 400);
      const { baseUrl, token: apiToken } = await getDeviceCredentials(deviceId);

      const res = await uazapiRequest(baseUrl, apiToken, "/instance/qrcode", "GET");
      const data = await res.json();
      const qr = data.qrcode || data.base64 || data.data || null;

      // Upsert config
      await serviceClient.from("report_wa_configs").upsert({
        user_id: userId,
        device_id: deviceId,
        connection_status: "connecting",
      }, { onConflict: "user_id" });

      return json({ qrCodeDataUrl: qr });
    }

    // ─── ACTION: refresh-qr ───
    if (action === "refresh-qr") {
      const { data: config } = await serviceClient
        .from("report_wa_configs")
        .select("device_id")
        .eq("user_id", userId)
        .single();
      if (!config?.device_id) return json({ error: "Nenhum dispositivo vinculado" }, 400);

      const { baseUrl, token: apiToken } = await getDeviceCredentials(config.device_id);
      const res = await uazapiRequest(baseUrl, apiToken, "/instance/qrcode", "GET");
      const data = await res.json();
      const qr = data.qrcode || data.base64 || data.data || null;
      return json({ qrCodeDataUrl: qr });
    }

    // ─── ACTION: status ───
    if (action === "status") {
      const { data: config } = await serviceClient
        .from("report_wa_configs")
        .select("device_id, connection_status, connected_phone, group_id, group_name, frequency, toggle_campaigns, toggle_warmup, toggle_instances, alert_disconnect, alert_campaign_end, alert_high_failures")
        .eq("user_id", userId)
        .single();

      if (!config?.device_id) {
        return json({ status: "disconnected", connectedPhone: null, config: null });
      }

      // Check actual device status
      try {
        const { baseUrl, token: apiToken, device } = await getDeviceCredentials(config.device_id);
        const res = await uazapiRequest(baseUrl, apiToken, "/instance/status", "GET");
        const data = await res.json();
        const inst = data.instance || data || {};
        const state = inst.status || data.state;
        const isConnected = state === "connected" || state === "authenticated";
        const phone = inst.owner || inst.phone || data.phone || device.number || "";

        let formattedPhone = "";
        if (phone) {
          const raw = String(phone).replace(/\D/g, "");
          if (raw.startsWith("55") && raw.length >= 12) {
            formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
          } else if (raw) {
            formattedPhone = `+${raw}`;
          }
        }

        const newStatus = isConnected ? "connected" : "disconnected";
        await serviceClient.from("report_wa_configs").update({
          connection_status: newStatus,
          connected_phone: formattedPhone || config.connected_phone,
        }).eq("user_id", userId);

        return json({
          status: newStatus,
          connectedPhone: formattedPhone || config.connected_phone,
          config,
        });
      } catch {
        return json({
          status: config.connection_status || "disconnected",
          connectedPhone: config.connected_phone,
          config,
        });
      }
    }

    // ─── ACTION: groups ───
    if (action === "groups") {
      const { data: config } = await serviceClient
        .from("report_wa_configs")
        .select("device_id")
        .eq("user_id", userId)
        .single();
      if (!config?.device_id) return json({ error: "Nenhum dispositivo vinculado" }, 400);

      const { baseUrl, token: apiToken } = await getDeviceCredentials(config.device_id);

      // Try multiple endpoints
      let groups: any[] = [];
      try {
        const res = await uazapiRequest(baseUrl, apiToken, "/chat/listGroups", "POST", {});
        const data = await res.json();
        groups = Array.isArray(data) ? data : data.groups || data.data || [];
      } catch {
        try {
          const res = await uazapiRequest(baseUrl, apiToken, "/group/fetchAllGroups", "GET");
          const data = await res.json();
          groups = Array.isArray(data) ? data : data.groups || data.data || [];
        } catch { /* empty */ }
      }

      const mapped = groups.map((g: any) => ({
        id: g.id || g.jid || g.groupId || "",
        name: g.subject || g.name || g.groupName || "Grupo sem nome",
        participantsCount: g.size || g.participants?.length || null,
      }));

      return json({ groups: mapped });
    }

    // ─── ACTION: config (save) ───
    if (action === "config") {
      const { instanceId, groupId, groupName, frequency, toggleCampaigns, toggleWarmup, toggleInstances, alertDisconnect, alertCampaignEnd, alertHighFailures } = body;

      const upsertData: Record<string, unknown> = {
        user_id: userId,
        group_id: groupId,
        group_name: groupName,
        frequency: frequency || "1h",
        toggle_campaigns: toggleCampaigns ?? true,
        toggle_warmup: toggleWarmup ?? true,
        toggle_instances: toggleInstances ?? true,
        alert_disconnect: alertDisconnect ?? true,
        alert_campaign_end: alertCampaignEnd ?? true,
        alert_high_failures: alertHighFailures ?? false,
      };
      if (instanceId) upsertData.device_id = instanceId;

      await serviceClient.from("report_wa_configs").upsert(upsertData, { onConflict: "user_id" });

      // Log
      await serviceClient.from("report_wa_logs").insert({
        user_id: userId,
        level: "INFO",
        message: `Configuração salva. Grupo: ${groupName || "N/A"}, Frequência: ${frequency || "1h"}`,
      });

      return json({ success: true });
    }

    // ─── ACTION: test ───
    if (action === "test") {
      const { data: config } = await serviceClient
        .from("report_wa_configs")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!config?.device_id || !config?.group_id) {
        return json({ error: "Configure o dispositivo e grupo primeiro" }, 400);
      }

      const { baseUrl, token: apiToken } = await getDeviceCredentials(config.device_id);

      const contentParts: string[] = [];
      if (config.toggle_campaigns) contentParts.push("Campanhas");
      if (config.toggle_warmup) contentParts.push("Aquecimento");
      if (config.toggle_instances) contentParts.push("Instâncias");

      const message = `[Relatório - Teste]\n✅ Conectado com sucesso.\nGrupo configurado: ${config.group_name || "N/A"}\nFrequência: ${config.frequency}\nConteúdo: ${contentParts.join("/") || "Nenhum"}`;

      try {
        const res = await uazapiRequest(baseUrl, apiToken, "/message/sendText", "POST", {
          to: config.group_id,
          text: message,
        });
        const data = await res.json();

        await serviceClient.from("report_wa_logs").insert({
          user_id: userId,
          level: "INFO",
          message: `Mensagem de teste enviada para "${config.group_name}"`,
        });

        return json({ success: true, response: data });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
        await serviceClient.from("report_wa_logs").insert({
          user_id: userId,
          level: "ERROR",
          message: `Falha ao enviar teste: ${errMsg}`,
        });
        return json({ error: errMsg }, 500);
      }
    }

    // ─── ACTION: logs ───
    if (action === "logs") {
      const { data: logs } = await serviceClient
        .from("report_wa_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      return json({ logs: logs || [] });
    }

    return json({ error: "Ação não reconhecida" }, 400);
  } catch (error: unknown) {
    console.error("report-wa error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return json({ error: msg }, 500);
  }
});
