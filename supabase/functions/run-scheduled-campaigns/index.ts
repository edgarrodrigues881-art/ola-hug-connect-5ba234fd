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

  // ── Auth: require x-cron-secret or valid service role JWT ──
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("INTERNAL_TICK_SECRET");
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const isValidCron = expectedSecret && cronSecret === expectedSecret;
  const isServiceRole = authHeader === `Bearer ${serviceRoleKey}`;

  if (!isValidCron && !isServiceRole) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    // ── Cleanup stale device locks (older than 120s without heartbeat) ──
    const { data: cleanedCount } = await serviceClient.rpc("cleanup_stale_locks", { _stale_seconds: 120 });
    if (cleanedCount && cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} stale device locks`);
    }

    // ── Reset stuck campaigns (running but no progress for > 5 min) ──
    const { data: stuckCampaigns } = await serviceClient
      .from("campaigns")
      .select("id, device_id, device_ids, updated_at")
      .eq("status", "running")
      .lt("updated_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

    for (const stuck of stuckCampaigns || []) {
      // Check if there are processing contacts stuck
      const { count } = await serviceClient
        .from("campaign_contacts")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", stuck.id)
        .eq("status", "processing");

      if (count && count > 0) {
        // Revert processing contacts back to pending
        await serviceClient
          .from("campaign_contacts")
          .update({ status: "pending" })
          .eq("campaign_id", stuck.id)
          .eq("status", "processing");
        console.log(`Reset ${count} stuck processing contacts for campaign ${stuck.id}`);
      }

      // Release any locks held by this stuck campaign
      const ids: string[] = Array.isArray(stuck.device_ids) && stuck.device_ids.length > 0
        ? stuck.device_ids : stuck.device_id ? [stuck.device_id] : [];
      for (const deviceId of ids) {
        await serviceClient.rpc("release_device_lock", { _device_id: deviceId, _campaign_id: stuck.id });
      }
      console.log(`Released locks for stuck campaign ${stuck.id}`);
    }

    // ── Find and trigger scheduled campaigns ──
    const { data: campaigns, error } = await serviceClient
      .from("campaigns")
      .select("id, user_id, device_id, scheduled_at")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    if (error) throw error;

    const results: any[] = [];

    for (const campaign of campaigns || []) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/process-campaign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            action: "start",
            campaignId: campaign.id,
            deviceId: campaign.device_id || undefined,
          }),
        });
        const text = await res.text();
        results.push({ campaignId: campaign.id, status: res.status, response: text });
        console.log(`Triggered scheduled campaign ${campaign.id}: ${res.status}`);
      } catch (err: any) {
        console.error(`Failed to trigger campaign ${campaign.id}:`, err.message);
        results.push({ campaignId: campaign.id, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ triggered: results.length, results, staleLocksCleaned: cleanedCount || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Run scheduled campaigns error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
