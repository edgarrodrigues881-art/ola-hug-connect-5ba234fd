import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center bg-background">
      {/* Subtle grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(220 10% 20% / 0.3) 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />

      <div className="container relative z-10 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-3 mb-12"
          >
            <img src={logo} alt="DG Contingência" className="w-12 h-12 rounded-xl" />
            <span className="text-xl font-semibold text-foreground tracking-tight">
              DG Contingência
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-foreground leading-[1.1] mb-6 tracking-tight"
          >
            Escale seus disparos no WhatsApp{" "}
            <span className="text-primary">com proteção real</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Automatize envios, rotacione mensagens e reduza riscos enquanto mantém controle total da operação.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="h-14 px-12 text-base font-semibold rounded-lg gap-2 bg-primary hover:bg-[hsl(142,71%,38%)] transition-colors border-0 shadow-none"
            >
              Entrar na plataforma
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="h-14 px-12 text-base font-semibold rounded-lg border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Ver funcionamento
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
