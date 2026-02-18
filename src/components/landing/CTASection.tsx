import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 border-t border-border">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Estruture sua operação com estabilidade e controle.
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Gerencie disparos profissionais em uma plataforma construída para escala e proteção.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="h-14 px-14 text-base font-semibold rounded-lg gap-2 bg-primary hover:bg-[hsl(142,71%,38%)] transition-all duration-200 hover:scale-[1.03] border-0 shadow-none"
          >
            Acessar plataforma
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
