import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Realistic chat data - varied, natural
const chats = [
  { name: "Lucas Mendes", msg: "Beleza, te mando amanhã cedo", time: "10:42", unread: 0, avatar: "LM", color: "#3B82F6" },
  { name: "Ana Clara", msg: "Obrigada pelo retorno! 😊", time: "10:38", unread: 2, avatar: "AC", color: "#EC4899" },
  { name: "Grupo Marketing", msg: "Pedro: alguém tem o relatório?", time: "10:35", unread: 5, avatar: "GM", color: "#8B5CF6" },
  { name: "Carlos Eduardo", msg: "Vou verificar e te aviso", time: "10:21", unread: 0, avatar: "CE", color: "#F59E0B" },
  { name: "Juliana Costa", msg: "Foto", time: "10:15", unread: 1, avatar: "JC", color: "#10B981" },
  { name: "Roberto Silva", msg: "Pode ser na quinta então", time: "09:58", unread: 0, avatar: "RS", color: "#6366F1" },
  { name: "Fernanda Lima", msg: "Áudio (0:23)", time: "09:44", unread: 0, avatar: "FL", color: "#F43F5E" },
  { name: "Grupo Vendas", msg: "Marina: fechamos 3 contratos hoje", time: "09:30", unread: 12, avatar: "GV", color: "#14B8A6" },
  { name: "Diego Alves", msg: "Show, valeu pela indicação!", time: "09:12", unread: 0, avatar: "DA", color: "#A855F7" },
  { name: "Patrícia Rocha", msg: "Segue o documento atualizado", time: "08:55", unread: 0, avatar: "PR", color: "#0EA5E9" },
  { name: "Marcos Oliveira", msg: "Bom dia! Tudo certo por aí?", time: "08:30", unread: 3, avatar: "MO", color: "#EF4444" },
];

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Subtle ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-px h-px rounded-full bg-white/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 0.3, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="container relative z-10 py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left — Copy */}
          <div className="max-w-lg">

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-[2.5rem] sm:text-5xl lg:text-[3.25rem] font-semibold text-white leading-[1.12] mb-6 tracking-[-0.02em]"
            >
              Automação inteligente para preparar seu WhatsApp com{" "}
              <span className="text-[#07C160]">segurança.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-[15px] lg:text-base text-white/40 leading-relaxed mb-10 max-w-md"
            >
              Conecte o QR Code e acompanhe em tempo real o processo de aquecimento do seu número.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start gap-3"
            >
              <Button
                onClick={() => navigate("/auth")}
                className="h-12 px-8 text-sm font-medium rounded-xl bg-[#07C160] hover:bg-[#06a852] text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(7,193,96,0.2)]"
              >
                Conectar WhatsApp
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}
                className="h-12 px-8 text-sm font-medium rounded-xl text-white/50 hover:text-white hover:bg-white/[0.04] border border-white/[0.06] transition-all duration-300"
              >
                Ver como funciona
              </Button>
            </motion.div>
          </div>

          {/* Right — Phone + Progress Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative flex items-center justify-center"
          >
            {/* Ambient glow behind phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 lg:w-[420px] lg:h-[420px]">
              <motion.div
                className="w-full h-full rounded-full bg-[#07C160]/[0.04] blur-[100px]"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Phone with 3D perspective */}
            <div
              className="relative"
              style={{
                perspective: "1200px",
              }}
            >
              <div
                className="relative w-[220px] lg:w-[240px]"
                style={{
                  transform: "rotateY(-8deg) rotateX(2deg)",
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Phone body */}
                <div className="relative bg-[#1C1C1E] rounded-[2.2rem] border border-white/[0.08] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
                  {/* Glass reflection */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none z-20 rounded-[2.2rem]" />
                  
                  {/* Dynamic Island */}
                  <div className="flex justify-center pt-2 pb-1 relative z-10">
                    <div className="w-[70px] h-[22px] bg-black rounded-full" />
                  </div>

                  {/* Screen content */}
                  <div className="mx-[4px] mb-[4px] rounded-b-[1.9rem] overflow-hidden bg-[#0B0F14]">
                    {/* WhatsApp header */}
                    <div className="px-3 py-2 flex items-center justify-between">
                      <h3 className="text-[11px] font-bold text-white">Conversas</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-white/20" />
                        <div className="w-3 h-0.5 bg-white/20 rounded" />
                      </div>
                    </div>

                    {/* Search bar */}
                    <div className="mx-2 mb-1">
                      <div className="h-5 bg-white/[0.05] rounded-md flex items-center px-2">
                        <span className="text-[8px] text-white/20">Pesquisar</span>
                      </div>
                    </div>

                    {/* Chat list */}
                    <div className="divide-y divide-white/[0.03]">
                      {chats.slice(0, 8).map((chat, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                          {/* Avatar */}
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[7px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: chat.color + "30", color: chat.color }}
                          >
                            {chat.avatar}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-[8px] ${chat.unread > 0 ? "font-semibold text-white" : "font-medium text-white/80"} truncate`}>
                                {chat.name}
                              </span>
                              <span className={`text-[7px] flex-shrink-0 ml-1 ${chat.unread > 0 ? "text-[#07C160]" : "text-white/20"}`}>
                                {chat.time}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[7px] text-white/30 truncate pr-1">
                                {chat.msg}
                              </span>
                              {chat.unread > 0 && (
                                <span className="flex-shrink-0 w-3 h-3 rounded-full bg-[#07C160] text-[6px] font-bold text-white flex items-center justify-center">
                                  {chat.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom nav */}
                    <div className="flex items-center justify-around py-2 border-t border-white/[0.04] mt-1">
                      {["Conversas", "Status", "Ligações"].map((tab, i) => (
                        <span
                          key={tab}
                          className={`text-[7px] ${i === 0 ? "text-[#07C160] font-semibold" : "text-white/20"}`}
                        >
                          {tab}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Phone shadow */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[70%] h-6 bg-black/40 blur-2xl rounded-full" />
              </div>
            </div>

            {/* Progress card — positioned to the right */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="absolute -right-4 lg:right-[-60px] top-1/2 -translate-y-1/2 w-[220px] lg:w-[240px]"
            >
              <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
                style={{
                  boxShadow: "0 20px 60px -15px rgba(0,0,0,0.5), 0 0 40px -20px rgba(7,193,96,0.1)",
                }}
              >
                <p className="text-[10px] text-white/30 font-medium tracking-wider uppercase mb-4">
                  Aquecimento em execução
                </p>

                {/* Progress bar */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "89%" }}
                      transition={{ duration: 2.5, delay: 1.5, ease: "easeOut" }}
                      className="h-full bg-[#07C160] rounded-full"
                    />
                  </div>
                  <span className="text-sm font-semibold text-white tabular-nums">89%</span>
                </div>

                {/* Meta info */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#07C160]" />
                    <span className="text-[11px] text-white/50">Status: <span className="text-white/80">Ativo</span></span>
                  </div>
                  <p className="text-[11px] text-white/30 leading-relaxed">
                    Simulação comportamental inteligente
                  </p>
                  <p className="text-[11px] text-white/30 leading-relaxed">
                    Conexão segura via QR Code
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
