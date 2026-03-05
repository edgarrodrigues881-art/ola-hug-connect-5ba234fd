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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Find campaigns that are scheduled and past their scheduled_at time
    const { data: campaigns, error } = await serviceClient
      .from("campaigns")
      .select("id, user_id, device_id, scheduled_at")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    if (error) throw error;

    const results: any[] = [];

    for (const campaign of campaigns || []) {
      try {
        // Call process-campaign as the user
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
      JSON.stringify({ triggered: results.length, results }),
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
