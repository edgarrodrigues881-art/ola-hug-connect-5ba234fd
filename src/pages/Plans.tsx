import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Shield,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Crown,
} from "lucide-react";

const plans = [
  {
    name: "Start",
    instances: 10,
    price: 149.9,
    popular: false,
    cta: "Começar Agora",
    features: [
      "10 instâncias WhatsApp",
      "Aquecimento automatizado",
      "Painel de gestão completo",
      "Suporte via WhatsApp",
    ],
  },
  {
    name: "Pro",
    instances: 30,
    price: 349.9,
    popular: true,
    cta: "Quero o Pro",
    features: [
      "30 instâncias WhatsApp",
      "Aquecimento automatizado",
      "Painel de gestão completo",
      "Suporte prioritário",
      "Relatórios avançados",
    ],
  },
  {
    name: "Scale",
    instances: 50,
    price: 549.9,
    popular: false,
    cta: "Escalar Agora",
    features: [
      "50 instâncias WhatsApp",
      "Aquecimento automatizado",
      "Painel de gestão completo",
      "Atendimento prioritário",
      "Relatórios avançados",
      "API de integração",
    ],
  },
  {
    name: "Elite",
    instances: 100,
    price: 899.9,
    popular: false,
    cta: "Falar com Consultor",
    features: [
      "100 instâncias WhatsApp",
      "Aquecimento automatizado",
      "Painel de gestão completo",
      "Gerente de conta dedicado",
      "Relatórios avançados",
      "API de integração",
      "Onboarding personalizado",
    ],
  },
];

const faqs = [
  {
    q: "E se eu não gostar?",
    a: "Você tem 7 dias de garantia incondicional. Devolvemos 100% do valor, sem burocracia.",
  },
  {
    q: "Preciso de conhecimento técnico?",
    a: "Não. O painel é intuitivo e temos tutoriais passo-a-passo. Qualquer pessoa consegue usar.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa e sem fidelidade. Cancele a qualquer momento com 2 cliques.",
  },
  {
    q: "Posso mudar de plano depois?",
    a: "Claro! Faça upgrade ou downgrade a qualquer momento. O valor é ajustado automaticamente.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Usamos criptografia e infraestrutura profissional com alta disponibilidade.",
  },
  {
    q: "O aquecimento realmente funciona?",
    a: "Sim. Nosso algoritmo simula comportamento humano real, protegendo seus números de banimentos.",
  },
];

export default function Plans() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse,rgba(34,197,94,0.08),transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(34,197,94,0.04),transparent_70%)]" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#0B0F14]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="text-sm font-semibold bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-lg transition-colors"
          >
            Entrar
          </button>
        </div>
      </nav>

      <div className="relative z-10">
        {/* Hero */}
        <section className="pt-32 pb-16 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 text-xs font-medium text-green-400 mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Infraestrutura profissional para WhatsApp
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-6">
              Escolha o tamanho da{" "}
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                sua operação
              </span>
            </h1>
            <p className="text-lg text-white/50 max-w-lg mx-auto mb-8">
              Todos os planos incluem os mesmos recursos.
              A única diferença é o número de instâncias.
            </p>
            <a
              href="#planos"
              className="inline-flex items-center gap-2 text-base font-semibold bg-green-500 hover:bg-green-400 text-white px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-green-500/20"
            >
              Ver Planos
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </section>

        {/* Plans */}
        <section id="planos" className="px-6 pb-24 scroll-mt-24">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((plan, i) => {
                const perInstance = (plan.price / plan.instances).toFixed(2).replace(".", ",");
                return (
                  <motion.div
                    key={plan.name}
                    initial={{ opacity: 0, y: 25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className={`group relative flex flex-col rounded-2xl p-[1px] transition-all duration-300 ${
                      plan.popular
                        ? "bg-gradient-to-b from-green-400/60 via-green-500/20 to-transparent shadow-2xl shadow-green-500/10 lg:scale-[1.04]"
                        : "bg-white/[0.08] hover:bg-white/[0.12]"
                    }`}
                  >
                    <div className={`relative flex flex-col rounded-2xl p-6 h-full ${
                      plan.popular
                        ? "bg-[#0d1318]"
                        : "bg-[#0f1419]"
                    }`}>
                      {plan.popular && (
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow-lg shadow-green-500/30 flex items-center gap-1.5">
                          <Crown className="w-3 h-3" />
                          Mais Popular
                        </span>
                      )}

                      <h3 className="text-lg font-bold mt-2 text-white">{plan.name}</h3>
                      <p className="text-sm text-white/40">
                        {plan.instances} instâncias
                      </p>

                      <div className="mt-5 mb-1">
                        <p className="text-3xl font-extrabold text-white">
                          R$ {plan.price.toFixed(2).replace(".", ",")}
                          <span className="text-sm font-medium text-white/40">/mês</span>
                        </p>
                        <p className="text-xs text-green-400 font-medium mt-1">
                          R$ {perInstance} por instância
                        </p>
                      </div>

                      <div className="my-5 h-px bg-white/[0.06]" />

                      <ul className="space-y-3 mb-8 flex-1">
                        {plan.features.map((feat, fi) => (
                          <li key={fi} className="flex items-start gap-2.5 text-sm text-white/60">
                            <div className="w-4 h-4 rounded-full bg-green-500/15 flex items-center justify-center mt-0.5 shrink-0">
                              <Check className="w-2.5 h-2.5 text-green-400" />
                            </div>
                            {feat}
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => navigate("/auth")}
                        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                          plan.popular
                            ? "bg-green-500 text-white hover:bg-green-400 shadow-lg shadow-green-500/20"
                            : "bg-white/[0.06] text-white hover:bg-green-500 hover:shadow-lg hover:shadow-green-500/20 border border-white/[0.08] hover:border-green-500"
                        }`}
                      >
                        {plan.cta}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Guarantee */}
        <section className="px-6 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto bg-gradient-to-br from-green-500/[0.08] to-transparent border border-green-500/10 rounded-2xl p-8 sm:p-10 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
              <Shield className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-white">Garantia de 7 dias</h2>
            <p className="text-white/50 text-sm max-w-md mx-auto mb-3">
              Se por qualquer motivo você não ficar satisfeito nos primeiros 7 dias,
              devolvemos <strong className="text-white">100% do seu investimento</strong>.
              Sem perguntas.
            </p>
            <p className="text-xs text-white/30">
              Risco zero. A decisão mais segura que você pode tomar.
            </p>
          </motion.div>
        </section>

        {/* FAQ */}
        <section className="px-6 pb-24">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-white">
              Ainda com dúvidas?
            </h2>
            <p className="text-center text-sm text-white/40 mb-10">
              Respondemos as perguntas mais comuns.
            </p>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center gap-3 px-6 py-4 text-left text-sm font-medium text-white/80 hover:text-white hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="flex-1">{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-white/30 shrink-0 transition-transform duration-200 ${
                        openFaq === i ? "rotate-180" : ""
                      }`}
                    />
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
                        <div className="px-6 pb-4 text-sm text-white/40">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-2xl font-bold mb-3 text-white">
              Comece agora.{" "}
              <span className="bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                Sem risco.
              </span>
            </h2>
            <p className="text-white/40 text-sm mb-8">
              Ative seu plano, teste por 7 dias e veja os resultados.
            </p>
            <button
              onClick={() =>
                document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })
              }
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-10 py-4 rounded-xl transition-all shadow-lg shadow-green-500/20 text-base"
            >
              Escolher Meu Plano
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
