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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

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
        // Check channel status via /users/me
        const res = await fetch(`${WHAPI_BASE}/users/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${device.whapi_token}`,
            "Accept": "application/json",
          },
        });

        if (!res.ok) {
          results.push({ id: device.id, name: device.name, found: false, reason: "api_error" });
          await supabase
            .from("devices")
            .update({ status: "Disconnected", number: "" } as any)
            .eq("id", device.id);
          continue;
        }

        const data = await res.json();
        
        // Extract phone number and status from Whapi response
        const phone = data.phone || "";
        const pushName = data.pushname || data.name || "";
        const status = data.status;
        
        // Determine connection status
        // Whapi statuses: "loading", "authenticated", "got qr code", "not launched"
        const isConnected = status === "authenticated" || status === "loading";
        const newStatus = isConnected ? "Ready" : "Disconnected";

        // Format phone number
        let formattedPhone = "";
        if (phone) {
          const raw = phone.replace(/\D/g, "");
          if (raw.startsWith("55") && raw.length >= 12) {
            formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
          } else if (raw) {
            formattedPhone = `+${raw}`;
          }
        }

        await supabase
          .from("devices")
          .update({
            status: newStatus,
            number: formattedPhone || device.number || "",
          } as any)
          .eq("id", device.id);

        results.push({
          id: device.id,
          name: device.name,
          found: true,
          status: newStatus,
          phone: formattedPhone,
          pushName,
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
