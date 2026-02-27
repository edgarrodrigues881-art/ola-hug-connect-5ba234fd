import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";

const plans = [
  { name: "Start", instances: "10 instâncias", highlight: false },
  { name: "Pro", instances: "30 instâncias", highlight: true },
  { name: "Scale", instances: "50 instâncias", highlight: false },
  { name: "Elite", instances: "100 instâncias", highlight: false },
];

const commonFeatures = [
  "Painel centralizado",
  "Configuração de campanhas",
  "Monitoramento em tempo real",
  "Suporte técnico",
];

const PlansSection = () => {
  const navigate = useNavigate();

  return (
    <section id="planos" className="py-24 bg-transparent">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold text-[#07C160] tracking-widest uppercase mb-3">
            Planos
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Escolha o plano ideal para sua operação
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto"
        >
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`rounded-xl p-6 border transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 ${
                plan.highlight
                  ? "bg-[#07C160]/[0.05] border-[#07C160]/30 ring-1 ring-[#07C160]/20"
                  : "bg-white/[0.02] backdrop-blur-sm border-white/5"
              }`}
            >
              {plan.highlight && (
                <span className="inline-block text-[10px] font-bold text-[#07C160] tracking-widest uppercase mb-3 bg-[#07C160]/10 px-2 py-0.5 rounded">
                  Recomendado
                </span>
              )}
              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-sm text-[#07C160] font-semibold mb-5">{plan.instances}</p>

              <ul className="space-y-2.5 mb-6">
                {commonFeatures.map((feat, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-white/50">
                    <Check className="w-4 h-4 text-[#07C160] flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate("/planos")}
                className={`w-full transition-all duration-200 ${
                  plan.highlight
                    ? ""
                    : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                }`}
                variant={plan.highlight ? "default" : "secondary"}
              >
                Contratar Plano
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default PlansSection;
