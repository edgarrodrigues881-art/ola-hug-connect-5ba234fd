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
  if (chipState === "unstable") return 7;
  if (chipState === "recovered") return 5;
  return 4; // new
}

function getPhaseForDay(day: number, chipState: string): string {
  if (day <= 1) return "pre_24h";
  const groupsEnd = getGroupsEndDay(chipState);
  if (day <= groupsEnd) return "groups_only";
  if (day === groupsEnd + 1) return "autosave_enabled";
  return "community_enabled";
}

// ══════════════════════════════════════════════════════════
// VOLUME CONFIG — 50 to 120 messages/day total (must match engine)
// ══════════════════════════════════════════════════════════

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

function getCommunityPeers(dayIndex: number, chipState: string): number {
  const communityStartDay = getGroupsEndDay(chipState) + 2;
  const daysSinceCommunity = dayIndex - communityStartDay;
  if (daysSinceCommunity < 0) return 0;
  // Progressão segura: 2→3→4→5→6→7 pares (volume total < 350 msgs/dia)
  if (daysSinceCommunity <= 1) return 2;   // dias 0-1: 2 pares
  if (daysSinceCommunity <= 5) return 3;   // dias 2-5: 3 pares
  if (daysSinceCommunity <= 10) return 4;  // dias 6-10: 4 pares
  if (daysSinceCommunity <= 15) return 5;  // dias 11-15: 5 pares
  if (daysSinceCommunity <= 20) return 6;  // dias 16-20: 6 pares
  return 7;                                // dias 21+: 7 pares (teto)
}

function getCommunityBurstsPerPeer(dayIndex: number, chipState: string): number {
  const communityStartDay = getGroupsEndDay(chipState) + 2;
  const daysSinceCommunity = dayIndex - communityStartDay;
  if (daysSinceCommunity < 0) return 0;
  // Bursts por par escalam suavemente: 4→5→5→6→6→7
  if (daysSinceCommunity <= 1) return 4;
  if (daysSinceCommunity <= 5) return 5;
  if (daysSinceCommunity <= 10) return 5;
  if (daysSinceCommunity <= 15) return 6;
  if (daysSinceCommunity <= 20) return 6;
  return 7;
}

function getVolumes(chipState: string, dayIndex: number, phase: string): DayVolumes {
  const v: DayVolumes = {
    groupMsgs: 0, autosaveContacts: 0, autosaveRounds: 0,
    communityPeers: 0, communityMsgsPerPeer: 0,
  };
  if (["pre_24h", "completed", "paused", "error"].includes(phase)) return v;

  // Grupos SEMPRE recebem o orçamento total (50-120)
  v.groupMsgs = getDailyBudget();

  // Autosave como BÔNUS extra (10-15 interações) quando fase permitir
  if (["autosave_enabled", "community_enabled", "community_light"].includes(phase)) {
    v.autosaveContacts = 5;
    v.autosaveRounds = 5; // 5 contatos × 5 msgs = 25 msgs/dia
  }

  // Community: progressão segura — volume total < 350 msgs/dia
  // Cada burst = 3-7 msgs de uma vez (conversa real)
  if (phase === "community_enabled") {
    v.communityPeers = getCommunityPeers(dayIndex, chipState);
    v.communityMsgsPerPeer = getCommunityBurstsPerPeer(dayIndex, chipState);
  }

  return v;
}

// ══════════════════════════════════════════════════════════
// OPERATING WINDOW — 07:00-19:00 BRT (exact timezone)
// ══════════════════════════════════════════════════════════

function getBrtTodayAt(hour: number, minute = 0): Date {
  const brtDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
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
  const [y, m, d] = brtDateStr.split("-").map(Number);
  result.setUTCFullYear(y, m - 1, d);
  result.setUTCHours(hour - offsetHours, minute, 0, 0);
  return result;
}

function calculateWindow(forced = false): { effectiveStart: number; effectiveEnd: number } | null {
  const now = new Date();
  const nowMs = now.getTime();
  const startMs = getBrtTodayAt(7).getTime();
  const endMs = getBrtTodayAt(19).getTime();

  if (forced && nowMs >= endMs) {
    return { effectiveStart: nowMs, effectiveEnd: nowMs + 2 * 3600000 };
  }
  if (nowMs < startMs) return { effectiveStart: startMs, effectiveEnd: endMs };
  if (nowMs >= endMs) return null;
  return { effectiveStart: nowMs, effectiveEnd: endMs };
}

function isWithinOperatingWindow(): boolean {
  const now = new Date();
  return now.getTime() >= getBrtTodayAt(7).getTime() && now.getTime() < getBrtTodayAt(19).getTime();
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

  // Cancel existing pending interaction jobs before creating new ones (prevent duplicates)
  await db.from("warmup_jobs")
    .update({ status: "cancelled", last_error: "Substituído por novo agendamento" })
    .eq("cycle_id", cycleId).eq("status", "pending")
    .in("job_type", ["group_interaction", "autosave_interaction", "community_interaction"]);

  const jobs: any[] = [];

  // Group interactions — primeiro job entre 1-5 min após abertura da janela
  if (volumes.groupMsgs > 0) {
    const firstJobOffset = randInt(60, 300) * 1000; // 1-5 min após abertura
    const remainingWindow = windowMs - firstJobOffset;
    const spacing = remainingWindow / Math.max(volumes.groupMsgs, 1);
    for (let i = 0; i < volumes.groupMsgs; i++) {
      const offset = firstJobOffset + spacing * i + randInt(-60, 60) * 1000;
      const runAt = new Date(effectiveStart + Math.max(offset, 60000));
      if (runAt.getTime() > effectiveEnd) break;
      jobs.push({
        user_id: userId, device_id: deviceId, cycle_id: cycleId,
        job_type: "group_interaction", payload: {},
        run_at: runAt.toISOString(), status: "pending",
      });
    }
  }

  // Autosave: contact-by-contact, 3 msgs each, 4-7 min gaps, spread through day
  if (volumes.autosaveContacts > 0 && volumes.autosaveRounds > 0) {
    const asWindowMs = effectiveEnd - effectiveStart;
    const asStartOffset = randInt(
      Math.floor(asWindowMs * 0.1),
      Math.floor(asWindowMs * 0.4)
    );
    let cursor = effectiveStart + asStartOffset;

    for (let c = 0; c < volumes.autosaveContacts; c++) {
      // Check window BEFORE starting a new contact — never break mid-contact
      if (cursor > effectiveEnd) break;
      for (let r = 0; r < volumes.autosaveRounds; r++) {
        jobs.push({
          user_id: userId, device_id: deviceId, cycle_id: cycleId,
          job_type: "autosave_interaction",
          payload: { recipient_index: c, msg_index: r },
          run_at: new Date(Math.min(cursor, effectiveEnd)).toISOString(), status: "pending",
        });
        cursor += randInt(4, 7) * 60 * 1000;
      }
      cursor += randInt(5, 10) * 60 * 1000;
    }
  }

  // Community bursts — each job = 1 burst of 3-7 msgs (real conversation)
  // 8-12 bursts per peer, spaced ~40-90 min apart to fill the 12h window
  if (volumes.communityPeers > 0 && volumes.communityMsgsPerPeer > 0) {
    for (let p = 0; p < volumes.communityPeers; p++) {
      const convStartOffset = randInt(5, 20) * 60 * 1000 + p * randInt(5, 15) * 60 * 1000;
      let cursor = effectiveStart + convStartOffset;

      // Space bursts evenly across the window with jitter
      const burstsForPeer = volumes.communityMsgsPerPeer;
      const remainingWindow = effectiveEnd - cursor;
      const baseSpacing = Math.floor(remainingWindow / Math.max(burstsForPeer, 1));

      for (let m = 0; m < burstsForPeer; m++) {
        if (cursor > effectiveEnd - 5 * 60 * 1000) break; // leave 5min margin for burst execution

        jobs.push({
          user_id: userId, device_id: deviceId, cycle_id: cycleId,
          job_type: "community_interaction",
          payload: { peer_index: p, burst_index: m },
          run_at: new Date(cursor).toISOString(), status: "pending",
        });

        // Space between bursts: baseSpacing ± 20% jitter
        const jitter = randInt(-Math.floor(baseSpacing * 0.2), Math.floor(baseSpacing * 0.2));
        cursor += Math.max(baseSpacing + jitter, 15 * 60 * 1000); // minimum 15min between bursts
      }
    }
  }

  // Phase transitions — Autosave reativado, community desativado
  if (phase === "groups_only" && dayIndex >= getGroupsEndDay(chipState)) {
    jobs.push({
      user_id: userId, device_id: deviceId, cycle_id: cycleId,
      job_type: "enable_autosave", payload: {},
      run_at: new Date(effectiveEnd - 60000).toISOString(), status: "pending",
    });
  }
  // Enable community on the day after autosave
  if (phase === "autosave_enabled") {
    const communityDay = getGroupsEndDay(chipState) + 2;
    if (dayIndex >= communityDay - 1) {
      jobs.push({
        user_id: userId, device_id: deviceId, cycle_id: cycleId,
        job_type: "enable_community", payload: {},
        run_at: new Date(effectiveEnd - 60000).toISOString(), status: "pending",
      });
    }
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
  "muito bom esse conteúdo, parabéns por compartilhar com a gente",
  "cara isso é muito verdade, passei por algo parecido recentemente",
  "valeu demais pela informação, vou aplicar no meu dia a dia",
  "isso é exatamente o que eu precisava ouvir hoje, obrigado",
  "conteúdo de qualidade como sempre, continue assim que tá ótimo",
  "concordo demais com isso, acho que muita gente deveria ver",
  "alguém mais concorda com isso? acho que faz muito sentido",
  "tamo junto pessoal, boa semana pra todos nós aqui do grupo",
  "continue postando esse tipo de coisa, faz muita diferença pra gente",
  "excelente informação, salvei aqui pra compartilhar depois com a família",
  "mandou muito bem nessa postagem, curti demais o conteúdo",
  "quem mais tá acompanhando esse grupo? tá cada vez melhor o conteúdo",
  "valeu por compartilhar isso com a gente, muito bom mesmo",
  "interessante demais essa informação, vou pesquisar mais sobre isso",
  "parabéns pelo conteúdo de qualidade, a gente aprende muito aqui",
  "boa demais essa dica, já passei pra frente pra quem precisa",
];

const OPINIOES = [
  "acho que esse ano vai ser diferente, tenho muita esperança de dias melhores",
  "tô otimista com o futuro, muita coisa boa vindo por aí se Deus quiser",
  "cada vez mais difícil achar coisa boa, mas a gente segue firme e forte",
  "o mercado tá complicado, mas quem se esforça sempre encontra oportunidade",
  "tô repensando muita coisa na vida, acho que faz parte do crescimento",
  "preciso descansar mais, o corpo pede e a gente tem que ouvir né",
  "quero viajar mais esse ano, já tô até pesquisando alguns destinos legais",
  "preciso focar na saúde, comecei a me alimentar melhor essa semana",
  "tô curtindo mais ficar em casa, é bom demais ter paz e sossego",
  "o tempo tá passando rápido demais, parece que ontem era janeiro",
  "tô aprendendo a ter mais paciência, nem tudo acontece no nosso tempo",
  "as coisas estão melhorando aos poucos, cada dia é uma vitória",
  "cada dia é uma conquista, a gente tem que valorizar cada momento",
  "tô mais seletivo com meu tempo, aprendi que isso é muito importante",
  "quero investir mais em mim esse ano, tanto pessoal quanto profissional",
  "o importante é ter paz de espírito, o resto a gente vai resolvendo",
  "tô priorizando o que importa de verdade na minha vida agora",
  "a vida tá mudando pra melhor, e eu tô muito grato por isso",
];

const COTIDIANO = [
  "acabei de almoçar agora, comi muito bem hoje graças a Deus",
  "tô no trânsito parado faz uns vinte minutos, tá osso",
  "choveu demais aqui na região, parecia que não ia parar nunca",
  "acordei cedo hoje e aproveitei pra resolver umas coisas pendentes",
  "café da manhã ficou top hoje, fiz aquele capricho todo especial",
  "fui na feira agora cedo e encontrei umas frutas maravilhosas",
  "limpei a casa inteira, tá brilhando, dá gosto de ver",
  "fiz um churrasco ontem com a família, ficou muito bom",
  "passei no mercado agora e comprei umas coisas pro almoço de amanhã",
  "tô esperando o delivery, já tá com fome demais aqui",
  "acabei de sair da academia, treino pesado mas valeu a pena",
  "lavei o carro hoje, tava precisando muito, tava imundo",
  "fiz um bolo caseiro pra família e ficou uma delícia",
  "tô estudando uma coisa nova, é difícil mas tô gostando bastante",
  "voltei a ler depois de muito tempo, tô curtindo muito",
  "comecei a caminhar de manhã e já tô sentindo diferença no corpo",
  "troquei a tela do celular que tava rachada há meses",
  "arrumei o quarto todo, ficou muito bom, dá vontade de ficar lá",
  "cozinhei pela primeira vez em semanas e lembrei como é bom",
  "tô assistindo uma série boa demais, não consigo parar de ver",
  "fui cortar o cabelo hoje e ficou do jeito que eu queria",
  "dormi super bem ontem, acordei renovado, fazia tempo que não dormia assim",
  "tomei um açaí agora com granola e banana, melhor coisa do mundo",
  "pedi uma pizza pra comemorar o final de semana, merecido demais",
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
  const minLen = (context === "group" || context === "community") ? 60 : 5;
  for (let attempt = 0; attempt < 120; attempt++) {
    const msg = buildMsg(context);
    if (msg.length >= minLen && msg.length <= maxLen && !recentMsgs.includes(msg)) {
      recentMsgs.push(msg);
      if (recentMsgs.length > MAX_RECENT) recentMsgs.shift();
      return msg;
    }
  }
  // Fallback: always combine multiple parts to guarantee length
  let fb = `${pickRandom(SAUDACOES)}, ${pickRandom(COTIDIANO)}. ${pickRandom(OPINIOES)}. ${pickRandom(COMPLEMENTOS)}`;
  if (fb.length < minLen) fb += ` ${pickRandom(REFLEXOES)}`;
  return cap(maybeEmoji(fb)).substring(0, maxLen);
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

  const s = randInt(1, 28);
  // Slots 1-2: short phrases (will be filtered out by minLen=30 for groups, retried)
  if (s === 1) return pickRandom(RESPOSTAS_CURTAS);
  if (s === 2) return cap(maybeEmoji(pickRandom(SAUDACOES)));
  // Slots 3-6: medium combos
  if (s <= 4) return cap(maybeEmoji(`${pickRandom(SAUDACOES)}, ${pickRandom(PERGUNTAS)}?`));
  if (s <= 6) return cap(maybeEmoji(`${pickRandom(PERGUNTAS)}?`));
  // Slots 7-10: comments + complements (longer)
  if (s <= 8) {
    let m = pickRandom(COMENTARIOS);
    m += `, ${pickRandom(COMPLEMENTOS)}`;
    return cap(maybeEmoji(m));
  }
  if (s <= 10) return cap(maybeEmoji(`${pickRandom(OPINIOES)}. ${pickRandom(COMPLEMENTOS)}`));
  // Slots 11-14: longer content
  if (s <= 12) return cap(maybeEmoji(`${pickRandom(COTIDIANO)}. ${pickRandom(COMPLEMENTOS)}`));
  if (s === 13) return cap(maybeEmoji(`${pickRandom(DICAS_GERAIS)}. ${pickRandom(COMPLEMENTOS)}`));
  if (s === 14) return cap(maybeEmoji(`${pickRandom(SAUDACOES)}, ${pickRandom(COMENTARIOS)}. ${pickRandom(COMPLEMENTOS)}`));
  if (s === 15) {
    const f = pickRandom(FRASES_NUMERO).replace("{n}", String(randInt(2, 15)));
    return cap(maybeEmoji(`${f}, ${pickRandom(COMENTARIOS)}`));
  }
  if (s === 16) return cap(maybeEmoji(`${pickRandom(SAUDACOES)}, ${pickRandom(OPINIOES)}`));
  // Slots 17-22: reflexões e histórias (naturally long)
  if (s <= 19) return cap(maybeEmoji(pickRandom(REFLEXOES)));
  if (s <= 22) return cap(maybeEmoji(pickRandom(HISTORIAS_CURTAS)));
  if (s === 23) return cap(maybeEmoji(pickRandom(PERGUNTAS_LONGAS)));
  if (s === 24) return cap(maybeEmoji(`${pickRandom(SAUDACOES)}, ${pickRandom(COTIDIANO)}. ${pickRandom(COMPLEMENTOS)}`));
  if (s === 25) return cap(maybeEmoji(`${pickRandom(COMENTARIOS)}, ${pickRandom(OPINIOES)}`));
  if (s <= 27 && ctx === "group") return cap(maybeEmoji(`${pickRandom(FRASES_GRUPO)}. ${pickRandom(COMPLEMENTOS)}`));
  if (ctx === "community") return cap(maybeEmoji(`${pickRandom(HISTORIAS_CURTAS)}. ${pickRandom(COMPLEMENTOS)}`));
  return cap(maybeEmoji(`${pickRandom(REFLEXOES)}. ${pickRandom(COMPLEMENTOS)}`));
}

// ══════════════════════════════════════════════════════════
// UAZAPI COMMUNICATION
// ══════════════════════════════════════════════════════════

async function uazapiSendText(baseUrl: string, token: string, number: string, text: string) {
  const attempts: Array<{ path: string; body: Record<string, unknown> }> = [
    { path: "/send/text", body: { number, text } },
    { path: "/chat/send-text", body: { number, to: number, chatId: number, body: text, text } },
    { path: "/message/sendText", body: { chatId: number, text } },
    { path: "/message/sendText", body: { to: number, text } },
  ];

  let lastErr = "";
  for (const at of attempts) {
    try {
      const res = await fetch(`${baseUrl}${at.path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token, Accept: "application/json" },
        body: JSON.stringify(at.body),
      });
      const raw = await res.text();
      if (res.ok) {
        try {
          const parsed = raw ? JSON.parse(raw) : {};
          // Detect error responses that come with 200 status
          if (parsed?.error) {
            lastErr = `${at.path}: ${raw.substring(0, 240)}`;
            // If it's a definitive "not on WhatsApp" error, throw immediately
            if (typeof parsed.error === "string" && (parsed.error.includes("not on WhatsApp") || parsed.error.includes("not registered"))) {
              throw new Error(`API 500: ${raw.substring(0, 240)}`);
            }
            continue;
          }
          if (parsed?.code === 404) {
            lastErr = `${at.path}: ${raw.substring(0, 240)}`;
            continue;
          }
          // Check for status: "error" pattern
          if (parsed?.status === "error") {
            lastErr = `${at.path}: ${raw.substring(0, 240)}`;
            continue;
          }
          return parsed;
        } catch (parseErr) {
          // If it was our thrown error, re-throw
          if (parseErr instanceof Error && parseErr.message.startsWith("API 500:")) throw parseErr;
          return { ok: true, raw };
        }
      }
      lastErr = `${res.status} @ ${at.path}: ${raw.substring(0, 240)}`;
    } catch (e) {
      lastErr = `${at.path}: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  throw new Error(`Text send failed: ${lastErr}`);
}

// ── PRE-VALIDATION: Check if phone has WhatsApp ──
async function uazapiCheckPhone(baseUrl: string, token: string, phone: string): Promise<boolean> {
  const endpoints = [
    { url: `${baseUrl}/misc/checkPhones`, body: { phones: [phone] } },
    { url: `${baseUrl}/chat/check`, body: { phone } },
    { url: `${baseUrl}/misc/isOnWhatsapp`, body: { phone } },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", token, Accept: "application/json" },
        body: JSON.stringify(ep.body),
      });
      if (res.status === 405 || res.status === 404) continue;
      if (!res.ok) continue;
      const raw = await res.text();
      if (!raw) continue;
      const parsed = JSON.parse(raw);

      // Handle array responses
      const item = Array.isArray(parsed) ? parsed[0] : (parsed?.data?.[0] || parsed?.data || parsed);
      if (!item) continue;

      // Check various response formats
      if (item.exists === false || item.onWhatsapp === false || item.isOnWhatsapp === false || item.numberExists === false) return false;
      if (item.exists === true || item.onWhatsapp === true || item.isOnWhatsapp === true || item.numberExists === true) return true;
    } catch { continue; }
  }

  return true; // Assume valid if check endpoints unavailable
}


// NOTE: uazapiFetchLastMessage removed — UAZAPI does not support fetching chat messages (all endpoints return 404/405)



async function uazapiSendImage(baseUrl: string, token: string, number: string, imageUrl: string, caption: string) {
  if (!imageUrl) throw new Error("Image URL ausente");
  const safeCaption = (caption || "📸").trim() || "📸";

  // UAZAPI confirmed working endpoint: POST /send/media with { number, file: URL, type: "image", caption }
  const res = await fetch(`${baseUrl}/send/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token, Accept: "application/json" },
    body: JSON.stringify({ number, file: imageUrl, type: "image", caption: safeCaption }),
  });
  const raw = await res.text();
  if (res.ok) {
    try { return JSON.parse(raw); } catch { return { ok: true, raw }; }
  }
  throw new Error(`Image send failed: ${res.status} — ${raw.substring(0, 240)}`);
}

async function uazapiSendSticker(baseUrl: string, token: string, number: string, imageUrl: string) {
  if (!imageUrl) throw new Error("Sticker URL ausente");

  // UAZAPI confirmed working endpoint: POST /send/media with { number, file: URL, type: "sticker" }
  const res = await fetch(`${baseUrl}/send/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token, Accept: "application/json" },
    body: JSON.stringify({ number, file: imageUrl, type: "sticker" }),
  });
  const raw = await res.text();
  if (res.ok) {
    try { return JSON.parse(raw); } catch { return { ok: true, raw }; }
  }
  throw new Error(`Sticker send failed: ${res.status} — ${raw.substring(0, 240)}`);
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
        .filter((f: any) => f.name && !f.name.startsWith(".") && !f.name.startsWith("Captura") && /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name))
        .map((f: any) => `${base}/${encodeURIComponent(f.name)}`);
      if (imgs.length > 0) {
        _imagePoolCache = imgs; // Use only storage images, no fallback mix
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

function pickMediaType(budgetUsed: number): "text" | "image" | "sticker" {
  // Primeiras 3 mensagens do dia são SEMPRE texto para parecer natural
  if (budgetUsed < 3) return "text";
  const r = Math.random();
  if (r < 0.50) return "text";     // 50% texto
  if (r < 0.75) return "image";    // 25% imagem
  return "sticker";                 // 25% figurinha
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
    if (body.action === "schedule_day") return await handleScheduleDay(db, body);
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

  // Cancel stale interaction jobs outside window (but skip forced jobs)
  if (!withinWindow) {
    const { data: outsideJobs } = await db.from("warmup_jobs")
      .select("id, payload")
      .eq("status", "pending").lte("run_at", now)
      .in("job_type", INTERACTION_JOB_TYPES);
    
    if (outsideJobs?.length) {
      const toCancel = outsideJobs.filter((j: any) => !j.payload?.forced).map((j: any) => j.id);
      if (toCancel.length > 0) {
        for (let i = 0; i < toCancel.length; i += 200) {
          await db.from("warmup_jobs")
            .update({ status: "cancelled", last_error: "Cancelado: fora da janela 07-19 BRT" })
            .in("id", toCancel.slice(i, i + 200));
        }
      }
    }
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

  // Limit: only 1 autosave_interaction per device per tick to avoid burst sending
  const autosaveSeenDevices = new Set<string>();
  const filteredJobs: any[] = [];
  const deferredAutosaveIds: string[] = [];
  for (const j of pendingJobs) {
    if (j.job_type === "autosave_interaction") {
      const key = j.device_id;
      if (autosaveSeenDevices.has(key)) {
        deferredAutosaveIds.push(j.id);
        continue;
      }
      autosaveSeenDevices.add(key);
    }
    filteredJobs.push(j);
  }
  // Defer extra autosave jobs by 2-4 min so next tick picks them up one at a time
  if (deferredAutosaveIds.length > 0) {
    for (let i = 0; i < deferredAutosaveIds.length; i += 200) {
      const newRunAt = new Date(Date.now() + randInt(120, 240) * 1000).toISOString();
      await db.from("warmup_jobs").update({ run_at: newRunAt }).in("id", deferredAutosaveIds.slice(i, i + 200));
    }
  }

  // Mark as running
  const jobIds = filteredJobs.map((j: any) => j.id);
  for (let i = 0; i < jobIds.length; i += 200) {
    await db.from("warmup_jobs").update({ status: "running" }).in("id", jobIds.slice(i, i + 200));
  }

  // ── BATCH PRE-LOAD ──
  const uniqueCycleIds = [...new Set(filteredJobs.map((j: any) => j.cycle_id))];
  const uniqueUserIds = [...new Set(filteredJobs.map((j: any) => j.user_id))];
  const uniqueDeviceIds = [...new Set(filteredJobs.map((j: any) => j.device_id))];

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
    batchLoad<any>("warmup_autosave_contacts", "id, phone_e164, contact_name, user_id", "user_id", uniqueUserIds, q => q.eq("is_active", true).order("id", { ascending: true })),
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

  console.log(`[warmup-tick] Loaded: ${cyclesArr.length} cycles, ${devicesArr.length} devices, ${filteredJobs.length} jobs`);

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
  for (const job of filteredJobs) {
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
      if (!withinWindow && !job.payload?.forced) {
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
          const hasMoreJoinJobs = filteredJobs.some((pj: any) =>
            pj.device_id === job.device_id && pj.job_type === "join_group" && pj.id !== job.id && pj.status !== "succeeded"
          );

          if (pendingCount === 0 && !hasMoreJoinJobs && cycle.phase === "pre_24h") {
            // All groups joined! Check if it's after 7:00 BRT (10:00 UTC)
            const now = new Date();
            const windowOpen = getBrtTodayAt(7);

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
        const autoAdvanceDay = job.payload?.auto_advance_day === true;

        await db.from("warmup_jobs")
          .update({ status: "cancelled", last_error: "Cancelado: transição de fase" })
          .eq("cycle_id", cycle.id).eq("status", "pending")
          .in("job_type", INTERACTION_JOB_TYPES);

        const updateData: any = { phase: targetPhase };
        let dayForSchedule = cycle.day_index;

        // If auto_advance_day, also advance to day 2 (post-groups start)
        if (autoAdvanceDay && cycle.day_index <= 1) {
          updateData.day_index = 2;
          updateData.last_daily_reset_at = new Date().toISOString();
          dayForSchedule = 2;
        }

        await db.from("warmup_cycles").update(updateData).eq("id", cycle.id);

        if (targetPhase === "groups_only" && cycle.day_index <= 1) {
          await ensureJoinGroupJobs(db, cycle.id, job.user_id, job.device_id);
        }

        await scheduleDayJobs(db, cycle.id, job.user_id, job.device_id, dayForSchedule, targetPhase, chipState);

        bufferAudit({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "phase_changed",
          message: `Fase: ${cycle.phase} → ${targetPhase}${autoAdvanceDay ? ` (dia → ${dayForSchedule})` : ""}`,
        });
        break;
      }

      // ── GROUP INTERACTION ──
      case "group_interaction": {
        if (!baseUrl || !token) throw new Error("Credenciais UAZAPI não configuradas");

        let allIGs = instanceGroupsMap[job.device_id] || [];
        let joinedGroups = allIGs.filter((ig: any) => ig.join_status === "joined");
        let liveGroupsCache: any[] = [];

        const norm = (v: string) =>
          String(v || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim();

        const fetchLiveGroups = async (): Promise<any[]> => {
          const endpoints = [
            `${baseUrl}/group/fetchAllGroups`,
            `${baseUrl}/group/fetchAllGroups?getParticipants=false`,
            `${baseUrl}/group/list?GetParticipants=false&count=500`,
            `${baseUrl}/group/listAll`,
            `${baseUrl}/chats?type=group`,
          ];

          const dedup = new Map<string, any>();

          for (const ep of endpoints) {
            try {
              const res = await fetch(ep, {
                method: "GET",
                headers: { token, Accept: "application/json", "Cache-Control": "no-cache" },
              });
              if (!res.ok) continue;

              const raw = await res.text();
              let parsed: any = null;
              try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
              if (!parsed) continue;

              const arrCandidates = [
                parsed,
                parsed?.groups,
                parsed?.data,
                parsed?.data?.groups,
                parsed?.chats,
                parsed?.data?.chats,
              ];

              const rows: any[] = [];
              for (const c of arrCandidates) {
                if (Array.isArray(c)) rows.push(...c);
              }

              for (const g of rows) {
                const jid = g?.JID || g?.jid || g?.id || g?.groupJid || g?.chatId || null;
                const name = g?.subject || g?.name || g?.Name || g?.title || "Grupo detectado";
                if (!jid || !String(jid).includes("@g.us")) continue;
                if (!dedup.has(jid)) dedup.set(jid, { ...g, jid, name });
              }

              if (dedup.size > 0) {
                return Array.from(dedup.values());
              }
            } catch { /* tenta próximo endpoint */ }
          }

          return [];
        };

        // Auto-sync: if no "joined" groups, check live device groups and promote pending→joined
        if (joinedGroups.length === 0 && allIGs.length > 0) {
          try {
            liveGroupsCache = await fetchLiveGroups();
            if (liveGroupsCache.length > 0) {
              const liveNames = new Set(liveGroupsCache.map((g: any) => norm(g.subject || g.name || g.Name || g.title || "")));
              const liveJids = new Set(liveGroupsCache.map((g: any) => String(g.jid || g.id || g.JID || g.groupJid || g.chatId || "").toLowerCase().trim()));

              for (const ig of allIGs) {
                if (ig.join_status === "joined") continue;
                const poolGroup = groupsPoolMap[ig.group_id];
                const poolName = norm(poolGroup?.name || "");
                const igJid = String(ig.group_jid || "").toLowerCase().trim();

                const nameMatch = poolName && liveNames.has(poolName);
                const jidMatch = igJid && liveJids.has(igJid);

                // Also try to find JID from live groups
                let resolvedJid = ig.group_jid;
                if (!resolvedJid) {
                  const match = liveGroupsCache.find((g: any) =>
                    norm(g.subject || g.name || g.Name || g.title || "") === poolName
                  );
                  if (match) resolvedJid = match.jid || match.id || match.JID || match.groupJid || match.chatId;
                }

                if (nameMatch || jidMatch) {
                  const updateData: any = { join_status: "joined", joined_at: new Date().toISOString() };
                  if (resolvedJid && !ig.group_jid) updateData.group_jid = resolvedJid;
                  await db.from("warmup_instance_groups")
                    .update(updateData)
                    .eq("id", ig.id);
                  ig.join_status = "joined";
                  ig.group_jid = resolvedJid || ig.group_jid;
                  bufferAudit({
                    user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
                    level: "info", event_type: "auto_sync_joined",
                    message: `Auto-sync: grupo "${poolGroup?.name}" detectado no dispositivo → marcado como joined`,
                  });
                }
              }
              joinedGroups = allIGs.filter((ig: any) => ig.join_status === "joined");
            }
          } catch (syncErr) {
            console.warn("[group_interaction] auto-sync error:", syncErr);
          }
        }

        let groupJid: string | null = null;
        let groupName = "Grupo";
        let targetGroupId: string | null = null;

        if (joinedGroups.length > 0) {
          const target = pickRandom(joinedGroups);
          targetGroupId = target.group_id;
          const poolGroup = groupsPoolMap[target.group_id];
          groupName = poolGroup?.name || "Grupo";

          // Resolve JID by DB, fallback by invite JID, then live lookup by name
          groupJid = target.group_jid;
          if (!groupJid && poolGroup?.external_group_ref?.includes("@g.us")) {
            groupJid = poolGroup.external_group_ref;
          }
          if (!groupJid) {
            try {
              if (!liveGroupsCache.length) liveGroupsCache = await fetchLiveGroups();
              const match = liveGroupsCache.find((g: any) =>
                norm(g.subject || g.name || g.Name || g.title || "") === norm(groupName)
              );
              if (match) {
                groupJid = match.jid || match.id || match.JID || match.groupJid || match.chatId;
                if (groupJid) {
                  await db.from("warmup_instance_groups")
                    .update({ group_jid: groupJid })
                    .eq("device_id", job.device_id)
                    .eq("group_id", target.group_id);
                }
              }
            } catch { /* ignore */ }
          }
        } else {
          // Fallback resiliente: se não há mapeamento joined no banco, usa grupo real do dispositivo
          try {
            if (!liveGroupsCache.length) liveGroupsCache = await fetchLiveGroups();
          } catch { /* ignore */ }

          const candidates = liveGroupsCache
            .map((g: any) => ({
              jid: g?.jid || g?.id || g?.JID || g?.groupJid || g?.chatId || null,
              name: g?.subject || g?.name || g?.Name || g?.title || "Grupo detectado",
            }))
            .filter((g: any) => !!g.jid && String(g.jid).includes("@g.us"));

          if (candidates.length === 0) {
            bufferAudit({
              user_id: job.user_id,
              device_id: job.device_id,
              cycle_id: job.cycle_id,
              level: "error",
              event_type: "group_live_discovery_empty",
              message: "Nenhum grupo retornado pelos endpoints de descoberta",
              meta: { fetched_count: liveGroupsCache.length },
            });
            throw new Error("Nenhum grupo joined (mesmo após auto-sync)");
          }

          const fallbackGroup = pickRandom(candidates);
          groupJid = fallbackGroup.jid;
          groupName = fallbackGroup.name;

          bufferAudit({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "warn", event_type: "group_fallback_live_jid",
            message: `Sem mapeamento joined no banco. Usando grupo real do dispositivo: ${groupName}`,
            meta: { group_jid: groupJid },
          });
        }

        if (!groupJid) {
          throw new Error(`Sem JID para envio em grupo (${groupName})`);
        }

        const cachedMsgs = userMsgsMap[job.user_id];
        const longCachedMsgs = cachedMsgs?.filter((m: string) => m.length >= 60) || [];
        const getMsg = () => {
          if (longCachedMsgs.length > 0 && Math.random() < 0.3) {
            return pickRandom(longCachedMsgs);
          }
          return generateNaturalMessage("group");
        };

        const requestedMediaType = pickMediaType(cycle.daily_interaction_budget_used || 0);
        let actualMediaType: "text" | "image" | "sticker" = requestedMediaType;
        let message = getMsg();
        let sendFallbackReason: string | null = null;

        // NOTE: Reply (quotedMsgId) disabled — UAZAPI does not support fetching chat messages

        try {
          if (requestedMediaType === "image") {
            const imgUrl = pickRandom(imagePool);
            const caption = pickRandom(IMAGE_CAPTIONS);
            // Enviar foto sem caption + mensagem de texto separada para garantir visibilidade
            await uazapiSendImage(baseUrl, token, groupJid, imgUrl, "");
            // Pequeno delay entre foto e texto (1-3s)
            await new Promise(r => setTimeout(r, randInt(1000, 3000)));
            await uazapiSendText(baseUrl, token, groupJid, caption);
            message = `[IMG+TXT] ${caption}`;
          } else if (requestedMediaType === "sticker") {
            const imgUrl = pickRandom(imagePool);
            await uazapiSendSticker(baseUrl, token, groupJid, imgUrl);
            message = `[STICKER] 🎭`;
          } else {
            await uazapiSendText(baseUrl, token, groupJid, message);
          }
        } catch (e) {
          actualMediaType = "text";
          sendFallbackReason = e instanceof Error ? e.message : String(e || "unknown_error");
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
          message: `Msg no grupo ${groupName}: "${message.substring(0, 50)}"`,
          meta: {
            group_jid: groupJid,
            media_type: actualMediaType,
            requested_media_type: requestedMediaType,
            send_fallback_reason: sendFallbackReason,
            group_id: targetGroupId,
          },
        });
        break;
      }

      // ── AUTOSAVE INTERACTION ──
      case "autosave_interaction": {
        if (!baseUrl || !token) throw new Error("Credenciais UAZAPI não configuradas");

        const rIdx = Number(job.payload?.recipient_index ?? 0);
        const mIdx = Number(job.payload?.msg_index ?? 0);
        const contacts = autosaveMap[job.user_id] || [];

        const autosavePool = contacts
          .map((c: any) => ({ ...c, _phone: String(c.phone_e164 || "").replace(/\D/g, "") }))
          .filter((c: any) => c._phone.length >= 10)
          .slice(0, 5);

        if (autosavePool.length === 0) {
          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "warn", event_type: "autosave_no_contacts", message: "Nenhum contato Auto Save válido/ativo" });
          break;
        }

        let selectedIndex = ((rIdx % autosavePool.length) + autosavePool.length) % autosavePool.length;
        const target = autosavePool[selectedIndex];

        // ── VALIDATION STEP (msg_index=0 only): Pre-validate before sending anything ──
        if (mIdx === 0) {
          // Try UAZAPI phone check first
          const phoneExists = await uazapiCheckPhone(baseUrl, token, target._phone);

          if (!phoneExists) {
            // Phone confirmed invalid — disable and cancel all jobs immediately
            await db.from("warmup_autosave_contacts")
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq("phone_e164", target.phone_e164)
              .eq("user_id", job.user_id);

            await db.from("warmup_jobs")
              .update({ status: "cancelled", last_error: `Contato ${target._phone} não possui WhatsApp — pré-validação` })
              .eq("cycle_id", job.cycle_id)
              .eq("job_type", "autosave_interaction")
              .eq("status", "pending")
              .filter("payload->>recipient_index", "eq", String(rIdx));

            // Also remove from in-memory cache
            const cacheArr = autosaveMap[job.user_id];
            if (cacheArr) {
              const idx = cacheArr.findIndex((c: any) => c.phone_e164 === target.phone_e164);
              if (idx >= 0) cacheArr.splice(idx, 1);
            }

            bufferAudit({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "autosave_contact_disabled",
              message: `Auto Save: contato ${target.contact_name || target._phone} desativado — pré-validação: número não possui WhatsApp`,
              meta: { phone: target._phone, method: "pre_check" },
            });
            break; // Mark as succeeded, don't retry
          }
        }

        // ── SEND MESSAGE ──
        const msg = generateNaturalMessage("autosave");

        try {
          await uazapiSendText(baseUrl, token, target._phone, msg);
        } catch (e) {
          const sendErr = e instanceof Error ? e.message : String(e);

          // On msg_index=0 (first message to this contact): ANY failure = skip contact immediately
          // The first message IS the validation — if it fails, don't waste 4 more attempts
          if (mIdx === 0) {
            await db.from("warmup_autosave_contacts")
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq("phone_e164", target.phone_e164)
              .eq("user_id", job.user_id);

            await db.from("warmup_jobs")
              .update({ status: "cancelled", last_error: `Contato ${target._phone} falhou no envio — desativado` })
              .eq("cycle_id", job.cycle_id)
              .eq("job_type", "autosave_interaction")
              .eq("status", "pending")
              .filter("payload->>recipient_index", "eq", String(rIdx));

            // Remove from in-memory cache
            const cacheArr = autosaveMap[job.user_id];
            if (cacheArr) {
              const idx = cacheArr.findIndex((c: any) => c.phone_e164 === target.phone_e164);
              if (idx >= 0) cacheArr.splice(idx, 1);
            }

            bufferAudit({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "autosave_contact_disabled",
              message: `Auto Save: contato ${target.contact_name || target._phone} desativado — falha na 1ª msg (validação)`,
              meta: { phone: target._phone, error: sendErr, method: "first_send_failed" },
            });
            break; // Don't throw — don't retry
          }

          // msg_index > 0: number was already validated (1st msg succeeded). Retry once for transient errors.
          await new Promise(r => setTimeout(r, 2000));
          try {
            await uazapiSendText(baseUrl, token, target._phone, msg);
          } catch (e2) {
            const retryErr = e2 instanceof Error ? e2.message : String(e2);
            bufferAudit({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "autosave_send_failed",
              message: `Auto Save falhou: contato ${selectedIndex + 1}/${autosavePool.length}, msg ${mIdx + 1}/5 para ${target.contact_name || target._phone}`,
              meta: { recipient_index: selectedIndex, msg_index: mIdx, phone: target._phone, error: retryErr },
            });
            throw new Error(`Auto Save: falha ao enviar msg ${mIdx + 1} para ${target._phone}. Erro: ${retryErr}`);
          }
        }

        const sentPhone = target._phone;

        try {
          await db.from("warmup_unique_recipients").insert({
            cycle_id: cycle.id, user_id: job.user_id,
            recipient_phone_e164: target.phone_e164,
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
          message: `Auto Save: contato ${selectedIndex + 1}/${autosavePool.length}, msg ${mIdx + 1}/5 para ${target.contact_name || sentPhone}`,
          meta: { recipient_index: selectedIndex, msg_index: mIdx, phone: sentPhone, contact_name: target.contact_name },
        });
        break;
      }

      // ── COMMUNITY INTERACTION (burst conversation with media) ──
      // Cada job = 1 burst de 3-7 mensagens seguidas (simula conversa real)
      case "community_interaction": {
        if (!baseUrl || !token) throw new Error("Credenciais UAZAPI não configuradas");

        const peerIndex = job.payload?.peer_index ?? 0;

        // Find active pairs for this cycle
        const { data: pairs } = await db.from("community_pairs")
          .select("id, instance_id_a, instance_id_b")
          .eq("cycle_id", cycle.id).eq("status", "active");

        let peerDeviceId: string | null = null;

        if (pairs?.length) {
          const selectedPair = pairs[peerIndex % pairs.length];
          peerDeviceId = selectedPair.instance_id_a === job.device_id
            ? selectedPair.instance_id_b
            : selectedPair.instance_id_a;
        } else {
          const { data: otherCycles } = await db.from("warmup_cycles")
            .select("device_id, user_id")
            .eq("is_running", true).neq("device_id", job.device_id).neq("user_id", job.user_id)
            .in("phase", ["autosave_enabled", "community_light", "community_enabled"])
            .limit(10);

          if (otherCycles?.length) {
            const shuffled = otherCycles.sort(() => Math.random() - 0.5);
            peerDeviceId = shuffled[peerIndex % shuffled.length].device_id;
          }
        }

        if (!peerDeviceId) {
          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "warn", event_type: "community_no_peers", message: `Nenhum peer encontrado para par ${peerIndex}` });
          break;
        }

        const { data: pd } = await db.from("devices").select("number, status").eq("id", peerDeviceId).single();

        if (!pd?.number || !CONNECTED_STATUSES.includes(pd.status)) {
          bufferAudit({ user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id, level: "warn", event_type: "community_peer_offline", message: `Peer ${peerIndex} offline — pulando burst` });
          break;
        }

        const targetPhone = pd.number.replace(/\+/g, "");

        // ── BURST: Send 3-7 messages in rapid succession (like a real conversation) ──
        const burstSize = randInt(3, 7);
        let sentCount = 0;
        const sentSummary: string[] = [];

        for (let b = 0; b < burstSize; b++) {
          // Random delay between messages in burst: 5-30 seconds (typing simulation)
          if (b > 0) {
            await new Promise(r => setTimeout(r, randInt(5, 30) * 1000));
          }

          // ~15% image, ~5% sticker, ~80% text within burst
          const roll = Math.random();
          try {
            if (roll < 0.15) {
              const imgUrl = pickRandom(imagePool);
              const caption = pickRandom(IMAGE_CAPTIONS);
              await uazapiSendImage(baseUrl, token, targetPhone, imgUrl, "");
              await new Promise(r => setTimeout(r, randInt(1000, 3000)));
              await uazapiSendText(baseUrl, token, targetPhone, caption);
              sentSummary.push("📷");
              sentCount += 2; // image + caption
            } else if (roll < 0.20) {
              const imgUrl = pickRandom(imagePool);
              await uazapiSendSticker(baseUrl, token, targetPhone, imgUrl);
              sentSummary.push("🎭");
              sentCount++;
            } else {
              const msg = generateNaturalMessage("community");
              await uazapiSendText(baseUrl, token, targetPhone, msg);
              sentSummary.push("💬");
              sentCount++;
            }
          } catch (e) {
            // On failure within burst, send text fallback and continue
            try {
              const fallback = generateNaturalMessage("community");
              await uazapiSendText(baseUrl, token, targetPhone, fallback);
              sentSummary.push("💬↩");
              sentCount++;
            } catch { break; } // If even fallback fails, stop burst
          }
        }

        // Update budget with total messages sent in this burst
        if (sentCount > 0) {
          await db.from("warmup_cycles").update({
            daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + sentCount,
          }).eq("id", cycle.id);
          cycle.daily_interaction_budget_used = (cycle.daily_interaction_budget_used || 0) + sentCount;
        }

        bufferAudit({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "community_burst_sent",
          message: `Comunitário par ${peerIndex + 1}/3: burst ${sentSummary.join("")} (${sentCount} msgs)`,
          meta: { peer_device: peerDeviceId, burst_size: sentCount, target: targetPhone.substring(0, 6) + "..." },
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
        const targetPeers = getCommunityPeers(cycle.day_index, chipState);

        // Fetch eligible devices from other users
        const { data: eligible } = await db.from("warmup_community_membership")
          .select("device_id, user_id")
          .eq("is_enabled", true).eq("is_eligible", true)
          .neq("user_id", job.user_id)
          .limit(100);

        // Get existing active pairs to decide which to keep
        const { data: existingPairs } = await db.from("community_pairs")
          .select("id, instance_id_a, instance_id_b, meta")
          .eq("cycle_id", cycle.id).eq("status", "active");

        // Strategy: keep ~40% of existing pairs (old contacts), fill rest with new
        const keepCount = Math.min(
          Math.floor(targetPeers * 0.4),
          existingPairs?.length || 0
        );
        const newNeeded = targetPeers - keepCount;

        // Close excess old pairs (keep only keepCount)
        if (existingPairs?.length) {
          const shuffledExisting = existingPairs.sort(() => Math.random() - 0.5);
          const toKeep = shuffledExisting.slice(0, keepCount);
          const toClose = shuffledExisting.slice(keepCount);
          if (toClose.length > 0) {
            const closeIds = toClose.map((p: any) => p.id);
            await db.from("community_pairs")
              .update({ status: "closed", closed_at: new Date().toISOString() })
              .in("id", closeIds);
          }
          // Track kept devices to avoid duplicates
          var keptDevices = new Set<string>();
          var keptUsers = new Set<string>();
          for (const p of toKeep) {
            const peerId = p.instance_id_a === job.device_id ? p.instance_id_b : p.instance_id_a;
            keptDevices.add(peerId);
            // Find user of kept peer
            const keptEligible = eligible?.find((e: any) => e.device_id === peerId);
            if (keptEligible) keptUsers.add(keptEligible.user_id);
          }
        } else {
          var keptDevices = new Set<string>();
          var keptUsers = new Set<string>();
        }

        let pairsCreated = 0;
        if (eligible?.length && newNeeded > 0) {
          // Shuffle and pick new unique partners
          const shuffled = eligible.sort(() => Math.random() - 0.5);
          const usedUsers = new Set<string>(keptUsers);
          const usedDevices = new Set<string>(keptDevices);

          // Prefer devices NOT in "new" chip state (avoid fresh accounts pairing)
          // Check which devices have older cycles (non-new)
          const eligibleDeviceIds = shuffled.map((e: any) => e.device_id);
          const { data: peerCycles } = await db.from("warmup_cycles")
            .select("device_id, chip_state, day_index")
            .in("device_id", eligibleDeviceIds.slice(0, 50))
            .eq("is_running", true);

          const peerCycleMap: Record<string, any> = {};
          peerCycles?.forEach((c: any) => { peerCycleMap[c.device_id] = c; });

          // Sort: prefer non-new chips and older cycles first
          const sorted = shuffled.sort((a: any, b: any) => {
            const ca = peerCycleMap[a.device_id];
            const cb = peerCycleMap[b.device_id];
            const aNew = ca?.chip_state === "new" && (ca?.day_index || 0) < 10 ? 1 : 0;
            const bNew = cb?.chip_state === "new" && (cb?.day_index || 0) < 10 ? 1 : 0;
            return aNew - bNew; // non-new first
          });

          for (const e of sorted) {
            if (pairsCreated >= newNeeded) break;
            if (usedUsers.has(e.user_id) || usedDevices.has(e.device_id)) continue;

            // Check if partner device is connected
            const { data: partnerDev } = await db.from("devices")
              .select("status, number").eq("id", e.device_id).single();
            if (!partnerDev?.number || !CONNECTED_STATUSES.includes(partnerDev.status)) continue;

            await db.from("community_pairs").insert({
              cycle_id: cycle.id,
              instance_id_a: job.device_id,
              instance_id_b: e.device_id,
              status: "active",
              meta: { initiator: Math.random() < 0.5 ? "a" : "b", is_new: true },
            });

            usedUsers.add(e.user_id);
            usedDevices.add(e.device_id);
            pairsCreated++;
          }
        }

        await db.from("warmup_cycles").update({ phase: "community_enabled" }).eq("id", cycle.id);
        bufferAudit({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "community_enabled",
          message: `Comunidade ativada: ${keepCount} pares mantidos + ${pairsCreated} novos = ${keepCount + pairsCreated}/${targetPeers} (dia ${cycle.day_index})`,
          meta: { pairs_kept: keepCount, pairs_new: pairsCreated, target: targetPeers },
        });
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

        // Cancel old interaction jobs and join_group jobs (join only on day 1)
        await db.from("warmup_jobs")
          .update({ status: "cancelled", last_error: "Cancelado: reset diário" })
          .eq("cycle_id", cycle.id).eq("status", "pending")
          .in("job_type", [...INTERACTION_JOB_TYPES, "enable_autosave", "enable_community", "join_group"]);

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

        // Rotate community pairs on daily reset if in community phase
        if (newPhase === "community_enabled") {
          const targetPeers = getCommunityPeers(newDay, chipState);

          // Get existing active pairs
          const { data: existingPairs } = await db.from("community_pairs")
            .select("id, instance_id_a, instance_id_b")
            .eq("cycle_id", cycle.id).eq("status", "active");

          // Keep ~40% of old pairs (familiar contacts), close rest
          const keepCount = Math.min(
            Math.floor(targetPeers * 0.4),
            existingPairs?.length || 0
          );
          const keptDevices = new Set<string>();
          const keptUsers = new Set<string>();

          if (existingPairs?.length) {
            const shuffledExisting = existingPairs.sort(() => Math.random() - 0.5);
            const toKeep = shuffledExisting.slice(0, keepCount);
            const toClose = shuffledExisting.slice(keepCount);

            if (toClose.length > 0) {
              await db.from("community_pairs")
                .update({ status: "closed", closed_at: new Date().toISOString() })
                .in("id", toClose.map((p: any) => p.id));
            }

            for (const p of toKeep) {
              const peerId = p.instance_id_a === job.device_id ? p.instance_id_b : p.instance_id_a;
              keptDevices.add(peerId);
            }
          }

          // Create new pairs to fill target
          const newNeeded = targetPeers - keepCount;
          if (newNeeded > 0) {
            const { data: eligible } = await db.from("warmup_community_membership")
              .select("device_id, user_id")
              .eq("is_enabled", true).eq("is_eligible", true)
              .neq("user_id", job.user_id)
              .limit(100);

            if (eligible?.length) {
              const shuffled = eligible.sort(() => Math.random() - 0.5);
              const usedDevices = new Set<string>(keptDevices);
              const usedUsers = new Set<string>(keptUsers);

              // Prefer non-new chips
              const eligDevIds = shuffled.map((e: any) => e.device_id).slice(0, 50);
              const { data: peerCycles } = await db.from("warmup_cycles")
                .select("device_id, chip_state, day_index")
                .in("device_id", eligDevIds).eq("is_running", true);
              const pcMap: Record<string, any> = {};
              peerCycles?.forEach((c: any) => { pcMap[c.device_id] = c; });

              const sorted = shuffled.sort((a: any, b: any) => {
                const ca = pcMap[a.device_id]; const cb = pcMap[b.device_id];
                const aNew = ca?.chip_state === "new" && (ca?.day_index || 0) < 10 ? 1 : 0;
                const bNew = cb?.chip_state === "new" && (cb?.day_index || 0) < 10 ? 1 : 0;
                return aNew - bNew;
              });

              let created = 0;
              for (const e of sorted) {
                if (created >= newNeeded) break;
                if (usedDevices.has(e.device_id) || usedUsers.has(e.user_id)) continue;

                const { data: pd } = await db.from("devices")
                  .select("status, number").eq("id", e.device_id).single();
                if (!pd?.number || !CONNECTED_STATUSES.includes(pd.status)) continue;

                await db.from("community_pairs").insert({
                  cycle_id: cycle.id, instance_id_a: job.device_id, instance_id_b: e.device_id,
                  status: "active", meta: { initiator: Math.random() < 0.5 ? "a" : "b", is_new: true },
                });
                usedDevices.add(e.device_id); usedUsers.add(e.user_id);
                created++;
              }

              bufferAudit({
                user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
                level: "info", event_type: "community_pairs_rotated",
                message: `Pares rotacionados: ${keepCount} mantidos + ${created} novos = ${keepCount + created}/${targetPeers}`,
                meta: { kept: keepCount, new: created, target: targetPeers, day: newDay },
              });
            }
          }
        }

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

// ══════════════════════════════════════════════════════════
// SCHEDULE DAY HANDLER (on-demand job creation)
// ══════════════════════════════════════════════════════════

async function handleScheduleDay(db: any, body: any) {
  const { cycle_id, device_id, forced } = body;

  if (!cycle_id) return json({ error: "cycle_id obrigatório" }, 400);

  const { data: cycle, error: cycleErr } = await db.from("warmup_cycles")
    .select("*")
    .eq("id", cycle_id)
    .single();

  if (cycleErr || !cycle) return json({ error: "Ciclo não encontrado" }, 404);
  if (!cycle.is_running) return json({ error: "Ciclo não está rodando" }, 400);

  const chipState = cycle.chip_state || "new";
  const phase = cycle.phase;
  const dayIndex = cycle.day_index || 1;

  // Cancel existing pending interaction jobs to avoid duplicates
  await db.from("warmup_jobs")
    .update({ status: "cancelled", last_error: "Cancelado: nova geração de tarefas" })
    .eq("cycle_id", cycle_id)
    .eq("status", "pending")
    .in("job_type", ["group_interaction", "autosave_interaction", "community_interaction"]);

  let jobsCreated = 0;

  // For pre_24h or groups_only: ensure join_group jobs
  if (["pre_24h", "groups_only"].includes(phase)) {
    const created = await ensureJoinGroupJobs(db, cycle_id, cycle.user_id, device_id || cycle.device_id);
    jobsCreated += created;
  }

  // Schedule interaction jobs (forced = true uses current time as start)
  const scheduled = await scheduleDayJobs(
    db, cycle_id, cycle.user_id, device_id || cycle.device_id,
    dayIndex, phase === "pre_24h" ? "groups_only" : phase, chipState, forced
  );
  jobsCreated += scheduled;

  return json({ ok: true, jobs_created: jobsCreated, phase, day_index: dayIndex });
}
