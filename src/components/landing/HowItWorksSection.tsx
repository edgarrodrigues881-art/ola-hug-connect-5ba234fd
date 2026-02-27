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

      {/* Grid cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-8">
        {forWhom.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6, delay: 0.08 + i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            whileHover={{ y: -4, scale: 1.03, transition: { duration: 0.25 } }}
            className="group relative rounded-2xl p-6 overflow-hidden cursor-default border border-[#07C160]/25"
            style={{
              background: "linear-gradient(145deg, rgba(17,24,39,0.95), rgba(10,15,25,0.9))",
              boxShadow: "0 16px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(7,193,96,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Shimmer top — moves across */}
            <motion.div
              className="absolute top-0 left-0 h-[2px] w-[60px] rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, rgba(7,193,96,0.6), transparent)" }}
              animate={{ left: ["0%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            {/* Shimmer bottom — moves across reversed */}
            <motion.div
              className="absolute bottom-0 right-0 h-[2px] w-[60px] rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, rgba(7,193,96,0.6), transparent)" }}
              animate={{ right: ["0%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            {/* Left bar — moves up and down */}
            <motion.div
              className="absolute left-0 w-[3px] h-8 rounded-full"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(7,193,96,0.5), transparent)" }}
              animate={{ top: ["10%", "70%", "10%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
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

      {/* Warning — checklist style */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="max-w-4xl mx-auto"
      >
        <div
          className="relative rounded-2xl p-6 overflow-hidden border border-red-500/25"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.05), rgba(17,24,39,0.95), rgba(239,68,68,0.03))",
          }}
        >
          {/* Animated red border glow */}
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: "0 16px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
            animate={{
              boxShadow: [
                "0 16px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,68,68,0.12), 0 0 15px -3px rgba(239,68,68,0.08)",
                "0 16px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,68,68,0.35), 0 0 25px -3px rgba(239,68,68,0.2)",
                "0 16px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,68,68,0.12), 0 0 15px -3px rgba(239,68,68,0.08)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Animated shimmer — travels around border */}
          <motion.div
            className="absolute top-0 left-0 h-[2px] w-[60px] rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.6), transparent)" }}
            animate={{ left: ["0%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute bottom-0 right-0 h-[2px] w-[60px] rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.6), transparent)" }}
            animate={{ right: ["0%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />

          {/* Animated left red accent bar — moves up and down */}
          <motion.div
            className="absolute left-0 w-[3px] h-8 rounded-full"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(239,68,68,0.6), transparent)" }}
            animate={{ top: ["10%", "70%", "10%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="pl-4">
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                className="w-9 h-9 rounded-xl bg-red-500/[0.08] border border-red-500/10 flex items-center justify-center flex-shrink-0"
                initial={{ rotate: 0 }}
                whileInView={{ rotate: [0, -8, 8, -4, 0] }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <XCircle className="w-[18px] h-[18px] text-red-400" />
              </motion.div>
              <p className="text-[14px] font-semibold text-white/80">Não é indicado para:</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 pl-1">
              {[
                "Quem busca soluções milagrosas",
                "Promessas de bloqueio zero",
                "Quem espera aquecimento em 24 horas",
                "Quem não quer investir tempo em configuração",
              ].map((text, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.7 + i * 0.1 }}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400/50 flex-shrink-0" />
                  <p className="text-[12px] text-white/40 leading-relaxed">{text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default HowItWorksSection;
