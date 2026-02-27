import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";

const forWhom = [
  "Operadores com múltiplos números",
  "Estruturas de escala",
  "Profissionais que precisam de organização operacional",
];

const HowItWorksSection = () => (
  <section id="para-quem" className="py-24 bg-transparent">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <span className="inline-block text-xs font-semibold text-[#07C160] tracking-widest uppercase mb-3">
          Público
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          Para quem é essa plataforma?
        </h2>
      </motion.div>

      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="space-y-4 mb-10"
        >
          {forWhom.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 border border-white/5"
            >
              <CheckCircle2 className="w-5 h-5 text-[#07C160] flex-shrink-0" />
              <span className="text-white/80 font-medium">{item}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex items-start gap-3 bg-red-500/[0.05] rounded-lg p-5 border border-red-500/20"
        >
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-white/50 leading-relaxed">
            <span className="font-semibold text-white">Não é indicado</span> para quem busca soluções milagrosas ou promessas de bloqueio zero.
          </p>
        </motion.div>
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
