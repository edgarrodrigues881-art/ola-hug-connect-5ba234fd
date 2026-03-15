/**
 * warmup-tick v5.0 — Job Processor
 *
 * Responsabilidades:
 *   - tick:   Processar jobs pendentes (join_group, interactions, phase transitions, daily reset)
 *   - daily:  Trigger manual de reset diário
 *
 * NÃO gerencia ciclos de vida — isso é responsabilidade do warmup-engine.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ══════════════════════════════════════════════════════════
// CORS & HELPERS
// ══════════════════════════════════════════════════════════
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function backoffMinutes(attempt: number): number {
  return [5, 15, 60, 180, 360][Math.min(attempt, 4)];
}

// ══════════════════════════════════════════════════════════
// PHASE RULES — Must match warmup-engine exactly
// ══════════════════════════════════════════════════════════

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
// VOLUME CONFIG — Must match warmup-engine exactly
// ══════════════════════════════════════════════════════════

interface DayVolumes {
  groupMsgs: number;
  autosaveContacts: number;
  autosaveRounds: number;
  communityPeers: number;
  communityMsgsPerPeer: number;
}

function getVolumes(chipState: string, dayIndex: number, phase: string): DayVolumes {
  const v: DayVolumes = {
    groupMsgs: 0, autosaveContacts: 0, autosaveRounds: 0,
    communityPeers: 0, communityMsgsPerPeer: 0,
  };
  if (["pre_24h", "completed", "paused", "error"].includes(phase)) return v;

  v.groupMsgs = chipState === "unstable" ? randInt(15, 25) : randInt(25, 50);

  if (["autosave_enabled", "community_enabled", "community_light"].includes(phase)) {
    v.autosaveContacts = 5;
    v.autosaveRounds = chipState === "recovered" ? 2 : 3;
  }

  if (["community_enabled", "community_light"].includes(phase)) {
    const groupsEnd = getGroupsEndDay(chipState);
    const communityDay = dayIndex - (groupsEnd + 2) + 1;
    const peerScale = [0, 3, 5, 10, 10, 15, 20, 25, 30, 35, 40];
    v.communityPeers = communityDay <= 0 ? 0 : peerScale[Math.min(communityDay, peerScale.length - 1)];
    v.communityMsgsPerPeer = v.communityPeers > 0 ? randInt(30, 50) : 0;
  }

  return v;
}

// ══════════════════════════════════════════════════════════
// OPERATING WINDOW
// ══════════════════════════════════════════════════════════

function calculateWindow(forced = false): { effectiveStart: number; effectiveEnd: number } | null {
  const now = new Date();
  const ws = new Date(now); ws.setUTCHours(10, 0, 0, 0);
  const we = new Date(now); we.setUTCHours(22, 0, 0, 0);
  const nowMs = now.getTime();

  if (forced && nowMs >= we.getTime()) {
    return { effectiveStart: nowMs, effectiveEnd: nowMs + 2 * 3600000 };
  }
  if (nowMs < ws.getTime()) return { effectiveStart: ws.getTime(), effectiveEnd: we.getTime() };
  if (nowMs >= we.getTime()) return null;
  return { effectiveStart: nowMs, effectiveEnd: we.getTime() };
}

function isWithinOperatingWindow(): boolean {
  const now = new Date();
  const ws = new Date(now); ws.setUTCHours(10, 0, 0, 0);
  const we = new Date(now); we.setUTCHours(22, 0, 0, 0);
  return now.getTime() >= ws.getTime() && now.getTime() < we.getTime();
}

function getBrtDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function ensureNextDailyResetJob(db: any, job: any, cycleId: string): Promise<void> {
  const { data: existingNextReset } = await db
    .from("warmup_jobs")
    .select("id")
    .eq("cycle_id", cycleId)
    .eq("job_type", "daily_reset")
    .eq("status", "pending")
    .gt("run_at", new Date().toISOString())
    .limit(1);

  if (existingNextReset?.length) return;

  const nextReset = new Date();
  nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  nextReset.setUTCHours(3, 5, 0, 0);

  await db.from("warmup_jobs").insert({
    user_id: job.user_id,
    device_id: job.device_id,
    cycle_id: cycleId,
    job_type: "daily_reset",
    payload: {},
    run_at: nextReset.toISOString(),
    status: "pending",
  });
}

// ══════════════════════════════════════════════════════════
// SCHEDULE DAY JOBS — Must match warmup-engine exactly
// ══════════════════════════════════════════════════════════

async function scheduleDayJobs(
  db: any, cycleId: string, userId: string, deviceId: string,
  dayIndex: number, phase: string, chipState: string, forced = false,
): Promise<number> {
  if (phase === "pre_24h" || phase === "completed") return 0;

  const window = calculateWindow(forced);
  if (!window) return 0;

  const { effectiveStart, effectiveEnd } = window;
  const windowMs = effectiveEnd - effectiveStart;
  if (windowMs < 30 * 60 * 1000) return 0;

  const volumes = getVolumes(chipState, dayIndex, phase);
  const jobs: any[] = [];

  // Group interactions
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

  // Autosave interactions (last 3h)
  if (volumes.autosaveContacts > 0 && volumes.autosaveRounds > 0) {
    const total = volumes.autosaveContacts * volumes.autosaveRounds;
    const asStart = Math.max(effectiveEnd - 3 * 3600000, effectiveStart);
    const asSpacing = (effectiveEnd - asStart) / (total + 1);
    for (let r = 0; r < volumes.autosaveRounds; r++) {
      for (let c = 0; c < volumes.autosaveContacts; c++) {
        const idx = r * volumes.autosaveContacts + c;
        const offset = asSpacing * (idx + 1) + randInt(0, Math.floor(asSpacing * 0.3));
        const runAt = new Date(asStart + offset);
        if (runAt.getTime() > effectiveEnd) break;
        jobs.push({
          user_id: userId, device_id: deviceId, cycle_id: cycleId,
          job_type: "autosave_interaction",
          payload: { recipient_index: c, msg_index: r },
          run_at: runAt.toISOString(), status: "pending",
        });
      }
    }
  }

  // Community interactions (bursts)
  if (volumes.communityPeers > 0 && volumes.communityMsgsPerPeer > 0) {
    const pw = windowMs / volumes.communityPeers;
    for (let p = 0; p < volumes.communityPeers; p++) {
      const convStart = effectiveStart + pw * p + randInt(0, Math.floor(pw * 0.1));
      for (let m = 0; m < volumes.communityMsgsPerPeer; m++) {
        const runAt = new Date(convStart + m * randInt(30, 120) * 1000);
        if (runAt.getTime() > effectiveEnd) break;
        jobs.push({
          user_id: userId, device_id: deviceId, cycle_id: cycleId,
          job_type: "community_interaction",
          payload: { peer_index: p, msg_index: m, is_image: Math.random() < 0.25 },
          run_at: runAt.toISOString(), status: "pending",
        });
      }
    }
  }

  // Phase transitions
  if (phase === "groups_only" && dayIndex >= getGroupsEndDay(chipState)) {
    jobs.push({
      user_id: userId, device_id: deviceId, cycle_id: cycleId,
      job_type: "enable_autosave", payload: {},
      run_at: new Date(effectiveEnd - 60000).toISOString(), status: "pending",
    });
  }
  if (phase === "autosave_enabled") {
    jobs.push({
      user_id: userId, device_id: deviceId, cycle_id: cycleId,
      job_type: "enable_community", payload: {},
      run_at: new Date(effectiveEnd - 60000).toISOString(), status: "pending",
    });
  }

  // Insert jobs
  for (let i = 0; i < jobs.length; i += 100) {
    await db.from("warmup_jobs").insert(jobs.slice(i, i + 100));
  }

  // Update budget
  const interactionCount = jobs.filter(j =>
    ["group_interaction", "autosave_interaction", "community_interaction"].includes(j.job_type)
  ).length;

  await db.from("warmup_cycles").update({
    daily_interaction_budget_target: interactionCount,
    daily_interaction_budget_min: Math.floor(interactionCount * 0.8),
    daily_interaction_budget_max: Math.ceil(interactionCount * 1.2),
    daily_interaction_budget_used: 0,
    daily_unique_recipients_used: 0,
    updated_at: new Date().toISOString(),
  }).eq("id", cycleId);

  console.log(`[scheduleDayJobs] Day ${dayIndex} (${phase}/${chipState}): ${jobs.length} jobs`);
  return jobs.length;
}

// ══════════════════════════════════════════════════════════
// ENSURE JOIN GROUP JOBS
// ══════════════════════════════════════════════════════════

async function ensureJoinGroupJobs(db: any, cycleId: string, userId: string, deviceId: string) {
  const { data: existing } = await db.from("warmup_jobs")
    .select("id").eq("cycle_id", cycleId).eq("job_type", "join_group")
    .in("status", ["pending", "running"]).limit(1);
  if (existing?.length > 0) return 0;

  const { data: pending } = await db.from("warmup_instance_groups")
    .select("group_id, warmup_groups_pool(id, name)")
    .eq("device_id", deviceId).eq("join_status", "pending");
  if (!pending?.length) return 0;

  const shuffled = pending.sort(() => Math.random() - 0.5);
  const nowMs = Date.now();
  const joinJobs: any[] = [];
  let cumMs = randInt(5, 15) * 60000;

  for (const g of shuffled) {
    joinJobs.push({
      user_id: userId, device_id: deviceId, cycle_id: cycleId,
      job_type: "join_group",
      payload: { group_id: g.group_id, group_name: g.warmup_groups_pool?.name || "Grupo" },
      run_at: new Date(nowMs + cumMs).toISOString(), status: "pending",
    });
    cumMs += randInt(5, 30) * 60000;
  }

  if (joinJobs.length > 0) await db.from("warmup_jobs").insert(joinJobs);
  return joinJobs.length;
}

// ══════════════════════════════════════════════════════════
// MESSAGE GENERATOR — 80,000+ variations
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
  "como foi a viagem", "já mudou de apartamento", "como tá o cachorro novo",
  "conseguiu aquele emprego", "como foi a formatura", "já marcou a consulta",
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
];

const EMOJIS_POOL = [
  "🙂", "😂", "😅", "😄", "👍", "🙏", "🔥", "👀", "😎", "🤝",
  "😊", "🤔", "💯", "👏", "✌️", "🎉", "🙌", "😁", "🤗", "👌",
  "💪", "🌟", "⭐", "😃", "🤙", "👋", "❤️", "😆", "🫡", "🤣",
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
  "muito bom esse conteúdo, parabéns por compartilhar com a gente",
  "cara isso é muito verdade, passei por algo parecido recentemente",
  "valeu demais pela informação, vou aplicar no meu dia a dia",
  "isso é exatamente o que eu precisava ouvir hoje, obrigado",
  "conteúdo de qualidade como sempre, continue assim",
];

const OPINIOES = [
  "acho que esse ano vai ser diferente", "to otimista com o futuro",
  "cada vez mais difícil achar coisa boa", "o mercado tá complicado",
  "tô repensando muita coisa na vida", "preciso descansar mais",
  "quero viajar mais esse ano", "preciso focar na saúde",
  "tô curtindo mais ficar em casa", "o tempo tá passando rápido demais",
  "tô aprendendo a ter mais paciência", "as coisas estão melhorando",
  "cada dia é uma conquista", "tô mais seletivo com meu tempo",
  "quero investir mais em mim", "o importante é ter paz",
  "tô priorizando o que importa", "a vida tá mudando pra melhor",
];

const COTIDIANO = [
  "acabei de almoçar agora", "tô no trânsito parado", "choveu demais aqui",
  "acordei cedo hoje", "café da manhã top hoje", "fui na feira agora cedo",
  "limpei a casa inteira", "fiz um churrasco ontem", "passei no mercado agora",
  "tô esperando o delivery", "acabei de sair da academia", "lavei o carro hoje",
  "fiz um bolo caseiro", "tô estudando uma coisa nova", "voltei a ler",
  "comecei a caminhar de manhã", "troquei a tela do celular",
  "arrumei o quarto todo", "cozinhei pela primeira vez em semanas",
  "tô assistindo uma série boa", "fui cortar o cabelo", "dormi super bem ontem",
  "tomei um açaí agora", "pedi uma pizza pra comemorar", "fiz uma compra online",
];

const DICAS_GERAIS = [
  "vi um restaurante bom pra indicar", "descobri um app muito bom",
  "tem uma série nova que vale a pena", "aprendi um truque legal ontem",
  "achei um lugar ótimo pra passear", "tem uma promoção boa hoje",
  "recomendo demais aquele livro", "testei uma receita incrível",
  "achei um canal no youtube muito bom", "descobri um café ótimo aqui perto",
];

const REFLEXOES = [
  "sabe o que eu penso, a gente tem que aproveitar cada momento porque passa muito rápido",
  "ontem eu tava lembrando de como as coisas eram diferentes uns anos atrás",
  "às vezes eu paro pra pensar no quanto a gente evoluiu",
  "tô numa fase da vida que tô priorizando paz e tranquilidade",
  "faz tempo que eu queria falar isso, mas a vida corrida não deixa",
  "eu acho que o segredo da vida é ter equilíbrio",
  "essa semana foi intensa demais, mas no final deu tudo certo",
  "tô aprendendo que nem tudo precisa de resposta imediata",
];

const HISTORIAS_CURTAS = [
  "ontem aconteceu uma coisa engraçada, eu fui no mercado e encontrei um amigo que não via há anos",
  "meu vizinho adotou um cachorro e agora o bicho late o dia inteiro mas ele é muito fofo",
  "fui almoçar num restaurante novo e a comida era tão boa que já marquei de voltar",
  "tentei fazer uma receita nova e deu tudo errado mas pelo menos a cozinha ficou cheirosa",
  "meu filho falou uma coisa tão engraçada ontem que eu quase chorei de rir",
  "fui numa loja comprar uma coisa e saí com cinco",
  "tava dirigindo e vi o pôr do sol mais bonito que já vi na vida",
  "hoje de manhã o café ficou perfeito, daquele jeito que a gente gosta",
  "recebi uma mensagem de um amigo antigo e matamos a saudade conversando por horas",
];

const PERGUNTAS_LONGAS = [
  "ei, tudo bem? faz tempo que não conversamos, queria saber como está sua vida",
  "opa, lembrei de você agora, como estão as coisas por aí?",
  "queria te perguntar uma coisa, você já foi naquele lugar que me indicou?",
  "fala, como tá? vi umas fotos suas e parece que tá tudo bem",
  "e aí, conseguiu resolver aquela situação que tava te preocupando?",
];

const FRASES_NUMERO = [
  "faz {n} dias que pensei nisso", "já tem uns {n} dias", "faz uns {n} dias",
  "uns {n} meses atrás", "a gente se viu uns {n} dias atrás",
];

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
  const maxLen = context === "autosave" ? 40 : 250;
  for (let attempt = 0; attempt < 80; attempt++) {
    const msg = buildMsg(context);
    if (msg.length >= 5 && msg.length <= maxLen && !recentMsgs.includes(msg)) {
      recentMsgs.push(msg);
      if (recentMsgs.length > MAX_RECENT) recentMsgs.shift();
      return msg;
    }
  }
  const fb = (context === "community" || context === "autosave")
    ? pickRandom(RESPOSTAS_CURTAS)
    : `${pickRandom(SAUDACOES)} ${pickRandom(PERGUNTAS)}?`;
  return fb.substring(0, maxLen);
}

function buildMsg(ctx: MsgCtx): string {
  if (ctx === "autosave") {
    const s = randInt(1, 6);
    if (s === 1) return pickRandom(RESPOSTAS_CURTAS);
    if (s === 2) return cap(maybeEmoji(pickRandom(SAUDACOES)));
    if (s === 3) return cap(maybeEmoji(`${pickRandom(SAUDACOES)}, ${pickRandom(PERGUNTAS)}?`));
    if (s === 4) return cap(maybeEmoji(`${pickRandom(PERGUNTAS)}?`));
    if (s === 5) return pickRandom(RESPOSTAS_CURTAS) + " " + pickRandom(EMOJIS_POOL);
    return cap(maybeEmoji(pickRandom(SAUDACOES)));
  }

  const s = randInt(1, 24);
  if (s === 1) return pickRandom(RESPOSTAS_CURTAS);
  if (s === 2) return cap(maybeEmoji(pickRandom(SAUDACOES)));
  if (s <= 4) return cap(maybeEmoji(`${pickRandom(SAUDACOES)} ${pickRandom(PERGUNTAS)}?`));
  if (s <= 6) return cap(maybeEmoji(`${pickRandom(PERGUNTAS)}?`));
  if (s <= 8) {
    let m = pickRandom(COMENTARIOS);
    if (Math.random() < 0.4) m += `, ${pickRandom(COMPLEMENTOS)}`;
    return cap(maybeEmoji(m));
  }
  if (s <= 10) return cap(maybeEmoji(pickRandom(OPINIOES)));
  if (s <= 12) return cap(maybeEmoji(pickRandom(COTIDIANO)));
  if (s === 13) return cap(maybeEmoji(pickRandom(DICAS_GERAIS)));
  if (s === 14) return cap(maybeEmoji(`${pickRandom(SAUDACOES)}, ${pickRandom(COMENTARIOS)}`));
  if (s === 15) {
    const f = pickRandom(FRASES_NUMERO).replace("{n}", String(randInt(2, 15)));
    return cap(maybeEmoji(f));
  }
  if (s === 16) return cap(maybeEmoji(`${pickRandom(SAUDACOES)}, ${pickRandom(OPINIOES)}`));
  if (s <= 18) return cap(maybeEmoji(pickRandom(REFLEXOES)));
  if (s <= 20) return cap(maybeEmoji(pickRandom(HISTORIAS_CURTAS)));
  if (s === 21) return cap(maybeEmoji(pickRandom(PERGUNTAS_LONGAS)));
  if (s === 22) return cap(maybeEmoji(`${pickRandom(SAUDACOES)}, ${pickRandom(COTIDIANO)}. ${pickRandom(COMPLEMENTOS)}`));
  if (s === 23) return cap(maybeEmoji(`${pickRandom(COMENTARIOS)}, ${pickRandom(OPINIOES)}`));
  if (ctx === "group") return cap(maybeEmoji(pickRandom(FRASES_GRUPO)));
  if (ctx === "community") return Math.random() < 0.3 ? pickRandom(RESPOSTAS_CURTAS) : cap(maybeEmoji(pickRandom(HISTORIAS_CURTAS)));
  return cap(maybeEmoji(pickRandom(REFLEXOES)));
}

// ══════════════════════════════════════════════════════════
// UAZAPI COMMUNICATION
// ══════════════════════════════════════════════════════════

async function uazapiSendText(baseUrl: string, token: string, number: string, text: string) {
  const res = await fetch(`${baseUrl}/send/text`, {
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

const _blobCache: Record<string, string> = {};

async function uazapiSendImage(baseUrl: string, token: string, number: string, imageUrl: string, caption: string) {
  if (!imageUrl) throw new Error("Image URL ausente");
  const safeCaption = (caption || "📸").trim() || "📸";

  const parseResponse = async (res: Response) => {
    const raw = await res.text();
    if (!raw) return { ok: true };
    try { return JSON.parse(raw); } catch { return { raw }; }
  };

  const tryEndpoints = async (endpoints: Array<{ url: string; body: Record<string, unknown> }>, label: string) => {
    let lastErr = "";
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", token, Accept: "application/json" },
          body: JSON.stringify(ep.body),
        });
        if (res.ok) return { ok: true as const, data: await parseResponse(res) };
        const errText = await res.text();
        lastErr = `${res.status} @ ${ep.url}: ${errText.substring(0, 240)}`;
        if (res.status !== 405) console.warn(`[uazapiSendImage] ${lastErr}`);
      } catch (e) { lastErr = `${ep.url}: ${e.message}`; }
    }
    return { ok: false as const, lastErr };
  };

  // Strategy 1: direct URL
  const urlResult = await tryEndpoints([
    { url: `${baseUrl}/send/media`, body: { number, file: imageUrl, caption: safeCaption, text: safeCaption } },
    { url: `${baseUrl}/send/media`, body: { number, file: imageUrl, caption: safeCaption } },
    { url: `${baseUrl}/send/image`, body: { number, image: imageUrl, caption: safeCaption, text: safeCaption } },
  ], "url");
  if (urlResult.ok) return urlResult.data;

  // Strategy 2: base64 fallback
  let dataUri = _blobCache[imageUrl];
  if (!dataUri) {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
    const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
    const bytes = new Uint8Array(await imgRes.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    dataUri = `data:${mimeType};base64,${btoa(binary)}`;
    _blobCache[imageUrl] = dataUri;
  }

  const b64Result = await tryEndpoints([
    { url: `${baseUrl}/send/media`, body: { number, file: dataUri, caption: safeCaption, text: safeCaption } },
    { url: `${baseUrl}/send/image`, body: { number, image: dataUri, caption: safeCaption, text: safeCaption } },
  ], "b64");
  if (b64Result.ok) return b64Result.data;

  throw new Error(`Image send failed: ${b64Result.lastErr || urlResult.lastErr}`);
}

// ══════════════════════════════════════════════════════════
// IMAGE POOL
// ══════════════════════════════════════════════════════════

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
  "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&q=80",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80",
  "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=800&q=80",
  "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=800&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
];

let _imagePoolCache: string[] | null = null;

async function getImagePool(db: any): Promise<string[]> {
  if (_imagePoolCache) return _imagePoolCache;
  try {
    const { data: files, error } = await db.storage.from("media").list("warmup-media", { limit: 100 });
    if (!error && files?.length > 0) {
      const base = `${SUPABASE_URL}/storage/v1/object/public/media/warmup-media`;
      const imgs = files
        .filter((f: any) => f.name && !f.name.startsWith(".") && /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name))
        .map((f: any) => `${base}/${encodeURIComponent(f.name)}`);
      if (imgs.length > 0) {
        _imagePoolCache = [...imgs, ...FALLBACK_IMAGES];
        return _imagePoolCache;
      }
    }
  } catch (_e) { /* fallback */ }
  _imagePoolCache = FALLBACK_IMAGES;
  return _imagePoolCache;
}

const IMAGE_CAPTIONS = [
  "Olha que lindo isso 📸", "Registro do dia ✨", "Momento especial 🙌",
  "Curti demais essa foto", "Olha que coisa boa 🔥", "Isso aqui tá demais",
  "Que cenário incrível", "Achei muito bonito isso", "Olha o que encontrei hoje",
  "Dia abençoado 🙏", "Vale a pena registrar", "Momento de paz ☀️",
  "Cada dia uma conquista", "Simplesmente perfeito 💯", "A vida é boa demais",
  "Natureza sempre surpreende 🌿", "Que energia boa", "Olha essa beleza",
  "Pra guardar na memória", "Isso me faz feliz 😊", "Olha que show",
  "Quando a vida é boa 😎", "Registro pra eternidade", "Obrigado Deus 🙌",
];

function pickMediaType(): "text" | "image" {
  return Math.random() < 0.75 ? "text" : "image";
}

// ══════════════════════════════════════════════════════════
// CONNECTED STATUS
// ══════════════════════════════════════════════════════════
const CONNECTED_STATUSES = ["Ready", "Connected", "authenticated"];
const INTERACTION_JOB_TYPES = ["group_interaction", "autosave_interaction", "community_interaction"];

// ══════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const secret = req.headers.get("x-internal-secret");
  const expectedSecret = Deno.env.get("INTERNAL_TICK_SECRET");
  const authHeader = req.headers.get("authorization") || "";

  if (!(expectedSecret && secret === expectedSecret) && !authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  try {
    if (body.action === "daily") return await handleDailyReset(db);
    return await handleTick(db);
  } catch (err) {
    console.error("[warmup-tick] Error:", err.message);
    return json({ error: err.message }, 500);
  }
});

// ══════════════════════════════════════════════════════════
// TICK HANDLER
// ══════════════════════════════════════════════════════════

async function handleTick(db: any) {
  const now = new Date().toISOString();
  const withinWindow = isWithinOperatingWindow();

  // Cancel stale interaction jobs outside window
  if (!withinWindow) {
    await db.from("warmup_jobs")
      .update({ status: "cancelled", last_error: "Cancelado: fora da janela 07-19 BRT" })
      .eq("status", "pending").lte("run_at", now)
      .in("job_type", INTERACTION_JOB_TYPES);
  }

  // Recover stale "running" jobs (>5min)
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await db.from("warmup_jobs")
    .update({ status: "pending", last_error: "Recuperado de estado running travado" })
    .eq("status", "running").lt("updated_at", staleThreshold);

  // Reconcile join_group jobs already joined
  {
    const { data: staleJoins } = await db.from("warmup_jobs")
      .select("id, device_id, payload")
      .eq("job_type", "join_group").eq("status", "pending").limit(500);

    if (staleJoins?.length > 0) {
      const deviceIds = [...new Set(staleJoins.map((j: any) => j.device_id))];
      const { data: joinedRecords } = await db.from("warmup_instance_groups")
        .select("device_id, group_id")
        .in("device_id", deviceIds)
        .in("join_status", ["joined", "left"]);

      if (joinedRecords?.length > 0) {
        const joinedSet = new Set(joinedRecords.map((r: any) => `${r.device_id}:${r.group_id}`));
        const toReconcile = staleJoins
          .filter((j: any) => j.payload?.group_id && joinedSet.has(`${j.device_id}:${j.payload.group_id}`))
          .map((j: any) => j.id);

        for (let i = 0; i < toReconcile.length; i += 200) {
          await db.from("warmup_jobs")
            .update({ status: "succeeded", last_error: "Auto-reconciliado" })
            .in("id", toReconcile.slice(i, i + 200));
        }
      }
    }
  }

  // Fetch pending jobs
  const { data: pendingJobs, error: fetchErr } = await db.from("warmup_jobs")
    .select("id, user_id, device_id, cycle_id, job_type, payload, run_at, status, attempts, max_attempts")
    .eq("status", "pending").lte("run_at", now)
    .order("run_at", { ascending: true }).limit(800);

  if (fetchErr) throw fetchErr;
  if (!pendingJobs?.length) return json({ ok: true, processed: 0, succeeded: 0, failed: 0 });

  // Mark as running
  const jobIds = pendingJobs.map((j: any) => j.id);
  for (let i = 0; i < jobIds.length; i += 200) {
    await db.from("warmup_jobs").update({ status: "running" }).in("id", jobIds.slice(i, i + 200));
  }

  // ── BATCH PRE-LOAD ──
  const uniqueCycleIds = [...new Set(pendingJobs.map((j: any) => j.cycle_id))];
  const uniqueUserIds = [...new Set(pendingJobs.map((j: any) => j.user_id))];
  const uniqueDeviceIds = [...new Set(pendingJobs.map((j: any) => j.device_id))];

  async function batchLoad<T>(table: string, cols: string, field: string, ids: string[], extra?: (q: any) => any): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      let q = db.from(table).select(cols).in(field, ids.slice(i, i + 200));
      if (extra) q = extra(q);
      const { data } = await q;
      if (data) results.push(...data);
    }
    return results;
  }

  const [cyclesArr, subsArr, profilesArr, devicesArr, userMsgsArr, autosaveArr, instanceGroupsArr, groupsPoolArr, imagePool] = await Promise.all([
    batchLoad<any>("warmup_cycles", "id, user_id, device_id, phase, is_running, day_index, days_total, chip_state, daily_interaction_budget_min, daily_interaction_budget_max, daily_interaction_budget_target, daily_interaction_budget_used, daily_unique_recipients_cap, daily_unique_recipients_used, first_24h_ends_at, last_daily_reset_at, next_run_at, plan_id", "id", uniqueCycleIds),
    batchLoad<any>("subscriptions", "user_id, expires_at, created_at", "user_id", uniqueUserIds, q => q.order("created_at", { ascending: false })),
    batchLoad<any>("profiles", "id, status", "id", uniqueUserIds),
    batchLoad<any>("devices", "id, status, uazapi_token, uazapi_base_url, number", "id", uniqueDeviceIds),
    batchLoad<any>("warmup_messages", "content, user_id", "user_id", uniqueUserIds),
    batchLoad<any>("warmup_autosave_contacts", "id, phone_e164, contact_name, user_id", "user_id", uniqueUserIds, q => q.eq("is_active", true).order("created_at", { ascending: true })),
    batchLoad<any>("warmup_instance_groups", "group_id, group_jid, device_id, cycle_id, join_status", "device_id", uniqueDeviceIds),
    db.from("warmup_groups_pool").select("id, external_group_ref, name").eq("is_active", true).then((r: any) => r.data || []),
    getImagePool(db),
  ]);

  // Build lookup maps
  const cyclesMap: Record<string, any> = {};
  cyclesArr.forEach((c: any) => { cyclesMap[c.id] = c; });
  const subsMap: Record<string, any> = {};
  subsArr.forEach((s: any) => { if (!subsMap[s.user_id]) subsMap[s.user_id] = s; });
  const profilesMap: Record<string, any> = {};
  profilesArr.forEach((p: any) => { profilesMap[p.id] = p; });
  const devicesMap: Record<string, any> = {};
  devicesArr.forEach((d: any) => { devicesMap[d.id] = d; });
  const userMsgsMap: Record<string, string[]> = {};
  userMsgsArr.forEach((m: any) => {
    if (!userMsgsMap[m.user_id]) userMsgsMap[m.user_id] = [];
    userMsgsMap[m.user_id].push(m.content);
  });
  const autosaveMap: Record<string, any[]> = {};
  autosaveArr.forEach((c: any) => {
    if (!autosaveMap[c.user_id]) autosaveMap[c.user_id] = [];
    autosaveMap[c.user_id].push(c);
  });
  const instanceGroupsMap: Record<string, any[]> = {};
  instanceGroupsArr.forEach((ig: any) => {
    if (!instanceGroupsMap[ig.device_id]) instanceGroupsMap[ig.device_id] = [];
    instanceGroupsMap[ig.device_id].push(ig);
  });
  const groupsPoolMap: Record<string, any> = {};
  groupsPoolArr.forEach((g: any) => { groupsPoolMap[g.id] = g; });

  console.log(`[warmup-tick] Loaded: ${cyclesArr.length} cycles, ${devicesArr.length} devices, ${pendingJobs.length} jobs`);

  const pausedCycles = new Set<string>();
  const auditLogBuffer: any[] = [];
  function bufferAudit(log: any) { auditLogBuffer.push(log); }
  async function flushAuditLogs() {
    for (let i = 0; i < auditLogBuffer.length; i += 100) {
      await db.from("warmup_audit_logs").insert(auditLogBuffer.slice(i, i + 100));
    }
  }

  // ── GROUP JOBS BY DEVICE ──
  const jobsByDevice: Record<string, any[]> = {};
  for (const job of pendingJobs) {
    if (!jobsByDevice[job.device_id]) jobsByDevice[job.device_id] = [];
    jobsByDevice[job.device_id].push(job);
  }

  let succeeded = 0;
  let failed = 0;
  const MAX_PARALLEL = 10;
  const deviceIdList = Object.keys(jobsByDevice);

  // ── PROCESS SINGLE JOB ──
  async function processJob(job: any): Promise<boolean> {
    const cycle = cyclesMap[job.cycle_id];
    if (!cycle || !cycle.is_running || pausedCycles.has(cycle.id)) {
      await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
      return false;
    }

    // Plan check
    const userSub = subsMap[cycle.user_id];
    const userProf = profilesMap[cycle.user_id];
    if (!userSub || new Date(userSub.expires_at) < new Date() || userProf?.status === "suspended" || userProf?.status === "cancelled") {
      await db.from("warmup_cycles").update({
        is_running: false, phase: "paused", previous_phase: cycle.phase,
        last_error: "Auto-pausado: plano inativo",
      }).eq("id", cycle.id);
      pausedCycles.add(cycle.id);
      cycle.is_running = false;
      await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
      return false;
    }

    // Device check
    const device = devicesMap[job.device_id];
    if (!device || !CONNECTED_STATUSES.includes(device.status)) {
      if (!pausedCycles.has(cycle.id)) {
        await db.from("warmup_cycles").update({
          is_running: false, phase: "paused", previous_phase: cycle.phase,
          last_error: "Auto-pausado: instância desconectada",
        }).eq("id", cycle.id);
        await db.from("warmup_jobs").update({ status: "cancelled" }).eq("cycle_id", cycle.id).eq("status", "pending");
        bufferAudit({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "warn", event_type: "auto_paused_disconnected",
          message: `Aquecimento pausado: instância desconectada (fase: ${cycle.phase})`,
        });
        pausedCycles.add(cycle.id);
        cycle.is_running = false;
      }
      await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
      return false;
    }

    const baseUrl = (device.uazapi_base_url || "").replace(/\/+$/, "");
    const token = device.uazapi_token || "";
    const chipState = cycle.chip_state || "new";

    // Budget check for interaction jobs
    if (INTERACTION_JOB_TYPES.includes(job.job_type)) {
      if (!withinWindow) {
        await db.from("warmup_jobs").update({ status: "cancelled", last_error: "Fora da janela 07-19 BRT" }).eq("id", job.id);
        return false;
      }
      const used = cycle.daily_interaction_budget_used || 0;
      const max = cycle.daily_interaction_budget_max || cycle.daily_interaction_budget_target || 500;
      if (used >= max) {
        await db.from("warmup_jobs").update({ status: "cancelled", last_error: `Budget atingido: ${used}/${max}` }).eq("id", job.id);
        return false;
      }
    }

    switch (job.job_type) {
      // ── JOIN GROUP ──
      case "join_group": {
        if (!baseUrl || !token) throw new Error("Credenciais UAZAPI não configuradas");

        const groupId = job.payload?.group_id;
        const groupName = job.payload?.group_name || groupId;
        const existingIGs = instanceGroupsMap[job.device_id] || [];
        const record = existingIGs.find((ig: any) => ig.group_id === groupId);

        // Skip if already joined or manually left
        if (record?.join_status === "joined") {
          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "info", event_type: "group_joined", message: `Grupo ${groupName} já joined — duplicata ignorada` });
          break;
        }
        if (record?.join_status === "left") {
          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "info", event_type: "join_group", message: `Grupo ${groupName} marcado como "left" — entrada cancelada` });
          break;
        }

        const poolGroup = groupsPoolMap[groupId];
        if (!poolGroup?.external_group_ref) throw new Error(`Grupo ${groupName} sem link de convite`);

        const inviteLink = poolGroup.external_group_ref;
        const inviteCode = inviteLink.replace(/^https?:\/\//, "").replace(/^chat\.whatsapp\.com\//, "").split("?")[0].split("/")[0].trim();
        if (!inviteCode || inviteCode.length < 10) throw new Error(`Código inválido: ${inviteLink}`);

        let joinOk = false;
        let joinJid: string | null = null;
        let joinError: string | null = null;

        const endpoints = [
          { method: "POST", url: `${baseUrl}/group/join`, body: JSON.stringify({ invitecode: inviteCode }) },
          { method: "POST", url: `${baseUrl}/group/join`, body: JSON.stringify({ invitecode: inviteLink.split("?")[0] }) },
          { method: "PUT", url: `${baseUrl}/group/acceptInviteGroup`, body: JSON.stringify({ inviteCode }) },
        ];

        for (const ep of endpoints) {
          try {
            const res = await fetch(ep.url, {
              method: ep.method,
              headers: { "Content-Type": "application/json", token, Accept: "application/json" },
              body: ep.body,
            });
            const raw = await res.text();
            let parsed: any;
            try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }

            if (res.status === 405) continue;
            if (res.status === 500 && (parsed?.error === "error joining group" || parsed?.error === "internal server error")) continue;

            if (res.ok || res.status === 409) {
              joinOk = true;
              joinJid = parsed?.group?.JID || parsed?.data?.group?.JID || parsed?.data?.JID || parsed?.gid || parsed?.groupId || parsed?.jid || null;
              const msg = (parsed?.message || parsed?.msg || "").toLowerCase();
              if (msg.includes("already") || msg.includes("já")) joinOk = true;
              break;
            } else {
              joinError = `${res.status}: ${raw.substring(0, 200)}`;
            }
          } catch (err) { joinError = err.message; }
        }

        if (joinOk) {
          await db.from("warmup_instance_groups")
            .update({ join_status: "joined", joined_at: new Date().toISOString(), ...(joinJid ? { group_jid: joinJid } : {}) })
            .eq("device_id", job.device_id).eq("group_id", groupId);
          if (record) { record.join_status = "joined"; if (joinJid) record.group_jid = joinJid; }
          bufferAudit({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "group_joined",
            message: `Entrou no grupo ${groupName}${joinJid ? ` (JID: ${joinJid})` : ""}`,
            meta: { group_name: groupName, jid: joinJid },
          });

          // ── AUTO-TRANSITION: Check if ALL groups are now joined ──
          const allIGs = instanceGroupsMap[job.device_id] || [];
          // Update local cache
          const updatedRecord = allIGs.find((ig: any) => ig.group_id === groupId);
          if (updatedRecord) updatedRecord.join_status = "joined";

          const pendingCount = allIGs.filter((ig: any) => ig.join_status === "pending").length;
          const hasMoreJoinJobs = pendingJobs.some((pj: any) =>
            pj.device_id === job.device_id && pj.job_type === "join_group" && pj.id !== job.id && pj.status !== "succeeded"
          );

          if (pendingCount === 0 && !hasMoreJoinJobs && cycle.phase === "pre_24h") {
            // All groups joined! Check if it's after 7:00 BRT (10:00 UTC)
            const now = new Date();
            const windowOpen = new Date(now);
            windowOpen.setUTCHours(10, 0, 0, 0); // 7:00 BRT

            if (now.getTime() >= windowOpen.getTime()) {
              // Already past 7:00 BRT → transition immediately and schedule messages
              await db.from("warmup_cycles").update({
                phase: "groups_only",
                day_index: 2,
                last_daily_reset_at: now.toISOString(),
              }).eq("id", cycle.id);
              cycle.phase = "groups_only";
              cycle.day_index = 2;
              cycle.last_daily_reset_at = now.toISOString();

              await scheduleDayJobs(db, cycle.id, job.user_id, job.device_id, 2, "groups_only", chipState, true);

              bufferAudit({
                user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
                level: "info", event_type: "auto_transition_post_groups",
                message: `Todos os grupos entrados! Transição automática para groups_only (dia 2). Mensagens agendadas até 19h BRT.`,
              });
            } else {
              // Before 7:00 BRT → schedule transition for 7:00 BRT
              await db.from("warmup_jobs").insert({
                user_id: job.user_id, device_id: job.device_id, cycle_id: cycle.id,
                job_type: "phase_transition",
                payload: { target_phase: "groups_only", auto_advance_day: true },
                run_at: windowOpen.toISOString(), status: "pending",
              });

              bufferAudit({
                user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
                level: "info", event_type: "groups_complete_waiting",
                message: `Todos os grupos entrados! Aguardando 07:00 BRT para iniciar mensagens.`,
              });
            }

            // Ensure daily reset is scheduled
            await ensureNextDailyResetJob(db, job, cycle.id);
          }
        } else {
          await db.from("warmup_instance_groups")
            .update({ join_status: "failed", last_error: joinError || "Falha" })
            .eq("device_id", job.device_id).eq("group_id", groupId);
          throw new Error(`Falha no grupo ${groupName}: ${joinError}`);
        }
        break;
      }

      // ── PHASE TRANSITION ──
      case "phase_transition": {
        const targetPhase = job.payload?.target_phase || "groups_only";

        await db.from("warmup_jobs")
          .update({ status: "cancelled", last_error: "Cancelado: transição de fase" })
          .eq("cycle_id", cycle.id).eq("status", "pending")
          .in("job_type", INTERACTION_JOB_TYPES);

        await db.from("warmup_cycles").update({ phase: targetPhase }).eq("id", cycle.id);

        if (targetPhase === "groups_only") {
          await ensureJoinGroupJobs(db, cycle.id, job.user_id, job.device_id);
        }

        await scheduleDayJobs(db, cycle.id, job.user_id, job.device_id, cycle.day_index, targetPhase, chipState);

        bufferAudit({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "phase_changed",
          message: `Fase: ${cycle.phase} → ${targetPhase}`,
        });
        break;
      }

      // ── GROUP INTERACTION ──
      case "group_interaction": {
        if (!baseUrl || !token) throw new Error("Credenciais UAZAPI não configuradas");

        const allIGs = instanceGroupsMap[job.device_id] || [];
        const joinedGroups = allIGs.filter((ig: any) => ig.join_status === "joined");
        if (joinedGroups.length === 0) throw new Error("Nenhum grupo joined");

        const cachedMsgs = userMsgsMap[job.user_id];
        const getMsg = () => (cachedMsgs?.length && Math.random() < 0.3) ? pickRandom(cachedMsgs) : generateNaturalMessage("group");

        const target = pickRandom(joinedGroups);
        const poolGroup = groupsPoolMap[target.group_id];

        // Resolve JID
        let groupJid = target.group_jid;
        if (!groupJid && poolGroup?.external_group_ref?.includes("@g.us")) {
          groupJid = poolGroup.external_group_ref;
        }
        if (!groupJid) {
          try {
            const res = await fetch(`${baseUrl}/group/fetchAllGroups`, { method: "GET", headers: { token, Accept: "application/json" } });
            if (res.ok) {
              const list = await res.json();
              const groups = Array.isArray(list) ? list : (list?.data || []);
              const match = groups.find((g: any) => (g.subject || g.name || "").toLowerCase() === (poolGroup?.name || "").toLowerCase());
              if (match) {
                groupJid = match.jid || match.id || match.JID;
                if (groupJid) await db.from("warmup_instance_groups").update({ group_jid: groupJid }).eq("device_id", job.device_id).eq("group_id", target.group_id);
              }
            }
          } catch { /* ignore */ }
        }

        if (!groupJid) {
          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "warn", event_type: "group_no_jid", message: `Sem JID: ${poolGroup?.name}` });
          break;
        }

        const mediaType = pickMediaType();
        let message = getMsg();

        try {
          if (mediaType === "image") {
            const imgUrl = pickRandom(imagePool);
            const caption = pickRandom(IMAGE_CAPTIONS);
            await uazapiSendImage(baseUrl, token, groupJid, imgUrl, caption);
            message = `[IMG] ${caption}`;
          } else {
            await uazapiSendText(baseUrl, token, groupJid, message);
          }
        } catch {
          message = getMsg();
          await uazapiSendText(baseUrl, token, groupJid, message);
        }

        // Update budget (increment)
        await db.from("warmup_cycles").update({
          daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
        }).eq("id", cycle.id);
        cycle.daily_interaction_budget_used = (cycle.daily_interaction_budget_used || 0) + 1;

        bufferAudit({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "group_msg_sent",
          message: `Msg no grupo ${poolGroup?.name}: "${message.substring(0, 50)}"`,
          meta: { group_jid: groupJid, media_type: mediaType },
        });
        break;
      }

      // ── AUTOSAVE INTERACTION ──
      case "autosave_interaction": {
        if (!baseUrl || !token) throw new Error("Credenciais UAZAPI não configuradas");

        const rIdx = job.payload?.recipient_index ?? 0;
        const mIdx = job.payload?.msg_index ?? 0;
        const contacts = autosaveMap[job.user_id] || [];

        if (contacts.length === 0) {
          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "warn", event_type: "autosave_no_contacts", message: "Nenhum contato Auto Save ativo" });
          break;
        }

        const contact = contacts[rIdx % contacts.length];
        const msg = generateNaturalMessage("autosave");
        const phone = contact.phone_e164.replace(/\+/g, "");

        await uazapiSendText(baseUrl, token, phone, msg);

        try {
          await db.from("warmup_unique_recipients").insert({
            cycle_id: cycle.id, user_id: job.user_id,
            recipient_phone_e164: contact.phone_e164,
            day_date: new Date().toISOString().split("T")[0],
          });
        } catch { /* duplicate OK */ }

        await db.from("warmup_cycles").update({
          daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
          daily_unique_recipients_used: (cycle.daily_unique_recipients_used || 0) + (mIdx === 0 ? 1 : 0),
        }).eq("id", cycle.id);
        cycle.daily_interaction_budget_used = (cycle.daily_interaction_budget_used || 0) + 1;

        bufferAudit({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "autosave_msg_sent",
          message: `Auto Save: msg ${mIdx + 1} para ${contact.contact_name || phone}`,
        });
        break;
      }

      // ── COMMUNITY INTERACTION ──
      case "community_interaction": {
        if (!baseUrl || !token) throw new Error("Credenciais UAZAPI não configuradas");

        const peerIndex = job.payload?.peer_index ?? 0;
        const isImage = job.payload?.is_image === true;

        // Find peers: paired instances or other active cycles
        const { data: pairs } = await db.from("community_pairs")
          .select("id, instance_id_a, instance_id_b")
          .eq("cycle_id", cycle.id).eq("status", "active");

        const { data: otherCycles } = await db.from("warmup_cycles")
          .select("id, device_id, user_id")
          .eq("is_running", true).neq("device_id", job.device_id)
          .in("phase", ["autosave_enabled", "community_light", "community_enabled"])
          .limit(50);

        const peers: { deviceId: string; pairId?: string }[] = [];

        if (pairs?.length) {
          for (const p of pairs) {
            const partnerId = p.instance_id_a === job.device_id ? p.instance_id_b : p.instance_id_a;
            peers.push({ deviceId: partnerId, pairId: p.id });
          }
        }
        if (otherCycles?.length) {
          for (const oc of otherCycles) {
            if (!peers.some(p => p.deviceId === oc.device_id)) {
              peers.push({ deviceId: oc.device_id });
            }
          }
        }

        if (peers.length === 0) {
          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "warn", event_type: "community_no_peers", message: "Nenhum peer encontrado" });
          break;
        }

        const selectedPeer = peers[peerIndex % peers.length];
        const { data: pd } = await db.from("devices").select("number, status").eq("id", selectedPeer.deviceId).single();

        if (!pd?.number || !CONNECTED_STATUSES.includes(pd.status)) {
          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "warn", event_type: "community_peer_offline", message: `Peer ${peerIndex} offline` });
          break;
        }

        const targetPhone = pd.number.replace(/\+/g, "");

        if (isImage) {
          try {
            await uazapiSendImage(baseUrl, token, targetPhone, pickRandom(imagePool), pickRandom(IMAGE_CAPTIONS));
          } catch {
            await uazapiSendText(baseUrl, token, targetPhone, generateNaturalMessage("community"));
          }
        } else {
          await uazapiSendText(baseUrl, token, targetPhone, generateNaturalMessage("community"));
        }

        await db.from("warmup_cycles").update({
          daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
        }).eq("id", cycle.id);
        cycle.daily_interaction_budget_used = (cycle.daily_interaction_budget_used || 0) + 1;

        bufferAudit({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "community_msg_sent",
          message: `Comunitário: ${isImage ? "📷" : "💬"} peer ${peerIndex} → ${targetPhone.substring(0, 6)}...`,
        });
        break;
      }

      // ── ENABLE AUTOSAVE ──
      case "enable_autosave": {
        const { count } = await db.from("warmup_autosave_contacts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", job.user_id).eq("is_active", true);

        if (count && count > 0) {
          await db.from("warmup_cycles").update({ phase: "autosave_enabled" }).eq("id", cycle.id);

          const { data: membership } = await db.from("warmup_community_membership")
            .select("id, is_enabled").eq("device_id", job.device_id).maybeSingle();

          if (!membership) {
            await db.from("warmup_community_membership").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: cycle.id,
              is_eligible: true, is_enabled: true, enabled_at: new Date().toISOString(),
            });
          } else if (!membership.is_enabled) {
            await db.from("warmup_community_membership")
              .update({ is_enabled: true, is_eligible: true, enabled_at: new Date().toISOString(), cycle_id: cycle.id })
              .eq("id", membership.id);
          }

          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "info", event_type: "autosave_enabled", message: `Auto Save ativado: ${count} contatos` });
        } else {
          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "warn", event_type: "autosave_no_contacts", message: "Nenhum contato, mantendo fase anterior" });
        }
        break;
      }

      // ── ENABLE COMMUNITY ──
      case "enable_community": {
        await db.from("warmup_cycles").update({ phase: "community_enabled" }).eq("id", cycle.id);
        bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "info", event_type: "community_enabled", message: "Comunidade ativada" });
        break;
      }

      // ── HEALTH CHECK ──
      case "health_check": {
        bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "info", event_type: "health_check", message: `Health OK — device ${device.status}, day ${cycle.day_index}` });
        break;
      }

      // ── DAILY RESET ──
      case "daily_reset": {
        // Idempotência: nunca avançar dia 2x no mesmo dia BRT
        const nowBrtKey = getBrtDateKey(new Date());
        const lastResetBrtKey = cycle.last_daily_reset_at
          ? getBrtDateKey(new Date(cycle.last_daily_reset_at))
          : null;

        if (lastResetBrtKey === nowBrtKey) {
          await ensureNextDailyResetJob(db, job, cycle.id);
          bufferAudit({
            user_id: job.user_id,
            device_id: job.device_id,
            cycle_id: job.cycle_id,
            level: "info",
            event_type: "daily_reset_skipped",
            message: "Reset diário ignorado: já executado hoje (BRT)",
          });
          break;
        }

        // Block if still in first 24h
        const first24hEnd = new Date(cycle.first_24h_ends_at);
        if (Date.now() < first24hEnd.getTime() && cycle.phase === "pre_24h") {
          const deferred = new Date(first24hEnd);
          deferred.setUTCHours(3, 5, 0, 0);
          if (deferred.getTime() <= first24hEnd.getTime()) deferred.setUTCDate(deferred.getUTCDate() + 1);

          await db.from("warmup_jobs").update({ status: "pending", run_at: deferred.toISOString(), last_error: "" }).eq("id", job.id);
          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "info", event_type: "daily_reset_deferred", message: `Reset adiado para ${deferred.toISOString()}` });
          return false;
        }

        const newDay = (cycle.day_index || 1) + 1;

        // Check if cycle is complete
        if (newDay > cycle.days_total) {
          await db.from("warmup_cycles").update({
            is_running: false,
            phase: "completed",
            daily_interaction_budget_used: 0,
            daily_unique_recipients_used: 0,
            last_daily_reset_at: new Date().toISOString(),
          }).eq("id", cycle.id);
          cycle.is_running = false;
          cycle.phase = "completed";
          cycle.last_daily_reset_at = new Date().toISOString();
          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "info", event_type: "cycle_completed", message: `Ciclo concluído: ${cycle.days_total} dias 🎉` });
          break;
        }

        const newPhase = getPhaseForDay(newDay, chipState);

        // Cancel old interaction jobs
        await db.from("warmup_jobs")
          .update({ status: "cancelled", last_error: "Cancelado: reset diário" })
          .eq("cycle_id", cycle.id).eq("status", "pending")
          .in("job_type", [...INTERACTION_JOB_TYPES, "enable_autosave", "enable_community"]);

        const resetAt = new Date().toISOString();

        // Update day and phase
        await db.from("warmup_cycles").update({
          day_index: newDay,
          phase: newPhase,
          last_daily_reset_at: resetAt,
        }).eq("id", cycle.id);

        cycle.day_index = newDay;
        cycle.phase = newPhase;
        cycle.last_daily_reset_at = resetAt;

        const chipLabels: Record<string, string> = { new: "NOVO", recovered: "BANIDO/RECUPERAÇÃO", unstable: "CRÍTICO/INSTÁVEL" };
        bufferAudit({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "daily_reset",
          message: `Reset: dia ${newDay}/${cycle.days_total}, fase: ${newPhase}, perfil: ${chipLabels[chipState] || chipState}`,
          meta: { day: newDay, phase: newPhase },
        });

        // Schedule today's jobs
        await scheduleDayJobs(db, cycle.id, job.user_id, job.device_id, newDay, newPhase, chipState);

        // Ensure exactly one NEXT daily reset
        await ensureNextDailyResetJob(db, job, cycle.id);
        break;
      }

      default:
        console.warn(`[warmup-tick] Unknown job type: ${job.job_type}`);
        break;
    }

    return true;
  }

  // ── Process in parallel batches ──
  for (let i = 0; i < deviceIdList.length; i += MAX_PARALLEL) {
    const batch = deviceIdList.slice(i, i + MAX_PARALLEL);
    await Promise.allSettled(
      batch.map(async (did) => {
        for (const job of jobsByDevice[did]) {
          try {
            const ok = await processJob(job);
            if (ok) {
              await db.from("warmup_jobs").update({ status: "succeeded" }).eq("id", job.id);
              succeeded++;
            }
          } catch (err) {
            failed++;
            const attempts = (job.attempts || 0) + 1;
            if (attempts >= (job.max_attempts || 3)) {
              await db.from("warmup_jobs").update({ status: "failed", last_error: err.message, attempts }).eq("id", job.id);
            } else {
              const retryAt = new Date(Date.now() + backoffMinutes(attempts) * 60000).toISOString();
              await db.from("warmup_jobs").update({ status: "pending", last_error: err.message, attempts, run_at: retryAt }).eq("id", job.id);
            }
            bufferAudit({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "error", event_type: `${job.job_type}_error`,
              message: `Erro: ${err.message.substring(0, 200)}`,
              meta: { attempts, job_id: job.id },
            });
          }
        }
      })
    );
  }

  await flushAuditLogs();

  console.log(`[warmup-tick] Done: ${succeeded} ok, ${failed} fail, ${deviceIdList.length} devices`);
  return json({ ok: true, processed: succeeded + failed, succeeded, failed });
}

// ══════════════════════════════════════════════════════════
// DAILY RESET HANDLER (manual trigger)
// ══════════════════════════════════════════════════════════

async function handleDailyReset(db: any) {
  const { data: activeCycles } = await db.from("warmup_cycles")
    .select("id, user_id, device_id, day_index, days_total, chip_state, phase, first_24h_ends_at")
    .eq("is_running", true).neq("phase", "completed");

  if (!activeCycles?.length) return json({ ok: true, message: "No active cycles" });

  let processed = 0;
  for (const cycle of activeCycles) {
    // Skip if still in pre_24h
    if (Date.now() < new Date(cycle.first_24h_ends_at).getTime()) continue;

    const chipState = cycle.chip_state || "new";
    const newDay = Math.min(cycle.day_index + 1, cycle.days_total);

    if (newDay > cycle.days_total) {
      await db.from("warmup_cycles").update({ is_running: false, phase: "completed" }).eq("id", cycle.id);
      continue;
    }

    const newPhase = getPhaseForDay(newDay, chipState);

    await db.from("warmup_jobs")
      .update({ status: "cancelled", last_error: "Cancelado: reset diário manual" })
      .eq("cycle_id", cycle.id).eq("status", "pending")
      .in("job_type", [...INTERACTION_JOB_TYPES, "enable_autosave", "enable_community"]);

    await db.from("warmup_cycles").update({
      day_index: newDay, phase: newPhase,
      last_daily_reset_at: new Date().toISOString(),
      daily_interaction_budget_used: 0, daily_unique_recipients_used: 0,
    }).eq("id", cycle.id);

    await scheduleDayJobs(db, cycle.id, cycle.user_id, cycle.device_id, newDay, newPhase, chipState);

    // Schedule next daily reset
    const nextReset = new Date();
    nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    nextReset.setUTCHours(3, 5, 0, 0);
    await db.from("warmup_jobs").insert({
      user_id: cycle.user_id, device_id: cycle.device_id, cycle_id: cycle.id,
      job_type: "daily_reset", payload: {},
      run_at: nextReset.toISOString(), status: "pending",
    });

    processed++;
  }

  return json({ ok: true, cycles_reset: processed });
}
