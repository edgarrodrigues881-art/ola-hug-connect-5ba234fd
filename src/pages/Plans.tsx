import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Shield,
  ChevronDown,
  ArrowRight,
  Server,
  Crown,
  AlertTriangle,
  RefreshCw,
  Zap,
  LayoutDashboard,
  CheckCircle2,
  TrendingUp,
  Headphones,
  Code2,
  UserCheck,
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

const differentials = [
  {
    icon: LayoutDashboard,
    title: "Controle total",
    desc: "Gerencie suas instâncias com autonomia e visão estratégica.",
  },
  {
    icon: RefreshCw,
    title: "Automação inteligente",
    desc: "Sistema estruturado para simular uso gradual e reduzir riscos operacionais.",
  },
  {
    icon: Zap,
    title: "Interface intuitiva",
    desc: "Painel direto ao ponto, organizado para decisões rápidas.",
  },
  {
    icon: TrendingUp,
    title: "Monitoramento em tempo real",
    desc: "Acompanhe métricas, progresso e status ao vivo.",
  },
  {
    icon: Shield,
    title: "Segurança em primeiro lugar",
    desc: "Ambiente protegido com criptografia e boas práticas de infraestrutura.",
  },
  {
    icon: Server,
    title: "Performance otimizada",
    desc: "Arquitetura estável e preparada para crescimento contínuo.",
  },
];

const authorityBullets = [
  { icon: TrendingUp, text: "Monitoramento contínuo de aquecimento" },
  { icon: Zap, text: "Controle de disparos por instância" },
  { icon: Server, text: "Status de conexão em tempo real" },
  { icon: LayoutDashboard, text: "Indicadores claros de performance operacional" },
];

const plans = [
  {
    name: "Start",
    instances: 10,
    price: "149,90",
    cta: "Ativar Plano",
    popular: false,
    extras: [] as string[],
  },
  {
    name: "Pro",
    instances: 30,
    price: "349,90",
    cta: "Iniciar Estrutura",
    popular: true,
    extras: ["Suporte prioritário"],
  },
  {
    name: "Scale",
    instances: 50,
    price: "549,90",
    cta: "Ativar Plano",
    popular: false,
    extras: ["Suporte prioritário", "API de integração"],
  },
  {
    name: "Elite",
    instances: 100,
    price: "899,90",
    cta: "Falar com Especialista",
    popular: false,
    extras: ["Suporte prioritário", "API de integração", "Atendimento dedicado"],
  },
];

const baseFeatures = [
  "Aquecimento automatizado incluso",
  "Disparador interativo incluso",
  "Painel centralizado",
  "Monitoramento em tempo real",
  "Suporte técnico",
];

const faqs = [
  { q: "Preciso de conhecimento técnico?", a: "Não. A plataforma foi projetada para ser intuitiva. Você não precisa de experiência técnica para configurar e operar suas instâncias." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Não há fidelidade. Você pode cancelar sua assinatura a qualquer momento diretamente pelo painel." },
  { q: "Como funciona o aquecimento?", a: "O sistema simula interações naturais de forma programada e contínua, preparando suas instâncias gradualmente para envios em volume." },
  { q: "Preciso de VPS?", a: "Não. Toda a infraestrutura é gerenciada pela plataforma. Você não precisa configurar servidores ou ambientes externos." },
  { q: "Meus dados estão seguros?", a: "Sim. Utilizamos criptografia e práticas de segurança rigorosas para proteger todas as informações da sua operação." },
  { q: "Posso mudar de plano depois?", a: "Sim. Você pode fazer upgrade ou downgrade do seu plano a qualquer momento, sem perda de dados." },
];

export default function Plans() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white relative overflow-hidden selection:bg-green-500/30">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-green-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-green-500/[0.03] rounded-full blur-[120px]" />
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
            className="text-sm font-semibold bg-green-500 hover:bg-green-400 text-black px-5 py-2.5 rounded-lg transition-colors"
          >
            Entrar
          </button>
        </div>
      </nav>

      <div className="relative z-10">
        {/* ═══════ HERO ═══════ */}
        <section className="pt-32 pb-20 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-green-500/[0.07] border border-green-500/20 rounded-full px-4 py-1.5 text-xs font-medium text-green-400 tracking-wide uppercase mb-8">
              <Server className="w-3.5 h-3.5" />
              Infraestrutura profissional para WhatsApp
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
              Infraestrutura profissional para escalar sua operação no WhatsApp com{" "}
              <span className="text-green-400">estabilidade</span>.
            </h1>

            <p className="text-lg text-white/45 max-w-2xl mx-auto mb-10 leading-relaxed">
              Disparador inteligente com botão interativo e aquecimento automatizado.
              Controle total das suas instâncias em tempo real, em um único painel.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate("/auth")}
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-green-500/20 text-base"
              >
                Iniciar minha operação
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 px-8 py-3.5 rounded-xl transition-all text-base"
              >
                Ver planos
              </button>
            </div>
            <p className="text-white/25 text-xs mt-5">Em poucos cliques, sua estrutura fica ativa e automatizada.</p>
          </motion.div>
        </section>

        {/* ═══════ DOR ═══════ */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.h2
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="text-2xl md:text-3xl font-bold text-center mb-12"
            >
              Esta plataforma <span className="text-green-400">não é indicada</span> para:
            </motion.h2>

            <div className="space-y-3">
              {painPoints.map((point, i) => (
                <motion.div
                  key={i}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} custom={i + 1}
                  className="flex items-center gap-4 p-4 rounded-lg bg-white/[0.03] border border-white/[0.05]"
                >
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-400/70 shrink-0" />
                  <span className="text-white/60 text-sm">{point}</span>
                </motion.div>
              ))}
            </div>

            <motion.p
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={6}
              className="text-center text-white/30 mt-10 text-sm"
            >
              Construímos para quem opera com seriedade e visão de longo prazo.
            </motion.p>
          </div>
        </section>

        {/* ═══════ DIFERENCIAIS ═══════ */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.h2
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="text-2xl md:text-3xl font-bold text-center mb-3"
            >
              Tecnologia projetada para <span className="text-green-400">operações sustentáveis</span>
            </motion.h2>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
              className="w-12 h-0.5 bg-green-500/40 mx-auto mb-14"
            />

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {differentials.map((d, i) => (
                <motion.div
                  key={i}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} custom={i + 2}
                  className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-green-500/20 transition-colors duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                    <d.icon className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{d.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{d.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ AUTORIDADE ═══════ */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="text-2xl md:text-3xl font-bold mb-10"
            >
              Visualize, acompanhe e gerencie com <span className="text-green-400">dados em tempo real</span>
            </motion.h2>

            <div className="flex flex-wrap justify-center gap-4">
              {authorityBullets.map((b, i) => (
                <motion.div
                  key={i}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} custom={i + 1}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-sm text-white/55"
                >
                  <b.icon className="w-4 h-4 text-green-400/70" />
                  {b.text}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ PLANOS ═══════ */}
        <section id="planos" className="py-20 px-6 scroll-mt-24">
          <div className="max-w-6xl mx-auto">
            <motion.h2
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="text-2xl md:text-3xl font-bold text-center mb-3"
            >
              Escolha o nível da sua <span className="text-green-400">operação</span>
            </motion.h2>
            <motion.p
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
              className="text-white/35 text-center text-sm mb-14 max-w-lg mx-auto"
            >
              Todos os planos incluem aquecimento automatizado e disparador inteligente. A diferença está na capacidade operacional.
            </motion.p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} custom={i + 2}
                  className={`relative flex flex-col rounded-2xl p-[1px] ${
                    plan.popular
                      ? "bg-gradient-to-b from-green-400/50 via-green-500/15 to-transparent lg:scale-[1.04]"
                      : "bg-white/[0.08]"
                  }`}
                >
                  <div className={`relative flex flex-col rounded-2xl p-6 h-full ${
                    plan.popular ? "bg-[#0d1318]" : "bg-[#0f1419]"
                  }`}>
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow-lg shadow-green-500/30 flex items-center gap-1.5 whitespace-nowrap">
                        <Crown className="w-3 h-3" />
                        Mais Popular
                      </span>
                    )}

                    <h3 className="text-lg font-bold mt-2">{plan.name}</h3>
                    <p className="text-xs text-white/35 mb-5">{plan.instances} instâncias</p>

                    <div className="mb-6">
                      <span className="text-3xl font-bold">R$ {plan.price}</span>
                      <span className="text-white/25 text-sm">/mês</span>
                    </div>

                    <div className="h-px bg-white/[0.06] mb-5" />

                    <div className="space-y-2.5 mb-8 flex-1">
                      {baseFeatures.map((f, fi) => (
                        <div key={fi} className="flex items-center gap-2.5 text-sm text-white/50">
                          <div className="w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                          </div>
                          {f}
                        </div>
                      ))}
                      {plan.extras.map((e, ei) => (
                        <div key={ei} className="flex items-center gap-2.5 text-sm text-green-300/70 font-medium">
                          <div className="w-4 h-4 rounded-full bg-green-500/15 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                          </div>
                          {e}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => navigate("/auth")}
                      className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        plan.popular
                          ? "bg-green-500 text-black hover:bg-green-400 shadow-lg shadow-green-500/20"
                          : "bg-white/[0.06] text-white hover:bg-green-500 hover:text-black hover:shadow-lg hover:shadow-green-500/20 border border-white/[0.08] hover:border-green-500"
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ GARANTIA ═══════ */}
        <section className="py-20 px-6">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={fadeUp} custom={0}
            className="max-w-2xl mx-auto bg-green-500/[0.04] border border-green-500/10 rounded-2xl p-10 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
              <Shield className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Teste por 7 dias. Risco zero.</h3>
            <p className="text-white/40 text-sm leading-relaxed max-w-md mx-auto">
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
              className="text-2xl md:text-3xl font-bold text-center mb-12"
            >
              Ainda com dúvidas?
            </motion.h2>

            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} custom={i + 1}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-sm font-medium text-white/75">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-white/25 shrink-0 ml-4 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} />
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
                        <p className="px-5 pb-5 text-sm text-white/35 leading-relaxed">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ CTA FINAL ═══════ */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Estruture sua operação <span className="text-green-400">hoje</span>.
            </motion.h2>
            <motion.p
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
              className="text-white/35 mb-10 max-w-md mx-auto text-sm"
            >
              Não dependa de ferramentas instáveis. Tenha controle, escala e previsibilidade.
            </motion.p>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={2}
            >
              <button
                onClick={() => navigate("/auth")}
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black font-semibold px-10 py-4 rounded-xl transition-all shadow-lg shadow-green-500/20 text-base"
              >
                Iniciar minha operação
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.05] py-8 px-6">
          <p className="text-center text-white/15 text-xs max-w-xl mx-auto leading-relaxed">
            A performance da operação depende da estratégia aplicada pelo usuário. Nossa plataforma fornece infraestrutura, automação e ferramentas de gestão para crescimento sustentável.
            <br />&copy; {new Date().getFullYear()} Todos os direitos reservados.
          </p>
        </footer>
      </div>
    </div>
  );
}
