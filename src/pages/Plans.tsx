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
  Sparkles,
  Crown,
} from "lucide-react";

const plans = [
  {
    name: "Start",
    instances: 10,
    priceNormal: 197,
    priceDiscount: 137.9,
    popular: false,
  },
  {
    name: "Pro",
    instances: 30,
    priceNormal: 497,
    priceDiscount: 347.9,
    popular: true,
  },
  {
    name: "Scale",
    instances: 50,
    priceNormal: 797,
    priceDiscount: 557.9,
    popular: false,
  },
  {
    name: "Elite",
    instances: 100,
    priceNormal: 1497,
    priceDiscount: 1047.9,
    popular: false,
  },
];

const benefits = [
  { icon: LayoutDashboard, title: "Painel profissional e organizado", desc: "Gerencie todas as suas instâncias em um único lugar com interface intuitiva." },
  { icon: Server, title: "Controle de múltiplas instâncias", desc: "Adicione, pause e gerencie dezenas de números com facilidade." },
  { icon: HeadphonesIcon, title: "Suporte rápido e dedicado", desc: "Atendimento prioritário para resolver qualquer dúvida ou problema." },
  { icon: Shield, title: "Sistema estável e seguro", desc: "Infraestrutura robusta com alta disponibilidade e proteção de dados." },
  { icon: Users, title: "Ideal para operadores e estruturas de escala", desc: "Pensado para quem opera múltiplos números profissionalmente." },
  { icon: Zap, title: "Aquecimento inteligente e automatizado", desc: "Algoritmo próprio que simula uso humano para proteger seus números." },
];

const faqs = [
  {
    q: "Como funciona o desconto?",
    a: "O cupom FOUNDERS aplica 30% de desconto nos primeiros 90 dias ou para os primeiros 20 clientes. Após esse período, o plano renova no valor normal listado.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim! Você pode cancelar a qualquer momento sem multa. O acesso continua até o final do período já pago.",
  },
  {
    q: "Posso fazer upgrade de plano?",
    a: "Claro! Você pode migrar para um plano superior a qualquer momento. O valor será ajustado proporcionalmente.",
  },
  {
    q: "Como funciona o suporte?",
    a: "Oferecemos suporte via WhatsApp com tempo de resposta rápido. Planos maiores têm atendimento prioritário.",
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(142_71%_45%/0.08),transparent_60%)]" />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          className="relative max-w-3xl mx-auto"
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Oferta por tempo limitado
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-5">
            Infraestrutura Profissional para{" "}
            <span className="text-primary">Aquecimento e Escala</span> de Números WhatsApp
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Estabilidade, suporte rápido e controle total das suas instâncias.
          </p>
          <a
            href="#planos"
            className="inline-flex items-center gap-2 text-base font-semibold bg-primary text-primary-foreground px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Quero Ativar Meu Plano com Desconto
          </a>
        </motion.div>
      </section>

      {/* Founders Offer */}
      <section className="px-6 pb-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="max-w-2xl mx-auto"
        >
          <div className="relative bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 rounded-2xl p-8 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <Crown className="w-8 h-8 text-primary mx-auto mb-3" />
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">
              OFERTA FOUNDERS –{" "}
              <span className="text-primary">30% OFF</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-4 max-w-md mx-auto">
              Válido por 90 dias ou para os primeiros <strong className="text-foreground">20 clientes</strong>. Após o período promocional, o plano renova no valor normal.
            </p>
            <div className="inline-flex items-center gap-2 bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider rounded-full px-4 py-1.5">
              <Zap className="w-3.5 h-3.5" /> Vagas limitadas
            </div>
          </div>
        </motion.div>
      </section>

      {/* Plans */}
      <section id="planos" className="px-6 pb-20 scroll-mt-24">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            Escolha o plano ideal para sua operação
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => {
              const saving = plan.priceNormal - plan.priceDiscount;
              return (
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
                  <p className="text-sm text-muted-foreground line-through">
                    R$ {plan.priceNormal.toFixed(2).replace(".", ",")}/mês
                  </p>
                  <p className="text-3xl font-extrabold text-primary mb-1">
                    R$ {plan.priceDiscount.toFixed(2).replace(".", ",")}
                    <span className="text-sm font-medium text-muted-foreground">/mês</span>
                  </p>
                  <p className="text-xs text-primary/80 mb-6">
                    Economia de R$ {saving.toFixed(2).replace(".", ",")}/mês
                  </p>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {[
                      `${plan.instances} instâncias WhatsApp`,
                      "Aquecimento automatizado",
                      "Painel de gestão completo",
                      "Suporte dedicado",
                      plan.instances >= 50 && "Atendimento prioritário",
                      plan.instances >= 100 && "Gerente de conta dedicado",
                    ]
                      .filter(Boolean)
                      .map((feat, fi) => (
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
                    Ativar com Cupom
                  </button>
                </motion.div>
              );
            })}
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
            Teste a plataforma sem risco. Se não ficar satisfeito nos primeiros 7 dias, devolvemos 100% do seu investimento. Sem burocracia.
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
            Quero Ativar Meu Plano com Desconto
          </button>
        </div>
      </section>
    </div>
  );
}
