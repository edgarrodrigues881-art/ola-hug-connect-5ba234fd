import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth: X-Internal-Secret header ──
  const secret = req.headers.get("x-internal-secret");
  const expectedSecret = Deno.env.get("INTERNAL_TICK_SECRET");
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  let body: any = {};
  try { body = await req.json(); } catch (_e) { /* ignore */ }

  const action = body.action || "tick"; // tick | daily

  try {
    if (action === "daily") {
      return await handleDailyReset(db);
    }

    // ── TICK: process pending jobs ──
    return await handleTick(db);

  } catch (err) {
    console.error("[warmup-tick] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ──
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function backoffMinutes(attempt: number): number {
  return [5, 15, 60, 180, 360][Math.min(attempt, 4)];
}

// ════════════════════════════════════════
// TICK HANDLER
// ════════════════════════════════════════
async function handleTick(db: any) {
  const now = new Date().toISOString();

  const { data: pendingJobs, error: fetchErr } = await db
    .from("warmup_jobs")
    .select("id, user_id, device_id, cycle_id, job_type, payload, run_at, status, attempts, max_attempts")
    .eq("status", "pending")
    .lte("run_at", now)
    .order("run_at", { ascending: true })
    .limit(50);

  if (fetchErr) throw fetchErr;

  if (!pendingJobs || pendingJobs.length === 0) {
    // Get next pending
    const { data: nextPending } = await db
      .from("warmup_jobs")
      .select("run_at")
      .eq("status", "pending")
      .order("run_at", { ascending: true })
      .limit(1);

    console.log("[warmup-tick] No jobs to process");

    return json({
      ok: true,
      processed_jobs_count: 0,
      succeeded: 0,
      failed: 0,
      next_pending_run_at: nextPending?.[0]?.run_at || null,
    });
  }

  // Mark as running
  const jobIds = pendingJobs.map((j: any) => j.id);
  await db.from("warmup_jobs").update({ status: "running" }).in("id", jobIds);

  let succeeded = 0;
  let failed = 0;

  for (const job of pendingJobs) {
    try {
      const { data: cycle } = await db
        .from("warmup_cycles")
        .select("id, user_id, device_id, phase, is_running, day_index, days_total, chip_state, daily_interaction_budget_min, daily_interaction_budget_max, daily_interaction_budget_target, daily_interaction_budget_used, daily_unique_recipients_cap, daily_unique_recipients_used, first_24h_ends_at, last_daily_reset_at, next_run_at, plan_id")
        .eq("id", job.cycle_id)
        .single();

      if (!cycle || !cycle.is_running) {
        await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
        continue;
      }

      // ── PLAN CHECK: skip jobs for users with inactive plans ──
      const { data: userSub } = await db
        .from("subscriptions")
        .select("expires_at")
        .eq("user_id", cycle.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: userProf } = await db.from("profiles").select("status").eq("id", cycle.user_id).maybeSingle();
      const planInactive = !userSub || new Date(userSub.expires_at) < new Date();
      const acctBlocked = userProf?.status === "suspended" || userProf?.status === "cancelled";
      if (planInactive || acctBlocked) {
        console.log(`[warmup-tick] Skipping job ${job.id}: user ${cycle.user_id} plan inactive`);
        await db.from("warmup_cycles").update({
          is_running: false,
          phase: "paused",
          previous_phase: cycle.phase,
          last_error: "Auto-pausado: plano inativo",
        }).eq("id", cycle.id);
        await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
        continue;
      }

      // Check device connection status before processing
      const { data: device } = await db
        .from("devices")
        .select("status")
        .eq("id", job.device_id)
        .single();

      if (!device || device.status !== "Ready") {
        // Device disconnected — auto-pause cycle and skip job
        if (cycle.phase !== "paused") {
          await db.from("warmup_cycles").update({
            is_running: false,
            phase: "paused",
            previous_phase: cycle.phase,
            last_error: "Auto-pausado: instância desconectada",
          }).eq("id", cycle.id);

          // Cancel remaining pending jobs for this cycle
          await db.from("warmup_jobs").update({ status: "cancelled" })
            .eq("cycle_id", cycle.id).eq("status", "pending");

          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "warn", event_type: "auto_paused_disconnected",
            message: `Aquecimento pausado automaticamente: instância desconectada (status: ${device?.status || "unknown"}, fase anterior: ${cycle.phase})`,
          });
        }

        await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
        continue;
      }

      switch (job.job_type) {
        case "join_group": {
          const groupId = job.payload?.group_id;
          await db.from("warmup_instance_groups")
            .update({ join_status: "joined", joined_at: new Date().toISOString() })
            .eq("device_id", job.device_id)
            .eq("group_id", groupId);

          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "group_joined",
            message: `Entrada no grupo: ${job.payload?.group_name || groupId}`,
            meta: job.payload,
          });
          break;
        }

        case "phase_transition": {
          const targetPhase = job.payload?.target_phase || "groups_only";
          await db.from("warmup_cycles").update({ phase: targetPhase }).eq("id", cycle.id);

          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "phase_changed",
            message: `Fase alterada para: ${targetPhase}`,
            meta: { from: cycle.phase, to: targetPhase },
          });

          if (targetPhase === "groups_only") {
            const enableAt = new Date(Date.now() + randInt(90, 150) * 60 * 1000);
            await db.from("warmup_jobs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              job_type: "enable_autosave", payload: {},
              run_at: enableAt.toISOString(), status: "pending",
            });
          }
          break;
        }

        case "enable_autosave": {
          const { count } = await db
            .from("warmup_autosave_contacts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", job.user_id)
            .eq("is_active", true);

          if (count && count > 0) {
            await db.from("warmup_cycles").update({ phase: "autosave_enabled" }).eq("id", cycle.id);
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "info", event_type: "phase_changed",
              message: `Auto Save habilitado (${count} contatos ativos)`,
              meta: { active_contacts: count },
            });
          } else {
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "autosave_missing",
              message: "Auto Save não habilitado: nenhum contato ativo",
            });
            await db.from("warmup_jobs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              job_type: "enable_autosave", payload: {},
              run_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), status: "pending",
            });
          }
          break;
        }

        case "enable_community": {
          if (cycle.phase !== "autosave_enabled") {
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "community_blocked",
              message: "Comunidade bloqueada: fase Auto Save não ativa",
            });
            break;
          }
          const { data: membership } = await db
            .from("warmup_community_membership")
            .select("is_enabled")
            .eq("device_id", job.device_id)
            .single();

          if (membership?.is_enabled) {
            await db.from("warmup_cycles").update({ phase: "community_enabled" }).eq("id", cycle.id);
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "info", event_type: "phase_changed",
              message: "Comunidade habilitada",
            });
          } else {
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "community_not_enabled",
              message: "Comunidade: membership não ativa",
            });
          }
          break;
        }

        case "daily_reset": {
          const newTarget = randInt(cycle.daily_interaction_budget_min, cycle.daily_interaction_budget_max);
          const newDay = Math.min(cycle.day_index + 1, cycle.days_total);

          if (newDay > cycle.days_total) {
            await db.from("warmup_cycles").update({
              is_running: false, phase: "completed",
              daily_interaction_budget_used: 0, daily_unique_recipients_used: 0,
            }).eq("id", cycle.id);
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "info", event_type: "cycle_completed",
              message: `Ciclo concluído após ${cycle.days_total} dias`,
            });
            break;
          }

          await db.from("warmup_cycles").update({
            daily_interaction_budget_used: 0, daily_unique_recipients_used: 0,
            daily_interaction_budget_target: newTarget, day_index: newDay,
            last_daily_reset_at: new Date().toISOString(),
          }).eq("id", cycle.id);

          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "daily_reset",
            message: `Reset diário: dia ${newDay}/${cycle.days_total}, budget: ${newTarget}`,
            meta: { day: newDay, budget_target: newTarget },
          });

          // Schedule next daily_reset
          const nextReset = new Date();
          nextReset.setUTCDate(nextReset.getUTCDate() + 1);
          nextReset.setUTCHours(3, 5, 0, 0);
          await db.from("warmup_jobs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            job_type: "daily_reset", payload: {}, run_at: nextReset.toISOString(), status: "pending",
          });
          break;
        }

        case "health_check": {
          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "health_check", message: "Health check OK",
          });
          break;
        }

        default: {
          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "warn", event_type: "unknown_job_type",
            message: `Tipo desconhecido: ${job.job_type}`,
          });
        }
      }

      await db.from("warmup_jobs").update({
        status: "succeeded", attempts: job.attempts + 1,
      }).eq("id", job.id);
      succeeded++;

    } catch (jobErr) {
      failed++;
      const newAttempts = job.attempts + 1;
      if (newAttempts < job.max_attempts) {
        const retryAt = new Date(Date.now() + backoffMinutes(newAttempts) * 60 * 1000);
        await db.from("warmup_jobs").update({
          status: "pending", attempts: newAttempts,
          last_error: jobErr.message, run_at: retryAt.toISOString(),
        }).eq("id", job.id);
      } else {
        await db.from("warmup_jobs").update({
          status: "failed", attempts: newAttempts, last_error: jobErr.message,
        }).eq("id", job.id);
      }
      await db.from("warmup_audit_logs").insert({
        user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
        level: "error", event_type: "job_failed",
        message: `Job ${job.job_type} falhou: ${jobErr.message}`,
        meta: { job_id: job.id, attempts: newAttempts },
      }).catch(() => {});
    }
  }

  // Get next pending run_at
  const { data: nextPending } = await db
    .from("warmup_jobs")
    .select("run_at")
    .eq("status", "pending")
    .order("run_at", { ascending: true })
    .limit(1);

  console.log(`[warmup-tick] Processed: ${succeeded + failed}, succeeded: ${succeeded}, failed: ${failed}`);

  return json({
    ok: true,
    processed_jobs_count: succeeded + failed,
    succeeded,
    failed,
    next_pending_run_at: nextPending?.[0]?.run_at || null,
  });
}

// ════════════════════════════════════════
// DAILY RESET HANDLER (force daily resets for all active cycles)
// ════════════════════════════════════════
async function handleDailyReset(db: any) {
  const { data: activeCycles } = await db
    .from("warmup_cycles")
    .select("id, user_id, device_id")
    .eq("is_running", true)
    .neq("phase", "completed")
    .neq("phase", "paused");

  if (!activeCycles || activeCycles.length === 0) {
    return json({ ok: true, message: "No active cycles", scheduled: 0 });
  }

  const now = new Date().toISOString();
  const jobs = activeCycles.map((c: any) => ({
    user_id: c.user_id,
    device_id: c.device_id,
    cycle_id: c.id,
    job_type: "daily_reset",
    payload: {},
    run_at: now,
    status: "pending",
  }));

  const { error } = await db.from("warmup_jobs").insert(jobs);
  if (error) throw error;

  console.log(`[warmup-tick] Daily reset scheduled for ${jobs.length} cycles`);

  return json({ ok: true, scheduled: jobs.length });
}

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
      "Content-Type": "application/json",
    },
  });
}
