import { motion } from "framer-motion";
import { Timer, RefreshCw, QrCode, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Timer,
    title: "Simulação avançada de envio humano",
    description: "Configure intervalos personalizados entre mensagens para replicar padrões de envio humano e proteger seus números.",
  },
  {
    icon: RefreshCw,
    title: "Rotação inteligente para máxima entregabilidade",
    description: "Alterne variações de mensagens automaticamente, reduzindo padrões detectáveis e aumentando a taxa de entrega.",
  },
  {
    icon: QrCode,
    title: "Vinculação segura via QR Code",
    description: "Conecte seus números em segundos com autenticação via QR Code. Processo simples, rápido e seguro.",
  },
  {
    icon: BarChart3,
    title: "Painel analítico com métricas em tempo real",
    description: "Acompanhe mensagens enviadas, entregues e lidas com dados atualizados em tempo real no dashboard.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const FeaturesSection = () => (
  <section id="diferenciais" className="py-24 bg-background">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <span className="inline-block text-xs font-semibold text-primary tracking-widest uppercase mb-3">
          Diferenciais
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
          Infraestrutura para operações profissionais
        </h2>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-5"
      >
        {features.map((feature, i) => (
          <motion.div
            key={i}
            variants={item}
            className="bg-secondary rounded-xl p-7 border border-border hover:border-primary/20 transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
              <feature.icon className="w-5 h-5 text-primary" />
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
