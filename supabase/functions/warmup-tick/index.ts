import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

// ══════════════════════════════════════════════════════════
// Gerador Combinatório de Mensagens Naturais (80.000+ variações)
// ══════════════════════════════════════════════════════════

const SAUDACOES = [
  "oi", "oii", "oiii", "olá", "ola", "e aí", "eai", "eae",
  "fala", "fala aí", "salve", "opa", "hey", "ei",
  "bom dia", "boa tarde", "boa noite",
  "tudo bem", "tudo certo", "tudo joia", "tudo tranquilo",
  "e aí como tá", "e aí blz", "fala parceiro", "fala amigo",
  "oi oi", "eae mano", "fala ae", "opa tudo bem",
];

const PERGUNTAS = [
  "como está seu cachorro", "como está a casa nova", "conseguiu terminar a mudança",
  "como está o trabalho", "como está sua família", "como foi seu dia",
  "está tudo bem por aí", "como estão as coisas aí", "conseguiu resolver aquilo",
  "como está o tempo aí", "ainda mora no mesmo lugar", "está tudo tranquilo por aí",
  "o cachorro já melhorou", "a casa nova ficou boa", "o dia foi corrido hoje",
  "como tá o projeto", "já resolveu aquele problema", "como tá a saúde",
  "como foi a semana", "como tá o pessoal aí", "já conseguiu aquilo",
  "como anda o serviço", "resolveu aquela questão", "como está o carro",
  "como tá a reforma", "o que aprontou hoje", "como foi o fds",
  "já voltou de viagem", "como tá o clima aí", "ainda tá naquela empresa",
  "como anda o treino", "como tá o estudo", "já fez a prova",
  "como foi a entrevista", "como está o bairro novo", "como tá a internet aí",
  "já arrumou a moto", "como foi o almoço", "como tá a dieta",
  "já comprou aquilo", "como está o filho", "a obra já terminou",
  "como ficou a festa", "como foi a reunião", "o médico falou o quê",
  "já trocou de celular", "como tá a academia", "como foi o passeio",
  "já assistiu aquele filme", "como tá o novo emprego",
];

const COMENTARIOS = [
  "hoje o dia foi corrido", "aqui está bem tranquilo", "estou resolvendo umas coisas",
  "hoje trabalhei bastante", "estou organizando tudo aqui", "aqui está tudo certo",
  "hoje foi puxado", "estou vendo umas coisas aqui", "tô meio ocupado hoje",
  "aqui tá de boa", "dia longo hoje", "finalmente deu uma folga",
  "tô correndo atrás das coisas", "hoje rendeu bastante", "tô resolvendo umas pendências",
  "aqui tá tudo na paz", "dia cheio mas tá indo", "tô focado aqui no trabalho",
  "hoje foi tranquilo", "semana puxada essa", "tô organizando umas ideias",
  "hoje foi produtivo", "tô de olho em umas coisas", "por aqui tudo certo",
  "mandando ver no trabalho", "hoje foi correria pura", "tô no corre mas tá suave",
  "dia movimentado hoje", "por aqui tá tranquilo", "tô planejando uns negócios",
];

const COMPLEMENTOS = [
  "faz tempo que não falamos", "lembrei disso agora", "estava pensando nisso",
  "vi algo parecido hoje", "estava lembrando disso", "me veio na cabeça agora",
  "pensei nisso mais cedo", "lembrei de vc", "tava pensando aqui",
  "me falaram disso", "vi vc online e lembrei", "alguém comentou isso",
  "pensei nisso ontem", "me lembrou uma coisa", "queria saber mais",
  "fiquei curioso", "me disseram sobre isso", "tava com isso na cabeça",
  "lembrei na hora", "queria te perguntar",
];

const EMOJIS_POOL = [
  "🙂", "😂", "😅", "😄", "👍", "🙏", "🔥", "👀", "😎", "🤝",
  "😊", "🤔", "💯", "👏", "✌️", "🎉", "🙌", "😁", "🤗", "👌",
  "💪", "🌟", "⭐", "😃", "🤙", "👋", "❤️", "😆", "🫡", "🤣",
];

const FRASES_NUMERO = [
  "faz {n} dias que pensei nisso", "já tem uns {n} dias", "isso aconteceu em {a}",
  "faz uns {n} dias", "já tem uns {n} anos", "faz {n} semanas",
  "uns {n} meses atrás", "a gente se viu uns {n} dias atrás",
  "faz {n} dias já", "lá pra {n} horas atrás",
];

const RESPOSTAS_CURTAS = [
  "ss", "sim", "aham", "uhum", "pode crer", "exato",
  "verdade", "isso aí", "com certeza", "claro",
  "tá certo", "beleza", "blz", "joia", "show",
  "massa", "dahora", "top", "boa", "firmeza",
  "haha", "kkk", "kkkk", "rsrs",
  "é mesmo", "pois é", "né", "sei",
  "entendi", "ah sim", "faz sentido", "de boa",
];

const FRASES_GRUPO = [
  "concordo", "muito bom isso", "ótimo ponto",
  "valeu por compartilhar", "obrigado pela dica",
  "interessante demais", "vou aplicar isso",
  "sensacional", "mandou bem", "parabéns pelo conteúdo",
  "curti muito", "tô acompanhando",
  "alguém mais concorda", "boa semana a todos",
  "continue postando", "excelente informação",
  "salvei aqui", "bom demais", "tamo junto",
  "quem mais tá acompanhando",
];

// Track recent messages to avoid repetition
const recentMsgs: string[] = [];
const MAX_RECENT = 200;

function maybeEmoji(msg: string): string {
  const r = Math.random();
  if (r < 0.55) return msg;
  if (r < 0.85) return `${msg} ${pickRandom(EMOJIS_POOL)}`;
  return `${msg} ${pickRandom(EMOJIS_POOL)}${pickRandom(EMOJIS_POOL)}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type MsgCtx = "group" | "private" | "autosave" | "community";

function generateNaturalMessage(context: MsgCtx = "group"): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const msg = buildMsg(context);
    if (msg.length >= 10 && msg.length <= 60 && !recentMsgs.includes(msg)) {
      recentMsgs.push(msg);
      if (recentMsgs.length > MAX_RECENT) recentMsgs.shift();
      return msg;
    }
  }
  // Fallback
  const fb = context === "community" ? pickRandom(RESPOSTAS_CURTAS) : `${pickRandom(SAUDACOES)} ${pickRandom(PERGUNTAS)}?`;
  return fb.substring(0, 60);
}

function buildMsg(ctx: MsgCtx): string {
  const s = randInt(1, 10);
  if (s <= 3) return cap(maybeEmoji(`${pickRandom(SAUDACOES)} ${pickRandom(PERGUNTAS)}?`));
  if (s <= 5) return cap(maybeEmoji(`${pickRandom(PERGUNTAS)}?`));
  if (s <= 7) {
    let m = pickRandom(COMENTARIOS);
    if (Math.random() < 0.3) m += `, ${pickRandom(COMPLEMENTOS)}`;
    return cap(maybeEmoji(m));
  }
  if (s === 8) return cap(maybeEmoji(`${pickRandom(SAUDACOES)}, ${pickRandom(COMENTARIOS)}`));
  if (s === 9) {
    const f = pickRandom(FRASES_NUMERO).replace("{n}", String(randInt(2, 15))).replace("{a}", String(randInt(2019, 2025)));
    return cap(maybeEmoji(f));
  }
  // s === 10: context-specific
  if (ctx === "group") return cap(maybeEmoji(pickRandom(FRASES_GRUPO)));
  if (ctx === "community") return Math.random() < 0.4 ? pickRandom(RESPOSTAS_CURTAS) : cap(maybeEmoji(`${pickRandom(PERGUNTAS)}?`));
  return cap(maybeEmoji(pickRandom(SAUDACOES)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const secret = req.headers.get("x-internal-secret");
  const expectedSecret = Deno.env.get("INTERNAL_TICK_SECRET");
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  let body: any = {};
  try { body = await req.json(); } catch (_e) { /* ignore */ }

  const action = body.action || "tick";

  try {
    if (action === "daily") {
      return await handleDailyReset(db);
    }
    return await handleTick(db);
  } catch (err) {
    console.error("[warmup-tick] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ──
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function backoffMinutes(attempt: number): number {
  return [5, 15, 60, 180, 360][Math.min(attempt, 4)];
}

// ── Phase rules per chip_state ──
function getPhaseForDayNew(day: number): string {
  if (day <= 1) return "pre_24h";
  if (day <= 2) return "groups_only";
  if (day <= 4) return "autosave_enabled";
  if (day <= 6) return "community_light";
  return "community_enabled";
}

function getPhaseForDayRecovered(day: number): string {
  if (day <= 1) return "pre_24h";
  if (day <= 3) return "groups_only";
  if (day <= 4) return "autosave_enabled";
  if (day <= 7) return "community_light";
  return "community_enabled";
}

function getPhaseForDayUnstable(day: number): string {
  if (day <= 1) return "pre_24h";
  if (day <= 5) return "groups_only";
  if (day <= 10) return "autosave_enabled";
  return "community_light";
}

function getPhaseForDay(day: number, chipState: string): string {
  if (chipState === "recovered") return getPhaseForDayRecovered(day);
  if (chipState === "unstable") return getPhaseForDayUnstable(day);
  return getPhaseForDayNew(day);
}

async function uazapiSendText(baseUrl: string, token: string, number: string, text: string) {
  const url = `${baseUrl}/send/text`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", token, Accept: "application/json" },
    body: JSON.stringify({ number, text }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText}`);
  }
  return await res.json();
}

// ════════════════════════════════════════
// TICK HANDLER — process pending jobs
// ════════════════════════════════════════
async function handleTick(db: any) {
  const now = new Date().toISOString();

  const { data: pendingJobs, error: fetchErr } = await db
    .from("warmup_jobs")
    .select("id, user_id, device_id, cycle_id, job_type, payload, run_at, status, attempts, max_attempts")
    .eq("status", "pending")
    .lte("run_at", now)
    .order("run_at", { ascending: true })
    .limit(20);

  if (fetchErr) throw fetchErr;

  if (!pendingJobs || pendingJobs.length === 0) {
    const { data: nextPending } = await db
      .from("warmup_jobs")
      .select("run_at")
      .eq("status", "pending")
      .order("run_at", { ascending: true })
      .limit(1);

    return json({ ok: true, processed_jobs_count: 0, succeeded: 0, failed: 0, next_pending_run_at: nextPending?.[0]?.run_at || null });
  }

  // Mark as running
  const jobIds = pendingJobs.map((j: any) => j.id);
  await db.from("warmup_jobs").update({ status: "running" }).in("id", jobIds);

  let succeeded = 0;
  let failed = 0;

  for (const job of pendingJobs) {
    try {
      // ── Get cycle ──
      const { data: cycle } = await db
        .from("warmup_cycles")
        .select("id, user_id, device_id, phase, is_running, day_index, days_total, chip_state, daily_interaction_budget_min, daily_interaction_budget_max, daily_interaction_budget_target, daily_interaction_budget_used, daily_unique_recipients_cap, daily_unique_recipients_used, first_24h_ends_at, last_daily_reset_at, next_run_at, plan_id")
        .eq("id", job.cycle_id)
        .single();

      if (!cycle || !cycle.is_running) {
        await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
        continue;
      }

      // ── PLAN CHECK ──
      const { data: userSub } = await db
        .from("subscriptions")
        .select("expires_at")
        .eq("user_id", cycle.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: userProf } = await db.from("profiles").select("status").eq("id", cycle.user_id).maybeSingle();
      if (!userSub || new Date(userSub.expires_at) < new Date() || userProf?.status === "suspended" || userProf?.status === "cancelled") {
        await db.from("warmup_cycles").update({
          is_running: false, phase: "paused", previous_phase: cycle.phase,
          last_error: "Auto-pausado: plano inativo",
        }).eq("id", cycle.id);
        await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
        continue;
      }

      // ── Device check ──
      const { data: device } = await db
        .from("devices")
        .select("status, uazapi_token, uazapi_base_url")
        .eq("id", job.device_id)
        .single();

      if (!device || device.status !== "Ready") {
        if (cycle.phase !== "paused") {
          await db.from("warmup_cycles").update({
            is_running: false, phase: "paused", previous_phase: cycle.phase,
            last_error: "Auto-pausado: instância desconectada",
          }).eq("id", cycle.id);
          await db.from("warmup_jobs").update({ status: "cancelled" }).eq("cycle_id", cycle.id).eq("status", "pending");
          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "warn", event_type: "auto_paused_disconnected",
            message: `Aquecimento pausado: instância desconectada (fase: ${cycle.phase})`,
          });
        }
        await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
        continue;
      }

      const baseUrl = (device.uazapi_base_url || "").replace(/\/+$/, "");
      const token = device.uazapi_token || "";

      // ── Process job by type ──
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
            message: `Fase alterada: ${cycle.phase} → ${targetPhase}`,
            meta: { from: cycle.phase, to: targetPhase },
          });
          break;
        }

        case "group_interaction": {
          if (!baseUrl || !token) {
            throw new Error("Credenciais UAZAPI não configuradas");
          }

          const { data: joinedGroups } = await db
            .from("warmup_instance_groups")
            .select("group_id")
            .eq("device_id", job.device_id)
            .eq("cycle_id", cycle.id)
            .eq("join_status", "joined");

          if (!joinedGroups || joinedGroups.length === 0) {
            throw new Error("Nenhum grupo joined encontrado");
          }

          const { data: userMsgs } = await db
            .from("warmup_messages")
            .select("content")
            .eq("user_id", job.user_id);

          const msgPool = (userMsgs && userMsgs.length > 0)
            ? userMsgs.map((m: any) => m.content)
            : groupMessages;

          const targetGroupRecord = pickRandom(joinedGroups);
          const { data: poolGroup } = await db
            .from("warmup_groups_pool")
            .select("external_group_ref, name")
            .eq("id", targetGroupRecord.group_id)
            .single();

          if (!poolGroup?.external_group_ref) {
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "group_no_jid",
              message: `Grupo sem JID externo: ${poolGroup?.name || targetGroupRecord.group_id}`,
            });
            break;
          }

          const message = pickRandom(msgPool);
          await uazapiSendText(baseUrl, token, poolGroup.external_group_ref, message);

          await db.from("warmup_cycles").update({
            daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
          }).eq("id", cycle.id);

          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "group_msg_sent",
            message: `Msg enviada no grupo ${poolGroup.name}: "${message.substring(0, 50)}"`,
            meta: { group_name: poolGroup.name, group_jid: poolGroup.external_group_ref },
          });
          break;
        }

        case "autosave_interaction": {
          if (!baseUrl || !token) {
            throw new Error("Credenciais UAZAPI não configuradas");
          }

          const recipientIndex = job.payload?.recipient_index ?? 0;
          const msgIndex = job.payload?.msg_index ?? 0;

          const { data: contacts } = await db
            .from("warmup_autosave_contacts")
            .select("id, phone_e164, contact_name")
            .eq("user_id", job.user_id)
            .eq("is_active", true)
            .order("created_at", { ascending: true });

          if (!contacts || contacts.length === 0) {
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "autosave_no_contacts",
              message: "Nenhum contato Auto Save ativo",
            });
            break;
          }

          const contact = contacts[recipientIndex % contacts.length];
          const message = pickRandom(autosaveMessages);
          const phoneNumber = contact.phone_e164.replace(/\+/g, "");

          await uazapiSendText(baseUrl, token, phoneNumber, message);

          const todayStr = new Date().toISOString().split("T")[0];
          await db.from("warmup_unique_recipients").insert({
            cycle_id: cycle.id,
            user_id: job.user_id,
            recipient_phone_e164: contact.phone_e164,
            day_date: todayStr,
          }).catch(() => {});

          await db.from("warmup_cycles").update({
            daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
            daily_unique_recipients_used: (cycle.daily_unique_recipients_used || 0) + (msgIndex === 0 ? 1 : 0),
          }).eq("id", cycle.id);

          const msgsPerContact = cycle.chip_state === "recovered" ? 2 : 3;
          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "autosave_msg_sent",
            message: `Auto Save: msg ${msgIndex + 1}/${msgsPerContact} para ${contact.contact_name || phoneNumber}`,
            meta: { phone: phoneNumber, msg_index: msgIndex },
          });
          break;
        }

        case "community_interaction": {
          if (!baseUrl || !token) {
            throw new Error("Credenciais UAZAPI não configuradas");
          }

          const { data: pairs } = await db
            .from("community_pairs")
            .select("id, instance_id_a, instance_id_b")
            .eq("cycle_id", cycle.id)
            .eq("status", "active");

          if (!pairs || pairs.length === 0) {
            const { data: otherCycles } = await db
              .from("warmup_cycles")
              .select("id, device_id, user_id")
              .eq("is_running", true)
              .neq("device_id", job.device_id)
              .in("phase", ["community_light", "community_enabled"])
              .limit(10);

            if (otherCycles && otherCycles.length > 0) {
              const pairTarget = pickRandom(otherCycles);
              const { data: partnerDevice } = await db
                .from("devices")
                .select("number, status")
                .eq("id", pairTarget.device_id)
                .single();

              if (partnerDevice?.number && partnerDevice.status === "Ready") {
                const phoneNumber = partnerDevice.number.replace(/\+/g, "");
                const message = pickRandom(communityMessages);

                await uazapiSendText(baseUrl, token, phoneNumber, message);

                await db.from("warmup_cycles").update({
                  daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
                }).eq("id", cycle.id);

                await db.from("warmup_audit_logs").insert({
                  user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
                  level: "info", event_type: "community_msg_sent",
                  message: `Comunitário: msg para instância parceira (${phoneNumber.substring(0, 6)}...)`,
                  meta: { partner_device: pairTarget.device_id },
                });
              } else {
                await db.from("warmup_audit_logs").insert({
                  user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
                  level: "warn", event_type: "community_no_partner",
                  message: "Nenhum parceiro comunitário online encontrado",
                });
              }
            } else {
              await db.from("warmup_audit_logs").insert({
                user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
                level: "warn", event_type: "community_no_peers",
                message: "Nenhuma instância elegível para pareamento comunitário",
              });
            }
            break;
          }

          const pair = pickRandom(pairs);
          const isA = pair.instance_id_a === job.device_id;
          const partnerId = isA ? pair.instance_id_b : pair.instance_id_a;

          const { data: partnerDevice } = await db
            .from("devices")
            .select("number, status")
            .eq("id", partnerId)
            .single();

          if (partnerDevice?.number && partnerDevice.status === "Ready") {
            const phoneNumber = partnerDevice.number.replace(/\+/g, "");
            const message = pickRandom(communityMessages);

            await uazapiSendText(baseUrl, token, phoneNumber, message);

            await db.from("warmup_cycles").update({
              daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
            }).eq("id", cycle.id);

            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "info", event_type: "community_msg_sent",
              message: `Comunitário: msg para parceiro (pair ${pair.id.substring(0, 8)})`,
              meta: { pair_id: pair.id, partner_device: partnerId },
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
          if (!["autosave_enabled", "community_light"].includes(cycle.phase)) {
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "community_blocked",
              message: "Comunidade bloqueada: fase pré-requisito não ativa",
            });
            break;
          }
          const targetPhase = job.payload?.target_phase || "community_light";
          await db.from("warmup_cycles").update({ phase: targetPhase }).eq("id", cycle.id);
          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "phase_changed",
            message: `Comunidade habilitada: ${targetPhase}`,
          });
          break;
        }

        case "daily_reset": {
          const newDay = Math.min(cycle.day_index + 1, cycle.days_total);
          const chipState = cycle.chip_state || "new";

          if (newDay > cycle.days_total) {
            await db.from("warmup_cycles").update({
              is_running: false, phase: "completed",
              daily_interaction_budget_used: 0, daily_unique_recipients_used: 0,
            }).eq("id", cycle.id);
            await db.from("warmup_audit_logs").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "info", event_type: "cycle_completed",
              message: `Ciclo concluído após ${cycle.days_total} dias 🎉`,
            });
            break;
          }

          const newPhase = getPhaseForDay(newDay, chipState);

          // Set budgets based on chip_state + phase
          let budgetMin: number, budgetMax: number;
          if (newPhase === "pre_24h") {
            budgetMin = 3; budgetMax = 8;
          } else if (chipState === "unstable") {
            // Ultra-conservative for unstable
            if (newPhase === "groups_only") { budgetMin = 50; budgetMax = 120; }
            else if (newPhase === "autosave_enabled") { budgetMin = 126; budgetMax = 228; }
            else { budgetMin = 170; budgetMax = 410; } // community_light max
          } else if (chipState === "recovered") {
            if (newPhase === "groups_only") { budgetMin = 80; budgetMax = 150; }
            else if (newPhase === "autosave_enabled") { budgetMin = 120; budgetMax = 260; }
            else if (newPhase === "community_light") { budgetMin = 150; budgetMax = 340; }
            else { budgetMin = 180; budgetMax = 460; }
          } else {
            budgetMin = 200; budgetMax = 500;
          }

          const newTarget = randInt(budgetMin, budgetMax);

          await db.from("warmup_cycles").update({
            daily_interaction_budget_used: 0,
            daily_unique_recipients_used: 0,
            daily_interaction_budget_target: newTarget,
            daily_interaction_budget_min: budgetMin,
            daily_interaction_budget_max: budgetMax,
            day_index: newDay,
            phase: newPhase,
            last_daily_reset_at: new Date().toISOString(),
          }).eq("id", cycle.id);

          const chipLabels: Record<string, string> = { new: "NOVO", recovered: "RECUPERAÇÃO", unstable: "SENSÍVEL" };
          const chipLabel = chipLabels[chipState] || chipState.toUpperCase();
          await db.from("warmup_audit_logs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "daily_reset",
            message: `Reset diário [${chipLabel}]: dia ${newDay}/${cycle.days_total}, fase: ${newPhase}, budget: ${newTarget}`,
            meta: { day: newDay, phase: newPhase, budget_target: newTarget, chip_state: chipState },
          });

          // Schedule today's interaction jobs using chip_state-aware volumes
          await scheduleDayJobs(db, cycle.id, job.user_id, job.device_id, newDay, newPhase, chipState);

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
// Volume configuration per chip_state
// ════════════════════════════════════════
interface DayVolumes {
  groupMsgs: number;
  autosaveContacts: number;
  autosaveMsgsPerContact: number;
  autosaveTotal: number;
  communityPairs: number;
  communityMsgsPerPair: number;
}

function getVolumes(chipState: string, dayIndex: number, phase: string): DayVolumes {
  if (chipState === "recovered") return getVolumesRecovered(dayIndex, phase);
  if (chipState === "unstable") return getVolumesUnstable(dayIndex, phase);
  return getVolumesNew(phase);
}

function getVolumesNew(phase: string): DayVolumes {
  const v: DayVolumes = { groupMsgs: 0, autosaveContacts: 0, autosaveMsgsPerContact: 3, autosaveTotal: 0, communityPairs: 0, communityMsgsPerPair: 0 };
  if (["groups_only", "autosave_enabled", "community_light", "community_enabled"].includes(phase)) {
    v.groupMsgs = randInt(200, 500);
  }
  if (["autosave_enabled", "community_light", "community_enabled"].includes(phase)) {
    v.autosaveContacts = 5; v.autosaveMsgsPerContact = 3; v.autosaveTotal = 15;
  }
  if (phase === "community_light") { v.communityPairs = randInt(3, 5); v.communityMsgsPerPair = randInt(15, 30); }
  if (phase === "community_enabled") { v.communityPairs = randInt(5, 10); v.communityMsgsPerPair = randInt(15, 30); }
  return v;
}

function getVolumesRecovered(dayIndex: number, phase: string): DayVolumes {
  const v: DayVolumes = { groupMsgs: 0, autosaveContacts: 0, autosaveMsgsPerContact: 2, autosaveTotal: 0, communityPairs: 0, communityMsgsPerPair: 0 };
  if (phase === "pre_24h") return v;
  if (phase === "groups_only") { v.groupMsgs = randInt(80, 150); return v; }
  if (phase === "autosave_enabled") {
    v.groupMsgs = randInt(120, 250); v.autosaveContacts = 3; v.autosaveMsgsPerContact = 2; v.autosaveTotal = 6;
    return v;
  }
  if (phase === "community_light") {
    v.groupMsgs = randInt(120, 250); v.autosaveContacts = 5; v.autosaveMsgsPerContact = 2; v.autosaveTotal = 10;
    v.communityPairs = randInt(2, 4); v.communityMsgsPerPair = randInt(10, 20);
    return v;
  }
  if (phase === "community_enabled") {
    v.groupMsgs = randInt(150, 350); v.autosaveContacts = 5; v.autosaveMsgsPerContact = 2; v.autosaveTotal = 10;
    v.communityPairs = randInt(4, 8); v.communityMsgsPerPair = randInt(15, 25);
    return v;
  }
  return v;
}

function getVolumesUnstable(dayIndex: number, phase: string): DayVolumes {
  const v: DayVolumes = { groupMsgs: 0, autosaveContacts: 0, autosaveMsgsPerContact: 2, autosaveTotal: 0, communityPairs: 0, communityMsgsPerPair: 0 };
  if (phase === "pre_24h") return v;
  // Day 2-5: groups_only — 50-120 msgs
  if (phase === "groups_only") { v.groupMsgs = randInt(50, 120); return v; }
  // Day 6-10: autosave_enabled
  if (phase === "autosave_enabled") {
    if (dayIndex <= 6) {
      v.groupMsgs = randInt(120, 200); v.autosaveContacts = 3; v.autosaveMsgsPerContact = 2; v.autosaveTotal = 6;
    } else {
      v.groupMsgs = randInt(120, 220);
      const contacts = randInt(3, 4);
      v.autosaveContacts = contacts; v.autosaveMsgsPerContact = 2; v.autosaveTotal = contacts * 2;
    }
    return v;
  }
  // Day 11-30: community_light — groups 150-300, autosave 5×2=10, community 2-5 × 10-20
  if (phase === "community_light") {
    v.groupMsgs = randInt(150, 300); v.autosaveContacts = 5; v.autosaveMsgsPerContact = 2; v.autosaveTotal = 10;
    v.communityPairs = randInt(2, 5); v.communityMsgsPerPair = randInt(10, 20);
    return v;
  }
  return v;
}

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
) {
  const now = new Date();
  const jobs: any[] = [];

  // Activity window BRT → UTC:
  // new: 07:00-19:00 (10:00-22:00 UTC)
  // recovered: 08:00-19:00 (11:00-22:00 UTC)
  // unstable: 09:00-18:00 (12:00-21:00 UTC)
  const today = new Date(now);
  const windowStartUTC = new Date(today);
  const startHourUTC = chipState === "unstable" ? 12 : chipState === "recovered" ? 11 : 10;
  const endHourUTC = chipState === "unstable" ? 21 : 22;
  windowStartUTC.setUTCHours(startHourUTC, 0, 0, 0);
  const windowEndUTC = new Date(today);
  windowEndUTC.setUTCHours(endHourUTC, 0, 0, 0);

  const effectiveStart = Math.max(now.getTime(), windowStartUTC.getTime());
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
  if (volumes.autosaveTotal > 0) {
    const asSpacingMs = windowMs / volumes.autosaveTotal;
    for (let i = 0; i < volumes.autosaveTotal; i++) {
      const baseOffset = asSpacingMs * i;
      const jitter = randInt(0, Math.floor(asSpacingMs * 0.4));
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd) break;
      jobs.push({
        user_id: userId, device_id: deviceId, cycle_id: cycleId,
        job_type: "autosave_interaction",
        payload: { recipient_index: Math.floor(i / volumes.autosaveMsgsPerContact), msg_index: i % volumes.autosaveMsgsPerContact },
        run_at: runAt.toISOString(), status: "pending",
      });
    }
  }

  // ── COMMUNITY INTERACTIONS ──
  if (volumes.communityPairs > 0 && volumes.communityMsgsPerPair > 0) {
    const totalCommunityMsgs = volumes.communityPairs * volumes.communityMsgsPerPair;
    const cmSpacingMs = windowMs / totalCommunityMsgs;
    for (let i = 0; i < totalCommunityMsgs; i++) {
      const pairIndex = Math.floor(i / volumes.communityMsgsPerPair);
      const baseOffset = cmSpacingMs * i;
      const jitter = randInt(0, Math.floor(cmSpacingMs * 0.3));
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd) break;
      jobs.push({
        user_id: userId, device_id: deviceId, cycle_id: cycleId,
        job_type: "community_interaction",
        payload: { pair_index: pairIndex, pairs_total: volumes.communityPairs, msgs_per_pair: volumes.communityMsgsPerPair },
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

  console.log(`[warmup-tick] Scheduled ${jobs.length} jobs for day ${dayIndex} (${phase}, chip: ${chipState})`);
  return jobs.length;
}

// ════════════════════════════════════════
// DAILY RESET HANDLER
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
