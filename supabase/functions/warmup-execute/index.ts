import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const defaultMessages = [
  "Bom dia! 😊",
  "Boa tarde pessoal!",
  "Boa noite! 🌙",
  "Alguém sabe de alguma novidade?",
  "Como vocês estão?",
  "Valeu pessoal! 👍",
  "Ótima informação, obrigado!",
  "Concordo totalmente 👏",
  "Interessante isso!",
  "Show de bola! 🔥",
  "Boa semana a todos!",
  "Obrigado por compartilhar!",
  "Muito bom isso!",
  "Top demais 🚀",
  "Verdade!",
  "Com certeza!",
  "Excelente ponto!",
  "Parabéns pelo conteúdo 🎉",
  "Adorei essa dica!",
  "Muito útil, valeu!",
  "Tô acompanhando 👀",
  "Boa! Vou aplicar isso",
  "Sensacional 💯",
  "Que legal, não sabia disso",
  "Perfeito, obrigado!",
  "Salvei aqui, valeu!",
  "Bom demais 🙌",
  "Isso aí, concordo",
  "Exatamente!",
  "Massa demais!",
];

async function uazapiRequest(
  baseUrl: string,
  token: string,
  endpoint: string,
  payload: any,
  method: "POST" | "GET" = "POST"
) {
  let url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    token: token,
    Accept: "application/json",
  };

  let fetchOptions: RequestInit;
  if (method === "GET") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null) params.append(key, String(value));
    }
    if (params.toString()) url += `?${params.toString()}`;
    fetchOptions = { method: "GET", headers };
  } else {
    headers["Content-Type"] = "application/json";
    fetchOptions = { method: "POST", headers, body: JSON.stringify(payload) };
  }

  const res = await fetch(url, fetchOptions);
  const text = await res.text();

  // Method fallback: POST -> GET on 405
  if (res.status === 405 && method === "POST") {
    return uazapiRequest(baseUrl, token, endpoint, payload, "GET");
  }

  if (!res.ok) {
    let errorMsg = `API error ${res.status}`;
    try {
      const d = JSON.parse(text);
      errorMsg = d?.message || d?.error || text;
    } catch {
      errorMsg = text;
    }
    throw new Error(errorMsg);
  }
  return JSON.parse(text);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDelay(minSec: number, maxSec: number): Promise<void> {
  const ms = (minSec + Math.random() * (maxSec - minSec)) * 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isWithinTimeWindow(startTime: string, endTime: string): boolean {
  const now = new Date();
  const brHour = (now.getUTCHours() - 3 + 24) % 24;
  const brMin = now.getUTCMinutes();
  const currentMinutes = brHour * 60 + brMin;

  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

async function fetchDeviceGroups(
  baseUrl: string,
  token: string
): Promise<Array<{ jid: string; name: string }>> {
  const results: Array<{ jid: string; name: string }> = [];

  try {
    const data = await uazapiRequest(baseUrl, token, "/group/list", {}, "GET");

    if (Array.isArray(data)) {
      for (const g of data) {
        const jid = g.jid || g.JID || g.id || g.groupJid;
        const name = g.name || g.Name || g.subject || g.Subject || g.groupName || "";
        if (jid && jid.includes("@g.us")) {
          results.push({ jid, name });
        }
      }
    } else if (data?.groups && Array.isArray(data.groups)) {
      for (const g of data.groups) {
        const jid = g.jid || g.JID || g.id || g.groupJid;
        const name = g.name || g.Name || g.subject || g.Subject || g.groupName || "";
        if (jid && jid.includes("@g.us")) {
          results.push({ jid, name });
        }
      }
    }
  } catch (e) {
    try {
      const chats = await uazapiRequest(baseUrl, token, "/chat/getChats", {}, "GET");
      if (Array.isArray(chats)) {
        for (const c of chats) {
          const jid = c.id || c.jid || c.JID;
          const name = c.name || c.Name || c.subject || c.Subject || "";
          if (jid && jid.includes("@g.us")) {
            results.push({ jid, name });
          }
        }
      }
    } catch (e2) {
      console.error("Failed to fetch groups");
    }
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // === AUTH VALIDATION ===
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Validate the JWT
  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const targetUserId = claimsData.claims.sub as string;
  let targetSessionId: string | null = null;
  let forceExecute = false;

  try {
    const body = await req.json().catch(() => ({}));
    targetSessionId = body.sessionId || null;
    forceExecute = body.forceExecute === true;
  } catch {}

  try {
    let query = supabase
      .from("warmup_sessions")
      .select("*")
      .eq("status", "running")
      .eq("user_id", targetUserId);

    if (targetSessionId) query = query.eq("id", targetSessionId);

    const { data: sessions, error: sessErr } = await query;
    if (sessErr) throw sessErr;

    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active warmup sessions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const session of sessions) {
      try {
        if (!forceExecute && !isWithinTimeWindow(session.start_time, session.end_time)) {
          results.push({ session_id: session.id, status: "skipped", reason: "outside_time_window" });
          continue;
        }

        const dailyLimit = Math.min(
          session.messages_per_day + (session.current_day - 1) * session.daily_increment,
          session.max_messages_per_day
        );
        const remaining = dailyLimit - session.messages_sent_today;

        if (remaining <= 0) {
          results.push({ session_id: session.id, status: "skipped", reason: "daily_limit_reached", limit: dailyLimit });
          continue;
        }

        const { data: device } = await supabase
          .from("devices")
          .select("id, name, uazapi_token, uazapi_base_url, status")
          .eq("id", session.device_id)
          .single();

        const deviceToken = device?.uazapi_token;
        const deviceBaseUrl = (device?.uazapi_base_url || "").replace(/\/+$/, "");

        if (!deviceToken || !deviceBaseUrl) {
          results.push({ session_id: session.id, status: "error", reason: "no_credentials" });
          continue;
        }

        const onlineStatuses = ["Connected", "Ready", "authenticated", "ready"];
        if (device?.status && !onlineStatuses.includes(device.status)) {
          results.push({ session_id: session.id, status: "error", reason: "device_offline", deviceStatus: device.status });
          if (session.safety_state === "normal") {
            await supabase.from("warmup_sessions").update({ safety_state: "alerta" }).eq("id", session.id);
          }
          continue;
        }

        const deviceGroups = await fetchDeviceGroups(deviceBaseUrl, deviceToken);

        if (deviceGroups.length === 0) {
          results.push({ session_id: session.id, status: "error", reason: "no_groups_found" });
          continue;
        }

        const { data: userMessages } = await supabase
          .from("warmup_messages")
          .select("content")
          .eq("user_id", session.user_id);

        const messagePool =
          userMessages && userMessages.length > 0
            ? userMessages.map((m) => m.content)
            : defaultMessages;

        let batchSize: number;
        if (forceExecute) {
          batchSize = Math.min(remaining, deviceGroups.length);
        } else {
          const maxBatch = session.quality_profile === "novo" ? 2 : session.quality_profile === "recuperacao" ? 1 : 3;
          batchSize = Math.min(remaining, Math.floor(Math.random() * maxBatch) + 1);
        }
        
        let sentCount = 0;
        let errorCount = 0;

        const targetGroups = forceExecute
          ? deviceGroups.slice(0, batchSize)
          : Array.from({ length: batchSize }, () => pickRandom(deviceGroups));

        for (let i = 0; i < targetGroups.length; i++) {
          const group = targetGroups[i];
          const message = pickRandom(messagePool);

          try {
            await uazapiRequest(deviceBaseUrl, deviceToken, "/send/text", {
              number: group.jid,
              text: message,
            });

            sentCount++;

            await supabase.from("warmup_logs").insert({
              session_id: session.id,
              user_id: session.user_id,
              device_id: session.device_id,
              group_jid: group.jid,
              group_name: group.name,
              message_content: message,
              status: "sent",
            });

            if (i < targetGroups.length - 1) {
              if (forceExecute) {
                await randomDelay(3, 8);
              } else {
                await randomDelay(session.min_delay_seconds, session.max_delay_seconds);
              }
            }
          } catch (msgErr: any) {
            errorCount++;

            await supabase
              .from("warmup_logs")
              .insert({
                session_id: session.id,
                user_id: session.user_id,
                device_id: session.device_id,
                group_jid: group.jid,
                group_name: group.name,
                message_content: message,
                status: "error",
                error_message: msgErr.message,
              })
              .catch(() => {});
          }
        }

        const newSentToday = session.messages_sent_today + sentCount;
        const newSentTotal = session.messages_sent_total + sentCount;

        const updates: Record<string, any> = {
          messages_sent_today: newSentToday,
          messages_sent_total: newSentTotal,
          last_executed_at: new Date().toISOString(),
        };

        if (errorCount > 0 && sentCount === 0) {
          if (session.safety_state === "normal") {
            updates.safety_state = "alerta";
          } else if (session.safety_state === "alerta") {
            updates.safety_state = "recuo";
          } else if (session.safety_state === "recuo") {
            updates.status = "paused";
          }
        } else if (sentCount > 0 && session.safety_state !== "normal") {
          updates.safety_state = "normal";
        }

        if (session.current_day >= session.total_days && newSentToday >= dailyLimit) {
          updates.status = "completed";
        }

        await supabase.from("warmup_sessions").update(updates).eq("id", session.id);

        results.push({
          session_id: session.id,
          status: "ok",
          sent: sentCount,
          errors: errorCount,
          daily_limit: dailyLimit,
          sent_today: newSentToday,
          groups_available: deviceGroups.length,
        });
      } catch (sessionErr: any) {
        console.error(`Session error:`, sessionErr.message);
        results.push({ session_id: session.id, status: "error", reason: sessionErr.message });
      }
    }

    // Daily reset check
    const { data: allSessions } = await supabase
      .from("warmup_sessions")
      .select("id, last_executed_at, current_day, total_days, status")
      .eq("status", "running");

    if (allSessions) {
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      for (const s of allSessions) {
        if (s.last_executed_at) {
          const lastDate = new Date(s.last_executed_at).toISOString().split("T")[0];
          if (lastDate < todayStr) {
            const newDay = Math.min(s.current_day + 1, s.total_days);
            await supabase
              .from("warmup_sessions")
              .update({ messages_sent_today: 0, current_day: newDay })
              .eq("id", s.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Warmup execute error:", err.message);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
