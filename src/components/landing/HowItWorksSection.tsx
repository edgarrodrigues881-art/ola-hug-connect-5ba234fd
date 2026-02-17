import { motion } from "framer-motion";
import { QrCode, Settings, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: QrCode,
    number: "01",
    title: "Vincule seu número com autenticação QR",
    description: "Escaneie o código com seu WhatsApp e vincule seu número à plataforma de forma segura e instantânea.",
  },
  {
    icon: Settings,
    number: "02",
    title: "Configure campanhas, delays e variações",
    description: "Defina as mensagens, intervalos de envio, rotações automáticas e selecione sua lista de contatos.",
  },
  {
    icon: BarChart3,
    number: "03",
    title: "Monitore entregas e performance em tempo real",
    description: "Acompanhe o progresso de cada campanha com métricas detalhadas de envio, entrega e leitura.",
  },
];

const HowItWorksSection = () => (
  <section id="como-funciona" className="py-24 bg-secondary/50 border-t border-border">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <span className="inline-block text-xs font-semibold text-primary tracking-widest uppercase mb-3">
          Como Funciona
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
          Três passos para operar com controle
        </h2>
      </motion.div>

      <div className="max-w-2xl mx-auto">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.12 }}
            className="relative flex gap-5 pb-12 last:pb-0"
          >
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="absolute left-5 top-14 w-px h-[calc(100%-2.5rem)] bg-border" />
            )}

            {/* Step icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center relative z-10">
              <step.icon className="w-5 h-5 text-primary" />
            </div>

            {/* Content */}
            <div className="pt-0.5">
              <span className="text-xs font-bold text-primary tracking-widest uppercase">
                Passo {step.number}
              </span>
              <h3 className="text-lg font-bold text-foreground mt-1 mb-1.5">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
