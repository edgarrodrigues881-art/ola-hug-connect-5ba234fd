import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Random message templates used when user has no custom messages
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
];

async function uazapiRequest(baseUrl: string, token: string, endpoint: string, payload: any, method: "POST" | "GET" = "POST") {
  let url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    "token": token,
    "Accept": "application/json",
  };

  let fetchOptions: RequestInit;
  if (method === "GET") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null) params.append(key, String(value));
    }
    url += `?${params.toString()}`;
    fetchOptions = { method: "GET", headers };
  } else {
    headers["Content-Type"] = "application/json";
    fetchOptions = { method: "POST", headers, body: JSON.stringify(payload) };
  }

  console.log(`UaZapi ${method}:`, url);
  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  console.log("UaZapi response:", res.status, text.substring(0, 300));

  if (res.status === 405 && method === "POST") {
    return uazapiRequest(baseUrl, token, endpoint, payload, "GET");
  }

  if (!res.ok) {
    let errorMsg = `API error ${res.status}`;
    try { const d = JSON.parse(text); errorMsg = d?.message || d?.error || text; } catch { errorMsg = text; }
    throw new Error(errorMsg);
  }
  return JSON.parse(text);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDelay(minSec: number, maxSec: number): Promise<void> {
  const ms = (minSec + Math.random() * (maxSec - minSec)) * 1000;
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isWithinTimeWindow(startTime: string, endTime: string): boolean {
  const now = new Date();
  // Use UTC-3 (Brasilia time) as default
  const brHour = (now.getUTCHours() - 3 + 24) % 24;
  const brMin = now.getUTCMinutes();
  const currentMinutes = brHour * 60 + brMin;
  
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Support both cron (no auth) and manual trigger (with auth)
  let targetUserId: string | null = null;
  let targetSessionId: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    targetSessionId = body.sessionId || null;
    
    // If manual trigger, verify auth
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (user) targetUserId = user.id;
    }
  } catch {}

  try {
    // Get active warmup sessions
    let query = supabase
      .from("warmup_sessions")
      .select("*")
      .eq("status", "running");

    if (targetSessionId) {
      query = query.eq("id", targetSessionId);
    }
    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }

    const { data: sessions, error: sessErr } = await query;
    if (sessErr) throw sessErr;

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ message: "No active warmup sessions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const session of sessions) {
      try {
        // Check time window
        if (!isWithinTimeWindow(session.start_time, session.end_time)) {
          results.push({ session_id: session.id, status: "skipped", reason: "outside_time_window" });
          continue;
        }

        // Calculate today's limit
        const dailyLimit = Math.min(
          session.messages_per_day + (session.current_day - 1) * session.daily_increment,
          session.max_messages_per_day
        );
        const remaining = dailyLimit - session.messages_sent_today;

        if (remaining <= 0) {
          results.push({ session_id: session.id, status: "skipped", reason: "daily_limit_reached", limit: dailyLimit });
          continue;
        }

        // Get device credentials
        const { data: device } = await supabase
          .from("devices")
          .select("id, name, uazapi_token, uazapi_base_url, status")
          .eq("id", session.device_id)
          .single();

        const deviceToken = device?.uazapi_token || Deno.env.get("UAZAPI_TOKEN");
        const deviceBaseUrl = (device?.uazapi_base_url || Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");

        if (!deviceToken || !deviceBaseUrl) {
          results.push({ session_id: session.id, status: "error", reason: "no_credentials" });
          continue;
        }

        // Get user's warmup groups
        const { data: groups } = await supabase
          .from("warmup_groups")
          .select("*")
          .eq("user_id", session.user_id);

        if (!groups || groups.length === 0) {
          results.push({ session_id: session.id, status: "error", reason: "no_groups" });
          continue;
        }

        // Get user's custom warmup messages (fallback to defaults)
        const { data: userMessages } = await supabase
          .from("warmup_messages")
          .select("content")
          .eq("user_id", session.user_id);

        const messagePool = (userMessages && userMessages.length > 0)
          ? userMessages.map(m => m.content)
          : defaultMessages;

        // Decide how many messages to send this execution (1-3 per run for natural behavior)
        const batchSize = Math.min(remaining, Math.floor(Math.random() * 3) + 1);
        let sentCount = 0;

        for (let i = 0; i < batchSize; i++) {
          try {
            const group = pickRandom(groups);
            const message = pickRandom(messagePool);

            // Extract group JID from link (use group name as fallback)
            // We need to get chats to find group JIDs
            // For UaZapi, send to group using the group link's invite code
            // Actually, we need to send to group chat ID. Let's get chats first.
            
            // Try to get group chats from UaZapi
            let groupJid: string | null = null;
            
            try {
              const chatsRes = await uazapiRequest(deviceBaseUrl, deviceToken, "/chat/getChats", {}, "GET");
              if (Array.isArray(chatsRes)) {
                // Find groups (JIDs ending with @g.us)
                const groupChats = chatsRes.filter((c: any) => 
                  c.id?.includes("@g.us") || c.jid?.includes("@g.us")
                );
                
                if (groupChats.length > 0) {
                  const randomGroup = pickRandom(groupChats);
                  groupJid = randomGroup.id || randomGroup.jid;
                }
              }
            } catch (e) {
              console.log("Could not fetch chats, trying send to group by name:", e);
            }

            if (!groupJid) {
              // Fallback: try to find by group name or use a known group
              console.log(`No group JID found for session ${session.id}, skipping this message`);
              continue;
            }

            // Send message to group
            await uazapiRequest(deviceBaseUrl, deviceToken, "/send/text", {
              number: groupJid,
              text: message,
            });

            sentCount++;
            console.log(`Warmup: sent "${message.substring(0, 30)}..." to group ${groupJid} for session ${session.id}`);

            // Log the sent message
            await supabase.from("warmup_logs").insert({
              session_id: session.id,
              user_id: session.user_id,
              device_id: session.device_id,
              group_jid: groupJid,
              message_content: message,
              status: "sent",
            });

            // Random delay between messages within batch
            if (i < batchSize - 1) {
              await randomDelay(session.min_delay_seconds, session.max_delay_seconds);
            }
          } catch (msgErr: any) {
            console.error(`Warmup message error:`, msgErr.message);
            // Log the error
            await supabase.from("warmup_logs").insert({
              session_id: session.id,
              user_id: session.user_id,
              device_id: session.device_id,
              message_content: message || "unknown",
              status: "error",
              error_message: msgErr.message,
            }).catch(() => {});
          }
        }

        // Update session counters
        if (sentCount > 0) {
          await supabase
            .from("warmup_sessions")
            .update({
              messages_sent_today: session.messages_sent_today + sentCount,
              messages_sent_total: session.messages_sent_total + sentCount,
              last_executed_at: new Date().toISOString(),
            })
            .eq("id", session.id);
        }

        // Check if we need to advance to next day (reset daily counter)
        // This happens if it's past end_time or if daily limit is reached
        const newSentToday = session.messages_sent_today + sentCount;
        if (newSentToday >= dailyLimit && session.current_day < session.total_days) {
          // Will be reset by the daily reset logic (separate check)
        }

        // Check if warmup is complete
        if (session.current_day >= session.total_days && newSentToday >= dailyLimit) {
          await supabase
            .from("warmup_sessions")
            .update({ status: "completed" })
            .eq("id", session.id);
        }

        results.push({
          session_id: session.id,
          device: device?.name,
          status: "ok",
          sent: sentCount,
          daily_limit: dailyLimit,
          sent_today: newSentToday,
        });
      } catch (sessionErr: any) {
        console.error(`Session ${session.id} error:`, sessionErr.message);
        results.push({ session_id: session.id, status: "error", reason: sessionErr.message });
      }
    }

    // Daily reset check: reset messages_sent_today and increment current_day
    // for sessions that haven't been executed today
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
            // New day - reset daily counter and increment day
            const newDay = Math.min(s.current_day + 1, s.total_days);
            await supabase
              .from("warmup_sessions")
              .update({
                messages_sent_today: 0,
                current_day: newDay,
              })
              .eq("id", s.id);
            console.log(`Reset daily counter for session ${s.id}, now day ${newDay}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Warmup execute error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
