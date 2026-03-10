import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list_chats";
    const deviceId = url.searchParams.get("device_id");
    const chatId = url.searchParams.get("chat_id");

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // No device selected - return device list
    if (!deviceId) {
      const { data: devices } = await serviceClient
        .from("devices")
        .select("id, name, number, status, uazapi_token, uazapi_base_url, profile_picture")
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({
          devices: (devices || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            number: d.number,
            status: d.status,
            profile_picture: d.profile_picture,
            has_token: !!(d.uazapi_token && d.uazapi_base_url),
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get device config
    const { data: device } = await serviceClient
      .from("devices")
      .select("uazapi_token, uazapi_base_url")
      .eq("id", deviceId)
      .eq("user_id", userId)
      .single();

    const apiToken = device?.uazapi_token;
    const apiBaseUrl = (device?.uazapi_base_url || "").replace(/\/+$/, "");

    if (!apiToken || !apiBaseUrl) {
      return new Response(JSON.stringify({ error: "Dispositivo não configurado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiHeaders = {
      "token": apiToken,
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    if (action === "list_chats") {
      const forceRefresh = url.searchParams.get("refresh") === "true";
      const allGroups: any[] = [];
      const seenJids = new Set<string>();

      const fetchSafe = async (endpoint: string, retries = 2, method = "GET", body?: any): Promise<any> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const opts: RequestInit = { method, headers: apiHeaders };
            if (body && method === "POST") opts.body = JSON.stringify(body);
            const res = await fetch(endpoint, opts);
            if (!res.ok) {
              const respBody = await res.text().catch(() => "");
              console.log(`[${res.status}] ${endpoint}: ${respBody.substring(0, 150)}`);
              // If "No session", wait longer and retry
              if (respBody.includes("No session") && attempt < retries) {
                console.log(`[RETRY] No session detected, waiting 3s...`);
                await new Promise(r => setTimeout(r, 3000));
                continue;
              }
              if (attempt < retries) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
              return null;
            }
            return await res.json();
          } catch (e) {
            console.error(`Fetch fail ${attempt} ${endpoint}:`, e);
            if (attempt < retries) await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
          }
        }
        return null;
      };

      const addGroups = (items: any[]) => {
        for (const g of items) {
          const jid = g.JID || g.jid || g.id || g.groupJid || g.chatId || "";
          if (jid && !seenJids.has(jid)) {
            seenJids.add(jid);
            allGroups.push(g);
          }
        }
      };

      // ─── S0: Restart/resync instance to force WA group refresh (only on forceRefresh) ───
      if (forceRefresh) {
        console.log("[S0] Forcing instance resync...");
        // Try both GET and POST for restart/refresh endpoints
        const restartAttempts = [
          { ep: "/instance/restart", method: "GET" },
          { ep: "/instance/restart", method: "POST" },
          { ep: "/instance/refresh", method: "GET" },
          { ep: "/instance/refresh", method: "POST" },
          { ep: "/instance/reboot", method: "GET" },
          { ep: "/group/sync", method: "GET" },
          { ep: "/group/sync", method: "POST" },
        ];
        let restarted = false;
        for (const { ep, method } of restartAttempts) {
          try {
            const res = await fetch(`${apiBaseUrl}${ep}`, { method, headers: apiHeaders });
            const txt = await res.text().catch(() => "");
            console.log(`[S0] ${method} ${ep}: ${res.status} ${txt.substring(0, 100)}`);
            if (res.ok) {
              restarted = true;
              break;
            }
          } catch (e) {
            console.log(`[S0] ${ep} failed: ${e.message}`);
          }
        }
        if (restarted) {
          // Wait for instance to come back online
          await new Promise(r => setTimeout(r, 4000));
        }
      }

      // ─── S1: /group/list paginated (main UaZapi endpoint) ───
      for (let page = 0; page < 10; page++) {
        const data = await fetchSafe(`${apiBaseUrl}/group/list?GetParticipants=false&page=${page}&count=200`);
        if (!data) break;
        const arr = Array.isArray(data.groups || data) ? (data.groups || data) : [];
        if (arr.length === 0) break;
        const prev = seenJids.size;
        addGroups(arr);
        console.log(`[S1] page ${page}: ${arr.length} ret, ${seenJids.size - prev} new`);
        if (seenJids.size - prev === 0) break;
      }

      // ─── S1b: /group/list with getParticipants=true (different response shape) ───
      if (allGroups.length < 5) {
        const data = await fetchSafe(`${apiBaseUrl}/group/list?count=500`, 1);
        if (data) {
          const arr = Array.isArray(data.groups || data.data || data) ? (data.groups || data.data || data) : [];
          const prev = seenJids.size;
          addGroups(arr);
          console.log(`[S1b] alt group/list: ${arr.length} ret, ${seenJids.size - prev} new`);
        }
      }

      // ─── S1c: /chats with filter (UaZapi V2 alternative) ───
      {
        const data = await fetchSafe(`${apiBaseUrl}/chats?type=group&count=500`, 1);
        if (data) {
          const arr = Array.isArray(data.chats || data.data || data) ? (data.chats || data.data || data) : [];
          const groupArr = arr.filter((c: any) => {
            const id = c.JID || c.jid || c.id || c.chatId || "";
            return id.includes("@g.us");
          });
          const prev = seenJids.size;
          addGroups(groupArr);
          console.log(`[S1c] /chats?type=group: ${arr.length} total, ${groupArr.length} groups, ${seenJids.size - prev} new`);
        }
      }

      // ─── S2: /group/fetchAllGroups (UaZapi V2 - forces fresh fetch from WA) ───
      if (forceRefresh) {
        const data = await fetchSafe(`${apiBaseUrl}/group/fetchAllGroups`, 1);
        if (data) {
          const arr = Array.isArray(data.groups || data) ? (data.groups || data) : [];
          const prev = seenJids.size;
          addGroups(arr);
          console.log(`[S2] fetchAllGroups: ${arr.length} ret, ${seenJids.size - prev} new`);
        }
      }

      // ─── S3: /group/listAll ───
      {
        const data = await fetchSafe(`${apiBaseUrl}/group/listAll`, 1);
        if (data) {
          const arr = Array.isArray(data.groups || data) ? (data.groups || data) : [];
          const prev = seenJids.size;
          addGroups(arr);
          console.log(`[S3] listAll: ${arr.length} ret, ${seenJids.size - prev} new`);
        }
      }

      // ─── S4: /chat/list filtering @g.us ───
      {
        const data = await fetchSafe(`${apiBaseUrl}/chat/list?count=500`, 1);
        if (data) {
          const chats = Array.isArray(data.chats || data.data || data) ? (data.chats || data.data || data) : [];
          const groups = chats.filter((c: any) => {
            const id = c.JID || c.jid || c.id || c.chatId || "";
            return id.includes("@g.us");
          });
          const prev = seenJids.size;
          addGroups(groups);
          console.log(`[S4] chat/list: ${chats.length} chats, ${groups.length} groups, ${seenJids.size - prev} new`);
        }
      }

      // ─── S5: /group/list with huge count (bypass pagination) ───
      if (forceRefresh) {
        const data = await fetchSafe(`${apiBaseUrl}/group/list?GetParticipants=false&count=9999`, 1);
        if (data) {
          const arr = Array.isArray(data.groups || data) ? (data.groups || data) : [];
          const prev = seenJids.size;
          addGroups(arr);
          console.log(`[S5] big count: ${arr.length} ret, ${seenJids.size - prev} new`);
        }
      }

      // ─── S6: /group/participating (another UaZapi V2 endpoint) ───
      if (forceRefresh) {
        const data = await fetchSafe(`${apiBaseUrl}/group/participating`, 1);
        if (data) {
          const arr = Array.isArray(data.groups || data.data || data) ? (data.groups || data.data || data) : [];
          const prev = seenJids.size;
          addGroups(arr);
          console.log(`[S6] participating: ${arr.length} ret, ${seenJids.size - prev} new`);
        }
      }

      console.log(`Total unique groups: ${allGroups.length}`);

      // Map to standardized format
      const chats = allGroups.map((g: any) => ({
        id: g.JID || g.jid || g.id || g.groupJid || "",
        name: g.Name || g.name || g.Subject || g.subject || g.groupName || "Grupo sem nome",
        participants: g.ParticipantCount || g.Participants?.length || g.participants?.length || g.participantsCount || g.size || undefined,
        isGroup: true,
      }));

      return new Response(JSON.stringify({ chats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_messages" && chatId) {
      const count = url.searchParams.get("count") || "50";
      const res = await fetch(`${apiBaseUrl}/chat/messages?chatId=${encodeURIComponent(chatId)}&count=${count}`, {
        method: "GET",
        headers: apiHeaders,
      });
      const data = await res.json();
      return new Response(JSON.stringify({ messages: data.messages || data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_message" && req.method === "POST") {
      const body = await req.json();
      const to = body.to || "";
      const isGroup = to.includes("@g.us");
      const number = isGroup ? to : to.replace(/\D/g, "");
      const message = body.message;
      const res = await fetch(`${apiBaseUrl}/send/text`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ number, text: message }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_media" && req.method === "POST") {
      const body = await req.json();
      const res = await fetch(`${apiBaseUrl}/send/media`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          number: body.to?.replace(/\D/g, ""),
          media: body.media_url,
          type: body.media_type || "image",
          caption: body.caption || undefined,
        }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
