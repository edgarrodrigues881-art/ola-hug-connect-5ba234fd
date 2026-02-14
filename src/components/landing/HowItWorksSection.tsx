import { motion } from "framer-motion";
import { QrCode, Settings, Rocket } from "lucide-react";

const steps = [
  {
    icon: QrCode,
    number: "01",
    title: "Conecte seu número via QR Code",
    description: "Escaneie o código com seu WhatsApp e vincule seu número à plataforma em poucos segundos.",
  },
  {
    icon: Settings,
    number: "02",
    title: "Configure sua campanha",
    description: "Defina as mensagens, delays, rotações e selecione sua lista de contatos para o disparo.",
  },
  {
    icon: Rocket,
    number: "03",
    title: "Dispare com controle e segurança",
    description: "Inicie o envio e acompanhe tudo em tempo real pelo dashboard com métricas detalhadas.",
  },
];

const HowItWorksSection = () => (
  <section className="py-24 relative overflow-hidden">
    {/* Subtle background */}
    <div className="absolute inset-0 hero-gradient opacity-40" />

    <div className="container relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <span className="inline-block text-sm font-semibold text-primary tracking-wider uppercase mb-3">
          Como Funciona
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
          Comece a disparar em 3 passos
        </h2>
      </motion.div>

      <div className="max-w-3xl mx-auto space-y-0">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
            className="relative flex gap-6 pb-12 last:pb-0"
          >
            {/* Timeline connector */}
            {i < steps.length - 1 && (
              <div className="absolute left-7 top-16 w-0.5 h-[calc(100%-3rem)] step-connector" />
            )}

            {/* Step circle */}
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center relative z-10">
              <step.icon className="w-6 h-6 text-primary" />
            </div>

            {/* Content */}
            <div className="pt-1">
              <span className="text-xs font-bold text-primary tracking-widest uppercase">
                Passo {step.number}
              </span>
              <h3 className="text-xl font-bold text-foreground mt-1 mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
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
