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

    const body = await req.json();
    const { action, deviceId, number, text } = body;
    console.log("ACTION:", action, "DEVICE:", deviceId);

    // Get global UaZapi config as fallback
    let UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
    let UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    // If deviceId provided, try to use per-device token/url
    if (deviceId) {
      const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: device } = await serviceClient
        .from("devices")
        .select("uazapi_token, uazapi_base_url")
        .eq("id", deviceId)
        .single();
      if (device?.uazapi_token) UAZAPI_TOKEN = device.uazapi_token;
      if (device?.uazapi_base_url) UAZAPI_BASE_URL = device.uazapi_base_url;
      console.log("Using per-device config:", !!device?.uazapi_token, !!device?.uazapi_base_url);
    }

    if (!UAZAPI_BASE_URL || !UAZAPI_TOKEN) {
      return new Response(
        JSON.stringify({ error: "API de conexão não configurada. Configure o token UaZapi no dispositivo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UaZapi v2: token goes in 'token' header
    const uazapiBase = UAZAPI_BASE_URL.replace(/\/+$/, "");
    const apiUrl = (endpoint: string) => `${uazapiBase}${endpoint}`;
    console.log("BASE URL:", uazapiBase, "| TOKEN length:", UAZAPI_TOKEN.length);

    const uazapiHeaders = {
      "token": UAZAPI_TOKEN,
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    // ACTION: connect - Start connection and get QR code
    if (action === "connect") {
      // Check current status first - skip disconnect if already disconnected
      let currentStatus = "";
      try {
        const checkRes = await fetch(apiUrl("/instance/status"), { method: "GET", headers: uazapiHeaders });
        const checkData = await checkRes.json();
        const inst = checkData.instance || {};
        currentStatus = inst.status || "";
        
        // Already connected? Return immediately
        if (currentStatus === "connected") {
          const phone = inst.owner || "";
          let formattedPhone = "";
          if (phone) {
            const raw = String(phone).replace(/\D/g, "");
            if (raw.startsWith("55") && raw.length >= 12) {
              formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
            } else if (raw) {
              formattedPhone = `+${raw}`;
            }
          }
          if (deviceId) {
            const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
            await serviceClient.from("devices").update({ status: "Ready", number: formattedPhone }).eq("id", deviceId);
          }
          return new Response(JSON.stringify({
            success: true, alreadyConnected: true, phone: formattedPhone, status: "authenticated",
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Has QR already? Return it without reconnecting
        if (inst.qrcode && currentStatus === "connecting") {
          console.log("QR already available, returning immediately");
          return new Response(JSON.stringify({
            success: true, base64: inst.qrcode, qr: inst.qrcode, status: "connecting",
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (e) {
        console.log("Status check skipped:", e);
      }

      // Only disconnect if not already disconnected
      if (currentStatus && currentStatus !== "disconnected") {
        try {
          await fetch(apiUrl("/instance/disconnect"), { method: "POST", headers: uazapiHeaders });
          console.log("Pre-connect disconnect done");
        } catch (e) {
          console.log("Pre-connect disconnect skipped:", e);
        }
        // Minimal delay after disconnect
        await new Promise(r => setTimeout(r, 500));
      }

      // Call connect
      const connectRes = await fetch(apiUrl("/instance/connect"), {
        method: "POST",
        headers: uazapiHeaders,
        body: JSON.stringify({}),
      });

      const connectText = await connectRes.text();
      let connectData;
      try { connectData = JSON.parse(connectText); } catch {
        throw new Error(`UaZapi non-JSON (${connectRes.status}): ${connectText.substring(0, 200)}`);
      }

      // Try to get QR from connect response directly
      const connInst = connectData.instance || {};
      let qrCode = connInst.qrcode || connectData.qrcode;
      
      // If no QR in connect response, check status
      if (!qrCode) {
        const statusRes = await fetch(apiUrl("/instance/status"), { method: "GET", headers: uazapiHeaders });
        const statusData = await statusRes.json();
        const inst = statusData.instance || {};
        qrCode = inst.qrcode || statusData.qrcode;
      }

      console.log("QR found:", !!qrCode, "length:", qrCode?.length || 0);

      return new Response(JSON.stringify({
        success: true,
        base64: qrCode || null,
        qr: qrCode || null,
        status: qrCode ? "connecting" : "waiting",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ACTION: status - Check connection state
    if (action === "status") {
      const res = await fetch(apiUrl("/instance/status"), {
        method: "GET",
        headers: uazapiHeaders,
      });

      const data = await res.json();
      
      // Map UaZapi status to our expected format
      const inst = data.instance || {};
      const state = inst.status || data.state || data.status;
      const isConnected = state === "connected";
      const qrCode = inst.qrcode || data.qrcode || data.qr || data.base64;
      const mappedStatus = isConnected ? "authenticated" : (state || "unknown");
      
      console.log("STATUS mapped:", state, "->", mappedStatus, "| connected:", isConnected);

      // IMPORTANT: Don't spread ...data to avoid field conflicts
      return new Response(JSON.stringify({
        success: true,
        status: mappedStatus,
        phone: inst.owner || data.phone || data.number || "",
        base64: qrCode || null,
        qr: qrCode || null,
        profileName: inst.profileName || "",
        profilePicUrl: inst.profilePicUrl || "",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: logout - Disconnect the instance
    if (action === "logout") {
      const res = await fetch(apiUrl("/instance/disconnect"), {
        method: "POST",
        headers: uazapiHeaders,
      });

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { message: rawText };
      }

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

      const res = await fetch(apiUrl("/message/send-text"), {
        method: "POST",
        headers: uazapiHeaders,
        body: JSON.stringify({
          phone: number.replace(/\D/g, ""),
          message: text,
        }),
      });

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`UaZapi returned non-JSON (status ${res.status}): ${rawText.substring(0, 200)}`);
      }
      if (!res.ok) {
        throw new Error(`sendText failed [${res.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("UaZapi error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
