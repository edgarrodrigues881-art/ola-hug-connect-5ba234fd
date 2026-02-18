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

    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Evolution API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, "");

    // Fetch all instances from Evolution API
    const evoResponse = await fetch(`${baseUrl}/instance/fetchInstances`, {
      headers: { apikey: EVOLUTION_API_KEY },
    });

    if (!evoResponse.ok) {
      const errText = await evoResponse.text();
      throw new Error(`Evolution API error [${evoResponse.status}]: ${errText}`);
    }

    const instances = await evoResponse.json();

    // Get user's devices
    const { data: devices, error: devError } = await supabase
      .from("devices")
      .select("*")
      .eq("user_id", userId);

    if (devError) throw devError;

    // Build map of Evolution instances by name
    const evoMap: Record<string, any> = {};
    for (const inst of (Array.isArray(instances) ? instances : [])) {
      const name = inst.instance?.instanceName || inst.instanceName;
      if (name) evoMap[name] = inst;
    }

    const results: any[] = [];

    for (const device of (devices || [])) {
      const evoInstance = evoMap[device.name];
      if (!evoInstance) {
        // Instance not found in Evolution API - mark as disconnected
        results.push({ id: device.id, name: device.name, found: false });
        await supabase
          .from("devices")
          .update({ status: "Disconnected", number: "" } as any)
          .eq("id", device.id);
        continue;
      }

      // Extract info from the Evolution API response
      const instanceData = evoInstance.instance || evoInstance;
      const state = instanceData.state || instanceData.status || "close";
      const ownerJid = instanceData.owner || instanceData.ownerJid || "";
      const profilePicUrl = instanceData.profilePictureUrl || instanceData.profilePicUrl || "";
      const profileName = instanceData.profileName || instanceData.pushName || "";

      // Parse phone number from ownerJid (format: 5511999999999@s.whatsapp.net)
      let phoneNumber = "";
      if (ownerJid) {
        const match = ownerJid.match(/^(\d+)@/);
        if (match) {
          const raw = match[1];
          // Format as +XX XX XXXXX-XXXX for BR numbers
          if (raw.startsWith("55") && raw.length >= 12) {
            phoneNumber = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
          } else {
            phoneNumber = `+${raw}`;
          }
        }
      }

      const newStatus = state === "open" ? "Ready" : "Disconnected";

      await supabase
        .from("devices")
        .update({
          status: newStatus,
          number: phoneNumber || device.number || "",
        } as any)
        .eq("id", device.id);

      results.push({
        id: device.id,
        name: device.name,
        found: true,
        status: newStatus,
        phone: phoneNumber,
        profilePic: profilePicUrl,
        profileName: profileName,
        state,
      });
    }

    // Also sync proxy statuses
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
