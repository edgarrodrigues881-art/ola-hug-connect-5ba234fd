/**
 * warmup-engine v5.0 — Lifecycle Management
 * 
 * Responsabilidades:
 *   - start:  Criar ciclo, registrar grupos, agendar join_group jobs
 *   - pause:  Pausar ciclo, cancelar jobs pendentes
 *   - resume: Retomar ciclo, reagendar jobs
 *   - stop:   Encerrar ciclo, limpar dados
 *   - schedule_day: Agendar jobs manualmente para o dia atual
 * 
 * NÃO processa jobs — isso é responsabilidade do warmup-tick.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ══════════════════════════════════════════════════════════
// CORS
// ══════════════════════════════════════════════════════════
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════
// PHASE RULES — Single Source of Truth
// ══════════════════════════════════════════════════════════
//
// Dia 1: pre_24h (proteção, entrada nos grupos após 4-6h)
// Dia 2 → groupsEnd: groups_only (mensagens nos grupos)
// Dia groupsEnd+1: autosave_enabled (grupos + autosave)
// Dia groupsEnd+2+: community_enabled (grupos + autosave + comunidade)
//
// groupsEnd: new/recovered = 4, unstable = 7

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

// ══════════════════════════════════════════════════════════
// VOLUME CONFIG — 50 to 120 messages/day total
// ══════════════════════════════════════════════════════════
//
// Daily budget: randInt(50, 120) messages total
// All messages are distributed across the operating window (7:00-19:00 BRT)
// If window is partial (e.g. groups finished at 12:00), messages are
// proportionally reduced to fit the remaining time.
//
// groups_only:        100% group messages
// autosave_enabled:   70% group + 30% autosave
// community_enabled:  50% group + 20% autosave + 30% community

interface DayVolumes {
  groupMsgs: number;
  autosaveContacts: number;
  autosaveRounds: number;
  communityPeers: number;
  communityMsgsPerPeer: number;
}

function getDailyBudget(): number {
  return randInt(50, 120);
}

function getVolumes(chipState: string, dayIndex: number, phase: string): DayVolumes {
  const v: DayVolumes = {
    groupMsgs: 0,
    autosaveContacts: 0,
    autosaveRounds: 0,
    communityPeers: 0,
    communityMsgsPerPeer: 0,
  };

  if (phase === "pre_24h" || phase === "completed" || phase === "paused" || phase === "error") {
    return v;
  }

  // Grupos SEMPRE recebem o orçamento total (50-120), independente da fase
  v.groupMsgs = getDailyBudget();

  // Autosave e Community desativados para testes de grupo
  return v;
}

// ══════════════════════════════════════════════════════════
// OPERATING WINDOW — 07:00-19:00 BRT (exact timezone)
// ══════════════════════════════════════════════════════════

function getBrtNow(): Date {
  // Returns a Date object representing "now" with correct BRT offset
  return new Date();
}

function getBrtHour(date: Date): number {
  return parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", hour12: false }).format(date));
}

function getBrtTodayAt(hour: number, minute = 0): Date {
  // Build a date for today at HH:MM in BRT
  const brtDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  // Parse as BRT by computing UTC offset dynamically
  const tempDate = new Date(`${brtDateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`);
  // Get the BRT offset for this date
  const utcStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(tempDate);
  // Use a simpler approach: format in BRT, find offset
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(new Date());
  const tzPart = parts.find(p => p.type === "timeZoneName")?.value || "GMT-3";
  const offsetMatch = tzPart.match(/GMT([+-]?\d+)/);
  const offsetHours = offsetMatch ? parseInt(offsetMatch[1]) : -3;
  
  const result = new Date();
  // Set to today's date in BRT
  const [y, m, d] = brtDateStr.split("-").map(Number);
  result.setUTCFullYear(y, m - 1, d);
  result.setUTCHours(hour - offsetHours, minute, 0, 0);
  return result;
}

interface WindowResult {
  effectiveStart: number;
  effectiveEnd: number;
  isEmergency: boolean;
}

function calculateWindow(forced: boolean = false): WindowResult | null {
  const now = new Date();
  const nowMs = now.getTime();
  const startMs = getBrtTodayAt(7).getTime();
  const endMs = getBrtTodayAt(19).getTime();

  // Case 1: Forced execution outside window → 2h emergency window
  if (forced && nowMs >= endMs) {
    return {
      effectiveStart: nowMs,
      effectiveEnd: nowMs + 2 * 60 * 60 * 1000,
      isEmergency: true,
    };
  }

  // Case 2: Before window opens → schedule for full window
  if (nowMs < startMs) {
    return { effectiveStart: startMs, effectiveEnd: endMs, isEmergency: false };
  }

  // Case 3: After window closed → no scheduling
  if (nowMs >= endMs) {
    return null;
  }

  // Case 4: Within window → use remaining time
  return { effectiveStart: nowMs, effectiveEnd: endMs, isEmergency: false };
}

// ══════════════════════════════════════════════════════════
// SCHEDULE DAY JOBS
// ══════════════════════════════════════════════════════════

async function scheduleDayJobs(
  db: any,
  cycleId: string,
  userId: string,
  deviceId: string,
  dayIndex: number,
  phase: string,
  chipState: string,
  forced: boolean = false,
): Promise<number> {
  if (phase === "pre_24h" || phase === "completed") return 0;

  const window = calculateWindow(forced);
  if (!window) {
    console.log(`[scheduleDayJobs] Outside operating window, no jobs scheduled`);
    return 0;
  }

  const { effectiveStart, effectiveEnd, isEmergency } = window;
  const windowMs = effectiveEnd - effectiveStart;

  if (windowMs < 30 * 60 * 1000) {
    console.log(`[scheduleDayJobs] Window too small (${Math.round(windowMs / 60000)}min)`);
    return 0;
  }

  if (isEmergency) {
    console.log(`[scheduleDayJobs] Using 2h emergency window`);
  }

  const volumes = getVolumes(chipState, dayIndex, phase);
  const jobs: any[] = [];

  // ── GROUP INTERACTIONS ──
  if (volumes.groupMsgs > 0) {
    const spacing = windowMs / (volumes.groupMsgs + 1);
    for (let i = 0; i < volumes.groupMsgs; i++) {
      const offset = spacing * (i + 1) + randInt(-120, 120) * 1000;
      const runAt = new Date(effectiveStart + Math.max(offset, 60000));
      if (runAt.getTime() > effectiveEnd) break;
      jobs.push({
        user_id: userId, device_id: deviceId, cycle_id: cycleId,
        job_type: "group_interaction", payload: {},
        run_at: runAt.toISOString(), status: "pending",
      });
    }
  }

  // ── AUTOSAVE INTERACTIONS (last 3h of window) ──
  if (volumes.autosaveContacts > 0 && volumes.autosaveRounds > 0) {
    const totalAutosave = volumes.autosaveContacts * volumes.autosaveRounds;
    const asStart = Math.max(effectiveEnd - 3 * 60 * 60 * 1000, effectiveStart);
    const asWindowMs = effectiveEnd - asStart;
    const asSpacing = asWindowMs / (totalAutosave + 1);

    for (let round = 0; round < volumes.autosaveRounds; round++) {
      for (let c = 0; c < volumes.autosaveContacts; c++) {
        const idx = round * volumes.autosaveContacts + c;
        const offset = asSpacing * (idx + 1) + randInt(0, Math.floor(asSpacing * 0.3));
        const runAt = new Date(asStart + offset);
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
  if (volumes.communityPeers > 0 && volumes.communityMsgsPerPeer > 0) {
    const peerWindowMs = windowMs / volumes.communityPeers;
    for (let p = 0; p < volumes.communityPeers; p++) {
      const peerStart = effectiveStart + peerWindowMs * p;
      const convStart = peerStart + randInt(0, Math.floor(peerWindowMs * 0.1));
      for (let m = 0; m < volumes.communityMsgsPerPeer; m++) {
        const msgOffset = m * randInt(30, 120) * 1000;
        const runAt = new Date(convStart + msgOffset);
        if (runAt.getTime() > effectiveEnd) break;
        const isImage = Math.random() < 0.25;
        jobs.push({
          user_id: userId, device_id: deviceId, cycle_id: cycleId,
          job_type: "community_interaction",
          payload: { peer_index: p, msg_index: m, is_image: isImage },
          run_at: runAt.toISOString(), status: "pending",
        });
      }
    }
  }

  // ── PHASE TRANSITION JOBS — DISABLED for group-only testing ──
  // if (phase === "groups_only") { ... enable_autosave ... }
  // if (phase === "autosave_enabled") { ... enable_community ... }

  // Insert jobs in batches
  if (jobs.length > 0) {
    for (let i = 0; i < jobs.length; i += 100) {
      await db.from("warmup_jobs").insert(jobs.slice(i, i + 100));
    }
  }

  // Update cycle budget
  const totalInteractions = jobs.filter(j =>
    ["group_interaction", "autosave_interaction", "community_interaction"].includes(j.job_type)
  ).length;

  await db.from("warmup_cycles").update({
    daily_interaction_budget_target: totalInteractions,
    daily_interaction_budget_min: Math.floor(totalInteractions * 0.8),
    daily_interaction_budget_max: Math.ceil(totalInteractions * 1.2),
    daily_interaction_budget_used: 0,
    daily_unique_recipients_used: 0,
    updated_at: new Date().toISOString(),
  }).eq("id", cycleId);

  console.log(`[scheduleDayJobs] Day ${dayIndex} (${phase}, ${chipState}): ${jobs.length} jobs scheduled`);
  return jobs.length;
}

// ══════════════════════════════════════════════════════════
// ENSURE JOIN GROUP JOBS
// ══════════════════════════════════════════════════════════

async function ensureJoinGroupJobs(
  db: any,
  cycleId: string,
  userId: string,
  deviceId: string,
): Promise<number> {
  // Don't schedule if there are already pending join jobs
  const { data: existingJoinJobs } = await db
    .from("warmup_jobs")
    .select("id")
    .eq("cycle_id", cycleId)
    .eq("job_type", "join_group")
    .in("status", ["pending", "running"])
    .limit(1);

  if (existingJoinJobs && existingJoinJobs.length > 0) return 0;

  // Find groups that haven't been joined yet (by device_id, not cycle)
  const { data: pendingGroups } = await db
    .from("warmup_instance_groups")
    .select("group_id, warmup_groups_pool(id, name)")
    .eq("device_id", deviceId)
    .eq("join_status", "pending");

  if (!pendingGroups || pendingGroups.length === 0) return 0;

  const shuffled = shuffleArray(pendingGroups);
  const nowMs = Date.now();
  const joinJobs: any[] = [];

  let cumulativeMs = randInt(5, 15) * 60 * 1000;
  for (let i = 0; i < shuffled.length; i++) {
    const g = shuffled[i];
    const groupName = (g as any).warmup_groups_pool?.name || "Grupo";
    const runAt = new Date(nowMs + cumulativeMs);

    joinJobs.push({
      user_id: userId, device_id: deviceId, cycle_id: cycleId,
      job_type: "join_group",
      payload: { group_id: g.group_id, group_name: groupName },
      run_at: runAt.toISOString(), status: "pending",
    });
    cumulativeMs += randInt(5, 30) * 60 * 1000;
  }

  if (joinJobs.length > 0) {
    await db.from("warmup_jobs").insert(joinJobs);
  }

  return joinJobs.length;
}

// ══════════════════════════════════════════════════════════
// PLAN/ACCOUNT VALIDATION
// ══════════════════════════════════════════════════════════

async function validateUserPlan(db: any, userId: string): Promise<string | null> {
  const { data: activeSub } = await db
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: profile } = await db
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .maybeSingle();

  if (!activeSub || new Date(activeSub.expires_at) < new Date()) {
    return "Seu plano está inativo. Ative um plano para continuar.";
  }
  if (profile?.status === "suspended" || profile?.status === "cancelled") {
    return "Conta suspensa ou cancelada.";
  }
  return null;
}

// ══════════════════════════════════════════════════════════
// AUTH HANDLER
// ══════════════════════════════════════════════════════════

async function authenticateUser(req: Request, supabaseUrl: string): Promise<string | null> {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret === Deno.env.get("WEBHOOK_SECRET")) {
    return null; // Cron caller — no user ID
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return "__unauthorized__";

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) return "__unauthorized__";

  return claimsData.claims.sub as string;
}

// ══════════════════════════════════════════════════════════
// CONNECTED STATUS CHECK
// ══════════════════════════════════════════════════════════
const CONNECTED_STATUSES = ["Ready", "Connected", "authenticated"];

// ══════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  const callerUserId = await authenticateUser(req, supabaseUrl);
  if (callerUserId === "__unauthorized__") {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body OK */ }

  const action = body.action || "tick";

  try {
    // Validate plan for user-initiated actions
    if (callerUserId && ["start", "resume"].includes(action)) {
      const planError = await validateUserPlan(db, callerUserId);
      if (planError) {
        return json({ error: planError, code: "NO_ACTIVE_PLAN" }, 403);
      }
    }

    switch (action) {
      case "start":
        return await handleStart(db, callerUserId, body);
      case "pause":
        return await handlePause(db, callerUserId, body);
      case "resume":
        return await handleResume(db, callerUserId, body);
      case "stop":
        return await handleStop(db, callerUserId, body);
      case "schedule_day":
        return await handleScheduleDay(db, callerUserId, body);
      default:
        return json({ error: "Ação inválida. Use: start, pause, resume, stop, schedule_day" }, 400);
    }
  } catch (err) {
    console.error(`[warmup-engine] ${action} error:`, err.message);
    return json({ error: err.message }, 500);
  }
});

// ══════════════════════════════════════════════════════════
// ACTION: START
// ══════════════════════════════════════════════════════════

async function handleStart(db: any, userId: string | null, body: any) {
  if (!userId) throw new Error("start requires authenticated user");

  const { device_id, chip_state, days_total, plan_id } = body;
  if (!device_id) throw new Error("device_id required");

  const resolvedChipState = chip_state || "new";
  const now = new Date();

  // 1. Clean up completed/orphan cycles for this device
  const { data: oldCycles } = await db
    .from("warmup_cycles")
    .select("id")
    .eq("device_id", device_id)
    .eq("user_id", userId)
    .in("phase", ["completed", "error"]);

  if (oldCycles?.length > 0) {
    for (const old of oldCycles) {
      await Promise.all([
        db.from("warmup_jobs").delete().eq("cycle_id", old.id),
        db.from("warmup_audit_logs").delete().eq("cycle_id", old.id),
        db.from("warmup_instance_groups").delete().eq("device_id", device_id).eq("cycle_id", old.id),
        db.from("warmup_community_membership").delete().eq("device_id", device_id).eq("cycle_id", old.id),
        db.from("warmup_unique_recipients").delete().eq("cycle_id", old.id),
      ]);
      await db.from("warmup_cycles").delete().eq("id", old.id);
    }
  }

  // 2. Create cycle
  const cycleDays = days_total || 30;
  const first24hEnds = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: cycle, error: cycleErr } = await db
    .from("warmup_cycles")
    .insert({
      user_id: userId,
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
    .select("id")
    .single();

  if (cycleErr) throw cycleErr;

  // 3. Register groups from pool
  const { data: poolGroups } = await db
    .from("warmup_groups_pool")
    .select("id, name")
    .eq("is_active", true);

  const allGroups = shuffleArray(poolGroups || []);

  // Check for existing group records for this device
  const { data: existingGroups } = await db
    .from("warmup_instance_groups")
    .select("id, group_id, join_status")
    .eq("device_id", device_id);

  if (existingGroups?.length > 0) {
    // Update existing records to reference new cycle
    await db.from("warmup_instance_groups")
      .update({ cycle_id: cycle.id })
      .eq("device_id", device_id);

    // Insert any NEW pool groups that don't have records yet
    const existingGroupIds = new Set(existingGroups.map((g: any) => g.group_id));
    const missingGroups = allGroups.filter((g: any) => !existingGroupIds.has(g.id));
    for (const g of missingGroups) {
      await db.from("warmup_instance_groups").insert({
        user_id: userId, device_id,
        group_id: g.id, cycle_id: cycle.id, join_status: "pending",
      });
    }
  } else {
    // Fresh: register all pool groups
    for (const g of allGroups) {
      await db.from("warmup_instance_groups").insert({
        user_id: userId, device_id,
        group_id: g.id, cycle_id: cycle.id, join_status: "pending",
      });
    }
  }

  // 4. Schedule join_group jobs: 4-6h after start, 5-30min between each
  const jobs: any[] = [];
  const joinStartMs = randInt(4, 6) * 60 * 60 * 1000;
  let cumulativeDelay = joinStartMs;

  for (let i = 0; i < allGroups.length; i++) {
    if (i > 0) {
      cumulativeDelay += randInt(5, 30) * 60 * 1000;
    }
    jobs.push({
      user_id: userId, device_id, cycle_id: cycle.id,
      job_type: "join_group",
      payload: { group_id: allGroups[i].id, group_name: allGroups[i].name },
      run_at: new Date(now.getTime() + cumulativeDelay).toISOString(),
      status: "pending",
    });
  }

  // 5. Phase transition is now triggered automatically after last group joins
  //    (handled in warmup-tick join_group handler)

  // 6. Schedule first daily_reset at 00:05 BRT (03:05 UTC) after 24h window
  const firstReset = new Date(first24hEnds);
  firstReset.setUTCHours(3, 5, 0, 0);
  if (firstReset.getTime() <= first24hEnds.getTime()) {
    firstReset.setUTCDate(firstReset.getUTCDate() + 1);
  }
  jobs.push({
    user_id: userId, device_id, cycle_id: cycle.id,
    job_type: "daily_reset", payload: {},
    run_at: firstReset.toISOString(), status: "pending",
  });

  // Insert all jobs
  if (jobs.length > 0) {
    await db.from("warmup_jobs").insert(jobs);
  }

  // 7. Audit log
  const chipLabels: Record<string, string> = {
    new: "Chip Novo",
    recovered: "Chip Banido/Recuperação",
    unstable: "Chip Crítico/Instável",
  };
  const chipLabel = chipLabels[resolvedChipState] || resolvedChipState.toUpperCase();

  const groupSchedule = jobs
    .filter(j => j.job_type === "join_group")
    .map((j, i) => {
      const brt = new Date(j.run_at).toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit", minute: "2-digit", hour12: false,
      });
      return `Grupo ${i + 1}: ${j.payload.group_name} às ${brt}`;
    })
    .join(" | ");

  await db.from("warmup_audit_logs").insert({
    user_id: userId, device_id, cycle_id: cycle.id,
    level: "info", event_type: "cycle_started",
    message: `Ciclo ${chipLabel} iniciado: ${cycleDays} dias.${groupSchedule ? ` Agenda: ${groupSchedule}` : ""}`,
    meta: {
      chip_state: resolvedChipState,
      groups: allGroups.map(g => g.name),
      total_days: cycleDays,
    },
  });

  return json({
    ok: true,
    cycle_id: cycle.id,
    chip_state: resolvedChipState,
    jobs_scheduled: jobs.length,
    total_days: cycleDays,
  });
}

// ══════════════════════════════════════════════════════════
// ACTION: PAUSE
// ══════════════════════════════════════════════════════════

async function handlePause(db: any, userId: string | null, body: any) {
  if (!userId) throw new Error("pause requires authenticated user");
  const { device_id } = body;

  const { data: cycle } = await db
    .from("warmup_cycles")
    .select("id, phase")
    .eq("device_id", device_id)
    .eq("user_id", userId)
    .eq("is_running", true)
    .neq("phase", "completed")
    .single();

  if (!cycle) throw new Error("No active cycle found");

  await db.from("warmup_cycles").update({
    is_running: false,
    phase: "paused",
    previous_phase: cycle.phase,
  }).eq("id", cycle.id);

  await db.from("warmup_jobs")
    .update({ status: "cancelled" })
    .eq("cycle_id", cycle.id)
    .eq("status", "pending");

  await db.from("warmup_audit_logs").insert({
    user_id: userId, device_id, cycle_id: cycle.id,
    level: "info", event_type: "cycle_paused",
    message: "Aquecimento pausado pelo usuário",
  });

  return json({ ok: true });
}

// ══════════════════════════════════════════════════════════
// ACTION: RESUME
// ══════════════════════════════════════════════════════════

async function handleResume(db: any, userId: string | null, body: any) {
  if (!userId) throw new Error("resume requires authenticated user");
  const { device_id } = body;

  const { data: cycle } = await db
    .from("warmup_cycles")
    .select("id, user_id, device_id, phase, day_index, days_total, chip_state, first_24h_ends_at, previous_phase")
    .eq("device_id", device_id)
    .eq("user_id", userId)
    .eq("phase", "paused")
    .single();

  if (!cycle) throw new Error("No paused cycle found");

  // Validate device is connected
  const { data: device } = await db
    .from("devices")
    .select("status")
    .eq("id", device_id)
    .single();

  if (!device || !CONNECTED_STATUSES.includes(device.status)) {
    throw new Error("Instância offline. Conecte o dispositivo antes de retomar o aquecimento.");
  }

  // Determine resume phase
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

  // Update cycle
  await db.from("warmup_cycles").update({
    is_running: true,
    phase: resumePhase,
    previous_phase: null,
    last_error: null,
    next_run_at: now.toISOString(),
  }).eq("id", cycle.id);

  // Schedule next daily reset
  const nextReset = new Date(now);
  nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  nextReset.setUTCHours(3, 5, 0, 0);
  await db.from("warmup_jobs").insert({
    user_id: userId, device_id, cycle_id: cycle.id,
    job_type: "daily_reset", payload: {},
    run_at: nextReset.toISOString(), status: "pending",
  });

  // Cancel old pending interaction jobs
  await db.from("warmup_jobs")
    .update({ status: "cancelled", last_error: "Cancelado: retomada do ciclo" })
    .eq("cycle_id", cycle.id)
    .eq("status", "pending")
    .in("job_type", ["group_interaction", "autosave_interaction", "community_interaction"]);

  // Schedule today's jobs
  if (resumePhase !== "pre_24h" && resumePhase !== "completed") {
    await scheduleDayJobs(db, cycle.id, userId, device_id, cycle.day_index, resumePhase, cycle.chip_state || "new", true);
  }

  // Re-schedule join_group jobs ONLY if still on day 1
  if (cycle.day_index <= 1) {
    const { data: pendingGroups } = await db
      .from("warmup_instance_groups")
      .select("group_id, warmup_groups_pool(id, name)")
      .eq("device_id", device_id)
      .eq("cycle_id", cycle.id)
      .eq("join_status", "pending");

    if (pendingGroups?.length > 0) {
      const shuffled = shuffleArray(pendingGroups);
      const joinJobs: any[] = [];
      let cumulativeMs = randInt(5, 15) * 60 * 1000;

      for (let i = 0; i < shuffled.length; i++) {
        const g = shuffled[i];
        joinJobs.push({
          user_id: userId, device_id, cycle_id: cycle.id,
          job_type: "join_group",
          payload: { group_id: g.group_id, group_name: g.warmup_groups_pool?.name || "Grupo" },
          run_at: new Date(now.getTime() + cumulativeMs).toISOString(),
          status: "pending",
        });
        cumulativeMs += randInt(5, 30) * 60 * 1000;
      }

      if (joinJobs.length > 0) {
        await db.from("warmup_jobs").insert(joinJobs);
      }
    }
  }

  await db.from("warmup_audit_logs").insert({
    user_id: userId, device_id, cycle_id: cycle.id,
    level: "info", event_type: "cycle_resumed",
    message: `Aquecimento retomado na fase: ${resumePhase} (dia ${cycle.day_index})`,
  });

  return json({ ok: true, phase: resumePhase });
}

// ══════════════════════════════════════════════════════════
// ACTION: STOP
// ══════════════════════════════════════════════════════════

async function handleStop(db: any, userId: string | null, body: any) {
  if (!userId) throw new Error("stop requires authenticated user");
  const { device_id } = body;

  const { data: cycle } = await db
    .from("warmup_cycles")
    .select("id")
    .eq("device_id", device_id)
    .eq("user_id", userId)
    .neq("phase", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!cycle) throw new Error("No active cycle found");

  // Mark completed and cancel pending jobs
  await db.from("warmup_cycles").update({ is_running: false, phase: "completed" }).eq("id", cycle.id);
  await db.from("warmup_jobs").update({ status: "cancelled" }).eq("cycle_id", cycle.id).eq("status", "pending");

  // Full cleanup
  await Promise.all([
    db.from("warmup_jobs").delete().eq("cycle_id", cycle.id),
    db.from("warmup_audit_logs").delete().eq("cycle_id", cycle.id),
    db.from("warmup_instance_groups").delete().eq("device_id", device_id).eq("cycle_id", cycle.id),
    db.from("warmup_community_membership").delete().eq("device_id", device_id).eq("cycle_id", cycle.id),
    db.from("warmup_unique_recipients").delete().eq("cycle_id", cycle.id),
  ]);
  await db.from("warmup_cycles").delete().eq("id", cycle.id);

  return json({ ok: true });
}

// ══════════════════════════════════════════════════════════
// ACTION: SCHEDULE_DAY (manual trigger)
// ══════════════════════════════════════════════════════════

async function handleScheduleDay(db: any, userId: string | null, body: any) {
  if (!userId) throw new Error("schedule_day requires authenticated user");

  const { device_id, cycle_id, day_index, phase, chip_state } = body;
  if (!cycle_id || !device_id) throw new Error("cycle_id and device_id required");

  // Cancel existing pending interaction jobs
  await db.from("warmup_jobs")
    .update({ status: "cancelled", last_error: "Cancelado: reagendamento manual" })
    .eq("cycle_id", cycle_id)
    .eq("status", "pending")
    .in("job_type", ["group_interaction", "autosave_interaction", "community_interaction"]);

  const resolvedPhase = phase || "groups_only";
  let joinScheduled = 0;

  // Join groups only on day 1 (pre_24h phase)
  if (resolvedPhase === "groups_only" && (day_index || 1) <= 1) {
    joinScheduled = await ensureJoinGroupJobs(db, cycle_id, userId, device_id);
  }

  const jobCount = await scheduleDayJobs(
    db, cycle_id, userId, device_id,
    day_index || 1, resolvedPhase, chip_state || "new", true,
  );

  return json({ ok: true, jobs_scheduled: (jobCount || 0) + joinScheduled });
}
