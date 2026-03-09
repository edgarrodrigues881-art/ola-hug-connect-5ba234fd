// evolution-connect v2.1
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
  method: "GET" | "POST" | "DELETE" = "POST",
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
  } catch (_e) {
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

// ── Proxy connectivity test (real HTTP-through-proxy) ───────────────────
async function testProxyConnectivity(
  proxy: { host: string; port: string; username?: string; password?: string; type?: string },
): Promise<{ alive: boolean; error?: string }> {
  // Opens a raw TCP connection to the proxy and sends an HTTP request
  // THROUGH the proxy to httpbin.org — this validates the proxy actually works
  const TEST_URL = "http://httpbin.org/ip";
  const TIMEOUT_MS = 8000;

  try {
    const conn = await Promise.race([
      Deno.connect({ hostname: proxy.host, port: Number(proxy.port) }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TCP connect timeout")), TIMEOUT_MS)
      ),
    ]);

    // Build HTTP/1.1 request to send THROUGH the proxy
    const authHeader = proxy.username
      ? `Proxy-Authorization: Basic ${btoa(`${proxy.username}:${proxy.password || ""}`)}\r\n`
      : "";
    const httpReq =
      `GET ${TEST_URL} HTTP/1.1\r\n` +
      `Host: httpbin.org\r\n` +
      `${authHeader}` +
      `Connection: close\r\n\r\n`;

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    await conn.write(encoder.encode(httpReq));

    // Read response (up to 4KB is enough to see status line)
    const buf = new Uint8Array(4096);
    const readPromise = conn.read(buf);
    const n = await Promise.race([
      readPromise,
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Read timeout")), TIMEOUT_MS)
      ),
    ]);

    try { conn.close(); } catch (_e) { /* ignore */ }

    if (!n || n === 0) {
      console.log(`Proxy test FAILED: ${proxy.host}:${proxy.port} → empty response`);
      return { alive: false, error: "Proxy retornou resposta vazia" };
    }

    const response = decoder.decode(buf.subarray(0, n));
    const statusLine = response.split("\r\n")[0] || "";
    const statusCode = parseInt(statusLine.split(" ")[1] || "0", 10);

    console.log(`Proxy test: ${proxy.host}:${proxy.port} → ${statusLine.substring(0, 80)}`);

    // 200 = proxy working, 407 = auth failed, other 4xx/5xx = proxy issue
    if (statusCode === 200) {
      return { alive: true };
    }
    if (statusCode === 407) {
      return { alive: false, error: "Proxy requer autenticação (credenciais inválidas)" };
    }
    if (statusCode >= 400) {
      return { alive: false, error: `Proxy retornou status ${statusCode}` };
    }
    // Any other response means something answered — consider alive if 2xx/3xx
    if (statusCode >= 200 && statusCode < 400) {
      return { alive: true };
    }
    return { alive: false, error: `Resposta inesperada: ${statusLine.substring(0, 60)}` };
  } catch (e) {
    const msg = e?.message || String(e);
    console.log(`Proxy test FAILED: ${proxy.host}:${proxy.port} → ${msg}`);
    if (msg.includes("connect timeout") || msg.includes("TCP connect")) {
      return { alive: false, error: "Proxy inacessível (timeout na conexão)" };
    }
    if (msg.includes("Read timeout")) {
      return { alive: false, error: "Proxy não respondeu (timeout de leitura)" };
    }
    if (msg.includes("Connection refused")) {
      return { alive: false, error: "Conexão recusada pela proxy" };
    }
    return { alive: false, error: `Erro: ${msg.substring(0, 100)}` };
  }
}

// ── Proxy setter ────────────────────────────────────────────────────────
async function setProxy(
  baseUrl: string,
  token: string,
  proxy: { host: string; port: string; username?: string; password?: string; type?: string },
): Promise<{ ok: boolean; error?: string }> {
  // STEP 1: Real connectivity test — sends request THROUGH the proxy
  const test = await testProxyConnectivity(proxy);
  if (!test.alive) {
    console.log(`Proxy ${proxy.host}:${proxy.port} FAILED real test — blocking. Reason: ${test.error}`);
    return { ok: false, error: test.error || "Proxy inválida" };
  }

  // STEP 2: Configure proxy on UaZapi
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
        return { ok: true };
      }
    } catch (_e) { /* ignore */ }
  }
  console.log("Proxy set failed on all UaZapi endpoints");
  return { ok: false, error: "Falha ao configurar proxy no provedor" };
}

function formatBrPhone(phone: string): string {
  const raw = String(phone).replace(/\D/g, "");
  if (!raw) return "";
  if (raw.startsWith("55") && raw.length === 13) {
    // 55 + DD + 9XXXX-XXXX (celular com 9)
    return `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
  }
  if (raw.startsWith("55") && raw.length === 12) {
    // 55 + DD + XXXX-XXXX (sem o 9 extra)
    return `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 8)}-${raw.slice(8)}`;
  }
  if (raw.startsWith("55") && raw.length >= 10) {
    // fallback: split last 4 digits
    return `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, raw.length - 4)}-${raw.slice(raw.length - 4)}`;
  }
  return `+${raw}`;
}

async function oplog(client: any, userId: string, event: string, details: string, deviceId?: string | null, meta?: any) {
  try { await client.from("operation_logs").insert({ user_id: userId, device_id: deviceId || null, event, details, meta: meta || {} }); } catch (_e) { /* ignore */ }
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

    // ── createInstance ── BLOCKED: tokens must come from the admin pool
    if (action === "createInstance") {
      return json({
        error: "Criação de instâncias ad-hoc desabilitada. Tokens são provisionados pelo administrador via pool.",
        code: "CREATE_BLOCKED",
      }, 403);
    }

    // ── Resolve device credentials ──
    if (!deviceId) return json({ error: "deviceId obrigatório" }, 400);

    const { data: device } = await svc
      .from("devices")
      .select("name, uazapi_token, uazapi_base_url, login_type")
      .eq("id", deviceId)
      .single();

    let instanceUrl = (device?.uazapi_base_url || "").replace(/\/+$/, "");
    let instanceToken = device?.uazapi_token || "";
    const deviceName = device?.name || "instance";
    const isReportDevice = device?.login_type === "report_wa";

    // ── PLAN CHECK for all device operations (except deleteInstance and status) ──
    if (action !== "deleteInstance" && action !== "status" && action !== "getBaseUrl" && action !== "logout") {
      const { data: activeSub } = await svc
        .from("subscriptions")
        .select("expires_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: userProfile } = await svc.from("profiles").select("status").eq("id", user.id).maybeSingle();
      const planExpired = !activeSub || new Date(activeSub.expires_at) < new Date();
      const accountBlocked = userProfile?.status === "suspended" || userProfile?.status === "cancelled";
      if (planExpired || accountBlocked) {
        return json({ error: "Seu plano está inativo. Ative um plano para continuar.", code: "NO_ACTIVE_PLAN" }, 403);
      }
    }

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
      } catch (_e) {
        return { valid: false, status: "error" };
      }
    };

    // (auto-creation removed — tokens are now assigned manually by admin via pool)

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
      // Auto-assign token from pool for report_wa devices
      if (!instanceToken && isReportDevice) {
        console.log("Report device has no token — auto-assigning from pool...");
        const { data: poolToken } = await svc.from("user_api_tokens")
          .select("id, token")
          .eq("user_id", user.id)
          .eq("status", "available")
          .is("device_id", null)
          .limit(1)
          .maybeSingle();
        
        if (poolToken) {
          // Assign token to this device
          await svc.from("user_api_tokens").update({
            device_id: deviceId,
            status: "in_use",
            assigned_at: new Date().toISOString(),
          }).eq("id", poolToken.id);

          // Also set on the device itself
          await svc.from("devices").update({
            uazapi_token: poolToken.token,
            uazapi_base_url: BASE_URL,
          }).eq("id", deviceId);

          instanceToken = poolToken.token;
          instanceUrl = BASE_URL;
          console.log("Auto-assigned token to report device:", poolToken.id);
        }
      }

      // Device MUST have a valid token
      if (!instanceToken) {
        return json({ error: "Nenhum token disponível no pool. Adicione tokens primeiro.", code: "NO_TOKEN" }, 400);
      }

      // Check if existing token is valid
      const existingStatus = await checkInstanceStatus();
      
      if (!existingStatus.valid) {
        return json({ error: "O token desta instância é inválido (401). Solicite ao administrador um novo token.", code: "TOKEN_INVALID" }, 401);
      }

      if (existingStatus.status === "connected") {
        // Already connected
        const phone = existingStatus.owner || "";
        let formatted = "";
        if (phone) {
          formatted = formatBrPhone(phone);
        }
        const dupCheck = await checkDuplicatePhone(phone);
        if (dupCheck.isDuplicate) {
          return json({ success: false, error: `Este número já está conectado na instância "${dupCheck.existingDeviceName}". Desconecte lá primeiro.`, code: "DUPLICATE_PHONE" });
        }
        return json({ success: true, alreadyConnected: true, phone: formatted, status: "authenticated" });
      }

      // Set proxy if provided — BLOCKING: if proxy fails, do NOT generate QR
      if (body.proxyConfig?.host) {
        const proxyResult = await setProxy(instanceUrl, instanceToken, body.proxyConfig);
        await oplog(svc, user.id, proxyResult.ok ? "proxy_configured" : "proxy_failed", `Proxy ${proxyResult.ok ? "configurada" : "FALHA"} para "${deviceName}": ${proxyResult.error || "OK"}`, deviceId, { host: body.proxyConfig.host, success: proxyResult.ok, error: proxyResult.error });
        if (!proxyResult.ok) {
          // Mark proxy as INVALID in database if we can find it
          if (body.proxyId) {
            await svc.from("proxies").update({ status: "INVALID" }).eq("id", body.proxyId);
          }
          return json({ error: proxyResult.error || "Proxy inválida ou inacessível. QR Code bloqueado.", code: "PROXY_FAILED" }, 400);
        }
      }

      // Request QR code using the existing assigned token
      const connectRes = await uazapi(instanceUrl, "/instance/connect", instanceToken, "POST", {});
      if (connectRes.status === 401) {
        await oplog(svc, user.id, "uazapi_error", `Token inválido ao gerar QR para "${deviceName}"`, deviceId, { status: 401 });
        return json({ error: "Token inválido ao gerar QR. Solicite ao administrador um novo token.", code: "TOKEN_INVALID" }, 401);
      }

      const connInst = connectRes.data?.instance || connectRes.data || {};
      let qr = connInst.qrcode || connectRes.data?.qrcode;

      // Check if already connected (edge case)
      const connStatus = connInst.status || connectRes.data?.status;
      if (connStatus === "connected") {
        const phone = connInst.owner || connInst.phone || "";
        let formatted = "";
        if (phone) {
          formatted = formatBrPhone(phone);
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
            const fmt = phone ? formatBrPhone(phone) : "";
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

      // Validate token
      const currentCheck = await checkInstanceStatus();
      if (!currentCheck.valid) {
        return json({ error: "Token inválido. Solicite ao administrador um novo token.", code: "TOKEN_INVALID" }, 401);
      }

      // Set proxy if provided — BLOCKING: if proxy fails, do NOT proceed
      if (body.proxyConfig?.host) {
        const proxyResult = await setProxy(instanceUrl, instanceToken, body.proxyConfig);
        await oplog(svc, user.id, proxyResult.ok ? "proxy_configured" : "proxy_failed", `Proxy ${proxyResult.ok ? "configurada" : "FALHA"} (pairing) para "${deviceName}": ${proxyResult.error || "OK"}`, deviceId, { host: body.proxyConfig.host, success: proxyResult.ok, error: proxyResult.error });
        if (!proxyResult.ok) {
          if (body.proxyId) {
            await svc.from("proxies").update({ status: "INVALID" }).eq("id", body.proxyId);
          }
          return json({ error: proxyResult.error || "Proxy inválida ou inacessível. Pareamento bloqueado.", code: "PROXY_FAILED" }, 400);
        }
      }

      // Check if already connected
      const statusCheck = await checkInstanceStatus();
      if (statusCheck.status === "connected") {
        const phone = statusCheck.owner || "";
        let formatted = "";
        if (phone) {
          formatted = formatBrPhone(phone);
        }
        await svc.from("devices").update({ status: "Ready", number: formatted }).eq("id", deviceId);
        return json({ success: true, alreadyConnected: true, phone: formatted, status: "authenticated" });
      }

      // Ensure instance is disconnected before requesting pairing code
      if (statusCheck.status !== "disconnected" && statusCheck.status) {
        console.log("Pairing: instance not disconnected, disconnecting first...");
        await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST");
        await new Promise(r => setTimeout(r, 1500));
      }

      // Call connect with the phone field (UaZapi uses "phone" not "number")
      console.log(`Pairing: calling POST /instance/connect with phone=${phoneNumber}`);
      const connectRes = await uazapi(instanceUrl, "/instance/connect", instanceToken, "POST", { phone: phoneNumber });
      console.log(`Pairing connect response:`, JSON.stringify(connectRes.data).substring(0, 500));

      // Extract pairing code from response
      const extractCode = (obj: any): string | null => {
        if (!obj || typeof obj !== "object") return null;
        for (const key of ["pairingCode", "pairing_code", "paircode", "code"]) {
          const val = obj[key];
          if (val && typeof val === "string" && val.length >= 4 && val.length <= 20) {
            return val;
          }
        }
        if (obj.instance) return extractCode(obj.instance);
        return null;
      };

      let pairingCode = extractCode(connectRes.data);

      // If not found, poll status a few times to check if paircode appears
      if (!pairingCode) {
        for (let i = 0; i < 5; i++) {
          await new Promise(r => setTimeout(r, 800));
          const poll = await uazapi(instanceUrl, "/instance/status", instanceToken, "GET");
          console.log(`Pairing poll ${i}:`, JSON.stringify(poll.data).substring(0, 400));
          pairingCode = extractCode(poll.data);
          if (pairingCode) break;
          // Check if connected already
          const st = poll.data?.instance?.status || poll.data?.status;
          if (st === "connected") {
            const phone = poll.data?.instance?.owner || poll.data?.instance?.phone || "";
            const fmt = phone ? formatBrPhone(phone) : "";
            await svc.from("devices").update({ status: "Ready", number: fmt }).eq("id", deviceId);
            return json({ success: true, alreadyConnected: true, phone: fmt, status: "authenticated" });
          }
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
          formatted = formatBrPhone(phone);
        }
        // Check for duplicate phone
        const refreshDup = await checkDuplicatePhone(phone);
        if (refreshDup.isDuplicate) {
          await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST");
          return json({ success: false, error: `Este número já está conectado na instância "${refreshDup.existingDeviceName}". Desconecte lá primeiro.`, code: "DUPLICATE_PHONE" });
        }
        return json({ success: true, alreadyConnected: true, phone: formatted, status: "authenticated" });
      }

      // If token is invalid, return error
      if (!statusCheck.valid) {
        return json({ error: "Token expirado. Solicite ao administrador um novo token.", code: "TOKEN_INVALID" }, 401);
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
        const fmt = formatBrPhone(raw);
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
      // Disconnect from WhatsApp session only — keep the token assigned
      if (instanceToken && instanceUrl) {
        const lr = await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST");
        console.log("Logout: disconnect API result:", lr.status, JSON.stringify(lr.data).substring(0, 200));
      } else {
        console.log("Logout: no token/url configured, skipping API call, just updating DB status.");
      }
      
      // Clear session data but KEEP uazapi_token and uazapi_base_url
      await svc.from("devices").update({ 
        status: "Disconnected",
        number: null,
        profile_picture: null,
        profile_name: null,
      }).eq("id", deviceId);
      
      return json({ success: true });
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

      // Method 1: Disconnect + delete with instance token (try POST and DELETE)
      if (instanceToken) {
        try { await uazapi(instanceUrl, "/instance/disconnect", instanceToken, "POST"); } catch (_e) { /* ignore */ }
        
        for (const ep of ["/instance/delete", "/instance/remove"]) {
          for (const m of ["DELETE" as const, "POST" as const]) {
            try {
              const r = await uazapi(instanceUrl, ep, instanceToken, m);
              console.log(`Delete (inst) ${m} ${ep}: ${r.status}`);
              if (r.ok) { deleted = true; break; }
            } catch (_e) { /* ignore */ }
          }
          if (deleted) break;
        }
      }

      // Method 2: Admin token with multiple auth header patterns
      if (!deleted && BASE_URL && ADMIN_TOKEN) {
        const headerVariants = [
          { admintoken: ADMIN_TOKEN },
          { token: ADMIN_TOKEN },
          { Authorization: `Bearer ${ADMIN_TOKEN}` },
        ];
        
        outer:
        for (const ep of ["/instance/delete", "/instance/remove"]) {
          for (const method of ["DELETE", "POST"] as const) {
            for (const authHeaders of headerVariants) {
              try {
                const res = await fetch(`${BASE_URL}${ep}`, {
                  method,
                  headers: { ...authHeaders, Accept: "application/json", "Content-Type": "application/json" },
                  body: JSON.stringify({ token: instanceToken }),
                });
                const text = await res.text();
                console.log(`Delete (admin) ${method} ${ep} h=${Object.keys(authHeaders)[0]}: ${res.status}`, text.substring(0, 200));
                if (res.ok) { deleted = true; break outer; }
                if (res.status === 401) continue;
                if (res.status === 405) break; // wrong method, try next
              } catch (_e) { /* ignore */ }
            }
          }
        }
      }

      // Release token back to pool (server-side with service role for reliability)
      await svc.from("user_api_tokens").update({
        status: "available",
        device_id: null,
        assigned_at: null,
      }).eq("device_id", deviceId);

      // Clear device credentials regardless
      await svc.from("devices").update({
        uazapi_token: null,
        uazapi_base_url: null,
      }).eq("id", deviceId);

      console.log("Instance deletion result:", deleted ? "success" : "failed (non-blocking)", "Token released back to pool.");
      return json({ success: true, deleted });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err) {
    console.error("Edge function error:", err);
    return json({ error: err.message || "Erro interno" }, 500);
  }
});
