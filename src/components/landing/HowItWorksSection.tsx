import { Users, Layers, Settings, XCircle } from "lucide-react";
import AnimateOnView from "@/components/AnimateOnView";

const forWhom = [
  { icon: Users, title: "Operadores com múltiplos números", desc: "Gerencie dezenas de instâncias em um único painel centralizado." },
  { icon: Layers, title: "Estruturas de escala", desc: "Infraestrutura preparada para operações que precisam crescer." },
  { icon: Settings, title: "Organização operacional", desc: "Automação e controle para profissionais que valorizam eficiência." },
];

const notFor = [
  "Quem busca soluções milagrosas",
  "Promessas de bloqueio zero",
  "Quem espera aquecimento em 24 horas",
  "Quem não quer investir tempo em configuração",
];

const HowItWorksSection = () => (
  <section id="para-quem" className="py-28 lg:py-36 bg-transparent">
    {/* Tablet scroll-reveal: Aquecimento card — hidden on mobile (<768px) */}
    <div className="hidden md:flex lg:hidden justify-center mb-10">
      <AnimateOnView animation="slide-up">
        <div className="relative rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 max-w-[340px]"
          style={{ background: "linear-gradient(145deg, rgba(17,24,39,0.98), rgba(10,15,25,0.96))", boxShadow: "0 0 0 1px rgba(7,193,96,0.12)" }}>
          <div className="w-7 h-7 rounded-lg bg-[#07C160]/[0.08] flex items-center justify-center border border-[#07C160]/10">
            <span className="text-[9px] font-bold text-[#07C160]">89%</span>
          </div>
          <div>
            <span className="text-[11px] text-white/70 font-medium block">Aquecimento</span>
            <span className="text-[8px] text-[#07C160]/60">Dia 12 de 14</span>
          </div>
        </div>
      </AnimateOnView>
    </div>
    <div className="container">
      <AnimateOnView animation="slide-up" className="text-center mb-20">
        <span className="inline-block text-sm font-semibold text-[#07C160] tracking-widest uppercase mb-4">
          Público
        </span>
        <h2 className="text-4xl sm:text-5xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Para quem é essa plataforma?
        </h2>
      </AnimateOnView>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
        {forWhom.map((item, i) => (
          <AnimateOnView key={i} animation="slide-up" delay={i + 1}>
            <div
              className="rounded-2xl p-8 border border-[#07C160]/20 card-hover-lift h-full"
              style={{ background: "linear-gradient(145deg, rgba(17,24,39,0.95), rgba(10,15,25,0.9))" }}
            >
              <div className="w-14 h-14 rounded-xl bg-[#07C160]/[0.08] border border-[#07C160]/10 flex items-center justify-center mb-5 flex-shrink-0">
                <item.icon className="w-6 h-6 text-[#07C160] flex-shrink-0" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
              <p className="text-sm text-white/35 leading-relaxed">{item.desc}</p>
            </div>
          </AnimateOnView>
        ))}
      </div>

      <AnimateOnView animation="fade-in" delay={4} className="max-w-5xl mx-auto">
        <div
          className="rounded-2xl p-8 border border-red-500/20"
          style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.04), rgba(17,24,39,0.95), rgba(239,68,68,0.02))" }}
        >
          <div className="pl-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-red-500/[0.08] border border-red-500/10 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              </div>
              <p className="text-base font-semibold text-white/80">Não é indicado para:</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pl-1">
              {notFor.map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 min-w-[8px] min-h-[8px] rounded-full bg-red-400/50 flex-shrink-0" />
                  <p className="text-sm text-white/40 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimateOnView>
    </div>
  </section>
);

export default HowItWorksSection;
