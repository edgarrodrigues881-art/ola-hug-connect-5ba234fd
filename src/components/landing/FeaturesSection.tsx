import { motion } from "framer-motion";
import { Layers, Megaphone, SlidersHorizontal, Activity, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Gestão centralizada de instâncias",
    description: "Visualize, organize e controle todas as suas instâncias WhatsApp em um único painel. Sem dispersão, sem perda de controle.",
  },
  {
    icon: Megaphone,
    title: "Organização de campanhas",
    description: "Estruture suas campanhas com clareza: defina listas, mensagens e cronogramas de forma organizada para execuções previsíveis.",
  },
  {
    icon: SlidersHorizontal,
    title: "Configuração personalizada de envio",
    description: "Ajuste intervalos, variações de mensagens e parâmetros de envio de acordo com a sua estratégia operacional.",
  },
  {
    icon: Activity,
    title: "Monitoramento operacional",
    description: "Acompanhe o status de cada instância, campanha e envio em tempo real. Identifique gargalos antes que se tornem problemas.",
  },
  {
    icon: TrendingUp,
    title: "Estrutura escalável",
    description: "De 10 a 100 instâncias, a plataforma acompanha o crescimento da sua operação sem perder performance ou organização.",
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
  <section id="recursos" className="py-24 bg-transparent">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <span className="inline-block text-xs font-semibold text-primary tracking-widest uppercase mb-3">
          Recursos
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
          Ferramentas para uma operação estruturada
        </h2>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {features.map((feature, i) => (
          <motion.div
            key={i}
            variants={item}
            className="bg-card/50 backdrop-blur-sm rounded-xl p-7 border border-border hover:border-primary/20 transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
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
