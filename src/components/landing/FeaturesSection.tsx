import { motion } from "framer-motion";
import { Timer, RefreshCw, QrCode, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Timer,
    title: "Delay Inteligente Personalizável",
    description: "Configure intervalos entre mensagens para simular envio humano e proteger seu número.",
  },
  {
    icon: RefreshCw,
    title: "Rotação Automática de Mensagens",
    description: "Alterne variações de mensagens automaticamente para máxima entregabilidade.",
  },
  {
    icon: QrCode,
    title: "Conexão Rápida via QR Code",
    description: "Conecte seu número em segundos. Escaneie o QR Code e comece a disparar imediatamente.",
  },
  {
    icon: BarChart3,
    title: "Dashboard com Métricas de Envio",
    description: "Acompanhe em tempo real mensagens enviadas, entregues e lidas em um painel completo.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FeaturesSection = () => (
  <section className="py-24 bg-background relative">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <span className="inline-block text-sm font-semibold text-primary tracking-wider uppercase mb-3">
          Diferenciais
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
          Tudo que você precisa em uma plataforma
        </h2>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {features.map((feature, i) => (
          <motion.div
            key={i}
            variants={item}
            className="glass-card card-glow rounded-2xl p-7 group"
          >
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-5 group-hover:bg-primary/10 transition-colors">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {feature.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default FeaturesSection;
