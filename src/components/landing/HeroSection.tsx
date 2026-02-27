import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Wifi, ShieldCheck, BarChart3, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const floatingItems = [
  { label: "+ Interações", icon: Zap, x: -40, y: -20 },
  { label: "Simulação natural", icon: Wifi, x: 40, y: 30 },
  { label: "Conexão segura", icon: ShieldCheck, x: -50, y: 60 },
  { label: "Monitoramento", icon: BarChart3, x: 50, y: -40 },
];

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      <div className="container relative z-10 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Copy */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold text-white leading-[1.1] mb-6 tracking-tight"
            >
              Aqueça seu WhatsApp{" "}
              <span className="text-[#07C160]">automaticamente</span>
              <br />
              <span className="text-white/70 text-3xl sm:text-4xl lg:text-[2.5rem] font-bold">
                Conecte o QR Code e deixe o sistema trabalhar
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-base lg:text-lg text-white/50 max-w-xl mb-10 leading-relaxed"
            >
              Automação inteligente que simula interações naturais para preparar seu número para uso intenso, com acompanhamento em tempo real.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="flex flex-col sm:flex-row items-start gap-4"
            >
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="h-14 px-10 text-base font-semibold rounded-xl gap-2 bg-[#07C160] hover:bg-[#06a050] text-white shadow-[0_0_30px_rgba(7,193,96,0.3)] hover:shadow-[0_0_40px_rgba(7,193,96,0.4)] transition-all"
              >
                Conectar WhatsApp
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}
                className="h-14 px-10 text-base font-semibold rounded-xl border-white/10 text-white/70 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all"
              >
                Como funciona
              </Button>
            </motion.div>
          </div>

          {/* Right - Phone Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex items-center justify-center"
          >
            {/* Glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-72 h-72 lg:w-96 lg:h-96 rounded-full bg-[#07C160]/10 blur-[80px]" />
            </div>

            {/* Phone */}
            <div className="relative w-[280px] lg:w-[300px] bg-[#1A1A1A] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
              {/* Notch */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-24 h-5 bg-[#0D0D0D] rounded-full" />
              </div>

              {/* Progress bar */}
              <div className="mx-4 mb-3 p-3 bg-[#07C160]/10 border border-[#07C160]/20 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold text-[#07C160]">Aquecimento em andamento</span>
                  <span className="text-[10px] font-bold text-white">89%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "89%" }}
                    transition={{ duration: 2, delay: 1 }}
                    className="h-full bg-[#07C160] rounded-full"
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[9px] text-white/40">Status: <span className="text-[#07C160]">Ativo</span></span>
                  <span className="text-[9px] text-white/40">Risco: <span className="text-[#07C160]">Baixo</span></span>
                </div>
              </div>

              {/* WhatsApp header */}
              <div className="mx-4 mb-2 flex items-center gap-2 p-2 bg-[#075E54]/30 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-[#075E54] flex items-center justify-center text-white text-xs font-bold">W</div>
                <div>
                  <p className="text-[11px] font-semibold text-white">WhatsApp</p>
                  <p className="text-[9px] text-white/40">Simulação ativa</p>
                </div>
              </div>

              {/* Chat messages */}
              <div className="mx-4 mb-4 space-y-2">
                {[
                  { text: "Oi, tudo bem? 😊", sent: false },
                  { text: "Tudo sim! E com você?", sent: true },
                  { text: "Ótimo! Vamos conversar mais tarde?", sent: false },
                  { text: "Claro, sem problemas! 👍", sent: true },
                ].map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 + i * 0.4 }}
                    className={`flex ${msg.sent ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[75%] px-3 py-1.5 rounded-xl text-[10px] ${
                      msg.sent
                        ? "bg-[#07C160]/20 text-white/90 rounded-br-sm"
                        : "bg-white/5 text-white/70 rounded-bl-sm"
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Bottom bar */}
              <div className="mx-4 mb-4 h-8 bg-white/5 rounded-full flex items-center px-3">
                <span className="text-[9px] text-white/20">Mensagem...</span>
              </div>
            </div>

            {/* Floating badges */}
            {floatingItems.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5 + i * 0.2 }}
                className="absolute hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A]/80 backdrop-blur-sm border border-white/10 rounded-full"
                style={{
                  top: `${30 + item.y}%`,
                  left: item.x > 0 ? `${75 + item.x / 5}%` : undefined,
                  right: item.x < 0 ? `${75 + Math.abs(item.x) / 5}%` : undefined,
                }}
              >
                <item.icon className="w-3 h-3 text-[#07C160]" />
                <span className="text-[10px] text-white/70 whitespace-nowrap">{item.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
