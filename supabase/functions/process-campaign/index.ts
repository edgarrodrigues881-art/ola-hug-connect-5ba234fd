import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WHAPI_BASE = "https://gate.whapi.cloud";

interface CampaignButton {
  type: "reply" | "url" | "phone";
  text: string;
  value?: string;
}

async function whapiRequest(token: string, endpoint: string, payload: any) {
  const res = await fetch(`${WHAPI_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Whapi error ${res.status}`);
  return data;
}

async function sendWhapiMessage(
  token: string, 
  to: string, 
  body: string, 
  mediaUrl?: string | null,
  buttons?: CampaignButton[],
  messageType?: string
) {
  const phone = to.replace(/\D/g, "");
  const hasButtons = buttons && buttons.length > 0;

  // Interactive message with buttons (quick_reply, url, call)
  if (hasButtons && (messageType === "botoes" || messageType === "botao-midia")) {
    const interactivePayload: any = {
      to: phone,
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.map((b, i) => {
          if (b.type === "reply") {
            return {
              type: "quick_reply",
              title: b.text.substring(0, 25),
              id: `btn_${i}`,
            };
          }
          if (b.type === "url") {
            return {
              type: "url",
              title: b.text.substring(0, 25),
              id: `url_${i}`,
              url: b.value || "",
            };
          }
          if (b.type === "phone") {
            return {
              type: "call",
              title: b.text.substring(0, 25),
              id: `call_${i}`,
              phone_number: b.value || "",
            };
          }
          return {
            type: "quick_reply",
            title: b.text.substring(0, 25),
            id: `btn_${i}`,
          };
        }),
      },
    };

    // Add header with media if present
    if (mediaUrl) {
      interactivePayload.header = { image: { link: mediaUrl } };
    }

    console.log("Sending interactive button:", JSON.stringify(interactivePayload).substring(0, 500));
    return await whapiRequest(token, "/messages/interactive", interactivePayload);
  }

  // List message
  if (messageType === "lista" || messageType === "lista-midia") {
    const listPayload: any = {
      to: phone,
      type: "list",
      body: { text: body },
      action: {
        list: {
          label: "Ver opções",
          sections: [{
            title: "Opções",
            rows: (buttons || []).map((b, i) => ({
              id: `opt_${i}`,
              title: b.text.substring(0, 24),
              description: b.value || "",
            })),
          }],
        },
      },
    };

    if (mediaUrl) {
      listPayload.header = { image: { link: mediaUrl } };
    }

    console.log("Sending list:", JSON.stringify(listPayload).substring(0, 500));
    return await whapiRequest(token, "/messages/interactive", listPayload);
  }

  // Media message (no buttons)
  if (mediaUrl) {
    return await whapiRequest(token, "/messages/image", {
      to: phone,
      media: { url: mediaUrl },
      caption: body || undefined,
    });
  }

  // Plain text message
  return await whapiRequest(token, "/messages/text", { to: phone, body });
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
      const campaignButtons: CampaignButton[] = Array.isArray(campaign.buttons) ? campaign.buttons : [];
      const msgType = campaign.message_type || "texto";

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

          // Send via Whapi with buttons support
          await sendWhapiMessage(device.whapi_token, phone, personalizedMessage, mediaUrl, campaignButtons, msgType);

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
