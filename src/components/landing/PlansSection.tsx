import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight, Lock, Activity, TrendingUp } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const whatsappUrl =
  "https://wa.me/5562994192500?text=Ol%C3%A1%2C%20vim%20do%20site%20da%20DG%20Conting%C3%AAncia%20PRO%20e%20quero%20contratar%20o%20plano%20Elite.";

const plans = [
  {
    name: "Start",
    instances: 10,
    price: "149,90",
    perInstance: "14,99",
    subtitle: "Ideal para quem está começando com estrutura profissional.",
    extraCopy: null,
    cta: "Começar agora",
    popular: false,
    whatsapp: false,
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
    perInstance: "11,66",
    subtitle: "Estrutura ideal para operadores ativos.",
    extraCopy: "Plano mais escolhido por operadores ativos.",
    cta: "Contratar Plano",
    popular: true,
    whatsapp: false,
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
    perInstance: "10,99",
    subtitle: "Para operações em crescimento que precisam de volume e estabilidade.",
    extraCopy: null,
    cta: "Contratar Plano",
    popular: false,
    whatsapp: false,
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
    perInstance: "8,99",
    subtitle: "Máxima capacidade operacional.",
    extraCopy: "Indicado para estruturas robustas com alto volume e suporte dedicado.",
    cta: "Falar com especialista",
    popular: false,
    whatsapp: true,
    features: [
      "Aquecimento automatizado incluso",
      "Disparador interativo incluso",
      "Gestão completa de instâncias",
      "Monitoramento avançado",
      "Atendimento prioritário dedicado",
    ],
  },
];

const PlansSection = () => {
  const navigate = useNavigate();

  return (
    <section id="planos" className="py-20 px-6 scroll-mt-24">
      <div className="max-w-6xl mx-auto">


        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={1}
          className="text-2xl md:text-3xl font-bold text-center mb-3 text-white"
        >
          Escolha o plano ideal para escalar sua operação com estabilidade
        </motion.h2>
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={2}
          className="text-white/30 text-center text-sm mb-14 max-w-xl mx-auto leading-relaxed"
        >
          Todos os planos incluem aquecimento automatizado, disparador inteligente e monitoramento em tempo real.
          <br />A diferença está na capacidade operacional e nível de suporte.
        </motion.p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i + 3}
              className={`relative flex flex-col rounded-2xl transition-all duration-300 ${
                plan.popular
                  ? "border border-emerald-600/25 hover:border-emerald-600/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30"
                  : "border border-white/[0.06] hover:border-white/[0.1] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20"
              }`}
            >
              <div
                className={`relative flex flex-col rounded-2xl p-7 h-full ${
                  plan.popular ? "bg-[#0d1318]" : "bg-[#0f1419]"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-semibold uppercase tracking-widest px-4 py-1 rounded-full whitespace-nowrap">
                    Recomendado
                  </span>
                )}

                <h3 className="text-lg font-semibold mt-1 text-white/90">
                  {plan.name}
                </h3>
                <p className="text-xs text-white/30 mb-1">
                  {plan.instances} instâncias
                </p>
                <p className="text-[11px] text-white/20 mb-1 leading-relaxed">
                  {plan.subtitle}
                </p>
                {plan.extraCopy && (
                  <p className="text-[11px] text-emerald-400/60 mb-4 leading-relaxed">
                    {plan.extraCopy}
                  </p>
                )}
                {!plan.extraCopy && <div className="mb-3" />}

                <div className="mb-1">
                  <span className="text-3xl font-bold text-white/90">
                    R$ {plan.price}
                  </span>
                  <span className="text-white/20 text-sm"> / mês</span>
                </div>
                <p className="text-[11px] text-white/25 mb-6">
                  R$ {plan.perInstance} por instância
                </p>

                <div className="h-px bg-white/[0.05] mb-6" />

                <div className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f, fi) => (
                    <div
                      key={fi}
                      className="flex items-center gap-2.5 text-sm text-white/40"
                    >
                      <Check className="w-3.5 h-3.5 text-white/20 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                {plan.whatsapp ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border border-white/[0.06]"
                  >
                    {plan.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    onClick={() => navigate("/auth")}
                    className={`w-full py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${
                      plan.popular
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border border-white/[0.06]"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Security reassurance */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={8}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 text-xs text-white/30"
        >
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500/50" />
            Sem fidelidade
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500/50" />
            Upgrade imediato
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500/50" />
            Garantia de 7 dias
          </div>
        </motion.div>

        {/* Trust pillars */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={9}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-8 text-xs text-white/20"
        >
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
        </motion.div>
      </div>
    </section>
  );
};

export default PlansSection;
