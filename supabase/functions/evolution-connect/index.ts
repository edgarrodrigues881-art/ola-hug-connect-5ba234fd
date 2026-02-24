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

    // Get UaZapi config
    const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
    const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    if (!UAZAPI_BASE_URL || !UAZAPI_TOKEN) {
      return new Response(
        JSON.stringify({ error: "API de conexão não configurada. Entre em contato com o administrador." }),
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
      // First disconnect to ensure fresh QR
      try {
        await fetch(apiUrl("/instance/disconnect"), {
          method: "POST",
          headers: uazapiHeaders,
        });
        console.log("Pre-connect disconnect done (forcing fresh QR)");
      } catch (e) {
        console.log("Pre-connect disconnect skipped:", e);
      }
      await new Promise(r => setTimeout(r, 1000));

      // Call connect to initiate QR generation
      const connectRes = await fetch(apiUrl("/instance/connect"), {
        method: "POST",
        headers: uazapiHeaders,
        body: JSON.stringify({}), // No phone = QR code mode
      });

      const connectText = await connectRes.text();
      console.log("CONNECT status:", connectRes.status, "body:", connectText.substring(0, 500));

      let connectData;
      try {
        connectData = JSON.parse(connectText);
      } catch {
        throw new Error(`UaZapi returned non-JSON (status ${connectRes.status}): ${connectText.substring(0, 200)}`);
      }

      // Now check status to get QR code
      const statusRes = await fetch(apiUrl("/instance/status"), {
        method: "GET",
        headers: uazapiHeaders,
      });

      const statusText = await statusRes.text();
      console.log("STATUS after connect:", statusRes.status, "body:", statusText.substring(0, 500));

      let statusData;
      try {
        statusData = JSON.parse(statusText);
      } catch {
        throw new Error(`UaZapi status non-JSON (status ${statusRes.status}): ${statusText.substring(0, 200)}`);
      }

      // Check if already connected
      if (statusData.state === "connected" || statusData.status === "connected") {
        // Update device in DB
        if (deviceId) {
          const serviceClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          const phone = statusData.phone || statusData.number || "";
          let formattedPhone = "";
          if (phone) {
            const raw = String(phone).replace(/\D/g, "");
            if (raw.startsWith("55") && raw.length >= 12) {
              formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
            } else if (raw) {
              formattedPhone = `+${raw}`;
            }
          }
          await serviceClient
            .from("devices")
            .update({ status: "Ready", number: formattedPhone })
            .eq("id", deviceId);
        }

        return new Response(JSON.stringify({
          success: true,
          alreadyConnected: true,
          phone: statusData.phone || statusData.number || "",
          status: "Ready",
          ...statusData,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return QR code from status response (UaZapi nests it inside "instance")
      const inst = statusData.instance || {};
      const connInst = connectData.instance || {};
      const qrCode = inst.qrcode || statusData.qrcode || statusData.qr || statusData.base64 || connInst.qrcode || connectData.qrcode || connectData.qr || connectData.base64;
      console.log("QR code found:", !!qrCode, "length:", qrCode?.length || 0);

      return new Response(JSON.stringify({
        success: true,
        base64: qrCode || null,
        qr: qrCode || null,
        status: statusData.state || statusData.status || "connecting",
        ...statusData,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: status - Check connection state
    if (action === "status") {
      const res = await fetch(apiUrl("/instance/status"), {
        method: "GET",
        headers: uazapiHeaders,
      });

      const data = await res.json();
      console.log("STATUS:", res.status, JSON.stringify(data).substring(0, 300));

      // Map UaZapi status to our expected format
      const inst = data.instance || {};
      const state = inst.status || data.state || data.status;
      const isConnected = state === "connected";
      const qrCode = inst.qrcode || data.qrcode || data.qr || data.base64;

      return new Response(JSON.stringify({
        success: true,
        status: isConnected ? "authenticated" : state,
        phone: inst.owner || data.phone || data.number || "",
        base64: qrCode || null,
        qr: qrCode || null,
        ...data,
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
