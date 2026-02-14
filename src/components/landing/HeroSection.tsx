import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Users, Zap, BarChart3 } from "lucide-react";
import logo from "@/assets/logo.png";

const stats = [
  { value: "+3.000", label: "números conectados" },
  { label: "Proteção anti-bloqueio", icon: Shield },
  { label: "Controle avançado de disparo", icon: Zap },
  { label: "Monitoramento em tempo real", icon: BarChart3 },
];

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="hero-gradient relative overflow-hidden min-h-screen flex items-center">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="glow-dot absolute w-[600px] h-[600px] -top-40 -right-40 animate-pulse-glow" />
        <div className="glow-dot absolute w-[400px] h-[400px] bottom-20 -left-20 animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(0 0% 100% / 0.03) 1px, transparent 0)`,
          backgroundSize: '48px 48px',
        }} />
      </div>

      <div className="container relative z-10 py-20 lg:py-28">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-4 mb-10"
          >
            <img src={logo} alt="DG Contingência Pro" className="w-16 h-16 rounded-2xl shadow-lg" />
            <span className="text-2xl font-bold text-white tracking-tight">
              DG Contingência <span className="text-gradient">Pro</span>
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6"
          >
            Dispare mensagens no WhatsApp com{" "}
            <span className="text-gradient">segurança, escala</span> e controle total
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Conecte seu número via QR Code, configure delays inteligentes e gerencie
            seus disparos em uma única plataforma profissional.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
          >
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="h-14 px-8 text-base font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              Acessar Plataforma
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth?mode=signup")}
              className="h-14 px-8 text-base font-semibold rounded-xl border-white/15 text-white bg-white/5 hover:bg-white/10 hover:text-white transition-all"
            >
              Criar Conta
            </Button>
          </motion.div>

          {/* Authority Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4"
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-2 text-white/50 text-sm">
                {stat.icon ? (
                  <stat.icon className="w-4 h-4 text-primary" />
                ) : (
                  <Users className="w-4 h-4 text-primary" />
                )}
                <span>
                  {stat.value && <strong className="text-white mr-1">{stat.value}</strong>}
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
