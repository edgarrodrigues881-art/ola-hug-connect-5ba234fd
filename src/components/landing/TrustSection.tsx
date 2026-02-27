import { motion } from "framer-motion";
import { Shield, Bot, MonitorSmartphone, Eye } from "lucide-react";

const items = [
  { icon: Shield, text: "Você mantém controle total do seu número" },
  { icon: Bot, text: "Sistema baseado em automação inteligente" },
  { icon: MonitorSmartphone, text: "Interface simples e intuitiva" },
  { icon: Eye, text: "Monitoramento em tempo real" },
];

const TrustSection = () => (
  <section id="confianca" className="relative py-24 lg:py-32">
    <div className="container max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <span className="text-[#07C160] text-sm font-semibold tracking-widest uppercase mb-3 block">Confiança</span>
        <h2 className="text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Tecnologia pensada para uso responsável
        </h2>
      </motion.div>

      <div className="space-y-4">
        {items.map((item, i) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-[#07C160]/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-[#07C160]/10 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-5 h-5 text-[#07C160]" />
            </div>
            <p className="text-white/70 text-sm lg:text-base">{item.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustSection;
