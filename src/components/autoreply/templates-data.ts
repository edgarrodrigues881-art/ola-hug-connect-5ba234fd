import type { FlowNodeData, FlowButton } from "./types";
import type { Node, Edge } from "@xyflow/react";

export interface AutoReplyTemplate {
  id: string;
  name: string;
  description: string;
  category: "atendimento" | "suporte" | "vendas" | "captacao" | "promocao" | "recepcao";
  trigger: "any_message" | "keyword" | "new_contact" | "start_chat";
  triggerKeyword?: string;
  steps: number;
  buttons: number;
  popular?: boolean;
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
}

export const categoryLabels: Record<string, string> = {
  atendimento: "Atendimento",
  suporte: "Suporte",
  vendas: "Vendas",
  captacao: "Captação",
  promocao: "Promoção",
  recepcao: "Recepção",
};

export const categoryColors: Record<string, string> = {
  atendimento: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  suporte: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  vendas: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  captacao: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  promocao: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  recepcao: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
};

export const templates: AutoReplyTemplate[] = [
  {
    id: "tpl-welcome-menu",
    name: "Boas-vindas com menu",
    description: "Recepcione novos contatos com uma mensagem de boas-vindas e menu interativo de opções.",
    category: "recepcao",
    trigger: "keyword",
    triggerKeyword: "oi",
    steps: 5,
    buttons: 3,
    popular: true,
    nodes: [
      { id: "start-1", type: "startNode", position: { x: 100, y: 200 }, data: { label: "Início", trigger: "keyword", keyword: "oi" } },
      { id: "msg-1", type: "messageNode", position: { x: 450, y: 100 }, data: { label: "Boas-vindas", text: "Olá! 👋 Seja muito bem-vindo(a)!\n\nComo posso te ajudar hoje? Escolha uma opção abaixo:", delay: 0, buttons: [{ id: "btn-1", label: "📋 Ver planos", targetNodeId: "msg-2" }, { id: "btn-2", label: "🛠 Suporte", targetNodeId: "msg-3" }, { id: "btn-3", label: "👤 Falar com atendente", targetNodeId: "end-1" }] } },
      { id: "msg-2", type: "messageNode", position: { x: 850, y: 0 }, data: { label: "Planos", text: "Confira nossos planos:\n\n🥇 *Pro* — R$197/mês\n🥈 *Start* — R$97/mês\n\nQual te interessa?", delay: 2, buttons: [] } },
      { id: "msg-3", type: "messageNode", position: { x: 850, y: 250 }, data: { label: "Suporte", text: "Nosso suporte funciona de seg a sex, 9h às 18h.\n\nDescreva sua dúvida que já vamos te ajudar! 😊", delay: 1, buttons: [] } },
      { id: "end-1", type: "endNode", position: { x: 850, y: 480 }, data: { label: "Finalizar", action: "transfer_human" } },
    ],
    edges: [
      { id: "e-s-m1", source: "start-1", target: "msg-1", sourceHandle: "out" },
      { id: "e-m1-m2", source: "msg-1", target: "msg-2", sourceHandle: "btn-btn-1" },
      { id: "e-m1-m3", source: "msg-1", target: "msg-3", sourceHandle: "btn-btn-2" },
      { id: "e-m1-e1", source: "msg-1", target: "end-1", sourceHandle: "btn-btn-3" },
    ],
  },
  {
    id: "tpl-off-hours",
    name: "Fora do horário",
    description: "Responda automaticamente fora do expediente informando horários e opções de retorno.",
    category: "atendimento",
    trigger: "any_message",
    steps: 3,
    buttons: 2,
    popular: true,
    nodes: [
      { id: "start-1", type: "startNode", position: { x: 100, y: 200 }, data: { label: "Início", trigger: "any_message" } },
      { id: "msg-1", type: "messageNode", position: { x: 450, y: 150 }, data: { label: "Aviso de horário", text: "⏰ Nosso atendimento funciona de segunda a sexta, das 9h às 18h.\n\nRecebemos sua mensagem e retornaremos no próximo horário disponível!", delay: 0, buttons: [{ id: "btn-1", label: "✅ Aguardar retorno", targetNodeId: "end-1" }, { id: "btn-2", label: "📧 Enviar e-mail", targetNodeId: "msg-2" }] } },
      { id: "msg-2", type: "messageNode", position: { x: 850, y: 300 }, data: { label: "E-mail", text: "Envie sua dúvida para:\n📧 suporte@empresa.com\n\nResponderemos em até 24h úteis.", delay: 1, buttons: [] } },
      { id: "end-1", type: "endNode", position: { x: 850, y: 100 }, data: { label: "Finalizar", action: "end_flow" } },
    ],
    edges: [
      { id: "e-s-m1", source: "start-1", target: "msg-1", sourceHandle: "out" },
      { id: "e-m1-e1", source: "msg-1", target: "end-1", sourceHandle: "btn-btn-1" },
      { id: "e-m1-m2", source: "msg-1", target: "msg-2", sourceHandle: "btn-btn-2" },
    ],
  },
  {
    id: "tpl-basic-support",
    name: "Suporte básico",
    description: "Direcione o cliente para a área correta de suporte com menu de categorias.",
    category: "suporte",
    trigger: "keyword",
    triggerKeyword: "suporte",
    steps: 5,
    buttons: 3,
    nodes: [
      { id: "start-1", type: "startNode", position: { x: 100, y: 200 }, data: { label: "Início", trigger: "keyword", keyword: "suporte" } },
      { id: "msg-1", type: "messageNode", position: { x: 450, y: 150 }, data: { label: "Menu suporte", text: "🛠 *Central de Suporte*\n\nSelecione a categoria do seu problema:", delay: 0, buttons: [{ id: "btn-1", label: "💳 Pagamento", targetNodeId: "msg-2" }, { id: "btn-2", label: "🔧 Técnico", targetNodeId: "msg-3" }, { id: "btn-3", label: "📦 Entrega", targetNodeId: "msg-4" }] } },
      { id: "msg-2", type: "messageNode", position: { x: 850, y: 0 }, data: { label: "Pagamento", text: "Para questões de pagamento, envie o número do seu pedido que vamos verificar.", delay: 1, buttons: [] } },
      { id: "msg-3", type: "messageNode", position: { x: 850, y: 200 }, data: { label: "Técnico", text: "Descreva o problema técnico que está enfrentando. Nossa equipe vai analisar!", delay: 1, buttons: [] } },
      { id: "msg-4", type: "messageNode", position: { x: 850, y: 400 }, data: { label: "Entrega", text: "Informe seu código de rastreamento que verificamos o status da entrega.", delay: 1, buttons: [] } },
    ],
    edges: [
      { id: "e-s-m1", source: "start-1", target: "msg-1", sourceHandle: "out" },
      { id: "e-m1-m2", source: "msg-1", target: "msg-2", sourceHandle: "btn-btn-1" },
      { id: "e-m1-m3", source: "msg-1", target: "msg-3", sourceHandle: "btn-btn-2" },
      { id: "e-m1-m4", source: "msg-1", target: "msg-4", sourceHandle: "btn-btn-3" },
    ],
  },
  {
    id: "tpl-promo-launch",
    name: "Promoção de lançamento",
    description: "Engaje novos contatos com oferta promocional de lançamento e botões de interesse.",
    category: "promocao",
    trigger: "new_contact",
    steps: 4,
    buttons: 2,
    popular: true,
    nodes: [
      { id: "start-1", type: "startNode", position: { x: 100, y: 200 }, data: { label: "Início", trigger: "new_contact" } },
      { id: "msg-1", type: "messageNode", position: { x: 450, y: 150 }, data: { label: "Oferta", text: "🎉 *Oferta Especial de Lançamento!*\n\nVocê acaba de ganhar 30% de desconto na sua primeira compra!\n\nVálido por 48h ⏳", delay: 0, buttons: [{ id: "btn-1", label: "🔥 Quero aproveitar!", targetNodeId: "msg-2" }, { id: "btn-2", label: "❌ Não tenho interesse", targetNodeId: "end-1" }] } },
      { id: "msg-2", type: "messageNode", position: { x: 850, y: 100 }, data: { label: "Interesse", text: "Ótima escolha! 🚀\n\nUse o cupom *LANCA30* no checkout.\n\nAcesse: https://link.da.loja\n\nQualquer dúvida, estou aqui!", delay: 2, buttons: [] } },
      { id: "end-1", type: "endNode", position: { x: 850, y: 350 }, data: { label: "Finalizar", action: "end_flow" } },
    ],
    edges: [
      { id: "e-s-m1", source: "start-1", target: "msg-1", sourceHandle: "out" },
      { id: "e-m1-m2", source: "msg-1", target: "msg-2", sourceHandle: "btn-btn-1" },
      { id: "e-m1-e1", source: "msg-1", target: "end-1", sourceHandle: "btn-btn-2" },
    ],
  },
  {
    id: "tpl-qualification",
    name: "Qualificação de atendimento",
    description: "Qualifique o lead antes de direcionar para atendimento humano com perguntas iniciais.",
    category: "captacao",
    trigger: "start_chat",
    steps: 5,
    buttons: 3,
    nodes: [
      { id: "start-1", type: "startNode", position: { x: 100, y: 200 }, data: { label: "Início", trigger: "start_chat" } },
      { id: "msg-1", type: "messageNode", position: { x: 450, y: 150 }, data: { label: "Pergunta inicial", text: "Olá! Antes de te direcionar, me conta:\n\nVocê é cliente ou está conhecendo agora?", delay: 0, buttons: [{ id: "btn-1", label: "Já sou cliente", targetNodeId: "msg-2" }, { id: "btn-2", label: "Estou conhecendo", targetNodeId: "msg-3" }, { id: "btn-3", label: "Quero comprar", targetNodeId: "msg-4" }] } },
      { id: "msg-2", type: "messageNode", position: { x: 850, y: 0 }, data: { label: "Cliente existente", text: "Perfeito! Informe seu número de contrato ou e-mail cadastrado para te atender mais rápido. 📋", delay: 1, buttons: [] } },
      { id: "msg-3", type: "messageNode", position: { x: 850, y: 200 }, data: { label: "Novo visitante", text: "Que bom ter você aqui! 🎉\n\nConheça mais sobre nós: https://link.com\n\nSe tiver dúvida, é só perguntar!", delay: 1, buttons: [] } },
      { id: "msg-4", type: "messageNode", position: { x: 850, y: 400 }, data: { label: "Interesse de compra", text: "Excelente! 🚀\n\nVou te conectar com nosso consultor que vai te apresentar as melhores opções.", delay: 1, buttons: [] } },
    ],
    edges: [
      { id: "e-s-m1", source: "start-1", target: "msg-1", sourceHandle: "out" },
      { id: "e-m1-m2", source: "msg-1", target: "msg-2", sourceHandle: "btn-btn-1" },
      { id: "e-m1-m3", source: "msg-1", target: "msg-3", sourceHandle: "btn-btn-2" },
      { id: "e-m1-m4", source: "msg-1", target: "msg-4", sourceHandle: "btn-btn-3" },
    ],
  },
];
