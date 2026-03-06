import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const GLOBAL_UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
    const GLOBAL_UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: devices, error: devError } = await serviceClient
      .from("devices")
      .select("*")
      .eq("user_id", userId);

    if (devError) throw devError;

    const results: any[] = [];

    for (const device of (devices || [])) {
      const deviceToken = device.uazapi_token || GLOBAL_UAZAPI_TOKEN;
      const deviceBaseUrl = (device.uazapi_base_url || GLOBAL_UAZAPI_BASE_URL || "").replace(/\/+$/, "");

      if (!deviceToken || !deviceBaseUrl) {
        results.push({ id: device.id, name: device.name, found: false, status: device.status, error: "No token configured" });
        continue;
      }

      let newStatus = device.status; // PRESERVE current status by default
      let formattedPhone = device.number || "";
      let profilePicture = device.profile_picture || null;

      try {
        const res = await fetch(`${deviceBaseUrl}/instance/status`, {
          method: "GET",
          headers: { "token": deviceToken, "Accept": "application/json" },
        });

        // If token is invalid (401), instance likely doesn't exist anymore on UAZAPI
        if (res.status === 401) {
          console.log(`Device ${device.name}: token invalid (401), marking as disconnected and releasing token`);
          
          // Mark device as disconnected
          await serviceClient.from("devices").update({
            status: "Disconnected",
            uazapi_token: null,
            uazapi_base_url: null,
          }).eq("id", device.id);

          // Release token back to pool
          await serviceClient.from("user_api_tokens").update({
            status: "invalid",
            device_id: null,
            assigned_at: null,
          }).eq("device_id", device.id);

          results.push({
            id: device.id,
            name: device.name,
            found: false,
            status: "Disconnected",
            error: "Token invalid - released",
          });
          continue;
        }

        // If 404 or instance not found, also release
        if (res.status === 404) {
          console.log(`Device ${device.name}: instance not found (404), releasing token`);
          await serviceClient.from("devices").update({
            status: "Disconnected",
            uazapi_token: null,
            uazapi_base_url: null,
          }).eq("id", device.id);

          await serviceClient.from("user_api_tokens").update({
            status: "available",
            device_id: null,
            assigned_at: null,
          }).eq("device_id", device.id);

          results.push({
            id: device.id,
            name: device.name,
            found: false,
            status: "Disconnected",
            error: "Instance not found - token released",
          });
          continue;
        }

        const data = await res.json();
        console.log(`Device ${device.name} status:`, res.status, JSON.stringify(data).substring(0, 300));

        const inst = data.instance || data || {};
        const state = inst.status || data.state;
        const isConnected = state === "connected" || state === "authenticated";
        const phone = inst.owner || inst.phone || data.phone || "";

        if (phone) {
          const raw = String(phone).replace(/\D/g, "");
          if (raw.startsWith("55") && raw.length >= 12) {
            formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
          } else if (raw) {
            formattedPhone = `+${raw}`;
          }
        }

        profilePicture = inst.profilePicUrl || device.profile_picture || null;
        const syncedProfileName = inst.profileName || inst.pushname || "";
        newStatus = isConnected ? "Ready" : "Disconnected";

        const statusChanged = newStatus !== device.status;
        const phoneChanged = formattedPhone !== (device.number || "");
        const picChanged = profilePicture !== (device.profile_picture || null);
        const nameChanged = (syncedProfileName || "") !== (device.profile_name || "");

        if (statusChanged || phoneChanged || picChanged || nameChanged) {
          await serviceClient
            .from("devices")
            .update({
              status: newStatus,
              number: formattedPhone,
              profile_picture: profilePicture,
              profile_name: syncedProfileName || device.profile_name || "",
            })
            .eq("id", device.id);

          if (statusChanged) {
            // ── Auto-pause warmup when device disconnects ──
            if (newStatus === "Disconnected") {
              const { data: activeCycles } = await serviceClient
                .from("warmup_cycles")
                .select("id")
                .eq("device_id", device.id)
                .eq("is_running", true)
                .neq("phase", "completed")
                .neq("phase", "paused");

              for (const cycle of (activeCycles || [])) {
                await serviceClient.from("warmup_cycles").update({
                  is_running: false,
                  phase: "paused",
                  last_error: "Auto-pausado: instância desconectada",
                }).eq("id", cycle.id);

                await serviceClient.from("warmup_jobs").update({ status: "cancelled" })
                  .eq("cycle_id", cycle.id).eq("status", "pending");

                await serviceClient.from("warmup_audit_logs").insert({
                  user_id: userId, device_id: device.id, cycle_id: cycle.id,
                  level: "warn", event_type: "auto_paused_disconnected",
                  message: "Aquecimento pausado automaticamente: instância desconectada",
                });
                console.log(`Auto-paused warmup cycle ${cycle.id} for device ${device.name}`);
              }
            }

            // ── Auto-resume warmup when device reconnects ──
            if (newStatus === "Ready") {
              const { data: pausedCycles } = await serviceClient
                .from("warmup_cycles")
                .select("id, first_24h_ends_at, day_index, days_total, user_id")
                .eq("device_id", device.id)
                .eq("phase", "paused")
                .eq("is_running", false);

              for (const cycle of (pausedCycles || [])) {
                // Only auto-resume if it was auto-paused (has the specific error message)
                const nowDate = new Date();
                const first24hEnds = new Date(cycle.first_24h_ends_at);
                const resumePhase = nowDate < first24hEnds ? "pre_24h" : "groups_only";

                await serviceClient.from("warmup_cycles").update({
                  is_running: true,
                  phase: resumePhase,
                  last_error: null,
                  next_run_at: nowDate.toISOString(),
                }).eq("id", cycle.id);

                // Re-schedule daily_reset
                const tomorrow = new Date(nowDate);
                tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
                tomorrow.setUTCHours(3, 5, 0, 0);
                await serviceClient.from("warmup_jobs").insert({
                  user_id: cycle.user_id, device_id: device.id, cycle_id: cycle.id,
                  job_type: "daily_reset", payload: {}, run_at: tomorrow.toISOString(), status: "pending",
                });

                await serviceClient.from("warmup_audit_logs").insert({
                  user_id: userId, device_id: device.id, cycle_id: cycle.id,
                  level: "info", event_type: "auto_resumed_connected",
                  message: `Aquecimento retomado automaticamente: instância reconectada (fase: ${resumePhase})`,
                });
                console.log(`Auto-resumed warmup cycle ${cycle.id} for device ${device.name}`);
              }
            }

            const makeUrl = Deno.env.get("MAKE_WEBHOOK_URL");
            if (makeUrl) {
              try {
                const event = newStatus === "Ready" ? "instance.connected" : "instance.disconnected";
                await fetch(makeUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event,
                    client_id: userId,
                    instance: {
                      id: device.id,
                      name: device.name,
                      type: device.instance_type || "principal",
                      status: newStatus === "Ready" ? "conectada" : "desconectada",
                    },
                    timestamp: new Date().toISOString(),
                  }),
                });
              } catch (e) { console.log("Make webhook error:", e); }
            }
          }
        }
      } catch (err) {
        console.error(`Error syncing device ${device.name}:`, err);
        // On network error, DON'T change status - preserve current state
      }

      results.push({
        id: device.id,
        name: device.name,
        found: true,
        status: newStatus,
        phone: formattedPhone,
      });
    }

    // Sync proxy statuses
    const { data: allDevicesAfter } = await supabase.from("devices").select("proxy_id").eq("user_id", userId);
    const { data: allProxies } = await supabase.from("proxies").select("id, status").eq("user_id", userId);
    const linkedProxyIds = new Set((allDevicesAfter || []).filter((d: any) => d.proxy_id).map((d: any) => d.proxy_id));

    let proxiesUpdated = 0;
    for (const proxy of (allProxies || [])) {
      const isLinked = linkedProxyIds.has(proxy.id);
      let correctStatus: string;
      if (isLinked) correctStatus = "USANDO";
      else if (proxy.status === "USANDO") correctStatus = "USADA";
      else correctStatus = proxy.status;

      if (proxy.status !== correctStatus) {
        await supabase.from("proxies").update({ status: correctStatus } as any).eq("id", proxy.id);
        proxiesUpdated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, devices: results, proxiesUpdated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Sync error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
