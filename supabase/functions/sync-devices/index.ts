// sync-devices v4.0 — optimized for 1000+ instances across multiple clients
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonRes = (data: any, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// ── Lightweight fetch with timeout ──
async function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(tid);
    return res;
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

// ── Parallel runner with true concurrency pool ──
async function runPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      try { await fn(items[i]); } catch { /* swallow */ }
    }
  });
  await Promise.all(workers);
}

// ── Format BR phone ──
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
        .select("id, name, number, status, uazapi_token, uazapi_base_url, proxy_id, instance_type, login_type, user_id, profile_name, profile_picture")
        .eq("user_id", userId)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data?.length) break;
      devices = devices.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    // Split: devices WITH tokens (need API call) vs WITHOUT (skip)
    const syncable = devices.filter(d => d.uazapi_token && d.uazapi_base_url);
    const skipped = devices.length - syncable.length;

    // ── Global deadline: 48s (safe margin for 60s limit) ──
    const deadline = Date.now() + 48_000;

    // ── Batch DB updates (collect, then flush once) ──
    const dbUpdates: { id: string; patch: Record<string, any> }[] = [];
    const opLogs: any[] = [];
    const warmupPauses: string[] = [];
    const warmupResumes: string[] = [];
    let synced = 0;
    let timeouts = 0;
    let errors = 0;

    // ── Pre-fetch notification config once (shared across all devices) ──
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
    } catch { /* ignore */ }

    const alertEnabled = rwConfig?.alert_disconnect || rwConfig?.toggle_instances;
    const targetGroup = rwConfig?.connection_group_id || rwConfig?.group_id;
    const canNotify = alertEnabled && targetGroup && rwConfig?.connection_status === "connected"
      && rwDevice?.uazapi_token && rwDevice?.uazapi_base_url;

    // ── Process each device ──
    await runPool(syncable, 40, async (device) => {
      if (Date.now() > deadline) { timeouts++; return; }

      const baseUrl = device.uazapi_base_url.replace(/\/+$/, "");
      let res: Response;
      try {
        res = await fetchWithTimeout(`${baseUrl}/instance/status`, {
          method: "GET",
          headers: { token: device.uazapi_token, Accept: "application/json" },
        }, 5000);
      } catch (e: any) {
        // Network error or timeout — preserve current status
        if (e?.name === "AbortError") timeouts++;
        else errors++;
        return;
      }

      // ── 401: token invalid ──
      if (res.status === 401) {
        await res.text();
        dbUpdates.push({ id: device.id, patch: { status: "Disconnected", uazapi_token: null, uazapi_base_url: null, proxy_id: null } });
        // Release token
        svc.from("user_api_tokens").update({ status: "invalid", device_id: null, assigned_at: null }).eq("device_id", device.id).then(() => {});
        if (device.proxy_id) svc.from("proxies").update({ status: "USADA" }).eq("id", device.proxy_id).then(() => {});
        opLogs.push({ user_id: userId, device_id: device.id, event: "uazapi_error", details: `Token inválido (401) "${device.name}"` });
        synced++;
        return;
      }

      // ── 404: strike system (lightweight) ──
      if (res.status === 404) {
        await res.text();
        // Count recent strikes from opLogs buffer + DB
        const { data: recent404s } = await svc.from("operation_logs").select("id")
          .eq("device_id", device.id).eq("event", "sync_404_strike")
          .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

        const strikes = (recent404s?.length || 0) + 1;
        opLogs.push({ user_id: userId, device_id: device.id, event: "sync_404_strike", details: `"${device.name}" 404 (${strikes}/3)`, meta: { strike: strikes } });

        if (strikes < 3) {
          dbUpdates.push({ id: device.id, patch: { status: "Disconnected" } });
        } else {
          dbUpdates.push({ id: device.id, patch: { status: "Disconnected", uazapi_token: null, uazapi_base_url: null, proxy_id: null } });
          svc.from("user_api_tokens").update({ status: "available", device_id: null, assigned_at: null, healthy: false }).eq("device_id", device.id).then(() => {});
          if (device.proxy_id) svc.from("proxies").update({ status: "USADA" }).eq("id", device.proxy_id).then(() => {});
          warmupPauses.push(device.id);
        }
        synced++;
        return;
      }

      if (!res.ok) { await res.text(); errors++; synced++; return; }

      // ── Parse status ──
      const data = await res.json();
      const inst = data.instance || data || {};
      const state = inst.status || data.state;
      const isConnected = state === "connected" || state === "authenticated";
      const phone = inst.owner || inst.phone || data.phone || "";

      const newStatus = isConnected ? "Ready" : "Disconnected";
      const newPhone = isConnected && phone ? fmtPhone(phone) : (device.number || "");
      const newPic = isConnected ? (inst.profilePicUrl || device.profile_picture || null) : (device.profile_picture || null);
      const newName = isConnected ? (inst.profileName || inst.pushname || device.profile_name || "") : (device.profile_name || "");

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
    });

    // ── Flush all DB updates in parallel batches ──
    if (dbUpdates.length > 0) {
      await runPool(dbUpdates, 50, async (u) => {
        await svc.from("devices").update(u.patch).eq("id", u.id);
      });
    }

    // ── Flush operation logs (single bulk insert) ──
    if (opLogs.length > 0) {
      const batches = [];
      for (let i = 0; i < opLogs.length; i += 100) {
        batches.push(opLogs.slice(i, i + 100));
      }
      await Promise.all(batches.map(b => svc.from("operation_logs").insert(b)));
    }

    // ── Handle warmup pauses (batch) ──
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

    // ── Handle warmup resumes (batch) ──
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
    });
  } catch (error: unknown) {
    console.error("Sync error:", error);
    return jsonRes({ error: error instanceof Error ? error.message : "Unknown" }, 500);
  }
});
