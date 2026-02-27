import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Shield,
  ChevronDown,
  ArrowRight,
  AlertTriangle,
  Lock,
  Activity,
  TrendingUp,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const painPoints = [
  "Quem busca resultados imediatos sem estratégia",
  "Quem espera bloqueio zero como promessa",
  "Quem não deseja investir tempo mínimo em configuração",
  "Quem procura soluções improvisadas",
];

const plans = [
  {
    name: "Start",
    instances: 10,
    price: "149,90",
    subtitle: "Ideal para início de operação estruturada.",
    cta: "Ativar Plano",
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
    cta: "Iniciar Estrutura",
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
    subtitle: "Para operações em expansão.",
    cta: "Ativar Plano",
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
    cta: "Falar com Especialista",
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

const faqs = [
  { q: "Preciso de conhecimento técnico?", a: "Não. A plataforma foi projetada para ser intuitiva. Você não precisa de experiência técnica para configurar e operar suas instâncias." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Não há fidelidade. Você pode cancelar sua assinatura a qualquer momento diretamente pelo painel." },
  { q: "Como funciona o aquecimento?", a: "O sistema simula interações naturais de forma programada e contínua, preparando suas instâncias gradualmente para envios em volume." },
  { q: "Preciso de VPS?", a: "Não. Toda a infraestrutura é gerenciada pela plataforma. Você não precisa configurar servidores ou ambientes externos." },
  { q: "Meus dados estão seguros?", a: "Sim. Utilizamos criptografia e práticas de segurança rigorosas para proteger todas as informações da sua operação." },
  { q: "Posso mudar de plano depois?", a: "Sim. Você pode fazer upgrade ou downgrade do seu plano a qualquer momento, sem perda de dados." },
];

const PlansSection = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      {/* ═══════ NÃO INDICADO ═══════ */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="text-2xl md:text-3xl font-bold text-center mb-12 text-white"
          >
            Esta plataforma <span className="text-white/60">não é indicada</span> para:
          </motion.h2>

          <div className="space-y-3">
            {painPoints.map((point, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i + 1}
                className="flex items-center gap-4 p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]"
              >
                <AlertTriangle className="w-4 h-4 text-white/20 shrink-0" />
                <span className="text-white/50 text-sm">{point}</span>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={6}
            className="text-center text-white/25 mt-10 text-sm"
          >
            Construímos para quem opera com seriedade e visão de longo prazo.
          </motion.p>
        </div>
      </section>

      {/* ═══════ PLANOS ═══════ */}
      <section id="planos" className="py-20 px-6 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="text-2xl md:text-3xl font-bold text-center mb-3 text-white"
          >
            Escolha o nível da sua operação
          </motion.h2>
          <motion.p
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={1}
            className="text-white/30 text-center text-sm mb-14 max-w-lg mx-auto"
          >
            Todos os planos incluem aquecimento automatizado e disparador inteligente. A diferença está na capacidade operacional.
          </motion.p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i + 2}
                className={`relative flex flex-col rounded-2xl transition-all duration-300 ${
                  plan.popular
                    ? "border border-emerald-600/25 hover:border-emerald-600/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30"
                    : "border border-white/[0.06] hover:border-white/[0.1] hover:-translate-y-1 hover:shadow-lg hover:shadow-black/20"
                }`}
              >
                <div className={`relative flex flex-col rounded-2xl p-7 h-full ${
                  plan.popular ? "bg-[#0d1318]" : "bg-[#0f1419]"
                }`}>
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-semibold uppercase tracking-widest px-4 py-1 rounded-full whitespace-nowrap">
                      Mais Utilizado
                    </span>
                  )}

                  <h3 className="text-lg font-semibold mt-1 text-white/90">{plan.name}</h3>
                  <p className="text-xs text-white/30 mb-1">{plan.instances} instâncias</p>
                  <p className="text-[11px] text-white/20 mb-5 leading-relaxed">{plan.subtitle}</p>

                  <div className="mb-6">
                    <span className="text-3xl font-bold text-white/90">R$ {plan.price}</span>
                    <span className="text-white/20 text-sm">/mês</span>
                  </div>

                  <div className="h-px bg-white/[0.05] mb-6" />

                  <div className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f, fi) => (
                      <div key={fi} className="flex items-center gap-2.5 text-sm text-white/40">
                        <Check className="w-3.5 h-3.5 text-white/20 shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>

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
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust pillars */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={7}
            className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-8 text-xs text-white/20"
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

      {/* ═══════ GARANTIA ═══════ */}
      <section className="py-20 px-6">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }}
          variants={fadeUp} custom={0}
          className="max-w-2xl mx-auto bg-white/[0.02] border border-white/[0.06] rounded-2xl p-10 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
            <Shield className="w-7 h-7 text-white/25" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-white/90">Teste por 7 dias. Risco zero.</h3>
          <p className="text-white/35 text-sm leading-relaxed max-w-md mx-auto">
            Se não fizer sentido para sua operação nos primeiros 7 dias,
            devolvemos 100% do valor. Sem burocracia.
          </p>
        </motion.div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="text-2xl md:text-3xl font-bold text-center mb-12 text-white"
          >
            Ainda com dúvidas?
          </motion.h2>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                variants={fadeUp} custom={i + 1}
                className="rounded-xl border border-white/[0.05] bg-white/[0.02] overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-sm font-medium text-white/60">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-white/20 shrink-0 ml-4 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm text-white/30 leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default PlansSection;
