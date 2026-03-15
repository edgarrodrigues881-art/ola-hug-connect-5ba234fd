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

async function oplog(client: any, userId: string, event: string, details: string, deviceId?: string | null, meta?: any) {
  try { await client.from("operation_logs").insert({ user_id: userId, device_id: deviceId || null, event, details, meta: meta || {} }); } catch (_e) { /* ignore */ }
}

// Get real-time stats from campaign_contacts (source of truth)
async function getRealCampaignStats(serviceClient: any, campaignId: string) {
  const { count: sentCount } = await serviceClient.from("campaign_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "sent");
  const { count: failedCount } = await serviceClient.from("campaign_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "failed");
  const { count: pendingCount } = await serviceClient.from("campaign_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending");
  const { count: processingCount } = await serviceClient.from("campaign_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "processing");
  const total = (sentCount || 0) + (failedCount || 0) + (pendingCount || 0) + (processingCount || 0);
  return { sent: sentCount || 0, failed: failedCount || 0, delivered: sentCount || 0, total, pending: (pendingCount || 0) + (processingCount || 0) };
}

// Instant WhatsApp alert for campaign status changes (bypass cron delay)
async function sendCampaignAlertToWa(serviceClient: any, userId: string, campaignName: string, status: string, stats?: { sent?: number; total?: number; delivered?: number; failed?: number }) {
  try {
    const { data: config } = await serviceClient
      .from("report_wa_configs")
      .select("device_id, group_id, toggle_campaigns, connected_phone, connection_status")
      .eq("user_id", userId)
      .single();
    if (!config?.toggle_campaigns || !config?.group_id || !config?.device_id) return;

    const { data: dev } = await serviceClient
      .from("devices")
      .select("uazapi_base_url, uazapi_token")
      .eq("id", config.device_id)
      .single();
    if (!dev?.uazapi_base_url || !dev?.uazapi_token) return;

    const now = new Date();
    const nowBRT = now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    const s = stats || {};
    let msg = "";
    if (status === "paused") {
      msg = `⏸ CAMPANHA PAUSADA\n\nCampanha: ${campaignName}\n\n📊 Progresso:\n✅ Enviadas: ${s.sent || 0}/${s.total || 0}\n\n⏱ Horário: ${nowBRT}\n\nA campanha foi pausada.`;
    } else if (status === "canceled") {
      const pending = Math.max(0, (s.total || 0) - (s.sent || 0) - (s.failed || 0));
      msg = `🚫 CAMPANHA CANCELADA\n\nCampanha: ${campaignName}\n\n📊 Resultado da campanha\n\n👥 Total de contatos: ${s.total || 0}\n✅ Enviadas: ${s.sent || 0}\n❌ Falhas: ${s.failed || 0}\n⏳ Pendentes: ${pending}\n\n⏱ Horário: ${nowBRT}`;
    } else if (status === "completed") {
      msg = `📣 CAMPANHA FINALIZADA\n\nCampanha: ${campaignName}\n\n📊 Resultado da campanha\n\n👥 Total de contatos: ${s.total || 0}\n✅ Enviadas: ${s.sent || 0}\n📬 Entregues: ${s.delivered || 0}\n❌ Falhas: ${s.failed || 0}\n\n⏱ Horário: ${nowBRT}`;
    }
    if (!msg) return;

    const headers: Record<string, string> = { token: dev.uazapi_token, Accept: "application/json", "Content-Type": "application/json" };
    const res = await fetch(`${dev.uazapi_base_url}/chat/send-text`, {
      method: "POST",
      headers,
      body: JSON.stringify({ chatId: config.group_id, text: msg }),
    });
    const resData = await res.json().catch(() => ({}));
    if (res.ok) {
      await serviceClient.from("report_wa_logs").insert({ user_id: userId, level: "INFO", message: `Campanha "${campaignName}" ${status} — alerta instantâneo enviado` });
    }
  } catch (e) {
    console.log(`Failed to send instant campaign alert: ${e.message}`);
  }
}

const API_TIMEOUT_MS = 30_000;

async function uazapiRequest(baseUrl: string, token: string, endpoint: string, payload: any, method: "POST" | "GET" = "POST") {
  let url = `${baseUrl}${endpoint}`;
  const headers: Record<string, string> = { "token": token, "Accept": "application/json" };
  let fetchOptions: RequestInit;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  if (method === "GET") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null) params.append(key, String(value));
    }
    url += `?${params.toString()}`;
    fetchOptions = { method: "GET", headers, signal: controller.signal };
  } else {
    headers["Content-Type"] = "application/json";
    fetchOptions = { method: "POST", headers, body: JSON.stringify(payload), signal: controller.signal };
  }

  let res: Response;
  try {
    res = await fetch(url, fetchOptions);
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr?.name === "AbortError") {
      throw new Error(`Timeout após ${API_TIMEOUT_MS / 1000}s aguardando resposta da API`);
    }
    throw fetchErr;
  }
  clearTimeout(timeoutId);

  const text = await res.text();
  if (res.status === 405 && method === "POST") {
    return uazapiRequest(baseUrl, token, endpoint, payload, "GET");
  }
  if (!res.ok) {
    let errorMsg = `API error ${res.status}`;
    try { const data = JSON.parse(text); errorMsg = data?.message || data?.error || text; } catch (_e) { errorMsg = text; }
    throw new Error(errorMsg);
  }
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

function isTemporaryError(msg: string): boolean {
  const lower = msg.toLowerCase();
  if (isDisconnectError(lower)) return false;
  if (lower.includes("not on whats") || lower.includes("not registered") || lower.includes("not_exists") || lower.includes("número inválido")) return false;
  return lower.includes("timeout") || lower.includes("timed out") || lower.includes("econnreset") ||
    lower.includes("econnrefused") || lower.includes("network") || lower.includes("socket") ||
    lower.includes("fetch failed") || lower.includes("503") || lower.includes("502") ||
    lower.includes("429") || lower.includes("rate limit") || lower.includes("temporarily") ||
    lower.includes("internal server error") || lower.includes("500") ||
    lower.includes("aguardando resposta") || lower.includes("aborterror");
}

function translateErrorMessage(msg: string): string {
  if (isDisconnectError(msg)) return "WhatsApp desconectado";
  if (msg.includes("not on Whats") || msg.includes("not registered") || msg.includes("not_exists") || msg.includes("não está no WhatsApp")) return "Número inválido";
  return msg;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MIN_MS = 20_000;
const RETRY_DELAY_MAX_MS = 60_000;

async function sendWithRetry(
  baseUrl: string, token: string, to: string, body: string,
  mediaUrl?: string | null, buttons?: CampaignButton[], messageType?: string
): Promise<{ success: boolean; attempts: number; error?: string }> {
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      await sendUazapiMessage(baseUrl, token, to, body, mediaUrl, buttons, messageType);
      if (attempt > 1) console.log(`✅ Retry ${attempt - 1} succeeded for ${to}`);
      return { success: true, attempts: attempt };
    } catch (err) {
      lastError = err.message || "Erro";
      if (!isTemporaryError(lastError) || attempt > MAX_RETRIES) {
        return { success: false, attempts: attempt, error: lastError };
      }
      const retryDelay = RETRY_DELAY_MIN_MS + secureRandom() * (RETRY_DELAY_MAX_MS - RETRY_DELAY_MIN_MS);
      console.log(`⚠️ Attempt ${attempt} failed for ${to}: ${lastError} | retrying in ${Math.round(retryDelay / 1000)}s`);
      await new Promise(r => setTimeout(r, retryDelay));
    }
  }
  return { success: false, attempts: MAX_RETRIES + 1, error: lastError };
}

async function checkNumberExists(baseUrl: string, token: string, phone: string): Promise<{ exists: boolean; error?: string }> {
  try {
    const result = await uazapiRequest(baseUrl, token, "/check/exist", { number: phone });
    if (result?.exists === false || result?.numberExists === false || result?.status === "not_exists") {
      return { exists: false, error: "Número inválido" };
    }
    return { exists: true };
  } catch (err) {
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
  do { value = String(Math.floor(secureRandom() * 10000)).padStart(4, "0"); } while (usedSet.has(value) && usedSet.size < 10000);
  usedSet.add(value);
  return value;
}

function generateUniqueRand3(usedSet: Set<string>): string {
  let value: string;
  do { value = Array.from({ length: 3 }, () => String.fromCharCode(97 + Math.floor(secureRandom() * 26))).join(""); } while (usedSet.has(value) && usedSet.size < 17576);
  usedSet.add(value);
  return value;
}

function replaceVariables(template: string, contact: any, rand4: string, rand3: string): string {
  return template
    .replace(/\{\{nome\}\}/gi, contact.name || "")
    .replace(/\{\{numero\}\}/gi, contact.phone || "")
    .replace(/\{\{telefone\}\}/gi, contact.phone || "")
    .replace(/\{\{rand4\}\}/gi, rand4)
    .replace(/\{\{rand3\}\}/gi, rand3)
    .replace(/\{\{var1\}\}/gi, contact.var1 || "")
    .replace(/\{\{var2\}\}/gi, contact.var2 || "")
    .replace(/\{\{var3\}\}/gi, contact.var3 || "")
    .replace(/\{\{var4\}\}/gi, contact.var4 || "")
    .replace(/\{\{var5\}\}/gi, contact.var5 || "")
    .replace(/\{\{var6\}\}/gi, contact.var6 || "")
    .replace(/\{\{var7\}\}/gi, contact.var7 || "")
    .replace(/\{\{var8\}\}/gi, contact.var8 || "")
    .replace(/\{\{var9\}\}/gi, contact.var9 || "")
    .replace(/\{\{var10\}\}/gi, contact.var10 || "");
}

// Crypto-grade random for better distribution
function secureRandom(): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] / (0xFFFFFFFF + 1);
}

function randomBetween(min: number, max: number): number {
  const effectiveMin = Math.min(min, max);
  const effectiveMax = Math.max(min, max);
  // If min==max, add ±20% jitter so delay is never perfectly fixed
  if (effectiveMax - effectiveMin < 1) {
    const jitter = Math.max(effectiveMin * 0.2, 0.5);
    return Math.max(0, (effectiveMin - jitter) + secureRandom() * (jitter * 2));
  }
  return effectiveMin + secureRandom() * (effectiveMax - effectiveMin);
}

// True random picker: picks a random variant each time, avoiding consecutive repeats
class RandomPicker {
  private lastPicked: number = -1;
  private total: number;

  constructor(totalVariants: number) {
    this.total = totalVariants;
  }

  next(): number {
    if (this.total <= 1) return 0;
    let picked: number;
    do {
      picked = Math.floor(secureRandom() * this.total);
    } while (picked === this.lastPicked && this.total > 1);
    this.lastPicked = picked;
    return picked;
  }
}

// Max time we allow per invocation before self-continuing (45s safety margin)
const MAX_EXECUTION_MS = 45_000;

// ─── LOCK HELPERS (parallelized for 30+ devices) ───
async function acquireDeviceLocks(serviceClient: any, deviceIds: string[], campaignId: string, userId: string): Promise<{ acquired: boolean; lockedBy?: string }> {
  // Acquire all locks in parallel for high-concurrency scenarios
  const LOCK_BATCH_SIZE = 10;
  for (let i = 0; i < deviceIds.length; i += LOCK_BATCH_SIZE) {
    const batch = deviceIds.slice(i, i + LOCK_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(deviceId =>
        serviceClient.rpc("acquire_device_lock", {
          _device_id: deviceId,
          _campaign_id: campaignId,
          _user_id: userId,
          _stale_seconds: 180, // extended for large device counts
        })
      )
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === "rejected" || (r.status === "fulfilled" && (r.value.error || r.value.data !== true))) {
        const { data: lock } = await serviceClient
          .from("campaign_device_locks")
          .select("campaign_id")
          .eq("device_id", batch[j])
          .single();
        return { acquired: false, lockedBy: lock?.campaign_id || "unknown" };
      }
    }
  }
  return { acquired: true };
}

async function releaseDeviceLocks(serviceClient: any, deviceIds: string[], campaignId: string) {
  // Release all locks in parallel
  const RELEASE_BATCH = 15;
  for (let i = 0; i < deviceIds.length; i += RELEASE_BATCH) {
    const batch = deviceIds.slice(i, i + RELEASE_BATCH);
    await Promise.allSettled(
      batch.map(deviceId =>
        serviceClient.rpc("release_device_lock", {
          _device_id: deviceId,
          _campaign_id: campaignId,
        })
      )
    );
  }
}

// After releasing locks, auto-start next queued campaign for any of these devices
async function startNextQueuedCampaigns(serviceClient: any, deviceIds: string[], supabaseUrl: string, serviceRoleKey: string) {
  try {
    for (const deviceId of deviceIds) {
      // Find oldest queued campaign that uses this device
      const { data: queued } = await serviceClient
        .from("campaigns")
        .select("id, user_id, device_id, device_ids")
        .eq("status", "queued")
        .order("created_at", { ascending: true });

      if (!queued || queued.length === 0) continue;

      // Find first queued campaign that uses this specific device
      const match = queued.find((c: any) => {
        const ids: string[] = Array.isArray(c.device_ids) && c.device_ids.length > 0
          ? c.device_ids : c.device_id ? [c.device_id] : [];
        return ids.includes(deviceId);
      });

      if (match) {
        console.log(`🚀 Auto-starting queued campaign ${match.id} for device ${deviceId}`);
        await serviceClient.from("campaigns").update({ status: "running", started_at: new Date().toISOString() }).eq("id", match.id).eq("status", "queued");

        // Try to acquire lock
        const lockResult = await acquireDeviceLocks(serviceClient, [deviceId], match.id, match.user_id);
        if (lockResult.acquired) {
          await oplog(serviceClient, match.user_id, "campaign_auto_started", `Campanha auto-iniciada da fila`, null, { campaign_id: match.id });
          // Fire and forget
          selfContinue(supabaseUrl, serviceRoleKey, match.id, deviceId, { batchSent: 0, currentDeviceIndex: 0, instanceMsgCount: 0, msgsSincePause: 0 });
        } else {
          // Another campaign grabbed the lock first, revert to queued
          await serviceClient.from("campaigns").update({ status: "queued" }).eq("id", match.id);
        }
        break; // Only start one at a time per release
      }
    }
  } catch (err) {
    console.error(`Error starting next queued campaign: ${err.message}`);
  }
}

async function heartbeatLock(serviceClient: any, campaignId: string) {
  await serviceClient.rpc("heartbeat_device_lock", { _campaign_id: campaignId });
}

// When disconnect is detected mid-campaign, PAUSE instead of FAIL
// This preserves pending contacts so user can resume after reconnecting
async function handleDisconnectPause(serviceClient: any, campaignId: string, deviceIds: string[], failedCount: number, campaignName?: string, userId?: string) {
  console.log(`⚠️ Disconnect detected for campaign ${campaignId}, pausing to preserve contacts`);
  // Revert any processing contacts back to pending
  await serviceClient.from("campaign_contacts").update({ status: "pending" }).eq("campaign_id", campaignId).eq("status", "processing");
  const realStats = await getRealCampaignStats(serviceClient, campaignId);
  await serviceClient.from("campaigns").update({
    status: "paused",
    sent_count: realStats.sent,
    delivered_count: realStats.delivered,
    failed_count: realStats.failed,
    total_contacts: realStats.total,
    updated_at: new Date().toISOString(),
  }).eq("id", campaignId);
  await releaseDeviceLocks(serviceClient, deviceIds, campaignId);
  // Notification handled by DB trigger + instant WA alert
  if (userId) {
    sendCampaignAlertToWa(serviceClient, userId, campaignName || "", "paused", realStats);
  }
}

interface BatchState {
  batchSent?: number;
  currentDeviceIndex?: number;
  instanceMsgCount?: number;
  msgsSincePause?: number;
  pauseAfter?: number;
  pendingPauseMs?: number;
}

async function selfContinue(supabaseUrl: string, serviceRoleKey: string, campaignId: string, deviceId?: string, batchState?: BatchState) {
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
  } catch (err) {
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

    // ─── PLAN CHECK HELPER ───
    async function checkActivePlan(uid: string): Promise<string | null> {
      const { data: sub } = await serviceClient
        .from("subscriptions")
        .select("expires_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!sub || new Date(sub.expires_at) < new Date()) return "Plano inativo. Ative um plano para continuar.";
      const { data: prof } = await serviceClient.from("profiles").select("status").eq("id", uid).maybeSingle();
      if (prof?.status === "suspended" || prof?.status === "cancelled") return "Conta suspensa. Ative um plano para continuar.";
      return null;
    }

    try {
    // ─── PAUSE ───
    if (action === "pause") {
      const { data: campData } = await serviceClient.from("campaigns").select("name, device_id, device_ids").eq("id", campaignId).single();
      // Get real stats FIRST, then update campaign with correct counters
      const pauseStats = await getRealCampaignStats(serviceClient, campaignId);
      await serviceClient.from("campaigns").update({ 
        status: "paused",
        sent_count: pauseStats.sent,
        delivered_count: pauseStats.delivered,
        failed_count: pauseStats.failed,
        total_contacts: pauseStats.total,
      }).eq("id", campaignId).eq("user_id", userId);
      // Release locks — get device IDs from campaign
      if (campData) {
        const ids: string[] = Array.isArray(campData.device_ids) && campData.device_ids.length > 0
          ? campData.device_ids : campData.device_id ? [campData.device_id] : [];
        await releaseDeviceLocks(serviceClient, ids, campaignId);
        console.log(`Released device locks for paused campaign ${campaignId}`);
      }
      // Instant WA alert
      sendCampaignAlertToWa(serviceClient, userId, campData?.name || "", "paused", pauseStats);
      return new Response(JSON.stringify({ success: true, status: "paused" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── CANCEL ───
    if (action === "cancel") {
      const { data: campDataC } = await serviceClient.from("campaigns").select("name, device_id, device_ids").eq("id", campaignId).single();
      await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: "Campanha cancelada" }).eq("campaign_id", campaignId).eq("status", "pending");
      // Get real stats after marking pending as failed
      const cancelStats = await getRealCampaignStats(serviceClient, campaignId);
      await serviceClient.from("campaigns").update({ 
        status: "canceled", 
        completed_at: new Date().toISOString(),
        sent_count: cancelStats.sent,
        delivered_count: cancelStats.delivered,
        failed_count: cancelStats.failed,
        total_contacts: cancelStats.total,
      }).eq("id", campaignId).eq("user_id", userId);
      // Release locks
      if (campDataC) {
        const ids: string[] = Array.isArray(campDataC.device_ids) && campDataC.device_ids.length > 0
          ? campDataC.device_ids : campDataC.device_id ? [campDataC.device_id] : [];
        await releaseDeviceLocks(serviceClient, ids, campaignId);
        console.log(`Released device locks for canceled campaign ${campaignId}`);
        startNextQueuedCampaigns(serviceClient, ids, supabaseUrl, serviceRoleKey);
      }
      // Instant WA alert
      sendCampaignAlertToWa(serviceClient, userId, campDataC?.name || "", "canceled", cancelStats);
      return new Response(JSON.stringify({ success: true, status: "canceled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── RESUME ───
    if (action === "resume") {
      const planErr = await checkActivePlan(userId);
      if (planErr) return new Response(JSON.stringify({ error: planErr }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await serviceClient.from("campaigns").update({ status: "running" }).eq("id", campaignId).eq("user_id", userId);
      selfContinue(supabaseUrl, serviceRoleKey, campaignId, deviceId, { batchSent: 0, currentDeviceIndex: 0, instanceMsgCount: 0, msgsSincePause: 0 });
      return new Response(JSON.stringify({ success: true, status: "running" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── START ───
    if (action === "start") {
      const planErr = await checkActivePlan(userId);
      if (planErr) return new Response(JSON.stringify({ error: planErr }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: campaign } = await serviceClient.from("campaigns").select("id, user_id, device_id, device_ids, started_at").eq("id", campaignId).single();
      if (!campaign) {
        return new Response(JSON.stringify({ error: "Campanha não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Try to acquire device locks before starting
      const campaignDeviceIds: string[] = Array.isArray(campaign.device_ids) && campaign.device_ids.length > 0
        ? campaign.device_ids
        : deviceId ? [deviceId] : (campaign.device_id ? [campaign.device_id] : []);

      if (campaignDeviceIds.length > 0) {
        const lockResult = await acquireDeviceLocks(serviceClient, campaignDeviceIds, campaignId, campaign.user_id);
        if (!lockResult.acquired) {
          console.log(`Campaign ${campaignId} queued: device locked by campaign ${lockResult.lockedBy}`);
          await serviceClient.from("campaigns").update({ status: "queued", updated_at: new Date().toISOString() }).eq("id", campaignId);
          await oplog(serviceClient, userId, "campaign_queued", `Campanha enfileirada — instância em uso por outra campanha`, null, { campaign_id: campaignId, locked_by: lockResult.lockedBy });
          return new Response(JSON.stringify({
            success: true,
            status: "queued",
            message: "Instância em uso. A campanha iniciará automaticamente quando a instância for liberada.",
            lockedBy: lockResult.lockedBy,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        console.log(`Device locks acquired for campaign ${campaignId}`);
      }

      await serviceClient.from("campaigns").update({ status: "running", started_at: campaign.started_at || new Date().toISOString() }).eq("id", campaignId);
      await oplog(serviceClient, userId, "campaign_started", `Campanha "${campaign.name}" iniciada`, deviceId, { campaign_id: campaignId, total_contacts: campaign.total_contacts });
      selfContinue(supabaseUrl, serviceRoleKey, campaignId, deviceId, { batchSent: 0, currentDeviceIndex: 0, instanceMsgCount: 0, msgsSincePause: 0 });
      return new Response(JSON.stringify({ success: true, status: "running" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── CONTINUE (internal batch processing) ───
    if (action === "continue") {
      // Plan check on continue — pause campaign if plan expired mid-send
      const planErr = await checkActivePlan(userId);
      if (planErr) {
        console.log(`⚠️ Plan inactive for user ${userId}, pausing campaign ${campaignId}`);
        await serviceClient.from("campaigns").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", campaignId);
        const { data: camp } = await serviceClient.from("campaigns").select("device_id, device_ids").eq("id", campaignId).single();
        if (camp) {
          const ids: string[] = Array.isArray(camp.device_ids) && camp.device_ids.length > 0 ? camp.device_ids : camp.device_id ? [camp.device_id] : [];
          await releaseDeviceLocks(serviceClient, ids, campaignId);
        }
        return new Response(JSON.stringify({ error: planErr }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const startTime = Date.now();

      const { data: campaign, error: campErr } = await serviceClient.from("campaigns").select("id, user_id, name, status, message_type, message_content, media_url, buttons, device_id, device_ids, messages_per_instance, min_delay_seconds, max_delay_seconds, pause_every_min, pause_every_max, pause_duration_min, pause_duration_max, sent_count, failed_count, started_at, total_contacts").eq("id", campaignId).single();
      if (campErr || !campaign) {
        return new Response(JSON.stringify({ error: "Campanha não encontrada" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

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
        const devMap = new Map((devs || []).map(d => [d.id, d]));
        allDevices = deviceIds.map(id => devMap.get(id)).filter((d): d is any => !!d && !!d.uazapi_token && !!d.uazapi_base_url);
      }

      if (allDevices.length === 0) {
        console.log(`⚠️ No valid devices found for campaign ${campaignId}, pausing to preserve pending contacts`);
        await serviceClient.from("campaign_contacts").update({ status: "pending" }).eq("campaign_id", campaignId).eq("status", "processing");
        await serviceClient.from("campaigns").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", campaignId);
        await releaseDeviceLocks(serviceClient, deviceIds, campaignId);
        // Notification handled by DB trigger trg_notify_campaign_status
        return new Response(JSON.stringify({ success: true, status: "paused", reason: "no_valid_devices" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── PRE-FLIGHT: Check if ALL devices are connected before processing ──
      const connectedStatuses = ["Ready", "Connected", "authenticated"];
      const disconnectedDevices = allDevices.filter(d => !connectedStatuses.includes(d.status));
      if (disconnectedDevices.length === allDevices.length) {
        console.log(`⚠️ All devices disconnected for campaign ${campaignId}, pausing campaign`);
        await serviceClient.from("campaign_contacts").update({ status: "pending" }).eq("campaign_id", campaignId).eq("status", "processing");
        await serviceClient.from("campaigns").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", campaignId);
        await releaseDeviceLocks(serviceClient, deviceIds, campaignId);
        // Notification handled by DB trigger trg_notify_campaign_status
        return new Response(JSON.stringify({ success: true, status: "paused", reason: "all_devices_disconnected" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Filter to only connected devices
      if (disconnectedDevices.length > 0) {
        console.log(`⚠️ ${disconnectedDevices.length} device(s) disconnected, using ${allDevices.length - disconnectedDevices.length} remaining`);
        allDevices = allDevices.filter(d => connectedStatuses.includes(d.status));
      }

      // Acquire/refresh device locks for this continue invocation
      const lockResult = await acquireDeviceLocks(serviceClient, deviceIds, campaignId, campaign.user_id);
      if (!lockResult.acquired) {
        console.log(`Campaign ${campaignId} lost device lock to campaign ${lockResult.lockedBy}, stopping.`);
        await serviceClient.from("campaigns").update({ status: "paused" }).eq("id", campaignId);
        return new Response(JSON.stringify({ error: "Device lock lost", lockedBy: lockResult.lockedBy }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
      let pendingPauseMs = body.pendingPauseMs || 0;

      const useRotation = messagesPerInstance > 0 && allDevices.length > 1;
      const useParallel = messagesPerInstance === -1 && allDevices.length > 1;

      // Scale batch size by device count (10 per device, min 100, max 500)
      const dynamicBatchSize = Math.min(500, Math.max(100, allDevices.length * 10));
      // Get pending contacts
      const { data: contacts, error: contactsErr } = await serviceClient
        .from("campaign_contacts")
        .select("id, phone, name, status, campaign_id, var1, var2, var3, var4, var5, var6, var7, var8, var9, var10")
        .eq("campaign_id", campaignId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(dynamicBatchSize);

      if (contactsErr) throw contactsErr;

      if (!contacts || contacts.length === 0) {
        const { count: processingCount } = await serviceClient
          .from("campaign_contacts")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaignId)
          .eq("status", "processing");
        
        if (processingCount && processingCount > 0) {
          console.log(`${processingCount} contacts still processing, will retry`);
          selfContinue(supabaseUrl, serviceRoleKey, campaignId, deviceId, { batchSent: 0, currentDeviceIndex: 0, instanceMsgCount: 0, msgsSincePause: 0 });
          return new Response(JSON.stringify({ success: true, status: "running" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Complete — release locks
        await serviceClient.from("campaigns").update({
          status: "completed",
          completed_at: new Date().toISOString(),
        }).eq("id", campaignId);
        await releaseDeviceLocks(serviceClient, deviceIds, campaignId);
        await oplog(serviceClient, campaign.user_id, "campaign_completed", `Campanha "${campaign.name}" concluída (sem pendentes)`, null, { campaign_id: campaignId });
        console.log(`Campaign ${campaignId} completed! Locks released.`);
        const completedStats1 = await getRealCampaignStats(serviceClient, campaignId);
        sendCampaignAlertToWa(serviceClient, campaign.user_id, campaign.name, "completed", completedStats1);
        startNextQueuedCampaigns(serviceClient, deviceIds, supabaseUrl, serviceRoleKey);
        return new Response(JSON.stringify({ success: true, status: "completed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let sentCount = campaign.sent_count || 0;
      let failedCount = campaign.failed_count || 0;
      const messageContent = campaign.message_content || "";
      const sendAllMode = messageContent.includes("|&&|");
      const sequentialMode = messageContent.includes("|>>|");
      const messageVariants = sendAllMode 
        ? messageContent.split("|&&|").filter((m: string) => m.trim())
        : sequentialMode
          ? messageContent.split("|>>|").filter((m: string) => m.trim())
          : messageContent.includes("|||") 
            ? messageContent.split("|||").filter((m: string) => m.trim()) 
            : [messageContent];
      console.log(`Message mode: ${sendAllMode ? 'ALL (|&&|)' : sequentialMode ? 'SEQUENTIAL (|>>|)' : messageContent.includes('|||') ? 'RANDOM (|||)' : 'SINGLE'}, variants: ${messageVariants.length}`);
      const mediaUrl = campaign.media_url || null;
      const campaignButtons: CampaignButton[] = Array.isArray(campaign.buttons) ? campaign.buttons : [];
      const msgType = campaign.message_type || "texto";
      const usedRand4 = new Set<string>();
      const usedRand3 = new Set<string>();
      const randomPicker = new RandomPicker(messageVariants.length);
      let sequentialIndex = 0;
      let needsContinue = false;
      let heartbeatCounter = 0;

      // ─── PARALLEL MODE ───
      if (useParallel) {
        const chunks: any[][] = allDevices.map(() => [] as any[]);
        contacts.forEach((c, i) => chunks[i % allDevices.length].push(c));

        // Process devices in waves of 10 for massive concurrency
        const DEVICE_WAVE_SIZE = 10;
        const allResults: { sent: number; failed: number }[] = [];

        for (let wave = 0; wave < allDevices.length; wave += DEVICE_WAVE_SIZE) {
          const waveDevices = allDevices.slice(wave, wave + DEVICE_WAVE_SIZE);
          const waveChunks = waveDevices.map((_, wi) => chunks[wave + wi] || []);

        const waveResults = await Promise.allSettled(waveDevices.map(async (dev, devIdx) => {
          const chunk = waveChunks[devIdx];
          if (!chunk || chunk.length === 0) return { sent: 0, failed: 0 };
          const devToken = dev.uazapi_token;
          const devBaseUrl = (dev.uazapi_base_url || "").replace(/\/+$/, "");
          let devSent = 0, devFailed = 0;
          let devHeartbeat = 0;
          // Shared cancel flag across device when campaign paused
          let cancelled = false;
          const devUsedRand4 = new Set<string>();
          const devUsedRand3 = new Set<string>();
          const devRandomPicker = new RandomPicker(messageVariants.length);

          for (const contact of chunk) {
            if (cancelled || Date.now() - startTime > MAX_EXECUTION_MS) { needsContinue = true; break; }

            // Optimistic lock: mark as processing
            const { data: locked } = await serviceClient
              .from("campaign_contacts")
              .update({ status: "processing" })
              .eq("id", contact.id)
              .eq("status", "pending")
              .select("id");
            if (!locked || locked.length === 0) continue;

            // Heartbeat every 15 messages (reduced from 5 to lower DB load with 30+ devices)
            devHeartbeat++;
            if (devHeartbeat % 15 === 0) {
              await heartbeatLock(serviceClient, campaignId);
            }

            // Status check every 10 messages (not every message — saves 90% of queries with 30 devices)
            if (devHeartbeat % 10 === 1) {
            const { data: fresh } = await serviceClient.from("campaigns").select("status").eq("id", campaignId).single();
            if (fresh && (fresh.status === "paused" || fresh.status === "canceled")) {
              await serviceClient.from("campaign_contacts").update({ status: "pending" }).eq("id", contact.id).eq("status", "processing");
              cancelled = true;
              break;
            }
            }

            const phone = contact.phone.replace(/\D/g, "");
            if (phone.length < 10) {
              await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: "Número inválido", device_id: dev.id }).eq("id", contact.id);
              devFailed++;
              continue;
            }
            try {
              const pSendStart = Date.now();
              const rand4 = generateUniqueRand4(devUsedRand4);
              const rand3 = generateUniqueRand3(devUsedRand3);
              const chosenMessage = messageVariants[devRandomPicker.next()];
              const msg = replaceVariables(chosenMessage, contact, rand4, rand3);
              const normalized = normalizeBrazilianPhone(phone);
              const check = await checkNumberExists(devBaseUrl, devToken, normalized);
              if (!check.exists) {
                await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: check.error || "Número inválido", device_id: dev.id }).eq("id", contact.id);
                devFailed++;
                if (check.error === "WhatsApp desconectado") {
                  const remainingIds = chunk.slice(chunk.indexOf(contact) + 1).map((c: any) => c.id);
                  if (remainingIds.length > 0) {
                    await serviceClient.from("campaign_contacts").update({ status: "pending" }).eq("campaign_id", campaignId).in("id", remainingIds);
                  }
                  break;
                }
                console.log(`Number ${normalized} invalid, skipping without delay`);
                continue;
              }
              if (sendAllMode && messageVariants.length > 1) {
                let allSendFailed = false;
                for (let mi = 0; mi < messageVariants.length; mi++) {
                  const allMsg = replaceVariables(messageVariants[mi], contact, rand4, rand3);
                  const result = await sendWithRetry(devBaseUrl, devToken, normalized, allMsg, mi === 0 ? mediaUrl : null, mi === 0 ? campaignButtons : [], msgType);
                  if (!result.success) {
                    allSendFailed = true;
                    const translated = translateErrorMessage(result.error || "Erro");
                    console.error(`[P-${devIdx}] Failed ${normalized} after ${result.attempts} attempts: ${translated}`);
                    await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: `${translated} (${result.attempts} tentativas)`, device_id: dev.id }).eq("id", contact.id);
                    devFailed++;
                    if (isDisconnectError(result.error || "")) {
                      const remainingIds = chunk.slice(chunk.indexOf(contact) + 1).map((c: any) => c.id);
                      if (remainingIds.length > 0) {
                        await serviceClient.from("campaign_contacts").update({ status: "pending" }).eq("campaign_id", campaignId).in("id", remainingIds);
                      }
                    }
                    break;
                  }
                  if (mi < messageVariants.length - 1) {
                    await new Promise(r => setTimeout(r, randomBetween(minDelayMs, maxDelayMs)));
                  }
                }
                if (allSendFailed) {
                  if (isDisconnectError("")) break;
                  continue;
                }
              } else {
                const result = await sendWithRetry(devBaseUrl, devToken, normalized, msg, mediaUrl, campaignButtons, msgType);
                if (!result.success) {
                  const translated = translateErrorMessage(result.error || "Erro");
                  console.error(`[P-${devIdx}] Failed ${normalized} after ${result.attempts} attempts: ${translated}`);
                  await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: `${translated} (${result.attempts} tentativas)`, device_id: dev.id }).eq("id", contact.id);
                  devFailed++;
                  if (isDisconnectError(result.error || "")) {
                    const remainingIds = chunk.slice(chunk.indexOf(contact) + 1).map((c: any) => c.id);
                    if (remainingIds.length > 0) {
                      await serviceClient.from("campaign_contacts").update({ status: "pending" }).eq("campaign_id", campaignId).in("id", remainingIds);
                    }
                    break;
                  }
                  continue;
                }
              }
              await serviceClient.from("campaign_contacts").update({ status: "sent", sent_at: new Date().toISOString(), device_id: dev.id }).eq("id", contact.id);
              devSent++;

              const isLastInChunk = chunk.indexOf(contact) === chunk.length - 1;
              if (!isLastInChunk) {
                const pApiElapsed = Date.now() - pSendStart;
                const pTargetDelay = randomBetween(minDelayMs, maxDelayMs);
                const pActualDelay = Math.max(500, pTargetDelay - pApiElapsed);
                console.log(`✅ [P-${devIdx}] Sent to ${normalized} | target=${Math.round(pTargetDelay / 1000)}s api=${Math.round(pApiElapsed / 1000)}s wait=${Math.round(pActualDelay / 1000)}s`);
                await new Promise(r => setTimeout(r, pActualDelay));
              }
            } catch (err) {
              const translated = translateErrorMessage(err.message || "Erro");
              await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: translated, device_id: dev.id }).eq("id", contact.id);
              devFailed++;
              await oplog(serviceClient, campaign.user_id, "uazapi_error", `Erro ao enviar para ${normalized}: ${translated}`, allDevices[devIdx]?.id, { campaign_id: campaignId, phone: normalized });
              if (isDisconnectError(err.message || "")) {
                const remainingIds = chunk.slice(chunk.indexOf(contact) + 1).map((c: any) => c.id);
                if (remainingIds.length > 0) {
                  await serviceClient.from("campaign_contacts").update({ status: "pending" }).eq("campaign_id", campaignId).in("id", remainingIds);
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

        // After parallel mode, check if disconnect occurred — pause campaign
        const { count: stillPending } = await serviceClient.from("campaign_contacts").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId).eq("status", "pending");
        if (stillPending && stillPending > 0) {
          // Check if all devices are disconnected
          const { data: devStatuses } = await serviceClient.from("devices").select("id, status").in("id", deviceIds);
          const allDisconnected = devStatuses?.every(d => !["Ready", "Connected", "authenticated"].includes(d.status));
          if (allDisconnected) {
            await handleDisconnectPause(serviceClient, campaignId, deviceIds, failedCount, campaign.name, campaign.user_id);
          }
        }

      } else {
        // ─── SEQUENTIAL / ROTATION MODE ───

        // Handle deferred pause from previous invocation
        if (pendingPauseMs > 0) {
          console.log(`Applying deferred pause of ${Math.round(pendingPauseMs / 1000)}s from previous invocation`);
          if (pendingPauseMs > MAX_EXECUTION_MS - 5000) {
            const waitNow = MAX_EXECUTION_MS - 10000;
            const remaining = pendingPauseMs - waitNow;
            await new Promise(resolve => setTimeout(resolve, waitNow));
            console.log(`Pause partially done, ${Math.round(remaining / 1000)}s remaining, self-continuing`);
            await heartbeatLock(serviceClient, campaignId);
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
          // Optimistic lock: mark as processing
          const { data: locked } = await serviceClient
            .from("campaign_contacts")
            .update({ status: "processing" })
            .eq("id", contact.id)
            .eq("status", "pending")
            .select("id");
          
          if (!locked || locked.length === 0) continue;

          // Time guard
          if (Date.now() - startTime > MAX_EXECUTION_MS) {
            await serviceClient.from("campaign_contacts").update({ status: "pending" }).eq("id", contact.id).eq("status", "processing");
            needsContinue = true;
            console.log(`Time guard hit at ${Date.now() - startTime}ms, will self-continue`);
            break;
          }

          // Heartbeat every 5 messages to prevent stale lock detection
          heartbeatCounter++;
          if (heartbeatCounter % 5 === 0) {
            await heartbeatLock(serviceClient, campaignId);
          }

          // Check if paused/canceled
          const { data: freshCampaign } = await serviceClient.from("campaigns").select("status").eq("id", campaignId).single();
          if (freshCampaign && (freshCampaign.status === "paused" || freshCampaign.status === "canceled")) {
            console.log(`Campaign ${campaignId} was ${freshCampaign.status}. Stopping.`);
            // Revert processing contact
            await serviceClient.from("campaign_contacts").update({ status: "pending" }).eq("id", contact.id).eq("status", "processing");
            break;
          }

          // Rotation logic
          if (useRotation && instanceMsgCount >= messagesPerInstance) {
            currentDeviceIndex = (currentDeviceIndex + 1) % allDevices.length;
            instanceMsgCount = 0;
            console.log(`Rotating to device ${allDevices[currentDeviceIndex].name}`);
          }
          const activeDevice = useRotation ? allDevices[currentDeviceIndex] : device;
          const activeToken = activeDevice.uazapi_token;
          const activeBaseUrl = (activeDevice.uazapi_base_url || "").replace(/\/+$/, "");

          const phone = contact.phone.replace(/\D/g, "");
          if (phone.length < 10) {
            await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: "Número inválido", device_id: activeDevice.id }).eq("id", contact.id);
            failedCount++;
            await serviceClient.from("campaigns").update({ failed_count: failedCount }).eq("id", campaignId);
            continue;
          }

          try {
            const sendStartTime = Date.now();
            const rand4 = generateUniqueRand4(usedRand4);
            const rand3 = generateUniqueRand3(usedRand3);
            const msgIndex = sequentialMode ? sequentialIndex : randomPicker.next();
            const chosenMessage = messageVariants[msgIndex % messageVariants.length];
            if (sequentialMode) sequentialIndex = (sequentialIndex + 1) % messageVariants.length;
            const personalizedMessage = replaceVariables(chosenMessage, contact, rand4, rand3);
            const normalizedPhone = normalizeBrazilianPhone(phone);

            // Check device status before sending
            const { data: deviceStatus } = await serviceClient.from("devices").select("status").eq("id", activeDevice.id).single();
            if (deviceStatus && !["Ready", "Connected", "authenticated"].includes(deviceStatus.status)) {
              console.log(`⚠️ Device ${activeDevice.name} is ${deviceStatus.status}, pausing campaign`);
              await serviceClient.from("campaign_contacts").update({ status: "pending" }).eq("id", contact.id).eq("status", "processing");
              await serviceClient.from("campaigns").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", campaignId);
              await releaseDeviceLocks(serviceClient, deviceIds, campaignId);
              break;
            }

            const check = await checkNumberExists(activeBaseUrl, activeToken, normalizedPhone);
            if (!check.exists) {
              await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: check.error || "Número inválido", device_id: activeDevice.id }).eq("id", contact.id);
              failedCount++;
              await serviceClient.from("campaigns").update({ failed_count: failedCount }).eq("id", campaignId);
              if (check.error === "WhatsApp desconectado") {
                await handleDisconnectPause(serviceClient, campaignId, deviceIds, failedCount, campaign.name, campaign.user_id);
                break;
              }
              console.log(`Number ${normalizedPhone} invalid, skipping without delay`);
              continue;
            }

            if (sendAllMode && messageVariants.length > 1) {
              console.log(`SEQUENTIAL: Sending ${messageVariants.length} msgs to ${normalizedPhone}`);
              let allSendFailed = false;
              for (let mi = 0; mi < messageVariants.length; mi++) {
                const allMsg = replaceVariables(messageVariants[mi], contact, rand4, rand3);
                const result = await sendWithRetry(activeBaseUrl, activeToken, normalizedPhone, allMsg, mi === 0 ? mediaUrl : null, mi === 0 ? campaignButtons : [], msgType);
                if (!result.success) {
                  allSendFailed = true;
                  const translated = translateErrorMessage(result.error || "Erro ao enviar");
                  console.error(`Failed to send to ${phone} via ${activeDevice.name} after ${result.attempts} attempts:`, translated);
                    await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: `${translated} (${result.attempts} tentativas)`, device_id: activeDevice.id }).eq("id", contact.id);
                  failedCount++;
                  await serviceClient.from("campaigns").update({ failed_count: failedCount }).eq("id", campaignId);
                  if (isDisconnectError(result.error || "")) {
                    await handleDisconnectPause(serviceClient, campaignId, deviceIds, failedCount, campaign.name, campaign.user_id);
                  }
                  break;
                }
                if (mi < messageVariants.length - 1) {
                  const seqDelay = randomBetween(minDelayMs, maxDelayMs);
                  await new Promise(r => setTimeout(r, seqDelay));
                }
              }
              if (allSendFailed) {
                if (isDisconnectError("")) break;
                continue;
              }
            } else {
              const pickedIndex = msgIndex % messageVariants.length;
              console.log(`${sequentialMode ? 'SEQ' : 'RANDOM'}: Picked msg ${pickedIndex + 1}/${messageVariants.length} for ${normalizedPhone}`);
              const result = await sendWithRetry(activeBaseUrl, activeToken, normalizedPhone, personalizedMessage, mediaUrl, campaignButtons, msgType);
              if (!result.success) {
                const translated = translateErrorMessage(result.error || "Erro ao enviar");
                console.error(`Failed to send to ${phone} via ${activeDevice.name} after ${result.attempts} attempts:`, translated);
                await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: `${translated} (${result.attempts} tentativas)`, device_id: activeDevice.id }).eq("id", contact.id);
                failedCount++;
                await serviceClient.from("campaigns").update({ failed_count: failedCount }).eq("id", campaignId);
                if (isDisconnectError(result.error || "")) {
                  await handleDisconnectPause(serviceClient, campaignId, deviceIds, failedCount, campaign.name, campaign.user_id);
                  break;
                }
                continue;
              }
            }
            await serviceClient.from("campaign_contacts").update({ status: "sent", sent_at: new Date().toISOString(), device_id: activeDevice.id }).eq("id", contact.id);
            sentCount++;
            batchSent++;
            instanceMsgCount++;
            msgsSincePause++;
            await serviceClient.from("campaigns").update({ sent_count: sentCount, delivered_count: sentCount }).eq("id", campaignId);

            // Apply random delay AFTER send, subtracting API time so perceived gap matches config
            const isLastContact = contacts.indexOf(contact) === contacts.length - 1;
            if (!isLastContact) {
              const apiElapsed = Date.now() - sendStartTime;
              const targetDelay = randomBetween(minDelayMs, maxDelayMs);
              const actualDelay = Math.max(500, targetDelay - apiElapsed);
              console.log(`✅ Sent to ${phone} via ${activeDevice.name} | batch=${batchSent} sincePause=${msgsSincePause}/${pauseAfter} | target=${Math.round(targetDelay / 1000)}s api=${Math.round(apiElapsed / 1000)}s wait=${Math.round(actualDelay / 1000)}s`);
              await new Promise(resolve => setTimeout(resolve, actualDelay));
            } else {
              console.log(`✅ Sent to ${phone} via ${activeDevice.name} | LAST in batch, no delay`);
            }

            // Pause logic — recalculate pauseAfter each time for true randomness
            if (msgsSincePause >= pauseAfter) {
              const pauseDuration = randomBetween(pauseDurMinMs, pauseDurMaxMs);
              console.log(`Pausing for ${Math.round(pauseDuration / 1000)}s after ${msgsSincePause} msgs`);

              if (Date.now() - startTime + pauseDuration > MAX_EXECUTION_MS) {
                console.log(`Pause too long for this invocation, deferring`);
                needsContinue = true;
                pendingPauseMs = pauseDuration;
                msgsSincePause = 0;
                pauseAfter = Math.round(randomBetween(pauseEveryMin, pauseEveryMax));
                break;
              }

              await new Promise(resolve => setTimeout(resolve, pauseDuration));
              // Heartbeat after long pause
              await heartbeatLock(serviceClient, campaignId);
              msgsSincePause = 0;
              pauseAfter = Math.round(randomBetween(pauseEveryMin, pauseEveryMax));
              console.log(`Pause done. Next pause after ${pauseAfter} messages`);
            }
          } catch (err) {
            const translated = translateErrorMessage(err.message || "Erro ao enviar");
            console.error(`Unexpected error for ${phone} via ${activeDevice.name}:`, translated);
            await serviceClient.from("campaign_contacts").update({ status: "failed", error_message: translated }).eq("id", contact.id);
            failedCount++;
            await serviceClient.from("campaigns").update({ failed_count: failedCount }).eq("id", campaignId);
            if (isDisconnectError(err.message || "")) {
              await handleDisconnectPause(serviceClient, campaignId, deviceIds, failedCount, campaign.name, campaign.user_id);
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
          console.log(`${count} contacts remaining, scheduling self-continue`);
          // Heartbeat before self-continue to keep lock alive
          await heartbeatLock(serviceClient, campaignId);
          selfContinue(supabaseUrl, serviceRoleKey, campaignId, deviceId, { batchSent, currentDeviceIndex, instanceMsgCount, msgsSincePause, pauseAfter, pendingPauseMs });
        } else {
          // All done — release locks
          await serviceClient.from("campaigns").update({
            status: "completed",
            sent_count: sentCount,
            failed_count: failedCount,
            delivered_count: sentCount,
            completed_at: new Date().toISOString(),
          }).eq("id", campaignId);
          await releaseDeviceLocks(serviceClient, deviceIds, campaignId);
          await oplog(serviceClient, campaign.user_id, "campaign_completed", `Campanha "${campaign.name}" concluída`, null, { campaign_id: campaignId, sent: sentCount, failed: failedCount });
          console.log(`Campaign ${campaignId} completed! Sent: ${sentCount}, Failed: ${failedCount}. Locks released.`);
          const completedStats2 = await getRealCampaignStats(serviceClient, campaignId);
          sendCampaignAlertToWa(serviceClient, campaign.user_id, campaign.name, "completed", completedStats2);
          startNextQueuedCampaigns(serviceClient, deviceIds, supabaseUrl, serviceRoleKey);
        }
      } else if (finalCampaign && (finalCampaign.status === "paused" || finalCampaign.status === "canceled" || finalCampaign.status === "failed")) {
        // Release locks on terminal/paused states
        await releaseDeviceLocks(serviceClient, deviceIds, campaignId);
        console.log(`Campaign ${campaignId} is ${finalCampaign.status}, locks released.`);
        startNextQueuedCampaigns(serviceClient, deviceIds, supabaseUrl, serviceRoleKey);
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
      const { data: campaign } = await supabase.from("campaigns").select("id, name, status, message_type, total_contacts, sent_count, delivered_count, failed_count, started_at, completed_at, created_at, updated_at, device_id").eq("id", campaignId).single();
      const { data: contacts } = await supabase.from("campaign_contacts").select("id, phone, name, status, sent_at, error_message").eq("campaign_id", campaignId);
      return new Response(JSON.stringify({ campaign, contacts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const translated = translateErrorMessage(err.message || "Erro interno");
    console.error("Process campaign error:", translated);
    return new Response(JSON.stringify({ error: translated }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
