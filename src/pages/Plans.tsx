import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Shield,
  Zap,
  HeadphonesIcon,
  LayoutDashboard,
  Server,
  Users,
  ChevronDown,
  Rocket,
} from "lucide-react";

const plans = [
  {
    name: "Start",
    instances: 10,
    price: 149.90,
    popular: false,
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
    price: 349.90,
    popular: true,
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
    price: 549.90,
    popular: false,
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
    price: 899.90,
    popular: false,
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

const benefits = [
  { icon: LayoutDashboard, title: "Painel profissional e organizado", desc: "Gerencie todas as suas instâncias em um único lugar com interface intuitiva." },
  { icon: Server, title: "Gestão de múltiplas instâncias", desc: "Adicione, pause e gerencie dezenas de números com facilidade." },
  { icon: Shield, title: "Sistema estável", desc: "Infraestrutura robusta com alta disponibilidade e proteção de dados." },
  { icon: Rocket, title: "Estrutura preparada para escala", desc: "Cresça sem se preocupar com limitações técnicas ou instabilidade." },
  { icon: HeadphonesIcon, title: "Suporte técnico ágil", desc: "Atendimento rápido para resolver qualquer dúvida ou problema." },
  { icon: Zap, title: "Aquecimento inteligente", desc: "Algoritmo que simula uso humano para proteger seus números." },
];

const faqs = [
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim! Você pode cancelar a qualquer momento sem multa. O acesso continua até o final do período já pago.",
  },
  {
    q: "Posso mudar de plano?",
    a: "Claro! Você pode migrar para um plano superior ou inferior a qualquer momento. O valor será ajustado proporcionalmente.",
  },
  {
    q: "Como funciona o suporte?",
    a: "Oferecemos suporte via WhatsApp com tempo de resposta rápido. Planos maiores têm atendimento prioritário e gerente dedicado.",
  },
  {
    q: "Como funciona a ativação das instâncias?",
    a: "Após a assinatura, você acessa o painel e pode adicionar suas instâncias imediatamente. O processo é simples e guiado.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
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
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 px-5 py-2 rounded-lg transition-colors"
          >
            Entrar
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(210_80%_40%/0.06),transparent_60%)]" />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="relative max-w-3xl mx-auto"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-5">
            Infraestrutura Profissional para{" "}
            <span className="text-primary">Operações WhatsApp</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Estabilidade, controle total e suporte dedicado para quem leva escala a sério.
          </p>
          <a
            href="#planos"
            className="inline-flex items-center gap-2 text-base font-semibold bg-primary text-primary-foreground px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Escolher Plano
          </a>
        </motion.div>
      </section>

      {/* Plans */}
      <section id="planos" className="px-6 pb-20 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Escolha o plano ideal para sua operação
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.popular
                    ? "border-primary bg-gradient-to-b from-primary/10 to-card shadow-xl shadow-primary/10 scale-[1.03]"
                    : "border-border bg-card"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-lg">
                    Mais Popular
                  </span>
                )}
                <h3 className="text-lg font-bold mt-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {plan.instances} instâncias
                </p>
                <p className="text-3xl font-extrabold mb-1">
                  R$ {plan.price.toFixed(2).replace(".", ",")}
                  <span className="text-sm font-medium text-muted-foreground">/mês</span>
                </p>
                <div className="mt-4 mb-6 h-px bg-border" />
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((feat, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/auth")}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                      : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                  }`}
                >
                  Assinar Agora
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Por que escolher nossa plataforma?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
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
          className="max-w-2xl mx-auto bg-card border border-border rounded-2xl p-8 text-center"
        >
          <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Garantia de 7 dias</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Teste a plataforma sem risco. Se não ficar satisfeito nos primeiros 7 dias, devolvemos 100% do seu investimento.
          </p>
        </motion.div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-24">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Perguntas frequentes
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left text-sm font-medium hover:bg-secondary/50 transition-colors"
                >
                  {faq.q}
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm text-muted-foreground">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-6 pb-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Pronto para escalar?</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Ative seu plano agora e comece a operar com infraestrutura profissional.
          </p>
          <button
            onClick={() => {
              document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Escolher Plano
          </button>
        </div>
      </section>
    </div>
  );
}
