import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";

const plans = [
  { name: "Start", instances: "10 instâncias", subtitle: "Para quem está começando", highlight: false },
  { name: "Pro", instances: "30 instâncias", subtitle: "Mais popular entre operadores", highlight: true },
  { name: "Scale", instances: "50 instâncias", subtitle: "Para operações em crescimento", highlight: false },
  { name: "Elite", instances: "100 instâncias", subtitle: "Máxima capacidade e controle", highlight: false },
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
          <p className="text-sm text-white/30 mt-3 max-w-md mx-auto">
            Clique em "Contratar Plano" para ver preços e detalhes completos.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className={`group relative rounded-2xl p-6 overflow-hidden cursor-default ${
                plan.highlight
                  ? "border border-[#07C160]/30"
                  : "border border-white/[0.06]"
              }`}
              style={{
                background: plan.highlight
                  ? "linear-gradient(160deg, rgba(7,193,96,0.08), rgba(10,15,25,0.95))"
                  : "linear-gradient(160deg, rgba(17,24,39,0.95), rgba(10,15,25,0.9))",
              }}
            >
              {/* Gradient glow top */}
              <div
                className={`absolute top-0 left-0 right-0 h-24 pointer-events-none transition-opacity duration-700 ${
                  plan.highlight ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                }`}
                style={{ background: "radial-gradient(ellipse at top, rgba(7,193,96,0.08) 0%, transparent 70%)" }}
              />

              <div className="relative">
                {plan.highlight && (
                  <span className="inline-block text-[10px] font-bold text-[#07C160] tracking-widest uppercase mb-3 bg-[#07C160]/10 px-2.5 py-1 rounded-md border border-[#07C160]/20">
                    Recomendado
                  </span>
                )}

                <h3 className="text-xl font-bold text-white mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {plan.name}
                </h3>
                <p className="text-sm text-[#07C160] font-semibold mb-1">{plan.instances}</p>
                <p className="text-[11px] text-white/25 mb-5">{plan.subtitle}</p>

                <ul className="space-y-2.5 mb-6">
                  {commonFeatures.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-[13px] text-white/45">
                      <Check className="w-4 h-4 text-[#07C160]/70 flex-shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => navigate("/planos")}
                  className={`w-full transition-all duration-300 ${
                    plan.highlight
                      ? "bg-[#07C160] hover:bg-[#06a050] text-white shadow-lg shadow-[#07C160]/20"
                      : "bg-white/[0.06] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.08]"
                  }`}
                  variant={plan.highlight ? "default" : "ghost"}
                >
                  Contratar Plano
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlansSection;
