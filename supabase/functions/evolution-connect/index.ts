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

    // If no token, cannot proceed (except for connect and deleteInstance)
    if (!instanceToken && action !== "connect" && action !== "deleteInstance") {
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

    // ── Helper: check if phone number is already used by another device ──
    const checkDuplicatePhone = async (phone: string): Promise<{ isDuplicate: boolean; existingDeviceName?: string }> => {
      if (!phone) return { isDuplicate: false };
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) return { isDuplicate: false };
      // Search for any other CONNECTED device with a matching number (by digits)
      const { data: existing } = await svc
        .from("devices")
        .select("id, name, number, status")
        .eq("user_id", user.id)
        .neq("id", deviceId)
        .not("number", "is", null)
        .in("status", ["Connected", "Ready", "authenticated"]);
      if (!existing || existing.length === 0) return { isDuplicate: false };
      const match = existing.find((d: any) => {
        const dDigits = (d.number || "").replace(/\D/g, "");
        return dDigits.length >= 10 && dDigits === digits;
      });
      if (match) return { isDuplicate: true, existingDeviceName: match.name };
      return { isDuplicate: false };
    };

    // ── connect ──
    if (action === "connect") {
      // First check if device already has a valid instance we can reuse
      const existingStatus = instanceToken ? await checkInstanceStatus() : null;
      
      if (existingStatus?.valid && existingStatus.status !== "connected") {
        // Instance exists and is valid but not connected — reuse it
        console.log("Reusing existing valid instance, skipping creation.");
      } else if (existingStatus?.status === "connected") {
        // Already connected
        const phone = existingStatus.owner || "";
        let formatted = "";
        if (phone) {
          const raw = String(phone).replace(/\D/g, "");
          if (raw.startsWith("55") && raw.length >= 12)
            formatted = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
          else if (raw) formatted = `+${raw}`;
        }
        const dupCheck = await checkDuplicatePhone(phone);
        if (dupCheck.isDuplicate) {
          return json({ success: false, error: `Este número já está conectado na instância "${dupCheck.existingDeviceName}". Desconecte lá primeiro.`, code: "DUPLICATE_PHONE" });
        }
        return json({ success: true, alreadyConnected: true, phone: formatted, status: "authenticated" });
      } else {
        // No valid instance — create a fresh one
        console.log("Creating fresh instance for new connection...");
        const created = await ensureValidInstance();
        if (!created) return json({ error: "Falha ao preparar instância." }, 500);
      }

      // Set proxy if provided
      if (body.proxyConfig?.host) {
        // Fire and forget - don't wait for proxy setup
        setProxy(instanceUrl, instanceToken, body.proxyConfig).catch(() => {});
      }

      // Immediately call connect on the fresh instance (skip status check - it's brand new)
      const connectRes = await uazapi(instanceUrl, "/instance/connect", instanceToken, "POST", {});
      if (connectRes.status === 401) {
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

      // Check if already connected (edge case)
      const connStatus = connInst.status || connectRes.data?.status;
      if (connStatus === "connected") {
        const phone = connInst.owner || connInst.phone || "";
        let formatted = "";
        if (phone) {
          const raw = String(phone).replace(/\D/g, "");
          if (raw.startsWith("55") && raw.length >= 12)
            formatted = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
          else if (raw) formatted = `+${raw}`;
        }
        const dup = await checkDuplicatePhone(phone);
        if (dup.isDuplicate) {
          await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST");
          return json({ success: false, error: `Este número já está conectado na instância "${dup.existingDeviceName}". Desconecte lá primeiro.`, code: "DUPLICATE_PHONE" });
        }
        await svc.from("devices").update({ status: "Ready", number: formatted }).eq("id", deviceId);
        return json({ success: true, alreadyConnected: true, phone: formatted, status: "authenticated" });
      }

      // Quick poll for QR if not in response (reduced: 4 attempts, 600ms each = max 2.4s)
      if (!qr) {
        for (let i = 0; i < 4; i++) {
          await new Promise(r => setTimeout(r, 600));
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
            const pollDup = await checkDuplicatePhone(phone);
            if (pollDup.isDuplicate) {
              await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST");
              return json({ success: false, error: `Este número já está conectado na instância "${pollDup.existingDeviceName}". Desconecte lá primeiro.`, code: "DUPLICATE_PHONE" });
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

    // ── requestPairingCode - Generate pairing code using phone number ──
    if (action === "requestPairingCode") {
      const phoneNumber = body.phoneNumber?.replace(/\D/g, "");
      if (!phoneNumber || phoneNumber.length < 10) {
        return json({ error: "Número de telefone inválido." }, 400);
      }

      // Ensure instance exists
      const currentCheck = await checkInstanceStatus();
      if (!currentCheck.valid) {
        const created = await ensureValidInstance();
        if (!created) return json({ error: "Falha ao criar instância." }, 500);
      }

      // Set proxy if provided
      if (body.proxyConfig?.host) {
        await setProxy(instanceUrl, instanceToken, body.proxyConfig);
      }

      // Check if already connected
      const statusCheck = await checkInstanceStatus();
      if (statusCheck.status === "connected") {
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

      // Disconnect if in a bad state
      if (statusCheck.status && statusCheck.status !== "disconnected" && statusCheck.status !== "connecting") {
        await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST");
        await new Promise(r => setTimeout(r, 500));
      }

      // Try multiple endpoint patterns for pairing code
      const endpoints = [
        { url: `/instance/connect?number=${phoneNumber}`, method: "POST" as const },
        { url: `/instance/connect?number=${phoneNumber}`, method: "GET" as const },
        { url: `/instance/pairingcode?number=${phoneNumber}`, method: "POST" as const },
      ];

      let pairingCode: string | null = null;
      let lastError = "";

      for (const ep of endpoints) {
        try {
          console.log(`Trying pairing code: ${ep.method} ${ep.url}`);
          const res = await uazapi(instanceUrl, ep.url, instanceToken, ep.method, ep.method === "POST" ? { number: phoneNumber } : undefined);
          console.log(`Pairing response:`, JSON.stringify(res.data).substring(0, 300));
          
          // Check multiple field names for the pairing code
          const code = res.data?.pairingCode || res.data?.pairing_code || res.data?.code;
          if (code && typeof code === "string" && code.length >= 6 && code.length <= 12) {
            pairingCode = code;
            break;
          }
          
          // Some APIs return the code inside instance object
          const inst = res.data?.instance || {};
          const instCode = inst.pairingCode || inst.pairing_code || inst.paircode;
          if (instCode && typeof instCode === "string" && instCode.length >= 6) {
            pairingCode = instCode;
            break;
          }

          // Check paircode at root level too
          if (res.data?.paircode && typeof res.data.paircode === "string" && res.data.paircode.length >= 6) {
            pairingCode = res.data.paircode;
            break;
          }

          if (!res.ok) {
            lastError = `${res.status}: ${JSON.stringify(res.data).substring(0, 100)}`;
          }
        } catch (e: any) {
          lastError = e.message || "Request failed";
          console.log(`Endpoint failed: ${ep.url}`, lastError);
        }
      }

      if (pairingCode) {
        return json({ success: true, pairingCode, status: "connecting" });
      }

      // If no pairing code but we got a QR code, suggest QR method instead
      const fallbackStatus = await checkInstanceStatus();
      if (fallbackStatus.qrcode) {
        return json({ 
          success: false, 
          error: "Este servidor não suporta código de pareamento. Use o QR Code para conectar.",
          suggestQr: true,
          qrCode: fallbackStatus.qrcode,
        }, 200);
      }

      return json({ 
        error: "Não foi possível gerar o código de pareamento. Use o QR Code para conectar.",
        suggestQr: true,
      }, 200);
    }

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
        // Check for duplicate phone
        const refreshDup = await checkDuplicatePhone(phone);
        if (refreshDup.isDuplicate) {
          await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST");
          return json({ success: false, error: `Este número já está conectado na instância "${refreshDup.existingDeviceName}". Desconecte lá primeiro.`, code: "DUPLICATE_PHONE" });
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

      if (isConnected && check.owner) {
        // Save phone and mark Ready
        const raw = String(check.owner).replace(/\D/g, "");
        let fmt = "";
        if (raw.startsWith("55") && raw.length >= 12)
          fmt = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
        else if (raw) fmt = `+${raw}`;
        // Check for duplicate phone
        const statusDup = await checkDuplicatePhone(check.owner);
        if (statusDup.isDuplicate) {
          await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST");
          await svc.from("devices").update({ status: "Disconnected", number: null }).eq("id", deviceId);
          return json({ success: false, error: `Este número já está conectado na instância "${statusDup.existingDeviceName}".`, code: "DUPLICATE_PHONE" });
        }
        await svc.from("devices").update({ status: "Ready", number: fmt }).eq("id", deviceId);
      }

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
      // Disconnect from WhatsApp
      await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST");
      
      // Delete the instance from UaZapi server to free the slot
      console.log("Logout: deleting instance from server...");
      const deleteEndpoints = ["/instance/delete", "/instance/remove"];
      let deleted = false;
      // Try with instance token
      for (const ep of deleteEndpoints) {
        try {
          const r = await uazapi(instanceUrl, ep, instanceToken, "POST");
          console.log(`Logout delete ${ep}: ${r.status}`);
          if (r.ok) { deleted = true; break; }
        } catch {}
      }
      // Try with admin token
      if (!deleted && BASE_URL && ADMIN_TOKEN) {
        for (const ep of deleteEndpoints) {
          try {
            const res = await fetch(`${BASE_URL}${ep}`, {
              method: "POST",
              headers: { admintoken: ADMIN_TOKEN, Accept: "application/json", "Content-Type": "application/json" },
              body: JSON.stringify({ token: instanceToken }),
            });
            console.log(`Logout admin delete ${ep}: ${res.status}`);
            if (res.ok) { deleted = true; break; }
          } catch {}
        }
      }
      console.log("Logout instance deletion:", deleted ? "success" : "failed (non-blocking)");
      
      // Clear token from device so a new one is created on reconnect
      await svc.from("devices").update({ 
        uazapi_token: null, 
        uazapi_base_url: null,
        status: "Disconnected",
        number: null,
      }).eq("id", deviceId);
      
      return json({ success: true, deleted });
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

      const nameEndpoints = [
        { path: "/profile/name", payload: { name: profileName } },
        { path: "/profile/update-name", payload: { name: profileName } },
        { path: "/instance/profile/name", payload: { name: profileName } },
        { path: "/profile-name", payload: { value: profileName } },
      ];

      let lastResult: any = null;
      for (const ep of nameEndpoints) {
        const r = await uazapi(instanceUrl, ep.path, instanceToken, "POST", ep.payload);
        console.log(`updateProfileName ${ep.path}: ${r.status}`, JSON.stringify(r.data).substring(0, 200));
        if (r.ok) {
          if (deviceId) {
            await svc.from("devices").update({ profile_name: profileName }).eq("id", deviceId);
          }
          return json({ success: true, endpoint: ep.path, ...r.data });
        }
        lastResult = r;
      }
      // Even if API fails, update local DB
      if (deviceId) {
        await svc.from("devices").update({ profile_name: profileName }).eq("id", deviceId);
      }
      return json({ success: false, error: "Nenhum endpoint de nome funcionou", lastStatus: lastResult?.status, lastData: lastResult?.data });
    }

    // ── updateProfilePicture ──
    if (action === "updateProfilePicture") {
      const { profilePictureData } = body;
      if (!profilePictureData) return json({ error: "profilePictureData obrigatório" }, 400);

      if (profilePictureData === "remove") {
        const removeEndpoints = ["/profile/picture/remove", "/profile/remove-picture", "/instance/profile/picture/remove"];
        for (const ep of removeEndpoints) {
          const r = await uazapi(instanceUrl, ep, instanceToken, "POST");
          console.log(`removePicture ${ep}: ${r.status}`);
          if (r.ok) {
            if (deviceId) await svc.from("devices").update({ profile_picture: null }).eq("id", deviceId);
            return json({ success: true, endpoint: ep, ...r.data });
          }
        }
        if (deviceId) await svc.from("devices").update({ profile_picture: null }).eq("id", deviceId);
        return json({ success: true, note: "Foto removida localmente" });
      }

      // profilePictureData can be a URL or base64
      const isUrl = profilePictureData.startsWith("http");
      console.log("Profile picture type:", isUrl ? "URL" : "base64", "length:", profilePictureData.length);

      const picEndpoints = [
        { path: "/profile/picture", payload: { picture: profilePictureData } },
        { path: "/profile/picture", payload: { url: profilePictureData } },
        { path: "/profile/picture", payload: { image: profilePictureData } },
        ...(isUrl ? [
          { path: "/profile/picture", payload: { picture: { url: profilePictureData } } },
        ] : []),
        { path: "/profile/update-picture", payload: { picture: profilePictureData } },
        { path: "/instance/profile/picture", payload: { picture: profilePictureData } },
        { path: "/profile-picture", payload: { value: profilePictureData } },
      ];

      let lastPicResult: any = null;
      for (const ep of picEndpoints) {
        const r = await uazapi(instanceUrl, ep.path, instanceToken, "POST", ep.payload);
        console.log(`updatePicture ${ep.path} payload-keys=${Object.keys(ep.payload).join(",")}: ${r.status}`, JSON.stringify(r.data).substring(0, 300));
        if (r.ok) {
          if (deviceId) {
            await svc.from("devices").update({ profile_picture: profilePictureData }).eq("id", deviceId);
          }
          return json({ success: true, endpoint: ep.path, ...r.data });
        }
        lastPicResult = r;
      }
      return json({ success: false, error: "Nenhum endpoint de foto funcionou", lastStatus: lastPicResult?.status, lastData: lastPicResult?.data });
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

    // ── deleteInstance - Delete instance from UaZapi server ──
    if (action === "deleteInstance") {
      console.log("Deleting instance from UaZapi server. Token:", !!instanceToken, "AdminToken:", !!ADMIN_TOKEN);
      let deleted = false;

      // Method 1: Try with instance token first
      if (instanceToken) {
        const instanceEndpoints = ["/instance/delete", "/instance/logout", "/instance/disconnect"];
        for (const ep of instanceEndpoints) {
          try {
            const r = await uazapi(instanceUrl, ep, instanceToken, "POST");
            console.log(`Delete (instance token) ${ep}: ${r.status}`, JSON.stringify(r.data).substring(0, 200));
            if (r.ok) { deleted = true; break; }
          } catch (e: any) {
            console.log(`Delete ${ep} error:`, e.message);
          }
        }
      }

      // Method 2: Try with admin token (admintoken header) - UaZapi admin endpoint
      if (!deleted && BASE_URL && ADMIN_TOKEN) {
        const adminEndpoints = [
          { path: "/instance/delete", body: { token: instanceToken } },
          { path: "/instance/remove", body: { token: instanceToken } },
        ];
        for (const ep of adminEndpoints) {
          try {
            // Use admintoken header
            const res = await fetch(`${BASE_URL}${ep.path}`, {
              method: "POST",
              headers: {
                admintoken: ADMIN_TOKEN,
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(ep.body),
            });
            const data = await res.json().catch(() => ({}));
            console.log(`Delete (admin) ${ep.path}: ${res.status}`, JSON.stringify(data).substring(0, 200));
            if (res.ok) { deleted = true; break; }
          } catch (e: any) {
            console.log(`Delete admin ${ep.path} error:`, e.message);
          }
        }
      }

      console.log("Instance deletion result:", deleted ? "success" : "failed (non-blocking)");
      return json({ success: true, deleted });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err: any) {
    console.error("Edge function error:", err);
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
