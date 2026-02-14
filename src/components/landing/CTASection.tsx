import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-background">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center glass-card rounded-3xl p-12 relative overflow-hidden"
        >
          <div className="glow-dot absolute w-[300px] h-[300px] -top-20 -right-20 opacity-30" />
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 relative z-10">
            Pronto para escalar seus disparos?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 relative z-10">
            Junte-se a milhares de profissionais que já automatizam suas mensagens com segurança.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth?mode=signup")}
            className="h-14 px-10 text-base font-semibold rounded-xl gap-2 shadow-lg shadow-primary/20 relative z-10"
          >
            Começar agora
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
