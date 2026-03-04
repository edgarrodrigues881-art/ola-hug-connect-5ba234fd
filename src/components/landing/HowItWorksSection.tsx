import { motion } from "framer-motion";
import { Users, Layers, Settings, XCircle } from "lucide-react";

const forWhom = [
  {
    icon: Users,
    title: "Operadores com múltiplos números",
    desc: "Gerencie dezenas de instâncias em um único painel centralizado.",
  },
  {
    icon: Layers,
    title: "Estruturas de escala",
    desc: "Infraestrutura preparada para operações que precisam crescer.",
  },
  {
    icon: Settings,
    title: "Organização operacional",
    desc: "Automação e controle para profissionais que valorizam eficiência.",
  },
];

const notFor = [
  "Quem busca soluções milagrosas",
  "Promessas de bloqueio zero",
  "Quem espera aquecimento em 24 horas",
  "Quem não quer investir tempo em configuração",
];

const HowItWorksSection = () => (
  <section id="para-quem" className="py-24 lg:py-32 bg-transparent">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-center mb-16"
      >
        <span className="inline-block text-xs font-semibold text-[#07C160] tracking-widest uppercase mb-3">
          Público
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Para quem é essa plataforma?
        </h2>
      </motion.div>

      {/* Grid cards — each card is a single animated block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-8">
        {forWhom.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="group rounded-2xl p-6 border border-[#07C160]/20 hover:-translate-y-[3px] transition-transform duration-150 ease-out"
            style={{
              background: "linear-gradient(145deg, rgba(17,24,39,0.95), rgba(10,15,25,0.9))",
            }}
          >
            <div className="w-11 h-11 rounded-xl bg-[#07C160]/[0.08] border border-[#07C160]/10 flex items-center justify-center mb-4">
              <item.icon className="w-5 h-5 text-[#07C160]" />
            </div>
            <h3 className="text-[15px] font-semibold text-white mb-2">{item.title}</h3>
            <p className="text-[13px] text-white/35 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Warning card — single animated block */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        className="max-w-4xl mx-auto"
      >
        <div
          className="rounded-2xl p-6 border border-red-500/20"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.04), rgba(17,24,39,0.95), rgba(239,68,68,0.02))",
          }}
        >
          <div className="pl-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-red-500/[0.08] border border-red-500/10 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-[18px] h-[18px] text-red-400" />
              </div>
              <p className="text-[14px] font-semibold text-white/80">Não é indicado para:</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 pl-1">
              {notFor.map((text, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400/50 flex-shrink-0" />
                  <p className="text-[12px] text-white/40 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default HowItWorksSection;
