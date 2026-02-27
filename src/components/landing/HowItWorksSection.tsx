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

const HowItWorksSection = () => (
  <section id="para-quem" className="py-24 lg:py-32 bg-transparent">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-center mb-16"
      >
        <span className="inline-block text-xs font-semibold text-[#07C160] tracking-widest uppercase mb-3">
          Público
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          Para quem é essa plataforma?
        </h2>
      </motion.div>

      {/* Grid cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-8">
        {forWhom.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="group relative rounded-2xl p-6 overflow-hidden transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: "linear-gradient(145deg, rgba(17,24,39,0.95), rgba(10,15,25,0.9))",
              boxShadow: "0 16px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(7,193,96,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Top accent */}
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[#07C160]/25 to-transparent" />
            
            {/* Icon */}
            <div className="w-11 h-11 rounded-xl bg-[#07C160]/[0.08] border border-[#07C160]/10 flex items-center justify-center mb-4 group-hover:bg-[#07C160]/[0.12] transition-colors">
              <item.icon className="w-5 h-5 text-[#07C160]" />
            </div>

            <h3 className="text-[15px] font-semibold text-white mb-2">{item.title}</h3>
            <p className="text-[13px] text-white/35 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Warning */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="max-w-4xl mx-auto"
      >
        <div
          className="flex items-start gap-3 rounded-xl p-4 overflow-hidden relative"
          style={{
            background: "linear-gradient(145deg, rgba(239,68,68,0.04), rgba(10,15,25,0.9))",
            boxShadow: "0 0 0 1px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.02)",
          }}
        >
          <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-red-500/15 to-transparent" />
          <XCircle className="w-5 h-5 text-red-400/70 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-white/40 leading-relaxed">
            <span className="font-semibold text-white/70">Não é indicado</span> para quem busca soluções milagrosas ou promessas de bloqueio zero.
          </p>
        </div>
      </motion.div>
    </div>
  </section>
);

export default HowItWorksSection;
