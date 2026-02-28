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

function buildMenuChoice(button: CampaignButton, index: number): string | null {
  const text = (button.text || "").trim();
  if (!text) return null;
  if (button.type === "url") {
    const url = (button.value || "").trim();
    return url ? `${text}|url:${url}` : text;
  }
  if (button.type === "phone") {
    const phone = (button.value || "").trim();
    return phone ? `${text}|call:${phone}` : text;
  }
  const replyId = (button.value || `btn_${index}`).trim();
  return `${text}|${replyId}`;
}

async function uazapiRequest(baseUrl: string, token: string, endpoint: string, payload: any, method: "POST" | "GET" = "POST") {
  let url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = { "token": token, "Accept": "application/json" };
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
  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  if (res.status === 405 && method === "POST") {
    return uazapiRequest(baseUrl, token, endpoint, payload, "GET");
  }
  if (!res.ok) {
    let errorMsg = `API error ${res.status}`;
    try { const data = JSON.parse(text); errorMsg = data?.message || data?.error || text; } catch { errorMsg = text; }
    throw new Error(errorMsg);
  }
  return JSON.parse(text);
}

async function sendUazapiMessage(baseUrl: string, token: string, to: string, body: string, mediaUrl?: string | null, buttons?: CampaignButton[], messageType?: string) {
  const phone = to.replace(/\D/g, "");
  const hasButtons = buttons && buttons.length > 0;
  const choices = hasButtons ? buttons.map((b, i) => buildMenuChoice(b, i)).filter((choice): choice is string => Boolean(choice)) : [];
  if (choices.length > 0) {
    const payload: any = { number: phone, type: "button", text: body, choices };
    if (mediaUrl) payload.imageButton = mediaUrl;
    return await uazapiRequest(baseUrl, token, "/send/menu", payload);
  }
  if (mediaUrl) {
    return await uazapiRequest(baseUrl, token, "/send/media", { number: phone, media: mediaUrl, caption: body || undefined, type: "image" });
  }
  return await uazapiRequest(baseUrl, token, "/send/text", { number: phone, text: body });
}

async function checkNumberExists(baseUrl: string, token: string, phone: string): Promise<{ exists: boolean; error?: string }> {
  try {
    const result = await uazapiRequest(baseUrl, token, "/check/exist", { number: phone });
    // UaZapi returns different formats, handle common ones
    if (result?.exists === false || result?.numberExists === false || result?.status === "not_exists") {
      return { exists: false, error: `Número ${phone} não está no WhatsApp` };
    }
    return { exists: true };
  } catch (err: any) {
    // If the endpoint doesn't exist or fails, skip validation and try sending anyway
    const msg = err.message || "";
    if (msg.includes("not on Whats") || msg.includes("not registered") || msg.includes("not_exists")) {
      return { exists: false, error: msg };
    }
    // Don't block sending if check endpoint is unavailable
    return { exists: true };
  }
}

function normalizeBrazilianPhone(phone: string): string {
  const raw = phone.replace(/\D/g, "");
  if ((raw.length === 10 || raw.length === 11) && !raw.startsWith("55")) return `55${raw}`;
  return raw;
}

function generateUniqueRand4(usedSet: Set<string>): string {
  let value: string;
  do { value = String(Math.floor(Math.random() * 10000)).padStart(4, "0"); } while (usedSet.has(value) && usedSet.size < 10000);
  usedSet.add(value);
  return value;
}

function generateUniqueRand3(usedSet: Set<string>): string {
  let value: string;
  do { value = Array.from({ length: 3 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join(""); } while (usedSet.has(value) && usedSet.size < 17576);
  usedSet.add(value);
  return value;
}

function replaceVariables(template: string, contact: any, rand4: string, rand3: string): string {
  return template
    .replace(/\{\{nome\}\}/gi, contact.name || "")
    .replace(/\{\{numero\}\}/gi, contact.phone || "")
    .replace(/\{\{telefone\}\}/gi, contact.phone || "")
    .replace(/\{\{rand4\}\}/gi, rand4)
    .replace(/\{\{rand3\}\}/gi, rand3);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const isServiceRole = token === serviceRoleKey;

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

  let userId: string;

  if (isServiceRole) {
    // Called by cron/service - get userId from the campaign itself
    const body = await req.clone().json();
    const { data: camp } = await serviceClient.from("campaigns").select("user_id").eq("id", body.campaignId).single();
    if (!camp) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    userId = camp.user_id;
  } else {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    userId = user.id;
  }

  try {
    const { action, campaignId, deviceId } = await req.json();

    // ─── PAUSE ───
    if (action === "pause") {
      await serviceClient.from("campaigns").update({ status: "paused" }).eq("id", campaignId).eq("user_id", userId);
      return new Response(JSON.stringify({ success: true, status: "paused" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── CANCEL ───
    if (action === "cancel") {
      await serviceClient.from("campaigns").update({ status: "canceled", completed_at: new Date().toISOString() }).eq("id", campaignId).eq("user_id", userId);
      // Mark remaining pending contacts as canceled
      await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: "Campanha cancelada" }).eq("campaign_id", campaignId).eq("status", "pending");
      return new Response(JSON.stringify({ success: true, status: "canceled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── RESUME ───
    if (action === "resume") {
      await serviceClient.from("campaigns").update({ status: "running" }).eq("id", campaignId).eq("user_id", userId);
      // The resume will re-trigger sending of remaining pending contacts
      // Fall through to start logic below with action override
    }

    // ─── START / RESUME ───
    if (action === "start" || action === "resume") {
      const { data: campaign, error: campErr } = await serviceClient.from("campaigns").select("*").eq("id", campaignId).single();
      if (campErr || !campaign) {
        return new Response(JSON.stringify({ error: "Campanha não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get device
      let deviceQuery = serviceClient.from("devices").select("id, name, uazapi_token, uazapi_base_url").eq("user_id", userId);
      if (deviceId) { deviceQuery = deviceQuery.eq("id", deviceId); } else { deviceQuery = deviceQuery.eq("status", "Ready"); }
      const { data: devices } = await deviceQuery.limit(1);
      const device = devices?.[0];
      const deviceToken = device?.uazapi_token || Deno.env.get("UAZAPI_TOKEN");
      const deviceBaseUrl = (device?.uazapi_base_url || Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");

      if (!device || !deviceToken || !deviceBaseUrl) {
        return new Response(JSON.stringify({ error: "Nenhum dispositivo conectado com token configurado encontrado." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      console.log(`Starting campaign ${campaignId} via device ${device.name}`);

      // Read delay config from campaign
      const minDelayMs = (campaign.min_delay_seconds || 8) * 1000;
      const maxDelayMs = (campaign.max_delay_seconds || 25) * 1000;
      const pauseEveryMin = campaign.pause_every_min || 10;
      const pauseEveryMax = campaign.pause_every_max || 20;
      const pauseDurMinMs = (campaign.pause_duration_min || 30) * 1000;
      const pauseDurMaxMs = (campaign.pause_duration_max || 120) * 1000;

      // Decide pause interval for this batch
      const pauseAfter = Math.round(randomBetween(pauseEveryMin, pauseEveryMax));
      console.log(`Delay: ${campaign.min_delay_seconds}-${campaign.max_delay_seconds}s, Pause every ${pauseAfter} msgs, Duration: ${campaign.pause_duration_min}-${campaign.pause_duration_max}s`);

      // Get pending contacts
      const { data: contacts, error: contactsErr } = await serviceClient.from("campaign_contacts").select("*").eq("campaign_id", campaignId).eq("status", "pending");
      if (contactsErr) throw contactsErr;

      // Update campaign status to running
      await serviceClient.from("campaigns").update({ status: "running", started_at: campaign.started_at || new Date().toISOString() }).eq("id", campaignId);

      let sentCount = campaign.sent_count || 0;
      let failedCount = campaign.failed_count || 0;
      let batchSent = 0;
      const messageContent = campaign.message_content || "";
      const mediaUrl = campaign.media_url || null;
      const campaignButtons: CampaignButton[] = Array.isArray(campaign.buttons) ? campaign.buttons : [];
      const msgType = campaign.message_type || "texto";
      const usedRand4 = new Set<string>();
      const usedRand3 = new Set<string>();

      for (const contact of contacts || []) {
        // Check if campaign was paused or canceled mid-execution
        const { data: freshCampaign } = await serviceClient.from("campaigns").select("status").eq("id", campaignId).single();
        if (freshCampaign && (freshCampaign.status === "paused" || freshCampaign.status === "canceled")) {
          console.log(`Campaign ${campaignId} was ${freshCampaign.status} during execution. Stopping.`);
          break;
        }

        const phone = contact.phone.replace(/\D/g, "");
        if (phone.length < 10) {
          await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: "Número inválido" }).eq("id", contact.id);
          failedCount++;
          await serviceClient.from("campaigns").update({ failed_count: failedCount }).eq("id", campaignId);
          continue;
        }

        try {
          const rand4 = generateUniqueRand4(usedRand4);
          const rand3 = generateUniqueRand3(usedRand3);
          const personalizedMessage = replaceVariables(messageContent, contact, rand4, rand3);
          const normalizedPhone = normalizeBrazilianPhone(phone);

          // Check if number exists on WhatsApp before sending
          const check = await checkNumberExists(deviceBaseUrl, deviceToken, normalizedPhone);
          if (!check.exists) {
            console.log(`Number ${phone} not on WhatsApp, skipping`);
            await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: check.error || "Número não está no WhatsApp" }).eq("id", contact.id);
            failedCount++;
            await serviceClient.from("campaigns").update({ failed_count: failedCount }).eq("id", campaignId);
            continue;
          }

          await sendUazapiMessage(deviceBaseUrl, deviceToken, normalizedPhone, personalizedMessage, mediaUrl, campaignButtons, msgType);
          await serviceClient.from("campaign_contacts").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", contact.id);
          sentCount++;
          batchSent++;

          // Update campaign counters in real-time
          await serviceClient.from("campaigns").update({ sent_count: sentCount, delivered_count: sentCount }).eq("id", campaignId);

          console.log(`Sent to ${phone} (${batchSent}/${(contacts || []).length})`);

          // Delay between messages
          const delay = randomBetween(minDelayMs, maxDelayMs);
          await new Promise(resolve => setTimeout(resolve, delay));

          // Pause logic
          if (batchSent > 0 && batchSent % pauseAfter === 0) {
            const pauseDuration = randomBetween(pauseDurMinMs, pauseDurMaxMs);
            console.log(`Pausing for ${Math.round(pauseDuration / 1000)}s after ${batchSent} messages`);
            await new Promise(resolve => setTimeout(resolve, pauseDuration));
          }
        } catch (err: any) {
          console.error(`Failed to send to ${phone}:`, err.message);
          await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: err.message || "Erro ao enviar" }).eq("id", contact.id);
          failedCount++;
          await serviceClient.from("campaigns").update({ failed_count: failedCount }).eq("id", campaignId);
        }
      }

      // Final status
      const { data: finalCampaign } = await serviceClient.from("campaigns").select("status").eq("id", campaignId).single();
      if (finalCampaign && finalCampaign.status === "running") {
        // Check if there are still pending contacts
        const { count } = await serviceClient.from("campaign_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending");
        const finalStatus = (count || 0) > 0 ? "paused" : "completed";
        await serviceClient.from("campaigns").update({
          status: finalStatus,
          sent_count: sentCount,
          failed_count: failedCount,
          delivered_count: sentCount,
          completed_at: finalStatus === "completed" ? new Date().toISOString() : null,
        }).eq("id", campaignId);
      }

      return new Response(JSON.stringify({ success: true, sent: sentCount, failed: failedCount, total: (contacts || []).length, device: device.name }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── STATUS ───
    if (action === "status") {
      const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
      const { data: contacts } = await supabase.from("campaign_contacts").select("id, phone, name, status, sent_at, error_message").eq("campaign_id", campaignId);
      return new Response(JSON.stringify({ campaign, contacts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("Process campaign error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
