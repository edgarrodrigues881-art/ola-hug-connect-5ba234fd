import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Shield,
  ChevronDown,
  MessageCircle,
  Users,
  Lock,
  Clock,
  Flame,
  Star,
  ArrowRight,
} from "lucide-react";

const plans = [
  {
    name: "Start",
    instances: 10,
    price: 149.9,
    popular: false,
    cta: "Começar Agora",
  },
  {
    name: "Pro",
    instances: 30,
    price: 349.9,
    popular: true,
    cta: "Quero o Pro",
  },
  {
    name: "Scale",
    instances: 50,
    price: 549.9,
    popular: false,
    cta: "Escalar Agora",
  },
  {
    name: "Elite",
    instances: 100,
    price: 899.9,
    popular: false,
    cta: "Falar com Consultor",
  },
];

const allFeatures = [
  "Aquecimento automatizado inteligente",
  "Painel de gestão completo",
  "Envio em massa com controle de velocidade",
  "Relatórios e métricas em tempo real",
  "Suporte técnico via WhatsApp",
  "API de integração inclusa",
  "Atualizações gratuitas",
];

const objections = [
  {
    icon: Lock,
    q: "E se eu não gostar?",
    a: "Você tem 7 dias de garantia incondicional. Devolvemos 100% do valor, sem burocracia.",
  },
  {
    icon: Clock,
    q: "Preciso de conhecimento técnico?",
    a: "Não. O painel é intuitivo e temos tutoriais passo-a-passo. Qualquer pessoa consegue usar.",
  },
  {
    icon: MessageCircle,
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa e sem fidelidade. Cancele a qualquer momento com 2 cliques.",
  },
  {
    icon: Users,
    q: "Posso mudar de plano depois?",
    a: "Claro! Faça upgrade ou downgrade a qualquer momento. O valor é ajustado automaticamente.",
  },
  {
    icon: Shield,
    q: "Meus dados estão seguros?",
    a: "Sim. Usamos criptografia e infraestrutura profissional com alta disponibilidade.",
  },
  {
    icon: Flame,
    q: "O aquecimento realmente funciona?",
    a: "Sim. Nosso algoritmo simula comportamento humano real, protegendo seus números de banimentos.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export default function Plans() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 px-5 py-2.5 rounded-lg transition-colors"
          >
            Entrar
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-14 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="relative max-w-3xl mx-auto"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-5">
            Todos os recursos.{" "}
            <span className="text-primary">Um só preço.</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-4">
            A única diferença entre os planos é a quantidade de instâncias.
            Escolha o tamanho da sua operação.
          </p>
          <p className="text-xs text-muted-foreground/60 mb-8">
            Sem surpresas. Sem funcionalidades bloqueadas. Sem pegadinhas.
          </p>
          <a
            href="#planos"
            className="inline-flex items-center gap-2 text-base font-semibold bg-primary text-primary-foreground px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Ver Planos
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </section>

      {/* What's included — all plans */}
      <section className="px-6 pb-14">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            custom={0}
            className="bg-card border border-border rounded-2xl p-6 sm:p-8"
          >
            <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Incluso em todos os planos
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Sem funcionalidades bloqueadas. Tudo liberado desde o primeiro dia.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allFeatures.map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-foreground/90">{feat}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="px-6 pb-20 scroll-mt-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            Escolha o tamanho da sua operação
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-12">
            Quanto mais instâncias, menor o custo por número.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan, i) => {
              const perInstance = (plan.price / plan.instances).toFixed(2).replace(".", ",");
              return (
                <motion.div
                  key={plan.name}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  variants={fadeUp}
                  custom={i}
                  className={`relative flex flex-col rounded-2xl border p-6 transition-shadow hover:shadow-xl ${
                    plan.popular
                      ? "border-primary bg-gradient-to-b from-primary/10 to-card shadow-xl shadow-primary/10 lg:scale-[1.04]"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-lg">
                      Mais Popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold mt-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.instances} instâncias
                  </p>

                  <div className="mt-4 mb-1">
                    <p className="text-3xl font-extrabold">
                      R$ {plan.price.toFixed(2).replace(".", ",")}
                      <span className="text-sm font-medium text-muted-foreground">/mês</span>
                    </p>
                    <p className="text-xs text-primary font-medium mt-1">
                      R$ {perInstance} por instância
                    </p>
                  </div>

                  <div className="my-4 h-px bg-border" />

                  <p className="text-xs text-muted-foreground mb-6 flex-1">
                    Todos os recursos inclusos. Sem limitações.
                  </p>

                  <button
                    onClick={() => navigate("/auth")}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      plan.popular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                        : "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="px-6 pb-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="max-w-2xl mx-auto bg-gradient-to-br from-primary/10 to-card border border-primary/20 rounded-2xl p-8 sm:p-10 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-5">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Garantia de 7 dias</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
            Se por qualquer motivo você não ficar satisfeito nos primeiros 7 dias,
            devolvemos <strong className="text-foreground">100% do seu investimento</strong>.
            Sem perguntas. Sem burocracia.
          </p>
          <p className="text-xs text-muted-foreground/60">
            Risco zero. A decisão mais segura que você pode tomar.
          </p>
        </motion.div>
      </section>

      {/* Objections / FAQ */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
            Ainda com dúvidas?
          </h2>
          <p className="text-center text-sm text-muted-foreground mb-10">
            Respondemos as perguntas mais comuns para você decidir com confiança.
          </p>
          <div className="space-y-3">
            {objections.map((obj, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i * 0.5}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center gap-3 px-6 py-4 text-left text-sm font-medium hover:bg-secondary/50 transition-colors"
                >
                  <obj.icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="flex-1">{obj.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
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
                      <div className="px-6 pb-4 text-sm text-muted-foreground pl-[3.25rem]">
                        {obj.a}
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
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-2xl font-bold mb-3">
            Comece agora. <span className="text-primary">Sem risco.</span>
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Ative seu plano, teste por 7 dias e veja os resultados.
          </p>
          <button
            onClick={() =>
              document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })
            }
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-10 py-4 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-base"
          >
            Escolher Meu Plano
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </section>
    </div>
  );
}
