// warmup-tick v3.4 — removed post_status (UAZAPI v2 does not support status posting)
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
  "muito bom esse conteúdo, parabéns por compartilhar com a gente",
  "cara isso é muito verdade, passei por algo parecido recentemente",
  "valeu demais pela informação, vou aplicar no meu dia a dia",
  "isso é exatamente o que eu precisava ouvir hoje, obrigado",
  "conteúdo de qualidade como sempre, continue assim",
];

// ── Temas variados para enriquecer conversas ──
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
  "acho que a gente precisa valorizar mais as coisas simples da vida",
  "o segredo é manter a calma e seguir em frente sem olhar pra trás",
  "tô numa fase de mudanças grandes e acho que vai ser bom",
  "a paciência é a chave pra tudo, sem pressa as coisas acontecem",
  "cada vez mais eu acredito que o esforço compensa no final",
  "o importante não é chegar primeiro, é chegar bem e preparado",
];

const DICAS_GERAIS = [
  "vi um restaurante bom pra indicar", "descobri um app muito bom",
  "tem uma série nova que vale a pena", "aprendi um truque legal ontem",
  "achei um lugar ótimo pra passear", "tem uma promoção boa hoje",
  "recomendo demais aquele livro", "testei uma receita incrível",
  "achei um canal no youtube muito bom", "descobri um café ótimo aqui perto",
  "tem um podcast bom sobre isso", "vi um documentário sensacional",
  "tem uma loja nova no bairro", "encontrei uma academia boa e barata",
  "descobri um atalho no celular", "achei uma playlist ótima",
  "vi um vídeo muito bom sobre produtividade que mudou minha rotina toda",
  "descobri um aplicativo de organização que tá me ajudando demais no trabalho",
  "tem uma receita de bolo de cenoura que eu fiz ontem e ficou perfeita",
  "achei um lugar pra caminhar aqui perto que é muito tranquilo e bonito",
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
  "hoje acordei mais cedo e fui caminhar, o dia tava lindo demais",
  "fiz um café especial hoje de manhã e sentei pra aproveitar sem pressa",
  "passei o dia todo organizando a casa e agora tô exausto mas satisfeito",
  "fui no mercado comprar umas coisas e acabei gastando mais do que planejava",
  "tô tentando criar uma rotina nova de exercícios pra ficar mais disposto",
  "ontem fiz uma janta especial pra família e todo mundo adorou demais",
  "o dia tava tão bonito que resolvi sair pra dar uma volta e tomar um sorvete",
];

// ── Frases longas e reflexões (para mensagens de 100-250 chars) ──
const REFLEXOES = [
  "sabe o que eu penso, a gente tem que aproveitar cada momento porque passa muito rápido e quando a gente percebe já foi",
  "ontem eu tava lembrando de como as coisas eram diferentes uns anos atrás, muita coisa mudou e acho que foi pra melhor",
  "às vezes eu paro pra pensar no quanto a gente evoluiu, tanto pessoal quanto profissional, e dá um orgulho bom",
  "tô numa fase da vida que tô priorizando paz e tranquilidade, chega de correria sem sentido",
  "faz tempo que eu queria falar isso, mas a vida corrida não deixa, enfim, espero que esteja tudo bem por aí",
  "eu acho que o segredo da vida é ter equilíbrio, trabalhar quando precisa e descansar quando pode",
  "essa semana foi intensa demais, mas no final deu tudo certo e isso é o que importa",
  "tô aprendendo que nem tudo precisa de resposta imediata, às vezes é melhor esperar e ver o que acontece",
  "cara eu tava pensando aqui que a gente deveria se encontrar mais, faz muito tempo que não nos vemos",
  "o mundo tá cada vez mais corrido né, antigamente as coisas eram mais simples e a gente tinha mais tempo",
  "acabei de ler um artigo muito interessante sobre como pequenos hábitos podem mudar completamente a nossa rotina",
  "sabe aquela sensação de quando você termina algo que tava adiando há muito tempo? tô sentindo isso agora",
  "tava conversando com um amigo e ele me disse algo que me fez repensar várias coisas na minha vida",
  "acho muito importante a gente parar de vez em quando pra agradecer por tudo que conquistou até aqui",
  "tem dias que são mais difíceis mas no final sempre dá certo, é questão de manter a fé e a persistência",
];

const HISTORIAS_CURTAS = [
  "ontem aconteceu uma coisa engraçada, eu fui no mercado e encontrei um amigo que não via há anos",
  "meu vizinho adotou um cachorro e agora o bicho late o dia inteiro mas ele é muito fofo",
  "fui almoçar num restaurante novo e a comida era tão boa que já marquei de voltar semana que vem",
  "tentei fazer uma receita nova e deu tudo errado mas pelo menos a cozinha ficou cheirosa",
  "meu filho falou uma coisa tão engraçada ontem que eu quase chorei de rir",
  "fui numa loja comprar uma coisa e saí com cinco, acontece sempre isso comigo",
  "tava dirigindo e vi o pôr do sol mais bonito que já vi na vida, pena que não deu pra tirar foto",
  "hoje de manhã o café ficou perfeito, daquele jeito que a gente gosta, forte e quente",
  "recebi uma mensagem de um amigo antigo e matamos a saudade conversando por horas",
  "fui na padaria e o pão tava tão fresquinho que comi três de uma vez",
  "acordei com o barulho da chuva e resolvi ficar mais um pouco na cama, foi a melhor decisão do dia",
  "meu gato derrubou um copo da mesa e ficou olhando pra mim com cara de inocente",
];

const PERGUNTAS_LONGAS = [
  "ei, tudo bem? faz tempo que não conversamos, queria saber como está sua vida, o trabalho, a família, tudo",
  "opa, lembrei de você agora, como estão as coisas por aí? aconteceu muita coisa desde a última vez que falamos",
  "queria te perguntar uma coisa, você já foi naquele lugar que me indicou? tô pensando em ir esse final de semana",
  "fala, como tá? vi umas fotos suas e parece que tá tudo bem, queria saber das novidades",
  "e aí, conseguiu resolver aquela situação que tava te preocupando? espero que tenha dado tudo certo",
  "opa, tudo tranquilo? queria saber se você tem alguma dica boa de série ou filme pra assistir",
  "faz tempo que tô querendo te perguntar, como foi aquela viagem que você tava planejando? deu certo?",
  "ei, você viu aquela notícia que saiu hoje? me lembrou de uma conversa que a gente teve uma vez",
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
  const maxLen = context === "autosave" ? 40 : 250;
  for (let attempt = 0; attempt < 80; attempt++) {
    const msg = buildMsg(context);
    if (msg.length >= 5 && msg.length <= maxLen && !recentMsgs.includes(msg)) {
      recentMsgs.push(msg);
      if (recentMsgs.length > MAX_RECENT) recentMsgs.shift();
      return msg;
    }
  }
  // Fallback
  const fb = (context === "community" || context === "autosave") ? pickRandom(RESPOSTAS_CURTAS) : `${pickRandom(SAUDACOES)} ${pickRandom(PERGUNTAS)}?`;
  return fb.substring(0, maxLen);
}

function buildMsg(ctx: MsgCtx): string {
  // Auto Save: only short messages (5-40 chars) — quick casual chat
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
  // Curtas (5-30 chars)
  if (s === 1) return pickRandom(RESPOSTAS_CURTAS);
  if (s === 2) return cap(maybeEmoji(pickRandom(SAUDACOES)));
  // Médias (20-80 chars)
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
    const f = pickRandom(FRASES_NUMERO).replace("{n}", String(randInt(2, 15))).replace("{a}", String(randInt(2019, 2025)));
    return cap(maybeEmoji(f));
  }
  if (s === 16) return cap(maybeEmoji(`${pickRandom(SAUDACOES)}, ${pickRandom(OPINIOES)}`));
  // Longas (80-250 chars)
  if (s <= 18) return cap(maybeEmoji(pickRandom(REFLEXOES)));
  if (s <= 20) return cap(maybeEmoji(pickRandom(HISTORIAS_CURTAS)));
  if (s === 21) return cap(maybeEmoji(pickRandom(PERGUNTAS_LONGAS)));
  // Combinações longas
  if (s === 22) return cap(maybeEmoji(`${pickRandom(SAUDACOES)}, ${pickRandom(COTIDIANO)}. ${pickRandom(COMPLEMENTOS)}`));
  if (s === 23) return cap(maybeEmoji(`${pickRandom(COMENTARIOS)}, ${pickRandom(OPINIOES)}`));
  // s === 24: context-specific
  if (ctx === "group") return cap(maybeEmoji(pickRandom(FRASES_GRUPO)));
  if (ctx === "community") return Math.random() < 0.3 ? pickRandom(RESPOSTAS_CURTAS) : cap(maybeEmoji(pickRandom(HISTORIAS_CURTAS)));
  return cap(maybeEmoji(pickRandom(REFLEXOES)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: accept internal secret header OR any Authorization header (cron uses anon key bearer)
  // verify_jwt=false in config.toml, so Supabase proxy doesn't gate this
  const secret = req.headers.get("x-internal-secret");
  const expectedSecret = Deno.env.get("INTERNAL_TICK_SECRET");
  const authHeader = req.headers.get("authorization") || "";
  
  const isSecretValid = expectedSecret && secret === expectedSecret;
  const hasBearerAuth = authHeader.startsWith("Bearer ");
  
  if (!isSecretValid && !hasBearerAuth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, svcKey);

  let body: any = {};
  try { body = await req.json(); } catch (_e) { /* ignore */ }

  const action = body.action || "tick";

  try {
    if (action === "daily") {
      return await handleDailyReset(db);
    }
    if (action === "debug_status") {
      return new Response(JSON.stringify({ error: "post_status removido — UAZAPI v2 não suporta postagem de status" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
// All chips: Day 1 OFF, then groups, then autosave (1 day), then community
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

// In-memory blob cache to avoid re-downloading the same image within one tick
const _blobCache: Record<string, string> = {};

async function uazapiSendImage(baseUrl: string, token: string, number: string, imageUrl: string, caption: string) {
  // Strategy: try sending URL directly first (fastest), then base64 fallback
  const endpoints = [
    // 1) /send/image with URL directly
    { url: `${baseUrl}/send/image`, body: { number, image: imageUrl, text: caption } },
    // 2) /send/media with URL in file field
    { url: `${baseUrl}/send/media`, body: { number, file: imageUrl, text: caption } },
  ];

  let lastErr = "";
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", token, Accept: "application/json" },
        body: JSON.stringify(ep.body),
      });
      if (res.ok) return await res.json();
      const errText = await res.text();
      lastErr = `${res.status} @ ${ep.url}: ${errText.substring(0, 200)}`;
      console.warn(`[uazapiSendImage] ${lastErr}`);
    } catch (e) {
      lastErr = `${ep.url}: ${e.message}`;
    }
  }

  // 3) Last resort: base64 Data URI
  let dataUri = _blobCache[imageUrl];
  if (!dataUri) {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const arrayBuf = await imgRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    dataUri = `data:${contentType};base64,${btoa(binary)}`;
    _blobCache[imageUrl] = dataUri;
  }

  const b64Endpoints = [
    { url: `${baseUrl}/send/image`, body: { number, image: dataUri, text: caption } },
    { url: `${baseUrl}/send/media`, body: { number, file: dataUri, text: caption } },
  ];

  for (const ep of b64Endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", token, Accept: "application/json" },
        body: JSON.stringify(ep.body),
      });
      if (res.ok) return await res.json();
      const errText = await res.text();
      lastErr = `${res.status} @ ${ep.url} (b64): ${errText.substring(0, 200)}`;
      console.warn(`[uazapiSendImage] ${lastErr}`);
    } catch (e) {
      lastErr = `${ep.url} (b64): ${e.message}`;
    }
  }

  throw new Error(`API image send failed after all attempts: ${lastErr}`);
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
