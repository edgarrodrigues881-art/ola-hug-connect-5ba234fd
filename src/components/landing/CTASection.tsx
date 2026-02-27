import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";

const plans = [
{ name: "Start", instances: "10 instâncias", subtitle: "Para quem está começando", highlight: false },
{ name: "Pro", instances: "30 instâncias", subtitle: "Mais popular entre operadores", highlight: true },
{ name: "Scale", instances: "50 instâncias", subtitle: "Para operações em crescimento", highlight: false },
{ name: "Elite", instances: "100 instâncias", subtitle: "Máxima capacidade e controle", highlight: false }];


const commonFeatures = [
"Painel centralizado",
"Configuração de campanhas",
"Monitoramento em tempo real",
"Suporte técnico"];


const PlansSection = () => {
  const navigate = useNavigate();

  return (
    <section id="planos" className="py-24 bg-transparent">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-16">

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
          {plans.map((plan, i) => {}































































































          )}
        </div>
      </div>
    </section>);

};

export default PlansSection;