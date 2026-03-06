import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Default messages for autosave interactions ──
const defaultAutosaveMessages = [
  "Bom dia! 😊", "Boa tarde!", "Boa noite! 🌙",
  "Oi, tudo bem?", "E aí, como vai?", "Beleza? 👋",
  "Tudo certo por aí?", "Opa, tudo bem?",
  "Fala, tranquilo?", "Olá! Como está?",
  "Oi, sumido(a)! 😄", "E aí, novidades?",
  "Bom dia, tudo bem com você?", "Boa tarde! Como foi o dia?",
  "Boa noite, descanse bem! 😴",
  "Valeu! 👍", "Show! 🔥", "Top demais! 🚀",
  "Que legal!", "Massa!", "Boa! 💯",
  "Concordo!", "Verdade!", "Com certeza!",
  "Obrigado!", "Muito bom!",
];

// ── Helpers ──
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function shuffleAndPick<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function backoffMinutes(attempt: number): number {
  return [5, 15, 60, 180, 360][Math.min(attempt, 4)];
}

// ── uazapi request helper ──
async function uazapiRequest(
  baseUrl: string, token: string, endpoint: string, payload: any
) {
  const url = `${baseUrl}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", token, Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ── Schedule autosave interaction jobs for the day ──
async function scheduleAutosaveInteractions(
  db: any, userId: string, deviceId: string, cycleId: string, budgetTarget: number, budgetUsed: number
) {
  const remaining = budgetTarget - budgetUsed;
  if (remaining <= 0) return 0;

  // Distribute interactions between 08:00-21:00 BRT (11:00-00:00 UTC)
  const now = new Date();
  const todayBase = new Date(now);
  todayBase.setUTCHours(11, 0, 0, 0); // 08:00 BRT
  const todayEnd = new Date(now);
  todayEnd.setUTCHours(24, 0, 0, 0);  // 21:00 BRT

  const windowStart = Math.max(now.getTime(), todayBase.getTime());
  const windowEnd = todayEnd.getTime();
  if (windowStart >= windowEnd) return 0;

  const windowMs = windowEnd - windowStart;
  const interactionCount = Math.min(remaining, 15); // Max 15 autosave interactions/day
  const jobs: any[] = [];

  for (let i = 0; i < interactionCount; i++) {
    // Spread evenly with jitter
    const baseOffset = (windowMs / interactionCount) * i;
    const jitter = randInt(0, Math.floor(windowMs / interactionCount * 0.4));
    const runAt = new Date(windowStart + baseOffset + jitter);

    jobs.push({
      user_id: userId,
      device_id: deviceId,
      cycle_id: cycleId,
      job_type: "autosave_interaction",
      payload: {},
      run_at: runAt.toISOString(),
      status: "pending",
    });
  }

  if (jobs.length > 0) {
    await db.from("warmup_jobs").insert(jobs);
  }
  return jobs.length;
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
  try { body = await req.json(); } catch {}

  const action = body.action || "tick"; // tick | start | pause | resume | stop

  try {
    // ════════════════════════════════════════
    // ACTION: start
    // ════════════════════════════════════════
    if (action === "start") {
      if (!callerUserId) throw new Error("start requires authenticated user");
      const { device_id, chip_state, days_total, plan_id } = body;
      if (!device_id) throw new Error("device_id required");

      const now = new Date();
      const first24hEnds = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const budgetTarget = randInt(20, 30);

      // Create cycle
      const { data: cycle, error: cycleErr } = await db
        .from("warmup_cycles")
        .insert({
          user_id: callerUserId,
          device_id,
          chip_state: chip_state || "new",
          days_total: days_total || 14,
          plan_id: plan_id || null,
          phase: "pre_24h",
          is_running: true,
          started_at: now.toISOString(),
          first_24h_ends_at: first24hEnds.toISOString(),
          daily_interaction_budget_target: budgetTarget,
        })
        .select()
        .single();
      if (cycleErr) throw cycleErr;

      // Pick 3-5 groups from pool of 8
      const { data: poolGroups } = await db
        .from("warmup_groups_pool")
        .select("id, name")
        .eq("is_active", true);

      const numGroups = randInt(3, Math.min(5, poolGroups?.length || 0));
      const selectedGroups = shuffleAndPick(poolGroups || [], numGroups);

      // Schedule join_group jobs distributed in the 24h window
      // First join: 4-6h from now
      const firstJoinOffsetMs = randInt(4 * 60, 6 * 60) * 60 * 1000;
      const windowEndMs = 24 * 60 * 60 * 1000;
      const jobs: any[] = [];

      for (let i = 0; i < selectedGroups.length; i++) {
        let offsetMs: number;
        if (i === 0) {
          offsetMs = firstJoinOffsetMs;
        } else {
          // Distribute remaining between firstJoin and 24h with random spacing
          const minOffset = firstJoinOffsetMs + i * (60 * 60 * 1000); // at least 1h apart
          const maxOffset = windowEndMs - (selectedGroups.length - i) * (60 * 60 * 1000);
          offsetMs = randInt(
            Math.min(minOffset, maxOffset),
            Math.max(minOffset, maxOffset)
          );
        }
        // Clamp to < 24h
        offsetMs = Math.min(offsetMs, windowEndMs - 5 * 60 * 1000);

        const runAt = new Date(now.getTime() + offsetMs);
        jobs.push({
          user_id: callerUserId,
          device_id,
          cycle_id: cycle.id,
          job_type: "join_group",
          payload: { group_id: selectedGroups[i].id, group_name: selectedGroups[i].name },
          run_at: runAt.toISOString(),
          status: "pending",
        });

        // Create instance_groups record
        await db.from("warmup_instance_groups").insert({
          user_id: callerUserId,
          device_id,
          group_id: selectedGroups[i].id,
          cycle_id: cycle.id,
          join_status: "pending",
        });
      }

      // Schedule phase_transition at first_24h_ends_at
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
        message: `Ciclo iniciado: ${days_total || 14} dias, chip ${chip_state || "new"}, ${selectedGroups.length} grupos selecionados`,
        meta: { groups: selectedGroups.map(g => g.name), budget_target: budgetTarget },
      });

      return new Response(JSON.stringify({ ok: true, cycle_id: cycle.id, jobs_scheduled: jobs.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════
    // ACTION: pause
    // ════════════════════════════════════════
    if (action === "pause") {
      if (!callerUserId) throw new Error("pause requires authenticated user");
      const { device_id } = body;

      // Find active cycle
      const { data: cycle } = await db
        .from("warmup_cycles")
        .select("id")
        .eq("device_id", device_id)
        .eq("user_id", callerUserId)
        .eq("is_running", true)
        .neq("phase", "completed")
        .single();

      if (!cycle) throw new Error("No active cycle found");

      // Pause cycle
      await db.from("warmup_cycles").update({ is_running: false, phase: "paused" }).eq("id", cycle.id);

      // Cancel pending jobs
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
        .select("id, user_id, device_id, phase, is_running, day_index, days_total, chip_state, daily_interaction_budget_used, daily_unique_recipients_used, first_24h_ends_at, started_at")
        .eq("device_id", device_id)
        .eq("user_id", callerUserId)
        .eq("phase", "paused")
        .single();

      if (!cycle) throw new Error("No paused cycle found");

      // Determine appropriate phase based on first_24h
      const now = new Date();
      const first24hEnds = new Date(cycle.first_24h_ends_at);
      let resumePhase = "groups_only";
      if (now < first24hEnds) resumePhase = "pre_24h";

      await db.from("warmup_cycles").update({
        is_running: true,
        phase: resumePhase,
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

      await db.from("warmup_audit_logs").insert({
        user_id: callerUserId, device_id, cycle_id: cycle.id,
        level: "info", event_type: "cycle_resumed", message: `Aquecimento retomado, fase: ${resumePhase}`,
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
    // ACTION: tick — delegate to warmup-tick
    // ════════════════════════════════════════
    return new Response(JSON.stringify({ error: "Use warmup-tick endpoint for tick processing" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Warmup engine error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
