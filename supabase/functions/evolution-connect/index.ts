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
  // Try admintoken, token, Bearer in sequence
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

      // Save token to device
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

    // ── Helper: check if token is valid ──
    const isTokenValid = async (): Promise<boolean> => {
      if (!instanceToken) return false;
      const r = await uazapi(instanceUrl, "/instance/status", instanceToken, "GET");
      return r.status !== 401;
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

    // ── connect ──
    if (action === "connect") {
      // Step 1: Ensure we have a valid instance
      if (!instanceToken) {
        const created = await ensureValidInstance();
        if (!created) return json({ error: "Falha ao criar instância na UaZapi." }, 500);
      } else {
        // Check if existing token is still valid
        const valid = await isTokenValid();
        if (!valid) {
          console.log("Token invalid, recreating...");
          const created = await ensureValidInstance();
          if (!created) return json({ error: "Falha ao recriar instância (token expirado)." }, 500);
        }
      }

      // Step 2: Set proxy if provided
      if (body.proxyConfig?.host) {
        await setProxy(instanceUrl, instanceToken, body.proxyConfig);
      }

      // Step 3: Check current status
      const statusCheck = await uazapi(instanceUrl, "/instance/status", instanceToken, "GET");
      const inst = statusCheck.data?.instance || statusCheck.data || {};
      const currentStatus = inst.status || statusCheck.data?.status || "";

      // Already connected
      if (currentStatus === "connected") {
        const phone = inst.owner || inst.phone || "";
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

      // Existing QR
      const existingQr = inst.qrcode || statusCheck.data?.qrcode;
      if (existingQr && currentStatus === "connecting") {
        return json({ success: true, base64: existingQr, qr: existingQr, status: "connecting" });
      }

      // Disconnect if needed
      if (currentStatus && currentStatus !== "disconnected") {
        await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST");
        await new Promise(r => setTimeout(r, 500));
      }

      // Step 4: Connect
      const connectRes = await uazapi(instanceUrl, "/instance/connect", instanceToken, "POST", {});
      if (connectRes.status === 401) {
        return json({ error: "Token inválido mesmo após recriação.", code: "TOKEN_INVALID" }, 401);
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

          // Check if connected during polling
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

    // ── status ──
    if (action === "status") {
      const r = await uazapi(instanceUrl, "/instance/status", instanceToken, "GET");
      if (r.status === 401) return json({ success: true, status: "token_invalid", tokenInvalid: true });

      const inst = r.data?.instance || r.data || {};
      const state = inst.status || r.data?.state || r.data?.status || "unknown";
      const isConnected = state === "connected";

      return json({
        success: true,
        status: isConnected ? "authenticated" : state,
        phone: inst.owner || r.data?.phone || r.data?.number || "",
        base64: inst.qrcode || r.data?.qrcode || null,
        qr: inst.qrcode || r.data?.qrcode || null,
        profileName: inst.profileName || "",
        profilePicUrl: inst.profilePicUrl || "",
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

      // Upload base64
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
