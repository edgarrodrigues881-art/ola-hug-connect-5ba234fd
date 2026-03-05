import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── UaZapi helper ──────────────────────────────────────────────────────
async function uazapi(
  baseUrl: string,
  endpoint: string,
  token: string,
  method: "GET" | "POST" = "POST",
  body?: any,
): Promise<{ ok: boolean; status: number; data: any }> {
  const headers: Record<string, string> = {
    token,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const opts: RequestInit = { method, headers };
  if (body && method === "POST") opts.body = JSON.stringify(body);

  const res = await fetch(`${baseUrl}${endpoint}`, opts);
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.substring(0, 500) };
  }
  return { ok: res.ok, status: res.status, data };
}

// ── Admin helper: create instance on UaZapi ────────────────────────────
async function adminCreateInstance(
  baseUrl: string,
  adminToken: string,
  name: string,
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const headerVariants = [
    { admintoken: adminToken },
    { token: adminToken },
    { Authorization: `Bearer ${adminToken}` },
  ];

  for (const authHeaders of headerVariants) {
    const res = await fetch(`${baseUrl}/instance/init`, {
      method: "POST",
      headers: {
        ...authHeaders,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (res.status === 401) continue;

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const instanceToken = data.token || data.instance?.token;
      console.log("Instance created:", name, "token:", !!instanceToken);
      return { ok: true, token: instanceToken };
    }
    return { ok: false, error: `UaZapi [${res.status}]: ${JSON.stringify(data).substring(0, 200)}` };
  }

  return { ok: false, error: "All auth methods returned 401" };
}

// ── Proxy setter ────────────────────────────────────────────────────────
async function setProxy(
  baseUrl: string,
  token: string,
  proxy: { host: string; port: string; username?: string; password?: string; type?: string },
) {
  const payload = {
    host: proxy.host,
    port: proxy.port,
    username: proxy.username || "",
    password: proxy.password || "",
    type: (proxy.type || "HTTP").toLowerCase(),
  };
  const endpoints = ["/instance/proxy", "/proxy/set", "/settings/proxy"];
  for (const ep of endpoints) {
    try {
      const r = await uazapi(baseUrl, ep, token, "POST", payload);
      if (r.ok) {
        console.log("Proxy set via", ep);
        return true;
      }
    } catch {}
  }
  console.log("Proxy set failed on all endpoints (non-blocking)");
  return false;
}

// ══════════════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Config ──
    const BASE_URL = (Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");
    const ADMIN_TOKEN = Deno.env.get("UAZAPI_TOKEN") || "";

    const body = await req.json();
    const { action, deviceId } = body;
    console.log("ACTION:", action, "DEVICE:", deviceId || "n/a");

    // ── getBaseUrl ──
    if (action === "getBaseUrl") {
      return json({ success: true, baseUrl: BASE_URL });
    }

    // ── createInstance ──
    if (action === "createInstance") {
      if (!BASE_URL || !ADMIN_TOKEN) {
        return json({ error: "UaZapi não configurado no servidor." }, 400);
      }
      const instName = (body.instanceName || `inst-${Date.now()}`).substring(0, 50);
      const result = await adminCreateInstance(BASE_URL, ADMIN_TOKEN, instName);
      if (!result.ok) return json({ error: result.error }, 500);

      if (deviceId && result.token) {
        await svc.from("devices").update({
          uazapi_token: result.token,
          uazapi_base_url: BASE_URL,
        }).eq("id", deviceId);
      }

      return json({
        success: true,
        instanceToken: result.token,
        instanceName: instName,
        baseUrl: BASE_URL,
      });
    }

    // ── Resolve device credentials ──
    if (!deviceId) return json({ error: "deviceId obrigatório" }, 400);

    const { data: device } = await svc
      .from("devices")
      .select("name, uazapi_token, uazapi_base_url")
      .eq("id", deviceId)
      .single();

    let instanceUrl = (device?.uazapi_base_url || BASE_URL).replace(/\/+$/, "");
    let instanceToken = device?.uazapi_token || "";
    const deviceName = device?.name || "instance";

    // If no token, cannot proceed (except for connect which will auto-create)
    if (!instanceToken && action !== "connect") {
      return json({ error: "Instância sem token. Conecte primeiro." }, 400);
    }

    // ── Helper: check if token is valid, returns status info ──
    const checkInstanceStatus = async (): Promise<{ valid: boolean; status: string; qrcode?: string; owner?: string; profileName?: string; profilePicUrl?: string }> => {
      if (!instanceToken) return { valid: false, status: "no_token" };
      try {
        const r = await uazapi(instanceUrl, "/instance/status", instanceToken, "GET");
        if (r.status === 401) return { valid: false, status: "token_invalid" };
        const inst = r.data?.instance || r.data || {};
        return {
          valid: true,
          status: inst.status || r.data?.status || "unknown",
          qrcode: inst.qrcode || r.data?.qrcode,
          owner: inst.owner || inst.phone || r.data?.phone || "",
          profileName: inst.profileName || "",
          profilePicUrl: inst.profilePicUrl || "",
        };
      } catch {
        return { valid: false, status: "error" };
      }
    };

    // ── Helper: auto-create or recreate instance ──
    const ensureValidInstance = async (): Promise<boolean> => {
      if (!BASE_URL || !ADMIN_TOKEN) return false;
      const slug = deviceName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const rand = crypto.randomUUID().slice(0, 6);
      const uniqueName = `${slug}-${deviceId.slice(0, 8)}-${rand}`;
      console.log("Creating/recreating instance:", uniqueName);
      const result = await adminCreateInstance(BASE_URL, ADMIN_TOKEN, uniqueName);
      if (!result.ok || !result.token) {
        console.log("Instance creation failed:", result.error);
        return false;
      }
      instanceToken = result.token;
      instanceUrl = BASE_URL;
      await svc.from("devices").update({
        uazapi_token: instanceToken,
        uazapi_base_url: BASE_URL,
      }).eq("id", deviceId);
      return true;
    };

    // ── Helper: check for duplicate phone number across user's devices ──
    const checkDuplicatePhone = async (phone: string, currentDeviceId: string): Promise<string | null> => {
      if (!phone) return null;
      const rawPhone = String(phone).replace(/\D/g, "");
      if (!rawPhone || rawPhone.length < 8) return null;
      
      // Check all user devices (except current and report_wa) for same number
      const { data: existing } = await svc
        .from("devices")
        .select("id, name, number")
        .eq("user_id", user.id)
        .neq("id", currentDeviceId)
        .neq("login_type", "report_wa");
      
      if (!existing) return null;
      
      const duplicate = existing.find(d => {
        if (!d.number) return false;
        const dRaw = String(d.number).replace(/\D/g, "");
        return dRaw === rawPhone || dRaw.endsWith(rawPhone.slice(-8)) || rawPhone.endsWith(dRaw.slice(-8));
      });
      
      return duplicate ? duplicate.name : null;
    };

    // ── connect ──
    if (action === "connect") {
      // Step 1: Check current instance status FIRST before creating anything
      const currentCheck = await checkInstanceStatus();
      console.log("Current instance status:", JSON.stringify(currentCheck));

      // If token is invalid or doesn't exist, create/recreate
      if (!currentCheck.valid) {
        console.log("Token invalid/missing, creating instance...");
        const created = await ensureValidInstance();
        if (!created) return json({ error: "Falha ao criar instância na UaZapi." }, 500);
      }

      // Step 2: Set proxy if provided (only on first connect, not on QR refresh)
      if (body.proxyConfig?.host) {
        await setProxy(instanceUrl, instanceToken, body.proxyConfig);
      }

      // Step 3: Re-check status with (possibly new) token
      const statusCheck = await checkInstanceStatus();
      const currentStatus = statusCheck.status;

      // Already connected
      if (currentStatus === "connected") {
        const phone = statusCheck.owner || "";
        let formatted = "";
        if (phone) {
          const raw = String(phone).replace(/\D/g, "");
          if (raw.startsWith("55") && raw.length >= 12)
            formatted = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
          else if (raw) formatted = `+${raw}`;
        }
        await svc.from("devices").update({ status: "Ready", number: formatted }).eq("id", deviceId);
        return json({ success: true, alreadyConnected: true, phone: formatted, status: "authenticated" });
      }

      // If "connecting" and we have a QR, return it without calling connect again
      if (currentStatus === "connecting" && statusCheck.qrcode) {
        console.log("Already connecting, returning existing QR");
        return json({ success: true, base64: statusCheck.qrcode, qr: statusCheck.qrcode, status: "connecting" });
      }

      // Disconnect if in a bad state (not disconnected/connecting)
      if (currentStatus && currentStatus !== "disconnected" && currentStatus !== "connecting") {
        await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST");
        await new Promise(r => setTimeout(r, 500));
      }

      // Step 4: Call connect to generate QR
      const connectRes = await uazapi(instanceUrl, "/instance/connect", instanceToken, "POST", {});
      if (connectRes.status === 401) {
        // Token became invalid after creation - try one more time
        const retryCreated = await ensureValidInstance();
        if (!retryCreated) return json({ error: "Token inválido mesmo após recriação.", code: "TOKEN_INVALID" }, 401);
        const retryConnect = await uazapi(instanceUrl, "/instance/connect", instanceToken, "POST", {});
        const retryInst = retryConnect.data?.instance || retryConnect.data || {};
        const retryQr = retryInst.qrcode || retryConnect.data?.qrcode;
        if (retryQr) {
          return json({ success: true, base64: retryQr, qr: retryQr, status: "connecting", instanceToken });
        }
        return json({ error: "Não foi possível gerar QR Code." }, 500);
      }

      const connInst = connectRes.data?.instance || connectRes.data || {};
      let qr = connInst.qrcode || connectRes.data?.qrcode;

      // Poll for QR if not in response
      if (!qr) {
        for (let i = 0; i < 8; i++) {
          await new Promise(r => setTimeout(r, 1200));
          const poll = await uazapi(instanceUrl, "/instance/status", instanceToken, "GET");
          const pi = poll.data?.instance || poll.data || {};
          qr = pi.qrcode || poll.data?.qrcode;
          if (qr) break;

          const st = pi.status || poll.data?.status;
          if (st === "connected") {
            const phone = pi.owner || pi.phone || "";
            let fmt = "";
            if (phone) {
              const raw = String(phone).replace(/\D/g, "");
              if (raw.startsWith("55") && raw.length >= 12) fmt = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
              else if (raw) fmt = `+${raw}`;
            }
            await svc.from("devices").update({ status: "Ready", number: fmt }).eq("id", deviceId);
            return json({ success: true, alreadyConnected: true, phone: fmt, status: "authenticated" });
          }
        }
      }

      console.log("QR result:", !!qr, "length:", qr?.length || 0);
      return json({
        success: true,
        base64: qr || null,
        qr: qr || null,
        status: qr ? "connecting" : "waiting",
        instanceToken,
      });
    }

    // ── refreshQr - Get fresh QR without recreating instance ──
    if (action === "refreshQr") {
      const statusCheck = await checkInstanceStatus();

      // If connected, return success
      if (statusCheck.status === "connected") {
        const phone = statusCheck.owner || "";
        let formatted = "";
        if (phone) {
          const raw = String(phone).replace(/\D/g, "");
          if (raw.startsWith("55") && raw.length >= 12)
            formatted = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
          else if (raw) formatted = `+${raw}`;
        }
        return json({ success: true, alreadyConnected: true, phone: formatted, status: "authenticated" });
      }

      // If token is invalid, need to recreate
      if (!statusCheck.valid) {
        const created = await ensureValidInstance();
        if (!created) return json({ error: "Token expirado, falha ao recriar." }, 500);
      }

      // If connecting and has QR, return it
      if (statusCheck.status === "connecting" && statusCheck.qrcode) {
        return json({ success: true, base64: statusCheck.qrcode, qr: statusCheck.qrcode, status: "connecting" });
      }

      // Otherwise request a new QR by calling connect (same instance, no recreation)
      const connectRes = await uazapi(instanceUrl, "/instance/connect", instanceToken, "POST", {});
      const connInst = connectRes.data?.instance || connectRes.data || {};
      let qr = connInst.qrcode || connectRes.data?.qrcode;

      if (!qr) {
        // Quick poll
        for (let i = 0; i < 3; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const poll = await uazapi(instanceUrl, "/instance/status", instanceToken, "GET");
          const pi = poll.data?.instance || poll.data || {};
          qr = pi.qrcode || poll.data?.qrcode;
          if (qr) break;
          if ((pi.status || poll.data?.status) === "connected") {
            return json({ success: true, alreadyConnected: true, status: "authenticated" });
          }
        }
      }

      return json({
        success: true,
        base64: qr || null,
        qr: qr || null,
        status: qr ? "connecting" : "waiting",
      });
    }

    // ── keepAlive - Passive status check only (NO auto-reconnect) ──
    if (action === "keepAlive") {
      const check = await checkInstanceStatus();
      if (check.status === "connected") {
        return json({ success: true, status: "authenticated", alive: true });
      }

      // Device is NOT connected — just update DB status, never try to reconnect
      // Auto-reconnect was causing interference with other active connections
      console.log(`keepAlive: device ${deviceName} not connected (status: ${check.status}), updating DB`);
      await svc.from("devices").update({ status: "Disconnected" }).eq("id", deviceId);

      return json({ success: true, status: check.status, alive: false });
    }

    // ── status ──
    if (action === "status") {
      const check = await checkInstanceStatus();
      if (!check.valid) return json({ success: true, status: "token_invalid", tokenInvalid: true });

      const isConnected = check.status === "connected";

      return json({
        success: true,
        status: isConnected ? "authenticated" : check.status,
        phone: check.owner || "",
        base64: check.qrcode || null,
        qr: check.qrcode || null,
        profileName: check.profileName || "",
        profilePicUrl: check.profilePicUrl || "",
      });
    }

    // ── logout ──
    if (action === "logout") {
      const r = await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST");
      return json({ success: true, ...r.data });
    }

    // ── sendText ──
    if (action === "sendText") {
      const { number, text } = body;
      if (!number || !text) return json({ error: "number e text obrigatórios" }, 400);

      const r = await uazapi(instanceUrl, "/send/text", instanceToken, "POST", {
        number: number.replace(/\D/g, ""),
        text,
      });
      if (!r.ok) return json({ error: `sendText falhou [${r.status}]`, details: r.data }, r.status);
      return json({ success: true, data: r.data });
    }

    // ── updateProfileName ──
    if (action === "updateProfileName") {
      const { profileName } = body;
      if (!profileName) return json({ error: "profileName obrigatório" }, 400);

      const r = await uazapi(instanceUrl, "/profile/name", instanceToken, "POST", { name: profileName });
      if (deviceId) {
        await svc.from("devices").update({ profile_name: profileName }).eq("id", deviceId);
      }
      return json({ success: r.ok, ...r.data });
    }

    // ── updateProfilePicture ──
    if (action === "updateProfilePicture") {
      const { profilePictureData } = body;
      if (!profilePictureData) return json({ error: "profilePictureData obrigatório" }, 400);

      if (profilePictureData === "remove") {
        const r = await uazapi(instanceUrl, "/profile/picture/remove", instanceToken, "POST");
        if (deviceId) await svc.from("devices").update({ profile_picture: null }).eq("id", deviceId);
        return json({ success: r.ok, ...r.data });
      }

      const r = await uazapi(instanceUrl, "/profile/picture", instanceToken, "POST", {
        picture: profilePictureData,
      });
      if (deviceId) {
        await svc.from("devices").update({ profile_picture: profilePictureData.substring(0, 500) }).eq("id", deviceId);
      }
      return json({ success: r.ok, ...r.data });
    }

    // ── updateProfileStatus (about/recado) ──
    if (action === "updateProfileStatus") {
      const { profileStatus } = body;
      const endpoints = [
        { path: "/profile/status", payload: { status: profileStatus } },
        { path: "/profile/about", payload: { about: profileStatus } },
      ];
      for (const ep of endpoints) {
        const r = await uazapi(instanceUrl, ep.path, instanceToken, "POST", ep.payload);
        if (r.ok) return json({ success: true, ...r.data });
      }
      return json({ error: "Não foi possível atualizar o recado." }, 500);
    }

    // ── listGroups ──
    if (action === "listGroups") {
      const r = await uazapi(instanceUrl, "/group/list", instanceToken, "GET");
      if (!r.ok) return json({ error: "Falha ao listar grupos" }, r.status);
      return json({ success: true, groups: r.data?.groups || r.data || [] });
    }

    // ── sendMedia ──
    if (action === "sendMedia") {
      const { number, mediaUrl, caption, type: mediaType } = body;
      if (!number || !mediaUrl) return json({ error: "number e mediaUrl obrigatórios" }, 400);

      const endpoint = mediaType === "document" ? "/send/document" : "/send/media";
      const r = await uazapi(instanceUrl, endpoint, instanceToken, "POST", {
        number: number.replace(/\D/g, ""),
        media: mediaUrl,
        caption: caption || "",
      });
      if (!r.ok) return json({ error: `sendMedia falhou [${r.status}]`, details: r.data }, r.status);
      return json({ success: true, data: r.data });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err: any) {
    console.error("Edge function error:", err);
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
