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

    const userId = user.id;

    // Get user's devices
    const { data: devices, error: devError } = await supabase
      .from("devices")
      .select("*")
      .eq("user_id", userId);

    if (devError) throw devError;

    const results: any[] = [];

    for (const device of (devices || [])) {
      // Skip devices without whapi_token
      if (!device.whapi_token) {
        results.push({ id: device.id, name: device.name, found: false, reason: "no_token" });
        continue;
      }

      try {
        // Check channel health via /health
        const res = await fetch(`${WHAPI_BASE}/health`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${device.whapi_token}`,
            "Accept": "application/json",
          },
        });

        const rawText = await res.text();
        console.log(`Device ${device.name} /health status: ${res.status}, body: ${rawText.substring(0, 500)}`);

        let data: any = {};
        try { data = JSON.parse(rawText); } catch {}

        if (!res.ok) {
          // Fallback: check /users/login for 409
          const loginRes = await fetch(`${WHAPI_BASE}/users/login`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${device.whapi_token}`,
              "Accept": "application/json",
            },
          });
          const loginText = await loginRes.text();
          
          if (loginRes.status === 409) {
            await supabase
              .from("devices")
              .update({ status: "Ready" })
              .eq("id", device.id);
            results.push({ id: device.id, name: device.name, found: true, status: "Ready" });
          } else {
            await supabase
              .from("devices")
              .update({ status: "Disconnected", number: "" })
              .eq("id", device.id);
            results.push({ id: device.id, name: device.name, found: false, reason: "api_error" });
          }
          await loginRes.text().catch(() => {});
          continue;
        }

        // Extract phone from health response - user.id contains the phone number
        const phone = data.user?.id || data.phone || data.user?.phone || data.wid || "";
        const statusText = (data.status?.text || data.status || "").toString().toUpperCase();
        const isConnected = statusText === "AUTH" || statusText === "AUTHENTICATED" || statusText === "CONNECTED" || !!phone;
        const newStatus = isConnected ? "Ready" : "Disconnected";

        let formattedPhone = "";
        if (phone) {
          const raw = String(phone).replace(/\D/g, "");
          if (raw.startsWith("55") && raw.length >= 12) {
            formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
          } else if (raw) {
            formattedPhone = `+${raw}`;
          }
        }

        // Get profile picture from health response
        const profilePicture = data.user?.profile_pic || device.profile_picture || null;

        await supabase
          .from("devices")
          .update({
            status: newStatus,
            number: formattedPhone || device.number || "",
            profile_picture: profilePicture || null,
          })
          .eq("id", device.id);

        results.push({
          id: device.id,
          name: device.name,
          found: true,
          status: newStatus,
          phone: formattedPhone,
        });
      } catch (err) {
        console.error(`Error syncing device ${device.name}:`, err);
        results.push({ id: device.id, name: device.name, found: false, reason: "exception" });
      }
    }

    // Sync proxy statuses
    const { data: allDevicesAfter } = await supabase.from("devices").select("proxy_id").eq("user_id", userId);
    const { data: allProxies } = await supabase.from("proxies").select("id, status").eq("user_id", userId);
    const linkedProxyIds = new Set((allDevicesAfter || []).filter((d: any) => d.proxy_id).map((d: any) => d.proxy_id));

    let proxiesUpdated = 0;
    for (const proxy of (allProxies || [])) {
      const isLinked = linkedProxyIds.has(proxy.id);
      let correctStatus: string;
      if (isLinked) correctStatus = "USANDO";
      else if (proxy.status === "USANDO") correctStatus = "USADA";
      else correctStatus = proxy.status;

      if (proxy.status !== correctStatus) {
        await supabase.from("proxies").update({ status: correctStatus } as any).eq("id", proxy.id);
        proxiesUpdated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, devices: results, proxiesUpdated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Sync error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
