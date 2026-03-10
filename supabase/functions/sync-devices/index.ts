import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function oplog(client: any, userId: string, event: string, details: string, deviceId?: string | null, meta?: any) {
  try { await client.from("operation_logs").insert({ user_id: userId, device_id: deviceId || null, event, details, meta: meta || {} }); } catch (_e) { /* ignore */ }
}

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

    // Removed global UAZAPI fallbacks — each device must use its own token

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: devices, error: devError } = await serviceClient
      .from("devices")
      .select("id, name, number, status, uazapi_token, uazapi_base_url, proxy_id, instance_type, login_type, user_id")
      .eq("user_id", userId);

    if (devError) throw devError;

    const results: any[] = [];

    for (const device of (devices || [])) {
      const deviceToken = device.uazapi_token;
      const deviceBaseUrl = (device.uazapi_base_url || "").replace(/\/+$/, "");

      if (!deviceToken || !deviceBaseUrl) {
        results.push({ id: device.id, name: device.name, found: false, status: device.status, error: "No token configured" });
        continue;
      }

      let newStatus = device.status; // PRESERVE current status by default
      let formattedPhone = device.number || "";
      let profilePicture = device.profile_picture || null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let res: Response;
        try {
          res = await fetch(`${deviceBaseUrl}/instance/status`, {
            method: "GET",
            headers: { "token": deviceToken, "Accept": "application/json" },
            signal: controller.signal,
          });
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          const isTimeout = fetchErr?.name === "AbortError";
          const errorType = isTimeout ? "timeout" : "network_error";
          console.warn(`Device ${device.name}: ${errorType} — preserving current status`);
          
          await oplog(serviceClient, userId, `sync_${errorType}`, 
            `Erro temporário ao sincronizar "${device.name}": ${isTimeout ? "timeout 10s" : fetchErr?.message}`, 
            device.id, { error_type: errorType, will_retry: true });

          results.push({
            id: device.id, name: device.name, found: false,
            status: device.status, error: isTimeout ? "Timeout - will retry next sync" : `Network error: ${fetchErr?.message}`,
          });
          continue;
        }
        clearTimeout(timeoutId);

        // 401: token invalid — mark invalid, release proxy, disconnect
        if (res.status === 401) {
          await res.text(); // consume body
          console.log(`Device ${device.name}: token invalid (401), marking as disconnected and releasing token`);
          
          await serviceClient.from("devices").update({
            status: "Disconnected",
            uazapi_token: null,
            uazapi_base_url: null,
            proxy_id: null,
          }).eq("id", device.id);

          await serviceClient.from("user_api_tokens").update({
            status: "invalid",
            device_id: null,
            assigned_at: null,
          }).eq("device_id", device.id);

          // Release proxy back
          if (device.proxy_id) {
            await serviceClient.from("proxies").update({ status: "USADA" }).eq("id", device.proxy_id);
          }

          await oplog(serviceClient, userId, "uazapi_error", `Token inválido (401) para "${device.name}"`, device.id, { status: 401, proxy_released: !!device.proxy_id });

          results.push({
            id: device.id, name: device.name, found: false,
            status: "Disconnected", error: "Token invalid - released",
          });
          continue;
        }

        // 404: instance gone — release token + proxy, disconnect
        if (res.status === 404) {
          await res.text(); // consume body
          console.log(`Device ${device.name}: instance not found (404), releasing token and proxy`);
          await serviceClient.from("devices").update({
            status: "Disconnected",
            uazapi_token: null,
            uazapi_base_url: null,
            proxy_id: null,
          }).eq("id", device.id);

          await serviceClient.from("user_api_tokens").update({
            status: "available",
            device_id: null,
            assigned_at: null,
            healthy: false,
          }).eq("device_id", device.id);

          if (device.proxy_id) {
            await serviceClient.from("proxies").update({ status: "USADA" }).eq("id", device.proxy_id);
          }

          // Cancel active warmup cycles for this device
          const { data: activeCycles404 } = await serviceClient
            .from("warmup_cycles")
            .select("id, phase")
            .eq("device_id", device.id)
            .eq("is_running", true)
            .neq("phase", "completed");

          for (const cycle of (activeCycles404 || [])) {
            await serviceClient.from("warmup_cycles").update({
              is_running: false, phase: "paused", previous_phase: cycle.phase,
              last_error: "Auto-pausado: instância inexistente (404)",
            }).eq("id", cycle.id);
            await serviceClient.from("warmup_jobs").update({ status: "cancelled" })
              .eq("cycle_id", cycle.id).eq("status", "pending");
          }

          await oplog(serviceClient, userId, "instance_not_found",
            `Instância "${device.name}" não encontrada (404) — token e proxy liberados`,
            device.id, { status: 404, proxy_released: !!device.proxy_id, warmup_paused: (activeCycles404 || []).length });

          results.push({
            id: device.id, name: device.name, found: false,
            status: "Disconnected", error: "Instance not found - token & proxy released",
          });
          continue;
        }

        // Other non-OK statuses
        if (!res.ok) {
          const body = await res.text();
          console.warn(`Device ${device.name}: unexpected status ${res.status} — ${body.substring(0, 200)}`);
          results.push({
            id: device.id, name: device.name, found: false,
            status: device.status, error: `API error ${res.status}`,
          });
          continue;
        }

        const data = await res.json();
        console.log(`Device ${device.name} status:`, res.status, JSON.stringify(data).substring(0, 300));

        const inst = data.instance || data || {};
        const state = inst.status || data.state;
        const isConnected = state === "connected" || state === "authenticated";
        const phone = inst.owner || inst.phone || data.phone || "";

        // Only use phone from provider if instance is CONNECTED
        // When disconnected, the provider may return stale data from a previous session
        if (isConnected && phone) {
          const raw = String(phone).replace(/\D/g, "");
          if (raw.startsWith("55") && raw.length === 13) {
            formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 9)}-${raw.slice(9)}`;
          } else if (raw.startsWith("55") && raw.length === 12) {
            formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, 8)}-${raw.slice(8)}`;
          } else if (raw.startsWith("55") && raw.length >= 10) {
            formattedPhone = `+${raw.slice(0, 2)} ${raw.slice(2, 4)} ${raw.slice(4, raw.length - 4)}-${raw.slice(raw.length - 4)}`;
          } else if (raw) {
            formattedPhone = `+${raw}`;
          }
        } else if (!isConnected) {
          // Keep existing phone & picture for continuity (warmup history)
          formattedPhone = device.number || "";
        }

        // Keep existing profile data when disconnected for warmup continuity
        profilePicture = isConnected ? (inst.profilePicUrl || device.profile_picture || null) : (device.profile_picture || null);
        const syncedProfileName = isConnected ? (inst.profileName || inst.pushname || "") : (device.profile_name || "");
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
            const eventName = newStatus === "Disconnected" ? "instance_disconnected" : "instance_connected";
            await oplog(serviceClient, userId, eventName, `"${device.name}" → ${newStatus}`, device.id, { previous: device.status, phone: formattedPhone });

            // ── INSTANT WhatsApp group notification ──
            if (device.login_type !== "report_wa") {
              try {
                console.log(`[sync-devices] 🔔 Status changed for "${device.name}": ${device.status} → ${newStatus}, checking notification config...`);
                const { data: rwConfig, error: rwErr } = await serviceClient
                  .from("report_wa_configs")
                  .select("device_id, alert_disconnect, group_id, connection_status, toggle_instances")
                  .eq("user_id", userId)
                  .not("device_id", "is", null)
                  .maybeSingle();

                console.log(`[sync-devices] 🔔 rwConfig: ${JSON.stringify({ found: !!rwConfig, alert_disconnect: rwConfig?.alert_disconnect, toggle_instances: rwConfig?.toggle_instances, group_id: rwConfig?.group_id?.substring(0, 20), connection_status: rwConfig?.connection_status, error: rwErr?.message })}`);

                // Accept either alert_disconnect OR toggle_instances as the trigger
                const alertEnabled = rwConfig?.alert_disconnect || rwConfig?.toggle_instances;
                if (alertEnabled && rwConfig?.group_id && rwConfig?.connection_status === "connected") {
                  const { data: rwDevice } = await serviceClient
                    .from("devices")
                    .select("uazapi_token, uazapi_base_url")
                    .eq("id", rwConfig.device_id)
                    .single();

                  console.log(`[sync-devices] 🔔 rwDevice credentials: has_token=${!!rwDevice?.uazapi_token}, has_url=${!!rwDevice?.uazapi_base_url}`);

                  if (rwDevice?.uazapi_token && rwDevice?.uazapi_base_url) {
                    const rwBase = rwDevice.uazapi_base_url.replace(/\/+$/, "");
                    const nowBRT = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
                    const isConn = newStatus === "Ready";
                    const syncedName = device.profile_name || "";
                    const displayName = syncedName ? `${syncedName} (${device.name})` : device.name;
                    // For disconnect, use the PREVIOUS number from DB since provider won't return it
                    const reportPhone = isConn ? (formattedPhone || device.number || "N/A") : (device.number || formattedPhone || "N/A");
                    const msg = isConn
                      ? `✅ INSTÂNCIA CONECTADA\n\n📱 ${displayName}\n📞 Número: ${reportPhone}\n\n🟢 Status: Conectado\n\n⏱ Horário:\n${nowBRT}\n\nA instância está online e operacional.`
                      : `⚠️ ALERTA DE CONEXÃO\n\n📱 ${displayName}\n📞 Número: ${reportPhone}\n\n❌ Status: Desconectado\n\n⏱ Horário da ocorrência:\n${nowBRT}\n\nA instância perdeu conexão com o WhatsApp.\n\nPara continuar utilizando o sistema,\né necessário realizar a reconexão.`;

                    const sendEndpoints = [
                      { path: "/chat/send-text", body: { to: rwConfig.group_id, body: msg } },
                      { path: "/send/text", body: { number: rwConfig.group_id, text: msg } },
                    ];
                    let sent = false;
                    for (const ep of sendEndpoints) {
                      try {
                        const r = await fetch(`${rwBase}${ep.path}`, {
                          method: "POST",
                          headers: { token: rwDevice.uazapi_token, "Content-Type": "application/json", Accept: "application/json" },
                          body: JSON.stringify(ep.body),
                        });
                        const respText = await r.text();
                        console.log(`[sync-devices] 🔔 Send via ${ep.path}: status=${r.status} response=${respText.substring(0, 200)}`);
                        if (r.ok) {
                          sent = true;
                          console.log(`[sync-devices] ✅ Instant notification sent via ${ep.path} for "${device.name}" → ${newStatus}`);
                          break;
                        }
                      } catch (sendErr) {
                        console.log(`[sync-devices] 🔔 Send error via ${ep.path}: ${sendErr}`);
                      }
                    }
                    if (sent) {
                      await serviceClient.from("report_wa_logs").insert({
                        user_id: userId,
                        level: isConn ? "INFO" : "WARN",
                        message: `Instância "${device.name}" ${isConn ? "conectada" : "desconectada"} — alerta instantâneo enviado`,
                      });
                    } else {
                      console.log(`[sync-devices] ❌ All send attempts failed for "${device.name}"`);
                      await serviceClient.from("report_wa_logs").insert({
                        user_id: userId, level: "ERROR",
                        message: `Falha ao enviar alerta instantâneo para "${device.name}" (${newStatus})`,
                      });
                    }
                  }
                } else {
                  console.log(`[sync-devices] 🔔 Notification skipped: alertEnabled=${alertEnabled}, group_id=${!!rwConfig?.group_id}, conn_status=${rwConfig?.connection_status}`);
                }
              } catch (e) { console.log("[sync-devices] instant notification error:", e); }
            }

            // ── Auto-pause warmup when device disconnects ──
            if (newStatus === "Disconnected") {
              const { data: activeCycles } = await serviceClient
                .from("warmup_cycles")
                .select("id, phase")
                .eq("device_id", device.id)
                .eq("is_running", true)
                .neq("phase", "completed")
                .neq("phase", "paused");

              for (const cycle of (activeCycles || [])) {
                await serviceClient.from("warmup_cycles").update({
                  is_running: false,
                  phase: "paused",
                  previous_phase: cycle.phase,
                  last_error: "Auto-pausado: instância desconectada",
                }).eq("id", cycle.id);

                await serviceClient.from("warmup_jobs").update({ status: "cancelled" })
                  .eq("cycle_id", cycle.id).eq("status", "pending");

                await serviceClient.from("warmup_audit_logs").insert({
                  user_id: userId, device_id: device.id, cycle_id: cycle.id,
                  level: "warn", event_type: "auto_paused_disconnected",
                  message: `Aquecimento pausado automaticamente: instância desconectada (fase anterior: ${cycle.phase})`,
                });
                console.log(`Auto-paused warmup cycle ${cycle.id} for device ${device.name}`);
              }
            }

            // ── Auto-resume warmup when device reconnects ──
            if (newStatus === "Ready") {
              const { data: pausedCycles } = await serviceClient
                .from("warmup_cycles")
                .select("id, first_24h_ends_at, day_index, days_total, user_id, previous_phase, last_error, daily_interaction_budget_target, daily_interaction_budget_used")
                .eq("device_id", device.id)
                .eq("phase", "paused")
                .eq("is_running", false);

              for (const cycle of (pausedCycles || [])) {
                // Only auto-resume if it was auto-paused (not manually paused)
                if (cycle.last_error !== "Auto-pausado: instância desconectada") continue;

                const nowDate = new Date();
                const first24hEnds = new Date(cycle.first_24h_ends_at);

                // Restore the phase the cycle was in before auto-pause
                let resumePhase = cycle.previous_phase || "groups_only";
                if (nowDate < first24hEnds) resumePhase = "pre_24h";
                // Don't restore "error" or "completed" phases
                if (["error", "completed", "paused"].includes(resumePhase)) resumePhase = "groups_only";

                await serviceClient.from("warmup_cycles").update({
                  is_running: true,
                  phase: resumePhase,
                  previous_phase: null,
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

                // If resuming in autosave/community phase, re-schedule interaction jobs
                if (["autosave_enabled", "community_enabled"].includes(resumePhase)) {
                  const remaining = (cycle.daily_interaction_budget_target || 25) - (cycle.daily_interaction_budget_used || 0);
                  if (remaining > 0) {
                    const windowStart = Math.max(nowDate.getTime(), new Date(nowDate).setUTCHours(11, 0, 0, 0));
                    const windowEnd = new Date(nowDate).setUTCHours(24, 0, 0, 0);
                    if (windowStart < windowEnd) {
                      const interactionCount = Math.min(remaining, 15);
                      const windowMs = windowEnd - windowStart;
                      const jobs: any[] = [];
                      for (let i = 0; i < interactionCount; i++) {
                        const baseOffset = (windowMs / interactionCount) * i;
                        const jitter = Math.floor(Math.random() * (windowMs / interactionCount * 0.4));
                        jobs.push({
                          user_id: cycle.user_id, device_id: device.id, cycle_id: cycle.id,
                          job_type: "autosave_interaction", payload: {},
                          run_at: new Date(windowStart + baseOffset + jitter).toISOString(), status: "pending",
                        });
                      }
                      if (jobs.length > 0) await serviceClient.from("warmup_jobs").insert(jobs);
                    }
                  }
                }

                await serviceClient.from("warmup_audit_logs").insert({
                  user_id: userId, device_id: device.id, cycle_id: cycle.id,
                  level: "info", event_type: "auto_resumed_connected",
                  message: `Aquecimento retomado automaticamente: instância reconectada (fase: ${resumePhase})`,
                });
                console.log(`Auto-resumed warmup cycle ${cycle.id} for device ${device.name}, phase: ${resumePhase}`);
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
