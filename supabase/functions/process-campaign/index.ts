import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHAPI_BASE = "https://gate.whapi.cloud";

async function sendWhapiMessage(token: string, to: string, body: string, mediaUrl?: string | null) {
  const phone = to.replace(/\D/g, "");
  
  if (mediaUrl) {
    // Send media message
    const res = await fetch(`${WHAPI_BASE}/messages/image`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        to: phone,
        media: { url: mediaUrl },
        caption: body || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `Whapi error ${res.status}`);
    return data;
  }

  // Send text message
  const res = await fetch(`${WHAPI_BASE}/messages/text`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({ to: phone, body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Whapi error ${res.status}`);
  return data;
}

function replaceVariables(template: string, contact: any): string {
  return template
    .replace(/\{\{nome\}\}/gi, contact.name || "")
    .replace(/\{\{numero\}\}/gi, contact.phone || "")
    .replace(/\{\{telefone\}\}/gi, contact.phone || "");
}

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

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = user.id;

  try {
    const { action, campaignId, deviceId } = await req.json();

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

      // Get device with Whapi token - use specified deviceId or first Ready device
      let deviceQuery = supabase
        .from("devices")
        .select("id, whapi_token, name")
        .eq("user_id", userId)
        .not("whapi_token", "is", null);

      if (deviceId) {
        deviceQuery = deviceQuery.eq("id", deviceId);
      } else {
        deviceQuery = deviceQuery.eq("status", "Ready");
      }

      const { data: devices } = await deviceQuery.limit(1);
      const device = devices?.[0];

      if (!device?.whapi_token) {
        return new Response(JSON.stringify({ error: "Nenhum dispositivo conectado com token Whapi encontrado. Conecte um dispositivo primeiro." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Starting campaign ${campaignId} via device ${device.name} (${device.id})`);

      // Get pending contacts
      const { data: contacts, error: contactsErr } = await supabase
        .from("campaign_contacts")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("status", "pending");

      if (contactsErr) throw contactsErr;

      // Update campaign status
      await supabase
        .from("campaigns")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", campaignId);

      let sentCount = 0;
      let failedCount = 0;
      const messageContent = campaign.message_content || "";
      const mediaUrl = campaign.media_url || null;

      for (const contact of contacts || []) {
        const phone = contact.phone.replace(/\D/g, "");
        if (phone.length < 10) {
          await supabase
            .from("campaign_contacts")
            .update({ status: "failed", error_message: "Número inválido" })
            .eq("id", contact.id);
          failedCount++;
          continue;
        }

        try {
          // Replace variables in message
          const personalizedMessage = replaceVariables(messageContent, contact);

          // Send via Whapi
          await sendWhapiMessage(device.whapi_token, phone, personalizedMessage, mediaUrl);

          await supabase
            .from("campaign_contacts")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", contact.id);
          sentCount++;

          console.log(`Sent to ${phone} (${sentCount}/${(contacts || []).length})`);

          // Random delay between 1-3 seconds to avoid spam detection
          const delay = 1000 + Math.random() * 2000;
          await new Promise(resolve => setTimeout(resolve, delay));

        } catch (err: any) {
          console.error(`Failed to send to ${phone}:`, err.message);
          await supabase
            .from("campaign_contacts")
            .update({ status: "failed", error_message: err.message || "Erro ao enviar" })
            .eq("id", contact.id);
          failedCount++;
        }
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
          device: device.name,
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
  } catch (err: any) {
    console.error("Process campaign error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
