import { Check, X, ArrowRight, Lock, Activity, TrendingUp, Crown, Bell, Zap, Shield, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const buildWhatsappUrl = (plan: { name: string; instances: number; price: string }) => {
  const msg = `Olá, tudo bem?\nTenho interesse em contratar o plano DG Contingência Pro – ${plan.instances} Instâncias no valor de R$ ${plan.price}/mês.\nPode me enviar os dados para ativação e pagamento?`;
  return `https://wa.me/5562994192500?text=${encodeURIComponent(msg)}`;
};

const buildAddonWhatsappUrl = () => {
  const msg = `Olá, tudo bem?\nTenho interesse em contratar o addon Relatórios via WhatsApp no valor de R$ 18,90/mês.\nPode me enviar os dados para ativação?`;
  return `https://wa.me/5562994192500?text=${encodeURIComponent(msg)}`;
};

const plans = [
  {
    name: "Start",
    instances: 10,
    price: "149,90",
    subtitle: "Para quem está montando sua primeira estrutura profissional de disparos.",
    popular: false,
    reportsIncluded: false,
    icon: Zap,
    features: [
      { text: "10 instâncias simultâneas", included: true },
      { text: "Aquecimento automatizado", included: true },
      { text: "Disparador inteligente", included: true },
      { text: "Painel centralizado", included: true },
      { text: "Monitoramento em tempo real", included: true },
      { text: "Suporte via WhatsApp", included: true },
      { text: "Relatórios automáticos via WhatsApp", included: false },
    ],
  },
  {
    name: "Pro",
    instances: 30,
    price: "349,90",
    subtitle: "O equilíbrio perfeito entre volume e controle para operadores experientes.",
    popular: true,
    reportsIncluded: false,
    icon: TrendingUp,
    features: [
      { text: "30 instâncias simultâneas", included: true },
      { text: "Aquecimento automatizado", included: true },
      { text: "Disparador inteligente", included: true },
      { text: "Gestão avançada de instâncias", included: true },
      { text: "Monitoramento completo", included: true },
      { text: "Suporte prioritário", included: true },
      { text: "Relatórios automáticos via WhatsApp", included: false },
    ],
  },
  {
    name: "Scale",
    instances: 50,
    price: "549,90",
    subtitle: "Volume e estabilidade para operações em crescimento acelerado.",
    popular: false,
    reportsIncluded: true,
    icon: Activity,
    features: [
      { text: "50 instâncias simultâneas", included: true },
      { text: "Aquecimento automatizado", included: true },
      { text: "Disparador inteligente", included: true },
      { text: "Gestão avançada de instâncias", included: true },
      { text: "Monitoramento em tempo real", included: true },
      { text: "Suporte prioritário", included: true },
      { text: "Relatórios automáticos via WhatsApp", included: true },
    ],
  },
  {
    name: "Elite",
    instances: 100,
    price: "899,90",
    subtitle: "Máxima capacidade para estruturas robustas com alto volume de operação.",
    popular: false,
    reportsIncluded: true,
    icon: Crown,
    features: [
      { text: "100 instâncias simultâneas", included: true },
      { text: "Aquecimento automatizado", included: true },
      { text: "Disparador inteligente", included: true },
      { text: "Gestão completa de instâncias", included: true },
      { text: "Monitoramento avançado", included: true },
      { text: "Atendimento prioritário dedicado", included: true },
      { text: "Relatórios automáticos via WhatsApp", included: true },
    ],
  },
];

const MyPlan = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Crown className="w-6 h-6 text-primary" />
          Planos
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-lg">
          Escale sua operação com infraestrutura estável, aquecimento automatizado e disparador inteligente em todos os planos.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => {
          const PlanIcon = plan.icon;
          return (
            <Card
              key={plan.name}
              className={`relative overflow-hidden transition-all duration-200 hover:shadow-xl group ${
                plan.popular
                  ? "border-primary ring-2 ring-primary/20 shadow-xl scale-[1.02]"
                  : "border-border/50 hover:border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
              )}
              {plan.popular && (
                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Mais utilizado
                </Badge>
              )}
              <CardContent className="p-5 pt-6 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    plan.popular ? "bg-primary/10" : "bg-muted/50"
                  }`}>
                    <PlanIcon className={`w-4 h-4 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                </div>

                <p className="text-[11px] text-muted-foreground/80 leading-relaxed mb-4 min-h-[32px]">
                  {plan.subtitle}
                </p>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground tracking-tight">R$ {plan.price}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">por mês</span>
                </div>

                <div className="h-px bg-border/40 mb-4" />

                <div className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className={`flex items-start gap-2 text-xs ${
                      f.included ? "text-muted-foreground" : "text-muted-foreground/40"
                    }`}>
                      {f.included ? (
                        <Check className="w-3.5 h-3.5 text-primary/70 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 mt-0.5" />
                      )}
                      <span className={!f.included ? "line-through" : ""}>
                        {f.text}
                      </span>
                    </div>
                  ))}
                </div>

                {plan.reportsIncluded && (
                  <div className="mb-4 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-primary">
                      <Bell className="w-3 h-3" />
                      Relatórios WhatsApp incluso
                    </div>
                  </div>
                )}

                <a
                  href={buildWhatsappUrl(plan)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                      : "bg-muted/50 text-foreground hover:bg-muted border border-border/50"
                  }`}
                >
                  Ativar plano
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Addon section */}
      <div className="pt-2">
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Bell className="w-4.5 h-4.5 text-primary" />
          Addon — Relatórios via WhatsApp
        </h2>
        <Card className="border-border/50 hover:shadow-md transition-shadow max-w-xl">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Relatórios via WhatsApp</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-sm">
                  Receba relatórios automáticos e alertas operacionais em tempo real, direto no seu WhatsApp — sem precisar abrir o painel.
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-bold text-foreground">R$ 18,90</span>
                <p className="text-xs text-muted-foreground">/ mês</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                Relatório de aquecimento
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                Relatório de campanhas
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                Alertas de conexão/desconexão
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                1 instância dedicada
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground/50 mb-4">
              Já incluso nos planos Scale e Elite. Para Start e Pro, contrate separadamente.
            </p>

            <a
              href={buildAddonWhatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 bg-muted/50 text-foreground hover:bg-muted border border-border/50"
            >
              Contratar addon
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Trust badges */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-muted-foreground/50 pt-2">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Sem fidelidade
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          Upgrade imediato
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          Garantia de 7 dias
        </div>
      </div>
    </div>
  );
};

export default MyPlan;
