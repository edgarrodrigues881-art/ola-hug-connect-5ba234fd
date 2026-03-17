import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, Lock, Activity, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth";
import AnimateOnView from "@/components/AnimateOnView";

const plans = [
  {
    name: "Start", instances: 10, price: "149,90", perInstance: "14,99",
    subtitle: "Ideal para quem está começando com estrutura profissional.",
    extraCopy: null, cta: "Contratar Plano", popular: false,
    features: ["Aquecimento automatizado incluso", "Disparador interativo incluso", "Painel centralizado", "Monitoramento em tempo real", "Suporte padrão"],
  },
  {
    name: "Pro", instances: 30, price: "349,90", perInstance: "11,66",
    subtitle: "Estrutura ideal para operadores ativos.",
    extraCopy: "Plano mais escolhido por operadores ativos.", cta: "Contratar Plano", popular: true,
    features: ["Aquecimento automatizado incluso", "Disparador interativo incluso", "Gestão avançada de instâncias", "Monitoramento completo", "Suporte prioritário"],
  },
  {
    name: "Scale", instances: 50, price: "549,90", perInstance: "10,99",
    subtitle: "Para operações em crescimento que precisam de volume e estabilidade.",
    extraCopy: null, cta: "Contratar Plano", popular: false,
    features: ["Aquecimento automatizado incluso", "Disparador interativo incluso", "Gestão avançada", "Monitoramento em tempo real", "Suporte prioritário"],
  },
  {
    name: "Elite", instances: 100, price: "899,90", perInstance: "8,99",
    subtitle: "Máxima capacidade operacional.",
    extraCopy: "Indicado para estruturas robustas com alto volume e suporte dedicado.", cta: "Contratar Plano", popular: false,
    features: ["Aquecimento automatizado incluso", "Disparador interativo incluso", "Gestão completa de instâncias", "Monitoramento avançado", "Atendimento prioritário dedicado"],
  },
];

const PlansSection = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const handleContratarPlano = () => {
    if (session) {
      navigate("/dashboard/my-plan");
    } else {
      navigate("/auth?redirect=/dashboard/my-plan");
    }
  };

  return (
    <section id="planos" className="py-24 lg:py-32 px-6 scroll-mt-24">
      <div className="max-w-7xl mx-auto">
        <AnimateOnView animation="slide-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 text-white">
            Escolha o plano ideal para escalar sua operação com estabilidade
          </h2>
          <p className="text-white/30 text-center text-base mb-16 max-w-2xl mx-auto leading-relaxed">
            Todos os planos incluem aquecimento automatizado, disparador inteligente e monitoramento em tempo real.
            <br />A diferença está na capacidade operacional e nível de suporte.
          </p>
        </AnimateOnView>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, i) => (
            <AnimateOnView key={plan.name} animation="slide-up" delay={Math.min(i + 1, 4)}>
              <div
                className={`relative flex flex-col rounded-2xl card-hover-lift ${
                  plan.popular
                    ? "border border-amber-500/30"
                    : "border border-white/[0.06]"
                }`}
              >
              <div
                className={`relative flex flex-col rounded-2xl p-8 h-full ${
                  plan.popular ? "bg-[#0d1318]" : "bg-[#0f1419]"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-semibold uppercase tracking-widest px-5 py-1.5 rounded-full whitespace-nowrap">
                    Recomendado
                  </span>
                )}

                <h3 className="text-xl font-semibold mt-1 text-white/90">{plan.name}</h3>
                <p className="text-sm text-white/30 mb-1">{plan.instances} instâncias</p>
                <p className="text-xs text-white/20 mb-1 leading-relaxed">{plan.subtitle}</p>
                {plan.extraCopy && (
                  <p className="text-xs text-emerald-400/60 mb-4 leading-relaxed">{plan.extraCopy}</p>
                )}
                {!plan.extraCopy && <div className="mb-3" />}

                <div className="mb-2">
                  <span className="text-4xl font-bold text-white/90">R$ {plan.price}</span>
                  <span className="text-white/20 text-base"> / mês</span>
                </div>

                <div className="h-px bg-white/[0.05] mb-7" />

                <div className="space-y-3.5 mb-8 flex-1">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-3 text-sm text-white/40">
                      <Check className="w-4 h-4 min-w-[16px] min-h-[16px] text-white/20 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleContratarPlano}
                  className={`w-full py-3.5 rounded-lg font-medium text-base flex items-center justify-center gap-2 btn-press ${
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border border-white/[0.06]"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                </button>
              </div>
            </div>
            </AnimateOnView>
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0 text-emerald-500/50" />
            Sem fidelidade
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0 text-emerald-500/50" />
            Upgrade imediato
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0 text-emerald-500/50" />
            Garantia de 7 dias
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-10 text-sm text-white/20">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 flex-shrink-0" />
            Infraestrutura segura
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 flex-shrink-0" />
            Operação estável
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            Monitoramento contínuo
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlansSection;
