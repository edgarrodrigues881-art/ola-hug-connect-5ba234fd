// ══════════════════════════════════════════════════════════
// Gerador Combinatório de Mensagens Naturais para Aquecimento
// Produz 80.000+ variações únicas combinando blocos de texto
// ══════════════════════════════════════════════════════════

// ── BLOCOS DE SAUDAÇÃO ──
const SAUDACOES = [
  "oi", "oii", "oiii", "olá", "ola", "e aí", "eai", "eae",
  "fala", "fala aí", "salve", "opa", "hey", "ei",
  "bom dia", "boa tarde", "boa noite",
  "tudo bem", "tudo certo", "tudo joia", "tudo tranquilo",
  "e aí como tá", "e aí blz", "fala parceiro", "fala amigo",
  "oi oi", "eae mano", "fala ae", "opa tudo bem",
];

// ── PERGUNTAS NATURAIS ──
const PERGUNTAS = [
  "como está seu cachorro",
  "como está a casa nova",
  "conseguiu terminar a mudança",
  "como está o trabalho",
  "como está sua família",
  "como foi seu dia",
  "está tudo bem por aí",
  "como estão as coisas aí",
  "conseguiu resolver aquilo",
  "como está o tempo aí",
  "ainda mora no mesmo lugar",
  "está tudo tranquilo por aí",
  "o cachorro já melhorou",
  "a casa nova ficou boa",
  "o dia foi corrido hoje",
  "como tá o projeto",
  "já resolveu aquele problema",
  "como tá a saúde",
  "como foi a semana",
  "como tá o pessoal aí",
  "já conseguiu aquilo",
  "como anda o serviço",
  "resolveu aquela questão",
  "como está o carro",
  "como tá a reforma",
  "o que aprontou hoje",
  "como foi o fds",
  "já voltou de viagem",
  "como tá o clima aí",
  "ainda tá naquela empresa",
  "como anda o treino",
  "como tá o estudo",
  "já fez a prova",
  "como foi a entrevista",
  "como está o bairro novo",
  "como tá a internet aí",
  "já arrumou a moto",
  "como foi o almoço",
  "como tá a dieta",
  "já comprou aquilo",
  "como está o filho",
  "a obra já terminou",
  "como ficou a festa",
  "como foi a reunião",
  "o médico falou o quê",
  "já trocou de celular",
  "como tá a academia",
  "como foi o passeio",
  "já assistiu aquele filme",
  "como tá o novo emprego",
];

// ── COMENTÁRIOS NATURAIS ──
const COMENTARIOS = [
  "hoje o dia foi corrido",
  "aqui está bem tranquilo",
  "estou resolvendo umas coisas",
  "hoje trabalhei bastante",
  "estou organizando tudo aqui",
  "aqui está tudo certo",
  "hoje foi puxado",
  "estou vendo umas coisas aqui",
  "tô meio ocupado hoje",
  "aqui tá de boa",
  "dia longo hoje",
  "finalmente deu uma folga",
  "tô correndo atrás das coisas",
  "hoje rendeu bastante",
  "tô resolvendo umas pendências",
  "aqui tá tudo na paz",
  "dia cheio mas tá indo",
  "tô focado aqui no trabalho",
  "hoje foi tranquilo",
  "semana puxada essa",
  "tô organizando umas ideias",
  "hoje foi produtivo",
  "tô de olho em umas coisas",
  "por aqui tudo certo",
  "mandando ver no trabalho",
  "hoje foi correria pura",
  "tô no corre mas tá suave",
  "dia movimentado hoje",
  "por aqui tá tranquilo",
  "tô planejando uns negócios",
];

// ── COMPLEMENTOS OPCIONAIS ──
const COMPLEMENTOS = [
  "faz tempo que não falamos",
  "lembrei disso agora",
  "estava pensando nisso",
  "vi algo parecido hoje",
  "estava lembrando disso",
  "me veio na cabeça agora",
  "pensei nisso mais cedo",
  "lembrei de vc",
  "tava pensando aqui",
  "me falaram disso",
  "vi vc online e lembrei",
  "alguém comentou isso",
  "pensei nisso ontem",
  "me lembrou uma coisa",
  "queria saber mais",
  "fiquei curioso",
  "me disseram sobre isso",
  "tava com isso na cabeça",
  "lembrei na hora",
  "queria te perguntar",
];

// ── EMOJIS ──
const EMOJIS = [
  "🙂", "😂", "😅", "😄", "👍", "🙏", "🔥", "👀", "😎", "🤝",
  "😊", "🤔", "💯", "👏", "✌️", "🎉", "🙌", "😁", "🤗", "👌",
  "💪", "🌟", "⭐", "😃", "🤙", "👋", "❤️", "😆", "🫡", "🤣",
];

// ── NÚMEROS OPCIONAIS ──
const FRASES_NUMERO = [
  "faz {n} dias que pensei nisso",
  "já tem uns {n} dias",
  "isso aconteceu em {a}",
  "faz uns {n} dias",
  "já tem uns {n} anos",
  "faz {n} semanas",
  "uns {n} meses atrás",
  "a gente se viu uns {n} dias atrás",
  "faz {n} dias já",
  "lá pra {n} horas atrás",
];

// ── RESPOSTAS CURTAS (para comunidade) ──
const RESPOSTAS_CURTAS = [
  "ss", "sim", "aham", "uhum", "pode crer", "exato",
  "verdade", "isso aí", "com certeza", "claro",
  "tá certo", "beleza", "blz", "joia", "show",
  "massa", "dahora", "top", "boa", "firmeza",
  "haha", "kkk", "kkkk", "rsrs",
  "é mesmo", "pois é", "né", "sei",
  "entendi", "ah sim", "faz sentido", "de boa",
];

// ── FRASES DE GRUPO ──
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

// ── Helpers ──
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type MessageContext = "group" | "private" | "autosave" | "community";

// Tracking para evitar repetição recente
const recentMessages: string[] = [];
const MAX_RECENT = 200;

function isRecent(msg: string): boolean {
  return recentMessages.includes(msg);
}

function trackMessage(msg: string): void {
  recentMessages.push(msg);
  if (recentMessages.length > MAX_RECENT) {
    recentMessages.shift();
  }
}

/**
 * Gera uma mensagem natural combinatória (10-60 caracteres)
 * Estrutura: [saudação?] + [pergunta|comentário] + [complemento?] + [emoji?] + [número?]
 */
export function generateNaturalMessage(context: MessageContext = "group"): string {
  let attempts = 0;
  
  while (attempts < 50) {
    attempts++;
    const msg = buildMessage(context);
    
    if (msg.length >= 10 && msg.length <= 60 && !isRecent(msg)) {
      trackMessage(msg);
      return msg;
    }
  }
  
  // Fallback: simple message
  const fallback = context === "community"
    ? pickRandom(RESPOSTAS_CURTAS)
    : `${pickRandom(SAUDACOES)} ${pickRandom(PERGUNTAS)}?`;
  
  const trimmed = fallback.substring(0, 60);
  trackMessage(trimmed);
  return trimmed;
}

function buildMessage(context: MessageContext): string {
  const strategy = randInt(1, 10);
  
  // Strategy 1-3: Saudação + Pergunta
  if (strategy <= 3) {
    const saudacao = pickRandom(SAUDACOES);
    const pergunta = pickRandom(PERGUNTAS);
    let msg = `${saudacao} ${pergunta}?`;
    msg = maybeAddEmoji(msg);
    return capitalize(msg);
  }
  
  // Strategy 4-5: Pergunta sozinha
  if (strategy <= 5) {
    let msg = `${pickRandom(PERGUNTAS)}?`;
    msg = maybeAddEmoji(msg);
    return capitalize(msg);
  }
  
  // Strategy 6-7: Comentário + complemento opcional
  if (strategy <= 7) {
    let msg = pickRandom(COMENTARIOS);
    if (Math.random() < 0.3) {
      msg += `, ${pickRandom(COMPLEMENTOS)}`;
    }
    msg = maybeAddEmoji(msg);
    return capitalize(msg);
  }
  
  // Strategy 8: Saudação + comentário
  if (strategy === 8) {
    const saudacao = pickRandom(SAUDACOES);
    const comentario = pickRandom(COMENTARIOS);
    let msg = `${saudacao}, ${comentario}`;
    msg = maybeAddEmoji(msg);
    return capitalize(msg);
  }
  
  // Strategy 9: Frase com número
  if (strategy === 9) {
    const frase = pickRandom(FRASES_NUMERO);
    const n = randInt(2, 15);
    const a = randInt(2019, 2025);
    let msg = frase.replace("{n}", String(n)).replace("{a}", String(a));
    msg = maybeAddEmoji(msg);
    return capitalize(msg);
  }
  
  // Strategy 10: Context-specific
  if (context === "group") {
    let msg = pickRandom(FRASES_GRUPO);
    msg = maybeAddEmoji(msg);
    return capitalize(msg);
  }
  if (context === "community") {
    // Mix curtas + perguntas
    if (Math.random() < 0.4) {
      return pickRandom(RESPOSTAS_CURTAS);
    }
    let msg = pickRandom(PERGUNTAS) + "?";
    msg = maybeAddEmoji(msg);
    return capitalize(msg);
  }
  
  // Default: saudação simples
  let msg = pickRandom(SAUDACOES);
  msg = maybeAddEmoji(msg);
  return capitalize(msg);
}

function maybeAddEmoji(msg: string): string {
  const chance = Math.random();
  if (chance < 0.55) return msg; // 55% sem emoji
  if (chance < 0.85) return `${msg} ${pickRandom(EMOJIS)}`; // 30% 1 emoji
  return `${msg} ${pickRandom(EMOJIS)}${pickRandom(EMOJIS)}`; // 15% 2 emojis
}

/**
 * Gera N mensagens únicas de uma vez
 */
export function generateBatch(count: number, context: MessageContext = "group"): string[] {
  const messages: string[] = [];
  for (let i = 0; i < count; i++) {
    messages.push(generateNaturalMessage(context));
  }
  return messages;
}

/**
 * Calcula o número estimado de combinações possíveis
 */
export function estimateCombinations(): number {
  const strategies = 10;
  const saudacoes = SAUDACOES.length; // 29
  const perguntas = PERGUNTAS.length; // 50
  const comentarios = COMENTARIOS.length; // 30
  const complementos = COMPLEMENTOS.length; // 20
  const emojis = EMOJIS.length; // 30
  const emojiVariations = 1 + emojis + (emojis * emojis); // none + 1 + 2
  const numeros = FRASES_NUMERO.length * 14; // 10 * 14 values
  
  // Saudação + Pergunta: 29 * 50 * emojiVar = ~1450 * 931 = ~1,349,950
  // Pergunta sozinha: 50 * emojiVar = ~46,550
  // Comentário + complemento: 30 * (1 + 20) * emojiVar = ~630 * 931 = ~586,530
  // Saudação + comentário: 29 * 30 * emojiVar = ~870 * 931 = ~809,970
  // Número: 140 * emojiVar = ~130,340
  // Context: ~20-30 * emojiVar = ~27,930
  
  const total = 
    (saudacoes * perguntas * emojiVariations) +
    (perguntas * emojiVariations) +
    (comentarios * (1 + complementos) * emojiVariations) +
    (saudacoes * comentarios * emojiVariations) +
    (numeros * emojiVariations) +
    (FRASES_GRUPO.length * emojiVariations) +
    (RESPOSTAS_CURTAS.length);
  
  return total;
}

// Export block arrays for inspection
export const MESSAGE_BLOCKS = {
  saudacoes: SAUDACOES,
  perguntas: PERGUNTAS,
  comentarios: COMENTARIOS,
  complementos: COMPLEMENTOS,
  emojis: EMOJIS,
  frasesNumero: FRASES_NUMERO,
  respostasCurtas: RESPOSTAS_CURTAS,
  frasesGrupo: FRASES_GRUPO,
};
