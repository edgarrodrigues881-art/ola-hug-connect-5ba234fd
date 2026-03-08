import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Flame, MessageSquare, Users, Phone, Shield } from "lucide-react";

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

const PHASES = {
  pre_24h: { label: "Pré-24h", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  groups_only: { label: "Grupos", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  autosave: { label: "AutoSave", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  community: { label: "Comunidade", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  consolidation: { label: "Consolidação", color: "bg-primary/20 text-primary border-primary/30" },
};

const ROADMAP: DayPlan[] = [
  // Phase: Pre-24h (Day 1)
  {
    day: 1, phase: "pre_24h", title: "Ativação inicial",
    goals: ["Conectar instância e verificar QR Code", "Salvar 10 contatos na agenda", "Enviar 3-5 mensagens para contatos salvos"],
    checklist: ["Instância conectada com status Ready", "Proxy residencial configurado", "10 contatos salvos no AutoSave", "3-5 mensagens enviadas com sucesso"],
    tips: "Não envie mensagens para números desconhecidos. Use apenas contatos salvos.",
    msgTarget: { min: 3, max: 5 }, groupTarget: 0, recipientTarget: 3,
  },
  // Phase: Groups Only (Days 2-4)
  {
    day: 2, phase: "groups_only", title: "Entrada nos grupos",
    goals: ["Entrar em 2-3 grupos do pool", "Enviar 1-2 mensagens em grupos", "Continuar interações com contatos salvos"],
    checklist: ["2-3 grupos ingressados com sucesso", "1-2 mensagens em grupos enviadas", "5-8 interações totais no dia"],
    tips: "Espalhe as entradas em grupos ao longo do dia. Evite entrar em todos de uma vez.",
    msgTarget: { min: 5, max: 8 }, groupTarget: 3, recipientTarget: 5,
  },
  {
    day: 3, phase: "groups_only", title: "Expandindo presença nos grupos",
    goals: ["Entrar em mais 2-3 grupos (total: 5-6)", "Aumentar interações em grupos para 3-4", "Manter conversas com contatos salvos"],
    checklist: ["5-6 grupos no total", "3-4 mensagens em grupos diferentes", "8-12 interações totais"],
    msgTarget: { min: 8, max: 12 }, groupTarget: 6, recipientTarget: 8,
  },
  {
    day: 4, phase: "groups_only", title: "Completando pool de grupos",
    goals: ["Completar entrada nos 8 grupos do pool", "Participar ativamente em 4-5 grupos", "Manter ritmo gradual de mensagens"],
    checklist: ["8 grupos ingressados", "4-5 mensagens em grupos", "10-15 interações totais"],
    msgTarget: { min: 10, max: 15 }, groupTarget: 8, recipientTarget: 10,
  },
  // Phase: AutoSave (Days 5-10)
  {
    day: 5, phase: "autosave", title: "Ativação do AutoSave",
    goals: ["Ativar módulo AutoSave", "Importar 20-30 contatos para interação", "Enviar mensagens variadas (texto, emoji, áudio curto)"],
    checklist: ["AutoSave ativado", "20+ contatos importados", "Mix de tipos de mensagem", "12-18 interações totais"],
    tips: "Varie os tipos de mensagem. O WhatsApp monitora padrões repetitivos.",
    msgTarget: { min: 12, max: 18 }, groupTarget: 8, recipientTarget: 12,
  },
  {
    day: 6, phase: "autosave", title: "Crescimento gradual",
    goals: ["Aumentar volume de interações AutoSave", "Responder mensagens recebidas em grupos", "Manter diversidade de horários"],
    checklist: ["15-20 interações totais", "Respostas em pelo menos 2 grupos", "Horários variados (manhã, tarde, noite)"],
    msgTarget: { min: 15, max: 20 }, groupTarget: 8, recipientTarget: 15,
  },
  {
    day: 7, phase: "autosave", title: "Primeira semana completa",
    goals: ["Manter ritmo estável de 15-22 msgs/dia", "Verificar health check da instância", "Revisar logs de erro"],
    checklist: ["Nenhum erro crítico nos logs", "Instância estável por 7 dias", "15-22 interações no dia", "Zero bloqueios ou restrições"],
    tips: "Ponto de checkpoint! Se chegou aqui sem problemas, o chip está saudável.",
    msgTarget: { min: 15, max: 22 }, groupTarget: 8, recipientTarget: 15,
  },
  {
    day: 8, phase: "autosave", title: "Ampliando rede de contatos",
    goals: ["Adicionar mais 10-15 contatos ao AutoSave", "Intensificar participação em grupos", "Enviar primeiro áudio longo (30s+)"],
    checklist: ["35+ contatos no AutoSave", "18-25 interações totais", "1 áudio longo enviado"],
    msgTarget: { min: 18, max: 25 }, groupTarget: 8, recipientTarget: 18,
  },
  {
    day: 9, phase: "autosave", title: "Estabilização AutoSave",
    goals: ["Manter volume de 20-25 interações", "Enviar imagens e vídeos curtos", "Reagir a mensagens em grupos"],
    checklist: ["20-25 interações", "Mídia enviada com sucesso", "Reações em grupos"],
    msgTarget: { min: 20, max: 25 }, groupTarget: 8, recipientTarget: 20,
  },
  {
    day: 10, phase: "autosave", title: "Preparação para Comunidade",
    goals: ["Verificar elegibilidade para comunidade", "Manter ritmo estável", "Health check completo"],
    checklist: ["Elegível para comunidade", "22-28 interações", "Sem restrições ativas"],
    tips: "O sistema vai avaliar se o chip pode entrar na fase comunitária.",
    msgTarget: { min: 22, max: 28 }, groupTarget: 8, recipientTarget: 22,
  },
  // Phase: Community (Days 11-20)
  {
    day: 11, phase: "community", title: "Ativação da Comunidade",
    goals: ["Ativar pareamento comunitário", "Primeira troca de mensagens com par", "Manter interações em grupos e AutoSave"],
    checklist: ["Comunidade ativada", "Par atribuído", "1ª interação comunitária realizada", "25-30 interações totais"],
    msgTarget: { min: 25, max: 30 }, groupTarget: 8, recipientTarget: 25,
  },
  {
    day: 12, phase: "community", title: "Consolidando pareamento",
    goals: ["2-3 interações com par comunitário", "Manter volume em grupos", "Diversificar conteúdo das mensagens"],
    checklist: ["2-3 msgs comunitárias", "25-32 interações totais"],
    msgTarget: { min: 25, max: 32 }, groupTarget: 8, recipientTarget: 25,
  },
  {
    day: 13, phase: "community", title: "Crescimento comunitário",
    goals: ["Aumentar interações comunitárias para 3-5", "Enviar mídia variada", "Manter estabilidade"],
    checklist: ["3-5 msgs comunitárias", "28-35 interações totais", "Mix de texto, áudio e imagem"],
    msgTarget: { min: 28, max: 35 }, groupTarget: 8, recipientTarget: 28,
  },
  {
    day: 14, phase: "community", title: "Duas semanas completas",
    goals: ["Checkpoint de saúde do chip", "Manter volume de 30-35 msgs", "Verificar taxa de entrega"],
    checklist: ["Zero bloqueios em 14 dias", "Taxa de entrega > 95%", "30-35 interações", "Instância estável"],
    tips: "Marco importante! 14 dias sem problemas indica chip saudável para uso moderado.",
    msgTarget: { min: 30, max: 35 }, groupTarget: 8, recipientTarget: 30,
  },
  {
    day: 15, phase: "community", title: "Aceleração gradual",
    goals: ["Aumentar para 35-40 interações", "Expandir rede de destinatários únicos", "Manter diversidade de conteúdo"],
    checklist: ["35-40 interações", "30+ destinatários únicos no dia", "Conteúdo diversificado"],
    msgTarget: { min: 35, max: 40 }, groupTarget: 8, recipientTarget: 30,
  },
  {
    day: 16, phase: "community", title: "Volume intermediário",
    goals: ["Manter 35-42 interações estáveis", "Interagir com novos contatos", "Variar horários de envio"],
    checklist: ["35-42 interações", "Horários variados", "Novos contatos alcançados"],
    msgTarget: { min: 35, max: 42 }, groupTarget: 8, recipientTarget: 32,
  },
  {
    day: 17, phase: "community", title: "Expansão de rede",
    goals: ["38-45 interações totais", "Participar de conversas longas em grupos", "Enviar status/stories"],
    checklist: ["38-45 interações", "Conversa em grupo com 3+ msgs", "Status publicado"],
    msgTarget: { min: 38, max: 45 }, groupTarget: 8, recipientTarget: 35,
  },
  {
    day: 18, phase: "community", title: "Maturação avançada",
    goals: ["40-48 interações", "Criar grupo com 2-3 contatos", "Enviar localização e contato"],
    checklist: ["40-48 interações", "Grupo criado", "Tipos variados de conteúdo"],
    msgTarget: { min: 40, max: 48 }, groupTarget: 8, recipientTarget: 38,
  },
  {
    day: 19, phase: "community", title: "Pré-consolidação",
    goals: ["Manter volume alto estável", "Verificar métricas de saúde", "42-50 interações"],
    checklist: ["42-50 interações", "Métricas de saúde OK", "Sem warnings nos logs"],
    msgTarget: { min: 42, max: 50 }, groupTarget: 8, recipientTarget: 40,
  },
  {
    day: 20, phase: "community", title: "Fim da fase comunitária",
    goals: ["Consolidar todas as interações", "Health check final da fase", "45-50 interações"],
    checklist: ["45-50 interações", "20 dias sem bloqueio", "Chip pronto para consolidação"],
    tips: "A fase comunitária está completa. O chip agora entra na reta final de maturação.",
    msgTarget: { min: 45, max: 50 }, groupTarget: 8, recipientTarget: 42,
  },
  // Phase: Consolidation (Days 21-30)
  {
    day: 21, phase: "consolidation", title: "Início da consolidação",
    goals: ["Manter volume de 45-55 interações", "Simular uso real do WhatsApp", "Fazer chamada de voz curta"],
    checklist: ["45-55 interações", "Chamada de voz realizada", "Uso orgânico simulado"],
    msgTarget: { min: 45, max: 55 }, groupTarget: 8, recipientTarget: 45,
  },
  {
    day: 22, phase: "consolidation", title: "Uso orgânico",
    goals: ["Manter padrão de uso natural", "48-55 interações", "Enviar fotos pessoais"],
    checklist: ["48-55 interações", "Foto pessoal enviada", "Padrão natural mantido"],
    msgTarget: { min: 48, max: 55 }, groupTarget: 8, recipientTarget: 45,
  },
  {
    day: 23, phase: "consolidation", title: "Teste de carga leve",
    goals: ["Testar envio para 5 contatos novos", "50-55 interações", "Monitorar reações do WhatsApp"],
    checklist: ["5 contatos novos alcançados", "50-55 interações", "Sem restrições"],
    tips: "Primeiro teste com contatos que não te conhecem. Monitore de perto.",
    msgTarget: { min: 50, max: 55 }, groupTarget: 8, recipientTarget: 48,
  },
  {
    day: 24, phase: "consolidation", title: "Validação de carga",
    goals: ["Aumentar contatos novos para 8-10", "50-58 interações", "Verificar taxa de entrega"],
    checklist: ["8-10 contatos novos", "50-58 interações", "Taxa de entrega > 95%"],
    msgTarget: { min: 50, max: 58 }, groupTarget: 8, recipientTarget: 50,
  },
  {
    day: 25, phase: "consolidation", title: "Preparação para produção",
    goals: ["Simular mini-campanha (10-15 contatos)", "Usar delays longos entre envios", "52-60 interações"],
    checklist: ["Mini-campanha simulada", "Delays de 30s+ entre envios", "52-60 interações"],
    msgTarget: { min: 52, max: 60 }, groupTarget: 8, recipientTarget: 50,
  },
  {
    day: 26, phase: "consolidation", title: "Teste de resiliência",
    goals: ["Manter volume estável", "Testar envio de mídia pesada (vídeo)", "55-60 interações"],
    checklist: ["Vídeo enviado com sucesso", "55-60 interações", "Sem degradação de performance"],
    msgTarget: { min: 55, max: 60 }, groupTarget: 8, recipientTarget: 52,
  },
  {
    day: 27, phase: "consolidation", title: "Reta final",
    goals: ["Manter ritmo alto e estável", "55-65 interações", "Verificar todos os indicadores"],
    checklist: ["55-65 interações", "Todos indicadores verdes", "27 dias sem problemas"],
    msgTarget: { min: 55, max: 65 }, groupTarget: 8, recipientTarget: 55,
  },
  {
    day: 28, phase: "consolidation", title: "Pré-liberação",
    goals: ["Health check completo final", "55-65 interações", "Documentar estado do chip"],
    checklist: ["Health check OK", "55-65 interações", "Estado documentado"],
    tips: "Quase lá! Mantenha o padrão por mais 2 dias.",
    msgTarget: { min: 55, max: 65 }, groupTarget: 8, recipientTarget: 55,
  },
  {
    day: 29, phase: "consolidation", title: "Último dia de aquecimento",
    goals: ["Manter volume normal", "60-65 interações", "Preparar para uso em produção"],
    checklist: ["60-65 interações", "Chip estável e maduro", "Pronto para campanhas leves"],
    msgTarget: { min: 60, max: 65 }, groupTarget: 8, recipientTarget: 55,
  },
  {
    day: 30, phase: "consolidation", title: "Chip aquecido! 🎉",
    goals: ["Aquecimento completo!", "Chip pronto para uso em campanhas", "Iniciar com volume moderado em produção"],
    checklist: ["30 dias completos sem bloqueio", "Reputação do chip estabelecida", "Pronto para campanhas com delays seguros"],
    tips: "Parabéns! O chip completou o ciclo de 30 dias. Comece campanhas com volume moderado e delays longos.",
    msgTarget: { min: 60, max: 70 }, groupTarget: 8, recipientTarget: 55,
  },
];

const phaseKey = (p: string) => p as keyof typeof PHASES;

const AdminWarmupRoadmap = () => {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (key: string) => {
    setCompletedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggle = (day: number) => {
    setExpandedDay(prev => prev === day ? null : day);
  };

  const phaseGroups = [
    { key: "pre_24h", days: ROADMAP.filter(d => d.phase === "pre_24h") },
    { key: "groups_only", days: ROADMAP.filter(d => d.phase === "groups_only") },
    { key: "autosave", days: ROADMAP.filter(d => d.phase === "autosave") },
    { key: "community", days: ROADMAP.filter(d => d.phase === "community") },
    { key: "consolidation", days: ROADMAP.filter(d => d.phase === "consolidation") },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Flame size={20} className="text-primary" />
        <div>
          <h2 className="text-base font-bold text-foreground">Roteiro de Aquecimento — Dia 1 ao 30</h2>
          <p className="text-xs text-muted-foreground">Guia completo dia-a-dia para maturação segura de chips</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(PHASES).map(([key, val]) => (
          <Badge key={key} variant="outline" className={`text-[10px] ${val.color}`}>
            {val.label}
          </Badge>
        ))}
      </div>

      {/* Phases */}
      {phaseGroups.map(({ key, days }) => {
        const phase = PHASES[phaseKey(key)];
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${phase.color.split(" ")[0]}`} />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {phase.label} — Dias {days[0].day}{days.length > 1 ? ` a ${days[days.length - 1].day}` : ""}
              </p>
            </div>

            <div className="space-y-1">
              {days.map((plan) => {
                const isOpen = expandedDay === plan.day;
                const dayChecks = plan.checklist.map((_, i) => `d${plan.day}-c${i}`);
                const completedCount = dayChecks.filter(k => completedItems[k]).length;
                const allDone = completedCount === plan.checklist.length;

                return (
                  <div key={plan.day} className="bg-card border border-border rounded-lg overflow-hidden">
                    {/* Day header */}
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
                        <p className="text-sm font-semibold text-foreground">{plan.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MessageSquare size={10} /> {plan.msgTarget.min}-{plan.msgTarget.max} msgs
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users size={10} /> {plan.recipientTarget} dest.
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Phone size={10} /> {plan.groupTarget} grupos
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${phase.color}`}>
                        {phase.label}
                      </Badge>
                      {allDone && <CheckCircle2 size={16} className="text-emerald-400" />}
                      <span className="text-[10px] text-muted-foreground">{completedCount}/{plan.checklist.length}</span>
                      {isOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </button>

                    {/* Expanded content */}
                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
                        {/* Goals */}
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

                        {/* Checklist */}
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Checklist</p>
                          <ul className="space-y-1.5">
                            {plan.checklist.map((item, i) => {
                              const key = `d${plan.day}-c${i}`;
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

                        {/* Tips */}
                        {plan.tips && (
                          <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                            <Shield size={14} className="text-primary mt-0.5 shrink-0" />
                            <p className="text-xs text-foreground/70">{plan.tips}</p>
                          </div>
                        )}

                        {/* Metrics */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-muted/20 rounded-lg p-2 text-center">
                            <p className="text-lg font-bold text-foreground">{plan.msgTarget.min}-{plan.msgTarget.max}</p>
                            <p className="text-[10px] text-muted-foreground">Mensagens/dia</p>
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