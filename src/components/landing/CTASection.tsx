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
        

















        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {plans.map((plan, i) => {}































































































          )}
        </div>
      </div>
    </section>);

};

export default PlansSection;