import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap, Shield, BarChart3, Smartphone, Settings, Globe,
  ArrowRight, CheckCircle2, MessageSquare, Users, Layers,
  ChevronDown, Star, Rocket, Clock, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

// Prefetch
const prefetchRoutes = () => {
  const load = () => { import("./Auth"); import("./dashboard/MyPlan"); };
  if ("requestIdleCallback" in window) (window as any).requestIdleCallback(load);
  else setTimeout(load, 2000);
};

// ─── Animation helpers ───
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

// ─── Navbar ───
const Navbar = () => {
  const navigate = useNavigate();
  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#0a0a0a]/80 border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-5">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="DG" width={32} height={32} className="rounded-lg" />
          <span className="text-sm font-semibold text-white tracking-tight">
            DG Contingência <span className="text-[hsl(var(--primary))]">PRO</span>
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-7">
          {[["beneficios", "Benefícios"], ["como-funciona", "Como funciona"], ["recursos", "Recursos"], ["planos", "Planos"], ["faq", "FAQ"]].map(([id, label]) => (
            <button key={id} onClick={() => scroll(id)} className="text-[13px] text-white/45 hover:text-white transition-colors">{label}</button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-xs text-white/50 hover:text-white hover:bg-white/5">Entrar</Button>
          <Button size="sm" onClick={() => navigate("/auth?mode=signup")} className="text-xs bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white">Criar conta</Button>
        </div>
      </div>
    </header>
  );
};

// ─── Section wrapper ───
const Section = ({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`py-20 md:py-28 px-5 ${className}`}>
    <div className="max-w-6xl mx-auto">{children}</div>
  </section>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--primary))] mb-4">{children}</span>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight mb-4">{children}</h2>
);

const SectionSub = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm md:text-base text-white/50 max-w-2xl leading-relaxed">{children}</p>
);

// ─── 1. Hero ───
const Hero = () => {
  const navigate = useNavigate();
  return (
    <Section className="pt-32 md:pt-44 pb-16 md:pb-24 text-center">
      <motion.div initial="hidden" animate="visible" variants={stagger}>
        <motion.div variants={fadeUp}>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] text-white/60 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
            Plataforma de contingência profissional
          </span>
        </motion.div>
        <motion.h1 variants={fadeUp} className="text-3xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-5 max-w-3xl mx-auto">
          Gerencie seus disparos com{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--primary))] to-emerald-300">máxima performance</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="text-sm sm:text-base md:text-lg text-white/45 max-w-xl mx-auto mb-8 leading-relaxed">
          Infraestrutura completa para operar múltiplas instâncias, aquecer chips e escalar com segurança.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white text-sm px-7 h-11 gap-2">
            Começar agora <ArrowRight className="w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })} className="border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-sm px-7 h-11">
            Ver planos
          </Button>
        </motion.div>
      </motion.div>
      {/* gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[hsl(var(--primary))]/10 rounded-full blur-[120px] pointer-events-none" />
    </Section>
  );
};

// ─── 2. Benefícios ───
const benefits = [
  { icon: Zap, title: "Velocidade", desc: "Disparos rápidos com delays inteligentes que protegem suas instâncias." },
  { icon: Shield, title: "Segurança", desc: "Aquecimento automatizado e rotação de chips para evitar banimentos." },
  { icon: BarChart3, title: "Métricas", desc: "Acompanhe taxas de entrega, falhas e desempenho por instância." },
  { icon: Globe, title: "Escalabilidade", desc: "Gerencie de 10 a 100+ instâncias em um único painel." },
];

const Benefits = () => (
  <Section id="beneficios">
    <div className="text-center mb-14">
      <SectionLabel>Benefícios</SectionLabel>
      <SectionTitle>Por que escolher a DG?</SectionTitle>
      <SectionSub>Infraestrutura pensada para quem opera em grande escala.</SectionSub>
    </div>
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {benefits.map((b) => (
        <motion.div key={b.title} variants={fadeUp} className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-4 group-hover:bg-[hsl(var(--primary))]/15 transition-colors">
            <b.icon className="w-5 h-5 text-[hsl(var(--primary))]" />
          </div>
          <h3 className="text-sm font-semibold text-white mb-2">{b.title}</h3>
          <p className="text-xs text-white/40 leading-relaxed">{b.desc}</p>
        </motion.div>
      ))}
    </motion.div>
  </Section>
);

// ─── 3. Como funciona ───
const steps = [
  { num: "01", title: "Crie sua conta", desc: "Cadastro rápido e sem burocracia." },
  { num: "02", title: "Conecte instâncias", desc: "Vincule seus chips via QR Code em segundos." },
  { num: "03", title: "Configure campanhas", desc: "Defina mensagens, delays e contatos." },
  { num: "04", title: "Escale resultados", desc: "Acompanhe métricas e otimize suas operações." },
];

const HowItWorks = () => (
  <Section id="como-funciona" className="bg-white/[0.01]">
    <div className="text-center mb-14">
      <SectionLabel>Como funciona</SectionLabel>
      <SectionTitle>4 passos para começar</SectionTitle>
      <SectionSub>Do cadastro ao primeiro disparo em minutos.</SectionSub>
    </div>
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {steps.map((s, i) => (
        <motion.div key={s.num} variants={fadeUp} className="relative text-center md:text-left">
          <span className="text-4xl font-bold text-[hsl(var(--primary))]/15 block mb-3 font-mono">{s.num}</span>
          <h3 className="text-sm font-semibold text-white mb-2">{s.title}</h3>
          <p className="text-xs text-white/40 leading-relaxed">{s.desc}</p>
          {i < 3 && <div className="hidden md:block absolute top-6 -right-3 w-6 border-t border-dashed border-white/10" />}
        </motion.div>
      ))}
    </motion.div>
  </Section>
);

// ─── 4. Recursos ───
const features = [
  { icon: Smartphone, title: "Multi-instância", desc: "Conecte e gerencie dezenas de chips simultaneamente." },
  { icon: Layers, title: "Warmup inteligente", desc: "Aquecimento automático com fases progressivas." },
  { icon: MessageSquare, title: "Disparos em massa", desc: "Campanhas com delays, pausas e rotação de instâncias." },
  { icon: Users, title: "Gestão de contatos", desc: "Importe, organize e segmente sua base." },
  { icon: Settings, title: "Templates", desc: "Crie e reutilize modelos de mensagem com variáveis." },
  { icon: Lock, title: "Relatórios WhatsApp", desc: "Receba alertas e relatórios direto no seu WhatsApp." },
];

const Features = () => (
  <Section id="recursos">
    <div className="text-center mb-14">
      <SectionLabel>Recursos</SectionLabel>
      <SectionTitle>Tudo que você precisa</SectionTitle>
      <SectionSub>Funcionalidades pensadas para operação profissional.</SectionSub>
    </div>
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {features.map((f) => (
        <motion.div key={f.title} variants={fadeUp} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/10 transition-all">
          <f.icon className="w-5 h-5 text-[hsl(var(--primary))] mb-4" />
          <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
          <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
        </motion.div>
      ))}
    </motion.div>
  </Section>
);

// ─── 5. Planos ───
const plans = [
  { name: "Start", instances: 10, price: null, popular: false, whatsappReports: false },
  { name: "Pro", instances: 30, price: null, popular: true, whatsappReports: false },
  { name: "Scale", instances: 50, price: null, popular: false, whatsappReports: true },
  { name: "Elite", instances: 100, price: null, popular: false, whatsappReports: true },
];

const Plans = () => {
  const navigate = useNavigate();
  return (
    <Section id="planos" className="bg-white/[0.01]">
      <div className="text-center mb-14">
        <SectionLabel>Planos</SectionLabel>
        <SectionTitle>Escolha o plano ideal</SectionTitle>
        <SectionSub>Todos os planos incluem acesso completo à plataforma.</SectionSub>
      </div>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((p) => (
          <motion.div key={p.name} variants={fadeUp}
            className={`relative rounded-2xl border p-6 transition-all ${
              p.popular ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/[0.04]" : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wider bg-[hsl(var(--primary))] text-white px-3 py-1 rounded-full">
                Popular
              </span>
            )}
            <h3 className="text-lg font-bold text-white mb-1">{p.name}</h3>
            <p className="text-xs text-white/40 mb-5">{p.instances} instâncias</p>
            <ul className="space-y-2.5 mb-6">
              {["Disparos ilimitados", "Warmup automático", "Campanhas avançadas", "Suporte prioritário"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-white/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />{item}
                </li>
              ))}
              <li className="flex items-center gap-2 text-xs text-white/50">
                <CheckCircle2 className={`w-3.5 h-3.5 ${p.whatsappReports ? "text-[hsl(var(--primary))]" : "text-white/15"}`} />
                <span className={p.whatsappReports ? "" : "text-white/25"}>Relatórios WhatsApp {p.whatsappReports ? "incluso" : ""}</span>
              </li>
            </ul>
            <Button onClick={() => navigate("/auth?mode=signup")}
              className={`w-full text-xs h-9 ${
                p.popular ? "bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white" : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
              }`}
            >
              Contratar plano
            </Button>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
};

// ─── 6. Addon ───
const Addon = () => (
  <Section>
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-6 h-6 text-[hsl(var(--primary))]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white mb-1">Relatórios via WhatsApp</h3>
          <p className="text-xs text-white/40 leading-relaxed max-w-md">
            Receba alertas de desconexão, fim de campanha e relatórios periódicos direto no seu WhatsApp. Incluso nos planos Scale e Elite.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className="text-2xl font-bold text-white">R$18,90<span className="text-xs font-normal text-white/40">/mês</span></span>
      </div>
    </motion.div>
  </Section>
);

// ─── 7. FAQ ───
const faqs = [
  { q: "Preciso de um servidor próprio?", a: "Não. Toda a infraestrutura roda na nuvem. Basta criar sua conta e conectar suas instâncias." },
  { q: "Como funciona o aquecimento?", a: "O warmup é automático. O sistema envia interações progressivas para aquecer o chip antes de disparos em massa." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim. Não há fidelidade. Você pode cancelar ou trocar de plano quando quiser." },
  { q: "O que são relatórios via WhatsApp?", a: "É um addon que envia alertas e métricas diretamente no seu WhatsApp, como desconexões e fim de campanhas." },
  { q: "Quantas instâncias posso conectar?", a: "Depende do seu plano: Start (10), Pro (30), Scale (50) ou Elite (100)." },
];

const FAQ = () => (
  <Section id="faq" className="bg-white/[0.01]">
    <div className="text-center mb-14">
      <SectionLabel>FAQ</SectionLabel>
      <SectionTitle>Perguntas frequentes</SectionTitle>
    </div>
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="max-w-2xl mx-auto space-y-3">
      {faqs.map((f) => (
        <motion.details key={f.q} variants={fadeUp} className="group rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-white/80 hover:text-white transition-colors list-none">
            {f.q}
            <ChevronDown className="w-4 h-4 text-white/30 group-open:rotate-180 transition-transform" />
          </summary>
          <p className="px-5 pb-4 text-xs text-white/40 leading-relaxed">{f.a}</p>
        </motion.details>
      ))}
    </motion.div>
  </Section>
);

// ─── 8. CTA Final ───
const CTAFinal = () => {
  const navigate = useNavigate();
  return (
    <Section>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
        className="relative text-center rounded-2xl border border-[hsl(var(--primary))]/20 bg-gradient-to-b from-[hsl(var(--primary))]/[0.06] to-transparent p-10 md:p-16 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[hsl(var(--primary))]/5 rounded-2xl blur-[60px] pointer-events-none" />
        <div className="relative">
          <Rocket className="w-8 h-8 text-[hsl(var(--primary))] mx-auto mb-5" />
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 tracking-tight">
            Pronto para escalar sua operação?
          </h2>
          <p className="text-sm text-white/45 max-w-md mx-auto mb-7">
            Crie sua conta agora e comece a operar com a infraestrutura que sua operação merece.
          </p>
          <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white text-sm px-8 h-11 gap-2">
            Começar agora <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </Section>
  );
};

// ─── Footer ───
const FooterSection = () => (
  <footer className="py-10 px-5 border-t border-white/[0.04]">
    <div className="max-w-6xl mx-auto flex flex-col items-center gap-4">
      <div className="flex items-center gap-2.5">
        <img src={logo} alt="DG" width={28} height={28} className="rounded-lg" />
        <span className="text-sm font-medium text-white">DG Contingência</span>
      </div>
      <p className="text-[11px] text-white/30 text-center max-w-lg leading-relaxed">
        A performance da operação depende da estratégia aplicada pelo usuário. A plataforma fornece infraestrutura e ferramentas de gestão.
      </p>
      <p className="text-[11px] text-white/20">© {new Date().getFullYear()} DG Contingência. Todos os direitos reservados.</p>
    </div>
  </footer>
);

// ─── WhatsApp Float ───
const WhatsAppFloat = () => (
  <a href="https://wa.me/5562994192500?text=Ol%C3%A1%2C%20vim%20do%20site%20da%20DG%20Conting%C3%AAncia%20PRO%20e%20preciso%20de%20suporte." target="_blank" rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[hsl(var(--primary))] hover:scale-110 flex items-center justify-center transition-transform shadow-lg shadow-[hsl(var(--primary))]/25"
  >
    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.212l-.257-.154-2.874.854.854-2.874-.154-.257A8 8 0 1112 20z"/></svg>
  </a>
);

// ─── Main ───
const Landing = () => {
  useEffect(() => { prefetchRoutes(); }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative" style={{ overflowX: "hidden" }}>
      <Navbar />
      <Hero />
      <Benefits />
      <HowItWorks />
      <Features />
      <Plans />
      <Addon />
      <FAQ />
      <CTAFinal />
      <FooterSection />
      <WhatsAppFloat />
    </div>
  );
};

export default Landing;
