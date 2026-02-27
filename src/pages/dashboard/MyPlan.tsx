import { Check, ArrowRight, Lock, Activity, TrendingUp, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const buildWhatsappUrl = (plan: { name: string; instances: number; price: string }) => {
  const msg = `Olá, tudo bem?\nTenho interesse em contratar o plano DG Contingência Pro – ${plan.instances} Instâncias no valor de R$ ${plan.price}/mês.\nPode me enviar os dados para ativação e pagamento?`;
  return `https://wa.me/5562994192500?text=${encodeURIComponent(msg)}`;
};

const plans = [
  {
    name: "Start",
    instances: 10,
    price: "149,90",
    subtitle: "Ideal para quem está começando com estrutura profissional.",
    extraCopy: null,
    popular: false,
    features: [
      "Aquecimento automatizado incluso",
      "Disparador interativo incluso",
      "Painel centralizado",
      "Monitoramento em tempo real",
      "Suporte padrão",
    ],
  },
  {
    name: "Pro",
    instances: 30,
    price: "349,90",
    subtitle: "Estrutura ideal para operadores ativos.",
    extraCopy: "Plano mais escolhido por operadores ativos.",
    popular: true,
    features: [
      "Aquecimento automatizado incluso",
      "Disparador interativo incluso",
      "Gestão avançada de instâncias",
      "Monitoramento completo",
      "Suporte prioritário",
    ],
  },
  {
    name: "Scale",
    instances: 50,
    price: "549,90",
    subtitle: "Para operações em crescimento que precisam de volume e estabilidade.",
    extraCopy: null,
    popular: false,
    features: [
      "Aquecimento automatizado incluso",
      "Disparador interativo incluso",
      "Gestão avançada",
      "Monitoramento em tempo real",
      "Suporte prioritário",
    ],
  },
  {
    name: "Elite",
    instances: 100,
    price: "899,90",
    subtitle: "Máxima capacidade operacional.",
    extraCopy: "Indicado para estruturas robustas com alto volume e suporte dedicado.",
    popular: false,
    features: [
      "Aquecimento automatizado incluso",
      "Disparador interativo incluso",
      "Gestão completa de instâncias",
      "Monitoramento avançado",
      "Atendimento prioritário dedicado",
    ],
  },
];

const MyPlan = () => {
  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Crown className="w-6 h-6 text-primary" />
          Meu Plano
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha o plano ideal para escalar sua operação com estabilidade.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-xl">
          Todos os planos incluem aquecimento automatizado, disparador inteligente e monitoramento em tempo real. A diferença está na capacidade operacional e nível de suporte.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
              plan.popular
                ? "border-primary ring-1 ring-primary/20 shadow-lg"
                : "border-border/50"
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-0 left-1/2 -translate-x-1/2 translate-y-2 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-widest z-10">
                Recomendado
              </Badge>
            )}
            <CardContent className="p-5 pt-7 flex flex-col h-full">
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="text-xs text-muted-foreground mb-1">{plan.instances} instâncias</p>
              <p className="text-[11px] text-muted-foreground/70 mb-1 leading-relaxed">{plan.subtitle}</p>
              {plan.extraCopy && (
                <p className="text-[11px] text-primary/70 mb-3 leading-relaxed">{plan.extraCopy}</p>
              )}
              {!plan.extraCopy && <div className="mb-2" />}

              <div className="mb-1">
                <span className="text-2xl font-bold text-foreground">R$ {plan.price}</span>
                <span className="text-muted-foreground text-sm"> / mês</span>
              </div>

              <div className="h-px bg-border/50 mb-4" />

              <div className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>

              <a
                href={buildWhatsappUrl(plan)}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted/50 text-foreground hover:bg-muted border border-border/50"
                }`}
              >
                Falar com especialista
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trust badges */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-muted-foreground/60 pt-2">
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-primary/50" />
          Sem fidelidade
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-primary/50" />
          Upgrade imediato
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-primary/50" />
          Garantia de 7 dias
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-xs text-muted-foreground/40">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" />
          Infraestrutura segura
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Operação estável
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" />
          Monitoramento contínuo
        </div>
      </div>
    </div>
  );
};

export default MyPlan;