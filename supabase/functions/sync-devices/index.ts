// sync-devices v5.0 — circuit breaker + 404 strike system for 1000+ instances
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonRes = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function fetchT(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, { ...opts, signal: c.signal }); clearTimeout(t); return r; }
  catch (e) { clearTimeout(t); throw e; }
}

async function runPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) { const i = idx++; try { await fn(items[i]); } catch { /* */ } }
  });
  await Promise.all(workers);
}

function fmtPhone(phone: string): string {
  const r = String(phone).replace(/\D/g, "");
  if (!r) return "";
  if (r.startsWith("55") && r.length === 13) return `+${r.slice(0, 2)} ${r.slice(2, 4)} ${r.slice(4, 9)}-${r.slice(9)}`;
  if (r.startsWith("55") && r.length === 12) return `+${r.slice(0, 2)} ${r.slice(2, 4)} ${r.slice(4, 8)}-${r.slice(8)}`;
  if (r.startsWith("55") && r.length >= 10) return `+${r.slice(0, 2)} ${r.slice(2, 4)} ${r.slice(4, r.length - 4)}-${r.slice(r.length - 4)}`;
  return `+${r}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonRes({ error: "Unauthorized" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return jsonRes({ error: "Unauthorized" }, 401);

    const userId = user.id;
    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ── Fetch all devices with pagination ──
    let devices: any[] = [];
    let from = 0;
    const PAGE = 500;
    while (true) {
      const { data, error } = await svc.from("devices")
        .select("id, name, number, status, uazapi_token, uazapi_base_url, proxy_id, instance_type, login_type, user_id, profile_name, profile_picture, updated_at")
        .eq("user_id", userId)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data?.length) break;
      devices = devices.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const syncable = devices.filter(d => d.uazapi_token && d.uazapi_base_url);
    const skipped = devices.length - syncable.length;

    const deadline = Date.now() + 48_000;

    // ── Collect results per device ──
    interface SyncResult {
      device: any;
      httpStatus: number | null; // null = timeout/network error
      apiData?: any;
    }
    const results: SyncResult[] = [];

    // ── Phase 1: Fetch ALL statuses (no DB writes yet) ──
    await runPool(syncable, 40, async (device) => {
      if (Date.now() > deadline) { results.push({ device, httpStatus: null }); return; }
      const baseUrl = device.uazapi_base_url.replace(/\/+$/, "");
      try {
        const res = await fetchT(`${baseUrl}/instance/status`, {
          method: "GET",
          headers: { token: device.uazapi_token, Accept: "application/json" },
        }, 5000);

        if (res.ok) {
          const data = await res.json();
          results.push({ device, httpStatus: 200, apiData: data });
        } else {
          await res.text(); // drain
          results.push({ device, httpStatus: res.status });
        }
      } catch {
        results.push({ device, httpStatus: null });
      }
    });

    // ── CIRCUIT BREAKER: if ≥40% of syncable devices return 404, it's a provider outage ──
    const total404 = results.filter(r => r.httpStatus === 404).length;
    const totalResponded = results.filter(r => r.httpStatus !== null).length;
    const circuitOpen = totalResponded >= 3 && (total404 / totalResponded) >= 0.4;

    const dbUpdates: { id: string; patch: Record<string, any> }[] = [];
    const opLogs: any[] = [];
    const warmupPauses: string[] = [];
    const warmupResumes: string[] = [];
    let synced = 0;
    let timeouts = 0;
    let errors = 0;

    if (circuitOpen) {
      // Log the provider outage but DON'T disconnect anything
      opLogs.push({
        user_id: userId,
        device_id: syncable[0]?.id || null,
        event: "sync_circuit_breaker",
        details: `Provedor instável: ${total404}/${totalResponded} retornaram 404 — sync ignorado para proteger instâncias`,
        meta: { total_404: total404, total_responded: totalResponded, total_syncable: syncable.length },
      });
      synced = totalResponded;
    }

    // ── Pre-fetch notification config once ──
    let rwConfig: any = null;
    let rwDevice: any = null;
    try {
      const { data } = await svc.from("report_wa_configs")
        .select("device_id, alert_disconnect, group_id, connection_status, toggle_instances, connection_group_id")
        .eq("user_id", userId).not("device_id", "is", null).maybeSingle();
      rwConfig = data;
      if (rwConfig?.device_id) {
        const { data: rd } = await svc.from("devices")
          .select("uazapi_token, uazapi_base_url")
          .eq("id", rwConfig.device_id).single();
        rwDevice = rd;
      }
    } catch { /* */ }

    const alertEnabled = rwConfig?.alert_disconnect || rwConfig?.toggle_instances;
    const targetGroup = (rwConfig?.connection_group_id || "").trim() || rwConfig?.group_id;
    const canNotify = alertEnabled && targetGroup && rwConfig?.connection_status === "connected"
      && rwDevice?.uazapi_token && rwDevice?.uazapi_base_url;

    // ── Phase 2: Process results (only if circuit is closed) ──
    if (!circuitOpen) {
      for (const r of results) {
        const device = r.device;

        // Timeout/network error — preserve status
        if (r.httpStatus === null) {
          timeouts++;
          continue;
        }

        // ── 401: token invalid ──
        if (r.httpStatus === 401) {
          dbUpdates.push({ id: device.id, patch: { status: "Disconnected", uazapi_token: null, uazapi_base_url: null, proxy_id: null } });
          svc.from("user_api_tokens").update({ status: "invalid", device_id: null, assigned_at: null }).eq("device_id", device.id).then(() => {});
          if (device.proxy_id) svc.from("proxies").update({ status: "USADA" }).eq("id", device.proxy_id).then(() => {});
          opLogs.push({ user_id: userId, device_id: device.id, event: "uazapi_error", details: `Token inválido (401) "${device.name}"` });
          synced++;
          continue;
        }

        // ── 404: strike system (5 strikes in 30 min window) ──
        if (r.httpStatus === 404) {
          const { data: recent404s } = await svc.from("operation_logs").select("id")
            .eq("device_id", device.id).eq("event", "sync_404_strike")
            .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());

          const strikes = (recent404s?.length || 0) + 1;
          opLogs.push({ user_id: userId, device_id: device.id, event: "sync_404_strike", details: `"${device.name}" 404 (${strikes}/5)`, meta: { strike: strikes } });

          if (strikes >= 5) {
            // Only after 5 consecutive 404s in 30 min, actually release
            dbUpdates.push({ id: device.id, patch: { status: "Disconnected", uazapi_token: null, uazapi_base_url: null, proxy_id: null } });
            svc.from("user_api_tokens").update({ status: "available", device_id: null, assigned_at: null, healthy: false }).eq("device_id", device.id).then(() => {});
            if (device.proxy_id) svc.from("proxies").update({ status: "USADA" }).eq("id", device.proxy_id).then(() => {});
            warmupPauses.push(device.id);
            opLogs.push({ user_id: userId, device_id: device.id, event: "instance_not_found", details: `"${device.name}" confirmado ausente após 5 strikes — token liberado` });
          }
          // Don't change status on early strikes — keep current status
          synced++;
          continue;
        }

        // ── Other errors ──
        if (!r.apiData) { errors++; synced++; continue; }

        // ── Parse status ──
        const data = r.apiData;
        const inst = data.instance || data || {};
        const state = inst.status || data.state;
        const isConnected = state === "connected" || state === "authenticated";
        const phone = inst.owner || inst.phone || data.phone || "";

        const newStatus = isConnected ? "Ready" : "Disconnected";
        const newPhone = isConnected && phone ? fmtPhone(phone) : (device.number || "");

        // Profile fields: provider can lag right after manual edits.
        // Keep local values for a short grace window to avoid save->unsave loops.
        const providerPicRaw =
          inst.profilePicUrl ?? inst.profilePicture ??
          data.profilePicUrl ?? data.profilePicture ?? "";
        const providerPic = typeof providerPicRaw === "string" ? providerPicRaw.trim() : "";
        const providerNameRaw = (inst.profileName || inst.pushname || "").toString().trim();

        const currentPic = device.profile_picture || null;
        const currentName = (device.profile_name || "").toString();

        const updatedAtMs = device.updated_at ? new Date(device.updated_at).getTime() : 0;
        const recentlyEdited = Number.isFinite(updatedAtMs)
          ? (Date.now() - updatedAtMs) < 15 * 60 * 1000
          : false;

        const isLocalManagedPic = typeof currentPic === "string"
          && (currentPic.includes("/storage/v1/object/public/media/") || currentPic.startsWith("data:image/"));
        const hasProviderPic = Boolean(providerPic);
        const shouldKeepLocalPic = isLocalManagedPic && currentPic !== (providerPic || null);

        const newPic = isConnected
          ? (shouldKeepLocalPic
            ? currentPic
            : (recentlyEdited && currentPic !== (providerPic || null)
              ? currentPic
              : (hasProviderPic ? providerPic : currentPic)))
          : currentPic;

        const newName = isConnected
          ? (recentlyEdited && currentName && currentName !== providerNameRaw
            ? currentName
            : (providerNameRaw || currentName))
          : currentName;

        const statusChanged = newStatus !== device.status;
        const anyChanged = statusChanged
          || newPhone !== (device.number || "")
          || newPic !== (device.profile_picture || null)
          || (newName || "") !== (device.profile_name || "");

        if (anyChanged) {
          dbUpdates.push({ id: device.id, patch: { status: newStatus, number: newPhone, profile_picture: newPic, profile_name: newName } });

          if (statusChanged) {
            opLogs.push({ user_id: userId, device_id: device.id, event: newStatus === "Disconnected" ? "instance_disconnected" : "instance_connected", details: `"${device.name}" → ${newStatus}`, meta: { previous: device.status } });

            if (newStatus === "Disconnected") warmupPauses.push(device.id);
            if (newStatus === "Ready") warmupResumes.push(device.id);

            // Fire-and-forget notification
            if (canNotify && device.login_type !== "report_wa") {
              const rwBase = rwDevice.uazapi_base_url.replace(/\/+$/, "");
              const nowBRT = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
              const chipName = newName || device.name;
              const rPhone = isConnected ? (newPhone || "N/A") : (device.number || "N/A");
              const msg = isConnected
                ? `✅ CONECTADA\n🔹 ${device.name}\n📱 ${chipName}\n📞 ${rPhone}\n🟢 Online ${nowBRT}`
                : `⚠️ DESCONECTADA\n🖥 ${device.name}\n📞 ${rPhone}\n❌ Offline ${nowBRT}`;

              fetch(`${rwBase}/chat/send-text`, {
                method: "POST",
                headers: { token: rwDevice.uazapi_token, "Content-Type": "application/json" },
                body: JSON.stringify({ to: targetGroup, body: msg }),
              }).catch(() => {
                fetch(`${rwBase}/send/text`, {
                  method: "POST",
                  headers: { token: rwDevice.uazapi_token, "Content-Type": "application/json" },
                  body: JSON.stringify({ number: targetGroup, text: msg }),
                }).catch(() => {});
              });
            }

            // Make webhook
            const makeUrl = Deno.env.get("MAKE_WEBHOOK_URL");
            if (makeUrl) {
              fetch(makeUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  event: newStatus === "Ready" ? "instance.connected" : "instance.disconnected",
                  client_id: userId,
                  instance: { id: device.id, name: device.name, status: newStatus === "Ready" ? "conectada" : "desconectada" },
                  timestamp: new Date().toISOString(),
                }),
              }).catch(() => {});
            }
          }
        }
        synced++;
      }
    }

    // ── Flush DB updates ──
    if (dbUpdates.length > 0) {
      await runPool(dbUpdates, 50, async (u) => {
        await svc.from("devices").update(u.patch).eq("id", u.id);
      });
    }

    // ── Flush operation logs ──
    if (opLogs.length > 0) {
      for (let i = 0; i < opLogs.length; i += 100) {
        await svc.from("operation_logs").insert(opLogs.slice(i, i + 100));
      }
    }

    // ── Handle warmup pauses ──
    if (warmupPauses.length > 0) {
      for (const devId of warmupPauses) {
        const { data: cycles } = await svc.from("warmup_cycles").select("id, phase")
          .eq("device_id", devId).eq("is_running", true)
          .neq("phase", "completed").neq("phase", "paused");
        for (const c of (cycles || [])) {
          await svc.from("warmup_cycles").update({
            is_running: false, phase: "paused", previous_phase: c.phase,
            last_error: "Auto-pausado: instância desconectada",
          }).eq("id", c.id);
          svc.from("warmup_jobs").update({ status: "cancelled" }).eq("cycle_id", c.id).eq("status", "pending").then(() => {});
        }
      }
    }

    // ── Handle warmup resumes ──
    if (warmupResumes.length > 0) {
      for (const devId of warmupResumes) {
        const { data: cycles } = await svc.from("warmup_cycles")
          .select("id, first_24h_ends_at, user_id, previous_phase, last_error, daily_interaction_budget_target, daily_interaction_budget_used")
          .eq("device_id", devId).eq("phase", "paused").eq("is_running", false);
        for (const c of (cycles || [])) {
          if (c.last_error !== "Auto-pausado: instância desconectada") continue;
          const now = new Date();
          let phase = c.previous_phase || "groups_only";
          if (now < new Date(c.first_24h_ends_at)) phase = "pre_24h";
          if (["error", "completed", "paused"].includes(phase)) phase = "groups_only";
          await svc.from("warmup_cycles").update({
            is_running: true, phase, previous_phase: null, last_error: null, next_run_at: now.toISOString(),
          }).eq("id", c.id);
        }
      }
    }

    // ── Sync proxy statuses ──
    const [{ data: devProxies }, { data: allProxies }] = await Promise.all([
      supabase.from("devices").select("proxy_id").eq("user_id", userId).not("proxy_id", "is", null),
      supabase.from("proxies").select("id, status").eq("user_id", userId),
    ]);
    const linkedIds = new Set((devProxies || []).map((d: any) => d.proxy_id));
    let proxiesUpdated = 0;
    for (const p of (allProxies || [])) {
      const correct = linkedIds.has(p.id) ? "USANDO" : (p.status === "USANDO" ? "USADA" : p.status);
      if (p.status !== correct) {
        await supabase.from("proxies").update({ status: correct } as any).eq("id", p.id);
        proxiesUpdated++;
      }
    }

    return jsonRes({
      success: true,
      total: devices.length,
      synced,
      skipped,
      timeouts,
      errors,
      proxiesUpdated,
      circuitOpen,
      total404,
    });
  } catch (error: unknown) {
    console.error("Sync error:", error);
    return jsonRes({ error: error instanceof Error ? error.message : "Unknown" }, 500);
  }
});
