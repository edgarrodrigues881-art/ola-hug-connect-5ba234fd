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

    // Get global UaZapi config as fallback
    const GLOBAL_UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
    const GLOBAL_UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    // Get user's devices with per-device config
    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: devices, error: devError } = await serviceClient
      .from("devices")
      .select("*")
      .eq("user_id", userId);

    if (devError) throw devError;

    const results: any[] = [];

    for (const device of (devices || [])) {
      // Use per-device token/url, fallback to global
      const deviceToken = device.uazapi_token || GLOBAL_UAZAPI_TOKEN;
      const deviceBaseUrl = (device.uazapi_base_url || GLOBAL_UAZAPI_BASE_URL || "").replace(/\/+$/, "");

      if (!deviceToken || !deviceBaseUrl) {
        results.push({ id: device.id, name: device.name, found: false, status: device.status, error: "No token configured" });
        continue;
      }

      let newStatus = "Disconnected";
      let formattedPhone = device.number || "";
      let profilePicture = device.profile_picture || null;

      try {
        const res = await fetch(`${deviceBaseUrl}/instance/status`, {
          method: "GET",
          headers: { "token": deviceToken, "Accept": "application/json" },
        });
        const data = await res.json();
        console.log(`Device ${device.name} status:`, res.status, JSON.stringify(data).substring(0, 300));

        const inst = data.instance || data || {};
        const state = inst.status || data.state;
        const isConnected = state === "connected" || state === "authenticated";
        const phone = inst.owner || inst.phone || data.phone || "";

        if (phone) {
          const raw = String(phone).replace(/\D/g, "");
          if (raw.startsWith("55") && raw.length >= 12) {
            formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
          } else if (raw) {
            formattedPhone = `+${raw}`;
          }
        }

        profilePicture = inst.profilePicUrl || device.profile_picture || null;
        const syncedProfileName = inst.profileName || inst.pushname || "";
        newStatus = isConnected ? "Ready" : "Disconnected";

      await serviceClient
        .from("devices")
        .update({
          status: newStatus,
          number: formattedPhone,
          profile_picture: profilePicture,
          profile_name: syncedProfileName || device.profile_name || "",
        })
        .eq("id", device.id);
      } catch (err) {
        console.error(`Error syncing device ${device.name}:`, err);

      await serviceClient
        .from("devices")
        .update({
          status: newStatus,
          number: formattedPhone,
          profile_picture: profilePicture,
        })
        .eq("id", device.id);
      }

      results.push({
        id: device.id,
        name: device.name,
        found: true,
        status: newStatus,
        phone: formattedPhone,
      });
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