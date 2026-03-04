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
  // Also check for error in successful response body
  const parsed = JSON.parse(text);
  if (parsed?.error && typeof parsed.error === "string") {
    throw new Error(parsed.error);
  }
  return parsed;
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

function isDisconnectError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("disconnected") || lower.includes("not connected") || lower.includes("qr code") ||
    lower.includes("logout") || lower.includes("unauthorized") || lower.includes("401") ||
    lower.includes("session") || lower.includes("not authenticated") || lower.includes("desconectado");
}

function translateErrorMessage(msg: string): string {
  if (isDisconnectError(msg)) return "WhatsApp desconectado";
  if (msg.includes("not on Whats") || msg.includes("not registered") || msg.includes("not_exists") || msg.includes("não está no WhatsApp")) return "Número inválido";
  return msg;
}

async function checkNumberExists(baseUrl: string, token: string, phone: string): Promise<{ exists: boolean; error?: string }> {
  try {
    const result = await uazapiRequest(baseUrl, token, "/check/exist", { number: phone });
    if (result?.exists === false || result?.numberExists === false || result?.status === "not_exists") {
      return { exists: false, error: "Número inválido" };
    }
    return { exists: true };
  } catch (err: any) {
    const msg = err.message || "";
    if (isDisconnectError(msg)) {
      return { exists: false, error: "WhatsApp desconectado" };
    }
    if (msg.includes("not on Whats") || msg.includes("not registered") || msg.includes("not_exists")) {
      return { exists: false, error: "Número inválido" };
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

async function selfContinue(supabaseUrl: string, serviceRoleKey: string, campaignId: string, deviceId?: string, batchState?: { batchSent?: number; currentDeviceIndex?: number; instanceMsgCount?: number; msgsSincePause?: number; pauseAfter?: number; pendingPauseMs?: number }) {
  console.log(`Self-continuing campaign ${campaignId}...`, batchState ? JSON.stringify(batchState) : '');
  try {
    await fetch(`${supabaseUrl}/functions/v1/process-campaign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ action: "continue", campaignId, deviceId, ...batchState }),
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
      selfContinue(supabaseUrl, serviceRoleKey, campaignId, deviceId, { batchSent: 0, currentDeviceIndex: 0, instanceMsgCount: 0, msgsSincePause: 0 });
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
      selfContinue(supabaseUrl, serviceRoleKey, campaignId, deviceId, { batchSent: 0, currentDeviceIndex: 0, instanceMsgCount: 0, msgsSincePause: 0 });
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
        // Keep only devices that have credentials, but preserve the order of deviceIds
        const devMap = new Map((devs || []).map(d => [d.id, d]));
        allDevices = deviceIds.map(id => devMap.get(id)).filter((d): d is any => !!d && !!d.uazapi_token && !!d.uazapi_base_url);
      }

      if (allDevices.length === 0) {
        console.error(`No valid devices found for campaign ${campaignId}. Selected device IDs: ${deviceIds.join(', ')}`);
        await serviceClient.from("campaigns").update({ status: "failed", completed_at: new Date().toISOString() }).eq("id", campaignId);
        return new Response(JSON.stringify({ error: "Nenhum dispositivo válido encontrado. Verifique se o dispositivo selecionado está conectado e configurado." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const device = allDevices[0];
      console.log(`Campaign ${campaignId} using device: ${device.name} (${device.id})${allDevices.length > 1 ? `, total devices: ${allDevices.length}` : ''}`);

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
      let pauseAfter = body.pauseAfter || Math.round(randomBetween(pauseEveryMin, pauseEveryMax));
      let msgsSincePause = body.msgsSincePause || 0;
      let pendingPauseMs = body.pendingPauseMs || 0; // Deferred pause from previous invocation

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
      const sendAllMode = messageContent.includes("|&&|");
      const messageVariants = sendAllMode 
        ? messageContent.split("|&&|").filter((m: string) => m.trim())
        : messageContent.includes("|||") 
          ? messageContent.split("|||").filter((m: string) => m.trim()) 
          : [messageContent];
      console.log(`Message mode: ${sendAllMode ? 'SEQUENTIAL (|&&|)' : messageContent.includes('|||') ? 'RANDOM (|||)' : 'SINGLE'}, variants: ${messageVariants.length}, content preview: ${messageContent.substring(0, 100)}`);
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
              const msgStart = Date.now();
              const rand4 = generateUniqueRand4(devUsedRand4);
              const rand3 = generateUniqueRand3(devUsedRand3);
              const chosenMessage = messageVariants[Math.floor(Math.random() * messageVariants.length)];
              const msg = replaceVariables(chosenMessage, contact, rand4, rand3);
              const normalized = normalizeBrazilianPhone(phone);
              const check = await checkNumberExists(devBaseUrl, devToken, normalized);
              if (!check.exists) {
                await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: check.error || "Número inválido" }).eq("id", contact.id);
                devFailed++;
                if (check.error === "WhatsApp desconectado") {
                  const remainingIds = chunk.slice(chunk.indexOf(contact) + 1).map((c: any) => c.id);
                  if (remainingIds.length > 0) {
                    await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: "WhatsApp desconectado" }).eq("campaign_id", campaignId).in("id", remainingIds);
                    devFailed += remainingIds.length;
                  }
                  break;
                }
                console.log(`Number ${normalized} invalid, skipping without delay`);
                continue;
              }
              if (sendAllMode && messageVariants.length > 1) {
                // Send all messages sequentially to same contact
                for (let mi = 0; mi < messageVariants.length; mi++) {
                  const allMsg = replaceVariables(messageVariants[mi], contact, rand4, rand3);
                  await sendUazapiMessage(devBaseUrl, devToken, normalized, allMsg, mi === 0 ? mediaUrl : null, mi === 0 ? campaignButtons : [], msgType);
                  if (mi < messageVariants.length - 1) {
                    await new Promise(r => setTimeout(r, randomBetween(minDelayMs, maxDelayMs)));
                  }
                }
              } else {
                await sendUazapiMessage(devBaseUrl, devToken, normalized, msg, mediaUrl, campaignButtons, msgType);
              }
              await serviceClient.from("campaign_contacts").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", contact.id);
              devSent++;

              // Skip delay if last contact in chunk
              const isLastInChunk = chunk.indexOf(contact) === chunk.length - 1;
              if (!isLastInChunk) {
                const apiTime = Date.now() - msgStart;
                const targetDelay = randomBetween(minDelayMs, maxDelayMs);
                const actualDelay = Math.max(targetDelay - apiTime, 500);
                await new Promise(r => setTimeout(r, actualDelay));
              }
            } catch (err: any) {
              const translated = translateErrorMessage(err.message || "Erro");
              await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: translated }).eq("id", contact.id);
              devFailed++;
              // If disconnect, bulk-fail all remaining in chunk
              if (isDisconnectError(err.message || "")) {
                const remainingIds = chunk.slice(chunk.indexOf(contact) + 1).map((c: any) => c.id);
                if (remainingIds.length > 0) {
                  await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: "WhatsApp desconectado" }).eq("campaign_id", campaignId).in("id", remainingIds);
                  devFailed += remainingIds.length;
                }
                break;
              }
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

        // Handle deferred pause from previous invocation
        if (pendingPauseMs > 0) {
          console.log(`Applying deferred pause of ${Math.round(pendingPauseMs / 1000)}s from previous invocation`);
          if (pendingPauseMs > MAX_EXECUTION_MS - 5000) {
            // Pause is too long even for a fresh invocation, split it
            const waitNow = MAX_EXECUTION_MS - 10000;
            const remaining = pendingPauseMs - waitNow;
            await new Promise(resolve => setTimeout(resolve, waitNow));
            console.log(`Pause partially done, ${Math.round(remaining / 1000)}s remaining, self-continuing`);
            selfContinue(supabaseUrl, serviceRoleKey, campaignId, deviceId, { batchSent, currentDeviceIndex, instanceMsgCount, msgsSincePause: 0, pauseAfter, pendingPauseMs: remaining });
            return new Response(JSON.stringify({ success: true, status: "running", waitingPause: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          await new Promise(resolve => setTimeout(resolve, pendingPauseMs));
          pendingPauseMs = 0;
          msgsSincePause = 0;
          pauseAfter = Math.round(randomBetween(pauseEveryMin, pauseEveryMax));
          console.log(`Deferred pause completed. Next pause after ${pauseAfter} messages`);
        }

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
            const msgStartTime = Date.now(); // Track time spent on API calls

            const rand4 = generateUniqueRand4(usedRand4);
            const rand3 = generateUniqueRand3(usedRand3);
            const chosenMessage = messageVariants[Math.floor(Math.random() * messageVariants.length)];
            const personalizedMessage = replaceVariables(chosenMessage, contact, rand4, rand3);
            const normalizedPhone = normalizeBrazilianPhone(phone);

            // Check device status before sending
            const { data: deviceStatus } = await serviceClient.from("devices").select("status").eq("id", activeDevice.id).single();
            if (deviceStatus && !["Ready", "Connected", "authenticated"].includes(deviceStatus.status)) {
              console.log(`Device ${activeDevice.name} is ${deviceStatus.status}, bulk-failing remaining contacts`);
              await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: "WhatsApp desconectado" }).eq("campaign_id", campaignId).eq("status", "pending");
              const { count: remainingCount } = await serviceClient.from("campaign_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending");
              failedCount += (remainingCount || 0);
              await serviceClient.from("campaigns").update({ failed_count: failedCount, status: "failed", completed_at: new Date().toISOString() }).eq("id", campaignId);
              break;
            }

            const check = await checkNumberExists(activeBaseUrl, activeToken, normalizedPhone);
            if (!check.exists) {
              await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: check.error || "Número inválido" }).eq("id", contact.id);
              failedCount++;
              await serviceClient.from("campaigns").update({ failed_count: failedCount }).eq("id", campaignId);
              if (check.error === "WhatsApp desconectado") {
                await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: "WhatsApp desconectado" }).eq("campaign_id", campaignId).eq("status", "pending");
                const { count: remCount } = await serviceClient.from("campaign_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending");
                failedCount += (remCount || 0);
                await serviceClient.from("campaigns").update({ failed_count: failedCount, status: "failed", completed_at: new Date().toISOString() }).eq("id", campaignId);
                break;
              }
              console.log(`Number ${normalizedPhone} invalid, skipping without delay`);
              continue;
            }

            if (sendAllMode && messageVariants.length > 1) {
              // Send all messages sequentially to same contact
              console.log(`SEQUENTIAL: Sending ${messageVariants.length} msgs to ${normalizedPhone} in order 1→${messageVariants.length}`);
              for (let mi = 0; mi < messageVariants.length; mi++) {
                const allMsg = replaceVariables(messageVariants[mi], contact, rand4, rand3);
                console.log(`  → Msg ${mi + 1}/${messageVariants.length}: "${allMsg.substring(0, 50)}..."`);
                await sendUazapiMessage(activeBaseUrl, activeToken, normalizedPhone, allMsg, mi === 0 ? mediaUrl : null, mi === 0 ? campaignButtons : [], msgType);
                if (mi < messageVariants.length - 1) {
                  const seqDelay = randomBetween(minDelayMs, maxDelayMs);
                  console.log(`  ⏱ Delay between msgs: ${Math.round(seqDelay / 1000)}s`);
                  await new Promise(r => setTimeout(r, seqDelay));
                }
              }
            } else {
              const pickedIndex = messageVariants.indexOf(chosenMessage);
              console.log(`RANDOM: Picked msg ${pickedIndex + 1}/${messageVariants.length} for ${normalizedPhone}: "${personalizedMessage.substring(0, 50)}..."`);
              await sendUazapiMessage(activeBaseUrl, activeToken, normalizedPhone, personalizedMessage, mediaUrl, campaignButtons, msgType);
            }
            await serviceClient.from("campaign_contacts").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", contact.id);
            sentCount++;
            batchSent++;
            instanceMsgCount++;
            msgsSincePause++;
            await serviceClient.from("campaigns").update({ sent_count: sentCount, delivered_count: sentCount }).eq("id", campaignId);

            // Calculate delay: subtract API call time from configured delay
            // Skip delay if this is the last contact in the batch
            const isLastContact = contacts.indexOf(contact) === contacts.length - 1;
            const apiElapsedMs = Date.now() - msgStartTime;
            if (!isLastContact) {
              const targetDelay = randomBetween(minDelayMs, maxDelayMs);
              const actualDelay = Math.max(targetDelay - apiElapsedMs, 500);
              console.log(`Sent to ${phone} via ${activeDevice.name} (batch ${batchSent}, sincePause ${msgsSincePause}/${pauseAfter}, apiTime ${Math.round(apiElapsedMs / 1000)}s, delay ${Math.round(actualDelay / 1000)}s)`);
              await new Promise(resolve => setTimeout(resolve, actualDelay));
            } else {
              console.log(`Sent to ${phone} via ${activeDevice.name} (LAST in batch, no delay)`);
            }

            // Pause logic — check if we reached the pause threshold
            if (msgsSincePause >= pauseAfter) {
              const pauseDuration = randomBetween(pauseDurMinMs, pauseDurMaxMs);
              console.log(`Pausing for ${Math.round(pauseDuration / 1000)}s after ${msgsSincePause} msgs`);

              // If pause would exceed our time budget, defer to next invocation
              if (Date.now() - startTime + pauseDuration > MAX_EXECUTION_MS) {
                console.log(`Pause too long for this invocation, deferring ${Math.round(pauseDuration / 1000)}s pause to next invocation`);
                needsContinue = true;
                pendingPauseMs = pauseDuration;
                msgsSincePause = 0;
                break;
              }

              await new Promise(resolve => setTimeout(resolve, pauseDuration));
              msgsSincePause = 0;
              pauseAfter = Math.round(randomBetween(pauseEveryMin, pauseEveryMax));
              console.log(`Pause done. Next pause after ${pauseAfter} messages`);
            }
          } catch (err: any) {
            const translated = translateErrorMessage(err.message || "Erro ao enviar");
            console.error(`Failed to send to ${phone} via ${activeDevice.name}:`, translated);
            await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: translated }).eq("id", contact.id);
            failedCount++;
            await serviceClient.from("campaigns").update({ failed_count: failedCount }).eq("id", campaignId);
            if (isDisconnectError(err.message || "")) {
              const { data: remaining } = await serviceClient.from("campaign_contacts").select("id").eq("campaign_id", campaignId).eq("status", "pending");
              if (remaining && remaining.length > 0) {
                await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: "WhatsApp desconectado" }).eq("campaign_id", campaignId).eq("status", "pending");
                failedCount += remaining.length;
                await serviceClient.from("campaigns").update({ failed_count: failedCount, status: "failed", completed_at: new Date().toISOString() }).eq("id", campaignId);
              }
              break;
            }
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
          selfContinue(supabaseUrl, serviceRoleKey, campaignId, deviceId, { batchSent, currentDeviceIndex, instanceMsgCount, msgsSincePause, pauseAfter, pendingPauseMs });
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
    const translated = translateErrorMessage(err.message || "Erro interno");
    console.error("Process campaign error:", translated);
    return new Response(JSON.stringify({ error: translated }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
