import { Shield, Bot, MonitorSmartphone, Eye, Lock, Zap } from "lucide-react";
import AnimateOnView from "@/components/AnimateOnView";

const items = [
  { icon: Shield, title: "Controle total", desc: "Você mantém o domínio completo do seu número e das suas operações." },
  { icon: Bot, title: "Automação inteligente", desc: "Sistema que simula comportamento humano para proteger sua conta." },
  { icon: MonitorSmartphone, title: "Interface intuitiva", desc: "Painel limpo e direto ao ponto, sem curva de aprendizado." },
  { icon: Eye, title: "Monitoramento em tempo real", desc: "Acompanhe cada ação, métrica e status ao vivo no dashboard." },
  { icon: Lock, title: "Segurança em primeiro lugar", desc: "Dados criptografados e conexões protegidas em todas as camadas." },
  { icon: Zap, title: "Performance otimizada", desc: "Infraestrutura rápida e estável, pronta para escalar com você." },
];

const TrustSection = () => (
  <section id="confianca" className="relative py-24 lg:py-32 bg-transparent">
    <div className="container max-w-5xl">
      <AnimateOnView animation="slide-up" className="text-center mb-16">
        <span className="text-[#07C160] text-sm font-semibold tracking-widest uppercase mb-3 block">Confiança</span>
        <h2 className="text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Tecnologia pensada para uso responsável
        </h2>
      </AnimateOnView>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <AnimateOnView key={item.title} animation="slide-up" delay={Math.min(i + 1, 5)}>
            <div
              className="relative rounded-2xl p-5 border border-[#07C160]/15 cursor-default card-hover-lift h-full"
              style={{ background: "linear-gradient(160deg, rgba(17,24,39,0.95), rgba(10,15,25,0.9))" }}
            >
              <div className="w-10 h-10 rounded-xl bg-[#07C160]/[0.08] border border-[#07C160]/10 flex items-center justify-center mb-4 flex-shrink-0">
                <item.icon className="w-5 h-5 flex-shrink-0 text-[#07C160]/70" />
              </div>
              <h3 className="text-[15px] font-semibold text-white mb-1.5">{item.title}</h3>
              <p className="text-[12px] text-white/35 leading-relaxed">{item.desc}</p>
            </div>
          </AnimateOnView>
        ))}
      </div>
    </div>
  </section>
);

export default TrustSection;
