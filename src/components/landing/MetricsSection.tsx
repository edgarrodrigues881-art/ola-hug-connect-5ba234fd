import { motion } from "framer-motion";
import { Users, Activity, Shield, Signal } from "lucide-react";

const metrics = [
  {
    icon: Users,
    value: "+3.000",
    label: "Números conectados",
  },
  {
    icon: Activity,
    value: "Real-time",
    label: "Monitoramento em tempo real",
  },
  {
    icon: Shield,
    value: "Ativa",
    label: "Proteção anti-bloqueio",
  },
  {
    icon: Signal,
    value: "99.2%",
    label: "Controle de entregabilidade",
  },
];

const MetricsSection = () => (
  <section className="py-20 border-t border-border">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {metrics.map((metric, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="bg-secondary rounded-xl p-6 border border-border hover:border-primary/20 transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5"
          >
            <metric.icon className="w-5 h-5 text-primary mb-4" />
            <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              {metric.value}
            </p>
            <p className="text-sm text-muted-foreground">
              {metric.label}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default MetricsSection;
