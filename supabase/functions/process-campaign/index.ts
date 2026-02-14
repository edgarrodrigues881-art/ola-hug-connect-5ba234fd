import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

  try {
    const { action, campaignId } = await req.json();

    if (action === "start") {
      // Get campaign
      const { data: campaign, error: campErr } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (campErr || !campaign) {
        return new Response(JSON.stringify({ error: "Campanha não encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get campaign contacts
      const { data: contacts, error: contactsErr } = await supabase
        .from("campaign_contacts")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("status", "pending");

      if (contactsErr) throw contactsErr;

      // Update campaign status to processing
      await supabase
        .from("campaigns")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", campaignId);

      // Simulate processing each contact
      let sentCount = 0;
      let failedCount = 0;

      for (const contact of contacts || []) {
        // Validate phone number
        const phone = contact.phone.replace(/\D/g, "");
        if (phone.length < 10) {
          await supabase
            .from("campaign_contacts")
            .update({ status: "failed", error_message: "Número inválido" })
            .eq("id", contact.id);
          failedCount++;
          continue;
        }

        // Mark as sent (in real integration, this would call WhatsApp API)
        await supabase
          .from("campaign_contacts")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", contact.id);
        sentCount++;
      }

      // Update campaign with final counts
      await supabase
        .from("campaigns")
        .update({
          status: "completed",
          sent_count: sentCount,
          failed_count: failedCount,
          delivered_count: sentCount,
          completed_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return new Response(
        JSON.stringify({
          success: true,
          sent: sentCount,
          failed: failedCount,
          total: (contacts || []).length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "status") {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      const { data: contacts } = await supabase
        .from("campaign_contacts")
        .select("id, phone, name, status, sent_at, error_message")
        .eq("campaign_id", campaignId);

      return new Response(
        JSON.stringify({ campaign, contacts }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
