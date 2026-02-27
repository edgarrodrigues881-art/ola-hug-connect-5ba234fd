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
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 + i * 0.15, ease: "easeOut" }}
            whileHover={{ y: -4, scale: 1.03, transition: { duration: 0.25 } }}
            className="group relative rounded-2xl p-6 overflow-hidden cursor-default"
            style={{
              background: "linear-gradient(145deg, rgba(17,24,39,0.95), rgba(10,15,25,0.9))",
              boxShadow: "0 16px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(7,193,96,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Top accent — animated shimmer */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{ background: "linear-gradient(90deg, transparent, #07C160, transparent)", backgroundSize: "200% 100%" }}
              animate={{ backgroundPosition: ["100% 0%", "-100% 0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: i * 0.5 }}
            />
            
            {/* Icon */}
            <motion.div
              className="w-11 h-11 rounded-xl bg-[#07C160]/[0.08] border border-[#07C160]/10 flex items-center justify-center mb-4 group-hover:bg-[#07C160]/[0.15] transition-colors"
              whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.4 } }}
            >
              <item.icon className="w-5 h-5 text-[#07C160]" />
            </motion.div>

            <h3 className="text-[15px] font-semibold text-white mb-2">{item.title}</h3>
            <p className="text-[13px] text-white/35 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Warning — redesigned */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div
          className="relative rounded-2xl p-5 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(17,24,39,0.95), rgba(239,68,68,0.03))",
            boxShadow: "0 16px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,68,68,0.15), inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
        >
          {/* Animated shimmer top */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)", backgroundSize: "200% 100%" }}
            animate={{ backgroundPosition: ["100% 0%", "-100% 0%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Left red accent bar */}
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b from-red-500/50 via-red-400/30 to-transparent" />
          
          <div className="flex items-center gap-4 pl-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/[0.08] border border-red-500/10 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white/80 mb-0.5">Não é indicado</p>
              <p className="text-[12px] text-white/35 leading-relaxed">
                Para quem busca soluções milagrosas ou promessas de bloqueio zero.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default HowItWorksSection;
