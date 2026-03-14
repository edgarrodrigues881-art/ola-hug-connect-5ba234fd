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

// ── Phase rules per chip_state ──
// All chips: Day 1 OFF, then groups_only, then autosave_enabled (1 day), then community_enabled
// New/Recovered: Days 2-4 groups → Day 5 autosave → Day 6+ community
// Unstable:      Days 2-7 groups → Day 8 autosave → Day 9+ community
function getGroupsEndDay(chipState: string): number {
  return chipState === "unstable" ? 7 : 4;
}

function getPhaseForDay(day: number, chipState: string): string {
  if (day <= 1) return "pre_24h";
  const groupsEnd = getGroupsEndDay(chipState);
  if (day <= groupsEnd) return "groups_only";
  if (day === groupsEnd + 1) return "autosave_enabled";
  return "community_enabled";
}

function getTotalDays(_chipState: string): number {
  return 30; // All profiles run for 30 days
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
    // ACTION: start — warmup cycle
    // ════════════════════════════════════════
    if (action === "start") {
      if (!callerUserId) throw new Error("start requires authenticated user");
      const { device_id, chip_state, days_total, plan_id } = body;
      if (!device_id) throw new Error("device_id required");

      const resolvedChipState = chip_state || "new";
      const now = new Date();

      // Day 1 is OFF — no actions at all, just wait 24h
      const first24hEnds = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const cycleDays = days_total || getTotalDays(resolvedChipState);
      const { data: cycle, error: cycleErr } = await db
        .from("warmup_cycles")
        .insert({
          user_id: callerUserId,
          device_id,
          chip_state: resolvedChipState,
          days_total: cycleDays,
          plan_id: plan_id || null,
          phase: "pre_24h",
          is_running: true,
          started_at: now.toISOString(),
          first_24h_ends_at: first24hEnds.toISOString(),
          daily_interaction_budget_target: 0,
          daily_interaction_budget_min: 0,
          daily_interaction_budget_max: 0,
        })
        .select("id, user_id, device_id, phase, is_running, day_index, days_total, chip_state, started_at, first_24h_ends_at, daily_interaction_budget_target, created_at")
        .single();
      if (cycleErr) throw cycleErr;

      // Get ALL groups from pool
      const { data: poolGroups } = await db
        .from("warmup_groups_pool")
        .select("id, name")
        .eq("is_active", true);

      const allGroups = shuffleArray(poolGroups || []);
      const jobs: any[] = [];

      // Check if device already has ANY groups from a previous cycle
      const { data: existingGroups } = await db
        .from("warmup_instance_groups")
        .select("id, group_id, join_status")
        .eq("device_id", device_id);

      if (existingGroups && existingGroups.length > 0) {
        // Update ALL existing groups to reference the new cycle (regardless of join_status)
        await db.from("warmup_instance_groups")
          .update({ cycle_id: cycle.id })
          .eq("device_id", device_id);
        
        // Also insert any NEW pool groups that don't have an instance_groups record yet
        const existingGroupIds = new Set(existingGroups.map((g: any) => g.group_id));
        const missingGroups = allGroups.filter((g: any) => !existingGroupIds.has(g.id));
        for (const g of missingGroups) {
          await db.from("warmup_instance_groups").insert({
            user_id: callerUserId, device_id,
            group_id: g.id, cycle_id: cycle.id, join_status: "pending",
          });
        }
      } else {
        // Register groups for this cycle (will join on Day 2)
        for (const g of allGroups) {
          await db.from("warmup_instance_groups").insert({
            user_id: callerUserId, device_id,
            group_id: g.id, cycle_id: cycle.id, join_status: "pending",
          });
        }
      }

      // Schedule phase_transition to groups_only at 24h mark (Day 2 start)
      jobs.push({
        user_id: callerUserId, device_id, cycle_id: cycle.id,
        job_type: "phase_transition",
        payload: { target_phase: "groups_only" },
        run_at: first24hEnds.toISOString(), status: "pending",
      });

      // Schedule first daily_reset at the first 00:05 BRT AFTER the initial 24h window
      const firstReset = new Date(first24hEnds);
      firstReset.setUTCHours(3, 5, 0, 0);
      if (firstReset.getTime() <= first24hEnds.getTime()) {
        firstReset.setUTCDate(firstReset.getUTCDate() + 1);
      }
      jobs.push({
        user_id: callerUserId, device_id, cycle_id: cycle.id,
        job_type: "daily_reset", payload: {}, run_at: firstReset.toISOString(), status: "pending",
      });

      if (jobs.length > 0) {
        const { error: jobErr } = await db.from("warmup_jobs").insert(jobs);
        if (jobErr) throw jobErr;
      }

      const chipLabels: Record<string, string> = { new: "Chip Novo", recovered: "Chip Banido/Recuperação", unstable: "Chip Crítico/Instável" };
      const chipLabel = chipLabels[resolvedChipState] || resolvedChipState.toUpperCase();
      const groupsEnd = getGroupsEndDay(resolvedChipState);
      await db.from("warmup_audit_logs").insert({
        user_id: callerUserId, device_id, cycle_id: cycle.id,
        level: "info", event_type: "cycle_started",
        message: `Ciclo ${chipLabel} iniciado: ${cycleDays} dias. Dia 1=OFF, Dias 2-${groupsEnd}=Grupos, Dia ${groupsEnd+1}=AutoSave, Dia ${groupsEnd+2}+=Comunitário. ${allGroups.length} grupos registrados.`,
        meta: { chip_state: resolvedChipState, groups: allGroups.map(g => g.name), total_days: cycleDays },
      });

      return new Response(JSON.stringify({ ok: true, cycle_id: cycle.id, chip_state: resolvedChipState, jobs_scheduled: jobs.length, total_days: cycleDays }), {
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

      const now = new Date();
      const first24hEnds = new Date(cycle.first_24h_ends_at);
      let resumePhase: string;

      if (now < first24hEnds) {
        resumePhase = "pre_24h";
      } else if (cycle.previous_phase && !["error", "completed", "paused"].includes(cycle.previous_phase)) {
        resumePhase = cycle.previous_phase;
      } else {
        resumePhase = getPhaseForDay(cycle.day_index, cycle.chip_state || "new");
      }

      const { data: deviceCheck } = await db.from("devices").select("status").eq("id", device_id).single();
      const CONNECTED_STATUSES = ["Ready", "Connected", "authenticated"];
      if (!deviceCheck || !CONNECTED_STATUSES.includes(deviceCheck.status)) {
        throw new Error("Instância offline. Conecte o dispositivo antes de retomar o aquecimento.");
      }

      await db.from("warmup_cycles").update({
        is_running: true, phase: resumePhase, previous_phase: null, last_error: null,
        next_run_at: now.toISOString(),
      }).eq("id", cycle.id);

      const nextReset = new Date(now);
      nextReset.setUTCDate(nextReset.getUTCDate() + 1);
      nextReset.setUTCHours(3, 5, 0, 0);
      await db.from("warmup_jobs").insert({
        user_id: callerUserId, device_id, cycle_id: cycle.id,
        job_type: "daily_reset", payload: {}, run_at: nextReset.toISOString(), status: "pending",
      });

      // Cancel old pending interaction jobs before scheduling new ones
      await db.from("warmup_jobs")
        .update({ status: "cancelled", last_error: "Cancelado: retomada do ciclo" })
        .eq("cycle_id", cycle.id)
        .eq("status", "pending")
        .in("job_type", ["group_interaction", "autosave_interaction", "community_interaction"]);

      // Schedule today's jobs for the current phase
      if (resumePhase !== "pre_24h" && resumePhase !== "completed") {
        await scheduleDayJobs(db, cycle.id, callerUserId, device_id, cycle.day_index, resumePhase, cycle.chip_state || "new", true);
      }

      // ── Re-schedule join_group jobs for groups never joined ──
      const { data: pendingGroups } = await db
        .from("warmup_instance_groups")
        .select("group_id, warmup_groups_pool(id, name)")
        .eq("device_id", device_id)
        .eq("cycle_id", cycle.id)
        .eq("join_status", "pending");

      if (pendingGroups && pendingGroups.length > 0) {
        const joinJobs: any[] = [];
        const shuffled = shuffleArray(pendingGroups);
        const joinWindowMs = 6 * 60 * 60 * 1000;
        const joinSpacing = joinWindowMs / (shuffled.length + 1);

        for (let i = 0; i < shuffled.length; i++) {
          const g = shuffled[i];
          const groupName = g.warmup_groups_pool?.name || "Grupo";
          const groupId = g.group_id;
          const offset = joinSpacing * (i + 1) + randInt(-10, 10) * 60 * 1000;
          const runAt = new Date(now.getTime() + Math.max(offset, 5 * 60 * 1000));

          joinJobs.push({
            user_id: callerUserId, device_id, cycle_id: cycle.id,
            job_type: "join_group",
            payload: { group_id: groupId, group_name: groupName },
            run_at: runAt.toISOString(), status: "pending",
          });
        }

        if (joinJobs.length > 0) {
          await db.from("warmup_jobs").insert(joinJobs);
          console.log(`[resume] Re-scheduled ${joinJobs.length} join_group jobs for device ${device_id}`);
        }
      }

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

    // ════════════════════════════════════════
    // ACTION: schedule_day
    // ════════════════════════════════════════
    if (action === "schedule_day") {
      if (!callerUserId) throw new Error("schedule_day requires authenticated user");
      const { device_id, cycle_id, day_index, phase, chip_state } = body;
      if (!cycle_id || !device_id) throw new Error("cycle_id and device_id required");

      // Cancel existing pending interaction jobs before scheduling new ones
      await db.from("warmup_jobs")
        .update({ status: "cancelled", last_error: "Cancelado: reagendamento manual" })
        .eq("cycle_id", cycle_id)
        .eq("status", "pending")
        .in("job_type", ["group_interaction", "autosave_interaction", "community_interaction"]);

      const jobCount = await scheduleDayJobs(db, cycle_id, callerUserId, device_id, day_index || 1, phase || "groups_only", chip_state || "new", true);

      return new Response(JSON.stringify({ ok: true, jobs_scheduled: jobCount || 0 }), {
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
  chipState: string = "new",
  isResume: boolean = false
) {
  const now = new Date();
  const jobs: any[] = [];

  // Day 1 = OFF, no jobs
  if (phase === "pre_24h" || phase === "completed") return 0;

  // Activity window: 07:00-19:00 BRT = 10:00-22:00 UTC
  const today = new Date(now);
  const windowStartUTC = new Date(today);
  windowStartUTC.setUTCHours(10, 0, 0, 0);
  const windowEndUTC = new Date(today);
  windowEndUTC.setUTCHours(22, 0, 0, 0);

  const effectiveStart = isResume ? Math.max(now.getTime(), windowStartUTC.getTime()) : windowStartUTC.getTime();
  const effectiveEnd = windowEndUTC.getTime();

  if (effectiveStart >= effectiveEnd) return 0;

  const windowMs = effectiveEnd - effectiveStart;
  const volumes = getVolumes(chipState, dayIndex, phase);

  // ── GROUP INTERACTIONS ──
  if (volumes.groupMsgs > 0) {
    const groupSpacingMs = windowMs / volumes.groupMsgs;
    for (let i = 0; i < volumes.groupMsgs; i++) {
      const baseOffset = groupSpacingMs * i;
      const jitter = randInt(0, Math.floor(groupSpacingMs * 0.6));
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd) break;
      jobs.push({
        user_id: userId, device_id: deviceId, cycle_id: cycleId,
        job_type: "group_interaction", payload: {},
        run_at: runAt.toISOString(), status: "pending",
      });
    }
  }

  // ── AUTOSAVE INTERACTIONS ──
  // 5 contacts × 3 rounds = 15 messages, sequential: c1,c2,c3,c4,c5,c1,c2,c3,c4,c5,c1,c2,c3,c4,c5
  if (volumes.autosaveContacts > 0) {
    const totalAutosave = volumes.autosaveContacts * volumes.autosaveRounds;
    // Schedule after groups finish (last 3 hours of window)
    const autosaveWindowStart = effectiveEnd - 3 * 60 * 60 * 1000;
    const asStart = Math.max(autosaveWindowStart, effectiveStart);
    const asWindowMs = effectiveEnd - asStart;
    const asSpacingMs = asWindowMs / (totalAutosave + 1);

    for (let round = 0; round < volumes.autosaveRounds; round++) {
      for (let c = 0; c < volumes.autosaveContacts; c++) {
        const idx = round * volumes.autosaveContacts + c;
        const baseOffset = asSpacingMs * (idx + 1);
        const jitter = randInt(0, Math.floor(asSpacingMs * 0.3));
        const runAt = new Date(asStart + baseOffset + jitter);
        if (runAt.getTime() > effectiveEnd) break;
        jobs.push({
          user_id: userId, device_id: deviceId, cycle_id: cycleId,
          job_type: "autosave_interaction",
          payload: { recipient_index: c, msg_index: round },
          run_at: runAt.toISOString(), status: "pending",
        });
      }
    }
  }

  // ── COMMUNITY INTERACTIONS (conversation bursts) ──
  // Each peer gets 30-50 messages clustered together, 25% images
  if (volumes.communityPeers > 0 && volumes.communityMsgsPerPeer > 0) {
    const totalPeers = volumes.communityPeers;
    const msgsPerPeer = volumes.communityMsgsPerPeer;
    const peerWindowMs = windowMs / totalPeers; // time allocated per peer conversation

    for (let p = 0; p < totalPeers; p++) {
      const peerStart = effectiveStart + (peerWindowMs * p);
      // Conversation starts with a random offset within first 20% of peer window
      const convStart = peerStart + randInt(0, Math.floor(peerWindowMs * 0.1));
      // Messages spaced 30-120 seconds apart within the conversation
      for (let m = 0; m < msgsPerPeer; m++) {
        const msgOffset = m * randInt(30, 120) * 1000;
        const runAt = new Date(convStart + msgOffset);
        if (runAt.getTime() > effectiveEnd) break;
        const isImage = Math.random() < 0.25; // 25% images
        jobs.push({
          user_id: userId, device_id: deviceId, cycle_id: cycleId,
          job_type: "community_interaction",
          payload: { peer_index: p, msg_index: m, is_image: isImage },
          run_at: runAt.toISOString(), status: "pending",
        });
      }
    }
  }

  // ── STATUS POSTS ──
  if (volumes.statusPosts > 0) {
    const stSpacingMs = windowMs / (volumes.statusPosts + 1);
    for (let i = 0; i < volumes.statusPosts; i++) {
      const baseOffset = stSpacingMs * (i + 1);
      const jitter = randInt(-30, 30) * 60 * 1000;
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd || runAt.getTime() < effectiveStart) continue;
      jobs.push({
        user_id: userId, device_id: deviceId, cycle_id: cycleId,
        job_type: "post_status", payload: {},
        run_at: runAt.toISOString(), status: "pending",
      });
    }
  }

  if (jobs.length > 0) {
    for (let i = 0; i < jobs.length; i += 100) {
      const batch = jobs.slice(i, i + 100);
      await db.from("warmup_jobs").insert(batch);
    }
  }

  // Update the cycle's daily budget to reflect the scheduled volume
  const totalInteractions = (volumes.groupMsgs || 0)
    + (volumes.autosaveContacts * volumes.autosaveRounds || 0)
    + (volumes.communityPeers * volumes.communityMsgsPerPeer || 0)
    + (volumes.statusPosts || 0);
  
  await db.from("warmup_cycles").update({
    daily_interaction_budget_target: totalInteractions,
    daily_interaction_budget_min: Math.floor(totalInteractions * 0.8),
    daily_interaction_budget_max: Math.ceil(totalInteractions * 1.2),
    daily_interaction_budget_used: 0,
    daily_unique_recipients_used: 0,
    phase: phase,
    updated_at: new Date().toISOString(),
  }).eq("id", cycleId);

  return jobs.length;
}

// ════════════════════════════════════════
// Volume configuration
// Groups: 50-120/day
// AutoSave: 5 contacts × 3 rounds (from autosave_enabled phase onwards)
// Community: progressive peers 3→5→10→…→40, each peer gets 30-50 msgs (conversation burst)
// Status: 5 per day always
// ════════════════════════════════════════
interface DayVolumes {
  groupMsgs: number;
  statusPosts: number;
  autosaveContacts: number;
  autosaveRounds: number;
  communityPeers: number;
  communityMsgsPerPeer: number;
}

function getVolumes(chipState: string, dayIndex: number, phase: string): DayVolumes {
  const v: DayVolumes = { groupMsgs: 0, statusPosts: 0, autosaveContacts: 0, autosaveRounds: 0, communityPeers: 0, communityMsgsPerPeer: 0 };

  if (phase === "pre_24h" || phase === "completed") return v;

  v.groupMsgs = randInt(50, 120);
  v.statusPosts = 5;

  if (phase === "autosave_enabled" || phase === "community_enabled" || phase === "community_light") {
    v.autosaveContacts = 5;
    v.autosaveRounds = 3;
  }

  if (phase === "community_enabled" || phase === "community_light") {
    const groupsEnd = getGroupsEndDay(chipState);
    const communityStartDay = groupsEnd + 2;
    const communityDay = dayIndex - communityStartDay + 1;

    const peerScale = [0, 3, 5, 10, 10, 15, 20, 25, 30, 35, 40];
    v.communityPeers = communityDay <= 0 ? 0 : peerScale[Math.min(communityDay, peerScale.length - 1)];
    v.communityMsgsPerPeer = v.communityPeers > 0 ? randInt(30, 50) : 0;
  }

  return v;
}
