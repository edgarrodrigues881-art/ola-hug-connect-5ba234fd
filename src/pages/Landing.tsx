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

// ─── Grid pattern background ───
const GridPattern = () => (
  <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
    <div className="absolute inset-0" style={{
      backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
      backgroundSize: '64px 64px',
    }} />
    <div className="absolute inset-0 bg-gradient-to-b from-[#181c24] via-transparent to-[#181c24]" />
  </div>
);

// ─── Navbar ───
const Navbar = () => {
  const navigate = useNavigate();
  const scroll = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#181c24]/90 border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-5">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="DG" width={32} height={32} className="rounded-lg" />
          <span className="text-sm font-bold text-white tracking-tight">
            DG Contingência <span className="text-[hsl(var(--primary))]">PRO</span>
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-7">
          {[["beneficios", "Benefícios"], ["como-funciona", "Como funciona"], ["recursos", "Recursos"], ["planos", "Planos"], ["faq", "FAQ"]].map(([id, label]) => (
            <button key={id} onClick={() => scroll(id)} className="text-[13px] font-medium text-white/45 hover:text-white transition-colors">{label}</button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-xs font-medium text-white/50 hover:text-white hover:bg-white/5">Entrar</Button>
          <Button size="sm" onClick={() => navigate("/auth?mode=signup")} className="text-xs font-semibold bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white">Criar conta</Button>
        </div>
      </div>
    </header>
  );
};

// ─── Section wrapper ─── (120px spacing)
const Section = ({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`py-12 md:py-20 px-5 ${className}`}>
    <div className="max-w-6xl mx-auto">{children}</div>
  </section>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--primary))] mb-4">{children}</span>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-3xl md:text-[2.75rem] font-extrabold text-white/95 tracking-tight mb-4 leading-tight">{children}</h2>
);

const SectionSub = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm md:text-base text-white/60 max-w-2xl leading-relaxed font-medium mx-auto">{children}</p>
);

// ─── 1. Hero ───
const Hero = () => {
  const navigate = useNavigate();
  return (
    <section className="relative pt-28 md:pt-40 pb-14 md:pb-20 px-5 text-center overflow-hidden">
      {/* Radial glow behind title */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.12)_0%,transparent_70%)]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-[hsl(var(--primary))]/8 rounded-full blur-[100px]" />
      </div>
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold text-white/60 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
              Gestão profissional de WhatsApp
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.08] mb-6 max-w-4xl mx-auto">
            Opere múltiplos chips com{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--primary))] to-emerald-300">controle total</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-base sm:text-lg md:text-xl text-white/50 max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            Aquecimento, disparo e monitoramento em uma única plataforma. Escale com organização e reduza riscos.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white text-sm font-semibold px-8 h-12 gap-2 shadow-lg shadow-[hsl(var(--primary))]/20">
              Começar agora <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })} className="bg-transparent border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-sm font-semibold px-8 h-12">
              Ver planos
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// ─── 2. Benefícios ───
const benefits = [
  { icon: Zap, title: "Envio otimizado", desc: "Intervalos inteligentes entre mensagens para manter suas instâncias saudáveis." },
  { icon: Shield, title: "Redução de risco", desc: "Aquecimento automático e rotação de chips para minimizar bloqueios." },
  { icon: BarChart3, title: "Visão em tempo real", desc: "Monitore entregas, falhas e desempenho de cada instância no painel." },
  { icon: Globe, title: "Escala sob controle", desc: "Opere de 10 a 100+ instâncias em um único ambiente centralizado." },
];

const Benefits = () => (
  <Section id="beneficios">
    <div className="text-center mb-10">
      <SectionLabel>Benefícios</SectionLabel>
      <SectionTitle>O que a plataforma entrega</SectionTitle>
      <SectionSub>Estrutura pensada para quem precisa de estabilidade, controle e escala.</SectionSub>
    </div>
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {benefits.map((b) => (
        <motion.div key={b.title} variants={fadeUp} className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 hover:bg-white/[0.06] hover:border-white/[0.14] transition-all duration-300">
          <div className="w-11 h-11 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-5 group-hover:bg-[hsl(var(--primary))]/15 transition-colors">
            <b.icon className="w-5 h-5 text-[hsl(var(--primary))]" />
          </div>
          <h3 className="text-[15px] font-bold text-white mb-2">{b.title}</h3>
          <p className="text-[13px] text-white/50 leading-relaxed">{b.desc}</p>
        </motion.div>
      ))}
    </motion.div>
  </Section>
);

// ─── 3. Como funciona ───
const steps = [
  { num: "01", title: "Crie sua conta", desc: "Cadastro simples e liberação imediata do painel." },
  { num: "02", title: "Conecte seus chips", desc: "Vincule instâncias via QR Code em poucos segundos." },
  { num: "03", title: "Monte suas campanhas", desc: "Defina mensagens, intervalos, contatos e regras de envio." },
  { num: "04", title: "Acompanhe e escale", desc: "Monitore métricas em tempo real e ajuste conforme necessário." },
];

const HowItWorks = () => (
  <Section id="como-funciona">
    <div className="text-center mb-10">
      <SectionLabel>Como funciona</SectionLabel>
      <SectionTitle>Como funciona na prática</SectionTitle>
      <SectionSub>Do cadastro ao primeiro envio em poucos minutos.</SectionSub>
    </div>
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="grid grid-cols-1 md:grid-cols-4 gap-8">
      {steps.map((s, i) => (
        <motion.div key={s.num} variants={fadeUp} className="relative text-center md:text-left">
          <span className="text-5xl font-extrabold text-[hsl(var(--primary))]/25 block mb-3 font-mono">{s.num}</span>
          <h3 className="text-[15px] font-bold text-white mb-2">{s.title}</h3>
          <p className="text-[13px] text-white/50 leading-relaxed">{s.desc}</p>
          {i < 3 && <div className="hidden md:block absolute top-8 -right-4 w-8 border-t border-dashed border-white/10" />}
        </motion.div>
      ))}
    </motion.div>
  </Section>
);

// ─── 4. Recursos ───
const features = [
  { icon: Smartphone, title: "Múltiplas instâncias", desc: "Conecte e controle dezenas de chips ao mesmo tempo em um painel único." },
  { icon: Layers, title: "Aquecimento progressivo", desc: "Warmup automático com fases controladas para amadurecer cada chip." },
  { icon: MessageSquare, title: "Campanhas em massa", desc: "Envios com intervalos, pausas programadas e distribuição entre instâncias." },
  { icon: Users, title: "Base de contatos", desc: "Importe, organize e segmente seus contatos de forma prática." },
  { icon: Settings, title: "Modelos de mensagem", desc: "Crie templates com variáveis dinâmicas e reutilize em qualquer campanha." },
  { icon: Lock, title: "Alertas no WhatsApp", desc: "Receba notificações sobre desconexões, falhas e status das campanhas." },
];

const Features = () => (
  <Section id="recursos">
    <div className="text-center mb-10">
      <SectionLabel>Recursos</SectionLabel>
      <SectionTitle>Recursos inclusos na plataforma</SectionTitle>
      <SectionSub>Todas as ferramentas que você precisa para operar com organização.</SectionSub>
    </div>
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {features.map((f) => (
        <motion.div key={f.title} variants={fadeUp} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 hover:border-white/[0.14] hover:bg-white/[0.06] transition-all duration-300">
          <f.icon className="w-5 h-5 text-[hsl(var(--primary))] mb-5" />
          <h3 className="text-[15px] font-bold text-white mb-2">{f.title}</h3>
          <p className="text-[13px] text-white/50 leading-relaxed">{f.desc}</p>
        </motion.div>
      ))}
    </motion.div>
  </Section>
);

// ─── 5. Planos ───
const plans = [
  { name: "Start", instances: 10, price: "149,90", popular: false, whatsappReports: false },
  { name: "Pro", instances: 30, price: "349,90", popular: true, whatsappReports: false },
  { name: "Scale", instances: 50, price: "549,90", popular: false, whatsappReports: true },
  { name: "Elite", instances: 100, price: "899,90", popular: false, whatsappReports: true },
];

const Plans = () => {
  const navigate = useNavigate();
  return (
    <Section id="planos">
      <div className="text-center mb-10">
        <SectionLabel>Planos</SectionLabel>
        <SectionTitle>Planos sob medida para cada operação</SectionTitle>
        <SectionSub>Acesso completo em todos os planos. O que muda é a quantidade de instâncias e nível de suporte.</SectionSub>
      </div>
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {plans.map((p) => (
          <motion.div key={p.name} variants={fadeUp}
            className={`relative rounded-2xl border transition-all duration-300 ${
              p.popular
                ? "border-[hsl(var(--primary))]/40 bg-[hsl(var(--primary))]/[0.06] p-8 md:p-9 scale-[1.03] shadow-[0_0_40px_-8px_hsl(var(--primary)/0.25)] z-10"
                : "border-white/[0.08] bg-white/[0.03] p-7 md:p-8 hover:border-white/[0.14]"
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider bg-[hsl(var(--primary))] text-white px-4 py-1.5 rounded-full shadow-lg shadow-[hsl(var(--primary))]/30">
                Mais escolhido
              </span>
            )}
            <h3 className="text-xl font-extrabold text-white mb-1">{p.name}</h3>
            <p className="text-[13px] text-white/50 font-medium mb-4">até {p.instances} instâncias</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-sm font-medium text-white/40">R$</span>
              <span className="text-3xl font-extrabold text-white">{p.price.split(",")[0]}</span>
              <span className="text-base font-bold text-white/40">,{p.price.split(",")[1]}</span>
              <span className="text-sm font-medium text-white/35">/mês</span>
            </div>
            <ul className="space-y-3 mb-7">
              {["Envios ilimitados", "Warmup automático", "Campanhas avançadas", "Suporte prioritário"].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[13px] text-white/60 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />{item}
                </li>
              ))}
              <li className="flex items-center gap-2.5 text-[13px] font-medium">
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${p.whatsappReports ? "text-[hsl(var(--primary))]" : "text-white/15"}`} />
                <span className={p.whatsappReports ? "text-white/60" : "text-white/25"}>
                  Relatórios WhatsApp {p.whatsappReports ? "incluso" : <span className="text-white/30 ml-1">+ R$ 18,90/mês</span>}
                </span>
              </li>
            </ul>
            <Button onClick={() => navigate("/auth?mode=signup")}
              className={`w-full text-[13px] font-semibold h-10 ${
                p.popular
                  ? "bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white shadow-md shadow-[hsl(var(--primary))]/20"
                  : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
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

// ─── 7. FAQ ───
const faqs = [
  { q: "Preciso de um servidor próprio?", a: "Não. Toda a infraestrutura roda na nuvem. Basta criar sua conta, conectar suas instâncias e começar a operar." },
  { q: "Como funciona o aquecimento?", a: "O warmup é totalmente automatizado. O sistema realiza interações progressivas para amadurecer o chip antes dos disparos em massa." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim. Não exigimos fidelidade. Você pode cancelar ou trocar de plano sempre que desejar." },
  { q: "O que são relatórios via WhatsApp?", a: "É um recurso adicional que envia alertas e métricas diretamente no seu WhatsApp, como desconexões, fim de campanhas e falhas críticas." },
  { q: "Quantas instâncias posso conectar?", a: "Depende do plano contratado: Start (10), Pro (30), Scale (50) ou Elite (100 instâncias)." },
];

const FAQ = () => (
  <Section id="faq">
    <div className="text-center mb-10">
      <SectionLabel>FAQ</SectionLabel>
      <SectionTitle>Perguntas frequentes</SectionTitle>
    </div>
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={stagger} className="max-w-2xl mx-auto space-y-3">
      {faqs.map((f) => (
        <motion.details key={f.q} variants={fadeUp} className="group rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
          <summary className="flex items-center justify-between px-6 py-5 cursor-pointer text-[15px] font-semibold text-white/80 hover:text-white transition-colors list-none">
            {f.q}
            <ChevronDown className="w-4 h-4 text-white/30 group-open:rotate-180 transition-transform" />
          </summary>
          <p className="px-6 pb-5 text-[13px] text-white/50 leading-relaxed font-medium">{f.a}</p>
        </motion.details>
      ))}
    </motion.div>
  </Section>
);


// ─── Footer ───
const FooterSection = () => (
  <footer className="py-12 px-5 border-t border-white/[0.04]">
    <div className="max-w-6xl mx-auto flex flex-col items-center gap-4">
      <div className="flex items-center gap-2.5">
        <img src={logo} alt="DG" width={28} height={28} className="rounded-lg" />
        <span className="text-sm font-semibold text-white">DG Contingência</span>
      </div>
      <p className="text-[11px] text-white/35 text-center max-w-lg leading-relaxed">
        Os resultados dependem da estratégia aplicada pelo operador. A plataforma fornece infraestrutura, ferramentas de gestão e suporte técnico.
      </p>
      <p className="text-[11px] text-white/25">© {new Date().getFullYear()} DG Contingência. Todos os direitos reservados.</p>
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
    <div className="min-h-screen bg-[#181c24] relative" style={{ overflowX: "hidden" }}>
      <GridPattern />
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <Benefits />
        <HowItWorks />
        <Features />
        <Plans />
        
        <FAQ />
        
        <FooterSection />
      </div>
      <WhatsAppFloat />
    </div>
  );
};

export default Landing;
