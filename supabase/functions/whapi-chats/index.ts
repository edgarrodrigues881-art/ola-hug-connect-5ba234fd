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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list_chats";
    const deviceId = url.searchParams.get("device_id");
    const chatId = url.searchParams.get("chat_id");

    // Get device with whapi_token
    if (!deviceId) {
      // Return all devices for device selection
      const { data: devices } = await supabase
        .from("devices")
        .select("id, name, number, status, whapi_token, profile_picture")
        .eq("user_id", userId)
        .not("whapi_token", "is", null);

      return new Response(
        JSON.stringify({ devices: (devices || []).map((d: any) => ({ ...d, whapi_token: undefined, has_token: !!d.whapi_token })) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: device } = await supabase
      .from("devices")
      .select("whapi_token")
      .eq("id", deviceId)
      .eq("user_id", userId)
      .single();

    if (!device?.whapi_token) {
      return new Response(JSON.stringify({ error: "Device not found or no token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const whapiBase = "https://gate.whapi.cloud";
    const headers = {
      Authorization: `Bearer ${device.whapi_token}`,
      Accept: "application/json",
    };

    if (action === "list_chats") {
      const count = url.searchParams.get("count") || "30";
      const res = await fetch(`${whapiBase}/chats?count=${count}`, { headers });
      const data = await res.json();

      return new Response(JSON.stringify({ chats: data.chats || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_messages" && chatId) {
      const count = url.searchParams.get("count") || "50";
      const res = await fetch(`${whapiBase}/messages/list/${chatId}?count=${count}`, { headers });
      const data = await res.json();

      return new Response(JSON.stringify({ messages: data.messages || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "send_message" && req.method === "POST") {
      const body = await req.json();
      const res = await fetch(`${whapiBase}/messages/text`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ to: body.to, body: body.message }),
      });
      const data = await res.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send media (image, document, audio, video)
    if (action === "send_media" && req.method === "POST") {
      const body = await req.json();
      // body: { to, media_url, media_type, caption?, filename? }
      const mediaType = body.media_type || "image";
      const endpoint = mediaType === "document" ? "document" : mediaType === "audio" || mediaType === "ptt" ? "audio" : mediaType === "video" ? "video" : "image";
      
      const payload: Record<string, unknown> = {
        to: body.to,
        media: body.media_url,
      };
      if (body.caption) payload.caption = body.caption;
      if (body.filename) payload.filename = body.filename;

      const res = await fetch(`${whapiBase}/messages/${endpoint}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    console.error("whapi-chats error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
