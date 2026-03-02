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
    if (result?.exists === false || result?.numberExists === false || result?.status === "not_exists") {
      return { exists: false, error: `Número ${phone} não está no WhatsApp` };
    }
    return { exists: true };
  } catch (err: any) {
    const msg = err.message || "";
    if (msg.includes("not on Whats") || msg.includes("not registered") || msg.includes("not_exists")) {
      return { exists: false, error: msg };
    }
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

// Max time we allow per invocation before self-continuing (45s safety margin)
const MAX_EXECUTION_MS = 45_000;

async function selfContinue(supabaseUrl: string, serviceRoleKey: string, campaignId: string, deviceId?: string) {
  console.log(`Self-continuing campaign ${campaignId}...`);
  try {
    await fetch(`${supabaseUrl}/functions/v1/process-campaign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ action: "continue", campaignId, deviceId }),
    });
  } catch (err: any) {
    console.error(`Self-continue failed: ${err.message}`);
  }
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
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const isServiceRole = token === serviceRoleKey;

  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  let userId: string;

  const body = await req.json();
  const { action, campaignId, deviceId } = body;

  if (isServiceRole) {
    const { data: camp } = await serviceClient.from("campaigns").select("user_id").eq("id", campaignId).single();
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
    // ─── PAUSE ───
    if (action === "pause") {
      await serviceClient.from("campaigns").update({ status: "paused" }).eq("id", campaignId).eq("user_id", userId);
      return new Response(JSON.stringify({ success: true, status: "paused" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── CANCEL ───
    if (action === "cancel") {
      await serviceClient.from("campaigns").update({ status: "canceled", completed_at: new Date().toISOString() }).eq("id", campaignId).eq("user_id", userId);
      await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: "Campanha cancelada" }).eq("campaign_id", campaignId).eq("status", "pending");
      return new Response(JSON.stringify({ success: true, status: "canceled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── RESUME ───
    if (action === "resume") {
      await serviceClient.from("campaigns").update({ status: "running" }).eq("id", campaignId).eq("user_id", userId);
      // Respond immediately, then self-continue to process remaining
      selfContinue(supabaseUrl, serviceRoleKey, campaignId, deviceId);
      return new Response(JSON.stringify({ success: true, status: "running" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── START ───
    if (action === "start") {
      const { data: campaign } = await serviceClient.from("campaigns").select("*").eq("id", campaignId).single();
      if (!campaign) {
        return new Response(JSON.stringify({ error: "Campanha não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Mark as running immediately
      await serviceClient.from("campaigns").update({ status: "running", started_at: campaign.started_at || new Date().toISOString() }).eq("id", campaignId);
      // Respond immediately, then self-continue to process
      selfContinue(supabaseUrl, serviceRoleKey, campaignId, deviceId);
      return new Response(JSON.stringify({ success: true, status: "running" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── CONTINUE (internal batch processing) ───
    if (action === "continue") {
      const startTime = Date.now();

      const { data: campaign, error: campErr } = await serviceClient.from("campaigns").select("*").eq("id", campaignId).single();
      if (campErr || !campaign) {
        return new Response(JSON.stringify({ error: "Campanha não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // If campaign is not running, stop
      if (campaign.status !== "running") {
        console.log(`Campaign ${campaignId} is ${campaign.status}, not processing.`);
        return new Response(JSON.stringify({ success: true, status: campaign.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get devices
      const deviceIds: string[] = Array.isArray(campaign.device_ids) && campaign.device_ids.length > 0
        ? campaign.device_ids
        : deviceId ? [deviceId] : (campaign.device_id ? [campaign.device_id] : []);

      const messagesPerInstance = campaign.messages_per_instance || 0;

      let allDevices: any[] = [];
      if (deviceIds.length > 0) {
        const { data: devs } = await serviceClient.from("devices").select("id, name, uazapi_token, uazapi_base_url, status").eq("user_id", campaign.user_id).in("id", deviceIds);
        allDevices = (devs || []).filter(d => d.uazapi_token && d.uazapi_base_url);
      }

      if (allDevices.length === 0) {
        const { data: devs } = await serviceClient.from("devices").select("id, name, uazapi_token, uazapi_base_url").eq("user_id", campaign.user_id).eq("status", "Ready").limit(1);
        allDevices = devs || [];
      }

      const device = allDevices[0];
      if (!device) {
        await serviceClient.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
        return new Response(JSON.stringify({ error: "Nenhum dispositivo encontrado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Read delay config
      const minDelayMs = (campaign.min_delay_seconds || 8) * 1000;
      const maxDelayMs = (campaign.max_delay_seconds || 25) * 1000;
      const pauseEveryMin = campaign.pause_every_min || 10;
      const pauseEveryMax = campaign.pause_every_max || 20;
      const pauseDurMinMs = (campaign.pause_duration_min || 30) * 1000;
      const pauseDurMaxMs = (campaign.pause_duration_max || 120) * 1000;

      // Get batch state from body or defaults
      let batchSent = body.batchSent || 0;
      let currentDeviceIndex = body.currentDeviceIndex || 0;
      let instanceMsgCount = body.instanceMsgCount || 0;
      // Recalculate pauseAfter randomly each batch
      let pauseAfter = Math.round(randomBetween(pauseEveryMin, pauseEveryMax));
      let msgsSincePause = body.msgsSincePause || 0;

      const useRotation = messagesPerInstance > 0 && allDevices.length > 1;
      const useParallel = messagesPerInstance === -1 && allDevices.length > 1;

      // Get pending contacts (batch of 100 for efficiency)
      const { data: contacts, error: contactsErr } = await serviceClient
        .from("campaign_contacts")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(100);

      if (contactsErr) throw contactsErr;

      if (!contacts || contacts.length === 0) {
        // No more pending contacts — complete the campaign
        await serviceClient.from("campaigns").update({
          status: "completed",
          completed_at: new Date().toISOString(),
        }).eq("id", campaignId);
        console.log(`Campaign ${campaignId} completed!`);
        return new Response(JSON.stringify({ success: true, status: "completed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let sentCount = campaign.sent_count || 0;
      let failedCount = campaign.failed_count || 0;
      const messageContent = campaign.message_content || "";
      const mediaUrl = campaign.media_url || null;
      const campaignButtons: CampaignButton[] = Array.isArray(campaign.buttons) ? campaign.buttons : [];
      const msgType = campaign.message_type || "texto";
      const usedRand4 = new Set<string>();
      const usedRand3 = new Set<string>();
      let needsContinue = false;

      // ─── PARALLEL MODE ───
      if (useParallel) {
        const chunks: any[][] = allDevices.map(() => [] as any[]);
        contacts.forEach((c, i) => chunks[i % allDevices.length].push(c));

        const results = await Promise.allSettled(allDevices.map(async (dev, devIdx) => {
          const chunk = chunks[devIdx];
          const devToken = dev.uazapi_token || Deno.env.get("UAZAPI_TOKEN");
          const devBaseUrl = (dev.uazapi_base_url || Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");
          let devSent = 0, devFailed = 0;
          const devUsedRand4 = new Set<string>();
          const devUsedRand3 = new Set<string>();

          for (const contact of chunk) {
            if (Date.now() - startTime > MAX_EXECUTION_MS) { needsContinue = true; break; }

            const { data: fresh } = await serviceClient.from("campaigns").select("status").eq("id", campaignId).single();
            if (fresh && (fresh.status === "paused" || fresh.status === "canceled")) break;

            const phone = contact.phone.replace(/\D/g, "");
            if (phone.length < 10) {
              await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: "Número inválido" }).eq("id", contact.id);
              devFailed++;
              continue;
            }
            try {
              const rand4 = generateUniqueRand4(devUsedRand4);
              const rand3 = generateUniqueRand3(devUsedRand3);
              const msg = replaceVariables(messageContent, contact, rand4, rand3);
              const normalized = normalizeBrazilianPhone(phone);
              const check = await checkNumberExists(devBaseUrl, devToken, normalized);
              if (!check.exists) {
                await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: check.error || "Não está no WhatsApp" }).eq("id", contact.id);
                devFailed++;
                continue;
              }
              await sendUazapiMessage(devBaseUrl, devToken, normalized, msg, mediaUrl, campaignButtons, msgType);
              await serviceClient.from("campaign_contacts").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", contact.id);
              devSent++;

              const delay = randomBetween(minDelayMs, maxDelayMs);
              await new Promise(r => setTimeout(r, delay));
            } catch (err: any) {
              await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: err.message || "Erro" }).eq("id", contact.id);
              devFailed++;
            }
          }
          return { sent: devSent, failed: devFailed };
        }));

        for (const r of results) {
          if (r.status === "fulfilled") {
            sentCount += r.value.sent;
            failedCount += r.value.failed;
          }
        }
        await serviceClient.from("campaigns").update({ sent_count: sentCount, delivered_count: sentCount, failed_count: failedCount }).eq("id", campaignId);

      } else {
        // ─── SEQUENTIAL / ROTATION MODE ───
        for (const contact of contacts) {
          // Time guard — if close to timeout, save state and self-continue
          if (Date.now() - startTime > MAX_EXECUTION_MS) {
            needsContinue = true;
            console.log(`Time guard hit at ${Date.now() - startTime}ms, will self-continue`);
            break;
          }

          // Check if paused/canceled
          const { data: freshCampaign } = await serviceClient.from("campaigns").select("status").eq("id", campaignId).single();
          if (freshCampaign && (freshCampaign.status === "paused" || freshCampaign.status === "canceled")) {
            console.log(`Campaign ${campaignId} was ${freshCampaign.status}. Stopping.`);
            break;
          }

          // Rotation logic
          if (useRotation && instanceMsgCount >= messagesPerInstance) {
            currentDeviceIndex = (currentDeviceIndex + 1) % allDevices.length;
            instanceMsgCount = 0;
            console.log(`Rotating to device ${allDevices[currentDeviceIndex].name}`);
          }
          const activeDevice = useRotation ? allDevices[currentDeviceIndex] : device;
          const activeToken = activeDevice.uazapi_token || Deno.env.get("UAZAPI_TOKEN");
          const activeBaseUrl = (activeDevice.uazapi_base_url || Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");

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
            const check = await checkNumberExists(activeBaseUrl, activeToken, normalizedPhone);
            if (!check.exists) {
              await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: check.error || "Não está no WhatsApp" }).eq("id", contact.id);
              failedCount++;
              await serviceClient.from("campaigns").update({ failed_count: failedCount }).eq("id", campaignId);
              continue;
            }

            await sendUazapiMessage(activeBaseUrl, activeToken, normalizedPhone, personalizedMessage, mediaUrl, campaignButtons, msgType);
            await serviceClient.from("campaign_contacts").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", contact.id);
            sentCount++;
            batchSent++;
            instanceMsgCount++;
            msgsSincePause++;
            await serviceClient.from("campaigns").update({ sent_count: sentCount, delivered_count: sentCount }).eq("id", campaignId);

            console.log(`Sent to ${phone} via ${activeDevice.name} (batch ${batchSent}, sincePause ${msgsSincePause}/${pauseAfter})`);

            // Delay between messages
            const delay = randomBetween(minDelayMs, maxDelayMs);
            await new Promise(resolve => setTimeout(resolve, delay));

            // Pause logic — randomize pauseAfter each time
            if (msgsSincePause >= pauseAfter) {
              const pauseDuration = randomBetween(pauseDurMinMs, pauseDurMaxMs);
              console.log(`Pausing for ${Math.round(pauseDuration / 1000)}s after ${msgsSincePause} msgs (next pause after ${pauseAfter} msgs)`);

              // If pause would exceed our time budget, self-continue instead of waiting
              if (Date.now() - startTime + pauseDuration > MAX_EXECUTION_MS) {
                console.log(`Pause too long for this invocation, scheduling self-continue after pause`);
                // Schedule continuation — the pause will happen as a delay before next batch
                needsContinue = true;
                // Store that we need to wait before resuming
                break;
              }

              await new Promise(resolve => setTimeout(resolve, pauseDuration));
              msgsSincePause = 0;
              // Recalculate next pause threshold randomly
              pauseAfter = Math.round(randomBetween(pauseEveryMin, pauseEveryMax));
              console.log(`Next pause after ${pauseAfter} messages`);
            }
          } catch (err: any) {
            console.error(`Failed to send to ${phone} via ${activeDevice.name}:`, err.message);
            await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: err.message || "Erro ao enviar" }).eq("id", contact.id);
            failedCount++;
            await serviceClient.from("campaigns").update({ failed_count: failedCount }).eq("id", campaignId);
          }
        }
      }

      // Check if we need to continue processing
      const { data: finalCampaign } = await serviceClient.from("campaigns").select("status").eq("id", campaignId).single();

      if (finalCampaign && finalCampaign.status === "running") {
        const { count } = await serviceClient.from("campaign_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending");

        if ((count || 0) > 0) {
          // More contacts to process — self-continue
          console.log(`${count} contacts remaining, scheduling self-continue`);
          selfContinue(supabaseUrl, serviceRoleKey, campaignId, deviceId);
        } else {
          // All done
          await serviceClient.from("campaigns").update({
            status: "completed",
            sent_count: sentCount,
            failed_count: failedCount,
            delivered_count: sentCount,
            completed_at: new Date().toISOString(),
          }).eq("id", campaignId);
          console.log(`Campaign ${campaignId} completed! Sent: ${sentCount}, Failed: ${failedCount}`);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        status: finalCampaign?.status || "running",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
