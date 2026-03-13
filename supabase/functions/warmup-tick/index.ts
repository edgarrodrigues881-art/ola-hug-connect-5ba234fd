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

// ── Media pools for warmup variety ──
// Uses images from the 'media' storage bucket under warmup-media/ folder.
// Upload 10-20 varied images (landscapes, food, pets, etc.) there.
// Falls back to public stock URLs if bucket images aren't available.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
function getImagePool(): string[] {
  const bucketBase = `${SUPABASE_URL}/storage/v1/object/public/media/warmup-media`;
  // Pool of filenames expected in the bucket (upload manually: 01.jpg, 02.jpg, etc.)
  const bucketImages = Array.from({ length: 30 }, (_, i) => 
    `${bucketBase}/${String(i + 1).padStart(2, "0")}.jpg`
  );
  // Fallback stock images (free, no attribution needed)
  const fallbackImages = [
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
  return [...bucketImages, ...fallbackImages];
}
const IMAGE_POOL = getImagePool();

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

const STATUS_CAPTIONS = [
  "Bom dia! ☀️ Que seu dia seja incrível",
  "Boa tarde pessoal! 🌤️ Seguimos firmes",
  "Boa noite! 🌙 Descansem bem",
  "Dia produtivo demais 💪 Gratidão",
  "Mais um dia de luta e conquista 🔥",
  "Gratidão por tudo que tenho 🙏",
  "Trabalhando duro pra conquistar 💼",
  "Foco total no objetivo 🎯",
  "Semana abençoada pra todos ✨",
  "Vamos que vamos, sem parar 🚀",
  "Dia lindo pra ser feliz ☀️",
  "Sextou com estilo 🎉",
  "Deus é bom o tempo todo 🙌",
  "Confiança no processo sempre 🧠",
  "Sempre em frente, nunca pra trás ➡️",
  "Dia de conquistas e vitórias 🏆",
  "Tranquilidade e paz interior 🧘",
  "Bora trabalhar e fazer acontecer 💰",
  "A natureza é perfeita 🌿",
  "Momentos que valem a pena registrar 📸",
  "Cada dia é um presente 🎁",
  "O melhor tá por vir ✨",
  "Tudo no tempo de Deus 🙏",
  "Energia positiva sempre 🌟",
  "A vida é feita de momentos assim 💛",
];

async function uazapiSendImage(baseUrl: string, token: string, number: string, imageUrl: string, caption: string) {
  // UAZAPI V2 expects "file" field for image URL
  const endpoints = [
    { path: "/send/image", body: { number, file: imageUrl, caption } },
    { path: "/send/image", body: { number, image: imageUrl, caption } },
    { path: "/send/media", body: { number, file: imageUrl, caption, type: "image" } },
    { path: "/send/media", body: { number, mediaUrl: imageUrl, caption, type: "image" } },
  ];
  let lastErr: any = null;
  for (const ep of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token, Accept: "application/json" },
        body: JSON.stringify(ep.body),
      });
      if (res.status === 405) continue;
      const txt = await res.text();
      console.log(`[sendImage] ${ep.path} keys=${JSON.stringify(Object.keys(ep.body))} → ${res.status}: ${txt.substring(0, 200)}`);
      if (!res.ok) {
        // If it's "missing file field", try next variant
        if (txt.includes("missing file") || txt.includes("missing image")) continue;
        if (ep === endpoints[endpoints.length - 1]) throw lastErr;
        continue;
      }
      try { return JSON.parse(txt); } catch (_) { return { ok: true }; }
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr || new Error("All image send endpoints failed");
}

// Audio removed — only text + image

async function uazapiPostStatus(baseUrl: string, token: string, type: "text" | "image", content: string, imageUrl?: string) {
  const endpoints = ["/status/post", "/sendStories"];
  let lastErr: any = null;
  for (const ep of endpoints) {
    // For image status, try multiple field names (file, image)
    const payloadVariants: any[] = type === "text"
      ? [{ type: "text", content, backgroundColor: pickRandom(["#25D366", "#128C7E", "#075E54", "#34B7F1", "#ECE5DD", "#DCF8C6", "#1DA1F2", "#FF6B6B", "#4ECDC4", "#2C3E50"]), font: randInt(0, 4) }]
      : [
          { type: "image", file: imageUrl, caption: content },
          { type: "image", image: imageUrl, caption: content },
          { type: "image", url: imageUrl, caption: content },
        ];

    for (const payload of payloadVariants) {
      try {
        const res = await fetch(`${baseUrl}${ep}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", token, Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status === 405) break; // endpoint not supported, try next
        const txt = await res.text();
        if (!res.ok) {
          lastErr = new Error(`Status API ${res.status}: ${txt}`);
          if (txt.includes("missing file") || txt.includes("missing image")) continue;
          if (ep === endpoints[endpoints.length - 1] && payload === payloadVariants[payloadVariants.length - 1]) throw lastErr;
          continue;
        }
        try { return JSON.parse(txt); } catch (_) { return { ok: true }; }
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
  }
  throw lastErr || new Error("All status post endpoints failed");
}

// Decide media type for group interaction: 75% text, 25% image (no audio)
type MediaType = "text" | "image";
function pickMediaType(): MediaType {
  return Math.random() < 0.75 ? "text" : "image";
}

// ════════════════════════════════════════
// TICK HANDLER — process pending jobs
// ════════════════════════════════════════
async function handleTick(db: any) {
  const CONNECTED_STATUSES = ["Ready", "Connected", "authenticated"];
  const now = new Date().toISOString();

  // Recover stale "running" jobs (stuck for >5 minutes) back to pending
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

  // Mark as running in batches of 200 (Supabase .in() limit)
  const jobIds = pendingJobs.map((j: any) => j.id);
  for (let i = 0; i < jobIds.length; i += 200) {
    await db.from("warmup_jobs").update({ status: "running" }).in("id", jobIds.slice(i, i + 200));
  }

  // ══════════════════════════════════════════════════════════════
  // BATCH PRE-LOAD: Load ALL data in parallel to eliminate N+1 queries
  // ══════════════════════════════════════════════════════════════
  const uniqueCycleIds = [...new Set(pendingJobs.map((j: any) => j.cycle_id))];
  const uniqueUserIds = [...new Set(pendingJobs.map((j: any) => j.user_id))];
  const uniqueDeviceIds = [...new Set(pendingJobs.map((j: any) => j.device_id))];

  // Helper to batch-load with pagination
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

  // Run ALL batch loads in parallel
  const [cyclesArr, subsArr, profilesArr, devicesArr, userMsgsArr, autosaveArr, instanceGroupsArr, groupsPoolArr] = await Promise.all([
    batchLoad<any>("warmup_cycles", "id, user_id, device_id, phase, is_running, day_index, days_total, chip_state, daily_interaction_budget_min, daily_interaction_budget_max, daily_interaction_budget_target, daily_interaction_budget_used, daily_unique_recipients_cap, daily_unique_recipients_used, first_24h_ends_at, last_daily_reset_at, next_run_at, plan_id", "id", uniqueCycleIds),
    batchLoad<any>("subscriptions", "user_id, expires_at, created_at", "user_id", uniqueUserIds, q => q.order("created_at", { ascending: false })),
    batchLoad<any>("profiles", "id, status", "id", uniqueUserIds),
    batchLoad<any>("devices", "id, status, uazapi_token, uazapi_base_url, number", "id", uniqueDeviceIds),
    batchLoad<any>("warmup_messages", "content, user_id", "user_id", uniqueUserIds),
    batchLoad<any>("warmup_autosave_contacts", "id, phone_e164, contact_name, user_id", "user_id", uniqueUserIds, q => q.eq("is_active", true).order("created_at", { ascending: true })),
    batchLoad<any>("warmup_instance_groups", "group_id, group_jid, device_id, cycle_id, join_status", "device_id", uniqueDeviceIds),
    db.from("warmup_groups_pool").select("id, external_group_ref, name").eq("is_active", true).then((r: any) => r.data || []),
  ]);

  // Index into maps
  const cyclesMap: Record<string, any> = {};
  cyclesArr.forEach((c: any) => { cyclesMap[c.id] = c; });

  const subsMap: Record<string, any> = {};
  subsArr.forEach((s: any) => { if (!subsMap[s.user_id]) subsMap[s.user_id] = s; });

  const profilesMap: Record<string, any> = {};
  profilesArr.forEach((p: any) => { profilesMap[p.id] = p; });

  const devicesMap: Record<string, any> = {};
  devicesArr.forEach((d: any) => { devicesMap[d.id] = d; });

  // User messages indexed by user_id
  const userMsgsMap: Record<string, string[]> = {};
  userMsgsArr.forEach((m: any) => {
    if (!userMsgsMap[m.user_id]) userMsgsMap[m.user_id] = [];
    userMsgsMap[m.user_id].push(m.content);
  });

  // Autosave contacts indexed by user_id
  const autosaveMap: Record<string, any[]> = {};
  autosaveArr.forEach((c: any) => {
    if (!autosaveMap[c.user_id]) autosaveMap[c.user_id] = [];
    autosaveMap[c.user_id].push(c);
  });

  // Instance groups indexed by "device_id:cycle_id"
  const instanceGroupsMap: Record<string, any[]> = {};
  instanceGroupsArr.forEach((ig: any) => {
    const key = `${ig.device_id}:${ig.cycle_id}`;
    if (!instanceGroupsMap[key]) instanceGroupsMap[key] = [];
    instanceGroupsMap[key].push(ig);
  });

  // Groups pool indexed by id
  const groupsPoolMap: Record<string, any> = {};
  groupsPoolArr.forEach((g: any) => { groupsPoolMap[g.id] = g; });

  // Audit log buffer for batch insert
  const auditLogBuffer: any[] = [];
  function bufferAuditLog(log: any) { auditLogBuffer.push(log); }
  async function flushAuditLogs() {
    for (let i = 0; i < auditLogBuffer.length; i += 100) {
      await db.from("warmup_audit_logs").insert(auditLogBuffer.slice(i, i + 100));
    }
  }

  console.log(`[warmup-tick] Batch loaded: ${cyclesArr.length} cycles, ${subsArr.length} subs, ${profilesArr.length} profiles, ${devicesArr.length} devices, ${userMsgsArr.length} msgs, ${autosaveArr.length} autosave, ${instanceGroupsArr.length} igroups, ${groupsPoolArr.length} pool for ${pendingJobs.length} jobs`);

  // Track cycles already paused in this tick to avoid duplicate updates
  const pausedCycles = new Set<string>();

  // ══════════════════════════════════════════════════════════════
  // GROUP JOBS BY DEVICE for parallel processing
  // Jobs for the SAME device run sequentially (avoid concurrent WhatsApp calls)
  // Jobs for DIFFERENT devices run in parallel (Promise.allSettled)
  // ══════════════════════════════════════════════════════════════
  const jobsByDevice: Record<string, any[]> = {};
  for (const job of pendingJobs) {
    if (!jobsByDevice[job.device_id]) jobsByDevice[job.device_id] = [];
    jobsByDevice[job.device_id].push(job);
  }

  const MAX_PARALLEL_DEVICES = 10; // Process up to 10 devices simultaneously (safe for ~300 instances)
  const deviceIds = Object.keys(jobsByDevice);
  let succeeded = 0;
  let failed = 0;

  // Process a single job (extracted from the old loop body)
  async function processJob(job: any): Promise<boolean> {
    // ── Get cycle from cache ──
    const cycle = cyclesMap[job.cycle_id];

    if (!cycle || !cycle.is_running || pausedCycles.has(cycle.id)) {
      await db.from("warmup_jobs").update({ status: "cancelled" }).eq("id", job.id);
      return false;
    }

    // ── PLAN CHECK from cache ──
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

    // ── Device check from cache ──
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

      // ── Process job by type ──
      switch (job.job_type) {
        case "join_group": {
          if (!baseUrl || !token) {
            throw new Error("Credenciais UAZAPI não configuradas para join_group");
          }

          const groupId = job.payload?.group_id;
          const groupName = job.payload?.group_name || groupId;

          // Get the invite link from cached pool
          const poolGroupJoin = groupsPoolMap[groupId];

          if (!poolGroupJoin?.external_group_ref) {
            throw new Error(`Grupo ${groupName} sem link de convite`);
          }

          const inviteLink = poolGroupJoin.external_group_ref;
          // Extract invite code from link
          const inviteCode = inviteLink.replace(/^https?:\/\//, "").replace(/^chat\.whatsapp\.com\//, "").split("?")[0].split("/")[0].trim();

          if (!inviteCode || inviteCode.length < 10) {
            throw new Error(`Código de convite inválido para ${groupName}: ${inviteLink}`);
          }

          // Actually join the group via UAZAPI
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
                // Extract JID from response — UAZAPI returns { group: { JID: "..." }, response: "..." }
                const jid = parsed?.group?.JID 
                  || parsed?.data?.group?.JID 
                  || parsed?.data?.JID 
                  || parsed?.gid 
                  || parsed?.groupId 
                  || parsed?.jid 
                  || null;
                console.log(`[join_group] JID extraction: group.JID=${parsed?.group?.JID}, data.group.JID=${parsed?.data?.group?.JID}, final=${jid}`);
                if (jid) joinJid = jid;
                
                const msg = (parsed?.message || parsed?.msg || "").toLowerCase();
                if (msg.includes("already") || msg.includes("já")) {
                  joinOk = true; // already member is also OK
                }
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
              .update({ 
                join_status: "joined", 
                joined_at: new Date().toISOString(),
                ...(joinJid ? { group_jid: joinJid } : {}),
              })
              .eq("device_id", job.device_id)
              .eq("group_id", groupId);

            bufferAuditLog({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "info", event_type: "group_joined",
              message: `Entrou no grupo ${groupName} via API${joinJid ? ` (JID: ${joinJid})` : ""}`,
              meta: { group_name: groupName, invite_code: inviteCode, jid: joinJid, response: joinResult },
            });
          } else {
            // Mark as failed
            await db.from("warmup_instance_groups")
              .update({ join_status: "failed", last_error: joinError || "Falha ao entrar no grupo" })
              .eq("device_id", job.device_id)
              .eq("group_id", groupId);

            throw new Error(`Falha ao entrar no grupo ${groupName}: ${joinError}`);
          }
          break;
        }

        case "phase_transition": {
          const targetPhase = job.payload?.target_phase || "groups_only";
          await db.from("warmup_cycles").update({ phase: targetPhase }).eq("id", cycle.id);
          
          // When transitioning to groups_only (Day 2), schedule join_group jobs
          if (targetPhase === "groups_only") {
            const { data: pendingGroups } = await db
              .from("warmup_instance_groups")
              .select("group_id, warmup_groups_pool(id, name)")
              .eq("device_id", job.device_id)
              .eq("cycle_id", cycle.id)
              .eq("join_status", "pending");

            if (pendingGroups && pendingGroups.length > 0) {
              const shuffled = pendingGroups.sort(() => Math.random() - 0.5);
              const joinWindowMs = 4 * 60 * 60 * 1000; // 4h window
              const joinSpacing = joinWindowMs / (shuffled.length + 1);
              const joinJobs: any[] = [];
              const nowMs = Date.now();

              for (let i = 0; i < shuffled.length; i++) {
                const g = shuffled[i];
                const groupName = g.warmup_groups_pool?.name || "Grupo";
                const offset = joinSpacing * (i + 1) + randInt(-10, 10) * 60 * 1000;
                const runAt = new Date(nowMs + Math.max(offset, 5 * 60 * 1000));
                joinJobs.push({
                  user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
                  job_type: "join_group",
                  payload: { group_id: g.group_id, group_name: groupName },
                  run_at: runAt.toISOString(), status: "pending",
                });
              }
              if (joinJobs.length > 0) {
                await db.from("warmup_jobs").insert(joinJobs);
              }
            }

            // Also schedule today's group interaction jobs
            await scheduleDayJobs(db, cycle.id, job.user_id, job.device_id, cycle.day_index, targetPhase, cycle.chip_state || "new");
          }

          bufferAuditLog({
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

          const igKey = `${job.device_id}:${cycle.id}`;
          const allIGs = instanceGroupsMap[igKey] || [];
          const joinedGroups = allIGs.filter((ig: any) => ig.join_status === "joined");

          if (joinedGroups.length === 0) {
            throw new Error("Nenhum grupo joined encontrado");
          }

          // Use cached user messages
          const cachedMsgs = userMsgsMap[job.user_id];
          const useCustomPool = cachedMsgs && cachedMsgs.length > 0;
          const getGroupMsg = () => useCustomPool ? pickRandom(cachedMsgs) : generateNaturalMessage("group");

          const targetGroupRecord = pickRandom(joinedGroups);
          const poolGroup = groupsPoolMap[targetGroupRecord.group_id];

          // Resolve the actual JID: prefer stored group_jid, then external_group_ref if it looks like a JID
          let groupJid = targetGroupRecord.group_jid;
          if (!groupJid && poolGroup?.external_group_ref) {
            const ref = poolGroup.external_group_ref;
            // Only use external_group_ref if it looks like a JID (contains @g.us)
            if (ref.includes("@g.us")) {
              groupJid = ref;
            }
          }

          if (!groupJid) {
            // Try to resolve JID by fetching group info from API
            console.log(`[group_interaction] No JID for group ${poolGroup?.name}, attempting to resolve...`);
            try {
              const groupsRes = await fetch(`${baseUrl}/group/fetchAllGroups`, {
                method: "GET",
                headers: { token, Accept: "application/json" },
              });
              if (groupsRes.ok) {
                const groupsList = await groupsRes.json();
                const groups = Array.isArray(groupsList) ? groupsList : (groupsList?.data || []);
                // Match by name
                const match = groups.find((g: any) => 
                  (g.subject || g.name || "").toLowerCase() === (poolGroup?.name || "").toLowerCase()
                );
                if (match) {
                  groupJid = match.jid || match.id || match.JID;
                  if (groupJid) {
                    // Store for future use
                    await db.from("warmup_instance_groups")
                      .update({ group_jid: groupJid })
                      .eq("device_id", job.device_id)
                      .eq("group_id", targetGroupRecord.group_id);
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
              message: `Grupo sem JID resolvido: ${poolGroup?.name || targetGroupRecord.group_id}. Não é possível enviar mensagem.`,
            });
            break;
          }

          // Pick media type: text, image, or audio
          const mediaType = pickMediaType();
          let message = getGroupMsg();
          let mediaLabel = "texto";

          try {
            if (mediaType === "image") {
              const imgUrl = pickRandom(IMAGE_POOL);
              const caption = pickRandom(IMAGE_CAPTIONS);
              await uazapiSendImage(baseUrl, token, groupJid, imgUrl, caption);
              message = `[IMG] ${caption}`;
              mediaLabel = "imagem";
            } else {
              await uazapiSendText(baseUrl, token, groupJid, message);
            }
          } catch (mediaErr) {
            // Fallback to text if media fails
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
          if (!baseUrl || !token) {
            throw new Error("Credenciais UAZAPI não configuradas");
          }

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
              cycle_id: cycle.id,
              user_id: job.user_id,
              recipient_phone_e164: contact.phone_e164,
              day_date: todayStr,
            });
          } catch (_e) { /* duplicate OK */ }

          await db.from("warmup_cycles").update({
            daily_interaction_budget_used: (cycle.daily_interaction_budget_used || 0) + 1,
            daily_unique_recipients_used: (cycle.daily_unique_recipients_used || 0) + (msgIndex === 0 ? 1 : 0),
          }).eq("id", cycle.id);

          const msgsPerContact = cycle.chip_state === "recovered" ? 2 : 3;
          bufferAuditLog({
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

          const peerIndex = job.payload?.peer_index ?? 0;
          const isImage = job.payload?.is_image === true;

          // Build a stable list of eligible peers for this cycle
          // 1) Formal pairs
          const { data: pairs } = await db
            .from("community_pairs")
            .select("id, instance_id_a, instance_id_b")
            .eq("cycle_id", cycle.id)
            .eq("status", "active");

          // 2) Other running cycles as fallback peers
          const { data: otherCycles } = await db
            .from("warmup_cycles")
            .select("id, device_id, user_id")
            .eq("is_running", true)
            .neq("device_id", job.device_id)
            .in("phase", ["autosave_enabled", "community_light", "community_enabled"])
            .limit(50);

          // Build peer candidates list
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

          // Use peerIndex to pick the same peer for the entire conversation
          const selectedPeer = peerCandidates[peerIndex % peerCandidates.length];

          // Resolve phone number
          const { data: pd } = await db.from("devices").select("number, status").eq("id", selectedPeer.deviceId).single();
          if (!pd?.number || !CONNECTED_STATUSES.includes(pd.status)) {
            // Peer offline, skip silently
            bufferAuditLog({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "community_peer_offline",
              message: `Peer ${peerIndex} offline, msg ${job.payload?.msg_index ?? 0} adiada`,
              meta: { peer_index: peerIndex, partner_device: selectedPeer.deviceId },
            });
            break;
          }

          const targetPhone = pd.number.replace(/\+/g, "");

          // Send image or text
          if (isImage) {
            const imageUrl = pickRandom(IMAGE_POOL);
            const caption = pickRandom(IMAGE_CAPTIONS);
            try {
              await uazapiSendImage(baseUrl, token, targetPhone, imageUrl, caption);
            } catch (_imgErr) {
              // Fallback to text if image fails
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
          const { count } = await db
            .from("warmup_autosave_contacts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", job.user_id)
            .eq("is_active", true);

          if (count && count > 0) {
            await db.from("warmup_cycles").update({ phase: "autosave_enabled" }).eq("id", cycle.id);

            // Auto-enroll in community pool when reaching autosave phase
            const { data: existingMembership } = await db.from("warmup_community_membership")
              .select("id, is_enabled").eq("device_id", job.device_id).maybeSingle();
            if (!existingMembership) {
              await db.from("warmup_community_membership").insert({
                device_id: job.device_id, user_id: job.user_id, cycle_id: job.cycle_id,
                is_enabled: true, is_eligible: true, enabled_at: new Date().toISOString(),
              });
            } else if (!existingMembership.is_enabled) {
              await db.from("warmup_community_membership").update({
                is_enabled: true, is_eligible: true, enabled_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              }).eq("id", existingMembership.id);
            }

            bufferAuditLog({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "info", event_type: "phase_changed",
              message: `Auto Save habilitado (${count} contatos ativos) — inscrito no comunitário (somente receber)`,
              meta: { active_contacts: count, auto_enrolled_community: true },
            });
          } else {
            bufferAuditLog({
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
            bufferAuditLog({
              user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
              level: "warn", event_type: "community_blocked",
              message: "Comunidade bloqueada: fase pré-requisito não ativa",
            });
            break;
          }
          const enableTargetPhase = job.payload?.target_phase || "community_light";
          await db.from("warmup_cycles").update({ phase: enableTargetPhase }).eq("id", cycle.id);
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "phase_changed",
            message: `Comunidade habilitada: ${enableTargetPhase}`,
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

          // Cancel overdue interaction jobs from previous day
          const nowIso = new Date().toISOString();
          await db.from("warmup_jobs")
            .update({ status: "cancelled", last_error: "Job expirado no reset diário" })
            .eq("cycle_id", cycle.id)
            .eq("status", "pending")
            .lt("run_at", nowIso)
            .in("job_type", ["group_interaction", "post_status", "autosave_interaction", "community_interaction"]);

          const budgetMin = 200;
          const budgetMax = 500;
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

          const chipLabels: Record<string, string> = { new: "NOVO", recovered: "BANIDO/RECUPERAÇÃO", unstable: "CRÍTICO/INSTÁVEL" };
          const chipLabel = chipLabels[chipState] || chipState.toUpperCase();
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "daily_reset",
            message: `Reset diário [${chipLabel}]: dia ${newDay}/${cycle.days_total}, fase: ${newPhase}, budget: ${newTarget}`,
            meta: { day: newDay, phase: newPhase, budget_target: newTarget, chip_state: chipState },
          });

          await scheduleDayJobs(db, cycle.id, job.user_id, job.device_id, newDay, newPhase, chipState);

          const nextReset = new Date();
          nextReset.setUTCDate(nextReset.getUTCDate() + 1);
          nextReset.setUTCHours(3, 5, 0, 0);
          await db.from("warmup_jobs").insert({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            job_type: "daily_reset", payload: {}, run_at: nextReset.toISOString(), status: "pending",
          });
          break;
        }

        case "post_status": {
          if (!baseUrl || !token) {
            throw new Error("Credenciais UAZAPI não configuradas para post_status");
          }

          // Always use image from bucket + caption
          const statusImgUrl = pickRandom(IMAGE_POOL);
          let statusContent = pickRandom(STATUS_CAPTIONS);

          try {
            await uazapiPostStatus(baseUrl, token, "image", statusContent, statusImgUrl);
          } catch (statusErr) {
            // If image status fails, try text-only as last resort
            console.warn(`[post_status] Image status failed, trying text:`, statusErr.message);
            await uazapiPostStatus(baseUrl, token, "text", statusContent);
          }

          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "status_posted",
            message: `Status postado [imagem]: "${statusContent.substring(0, 50)}"`,
            meta: { status_type: "image", content: statusContent, image_url: statusImgUrl },
          });
          break;
        }

        case "health_check": {
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "info", event_type: "health_check", message: "Health check OK",
          });
          break;
        }

        default: {
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "warn", event_type: "unknown_job_type",
            message: `Tipo desconhecido: ${job.job_type}`,
          });
        }
      }

    await db.from("warmup_jobs").update({
      status: "succeeded", attempts: job.attempts + 1,
    }).eq("id", job.id);
    return true;
  }

  // Process all jobs for a single device sequentially
  async function processDeviceJobs(deviceJobs: any[]): Promise<{ ok: number; err: number }> {
    let ok = 0, err = 0;
    for (const job of deviceJobs) {
      try {
        const result = await processJob(job);
        if (result) ok++;
      } catch (jobErr: any) {
        err++;
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
        try {
          bufferAuditLog({
            user_id: job.user_id, device_id: job.device_id, cycle_id: job.cycle_id,
            level: "error", event_type: "job_failed",
            message: `Job ${job.job_type} falhou: ${jobErr.message}`,
            meta: { job_id: job.id, attempts: newAttempts },
          });
        } catch (_e) { /* ignore */ }
      }
    }
    return { ok, err };
  }

  // ══════════════════════════════════════════════════════════════
  // PARALLEL EXECUTION: Process devices in waves of MAX_PARALLEL_DEVICES
  // ══════════════════════════════════════════════════════════════
  for (let i = 0; i < deviceIds.length; i += MAX_PARALLEL_DEVICES) {
    const wave = deviceIds.slice(i, i + MAX_PARALLEL_DEVICES);
    const results = await Promise.allSettled(
      wave.map(devId => processDeviceJobs(jobsByDevice[devId]))
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        succeeded += r.value.ok;
        failed += r.value.err;
      } else {
        // Entire device batch failed (shouldn't happen, but just in case)
        console.error(`[warmup-tick] Device batch error:`, r.reason);
        failed += jobsByDevice[wave[results.indexOf(r)]]?.length || 0;
      }
    }
  }

  // Flush all buffered audit logs in one batch
  try {
    await flushAuditLogs();
  } catch (flushErr: any) {
    console.error(`[warmup-tick] Failed to flush audit logs (${auditLogBuffer.length} entries):`, flushErr.message);
  }

  const { data: nextPending } = await db
    .from("warmup_jobs")
    .select("run_at")
    .eq("status", "pending")
    .order("run_at", { ascending: true })
    .limit(1);

  console.log(`[warmup-tick] Processed: ${succeeded + failed}, succeeded: ${succeeded}, failed: ${failed}, devices: ${deviceIds.length}, parallel: ${MAX_PARALLEL_DEVICES}, audit_logs: ${auditLogBuffer.length}`);

  return json({
    ok: true,
    processed_jobs_count: succeeded + failed,
    succeeded,
    failed,
    devices_processed: deviceIds.length,
    next_pending_run_at: nextPending?.[0]?.run_at || null,
  });
}

// ════════════════════════════════════════
// Volume configuration
// Groups: 200-500 always | AutoSave: 5 contacts × 3 rounds | Community: progressive 5→40
// Status: 5/day always
// ════════════════════════════════════════
interface DayVolumes {
  groupMsgs: number;
  autosaveContacts: number;
  autosaveRounds: number;
  communityPeers: number;
  communityMsgsPerPeer: number;
  statusPosts: number;
}

function getVolumes(chipState: string, dayIndex: number, phase: string): DayVolumes {
  const v: DayVolumes = { groupMsgs: 0, autosaveContacts: 0, autosaveRounds: 0, communityPeers: 0, communityMsgsPerPeer: 0, statusPosts: 0 };

  if (phase === "pre_24h" || phase === "completed") return v;

  v.groupMsgs = randInt(200, 500);
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

// ════════════════════════════════════════
// Schedule jobs for a specific day/phase
// ════════════════════════════════════════
async function scheduleDayJobs(
  db: any, cycleId: string, userId: string, deviceId: string,
  dayIndex: number, phase: string, chipState: string = "new",
) {
  const now = new Date();
  const jobs: any[] = [];
  const today = new Date(now);
  const windowStartUTC = new Date(today);
  windowStartUTC.setUTCHours(10, 0, 0, 0);
  const windowEndUTC = new Date(today);
  windowEndUTC.setUTCHours(22, 0, 0, 0);
  const effectiveStart = Math.max(now.getTime(), windowStartUTC.getTime());
  const effectiveEnd = windowEndUTC.getTime();
  if (effectiveStart >= effectiveEnd) return 0;
  const windowMs = effectiveEnd - effectiveStart;
  const volumes = getVolumes(chipState, dayIndex, phase);

  if (volumes.groupMsgs > 0) {
    const groupSpacingMs = windowMs / volumes.groupMsgs;
    for (let i = 0; i < volumes.groupMsgs; i++) {
      const baseOffset = groupSpacingMs * i;
      const jitter = randInt(0, Math.floor(groupSpacingMs * 0.6));
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd) break;
      jobs.push({ user_id: userId, device_id: deviceId, cycle_id: cycleId, job_type: "group_interaction", payload: {}, run_at: runAt.toISOString(), status: "pending" });
    }
  }

  if (volumes.autosaveContacts > 0) {
    const totalAutosave = volumes.autosaveContacts * volumes.autosaveRounds;
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
        jobs.push({ user_id: userId, device_id: deviceId, cycle_id: cycleId, job_type: "autosave_interaction", payload: { recipient_index: c, msg_index: round }, run_at: runAt.toISOString(), status: "pending" });
      }
    }
  }

  // ── COMMUNITY (conversation bursts: each peer gets 30-50 msgs) ──
  if (volumes.communityPeers > 0 && volumes.communityMsgsPerPeer > 0) {
    const totalPeers = volumes.communityPeers;
    const msgsPerPeer = volumes.communityMsgsPerPeer;
    const peerWindowMs = windowMs / totalPeers;

    for (let p = 0; p < totalPeers; p++) {
      const peerStart = effectiveStart + (peerWindowMs * p);
      const convStart = peerStart + randInt(0, Math.floor(peerWindowMs * 0.1));
      for (let m = 0; m < msgsPerPeer; m++) {
        const msgOffset = m * randInt(30, 120) * 1000;
        const runAt = new Date(convStart + msgOffset);
        if (runAt.getTime() > effectiveEnd) break;
        const isImage = Math.random() < 0.25;
        jobs.push({ user_id: userId, device_id: deviceId, cycle_id: cycleId, job_type: "community_interaction", payload: { peer_index: p, msg_index: m, is_image: isImage }, run_at: runAt.toISOString(), status: "pending" });
      }
    }
  }

  if (volumes.statusPosts > 0) {
    const stSpacingMs = windowMs / (volumes.statusPosts + 1);
    for (let i = 0; i < volumes.statusPosts; i++) {
      const baseOffset = stSpacingMs * (i + 1);
      const jitter = randInt(-30, 30) * 60 * 1000;
      const runAt = new Date(effectiveStart + baseOffset + jitter);
      if (runAt.getTime() > effectiveEnd || runAt.getTime() < effectiveStart) continue;
      jobs.push({ user_id: userId, device_id: deviceId, cycle_id: cycleId, job_type: "post_status", payload: {}, run_at: runAt.toISOString(), status: "pending" });
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
// (duplicate getVolumes removed — using the one defined at line 1246)


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
