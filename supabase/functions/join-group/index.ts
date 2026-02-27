import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractInviteCode(link: string): string | null {
  try {
    const cleaned = link.trim()
      .replace(/^https?:\/\//, "")
      .replace(/^chat\.whatsapp\.com\//, "");
    const code = cleaned.split("?")[0].split("/")[0].trim();
    return code && code.length >= 10 ? code : null;
  } catch {
    return null;
  }
}

interface JoinRequest {
  groupLink: string;
  groupName: string;
  deviceId: string;
  deviceName: string;
}

interface JoinResult {
  device: string;
  group: string;
  status: "success" | "error" | "already_member" | "pending_approval";
  error?: string;
  responseStatus?: number;
  responseBody?: string;
  inviteCode?: string;
  durationMs?: number;
  attempt: number;
}

async function tryJoin(
  baseUrl: string,
  token: string,
  inviteCode: string,
  attempt: number,
): Promise<{ ok: boolean; status: number; body: any; raw: string }> {
  // Try PUT first (UaZapi V2)
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // Try multiple auth header patterns
  const authHeaders = [
    { token },
    { admintoken: token },
    { Authorization: `Bearer ${token}` },
  ];

  for (const authH of authHeaders) {
    try {
      const res = await fetch(`${baseUrl}/group/acceptInviteGroup`, {
        method: "PUT",
        headers: { ...headers, ...authH },
        body: JSON.stringify({ inviteCode }),
      });

      const raw = await res.text();
      let body: any;
      try {
        body = JSON.parse(raw);
      } catch {
        body = { raw };
      }

      // If 405, try POST
      if (res.status === 405) {
        const res2 = await fetch(`${baseUrl}/group/acceptInviteGroup`, {
          method: "POST",
          headers: { ...headers, ...authH },
          body: JSON.stringify({ inviteCode }),
        });
        const raw2 = await res2.text();
        let body2: any;
        try {
          body2 = JSON.parse(raw2);
        } catch {
          body2 = { raw: raw2 };
        }

        if (res2.status !== 405) {
          return { ok: res2.ok, status: res2.status, body: body2, raw: raw2 };
        }
        continue;
      }

      if (res.status === 401 || res.status === 403) {
        continue; // try next auth header
      }

      return { ok: res.ok, status: res.status, body, raw };
    } catch (err) {
      continue;
    }
  }

  return { ok: false, status: 0, body: { message: "Todos os métodos de autenticação falharam" }, raw: "" };
}

function interpretResult(status: number, body: any): { joinStatus: JoinResult["status"]; error?: string } {
  if (status >= 200 && status < 300) {
    const msg = (body?.message || body?.msg || "").toLowerCase();
    if (msg.includes("already") || msg.includes("já")) {
      return { joinStatus: "already_member" };
    }
    if (msg.includes("pending") || msg.includes("approval") || msg.includes("aprovação")) {
      return { joinStatus: "pending_approval", error: "Aguardando aprovação do admin" };
    }
    return { joinStatus: "success" };
  }

  const msg = body?.message || body?.msg || JSON.stringify(body).substring(0, 200);

  if (status === 404) return { joinStatus: "error", error: "Convite inválido ou expirado" };
  if (status === 409) return { joinStatus: "already_member" };
  if (status === 429) return { joinStatus: "error", error: "Rate limited — tente novamente mais tarde" };
  if (status === 0) return { joinStatus: "error", error: msg };

  return { joinStatus: "error", error: `Erro ${status}: ${msg}` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // Support both old format and new format
    const items: JoinRequest[] = body.items || [];
    if (!items.length && body.groupLinks?.length && body.deviceIds?.length) {
      // Legacy format: expand
      for (const deviceId of body.deviceIds) {
        for (const groupLink of body.groupLinks) {
          items.push({ groupLink, groupName: groupLink, deviceId, deviceName: deviceId });
        }
      }
    }

    if (!items.length) {
      return new Response(
        JSON.stringify({ error: "Nenhum item para processar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
    const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    // Fetch all unique device IDs
    const deviceIds = [...new Set(items.map((i) => i.deviceId))];
    const { data: devices } = await supabase
      .from("devices")
      .select("id, name, number, status, uazapi_token, uazapi_base_url")
      .in("id", deviceIds)
      .eq("user_id", user.id);

    const deviceMap = new Map((devices || []).map((d: any) => [d.id, d]));

    const results: JoinResult[] = [];

    for (const item of items) {
      const startTime = Date.now();
      const device = deviceMap.get(item.deviceId);

      // Step 1: Validate device
      if (!device) {
        const r: JoinResult = {
          device: item.deviceName,
          group: item.groupName,
          status: "error",
          error: "Dispositivo não encontrado",
          attempt: 1,
          durationMs: Date.now() - startTime,
        };
        results.push(r);
        await logResult(supabase, user.id, item, r);
        continue;
      }

      const deviceToken = device.uazapi_token || UAZAPI_TOKEN;
      const deviceBaseUrl = (device.uazapi_base_url || UAZAPI_BASE_URL || "").replace(/\/+$/, "");

      if (!deviceToken || !deviceBaseUrl) {
        const r: JoinResult = {
          device: device.name,
          group: item.groupName,
          status: "error",
          error: "Token ou URL não configurado para este dispositivo",
          attempt: 1,
          durationMs: Date.now() - startTime,
        };
        results.push(r);
        await logResult(supabase, user.id, item, r);
        continue;
      }

      const onlineStatuses = ["Connected", "authenticated", "Ready", "ready"];
      if (!onlineStatuses.includes(device.status)) {
        const r: JoinResult = {
          device: device.name,
          group: item.groupName,
          status: "error",
          error: "Instância desconectada",
          attempt: 1,
          durationMs: Date.now() - startTime,
        };
        results.push(r);
        await logResult(supabase, user.id, item, r);
        continue;
      }

      // Step 2: Extract invite code
      const inviteCode = extractInviteCode(item.groupLink);
      if (!inviteCode) {
        const r: JoinResult = {
          device: device.name,
          group: item.groupName,
          status: "error",
          error: "Link inválido — não foi possível extrair o código de convite",
          inviteCode: "",
          attempt: 1,
          durationMs: Date.now() - startTime,
        };
        results.push(r);
        await logResult(supabase, user.id, item, r);
        continue;
      }

      // Step 3: Join with retry
      let finalResult: JoinResult | null = null;
      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const joinRes = await tryJoin(deviceBaseUrl, deviceToken, inviteCode, attempt);
        const interpreted = interpretResult(joinRes.status, joinRes.body);

        const r: JoinResult = {
          device: device.name,
          group: item.groupName,
          status: interpreted.joinStatus,
          error: interpreted.error,
          responseStatus: joinRes.status,
          responseBody: joinRes.raw.substring(0, 500),
          inviteCode,
          attempt,
          durationMs: Date.now() - startTime,
        };

        // Don't retry for non-transient errors
        if (
          interpreted.joinStatus === "success" ||
          interpreted.joinStatus === "already_member" ||
          interpreted.joinStatus === "pending_approval" ||
          joinRes.status === 404 ||
          joinRes.status === 409
        ) {
          finalResult = r;
          break;
        }

        // Retry only for transient errors
        if (attempt < maxAttempts && (joinRes.status === 429 || joinRes.status >= 500 || joinRes.status === 0)) {
          await new Promise((res) => setTimeout(res, 3000));
          continue;
        }

        finalResult = r;
      }

      if (finalResult) {
        results.push(finalResult);
        await logResult(supabase, user.id, item, finalResult);
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("join-group error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function logResult(supabase: any, userId: string, item: JoinRequest, result: JoinResult) {
  try {
    await supabase.from("group_join_logs").insert({
      user_id: userId,
      device_id: item.deviceId,
      device_name: result.device,
      group_name: item.groupName,
      group_link: item.groupLink,
      invite_code: result.inviteCode || "",
      endpoint_called: "group/acceptInviteGroup",
      response_status: result.responseStatus || 0,
      response_body: (result.responseBody || "").substring(0, 1000),
      result: result.status,
      error_message: result.error || null,
      attempt: result.attempt,
      duration_ms: result.durationMs || 0,
    });
  } catch (e) {
    console.error("Failed to log join result:", e);
  }
}
