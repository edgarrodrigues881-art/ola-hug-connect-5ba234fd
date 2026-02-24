import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CampaignButton {
  type: "reply" | "url" | "phone";
  text: string;
  value?: string;
}

// UaZapi request helper - supports POST by default, with fallback to GET when needed
async function uazapiRequest(baseUrl: string, token: string, endpoint: string, payload: any, method: "POST" | "GET" = "POST") {
  let url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    "token": token,
    "Accept": "application/json",
  };

  let fetchOptions: RequestInit;
  if (method === "GET") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null) params.append(key, String(value));
    }
    url += `?${params.toString()}`;
    fetchOptions = { method: "GET", headers };
  } else {
    headers["Content-Type"] = "application/json";
    fetchOptions = { method: "POST", headers, body: JSON.stringify(payload) };
  }

  console.log(`UaZapi ${method} request:`, url);
  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  console.log("UaZapi response:", res.status, text.substring(0, 300));

  // Some gateways only allow GET on specific routes
  if (res.status === 405 && method === "POST") {
    console.log("POST returned 405, retrying with GET...");
    return uazapiRequest(baseUrl, token, endpoint, payload, "GET");
  }

  if (!res.ok) {
    let errorMsg = `API error ${res.status}`;
    try {
      const data = JSON.parse(text);
      errorMsg = data?.message || data?.error || text;
    } catch {
      errorMsg = text;
    }
    throw new Error(errorMsg);
  }

  return JSON.parse(text);
}

async function sendUazapiMessage(
  baseUrl: string,
  token: string,
  to: string,
  body: string,
  mediaUrl?: string | null,
  buttons?: CampaignButton[],
  messageType?: string
) {
  const phone = to.replace(/\D/g, "");

  // Media message (image + optional caption)
  if (mediaUrl && (messageType === "imagem" || messageType === "botao-midia" || messageType === "imagem-texto")) {
    return await uazapiRequest(baseUrl, token, "/message/send-media", {
      phone,
      media: mediaUrl,
      caption: body || undefined,
      type: "image",
    });
  }

  // Buttons message
  if (buttons && buttons.length > 0 && (messageType === "botoes" || messageType === "botao-midia")) {
    // Try sending as button message
    const buttonPayload: any = {
      phone,
      message: body,
      buttons: buttons.map((b, i) => ({
        id: `btn_${i}`,
        text: b.text.substring(0, 25),
      })),
    };
    if (mediaUrl) {
      buttonPayload.media = mediaUrl;
    }
    return await uazapiRequest(baseUrl, token, "/message/send-buttons", buttonPayload);
  }

  // Plain text message
  return await uazapiRequest(baseUrl, token, "/send/text", {
    number: phone,
    text: body,
  });
}

// Brazilian phone number normalization (keep 9th digit; only sanitize + optional country code)
function normalizeBrazilianPhone(phone: string): string {
  const raw = phone.replace(/\D/g, "");

  // If number comes without country code (10/11 digits BR), prefix 55
  if ((raw.length === 10 || raw.length === 11) && !raw.startsWith("55")) {
    return `55${raw}`;
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

      // Get device with UaZapi token - use per-device config
      const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      
      let deviceQuery = serviceClient
        .from("devices")
        .select("id, name, uazapi_token, uazapi_base_url")
        .eq("user_id", userId);

      if (deviceId) {
        deviceQuery = deviceQuery.eq("id", deviceId);
      } else {
        deviceQuery = deviceQuery.eq("status", "Ready");
      }

      const { data: devices } = await deviceQuery.limit(1);
      const device = devices?.[0];

      // Resolve token and base URL (per-device or global fallback)
      const deviceToken = device?.uazapi_token || Deno.env.get("UAZAPI_TOKEN");
      const deviceBaseUrl = (device?.uazapi_base_url || Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");

      if (!device || !deviceToken || !deviceBaseUrl) {
        return new Response(JSON.stringify({ error: "Nenhum dispositivo conectado com token configurado encontrado. Configure o token no dispositivo primeiro." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Starting campaign ${campaignId} via device ${device.name} (${device.id}), base=${deviceBaseUrl}`);

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
          const personalizedMessage = replaceVariables(messageContent, contact);
          const normalizedPhone = normalizeBrazilianPhone(phone);

          // Send via UaZapi
          await sendUazapiMessage(deviceBaseUrl, deviceToken, normalizedPhone, personalizedMessage, mediaUrl, campaignButtons, msgType);

          await supabase
            .from("campaign_contacts")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", contact.id);
          sentCount++;

          console.log(`Sent to ${phone} (${sentCount}/${(contacts || []).length})`);

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
