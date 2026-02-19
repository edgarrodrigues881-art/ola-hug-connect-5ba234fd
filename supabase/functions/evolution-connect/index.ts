import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHAPI_BASE = "https://gate.whapi.cloud";

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

    const body = await req.json();
    const { action, deviceId, whapiToken, number, text } = body;
    console.log("ACTION:", action, "DEVICE:", deviceId);

    // Get whapi token from body or from device record
    let token = whapiToken;
    if (!token && deviceId) {
      const { data: device } = await supabase
        .from("devices")
        .select("whapi_token")
        .eq("id", deviceId)
        .single();
      token = device?.whapi_token;
    }

    if (!token && action !== "checkToken") {
      return new Response(
        JSON.stringify({ error: "Token Whapi não configurado para este dispositivo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const whapiHeaders = {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    // ACTION: connect - Get QR code for login
    if (action === "connect") {
      const res = await fetch(`${WHAPI_BASE}/users/login`, {
        method: "GET",
        headers: whapiHeaders,
      });

      const rawText = await res.text();
      console.log("CONNECT status:", res.status, "body:", rawText.substring(0, 500));

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Whapi returned non-JSON (status ${res.status}): ${rawText.substring(0, 200)}`);
      }

      // 409 means already authenticated - fetch info and update device
      if (res.status === 409) {
        // Fetch phone number and status
        const meRes = await fetch(`${WHAPI_BASE}/users/me`, {
          method: "GET",
          headers: whapiHeaders,
        });
        const meData = meRes.ok ? await meRes.json() : {};
        const phone = meData.phone || "";
        let formattedPhone = "";
        if (phone) {
          const raw = phone.replace(/\D/g, "");
          if (raw.startsWith("55") && raw.length >= 12) {
            formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
          } else if (raw) {
            formattedPhone = `+${raw}`;
          }
        }

        // Update device in DB
        if (deviceId) {
          const serviceClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          await serviceClient
            .from("devices")
            .update({ status: "Ready", number: formattedPhone })
            .eq("id", deviceId);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          alreadyConnected: true, 
          phone: formattedPhone,
          status: "Ready",
          ...meData 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!res.ok) {
        throw new Error(`Whapi connect failed [${res.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: status - Check connection state via /users/me
    if (action === "status") {
      const res = await fetch(`${WHAPI_BASE}/users/me`, {
        method: "GET",
        headers: whapiHeaders,
      });

      const data = await res.json();
      console.log("STATUS:", res.status, JSON.stringify(data).substring(0, 300));

      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: logout - Disconnect the channel
    if (action === "logout") {
      const res = await fetch(`${WHAPI_BASE}/users/logout`, {
        method: "POST",
        headers: whapiHeaders,
      });

      const data = await res.json();
      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: sendText - Send text message
    if (action === "sendText") {
      if (!number || !text) {
        return new Response(JSON.stringify({ error: "number and text are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${WHAPI_BASE}/messages/text`, {
        method: "POST",
        headers: whapiHeaders,
        body: JSON.stringify({
          to: number.replace(/\D/g, ""),
          body: text,
        }),
      });

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Whapi returned non-JSON (status ${res.status}): ${rawText.substring(0, 200)}`);
      }
      if (!res.ok) {
        throw new Error(`sendText failed [${res.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: checkToken - Validate a Whapi token
    if (action === "checkToken") {
      if (!whapiToken) {
        return new Response(JSON.stringify({ error: "whapiToken is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch(`${WHAPI_BASE}/settings`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${whapiToken}`,
          "Accept": "application/json",
        },
      });

      const data = await res.json();
      return new Response(JSON.stringify({ success: res.ok, status: res.status, ...data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Whapi error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
