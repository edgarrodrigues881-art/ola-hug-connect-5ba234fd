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
  AlertTriangle,
  Headphones,
  RefreshCw,
  Zap,
  LayoutDashboard,
  TrendingUp,
  Activity,
  Lock,
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
    desc: "Autonomia completa sobre suas instâncias e sua estrutura operacional.",
  },
  {
    icon: RefreshCw,
    title: "Automação inteligente",
    desc: "Simulação gradual de uso para reduzir riscos operacionais.",
  },
  {
    icon: Zap,
    title: "Interface intuitiva",
    desc: "Painel organizado para decisões rápidas e controle eficiente.",
  },
  {
    icon: TrendingUp,
    title: "Monitoramento em tempo real",
    desc: "Acompanhamento contínuo de métricas e status.",
  },
  {
    icon: Shield,
    title: "Segurança em primeiro lugar",
    desc: "Infraestrutura protegida com boas práticas e criptografia.",
  },
  {
    icon: Server,
    title: "Performance otimizada",
    desc: "Arquitetura estável preparada para crescimento contínuo.",
  },
];

const authorityBullets = [
  { icon: TrendingUp, text: "Monitoramento contínuo de aquecimento" },
  { icon: Zap, text: "Controle de disparos por instância" },
  { icon: Server, text: "Indicadores claros de progresso" },
  { icon: LayoutDashboard, text: "Status de conexão atualizado" },
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

export default function Plans() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0B0F14] text-white relative overflow-hidden selection:bg-emerald-500/20">
      {/* Background — very subtle */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-emerald-900/[0.03] rounded-full blur-[180px]" />
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
          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/5562994192500?text=Ol%C3%A1%20DG%2C%20vim%20do%20site%20e%20preciso%20de%20suporte!"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors"
            >
              <Headphones className="w-4 h-4" />
              Suporte
            </a>
            <button
              onClick={() => navigate("/auth")}
              className="text-sm font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white/70 px-5 py-2.5 rounded-lg transition-colors border border-white/[0.06]"
            >
              Entrar
            </button>
          </div>
        </div>
      </nav>

      {/* WhatsApp floating button */}
      <a
        href="https://wa.me/5562994192500?text=Ol%C3%A1%20DG%2C%20vim%20do%20site%20e%20preciso%20de%20suporte!"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium pl-3.5 pr-4 py-2.5 rounded-full shadow-lg shadow-black/30 transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Suporte
      </a>

      <div className="relative z-10">
        {/* ═══════ HERO ═══════ */}
        <section className="pt-32 pb-20 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-4 py-1.5 text-xs font-medium text-white/50 tracking-wide uppercase mb-8">
              <Server className="w-3.5 h-3.5" />
              Infraestrutura profissional para WhatsApp
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-6">
              Infraestrutura profissional para escalar operações no WhatsApp com{" "}
              <span className="text-emerald-400/90">estabilidade real</span>.
            </h1>

            <p className="text-base text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed">
              Aquecimento automatizado, disparador interativo e controle total das suas instâncias em um único painel.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate("/auth")}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-8 py-3.5 rounded-lg transition-colors text-base"
              >
                Iniciar minha operação
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 border border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.03] px-8 py-3.5 rounded-lg transition-all text-base"
              >
                Ver planos
              </button>
            </div>
            <p className="text-white/20 text-xs mt-5">Em poucos passos, sua estrutura fica ativa e automatizada.</p>
          </motion.div>
        </section>

        {/* ═══════ NÃO INDICADO ═══════ */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.h2
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="text-2xl md:text-3xl font-bold text-center mb-12"
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

        {/* ═══════ DIFERENCIAIS ═══════ */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.h2
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="text-2xl md:text-3xl font-bold text-center mb-3"
            >
              Tecnologia projetada para <span className="text-white/60">operações sustentáveis</span>
            </motion.h2>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
              className="w-12 h-0.5 bg-white/[0.08] mx-auto mb-14"
            />

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {differentials.map((d, i) => (
                <motion.div
                  key={i}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} custom={i + 2}
                  className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-colors duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center mb-4">
                    <d.icon className="w-5 h-5 text-white/35" />
                  </div>
                  <h3 className="text-base font-semibold mb-2 text-white/80">{d.title}</h3>
                  <p className="text-white/35 text-sm leading-relaxed">{d.desc}</p>
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
              Visualize, acompanhe e gerencie com <span className="text-white/60">dados operacionais em tempo real</span>
            </motion.h2>

            <div className="flex flex-wrap justify-center gap-4">
              {authorityBullets.map((b, i) => (
                <motion.div
                  key={i}
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} custom={i + 1}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-sm text-white/40"
                >
                  <b.icon className="w-4 h-4 text-white/25" />
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

        {/* ═══════ CTA FINAL ═══════ */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={0}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Estruture sua operação <span className="text-emerald-400/80">hoje</span>.
            </motion.h2>
            <motion.p
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={1}
              className="text-white/30 mb-10 max-w-md mx-auto text-sm"
            >
              Não dependa de ferramentas instáveis. Tenha controle, escala e previsibilidade.
            </motion.p>
            <motion.div
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              variants={fadeUp} custom={2}
            >
              <button
                onClick={() => navigate("/auth")}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-10 py-4 rounded-lg transition-colors text-base"
              >
                Iniciar minha operação
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/[0.04] py-8 px-6">
          <p className="text-center text-white/15 text-xs max-w-xl mx-auto leading-relaxed">
            A performance da operação depende da estratégia aplicada pelo usuário. Nossa plataforma fornece infraestrutura, automação e ferramentas de gestão para crescimento sustentável.
            <br />&copy; {new Date().getFullYear()} Todos os direitos reservados.
          </p>
        </footer>
      </div>
    </div>
  );
}
