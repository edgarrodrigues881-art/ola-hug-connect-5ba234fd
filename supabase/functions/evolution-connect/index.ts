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
    const { action, deviceId, number, text, instanceName } = body;
    console.log("ACTION:", action, "DEVICE:", deviceId);

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get global UaZapi config (admin credentials)
    const ADMIN_BASE_URL = (Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");
    const ADMIN_TOKEN = Deno.env.get("UAZAPI_TOKEN") || "";

    // Helper to build URL
    const apiUrl = (base: string, endpoint: string) => `${base}${endpoint}`;

    // ACTION: createInstance - Create a new instance on UaZapi using admin token
    if (action === "createInstance") {
      if (!ADMIN_BASE_URL || !ADMIN_TOKEN) {
        return new Response(
          JSON.stringify({ error: "Admin token ou URL da UaZapi não configurados." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const name = instanceName || `inst-${Date.now()}`;
      console.log("Creating instance:", name, "on", ADMIN_BASE_URL);

      const res = await fetch(apiUrl(ADMIN_BASE_URL, "/instance/init"), {
        method: "POST",
        headers: {
          "admintoken": ADMIN_TOKEN,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const resText = await res.text();
      let data;
      try { data = JSON.parse(resText); } catch {
        throw new Error(`UaZapi non-JSON (${res.status}): ${resText.substring(0, 300)}`);
      }

      if (!res.ok) {
        throw new Error(`Create instance failed [${res.status}]: ${JSON.stringify(data)}`);
      }

      // Extract instance token from response
      const instanceToken = data.token || data.instance?.token;
      const instanceId = data.id || data.instance?.id;

      console.log("Instance created, token received:", !!instanceToken);

      // If deviceId provided, save the instance token to the device
      if (deviceId && instanceToken) {
        await serviceClient.from("devices").update({
          uazapi_token: instanceToken,
          uazapi_base_url: ADMIN_BASE_URL,
        }).eq("id", deviceId);
      }

      return new Response(JSON.stringify({
        success: true,
        instanceToken,
        instanceId,
        instanceName: name,
        baseUrl: ADMIN_BASE_URL,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // For all other actions, get per-device token (instance token)
    let INSTANCE_BASE_URL = ADMIN_BASE_URL;
    let INSTANCE_TOKEN = "";

    if (deviceId) {
      const { data: device } = await serviceClient
        .from("devices")
        .select("uazapi_token, uazapi_base_url")
        .eq("id", deviceId)
        .single();
      if (device?.uazapi_token) INSTANCE_TOKEN = device.uazapi_token;
      if (device?.uazapi_base_url) INSTANCE_BASE_URL = device.uazapi_base_url.replace(/\/+$/, "");
      console.log("Using per-device config:", !!device?.uazapi_token, !!device?.uazapi_base_url);
    }

    if (!INSTANCE_BASE_URL || !INSTANCE_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Token da instância não configurado. Crie a instância primeiro." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceHeaders = {
      "token": INSTANCE_TOKEN,
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    console.log("BASE URL:", INSTANCE_BASE_URL, "| INSTANCE TOKEN length:", INSTANCE_TOKEN.length);

    // ACTION: connect - Start connection and get QR code
    if (action === "connect") {
      // Check current status first
      let currentStatus = "";
      try {
        const checkRes = await fetch(apiUrl(INSTANCE_BASE_URL, "/instance/status"), { method: "GET", headers: instanceHeaders });
        const checkData = await checkRes.json();
        const inst = checkData.instance || checkData;
        currentStatus = inst.status || checkData.status || "";

        // Already connected? Return immediately
        if (currentStatus === "connected") {
          const phone = inst.owner || inst.phone || "";
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
            await serviceClient.from("devices").update({ status: "Ready", number: formattedPhone }).eq("id", deviceId);
          }
          return new Response(JSON.stringify({
            success: true, alreadyConnected: true, phone: formattedPhone, status: "authenticated",
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Has QR already? Return it
        const existingQr = inst.qrcode || checkData.qrcode;
        if (existingQr && currentStatus === "connecting") {
          console.log("QR already available, returning immediately");
          return new Response(JSON.stringify({
            success: true, base64: existingQr, qr: existingQr, status: "connecting",
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (e) {
        console.log("Status check skipped:", e);
      }

      // Only disconnect if not already disconnected
      if (currentStatus && currentStatus !== "disconnected") {
        try {
          await fetch(apiUrl(INSTANCE_BASE_URL, "/instance/disconnect"), { method: "POST", headers: instanceHeaders });
          console.log("Pre-connect disconnect done");
        } catch (e) {
          console.log("Pre-connect disconnect skipped:", e);
        }
        await new Promise(r => setTimeout(r, 500));
      }

      // Call connect
      const connectRes = await fetch(apiUrl(INSTANCE_BASE_URL, "/instance/connect"), {
        method: "POST",
        headers: instanceHeaders,
        body: JSON.stringify({}),
      });

      const connectText = await connectRes.text();
      let connectData;
      try { connectData = JSON.parse(connectText); } catch {
        throw new Error(`UaZapi non-JSON (${connectRes.status}): ${connectText.substring(0, 200)}`);
      }

      // Try to get QR from connect response
      const connInst = connectData.instance || connectData;
      let qrCode = connInst.qrcode || connectData.qrcode;

      // If no QR, poll status
      if (!qrCode) {
        for (let attempt = 1; attempt <= 5; attempt++) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const statusRes = await fetch(apiUrl(INSTANCE_BASE_URL, "/instance/status"), { method: "GET", headers: instanceHeaders });
            const statusData = await statusRes.json();
            const inst = statusData.instance || statusData;
            qrCode = inst.qrcode || statusData.qrcode;
            if (qrCode) break;
          } catch (e) {
            console.log(`QR poll ${attempt} error:`, e);
          }
        }
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
      const res = await fetch(apiUrl(INSTANCE_BASE_URL, "/instance/status"), {
        method: "GET",
        headers: instanceHeaders,
      });

      const data = await res.json();
      const inst = data.instance || data;
      const state = inst.status || data.state || data.status;
      const isConnected = state === "connected";
      const qrCode = inst.qrcode || data.qrcode || data.qr || data.base64;
      const mappedStatus = isConnected ? "authenticated" : (state || "unknown");

      console.log("STATUS mapped:", state, "->", mappedStatus, "| connected:", isConnected);

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
      const res = await fetch(apiUrl(INSTANCE_BASE_URL, "/instance/disconnect"), {
        method: "POST",
        headers: instanceHeaders,
      });

      const rawText = await res.text();
      let data;
      try { data = JSON.parse(rawText); } catch { data = { message: rawText }; }

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

      const res = await fetch(apiUrl(INSTANCE_BASE_URL, "/send/text"), {
        method: "POST",
        headers: instanceHeaders,
        body: JSON.stringify({
          number: number.replace(/\D/g, ""),
          text: text,
        }),
      });

      const rawText = await res.text();
      let data;
      try { data = JSON.parse(rawText); } catch {
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
