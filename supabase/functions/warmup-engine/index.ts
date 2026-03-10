import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Helpers ──
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── Phase rules per day ──
// Day 1: pre_24h (wait 5-8h, join groups, light interaction)
// Day 2: groups_only (200-500 msgs in groups, 07:00-19:00)
// Day 3-4: autosave_enabled (groups + autosave 5 numbers × 3 msgs = 15/day)
// Day 5-6: community_light (groups + autosave + 3-5 community pairs × 15-30 msgs)
// Day 7-30: community_enabled (groups + autosave + 5-10 community pairs × 15-30 msgs)
function getPhaseForDay(day: number): string {
  if (day <= 1) return "pre_24h";
  if (day <= 2) return "groups_only";
  if (day <= 4) return "autosave_enabled";
  if (day <= 6) return "community_light";
  return "community_enabled";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  // ── Auth: support both JWT (frontend) and cron secret ──
  const cronSecret = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization");
  let callerUserId: string | null = null;

  if (cronSecret === Deno.env.get("WEBHOOK_SECRET")) {
    // Cron caller – process all users
  } else if (authHeader?.startsWith("Bearer ")) {
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    callerUserId = claimsData.claims.sub as string;
  } else {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch (_e) { /* ignore */ }

  const action = body.action || "tick";

  try {
    // ── PLAN CHECK for user-initiated actions ──
    if (callerUserId && ["start", "resume"].includes(action)) {
      const { data: activeSub } = await db
        .from("subscriptions")
        .select("expires_at")
        .eq("user_id", callerUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: userProfile } = await db.from("profiles").select("status").eq("id", callerUserId).maybeSingle();
      const planExpired = !activeSub || new Date(activeSub.expires_at) < new Date();
      const accountBlocked = userProfile?.status === "suspended" || userProfile?.status === "cancelled";
      if (planExpired || accountBlocked) {
        return new Response(JSON.stringify({ error: "Seu plano está inativo. Ative um plano para continuar.", code: "NO_ACTIVE_PLAN" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ════════════════════════════════════════
    // ACTION: start — 30-day CHIP_NOVO warmup
    // ════════════════════════════════════════
    if (action === "start") {
      if (!callerUserId) throw new Error("start requires authenticated user");
      const { device_id, chip_state, days_total, plan_id } = body;
      if (!device_id) throw new Error("device_id required");

      const now = new Date();
      // Day 1: wait 5-8 hours before any activity
      const waitHours = randInt(5, 8);
      const firstActivityAt = new Date(now.getTime() + waitHours * 60 * 60 * 1000);
      const first24hEnds = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Budget for day 1 is minimal (pre_24h)
      const budgetTarget = randInt(5, 10); // Very light on day 1

      // Create cycle — 30 days default
      const cycleDays = days_total || 30;
      const { data: cycle, error: cycleErr } = await db
        .from("warmup_cycles")
        .insert({
          user_id: callerUserId,
          device_id,
          chip_state: chip_state || "new",
          days_total: cycleDays,
          plan_id: plan_id || null,
          phase: "pre_24h",
          is_running: true,
          started_at: now.toISOString(),
          first_24h_ends_at: first24hEnds.toISOString(),
          daily_interaction_budget_target: budgetTarget,
          daily_interaction_budget_min: 5,
          daily_interaction_budget_max: 10,
        })
        .select("id, user_id, device_id, phase, is_running, day_index, days_total, started_at, first_24h_ends_at, daily_interaction_budget_target, created_at")
        .single();
      if (cycleErr) throw cycleErr;

      // Get ALL 8 groups from pool
      const { data: poolGroups } = await db
        .from("warmup_groups_pool")
        .select("id, name")
        .eq("is_active", true);

      const allGroups = shuffleArray(poolGroups || []);
      const jobs: any[] = [];

      // Schedule join_group jobs: distributed after the wait period across remaining hours of day 1
      // First join starts after 5-8h wait
      // Remaining joins distributed over the next hours (not all at once)
      const remainingWindowMs = 24 * 60 * 60 * 1000 - waitHours * 60 * 60 * 1000;
      const joinSpacingMs = remainingWindowMs / (allGroups.length + 1);

      for (let i = 0; i < allGroups.length; i++) {
        // Add random jitter to spacing
        const baseOffset = waitHours * 60 * 60 * 1000 + joinSpacingMs * (i + 1);
        const jitter = randInt(-15, 15) * 60 * 1000; // ±15 min jitter
        const offsetMs = Math.max(
          waitHours * 60 * 60 * 1000 + 10 * 60 * 1000, // at least waitHours + 10min
          Math.min(baseOffset + jitter, 23.5 * 60 * 60 * 1000) // max 23.5h
        );

        const runAt = new Date(now.getTime() + offsetMs);
        jobs.push({
          user_id: callerUserId,
          device_id,
          cycle_id: cycle.id,
          job_type: "join_group",
          payload: { group_id: allGroups[i].id, group_name: allGroups[i].name },
          run_at: runAt.toISOString(),
          status: "pending",
        });

        // Create instance_groups record
        await db.from("warmup_instance_groups").insert({
          user_id: callerUserId,
          device_id,
          group_id: allGroups[i].id,
          cycle_id: cycle.id,
          join_status: "pending",
        });
      }

      // Schedule phase_transition to groups_only at 24h mark
      jobs.push({
        user_id: callerUserId,
        device_id,
        cycle_id: cycle.id,
        job_type: "phase_transition",
        payload: { target_phase: "groups_only" },
        run_at: first24hEnds.toISOString(),
        status: "pending",
      });

      // Schedule first daily_reset for tomorrow at 00:05 BRT (03:05 UTC)
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(3, 5, 0, 0);
      jobs.push({
        user_id: callerUserId,
        device_id,
        cycle_id: cycle.id,
        job_type: "daily_reset",
        payload: {},
        run_at: tomorrow.toISOString(),
        status: "pending",
      });

      if (jobs.length > 0) {
        const { error: jobErr } = await db.from("warmup_jobs").insert(jobs);
        if (jobErr) throw jobErr;
      }

      // Audit log
      await db.from("warmup_audit_logs").insert({
        user_id: callerUserId,
        device_id,
        cycle_id: cycle.id,
        level: "info",
        event_type: "cycle_started",
        message: `Ciclo CHIP_NOVO iniciado: ${cycleDays} dias, aguardando ${waitHours}h antes da 1ª atividade, ${allGroups.length} grupos selecionados`,
        meta: { groups: allGroups.map(g => g.name), wait_hours: waitHours, budget_target: budgetTarget },
      });

      return new Response(JSON.stringify({ ok: true, cycle_id: cycle.id, jobs_scheduled: jobs.length, wait_hours: waitHours }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════
    // ACTION: pause
    // ════════════════════════════════════════
    if (action === "pause") {
      if (!callerUserId) throw new Error("pause requires authenticated user");
      const { device_id } = body;

      const { data: cycle } = await db
        .from("warmup_cycles")
        .select("id, phase")
        .eq("device_id", device_id)
        .eq("user_id", callerUserId)
        .eq("is_running", true)
        .neq("phase", "completed")
        .single();

      if (!cycle) throw new Error("No active cycle found");

      await db.from("warmup_cycles").update({ is_running: false, phase: "paused", previous_phase: cycle.phase }).eq("id", cycle.id);
      await db.from("warmup_jobs").update({ status: "cancelled" }).eq("cycle_id", cycle.id).eq("status", "pending");

      await db.from("warmup_audit_logs").insert({
        user_id: callerUserId, device_id, cycle_id: cycle.id,
        level: "info", event_type: "cycle_paused", message: "Aquecimento pausado pelo usuário",
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════
    // ACTION: resume
    // ════════════════════════════════════════
    if (action === "resume") {
      if (!callerUserId) throw new Error("resume requires authenticated user");
      const { device_id } = body;

      const { data: cycle } = await db
        .from("warmup_cycles")
        .select("id, user_id, device_id, phase, is_running, day_index, days_total, chip_state, daily_interaction_budget_target, daily_interaction_budget_used, daily_unique_recipients_used, first_24h_ends_at, started_at, previous_phase")
        .eq("device_id", device_id)
        .eq("user_id", callerUserId)
        .eq("phase", "paused")
        .single();

      if (!cycle) throw new Error("No paused cycle found");

      // Determine correct phase based on day_index
      const now = new Date();
      const first24hEnds = new Date(cycle.first_24h_ends_at);
      let resumePhase: string;

      if (now < first24hEnds) {
        resumePhase = "pre_24h";
      } else if (cycle.previous_phase && !["error", "completed", "paused"].includes(cycle.previous_phase)) {
        resumePhase = cycle.previous_phase;
      } else {
        resumePhase = getPhaseForDay(cycle.day_index);
      }

      // Check device is online
      const { data: deviceCheck } = await db.from("devices").select("status").eq("id", device_id).single();
      if (!deviceCheck || deviceCheck.status !== "Ready") {
        throw new Error("Instância offline. Conecte o dispositivo antes de retomar o aquecimento.");
      }

      await db.from("warmup_cycles").update({
        is_running: true,
        phase: resumePhase,
        previous_phase: null,
        last_error: null,
        next_run_at: now.toISOString(),
      }).eq("id", cycle.id);

      // Re-schedule daily_reset
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(3, 5, 0, 0);
      await db.from("warmup_jobs").insert({
        user_id: callerUserId, device_id, cycle_id: cycle.id,
        job_type: "daily_reset", payload: {}, run_at: tomorrow.toISOString(), status: "pending",
      });

      // Schedule today's remaining jobs based on current phase
      await scheduleDayJobs(db, cycle.id, callerUserId, device_id, cycle.day_index, resumePhase, true);

      await db.from("warmup_audit_logs").insert({
        user_id: callerUserId, device_id, cycle_id: cycle.id,
        level: "info", event_type: "cycle_resumed", message: `Aquecimento retomado na fase: ${resumePhase} (dia ${cycle.day_index})`,
      });

      return new Response(JSON.stringify({ ok: true, phase: resumePhase }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════
    // ACTION: stop
    // ════════════════════════════════════════
    if (action === "stop") {
      if (!callerUserId) throw new Error("stop requires authenticated user");
      const { device_id } = body;

      const { data: cycle } = await db
        .from("warmup_cycles")
        .select("id")
        .eq("device_id", device_id)
        .eq("user_id", callerUserId)
        .neq("phase", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!cycle) throw new Error("No active cycle found");

      await db.from("warmup_cycles").update({ is_running: false, phase: "completed" }).eq("id", cycle.id);
      await db.from("warmup_jobs").update({ status: "cancelled" }).eq("cycle_id", cycle.id).eq("status", "pending");

      await db.from("warmup_audit_logs").insert({
        user_id: callerUserId, device_id, cycle_id: cycle.id,
        level: "info", event_type: "cycle_completed", message: "Ciclo encerrado manualmente pelo usuário",
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Use warmup-tick endpoint for tick processing" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Warmup engine error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ════════════════════════════════════════
// Schedule jobs for a specific day/phase
// ════════════════════════════════════════
async function scheduleDayJobs(
  db: any,
  cycleId: string,
  userId: string,
  deviceId: string,
  dayIndex: number,
  phase: string,
  isResume: boolean = false
) {
  const now = new Date();
  const jobs: any[] = [];

  // Activity window: 07:00-19:00 BRT = 10:00-22:00 UTC
  const today = new Date(now);
  const windowStartUTC = new Date(today);
  windowStartUTC.setUTCHours(10, 0, 0, 0); // 07:00 BRT
  const windowEndUTC = new Date(today);
  windowEndUTC.setUTCHours(22, 0, 0, 0); // 19:00 BRT

  // If resuming mid-day, start from now
  const effectiveStart = isResume ? Math.max(now.getTime(), windowStartUTC.getTime()) : windowStartUTC.getTime();
  const effectiveEnd = windowEndUTC.getTime();

  if (effectiveStart >= effectiveEnd) return; // Past activity window

  const windowMs = effectiveEnd - effectiveStart;

  // ── GROUP INTERACTIONS (Day 2+) ──
  if (["groups_only", "autosave_enabled", "community_light", "community_enabled"].includes(phase)) {
    const groupMsgCount = randInt(200, 500);
    // Distribute group messages across the window
    const groupSpacingMs = windowMs / groupMsgCount;

    for (let i = 0; i < groupMsgCount; i++) {
      const baseOffset = groupSpacingMs * i;
      const jitter = randInt(0, Math.floor(groupSpacingMs * 0.6));
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      // Clamp to window
      if (runAt.getTime() > effectiveEnd) break;

      jobs.push({
        user_id: userId,
        device_id: deviceId,
        cycle_id: cycleId,
        job_type: "group_interaction",
        payload: {},
        run_at: runAt.toISOString(),
        status: "pending",
      });
    }
  }

  // ── AUTOSAVE INTERACTIONS (Day 3+) ──
  if (["autosave_enabled", "community_light", "community_enabled"].includes(phase)) {
    // 5 numbers × 3 messages = 15 messages/day
    const autosaveCount = 15;
    const asSpacingMs = windowMs / autosaveCount;

    for (let i = 0; i < autosaveCount; i++) {
      const baseOffset = asSpacingMs * i;
      const jitter = randInt(0, Math.floor(asSpacingMs * 0.4));
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd) break;

      jobs.push({
        user_id: userId,
        device_id: deviceId,
        cycle_id: cycleId,
        job_type: "autosave_interaction",
        payload: { recipient_index: Math.floor(i / 3), msg_index: i % 3 },
        run_at: runAt.toISOString(),
        status: "pending",
      });
    }
  }

  // ── COMMUNITY INTERACTIONS (Day 5+) ──
  if (phase === "community_light") {
    // 3-5 numbers, 15-30 msgs each
    const communityPairs = randInt(3, 5);
    const msgsPerPair = randInt(15, 30);
    const totalCommunityMsgs = communityPairs * msgsPerPair;
    const cmSpacingMs = windowMs / totalCommunityMsgs;

    for (let i = 0; i < totalCommunityMsgs; i++) {
      const pairIndex = Math.floor(i / msgsPerPair);
      const baseOffset = cmSpacingMs * i;
      const jitter = randInt(0, Math.floor(cmSpacingMs * 0.3));
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd) break;

      jobs.push({
        user_id: userId,
        device_id: deviceId,
        cycle_id: cycleId,
        job_type: "community_interaction",
        payload: { pair_index: pairIndex, pairs_total: communityPairs, msgs_per_pair: msgsPerPair },
        run_at: runAt.toISOString(),
        status: "pending",
      });
    }
  }

  if (phase === "community_enabled") {
    // 5-10 numbers, 15-30 msgs each
    const communityPairs = randInt(5, 10);
    const msgsPerPair = randInt(15, 30);
    const totalCommunityMsgs = communityPairs * msgsPerPair;
    const cmSpacingMs = windowMs / totalCommunityMsgs;

    for (let i = 0; i < totalCommunityMsgs; i++) {
      const pairIndex = Math.floor(i / msgsPerPair);
      const baseOffset = cmSpacingMs * i;
      const jitter = randInt(0, Math.floor(cmSpacingMs * 0.3));
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd) break;

      jobs.push({
        user_id: userId,
        device_id: deviceId,
        cycle_id: cycleId,
        job_type: "community_interaction",
        payload: { pair_index: pairIndex, pairs_total: communityPairs, msgs_per_pair: msgsPerPair },
        run_at: runAt.toISOString(),
        status: "pending",
      });
    }
  }

  if (jobs.length > 0) {
    // Insert in batches of 100
    for (let i = 0; i < jobs.length; i += 100) {
      const batch = jobs.slice(i, i + 100);
      await db.from("warmup_jobs").insert(batch);
    }
  }

  return jobs.length;
}
