import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Flame, MessageSquare, Users, Phone, Shield, Sparkles, AlertTriangle, Skull } from "lucide-react";

interface DayPlan {
  day: number;
  phase: string;
  title: string;
  goals: string[];
  checklist: string[];
  tips?: string;
  msgTarget: { min: number; max: number };
  groupTarget: number;
  recipientTarget: number;
}

const PHASES: Record<string, { label: string; color: string }> = {
  pre_24h: { label: "Pré-24h", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  groups_only: { label: "Grupos", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  autosave: { label: "AutoSave", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  community_light: { label: "Comunidade Leve", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  community_full: { label: "Comunidade Total", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  consolidation: { label: "Consolidação", color: "bg-primary/20 text-primary border-primary/30" },
  observation: { label: "Observação", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  recovery: { label: "Recuperação", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  reentry: { label: "Reentrada", color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
};

// ═══════════════════════════════════════════════
// CHIP NOVO — 30 dias, ciclo completo
// ═══════════════════════════════════════════════
const ROADMAP_NOVO: DayPlan[] = [
  {
    day: 1, phase: "pre_24h", title: "Silêncio inicial",
    goals: ["Conectar via QR Code e verificar status Ready", "Aguardar 5-8 horas sem nenhuma atividade", "Após espera, iniciar entrada gradual nos 8 grupos"],
    checklist: ["Instância conectada com sucesso", "Proxy residencial configurado", "Aguardou 5-8h sem enviar nada", "Entrada nos grupos iniciada (distribuída ao longo do dia)"],
    tips: "O primeiro dia é SILÊNCIO. Não envie mensagens. Apenas conecte e entre nos grupos de forma gradual após o período de espera.",
    msgTarget: { min: 0, max: 5 }, groupTarget: 8, recipientTarget: 0,
  },
  {
    day: 2, phase: "groups_only", title: "Ativação nos grupos",
    goals: ["Enviar 200-500 mensagens nos 8 grupos", "Distribuir envios na janela 07:00-19:00", "Alternar entre os grupos com intervalos aleatórios"],
    checklist: ["200-500 msgs enviadas em grupos", "Mensagens distribuídas ao longo do dia", "Sem erros de envio", "Intervalos aleatórios entre mensagens"],
    tips: "Volume alto apenas em grupos. Nunca para números diretos neste dia.",
    msgTarget: { min: 200, max: 500 }, groupTarget: 8, recipientTarget: 0,
  },
  {
    day: 3, phase: "autosave", title: "Grupos + Auto Save",
    goals: ["Manter 200-500 msgs em grupos", "Ativar Auto Save: 5 números × 3 msgs = 15/dia", "Números devem ser novos todos os dias"],
    checklist: ["200-500 msgs nos grupos", "15 msgs Auto Save enviadas", "5 destinatários únicos no AutoSave", "Distribuição ao longo do dia"],
    msgTarget: { min: 215, max: 515 }, groupTarget: 8, recipientTarget: 5,
  },
  {
    day: 4, phase: "autosave", title: "Consolidando Auto Save",
    goals: ["Manter volume de grupos (200-500)", "Continuar Auto Save (5 números novos × 3 msgs)", "Monitorar health check"],
    checklist: ["Grupos + AutoSave funcionando", "Nenhum bloqueio ou warning", "15 msgs Auto Save", "Instância estável"],
    msgTarget: { min: 215, max: 515 }, groupTarget: 8, recipientTarget: 5,
  },
  {
    day: 5, phase: "community_light", title: "Comunidade inicial",
    goals: ["Manter grupos (200-500) + AutoSave (15)", "Ativar conversas comunitárias: 3-5 pares", "Cada conversa: 15-30 msgs trocadas naturalmente"],
    checklist: ["Grupos + AutoSave mantidos", "3-5 conversas comunitárias ativas", "15-30 msgs por conversa", "Mensagens parecem naturais (emojis, textos curtos)"],
    tips: "As conversas comunitárias são entre instâncias da plataforma. Devem parecer orgânicas.",
    msgTarget: { min: 260, max: 665 }, groupTarget: 8, recipientTarget: 10,
  },
  {
    day: 6, phase: "community_light", title: "Comunidade consolidando",
    goals: ["Continuar tudo: grupos + AutoSave + comunidade leve", "Verificar logs de erros", "Ajustar pares se necessário"],
    checklist: ["3-5 pares comunitários ativos", "Zero erros nos últimos 2 dias", "Volume estável"],
    msgTarget: { min: 260, max: 665 }, groupTarget: 8, recipientTarget: 10,
  },
  // Days 7-30: Community Full
  ...Array.from({ length: 24 }, (_, i) => {
    const day = i + 7;
    const isCheckpoint = [7, 14, 21, 30].includes(day);
    const communityPairsMin = 5, communityPairsMax = 10;
    const communityMsgsMin = communityPairsMin * 15;
    const communityMsgsMax = communityPairsMax * 30;

    return {
      day,
      phase: day >= 25 ? "consolidation" : "community_full",
      title: day === 7 ? "Comunidade completa ativada" :
             day === 14 ? "Checkpoint: 2 semanas ✅" :
             day === 21 ? "3 semanas de maturação 🔥" :
             day === 25 ? "Fase de consolidação" :
             day === 30 ? "Chip aquecido! 🎉🔥" :
             `Dia ${day} — Maturação contínua`,
      goals: [
        "Grupos: 200-500 mensagens nos 8 grupos",
        "Auto Save: 5 números novos × 3 msgs = 15/dia",
        `Comunitário: ${communityPairsMin}-${communityPairsMax} pares × 15-30 msgs cada`,
        ...(isCheckpoint ? ["Health check completo da instância"] : []),
      ],
      checklist: [
        "Volume de grupos mantido (200-500)",
        "Auto Save ativo (15 msgs/dia)",
        `${communityPairsMin}-${communityPairsMax} conversas comunitárias`,
        ...(isCheckpoint ? ["Zero bloqueios ou restrições", "Instância estável e saudável"] : ["Sem erros nos logs"]),
        ...(day === 30 ? ["🏆 Ciclo de 30 dias completo!", "Chip pronto para campanhas com delays seguros"] : []),
      ],
      tips: day === 7 ? "Primeira semana completa! Se não houve bloqueios, o chip está no caminho certo." :
            day === 14 ? "Duas semanas sem problemas = chip saudável. Continue o ritmo." :
            day === 21 ? "3 semanas! O chip já tem boa reputação. Mantenha a consistência." :
            day === 30 ? "🎉 Parabéns! O chip completou 30 dias de maturação. Use com delays seguros em campanhas." :
            undefined,
      msgTarget: { min: 200 + 15 + communityMsgsMin, max: 500 + 15 + communityMsgsMax },
      groupTarget: 8,
      recipientTarget: 5 + communityPairsMax,
    } as DayPlan;
  }),
];

// ═══════════════════════════════════════════════
// CHIP ESTÁVEL — 14 dias, reforço de reputação
// ═══════════════════════════════════════════════
const ROADMAP_ESTAVEL: DayPlan[] = [
  {
    day: 1, phase: "observation", title: "Diagnóstico inicial",
    goals: ["Conectar e verificar status da conta", "Analisar histórico de uso anterior", "Iniciar atividade leve nos 8 grupos"],
    checklist: ["Instância conectada (Ready)", "Histórico verificado — sem ban recente", "Entrada nos 8 grupos concluída", "5-10 msgs leves em grupos"],
    tips: "Chip estável já tem reputação. Não precisa do período de silêncio, mas comece devagar.",
    msgTarget: { min: 5, max: 10 }, groupTarget: 8, recipientTarget: 0,
  },
  {
    day: 2, phase: "groups_only", title: "Retomada nos grupos",
    goals: ["Aumentar volume nos grupos para 100-300 msgs", "Distribuir na janela 07:00-19:00", "Monitorar resposta do WhatsApp"],
    checklist: ["100-300 msgs nos grupos", "Nenhuma restrição detectada", "Distribuição horária OK"],
    msgTarget: { min: 100, max: 300 }, groupTarget: 8, recipientTarget: 0,
  },
  {
    day: 3, phase: "autosave", title: "Ativando Auto Save",
    goals: ["Grupos: 200-400 msgs", "Auto Save: 5 números × 3 msgs = 15/dia", "Observar taxa de entrega"],
    checklist: ["Grupos + AutoSave funcionando", "Sem bloqueios", "Taxa de entrega > 95%"],
    msgTarget: { min: 215, max: 415 }, groupTarget: 8, recipientTarget: 5,
  },
  {
    day: 4, phase: "community_light", title: "Comunidade leve",
    goals: ["Manter grupos + AutoSave", "Ativar 3-5 conversas comunitárias", "15-30 msgs por conversa"],
    checklist: ["3-5 pares comunitários", "Interações naturais", "Volume estável"],
    msgTarget: { min: 260, max: 565 }, groupTarget: 8, recipientTarget: 10,
  },
  ...Array.from({ length: 10 }, (_, i) => {
    const day = i + 5;
    return {
      day,
      phase: day >= 11 ? "consolidation" : "community_full",
      title: day === 7 ? "Checkpoint: 1 semana ✅" :
             day === 14 ? "Reforço completo! 🎉" :
             `Dia ${day} — Maturação acelerada`,
      goals: [
        "Grupos: 200-500 msgs", "Auto Save: 15 msgs/dia",
        "Comunitário: 5-10 pares × 15-30 msgs",
        ...(day === 14 ? ["Health check final"] : []),
      ],
      checklist: [
        "Volume mantido", "Sem restrições",
        ...(day === 14 ? ["🏆 Reforço de 14 dias completo!", "Chip pronto para uso normal"] : ["Logs limpos"]),
      ],
      tips: day === 7 ? "Metade do ciclo! Chip estável segue saudável." :
            day === 14 ? "Reforço completo! O chip está pronto para campanhas." : undefined,
      msgTarget: { min: 290, max: 815 }, groupTarget: 8, recipientTarget: 15,
    } as DayPlan;
  }),
];

// ═══════════════════════════════════════════════
// CHIP BANIDO (RECUPERAÇÃO) — 21 dias, cautela máxima
// ═══════════════════════════════════════════════
const ROADMAP_BANIDO: DayPlan[] = [
  {
    day: 1, phase: "observation", title: "🚨 Quarentena",
    goals: ["Conectar e avaliar estado da conta", "NÃO ENVIAR NENHUMA MENSAGEM", "Aguardar 12-24 horas em silêncio total"],
    checklist: ["Instância conectada com sucesso", "Proxy NOVO residencial configurado", "Zero mensagens enviadas", "Aguardou período de quarentena completo"],
    tips: "⚠️ ATENÇÃO MÁXIMA! Chips com histórico de ban são sensíveis. Qualquer erro pode resultar em ban permanente. Silêncio total nas primeiras 24h.",
    msgTarget: { min: 0, max: 0 }, groupTarget: 0, recipientTarget: 0,
  },
  {
    day: 2, phase: "observation", title: "Observação cautelosa",
    goals: ["Verificar se conta ainda está ativa", "Entrar em 2-3 grupos apenas", "Observar sem enviar mensagens"],
    checklist: ["Conta ativa (sem ban)", "2-3 grupos ingressados", "Zero mensagens enviadas", "Monitoramento constante"],
    tips: "Apenas entre nos grupos e observe. Não envie NADA ainda.",
    msgTarget: { min: 0, max: 0 }, groupTarget: 3, recipientTarget: 0,
  },
  {
    day: 3, phase: "recovery", title: "Primeira interação",
    goals: ["Enviar 5-10 msgs leves em grupos", "Apenas reações e textos curtos", "Completar entrada nos 8 grupos"],
    checklist: ["5-10 msgs em grupos", "Textos curtos e emojis apenas", "8 grupos ingressados", "Nenhuma restrição"],
    tips: "Mensagens MUITO leves: emoji, 'Bom dia!', 'Valeu!'. Nada mais.",
    msgTarget: { min: 5, max: 10 }, groupTarget: 8, recipientTarget: 0,
  },
  {
    day: 4, phase: "recovery", title: "Aumentando gradualmente",
    goals: ["Aumentar para 20-50 msgs em grupos", "Distribuir bem na janela 07:00-19:00", "Monitorar de perto"],
    checklist: ["20-50 msgs nos grupos", "Sem warnings", "Distribuição horária ok"],
    msgTarget: { min: 20, max: 50 }, groupTarget: 8, recipientTarget: 0,
  },
  {
    day: 5, phase: "recovery", title: "Teste de resistência",
    goals: ["50-100 msgs em grupos", "Verificar se conta permanece estável", "Health check completo"],
    checklist: ["50-100 msgs", "Conta estável", "Sem restrições em 5 dias"],
    tips: "Se chegou ao dia 5 sem problemas, há chance de recuperação. Continue com cautela.",
    msgTarget: { min: 50, max: 100 }, groupTarget: 8, recipientTarget: 0,
  },
  {
    day: 6, phase: "groups_only", title: "Volume moderado",
    goals: ["Aumentar para 100-200 msgs em grupos", "Começar a variar conteúdo", "Testar envio de mídia simples"],
    checklist: ["100-200 msgs", "Conteúdo variado", "Mídia enviada com sucesso"],
    msgTarget: { min: 100, max: 200 }, groupTarget: 8, recipientTarget: 0,
  },
  {
    day: 7, phase: "groups_only", title: "Checkpoint: 1 semana ✅",
    goals: ["150-250 msgs em grupos", "Health check completo", "Avaliar se pode prosseguir"],
    checklist: ["150-250 msgs", "1 semana sem bloqueio", "Conta saudável"],
    tips: "Uma semana sem ban! Bom sinal, mas mantenha a cautela. Chips banidos podem ter recaídas.",
    msgTarget: { min: 150, max: 250 }, groupTarget: 8, recipientTarget: 0,
  },
  {
    day: 8, phase: "autosave", title: "Auto Save cauteloso",
    goals: ["Grupos: 150-300 msgs", "Auto Save: 3 números × 2 msgs = 6/dia", "Volume reduzido vs chip novo"],
    checklist: ["Grupos + AutoSave", "Apenas 6 msgs diretas", "Sem restrições"],
    tips: "AutoSave com volume MENOR que chip novo. 3 números × 2 msgs apenas.",
    msgTarget: { min: 156, max: 306 }, groupTarget: 8, recipientTarget: 3,
  },
  {
    day: 9, phase: "autosave", title: "Estabilizando AutoSave",
    goals: ["Manter grupos + AutoSave", "Aumentar para 5 números × 2 msgs = 10/dia", "Monitorar"],
    checklist: ["10 msgs AutoSave", "Sem problemas", "Volume estável"],
    msgTarget: { min: 160, max: 310 }, groupTarget: 8, recipientTarget: 5,
  },
  {
    day: 10, phase: "autosave", title: "AutoSave pleno",
    goals: ["Grupos: 200-350 msgs", "Auto Save: 5 números × 3 msgs = 15/dia", "Nível de chip novo alcançado"],
    checklist: ["AutoSave = chip novo", "Sem restrições", "10 dias sem ban"],
    msgTarget: { min: 215, max: 365 }, groupTarget: 8, recipientTarget: 5,
  },
  {
    day: 11, phase: "community_light", title: "Comunidade cautelosa",
    goals: ["Manter grupos + AutoSave", "Ativar 2-3 pares comunitários", "10-20 msgs por conversa (menos que chip novo)"],
    checklist: ["2-3 pares ativos", "Volume comunitário reduzido", "Sem problemas"],
    tips: "Comunidade com MENOS volume que chip novo. 2-3 pares com 10-20 msgs apenas.",
    msgTarget: { min: 235, max: 425 }, groupTarget: 8, recipientTarget: 8,
  },
  ...Array.from({ length: 10 }, (_, i) => {
    const day = i + 12;
    return {
      day,
      phase: day >= 18 ? "consolidation" : "community_full",
      title: day === 14 ? "Checkpoint: 2 semanas ✅" :
             day === 21 ? "Recuperação completa! 🎉🛡️" :
             `Dia ${day} — Recuperação contínua`,
      goals: [
        "Grupos: 200-400 msgs", "Auto Save: 15 msgs/dia",
        "Comunitário: 3-7 pares × 15-25 msgs",
        ...(day === 21 ? ["Health check final de recuperação"] : []),
      ],
      checklist: [
        "Volume controlado", "Sem restrições",
        ...(day === 21 ? ["🛡️ 21 dias sem ban!", "Chip recuperado — usar com delays maiores que normal"] : ["Logs limpos"]),
      ],
      tips: day === 14 ? "2 semanas de recuperação! Continue mantendo cautela." :
            day === 21 ? "🛡️ Recuperação de 21 dias completa! Use SEMPRE com delays maiores e volume menor que chips novos." : undefined,
      msgTarget: { min: 260, max: 575 }, groupTarget: 8, recipientTarget: 12,
    } as DayPlan;
  }),
];

interface CategoryConfig {
  key: string;
  label: string;
  subtitle: string;
  icon: typeof Sparkles;
  iconColor: string;
  headerBg: string;
  message: string;
  roadmap: DayPlan[];
  days: number;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: "novo",
    label: "🟢 Chip Novo",
    subtitle: "Número recém-ativado, sem histórico",
    icon: Sparkles,
    iconColor: "text-emerald-400",
    headerBg: "from-emerald-500/10 to-emerald-500/5",
    message: "Ciclo completo de 30 dias para maturação de um número virgem. O chip nunca foi usado no WhatsApp Business ou para disparos em massa. Segue o roteiro mais completo e seguro, passando por todas as fases de aquecimento gradual.",
    roadmap: ROADMAP_NOVO,
    days: 30,
  },
  {
    key: "estavel",
    label: "🔵 Chip Estável",
    subtitle: "Número com uso anterior saudável",
    icon: Shield,
    iconColor: "text-blue-400",
    headerBg: "from-blue-500/10 to-blue-500/5",
    message: "Ciclo de reforço de 14 dias para chips que já possuem histórico positivo. Ideal para números que ficaram inativos por um tempo ou que precisam de uma 'recarga' de reputação antes de voltar a operar em campanhas.",
    roadmap: ROADMAP_ESTAVEL,
    days: 14,
  },
  {
    key: "banido",
    label: "🔴 Chip Banido",
    subtitle: "Número com histórico de bloqueio/restrição",
    icon: Skull,
    iconColor: "text-red-400",
    headerBg: "from-red-500/10 to-red-500/5",
    message: "⚠️ Ciclo de recuperação de 21 dias com cautela máxima. Este número já sofreu ban ou restrição. A chance de bloqueio permanente é ALTA. O volume é reduzido em todas as fases e inclui período de quarentena obrigatório. Mesmo após os 21 dias, use sempre com delays maiores que o normal.",
    roadmap: ROADMAP_BANIDO,
    days: 21,
  },
];

const AdminWarmupRoadmap = () => {
  const [activeTab, setActiveTab] = useState("novo");
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (key: string) => {
    setCompletedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggle = (day: number) => {
    setExpandedDay(prev => prev === day ? null : day);
  };

  const activeCategory = CATEGORIES.find(c => c.key === activeTab)!;
  const roadmap = activeCategory.roadmap;

  // Group by phase
  const phaseOrder = [...new Set(roadmap.map(d => d.phase))];
  const phaseGroups = phaseOrder.map(phase => ({
    key: phase,
    days: roadmap.filter(d => d.phase === phase),
  }));

  return (
    <div className="space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-1" style={{ contain: "layout style", willChange: "scroll-position", overscrollBehavior: "contain" }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Flame size={20} className="text-primary" />
        <div>
          <h2 className="text-base font-bold text-foreground">Roteiro de Aquecimento</h2>
          <p className="text-xs text-muted-foreground">Guia dia-a-dia por categoria de chip</p>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setExpandedDay(null); }}>
        <TabsList className="w-full grid grid-cols-3 h-auto p-1">
          {CATEGORIES.map(cat => (
            <TabsTrigger key={cat.key} value={cat.key} className="text-xs py-2 data-[state=active]:shadow-sm">
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map(cat => (
          <TabsContent key={cat.key} value={cat.key} className="mt-4 space-y-4">
            {/* Category header card */}
            <div className={`rounded-xl border border-border bg-gradient-to-br ${cat.headerBg} p-4 space-y-2`}>
              <div className="flex items-center gap-2">
                <cat.icon size={18} className={cat.iconColor} />
                <div>
                  <p className="text-sm font-bold text-foreground">{cat.subtitle}</p>
                  <p className="text-[10px] text-muted-foreground">{cat.days} dias de ciclo</p>
                </div>
              </div>
              <p className="text-xs text-foreground/70 leading-relaxed">{cat.message}</p>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Phase legend */}
      <div className="flex flex-wrap gap-1.5">
        {phaseOrder.map(key => {
          const phase = PHASES[key];
          if (!phase) return null;
          return (
            <Badge key={key} variant="outline" className={`text-[10px] ${phase.color}`}>
              {phase.label}
            </Badge>
          );
        })}
      </div>

      {/* Roadmap */}
      {phaseGroups.map(({ key, days }) => {
        const phase = PHASES[key] || { label: key, color: "bg-muted text-muted-foreground border-border" };
        return (
          <div key={`${activeTab}-${key}`} className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${phase.color.split(" ")[0]}`} />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {phase.label} — Dias {days[0].day}{days.length > 1 ? ` a ${days[days.length - 1].day}` : ""}
              </p>
            </div>

            <div className="space-y-1">
              {days.map((plan) => {
                const isOpen = expandedDay === plan.day;
                const dayChecks = plan.checklist.map((_, i) => `${activeTab}-d${plan.day}-c${i}`);
                const completedCount = dayChecks.filter(k => completedItems[k]).length;
                const allDone = completedCount === plan.checklist.length;

                return (
                  <div key={plan.day} className="bg-card border border-border rounded-lg overflow-hidden" style={{ contain: "content" }}>
                    <button
                      onClick={() => toggle(plan.day)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${
                        allDone ? "bg-emerald-500/20 text-emerald-400" : "bg-muted/50 text-muted-foreground"
                      }`}>
                        {plan.day}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{plan.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MessageSquare size={10} /> {plan.msgTarget.min}-{plan.msgTarget.max}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users size={10} /> {plan.recipientTarget}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Phone size={10} /> {plan.groupTarget}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${phase.color} hidden sm:flex`}>
                        {phase.label}
                      </Badge>
                      {allDone && <CheckCircle2 size={16} className="text-emerald-400" />}
                      <span className="text-[10px] text-muted-foreground">{completedCount}/{plan.checklist.length}</span>
                      {isOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Objetivos do Dia</p>
                          <ul className="space-y-1.5">
                            {plan.goals.map((goal, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                                <span className="text-primary mt-0.5">•</span>
                                {goal}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Checklist</p>
                          <ul className="space-y-1.5">
                            {plan.checklist.map((item, i) => {
                              const key = `${activeTab}-d${plan.day}-c${i}`;
                              const done = !!completedItems[key];
                              return (
                                <li key={i}>
                                  <button
                                    onClick={() => toggleCheck(key)}
                                    className="flex items-center gap-2 text-sm text-left w-full hover:bg-muted/20 rounded px-1 py-0.5 transition-colors"
                                  >
                                    {done ? (
                                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                    ) : (
                                      <Circle size={14} className="text-muted-foreground/40 shrink-0" />
                                    )}
                                    <span className={done ? "text-muted-foreground line-through" : "text-foreground/80"}>
                                      {item}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        {plan.tips && (
                          <div className={`flex items-start gap-2 rounded-lg px-3 py-2 ${
                            activeTab === "banido"
                              ? "bg-red-500/5 border border-red-500/20"
                              : "bg-primary/5 border border-primary/20"
                          }`}>
                            {activeTab === "banido" ? (
                              <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
                            ) : (
                              <Shield size={14} className="text-primary mt-0.5 shrink-0" />
                            )}
                            <p className="text-xs text-foreground/70">{plan.tips}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-muted/20 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-foreground">{plan.msgTarget.min}-{plan.msgTarget.max}</p>
                            <p className="text-[10px] text-muted-foreground">Msgs/dia</p>
                          </div>
                          <div className="bg-muted/20 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-foreground">{plan.recipientTarget}</p>
                            <p className="text-[10px] text-muted-foreground">Destinatários</p>
                          </div>
                          <div className="bg-muted/20 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-foreground">{plan.groupTarget}</p>
                            <p className="text-[10px] text-muted-foreground">Grupos</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminWarmupRoadmap;
