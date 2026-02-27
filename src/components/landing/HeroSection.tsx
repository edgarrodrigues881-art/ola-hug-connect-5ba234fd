import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import dgRemaster from "@/assets/dg-remaster.png";

const chats = [
  { name: "DG CONTINGENCIA #01", msg: "Você: aquecimento iniciado ✅", time: "10:45", unread: 999, avatar: "DG", color: "#07C160" },
  { name: "DG CONTINGENCIA #02", msg: "Bot: simulação em andamento", time: "10:43", unread: 999, avatar: "DG", color: "#0AD47C" },
  { name: "Lucas Mendes", msg: "Beleza, te mando amanhã cedo", time: "10:42", unread: 0, avatar: "LM", color: "#3B82F6" },
  { name: "Ana Clara", msg: "Obrigada pelo retorno! 😊", time: "10:38", unread: 2, avatar: "AC", color: "#EC4899" },
  { name: "Grupo Marketing", msg: "Pedro: alguém tem o relatório?", time: "10:35", unread: 5, avatar: "GM", color: "#8B5CF6" },
  { name: "Carlos Eduardo", msg: "Vou verificar e te aviso", time: "10:21", unread: 0, avatar: "CE", color: "#F59E0B" },
  { name: "Juliana Costa", msg: "Foto", time: "10:15", unread: 1, avatar: "JC", color: "#10B981" },
  { name: "Roberto Silva", msg: "Pode ser na quinta então", time: "09:58", unread: 0, avatar: "RS", color: "#6366F1" },
];

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Subtle ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 25 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-px h-px rounded-full bg-white/20"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ opacity: [0, 0.3, 0], scale: [0, 1.5, 0] }}
            transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5, ease: "easeInOut" }}
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

          {/* Right — Phone + Progress Badge */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative flex items-center justify-center"
          >
            {/* Ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 lg:w-80 lg:h-80">
              <motion.div
                className="w-full h-full rounded-full bg-[#07C160]/[0.05] blur-[100px]"
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Phone */}
            <div className="relative" style={{ perspective: "1200px" }}>
              <div
                className="relative w-[260px] lg:w-[280px]"
                style={{ transform: "rotateY(-6deg) rotateX(2deg)", transformStyle: "preserve-3d" }}
              >
                {/* Phone chassis */}
                <div className="relative bg-gradient-to-b from-[#2A2A2E] to-[#1C1C1E] rounded-[2.2rem] p-[2px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)]">
                  {/* Inner bezel */}
                  <div className="relative bg-[#000] rounded-[2.1rem] overflow-hidden">
                    {/* Side highlight (glass edge reflection) */}
                    <div className="absolute top-0 right-0 w-[2px] h-full bg-gradient-to-b from-white/10 via-white/[0.03] to-transparent z-30" />
                    <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-white/[0.05] via-transparent to-transparent z-30" />

                    {/* Dynamic Island — minimal pill */}
                    <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-[60px] h-[12px] bg-[#000] rounded-full z-20" />

                    {/* Screen */}
                    <div className="bg-[#0A0A0A]">
                      {/* Status bar */}
                      <div className="flex items-center justify-between px-5 py-1">
                        <span className="text-[8px] text-white/40 font-medium">9:41</span>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-1.5 border border-white/30 rounded-[2px]">
                            <div className="w-[70%] h-full bg-white/40 rounded-[1px]" />
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp header */}
                      <div className="px-4 pt-1 pb-2">
                        <h3 className="text-[13px] font-bold text-white tracking-tight">Conversas</h3>
                      </div>

                      {/* Search */}
                      <div className="mx-3 mb-2">
                        <div className="h-[26px] bg-white/[0.06] rounded-lg flex items-center px-3 gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full border border-white/15" />
                          <span className="text-[9px] text-white/20">Pesquisar</span>
                        </div>
                      </div>

                      {/* Chat list */}
                      <div>
                        {chats.map((chat, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-3 py-[7px] hover:bg-white/[0.02] border-b border-white/[0.02] last:border-0">
                            {chat.name.startsWith("DG CONTINGENCIA") ? (
                              <img src={dgRemaster} alt="DG" className="w-[32px] h-[32px] rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <div
                                className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                                style={{ backgroundColor: chat.color + "20", color: chat.color }}
                              >
                                {chat.avatar}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-[2px]">
                                <span className={`text-[10px] truncate ${chat.unread > 0 ? "font-semibold text-white" : "text-white/70"}`}>
                                  {chat.name}
                                </span>
                                <span className={`text-[8px] flex-shrink-0 ml-1 ${chat.unread > 0 ? "text-[#07C160]" : "text-white/20"}`}>
                                  {chat.time}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] text-white/25 truncate pr-2">{chat.msg}</span>
                                {chat.unread > 0 && (
                                  <span className="flex-shrink-0 min-w-[14px] h-[14px] rounded-full bg-[#07C160] text-[6px] font-bold text-white flex items-center justify-center px-1">
                                    {chat.unread >= 999 ? "999+" : chat.unread}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bottom nav */}
                      <div className="flex items-center justify-around py-[10px] border-t border-white/[0.04]">
                        {["Conversas", "Atualizações", "Ligações"].map((tab, i) => (
                          <div key={tab} className="flex flex-col items-center gap-0.5">
                            <div className={`w-5 h-[3px] rounded-full ${i === 0 ? "bg-[#07C160]" : "bg-transparent"}`} />
                            <span className={`text-[8px] ${i === 0 ? "text-[#07C160] font-semibold" : "text-white/20"}`}>{tab}</span>
                          </div>
                        ))}
                      </div>

                      {/* Home indicator */}
                      <div className="flex justify-center pb-2 pt-1">
                        <div className="w-[100px] h-[4px] bg-white/10 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shadow beneath phone */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[65%] h-8 bg-[#07C160]/[0.06] blur-3xl rounded-full" />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[75%] h-6 bg-black/50 blur-2xl rounded-full" />
              </div>
            </div>

            {/* Progress badge — compact, matching the screenshot style */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="absolute -right-2 lg:right-[-40px] top-[15%] w-[200px]"
            >
              <div
                className="bg-[#111827]/95 backdrop-blur-sm border border-white/[0.08] rounded-2xl px-4 py-3.5"
                style={{ boxShadow: "0 16px 48px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(7,193,96,0.05)" }}
              >
                <p className="text-[9px] text-white/30 font-semibold tracking-[0.15em] uppercase mb-3">
                  Aquecimento em execução
                </p>

                <div className="flex items-center gap-2.5 mb-3">
                  <div className="relative flex-1 h-[6px] bg-white/[0.06] rounded-full overflow-visible">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "89%" }}
                      transition={{ duration: 2, delay: 1.8, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-[#07C160] to-[#0AD47C] relative"
                    >
                      {/* Fire icon at the end of the bar */}
                      <motion.svg
                        className="absolute -right-[8px] -top-[7px] w-[20px] h-[20px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        animate={{ y: [0, -1.5, 0], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <path d="M12 2C12 2 7 8 7 12C7 15 9 17 12 17C15 17 17 15 17 12C17 8 12 2 12 2Z" fill="url(#barFireOuter)" />
                        <path d="M12 8C12 8 10 11 10 13C10 14.5 11 15.5 12 15.5C13 15.5 14 14.5 14 13C14 11 12 8 12 8Z" fill="url(#barFireInner)" />
                        <defs>
                          <linearGradient id="barFireOuter" x1="12" y1="2" x2="12" y2="17" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#FF6B35" /><stop offset="100%" stopColor="#FF9500" />
                          </linearGradient>
                          <linearGradient id="barFireInner" x1="12" y1="8" x2="12" y2="15.5" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#FFD93D" /><stop offset="100%" stopColor="#FF8C00" />
                          </linearGradient>
                        </defs>
                      </motion.svg>
                    </motion.div>
                  </div>
                  <span className="text-[13px] font-bold text-white tabular-nums">89%</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="w-[5px] h-[5px] rounded-full bg-[#07C160] animate-pulse" />
                  <span className="text-[10px] text-white/40">Status: <span className="text-white/70 font-medium">Ativo</span></span>
                </div>
              </div>
            </motion.div>

            {/* Badge — Conexão Segura (left side) */}
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.5 }}
              className="absolute left-[-30px] lg:left-[-50px] top-[60%] hidden lg:block"
            >
              <div className="bg-[#111827]/90 backdrop-blur-sm border border-white/[0.08] rounded-xl px-3.5 py-2.5 flex items-center gap-2"
                style={{ boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)" }}
              >
                <div className="w-6 h-6 rounded-lg bg-[#07C160]/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-[#07C160]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-[10px] text-white/60 font-medium whitespace-nowrap">Conexão segura</span>
              </div>
            </motion.div>

            {/* Badge — Chip Aquecendo with fire (left top) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 1.8 }}
              className="absolute left-[5%] lg:left-[-30px] top-[20%] hidden lg:block"
            >
              <div className="bg-[#111827]/90 backdrop-blur-sm border border-white/[0.08] rounded-xl p-3 flex items-center gap-2.5"
                style={{ boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5), 0 0 20px -8px rgba(255,120,30,0.08)" }}
              >
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-orange-500/10 blur-md"
                    animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <svg className="w-5 h-5 text-white/70 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <rect x="6" y="6" width="12" height="12" rx="1.5" />
                    <path d="M9 6V3M15 6V3M9 21v-3M15 21v-3M6 9H3M6 15H3M21 9h-3M21 15h-3" />
                    <rect x="9" y="9" width="6" height="6" rx="0.5" className="fill-white/10" />
                  </svg>
                  <motion.svg
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 z-20"
                    viewBox="0 0 24 24"
                    fill="none"
                    animate={{ y: [0, -1, 0], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <path d="M12 2C12 2 8 7 8 11C8 13.5 9.5 15.5 12 16C14.5 15.5 16 13.5 16 11C16 7 12 2 12 2Z" fill="url(#fireGrad)" opacity="0.9" />
                    <path d="M12 8C12 8 10 10.5 10 12.5C10 13.9 11 14.8 12 15C13 14.8 14 13.9 14 12.5C14 10.5 12 8 12 8Z" fill="url(#fireInner)" opacity="0.95" />
                    <defs>
                      <linearGradient id="fireGrad" x1="12" y1="2" x2="12" y2="16" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FF6B35" /><stop offset="100%" stopColor="#FF9500" />
                      </linearGradient>
                      <linearGradient id="fireInner" x1="12" y1="8" x2="12" y2="15" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFD93D" /><stop offset="100%" stopColor="#FF8C00" />
                      </linearGradient>
                    </defs>
                  </motion.svg>
                </div>
                <div>
                  <p className="text-[10px] text-white/70 font-medium">Chip aquecendo</p>
                  <p className="text-[8px] text-white/30">Simulação ativa</p>
                </div>
              </div>
            </motion.div>

            {/* Badge — Simulação Natural (bottom left) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 2.1 }}
              className="absolute left-[5%] lg:left-[-20px] bottom-[10%] hidden lg:block"
            >
              <div className="bg-[#111827]/90 backdrop-blur-sm border border-white/[0.08] rounded-xl px-3.5 py-2.5 flex items-center gap-2"
                style={{ boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)" }}
              >
                <div className="w-6 h-6 rounded-lg bg-[#07C160]/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-[#07C160]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-[10px] text-white/60 font-medium whitespace-nowrap">Simulação natural</span>
              </div>
            </motion.div>

            {/* Badge — Monitoramento (bottom right) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 2.1 }}
              className="absolute right-[-20px] lg:right-[-30px] bottom-[5%] hidden lg:block"
            >
              <div className="bg-[#111827]/90 backdrop-blur-sm border border-white/[0.08] rounded-xl px-3.5 py-2.5 flex items-center gap-2"
                style={{ boxShadow: "0 12px 32px -8px rgba(0,0,0,0.5)" }}
              >
                <div className="w-6 h-6 rounded-lg bg-[#07C160]/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-[#07C160]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-[10px] text-white/60 font-medium whitespace-nowrap">Monitoramento</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
