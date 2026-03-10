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

      // Helper: fetch with retry
      const fetchWithRetry = async (endpoint: string, retries = 2): Promise<any> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const res = await fetch(endpoint, { method: "GET", headers: apiHeaders });
            if (!res.ok) {
              if (attempt < retries) {
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                continue;
              }
              return null;
            }
            return await res.json();
          } catch (e) {
            console.error(`Fetch attempt ${attempt} failed for ${endpoint}:`, e);
            if (attempt < retries) {
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
          }
        }
        return null;
      };

      const addGroups = (groups: any[]) => {
        for (const g of groups) {
          const jid = g.JID || g.jid || g.id || g.groupJid || "";
          if (jid && !seenJids.has(jid)) {
            seenJids.add(jid);
            allGroups.push(g);
          }
        }
      };

      // Strategy 1: Paginated group/list
      const maxPages = 8;
      for (let page = 0; page < maxPages; page++) {
        const endpoint = `${apiBaseUrl}/group/list?GetParticipants=false&page=${page}&count=200`;
        console.log(`Fetching groups page ${page}: ${endpoint}`);
        
        const data = await fetchWithRetry(endpoint);
        if (!data) break;
        
        const groups = data.groups || data || [];
        const groupArray = Array.isArray(groups) ? groups : [];
        
        if (groupArray.length === 0) break;
        
        const prevCount = seenJids.size;
        addGroups(groupArray);
        const newCount = seenJids.size - prevCount;
        
        console.log(`Page ${page}: ${groupArray.length} returned, ${newCount} new. Total: ${seenJids.size}`);
        
        if (newCount === 0) break;
      }

      // Strategy 2: Always try /chat/list to catch recently created/joined groups
      try {
        const chatListEndpoint = `${apiBaseUrl}/chat/list?count=500`;
        console.log(`Trying chat/list: ${chatListEndpoint}`);
        const chatData = await fetchWithRetry(chatListEndpoint, 1);
        if (chatData) {
          const chats = chatData.chats || chatData || [];
          const chatArray = Array.isArray(chats) ? chats : [];
          const groupChats = chatArray.filter((c: any) => {
            const id = c.JID || c.jid || c.id || c.chatId || "";
            return id.includes("@g.us");
          });
          if (groupChats.length > 0) {
            const prevCount = seenJids.size;
            addGroups(groupChats);
            console.log(`chat/list found ${groupChats.length} groups, ${seenJids.size - prevCount} new`);
          }
        }
      } catch (e) {
        console.log("chat/list failed:", e);
      }

      // Strategy 3: Try /group/listAll
      if (forceRefresh) {
        try {
          const listAllEndpoint = `${apiBaseUrl}/group/listAll`;
          console.log(`Trying group/listAll: ${listAllEndpoint}`);
          const allData = await fetchWithRetry(listAllEndpoint, 1);
          if (allData) {
            const groupsData = allData.groups || allData || [];
            const groupArray = Array.isArray(groupsData) ? groupsData : [];
            if (groupArray.length > 0) {
              const prevCount = seenJids.size;
              addGroups(groupArray);
              console.log(`group/listAll found ${groupArray.length} groups, ${seenJids.size - prevCount} new`);
            }
          }
        } catch (e) {
          console.log("group/listAll failed:", e);
        }
      }

      // Strategy 4: Try recent chats for very new groups
      if (forceRefresh) {
        try {
          const recentEndpoint = `${apiBaseUrl}/chat/list?count=50&sort=recent`;
          console.log(`Trying recent chats: ${recentEndpoint}`);
          const recentData = await fetchWithRetry(recentEndpoint, 1);
          if (recentData) {
            const chats = recentData.chats || recentData || [];
            const chatArray = Array.isArray(chats) ? chats : [];
            const groupChats = chatArray.filter((c: any) => {
              const id = c.JID || c.jid || c.id || c.chatId || "";
              return id.includes("@g.us");
            });
            if (groupChats.length > 0) {
              const prevCount = seenJids.size;
              addGroups(groupChats);
              console.log(`recent chats found ${groupChats.length} groups, ${seenJids.size - prevCount} new`);
            }
          }
        } catch (e) {
          console.log("recent chats failed:", e);
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
