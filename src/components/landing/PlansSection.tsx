import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import AnimateOnView from "@/components/AnimateOnView";

const plans = [
  {
    name: "Start", instances: 10, price: "149,90", perInstance: "14,99",
    subtitle: "Ideal para quem está começando com estrutura profissional.",
    extraCopy: null, cta: "Começar agora", popular: false,
    features: ["Envios ilimitados", "Aquecimento automático", "Campanhas completas", "Suporte prioritário"],
    addon: "Relatórios WhatsApp + R$ 18,90/mês",
  },
  {
    name: "Pro", instances: 30, price: "349,90", perInstance: "11,66",
    subtitle: "Estrutura ideal para operadores ativos.",
    extraCopy: null, cta: "Começar agora", popular: true,
    features: ["Envios ilimitados", "Aquecimento automático", "Campanhas completas", "Suporte prioritário"],
    addon: "Relatórios WhatsApp + R$ 18,90/mês",
  },
  {
    name: "Scale", instances: 50, price: "549,90", perInstance: "10,99",
    subtitle: "Para operações em crescimento que precisam de volume e estabilidade.",
    extraCopy: null, cta: "Começar agora", popular: false,
    features: ["Envios ilimitados", "Aquecimento automático", "Campanhas completas", "Suporte prioritário", "Relatórios WhatsApp incluso"],
    addon: null,
  },
  {
    name: "Elite", instances: 100, price: "899,90", perInstance: "8,99",
    subtitle: "Máxima capacidade operacional.",
    extraCopy: null, cta: "Começar agora", popular: false,
    features: ["Envios ilimitados", "Aquecimento automático", "Campanhas completas", "Suporte prioritário", "Relatórios WhatsApp incluso"],
    addon: null,
  },
];

const PlansSection = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const handleContratarPlano = (plan: typeof plans[0]) => {
    const msg = `Olá, tudo bem?\nTenho interesse em contratar o plano DG Contingência – ${plan.name} (${plan.instances} Instâncias) no valor de R$ ${plan.price}/mês.\nPode me enviar os dados para ativação e pagamento?`;
    const url = `https://wa.me/5562994192500?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan, i) => (
            <AnimateOnView key={plan.name} animation="slide-up" delay={Math.min(i + 1, 4)}>
              <div
                className={`relative flex flex-col rounded-2xl card-hover-lift ${
                  plan.popular
                    ? "border border-emerald-500/40"
                    : "border border-white/[0.06]"
                }`}
              >
              <div
                className={`relative flex flex-col rounded-2xl p-8 h-full ${
                  plan.popular ? "bg-[#0d1318]" : "bg-[#0f1419]"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest px-5 py-1.5 rounded-full whitespace-nowrap">
                    Mais Escolhido
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white/90">{plan.name}</h3>
                    <p className="text-sm text-white/30">até {plan.instances} instâncias</p>
                  </div>
                  <div className="flex items-center gap-1 bg-orange-500/10 text-orange-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                    🔥 {plan.name === "Start" ? "65%" : plan.name === "Pro" ? "87%" : plan.name === "Scale" ? "94%" : "99%"}
                  </div>
                </div>

                <div className="mb-2 mt-5">
                  <span className="text-sm text-white/30">R$ </span>
                  <span className="text-4xl font-bold text-white/90">{plan.price.split(',')[0]}</span>
                  <span className="text-lg font-semibold text-white/90">,{plan.price.split(',')[1]}</span>
                  <span className="text-white/30 text-sm"> /mês</span>
                </div>

                <div className="h-px bg-white/[0.05] my-5" />

                <div className="space-y-3.5 mb-4 flex-1">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-3 text-sm text-white/50">
                      <Check className="w-4 h-4 min-w-[16px] min-h-[16px] text-emerald-500/60 shrink-0" />
                      {f}
                    </div>
                  ))}
                  {plan.addon && (
                    <div className="flex items-center gap-3 text-sm text-white/30 italic">
                      <Check className="w-4 h-4 min-w-[16px] min-h-[16px] text-white/10 shrink-0" />
                      {plan.addon}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleContratarPlano(plan)}
                  className={`w-full py-3.5 rounded-lg font-medium text-base flex items-center justify-center gap-2 btn-press ${
                    plan.popular
                      ? "bg-emerald-500 text-white font-bold hover:bg-emerald-400"
                      : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border border-white/[0.06]"
                  }`}
                >
                  {plan.cta}
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

      </div>
    </section>
  );
};

export default PlansSection;
