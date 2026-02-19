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
  console.log("Whapi request payload:", JSON.stringify(payload));
  const res = await fetch(`${WHAPI_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log("Whapi response:", res.status, text);
  if (!res.ok) {
    let errorMsg = `Whapi error ${res.status}`;
    try {
      const data = JSON.parse(text);
      errorMsg = data?.error?.message || data?.message || text;
    } catch { errorMsg = text; }
    throw new Error(errorMsg);
  }
  return JSON.parse(text);
}

function formatBrazilianPhone(raw: string): string {
  // Brazilian numbers: 55 + DDD(2) + number(8 or 9 digits)
  // The Whapi API / WhatsApp expects the number as stored in the user's contact list.
  // Some numbers have 9 digits (mobile with leading 9), some have 8 digits (landline or old mobile).
  // We try both formats: first the original, if that's 13 digits (55+2+9), also try without the 9th digit.
  // This function returns the number as-is; the caller should handle retries.
  return raw;
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
    const replyButtons = buttons.filter(b => b.type === "reply");
    const ctaButtons = buttons.filter(b => b.type === "url" || b.type === "phone");

    // Whapi does NOT allow mixing quick_reply with url/call buttons.
    // If we have both, send them as separate messages.
    const results: any[] = [];

    if (replyButtons.length > 0) {
      const replyPayload: any = {
        to: phone,
        type: "button",
        body: { text: body },
        action: {
          buttons: replyButtons.map((b, i) => ({
            type: "quick_reply",
            title: b.text.substring(0, 25),
            id: `btn_${i}`,
          })),
        },
      };
      if (mediaUrl) {
        replyPayload.header = { image: { link: mediaUrl } };
      }
      console.log("Sending quick_reply buttons:", JSON.stringify(replyPayload).substring(0, 500));
      results.push(await whapiRequest(token, "/messages/interactive", replyPayload));
    }

    if (ctaButtons.length > 0) {
      const ctaPayload: any = {
        to: phone,
        type: "button",
        body: { text: replyButtons.length > 0 ? "👇 Links:" : body },
        action: {
          buttons: ctaButtons.map((b, i) => {
            if (b.type === "url") {
              return {
                type: "url",
                title: b.text.substring(0, 25),
                id: `url_${i}`,
                url: (b.value && !b.value.startsWith("http") ? "https://" + b.value : b.value) || "",
              };
            }
            return {
              type: "call",
              title: b.text.substring(0, 25),
              id: `call_${i}`,
              phone_number: b.value || "",
            };
          }),
        },
      };
      if (mediaUrl && replyButtons.length === 0) {
        ctaPayload.header = { image: { link: mediaUrl } };
      }
      console.log("Sending CTA buttons:", JSON.stringify(ctaPayload).substring(0, 500));
      results.push(await whapiRequest(token, "/messages/interactive", ctaPayload));
    }

    return results[0];
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

// Brazilian phone number normalization for WhatsApp.
// WhatsApp registers Brazilian numbers WITHOUT the extra 9th digit for many accounts.
// The Whapi API accepts both formats but only delivers to the registered format.
// Strategy: normalize to the format without the 9 (12 digits) for Brazilian numbers,
// since WhatsApp internally handles the routing.
function normalizeBrazilianPhone(phone: string): string {
  const raw = phone.replace(/\D/g, "");
  // Brazilian number with 13 digits: 55 + DDD(2) + 9 + number(8) → remove the 9
  if (raw.length === 13 && raw.startsWith("55") && raw[4] === "9") {
    const normalized = raw.slice(0, 4) + raw.slice(5);
    console.log(`Normalized BR phone: ${raw} → ${normalized}`);
    return normalized;
  }
  return raw;
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

      // Check warmup session for this device
      const { data: warmupSessions } = await supabase
        .from("warmup_sessions")
        .select("*")
        .eq("device_id", device.id)
        .eq("status", "running")
        .limit(1);

      const warmup = warmupSessions?.[0];
      let warmupLimit = Infinity;
      let minDelay = 1000;
      let maxDelay = 3000;

      if (warmup) {
        // Calculate today's limit based on warmup progression
        warmupLimit = Math.min(
          warmup.messages_per_day + (warmup.current_day - 1) * warmup.daily_increment,
          warmup.max_messages_per_day
        );
        const remaining = warmupLimit - warmup.messages_sent_today;
        warmupLimit = Math.max(0, remaining);
        minDelay = warmup.min_delay_seconds * 1000;
        maxDelay = warmup.max_delay_seconds * 1000;
        console.log(`Warmup active: limit=${warmupLimit} remaining today, delay=${warmup.min_delay_seconds}-${warmup.max_delay_seconds}s`);
      }

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
      let skippedByWarmup = 0;
      const messageContent = campaign.message_content || "";
      const mediaUrl = campaign.media_url || null;
      const campaignButtons: CampaignButton[] = Array.isArray(campaign.buttons) ? campaign.buttons : [];
      const msgType = campaign.message_type || "texto";

      for (const contact of contacts || []) {
        // Check warmup limit
        if (warmup && sentCount >= warmupLimit) {
          console.log(`Warmup limit reached (${warmupLimit}). Pausing remaining contacts.`);
          skippedByWarmup = (contacts || []).length - sentCount - failedCount;
          break;
        }

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

          // Normalize Brazilian phone number (remove extra 9)
          const normalizedPhone = normalizeBrazilianPhone(phone);

          // Send via Whapi with buttons support
          await sendWhapiMessage(device.whapi_token, normalizedPhone, personalizedMessage, mediaUrl, campaignButtons, msgType);

          await supabase
            .from("campaign_contacts")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", contact.id);
          sentCount++;

          console.log(`Sent to ${phone} (${sentCount}/${(contacts || []).length})`);

          // Use warmup delay or default 1-3 seconds
          const delay = minDelay + Math.random() * (maxDelay - minDelay);
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

      // Update warmup session counters
      if (warmup && sentCount > 0) {
        await supabase
          .from("warmup_sessions")
          .update({
            messages_sent_today: warmup.messages_sent_today + sentCount,
            messages_sent_total: warmup.messages_sent_total + sentCount,
          })
          .eq("id", warmup.id);
      }

      // Update campaign with final counts
      const finalStatus = skippedByWarmup > 0 ? "paused" : "completed";
      await supabase
        .from("campaigns")
        .update({
          status: finalStatus,
          sent_count: sentCount,
          failed_count: failedCount,
          delivered_count: sentCount,
          completed_at: finalStatus === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", campaignId);

      return new Response(
        JSON.stringify({
          success: true,
          sent: sentCount,
          failed: failedCount,
          skipped_warmup: skippedByWarmup,
          total: (contacts || []).length,
          device: device.name,
          warmup_active: !!warmup,
          status: finalStatus,
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
