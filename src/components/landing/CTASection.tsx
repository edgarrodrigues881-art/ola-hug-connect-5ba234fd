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
    <section id="planos" className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block text-xs font-semibold text-primary tracking-widest uppercase mb-3">
            Planos
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
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
                  ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                  : "bg-gray-900 border-gray-800"
              }`}
            >
              {plan.highlight && (
                <span className="inline-block text-[10px] font-bold text-primary tracking-widest uppercase mb-3 bg-primary/10 px-2 py-0.5 rounded">
                  Recomendado
                </span>
              )}
              <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-sm text-primary font-semibold mb-5">{plan.instances}</p>

              <ul className="space-y-2.5 mb-6">
                {commonFeatures.map((feat, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate("/planos")}
                className={`w-full transition-all duration-200 ${
                  plan.highlight
                    ? "bg-primary hover:bg-[hsl(142,71%,38%)] border-0 shadow-none"
                    : "bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white"
                }`}
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
