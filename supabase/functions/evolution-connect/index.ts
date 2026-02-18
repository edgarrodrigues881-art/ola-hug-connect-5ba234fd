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
      console.log("AUTH FAIL: no bearer token");
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
      console.log("AUTH FAIL: getUser error", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Evolution API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, "");
    const body = await req.json();
    const { action, instanceName, phone, number, text } = body;
    console.log("ACTION:", action, "INSTANCE:", instanceName);

    // Common headers for all Evolution API requests (includes ngrok bypass)
    const evoHeaders: Record<string, string> = {
      apikey: EVOLUTION_API_KEY,
      "ngrok-skip-browser-warning": "true",
    };

    // ACTION: create - Create instance on Evolution API
    if (action === "create") {
      const createUrl = `${baseUrl}/instance/create`;
      console.log("CREATE URL:", createUrl);
      const evoRes = await fetch(createUrl, {
        method: "POST",
        headers: {
          ...evoHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });

      const rawText = await evoRes.text();
      console.log("CREATE response status:", evoRes.status, "content-type:", evoRes.headers.get("content-type"));
      console.log("CREATE response body (first 300):", rawText.substring(0, 300));
      
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Evolution API returned non-JSON (status ${evoRes.status}): ${rawText.substring(0, 200)}`);
      }
      if (!evoRes.ok) {
        if (evoRes.status === 403 || evoRes.status === 409 || JSON.stringify(data).includes("already")) {
          return new Response(JSON.stringify({ success: true, alreadyExists: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`Create instance failed [${evoRes.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: connect - Get QR code or pairing code
    if (action === "connect") {
      // First, try to restart instance to reset state
      try {
        const restartRes = await fetch(
          `${baseUrl}/instance/restart/${encodeURIComponent(instanceName)}`,
          { method: "PUT", headers: evoHeaders }
        );
        console.log("RESTART status:", restartRes.status);
        await restartRes.text(); // consume body
      } catch (e) {
        console.log("RESTART skip (may not exist):", e);
      }

      // Small delay to let instance restart
      await new Promise(resolve => setTimeout(resolve, 1000));

      let url = `${baseUrl}/instance/connect/${encodeURIComponent(instanceName)}`;
      if (phone) {
        url += `?number=${encodeURIComponent(phone)}`;
      }

      console.log("CONNECT URL:", url);
      const evoRes = await fetch(url, { headers: evoHeaders });

      const rawText = await evoRes.text();
      console.log("CONNECT response status:", evoRes.status);
      console.log("CONNECT response body (first 500):", rawText.substring(0, 500));

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Connect returned non-JSON (status ${evoRes.status}): ${rawText.substring(0, 200)}`);
      }

      // If no QR code returned (count:0), try deleting and recreating
      if (!data.base64 && (!data.code) && (data.count === 0 || !data.qrcode)) {
        console.log("No QR returned, trying delete+recreate flow");
        
        // Delete the instance
        await fetch(
          `${baseUrl}/instance/delete/${encodeURIComponent(instanceName)}`,
          { method: "DELETE", headers: evoHeaders }
        );
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Recreate
        const createRes = await fetch(`${baseUrl}/instance/create`, {
          method: "POST",
          headers: { ...evoHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          }),
        });
        const createData = await createRes.json();
        console.log("RECREATE status:", createRes.status);
        
        // If create returned a QR code directly
        if (createData?.qrcode?.base64) {
          return new Response(JSON.stringify({ success: true, base64: createData.qrcode.base64 }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Retry connect with increasing delays (instance needs time to initialize)
        for (let attempt = 1; attempt <= 5; attempt++) {
          const delay = attempt * 1500; // 1.5s, 3s, 4.5s, 6s, 7.5s
          console.log(`RETRY CONNECT attempt ${attempt}, waiting ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          const retryRes = await fetch(url, { headers: evoHeaders });
          const retryText = await retryRes.text();
          console.log(`RETRY ${attempt} status:`, retryRes.status, "body:", retryText.substring(0, 500));
          
          let retryData;
          try {
            retryData = JSON.parse(retryText);
          } catch {
            continue; // try again
          }
          
          if (retryData.base64) {
            return new Response(JSON.stringify({ success: true, ...retryData }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (retryData.code) {
            return new Response(JSON.stringify({ success: true, ...retryData }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        
        // All retries failed
        console.log("All retry attempts failed to get QR code");
        return new Response(JSON.stringify({ success: false, error: "Não foi possível gerar o QR Code após várias tentativas. Tente novamente." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!evoRes.ok) {
        throw new Error(`Connect failed [${evoRes.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: status - Check connection state
    if (action === "status") {
      const evoRes = await fetch(
        `${baseUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`,
        { headers: evoHeaders }
      );

      const data = await evoRes.json();
      if (!evoRes.ok) {
        throw new Error(`Status check failed [${evoRes.status}]: ${JSON.stringify(data)}`);
      }

      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: logout - Disconnect instance
    if (action === "logout") {
      const evoRes = await fetch(
        `${baseUrl}/instance/logout/${encodeURIComponent(instanceName)}`,
        { method: "DELETE", headers: evoHeaders }
      );

      const data = await evoRes.json();
      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: delete - Delete instance from Evolution API
    if (action === "delete") {
      const evoRes = await fetch(
        `${baseUrl}/instance/delete/${encodeURIComponent(instanceName)}`,
        { method: "DELETE", headers: evoHeaders }
      );

      const data = await evoRes.json();
      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: sendText - Send text message
    if (action === "sendText") {
      if (!instanceName || !number || !text) {
        return new Response(JSON.stringify({ error: "instanceName, number and text are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const evoRes = await fetch(
        `${baseUrl}/message/sendText/${encodeURIComponent(instanceName)}`,
        {
          method: "POST",
          headers: { ...evoHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ number, text }),
        }
      );

      const rawText = await evoRes.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Evolution API returned non-JSON (status ${evoRes.status}): ${rawText.substring(0, 200)}`);
      }
      if (!evoRes.ok) {
        throw new Error(`sendText failed [${evoRes.status}]: ${JSON.stringify(data)}`);
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
    console.error("Evolution connect error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});