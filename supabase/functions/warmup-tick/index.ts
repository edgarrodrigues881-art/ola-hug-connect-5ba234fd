// warmup-tick v4.0 — unified scheduleDayJobs with proper window scheduling
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
  const fb = (context === "community" || context === "autosave") ? pickRandom(RESPOSTAS_CURTAS) : `${pickRandom(SAUDACOES)} ${pickRandom(PERGUNTAS)}?`;
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
    const f = pickRandom(FRASES_NUMERO).replace("{n}", String(randInt(2, 15))).replace("{a}", String(randInt(2019, 2025)));
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

// ── Image sending with multi-endpoint fallback for UAZAPI V2 ──
const _blobCache: Record<string, string> = {};

async function uazapiSendImage(baseUrl: string, token: string, number: string, imageUrl: string, caption: string) {
  if (!imageUrl) throw new Error("Image URL ausente");

  const safeCaption = (caption || "📸").trim() || "📸";

  const parseResponsePayload = async (res: Response) => {
    const raw = await res.text();
    if (!raw) return { ok: true };
    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  };

  const tryEndpoints = async (
    endpoints: Array<{ url: string; body: Record<string, unknown> }>,
    label: string,
  ) => {
    let lastErr = "";

    for (const ep of endpoints) {
      try {
        const res = await fetch(ep.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", token, Accept: "application/json" },
          body: JSON.stringify(ep.body),
        });

        if (res.ok) {
          console.log(`[uazapiSendImage] Success via ${ep.url} (${label})`);
          return { ok: true as const, data: await parseResponsePayload(res) };
        }

        const errText = await res.text();
        lastErr = `${res.status} @ ${ep.url}: ${errText.substring(0, 240)}`;
        if (res.status !== 405) console.warn(`[uazapiSendImage] ${lastErr}`);
      } catch (e) {
        lastErr = `${ep.url}: ${e.message}`;
      }
    }

    return { ok: false as const, lastErr };
  };

  // Strategy 1: direct URL first (faster)
  const urlEndpoints = [
    { url: `${baseUrl}/send/media`, body: { number, file: imageUrl, caption: safeCaption, text: safeCaption } },
    { url: `${baseUrl}/send/media`, body: { number, file: imageUrl, caption: safeCaption } },
    { url: `${baseUrl}/send/media`, body: { number, file: imageUrl, text: safeCaption } },
    { url: `${baseUrl}/send/media`, body: { number, file: imageUrl, mediatype: "image", caption: safeCaption, text: safeCaption } },
    { url: `${baseUrl}/send/image`, body: { number, image: imageUrl, caption: safeCaption, text: safeCaption } },
    { url: `${baseUrl}/send/image`, body: { number, image: imageUrl, caption: safeCaption } },
  ];

  const urlResult = await tryEndpoints(urlEndpoints, "url");
  if (urlResult.ok) return urlResult.data;

  // Strategy 2: download and send as base64 Data URI
  let dataUri = _blobCache[imageUrl];
  let mimeType = "image/jpeg";

  if (!dataUri) {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);

    mimeType = imgRes.headers.get("content-type") || mimeType;
    const arrayBuf = await imgRes.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);

    dataUri = `data:${mimeType};base64,${btoa(binary)}`;
    _blobCache[imageUrl] = dataUri;
  } else {
    const mt = dataUri.match(/^data:([^;]+);base64,/i)?.[1];
    if (mt) mimeType = mt;
  }

  const b64Endpoints = [
    { url: `${baseUrl}/send/media`, body: { number, file: dataUri, caption: safeCaption, text: safeCaption } },
    { url: `${baseUrl}/send/media`, body: { number, file: dataUri, caption: safeCaption } },
    { url: `${baseUrl}/send/media`, body: { number, file: dataUri, text: safeCaption } },
    { url: `${baseUrl}/send/media`, body: { number, file: dataUri, mediatype: "image", mimetype: mimeType, caption: safeCaption, text: safeCaption } },
    { url: `${baseUrl}/send/image`, body: { number, image: dataUri, caption: safeCaption, text: safeCaption } },
    { url: `${baseUrl}/send/image`, body: { number, image: dataUri, caption: safeCaption } },
  ];

  const b64Result = await tryEndpoints(b64Endpoints, "b64");
  if (b64Result.ok) return b64Result.data;

  throw new Error(`API image send failed after all attempts: ${b64Result.lastErr || urlResult.lastErr || "unknown error"}`);
}

// ── Media pools for warmup variety ──
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
    if (!error && files && files.length > 0) {
      const bucketBase = `${SUPABASE_URL}/storage/v1/object/public/media/warmup-media`;
      const bucketImages = files
        .filter((f: any) => f.name && !f.name.startsWith(".") && /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name))
        .map((f: any) => `${bucketBase}/${encodeURIComponent(f.name)}`);
      
      console.log(`[warmup-tick] Found ${bucketImages.length} images in storage bucket`);
      if (bucketImages.length > 0) {
        _imagePoolCache = [...bucketImages, ...FALLBACK_IMAGES];
        return _imagePoolCache;
      }
    }
  } catch (e) {
    console.log(`[warmup-tick] Failed to list bucket images: ${e.message}`);
  }
  
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
  "Tô apaixonado por isso", "Que vista maravilhosa", "Mais um dia incrível",
  "Gratidão por tudo 🙏", "Melhor momento do dia", "Isso é viver bem",
  "Quando a vida é boa 😎", "Registro pra eternidade", "Obrigado Deus 🙌",
];

// Decide media type for group interaction: 75% text, 25% image
type MediaType = "text" | "image";
function pickMediaType(): MediaType {
  return Math.random() < 0.75 ? "text" : "image";
}

// ════════════════════════════════════════
// TICK HANDLER — process pending jobs
// ════════════════════════════════════════

function isWithinOperatingWindow(): boolean {
  return true;
}

const INTERACTION_JOB_TYPES = ["group_interaction", "autosave_interaction", "community_interaction"];

async function handleTick(db: any) {
  const CONNECTED_STATUSES = ["Ready", "Connected", "authenticated"];
  const now = new Date().toISOString();
  const withinWindow = isWithinOperatingWindow();

  if (!withinWindow) {
    const cancelledTypes = INTERACTION_JOB_TYPES;
    const { count } = await db.from("warmup_jobs")
      .update({ status: "cancelled", last_error: "Cancelado: fora da janela 07-19 BRT" })
      .eq("status", "pending")
      .lte("run_at", now)
      .in("job_type", cancelledTypes);
    console.log(`[warmup-tick] Outside 07-19 BRT window, cancelled ${count || 0} stale interaction jobs`);
  }

  // Recover stale "running" jobs
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await db.from("warmup_jobs")
    .update({ status: "pending", last_error: "Recuperado de estado running travado" })
    .eq("status", "running")
    .lt("updated_at", staleThreshold);

  const { data: pendingJobs, error: fetchErr } = await db
    .from("warmup_jobs")
    .select("id, user_id, device_id, cycle_id, job_type, payload, run_at, status, attempts, max_attempts")
    .eq("status", "pending")
    .lte("run_at", now)
    .order("run_at", { ascending: true })
    .limit(800);

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

  // Mark as running in batches
  const jobIds = pendingJobs.map((j: any) => j.id);
  for (let i = 0; i < jobIds.length; i += 200) {
    await db.from("warmup_jobs").update({ status: "running" }).in("id", jobIds.slice(i, i + 200));
  }

  // ══════════════════════════════════════════════════════════════
  // BATCH PRE-LOAD
  // ══════════════════════════════════════════════════════════════
  const uniqueCycleIds = [...new Set(pendingJobs.map((j: any) => j.cycle_id))];
  const uniqueUserIds = [...new Set(pendingJobs.map((j: any) => j.user_id))];
  const uniqueDeviceIds = [...new Set(pendingJobs.map((j: any) => j.device_id))];

  async function batchLoad<T>(table: string, selectCols: string, field: string, ids: string[], extra?: (q: any) => any): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      let q = db.from(table).select(selectCols).in(field, ids.slice(i, i + 200));
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
    const key = ig.device_id;
    if (!instanceGroupsMap[key]) instanceGroupsMap[key] = [];
    instanceGroupsMap[key].push(ig);
  });

  const groupsPoolMap: Record<string, any> = {};
  groupsPoolArr.forEach((g: any) => { groupsPoolMap[g.id] = g; });

  console.log(`[warmup-tick] Batch loaded: ${cyclesArr.length} cycles, ${subsArr.length} subs, ${profilesArr.length} profiles, ${devicesArr.length} devices, ${userMsgsArr.length} msgs, ${autosaveArr.length} autosave, ${instanceGroupsArr.length} igroups, ${groupsPoolArr.length} pool for ${pendingJobs.length} jobs`);

  const pausedCycles = new Set<string>();

  const auditLogBuffer: any[] = [];
  function bufferAuditLog(log: any) { auditLogBuffer.push(log); }
  async function flushAuditLogs() {
    for (let i = 0; i < auditLogBuffer.length; i += 100) {
      await db.from("warmup_audit_logs").insert(auditLogBuffer.slice(i, i + 100));
    }
  }

  // ══════════════════════════════════════════════════════════════
  // GROUP JOBS BY DEVICE
  // ══════════════════════════════════════════════════════════════
  const jobsByDevice: Record<string, any[]> = {};
  for (const job of pendingJobs) {
    if (!jobsByDevice[job.device_id]) jobsByDevice[job.device_id] = [];
    jobsByDevice[job.device_id].push(job);
  }

  const MAX_PARALLEL_DEVICES = 10;
  const deviceIds = Object.keys(jobsByDevice);
  let succeeded = 0;
  let failed = 0;

  async function processJob(job: any): Promise<boolean> {
    const cycle = cyclesMap[job.cycle_id];

    if (!cycle || !cycle.is_running || pausedCycles.has(cycle.id)) {
      await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
      return false;
    }

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

    const device = devicesMap[job.device_id];

    if (!device || !CONNECTED_STATUSES.includes(device.status)) {
      if (cycle.phase !== "paused" && !pausedCycles.has(cycle.id)) {
        await db.from("warmup_cycles").update({
          is_running: false, phase: "paused", previous_phase: cycle.phase,
          last_error: "Auto-pausado: instância desconectada",
        }).eq("id", cycle.id);
        await db.from("warmup_jobs").update({ status: "cancelled" }).eq("cycle_id", cycle.id).eq("status", "pending");
        bufferAuditLog({
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

    if (INTERACTION_JOB_TYPES.includes(job.job_type) && !withinWindow) {
      await db.from("warmup_jobs").update({ status: "cancelled", last_error: "Fora da janela 07-19 BRT" }).eq("id", job.id);
      return false;
    }

    if (INTERACTION_JOB_TYPES.includes(job.job_type)) {
      const budgetUsed = cycle.daily_interaction_budget_used || 0;
      const budgetMax = cycle.daily_interaction_budget_max || cycle.daily_interaction_budget_target || 500;
      if (budgetUsed >= budgetMax) {
        await db.from("warmup_jobs").update({ status: "cancelled", last_error: `Budget diário atingido: ${budgetUsed}/${budgetMax}` }).eq("id", job.id);
        return false;
      }
    }

    const chipState = cycle.chip_state || "new";

    switch (job.job_type) {
      case "join_group": {
        if (!baseUrl || !token) throw new Error("Credenciais UAZAPI não configuradas para join_group");

        const groupId = job.payload?.group_id;
        const groupName = job.payload?.group_name || groupId;

        const existingDeviceGroups = instanceGroupsMap[job.device_id] || [];
        const existingGroupRecord = existingDeviceGroups.find((ig: any) => ig.group_id === groupId);

        // Idempotência: se já está joined, não tenta entrar novamente no mesmo grupo
        if (existingGroupRecord?.join_status === "joined") {
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "group_joined",
            message: `Grupo ${groupName} já estava com status joined — tentativa duplicada ignorada`,
            meta: { group_name: groupName, skipped_duplicate: true },
          });
          break;
        }

        const poolGroupJoin = groupsPoolMap[groupId];

        if (!poolGroupJoin?.external_group_ref) throw new Error(`Grupo ${groupName} sem link de convite`);

        const inviteLink = poolGroupJoin.external_group_ref;
        const inviteCode = inviteLink.replace(/^https?:\/\//, "").replace(/^chat\.whatsapp\.com\//, "").split("?")[0].split("/")[0].trim();

        if (!inviteCode || inviteCode.length < 10) throw new Error(`Código de convite inválido para ${groupName}: ${inviteLink}`);

        console.log(`[join_group] Joining group ${groupName} with code ${inviteCode} via ${baseUrl}`);
        
        let joinResult: any = null;
        let joinOk = false;
        let joinJid: string | null = null;
        let joinError: string | null = null;

        const joinEndpoints = [
          { method: "POST", url: `${baseUrl}/group/join`, body: JSON.stringify({ invitecode: inviteCode }) },
          { method: "POST", url: `${baseUrl}/group/join`, body: JSON.stringify({ invitecode: inviteLink.split("?")[0] }) },
          { method: "PUT", url: `${baseUrl}/group/acceptInviteGroup`, body: JSON.stringify({ inviteCode }) },
        ];

        for (const ep of joinEndpoints) {
          try {
            const res = await fetch(ep.url, {
              method: ep.method,
              headers: { "Content-Type": "application/json", token, Accept: "application/json" },
              body: ep.body,
            });
            const raw = await res.text();
            let parsed: any;
            try { parsed = JSON.parse(raw); } catch (_e) { parsed = { raw }; }
            console.log(`[join_group] ${ep.method} ${ep.url} → ${res.status}: ${raw.substring(0, 300)}`);

            if (res.status === 405) continue;
            if (res.status === 500 && (parsed?.error === "error joining group" || parsed?.error === "internal server error")) continue;

            joinResult = parsed;
            if (res.ok || res.status === 409) {
              joinOk = true;
              const jid = parsed?.group?.JID || parsed?.data?.group?.JID || parsed?.data?.JID || parsed?.gid || parsed?.groupId || parsed?.jid || null;
              console.log(`[join_group] JID extraction: group.JID=${parsed?.group?.JID}, data.group.JID=${parsed?.data?.group?.JID}, final=${jid}`);
              if (jid) joinJid = jid;
              const msg = (parsed?.message || parsed?.msg || "").toLowerCase();
              if (msg.includes("already") || msg.includes("já")) joinOk = true;
              break;
            } else {
              joinError = `${res.status}: ${raw.substring(0, 200)}`;
            }
          } catch (err) {
            joinError = err.message;
            continue;
          }
        }

        if (joinOk) {
          await db.from("warmup_instance_groups")
            .update({ join_status: "joined", joined_at: new Date().toISOString(), ...(joinJid ? { group_jid: joinJid } : {}) })
            .eq("device_id", job.device_id).eq("group_id", groupId);

          // Atualiza cache local para evitar dupla tentativa dentro do mesmo tick
          if (existingGroupRecord) {
            existingGroupRecord.join_status = "joined";
            if (joinJid) existingGroupRecord.group_jid = joinJid;
          }

          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "group_joined",
            message: `Entrou no grupo ${groupName} via API${joinJid ? ` (JID: ${joinJid})` : ""}`,
            meta: { group_name: groupName, invite_code: inviteCode, jid: joinJid, response: joinResult },
          });
        } else {
          await db.from("warmup_instance_groups")
            .update({ join_status: "failed", last_error: joinError || "Falha ao entrar no grupo" })
            .eq("device_id", job.device_id).eq("group_id", groupId);
          throw new Error(`Falha ao entrar no grupo ${groupName}: ${joinError}`);
        }
        break;
      }

      case "phase_transition": {
        const targetPhase = job.payload?.target_phase || "groups_only";

        await db.from("warmup_jobs")
          .update({ status: "cancelled", last_error: "Cancelado: transição de fase" })
          .eq("cycle_id", cycle.id).eq("status", "pending")
          .in("job_type", INTERACTION_JOB_TYPES);

        await db.from("warmup_cycles").update({ phase: targetPhase }).eq("id", cycle.id);

        if (targetPhase === "groups_only") {
          const joinScheduled = await ensureJoinGroupJobs(db, cycle.id, job.user_id, job.device_id);
          if (joinScheduled > 0) console.log(`[phase_transition] Scheduled ${joinScheduled} join_group jobs for device ${job.device_id}`);
        }

        await scheduleDayJobs(db, cycle.id, job.user_id, job.device_id, cycle.day_index, targetPhase, chipState);

        bufferAuditLog({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "phase_changed",
          message: `Fase alterada: ${cycle.phase} → ${targetPhase}`,
          meta: { from: cycle.phase, to: targetPhase },
        });
        break;
      }

      case "group_interaction": {
        if (!baseUrl || !token) throw new Error("Credenciais UAZAPI não configuradas");

        const allIGs = instanceGroupsMap[job.device_id] || [];
        const joinedGroups = allIGs.filter((ig: any) => ig.join_status === "joined");

        if (joinedGroups.length === 0) throw new Error("Nenhum grupo joined encontrado");

        const cachedMsgs = userMsgsMap[job.user_id];
        const hasCustomPool = cachedMsgs && cachedMsgs.length > 0;
        const getGroupMsg = () => {
          if (hasCustomPool && Math.random() < 0.3) return pickRandom(cachedMsgs);
          return generateNaturalMessage("group");
        };

        const targetGroupRecord = pickRandom(joinedGroups);
        const poolGroup = groupsPoolMap[targetGroupRecord.group_id];

        let groupJid = targetGroupRecord.group_jid;
        if (!groupJid && poolGroup?.external_group_ref) {
          const ref = poolGroup.external_group_ref;
          if (ref.includes("@g.us")) groupJid = ref;
        }

        if (!groupJid) {
          console.log(`[group_interaction] No JID for group ${poolGroup?.name}, attempting to resolve...`);
          try {
            const groupsRes = await fetch(`${baseUrl}/group/fetchAllGroups`, {
              method: "GET",
              headers: { token, Accept: "application/json" },
            });
            if (groupsRes.ok) {
              const groupsList = await groupsRes.json();
              const groups = Array.isArray(groupsList) ? groupsList : (groupsList?.data || []);
              const match = groups.find((g: any) =>
                (g.subject || g.name || "").toLowerCase() === (poolGroup?.name || "").toLowerCase()
              );
              if (match) {
                groupJid = match.jid || match.id || match.JID;
                if (groupJid) {
                  await db.from("warmup_instance_groups").update({ group_jid: groupJid })
                    .eq("device_id", job.device_id).eq("group_id", targetGroupRecord.group_id);
                  console.log(`[group_interaction] Resolved JID for ${poolGroup?.name}: ${groupJid}`);
                }
              }
            }
          } catch (e) {
            console.warn(`[group_interaction] Failed to resolve JID:`, e.message);
          }
        }

        if (!groupJid) {
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "warn", event_type: "group_no_jid",
            message: `Grupo sem JID resolvido: ${poolGroup?.name || targetGroupRecord.group_id}`,
          });
          break;
        }

        const mediaType = pickMediaType();
        let message = getGroupMsg();
        let mediaLabel = "texto";

        try {
          if (mediaType === "image") {
            const imgUrl = pickRandom(imagePool);
            const caption = pickRandom(IMAGE_CAPTIONS);
            await uazapiSendImage(baseUrl, token, groupJid, imgUrl, caption);
            message = `[IMG] ${caption}`;
            mediaLabel = "imagem";
          } else {
            await uazapiSendText(baseUrl, token, groupJid, message);
          }
        } catch (mediaErr) {
          console.warn(`[group_interaction] ${mediaType} failed, fallback to text:`, mediaErr.message);
          message = getGroupMsg();
          mediaLabel = "texto (fallback)";
          await uazapiSendText(baseUrl, token, groupJid, message);
        }

        await db.from("warmup_cycles").update({
          daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
        }).eq("id", cycle.id);

        bufferAuditLog({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "group_msg_sent",
          message: `[${mediaLabel}] Msg no grupo ${poolGroup?.name}: "${message.substring(0, 50)}"`,
          meta: { group_name: poolGroup?.name, group_jid: groupJid, media_type: mediaType },
        });
        break;
      }

      case "autosave_interaction": {
        if (!baseUrl || !token) throw new Error("Credenciais UAZAPI não configuradas");

        const recipientIndex = job.payload?.recipient_index ?? 0;
        const msgIndex = job.payload?.msg_index ?? 0;

        const contacts = autosaveMap[job.user_id] || [];

        if (contacts.length === 0) {
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "warn", event_type: "autosave_no_contacts",
            message: "Nenhum contato Auto Save ativo",
          });
          break;
        }

        const contact = contacts[recipientIndex % contacts.length];
        const autosaveMessage = generateNaturalMessage("autosave");
        const phoneNumber = contact.phone_e164.replace(/\+/g, "");

        await uazapiSendText(baseUrl, token, phoneNumber, autosaveMessage);

        const todayStr = new Date().toISOString().split("T")[0];
        try {
          await db.from("warmup_unique_recipients").insert({
            cycle_id: cycle.id, user_id: job.user_id,
            recipient_phone_e164: contact.phone_e164, day_date: todayStr,
          });
        } catch (_e) { /* duplicate OK */ }

        await db.from("warmup_cycles").update({
          daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
          daily_unique_recipients_used: (cycle.daily_unique_recipients_used || 0) + (msgIndex === 0 ? 1 : 0),
        }).eq("id", cycle.id);

        const msgsPerContact = chipState === "recovered" ? 2 : 3;
        bufferAuditLog({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "autosave_msg_sent",
          message: `Auto Save: msg ${msgIndex + 1}/${msgsPerContact} para ${contact.contact_name || phoneNumber}`,
          meta: { phone: phoneNumber, msg_index: msgIndex },
        });
        break;
      }

      case "community_interaction": {
        if (!baseUrl || !token) throw new Error("Credenciais UAZAPI não configuradas");

        const peerIndex = job.payload?.peer_index ?? 0;
        const isImage = job.payload?.is_image === true;

        const { data: pairs } = await db.from("community_pairs")
          .select("id, instance_id_a, instance_id_b")
          .eq("cycle_id", cycle.id).eq("status", "active");

        const { data: otherCycles } = await db.from("warmup_cycles")
          .select("id, device_id, user_id")
          .eq("is_running", true)
          .neq("device_id", job.device_id)
          .in("phase", ["autosave_enabled", "community_light", "community_enabled"])
          .limit(50);

        const peerCandidates: { deviceId: string; fromPair: boolean; pairId?: string }[] = [];

        if (pairs && pairs.length > 0) {
          for (const pair of pairs) {
            const isA = pair.instance_id_a === job.device_id;
            const partnerId = isA ? pair.instance_id_b : pair.instance_id_a;
            peerCandidates.push({ deviceId: partnerId, fromPair: true, pairId: pair.id });
          }
        }
        if (otherCycles && otherCycles.length > 0) {
          for (const oc of otherCycles) {
            if (!peerCandidates.some(p => p.deviceId === oc.device_id)) {
              peerCandidates.push({ deviceId: oc.device_id, fromPair: false });
            }
          }
        }

        if (peerCandidates.length === 0) {
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "warn", event_type: "community_no_peers",
            message: "Nenhuma instância online encontrada — conversa comunitária adiada",
          });
          break;
        }

        const selectedPeer = peerCandidates[peerIndex % peerCandidates.length];
        const { data: pd } = await db.from("devices").select("number, status").eq("id", selectedPeer.deviceId).single();
        if (!pd?.number || !CONNECTED_STATUSES.includes(pd.status)) {
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "warn", event_type: "community_peer_offline",
            message: `Peer ${peerIndex} offline, msg ${job.payload?.msg_index ?? 0} adiada`,
            meta: { peer_index: peerIndex, partner_device: selectedPeer.deviceId },
          });
          break;
        }

        const targetPhone = pd.number.replace(/\+/g, "");

        if (isImage) {
          const imageUrl = pickRandom(imagePool);
          const caption = pickRandom(IMAGE_CAPTIONS);
          try {
            await uazapiSendImage(baseUrl, token, targetPhone, imageUrl, caption);
          } catch (_imgErr) {
            const communityMsg = generateNaturalMessage("community");
            await uazapiSendText(baseUrl, token, targetPhone, communityMsg);
          }
        } else {
          const communityMsg = generateNaturalMessage("community");
          await uazapiSendText(baseUrl, token, targetPhone, communityMsg);
        }

        await db.from("warmup_cycles").update({
          daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
        }).eq("id", cycle.id);

        bufferAuditLog({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "community_msg_sent",
          message: `Comunitário: ${isImage ? "📷" : "💬"} peer ${peerIndex} msg ${job.payload?.msg_index ?? 0} → ${targetPhone.substring(0, 6)}...`,
          meta: { peer_index: peerIndex, msg_index: job.payload?.msg_index, is_image: isImage, partner_device: selectedPeer.deviceId, pair_id: selectedPeer.pairId },
        });
        break;
      }

      case "enable_autosave": {
        const { count } = await db.from("warmup_autosave_contacts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", job.user_id).eq("is_active", true);

        if (count && count > 0) {
          await db.from("warmup_cycles").update({ phase: "autosave_enabled" }).eq("id", cycle.id);

          const { data: existingMembership } = await db.from("warmup_community_membership")
            .select("id, is_enabled").eq("device_id", job.device_id).maybeSingle();

          if (!existingMembership) {
            await db.from("warmup_community_membership").insert({
              user_id: job.user_id, device_id: job.device_id, cycle_id: cycle.id,
              is_eligible: true, is_enabled: true, enabled_at: new Date().toISOString(),
              notes: "Auto-enrolled at autosave phase",
            });
          } else if (!existingMembership.is_enabled) {
            await db.from("warmup_community_membership")
              .update({ is_enabled: true, is_eligible: true, enabled_at: new Date().toISOString(), cycle_id: cycle.id })
              .eq("id", existingMembership.id);
          }

          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "autosave_enabled",
            message: `Auto Save ativado: ${count} contatos ativos`,
          });
        } else {
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "warn", event_type: "autosave_no_contacts",
            message: "Auto Save: nenhum contato ativo, mantendo fase anterior",
          });
        }
        break;
      }

      case "enable_community": {
        await db.from("warmup_cycles").update({ phase: "community_enabled" }).eq("id", cycle.id);
        bufferAuditLog({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "community_enabled",
          message: "Comunidade ativada",
        });
        break;
      }

      case "health_check": {
        bufferAuditLog({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "health_check",
          message: `Health check OK — device ${device.status}, cycle day ${cycle.day_index}`,
        });
        break;
      }

      case "daily_reset": {
        // Determine if still within first 24h
        const first24hEndsAt = new Date(cycle.first_24h_ends_at);
        if (Date.now() < first24hEndsAt.getTime()) {
          if (cycle.phase === "pre_24h") {
            // Defer reset to first 00:05 BRT (03:05 UTC) AFTER the 24h window
            const deferredReset = new Date(first24hEndsAt);
            deferredReset.setUTCHours(3, 5, 0, 0);
            if (deferredReset.getTime() <= first24hEndsAt.getTime()) {
              deferredReset.setUTCDate(deferredReset.getUTCDate() + 1);
            }

            await db.from("warmup_jobs").update({
              status: "pending", run_at: deferredReset.toISOString(), last_error: "",
            }).eq("id", job.id);

            bufferAuditLog({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "info", event_type: "daily_reset_deferred",
              message: `daily_reset adiado para ${deferredReset.toISOString()} aguardando fim das 24h iniciais`,
            });
            return false;
          }
        }

        const newDay = Math.min(cycle.day_index + 1, cycle.days_total);

        if (newDay > cycle.days_total) {
          await db.from("warmup_cycles").update({
            is_running: false, phase: "completed",
            daily_interaction_budget_used: 0, daily_unique_recipients_used: 0,
          }).eq("id", cycle.id);
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "cycle_completed",
            message: `Ciclo concluído após ${cycle.days_total} dias 🎉`,
          });
          break;
        }

        const newPhase = getPhaseForDay(newDay, chipState);

        if (newPhase === "completed") {
          await db.from("warmup_cycles").update({
            is_running: false, phase: "completed",
            daily_interaction_budget_used: 0, daily_unique_recipients_used: 0,
          }).eq("id", cycle.id);
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "cycle_completed",
            message: `Ciclo concluído após ${cycle.days_total} dias 🎉`,
          });
          break;
        }

        // Cancel ALL pending interaction jobs from previous day
        await db.from("warmup_jobs")
          .update({ status: "cancelled", last_error: "Cancelado: reset diário" })
          .eq("cycle_id", cycle.id).eq("status", "pending")
          .in("job_type", [...INTERACTION_JOB_TYPES, "enable_autosave", "enable_community"]);

        // Update cycle day and phase
        await db.from("warmup_cycles").update({
          day_index: newDay,
          phase: newPhase,
          last_daily_reset_at: new Date().toISOString(),
        }).eq("id", cycle.id);

        const chipLabels: Record<string, string> = { new: "NOVO", recovered: "BANIDO/RECUPERAÇÃO", unstable: "CRÍTICO/INSTÁVEL" };
        const chipLabel = chipLabels[chipState] || chipState.toUpperCase();
        bufferAuditLog({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          level: "info", event_type: "daily_reset",
          message: `Reset diário: dia ${newDay}/${cycle.days_total}, fase: ${newPhase}, perfil: ${chipLabel}`,
          meta: { day: newDay, phase: newPhase, chip_state: chipState },
        });

        // Schedule today's jobs (scheduleDayJobs will set the budget)
        await scheduleDayJobs(db, cycle.id, job.user_id, job.device_id, newDay, newPhase, chipState);

        // Schedule NEXT daily_reset for tomorrow at 00:05 BRT (03:05 UTC)
        const nextReset = new Date();
        nextReset.setUTCDate(nextReset.getUTCDate() + 1);
        nextReset.setUTCHours(3, 5, 0, 0);
        await db.from("warmup_jobs").insert({
          user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
          job_type: "daily_reset", payload: {},
          run_at: nextReset.toISOString(), status: "pending",
        });

        break;
      }

      default:
        console.warn(`[warmup-tick] Unknown job type: ${job.job_type}`);
        break;
    }

    return true;
  }

  // Process devices in parallel batches
  for (let i = 0; i < deviceIds.length; i += MAX_PARALLEL_DEVICES) {
    const batch = deviceIds.slice(i, i + MAX_PARALLEL_DEVICES);
    const results = await Promise.allSettled(
      batch.map(async (did) => {
        const jobs = jobsByDevice[did];
        for (const job of jobs) {
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
              await db.from("warmup_jobs").update({
                status: "failed", last_error: err.message, attempts,
              }).eq("id", job.id);
            } else {
              const retryAt = new Date(Date.now() + backoffMinutes(attempts) * 60 * 1000).toISOString();
              await db.from("warmup_jobs").update({
                status: "pending", last_error: err.message, attempts, run_at: retryAt,
              }).eq("id", job.id);
            }
            bufferAuditLog({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "error", event_type: `${job.job_type}_error`,
              message: `Erro no job ${job.job_type}: ${err.message.substring(0, 200)}`,
              meta: { attempts, job_id: job.id },
            });
          }
        }
      })
    );
  }

  await flushAuditLogs();

  console.log(`[warmup-tick] Processed: ${succeeded + failed}, succeeded: ${succeeded}, failed: ${failed}, devices: ${deviceIds.length}, parallel: ${MAX_PARALLEL_DEVICES}, audit_logs: ${auditLogBuffer.length}`);

  return json({
    ok: true,
    processed_jobs_count: succeeded + failed,
    succeeded,
    failed,
    devices_processed: deviceIds.length,
    next_pending_run_at: null,
  });
}

// ════════════════════════════════════════
// Ensure join_group jobs are scheduled
// ════════════════════════════════════════
async function ensureJoinGroupJobs(db: any, cycleId: string, userId: string, deviceId: string) {
  const { data: existingJoinJobs } = await db.from("warmup_jobs")
    .select("id").eq("cycle_id", cycleId).eq("job_type", "join_group")
    .in("status", ["pending", "running"]).limit(1);

  if (existingJoinJobs && existingJoinJobs.length > 0) return 0;

  const { data: pendingGroups } = await db.from("warmup_instance_groups")
    .select("group_id, warmup_groups_pool(id, name)")
    .eq("device_id", deviceId).eq("join_status", "pending");

  if (!pendingGroups || pendingGroups.length === 0) return 0;

  const shuffled = pendingGroups.sort(() => Math.random() - 0.5);
  const nowMs = Date.now();
  const joinJobs: any[] = [];

  // Use consistent 5-30min spacing between groups
  let cumulativeMs = randInt(5, 15) * 60 * 1000; // first group in 5-15 min
  for (let i = 0; i < shuffled.length; i++) {
    const g = shuffled[i];
    const groupName = g.warmup_groups_pool?.name || "Grupo";
    const runAt = new Date(nowMs + cumulativeMs);

    joinJobs.push({
      user_id: userId, device_id: deviceId, cycle_id: cycleId,
      job_type: "join_group",
      payload: { group_id: g.group_id, group_name: groupName },
      run_at: runAt.toISOString(), status: "pending",
    });
    cumulativeMs += randInt(5, 30) * 60 * 1000; // 5-30 min between each
  }

  if (joinJobs.length > 0) await db.from("warmup_jobs").insert(joinJobs);
  return joinJobs.length;
}

// ════════════════════════════════════════
// Schedule jobs for a specific day/phase
// UNIFIED: proper window-based scheduling (07:00-19:00 BRT = 10:00-22:00 UTC)
// ════════════════════════════════════════
async function scheduleDayJobs(
  db: any, cycleId: string, userId: string, deviceId: string,
  dayIndex: number, phase: string, chipState: string = "new",
) {
  if (phase === "pre_24h" || phase === "completed") return 0;

  const now = new Date();
  const jobs: any[] = [];

  // Operating window: 07:00-19:00 BRT = 10:00-22:00 UTC
  const windowStartUTC = new Date(now);
  windowStartUTC.setUTCHours(10, 0, 0, 0);
  const windowEndUTC = new Date(now);
  windowEndUTC.setUTCHours(22, 0, 0, 0);

  // If we're before today's window, schedule from window start
  // If we're after today's window, no jobs for today
  let effectiveStart: number;
  if (now.getTime() < windowStartUTC.getTime()) {
    effectiveStart = windowStartUTC.getTime();
  } else if (now.getTime() >= windowEndUTC.getTime()) {
    console.log(`[scheduleDayJobs] Outside window (after 19h BRT), skipping day ${dayIndex}`);
    return 0;
  } else {
    effectiveStart = now.getTime();
  }
  const effectiveEnd = windowEndUTC.getTime();
  const windowMs = effectiveEnd - effectiveStart;

  if (windowMs < 30 * 60 * 1000) {
    console.log(`[scheduleDayJobs] Window too small (${Math.round(windowMs / 60000)}min), skipping`);
    return 0;
  }

  // ── Volume config (consistent with engine) ──
  let groupMsgs = 0, autosaveContacts = 0, autosaveRounds = 0;
  let communityPeers = 0, communityMsgsPerPeer = 0;

  if (phase === "groups_only") {
    groupMsgs = chipState === "unstable" ? randInt(15, 25) : randInt(25, 50);
  } else if (phase === "autosave_enabled") {
    groupMsgs = chipState === "unstable" ? randInt(20, 30) : randInt(30, 50);
    autosaveContacts = 5;
    autosaveRounds = chipState === "recovered" ? 2 : 3;
  } else if (phase === "community_enabled" || phase === "community_light") {
    groupMsgs = chipState === "unstable" ? randInt(20, 30) : randInt(30, 50);
    autosaveContacts = 5;
    autosaveRounds = chipState === "recovered" ? 2 : 3;
    const groupsEnd = getGroupsEndDay(chipState);
    const communityStartDay = groupsEnd + 2;
    const communityDay = dayIndex - communityStartDay + 1;
    const peerScale = [0, 3, 5, 10, 10, 15, 20, 25, 30, 35, 40];
    communityPeers = communityDay <= 0 ? 0 : peerScale[Math.min(communityDay, peerScale.length - 1)];
    communityMsgsPerPeer = communityPeers > 0 ? randInt(30, 50) : 0;
  }

  // ── GROUP INTERACTIONS ──
  if (groupMsgs > 0) {
    const spacing = windowMs / (groupMsgs + 1);
    for (let i = 0; i < groupMsgs; i++) {
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

  // ── AUTOSAVE INTERACTIONS ── (last 3 hours of window)
  if (autosaveContacts > 0 && autosaveRounds > 0) {
    const totalAutosave = autosaveContacts * autosaveRounds;
    const asStart = Math.max(effectiveEnd - 3 * 60 * 60 * 1000, effectiveStart);
    const asWindowMs = effectiveEnd - asStart;
    const asSpacing = asWindowMs / (totalAutosave + 1);

    for (let round = 0; round < autosaveRounds; round++) {
      for (let c = 0; c < autosaveContacts; c++) {
        const idx = round * autosaveContacts + c;
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

  // ── COMMUNITY INTERACTIONS ── (conversation bursts)
  if (communityPeers > 0 && communityMsgsPerPeer > 0) {
    const peerWindowMs = windowMs / communityPeers;
    for (let p = 0; p < communityPeers; p++) {
      const peerStart = effectiveStart + (peerWindowMs * p);
      const convStart = peerStart + randInt(0, Math.floor(peerWindowMs * 0.1));
      for (let m = 0; m < communityMsgsPerPeer; m++) {
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

  // ── PHASE TRANSITION JOBS ──
  if (phase === "groups_only") {
    const transitionDay = getGroupsEndDay(chipState) + 1;
    if (dayIndex >= transitionDay - 1) {
      jobs.push({
        user_id: userId, device_id: deviceId, cycle_id: cycleId,
        job_type: "enable_autosave", payload: {},
        run_at: new Date(effectiveEnd - 60000).toISOString(),
        status: "pending",
      });
    }
  }
  if (phase === "autosave_enabled") {
    jobs.push({
      user_id: userId, device_id: deviceId, cycle_id: cycleId,
      job_type: "enable_community", payload: {},
      run_at: new Date(effectiveEnd - 60000).toISOString(),
      status: "pending",
    });
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

  if (jobs.length > 0) {
    for (let i = 0; i < jobs.length; i += 100) {
      await db.from("warmup_jobs").insert(jobs.slice(i, i + 100));
    }
  }

  console.log(`[scheduleDayJobs] Day ${dayIndex} (${phase}, ${chipState}): ${jobs.length} jobs, window ${new Date(effectiveStart).toISOString()} → ${new Date(effectiveEnd).toISOString()}`);
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
