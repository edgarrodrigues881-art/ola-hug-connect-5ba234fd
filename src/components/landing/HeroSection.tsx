import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import dgRemaster from "@/assets/dg-remaster.png";

const chats = [
  { name: "DG CONTINGENCIA #01", msg: "Você: aquecimento iniciado ✅", time: "10:45", unread: 999, avatar: "DG", color: "#07C160", badgeColor: "#07C160" },
  { name: "DG CONTINGENCIA #02", msg: "Bot: simulação em andamento", time: "10:43", unread: 999, avatar: "DG", color: "#0AD47C", badgeColor: "#07C160" },
  { name: "Lucas Mendes", msg: "Beleza, te mando amanhã cedo", time: "10:42", unread: 0, avatar: "LM", color: "#3B82F6", badgeColor: "#3B82F6" },
  { name: "Ana Clara", msg: "Obrigada pelo retorno! 😊", time: "10:38", unread: 2, avatar: "AC", color: "#EC4899", badgeColor: "#EC4899" },
  { name: "Grupo Marketing", msg: "Pedro: alguém tem o relatório?", time: "10:35", unread: 5, avatar: "GM", color: "#8B5CF6", badgeColor: "#8B5CF6" },
  { name: "Carlos Eduardo", msg: "Vou verificar e te aviso", time: "10:21", unread: 0, avatar: "CE", color: "#F59E0B", badgeColor: "#F59E0B" },
];

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">

      <div className="container relative z-10 py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left — Copy */}
          <div className="max-w-lg">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-[2.5rem] sm:text-5xl lg:text-[3.25rem] font-semibold text-white leading-[1.12] mb-6 tracking-[-0.02em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Automação inteligente para preparar seu WhatsApp com{" "}
              <span className="text-[#07C160]">segurança.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-[15px] lg:text-base text-white/40 leading-relaxed mb-10 max-w-md"
            >
              Conecte o QR Code e acompanhe em tempo real o processo de aquecimento do seu número.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex flex-col sm:flex-row items-start gap-3"
            >
              <Button
                onClick={() => navigate("/auth")}
                className="h-12 px-8 text-sm font-medium rounded-xl bg-[#07C160] hover:bg-[#06a852] text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(7,193,96,0.2)]"
              >
                Começar Agora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-[#07C160]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#07C160]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-[12px] text-white/40 leading-snug">
                  Com poucos cliques, seu aquecimento vira <span className="text-[#07C160] font-medium">100% automático.</span>
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right — Phone + Progress Badge */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative flex items-center justify-center"
          >
            {/* Ambient glow — static, no animation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 lg:w-80 lg:h-80">
              <div className="w-full h-full rounded-full bg-[#07C160]/[0.06] blur-[100px] opacity-50" />
            </div>

            {/* Phone */}
            <div className="relative" style={{ perspective: "900px" }}>
              <div
                className="relative w-[260px] lg:w-[270px]"
                style={{ transform: "rotateY(-8deg) rotateX(2deg)", transformStyle: "preserve-3d", willChange: "transform" }}
              >
                {/* Outer glow — animated */}
                <motion.div
                  className="absolute -inset-[6px] rounded-[2.8rem] z-0 blur-md"
                  style={{
                    background: "linear-gradient(135deg, #07C160, #0AD47C, #07C160, transparent, #07C160)",
                    backgroundSize: "300% 300%",
                  }}
                  animate={{
                    backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Border — animated */}
                <motion.div
                  className="absolute -inset-[2px] rounded-[2.6rem] z-0"
                  style={{
                    background: "linear-gradient(135deg, #07C160, #0AD47C, #07C160, transparent, #07C160)",
                    backgroundSize: "300% 300%",
                  }}
                  animate={{
                    backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Phone chassis */}
                <div className="relative rounded-[2.4rem] p-[5px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] z-10"
                  style={{ background: "linear-gradient(145deg, #2A2A2E, #1A1A1E, #2A2A2E)" }}
                >
                  {/* Screen bezel */}
                  <div className="rounded-[2rem] overflow-hidden bg-[#0A0A0A]">
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-5 pt-[10px] pb-1">
                      <span className="text-[10px] text-white/40 font-medium">9:41</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-white/30 font-semibold">5G</span>
                        <div className="flex items-end gap-[1px]">
                          <div className="w-[2px] h-[4px] bg-white/40 rounded-[0.5px]" />
                          <div className="w-[2px] h-[6px] bg-white/40 rounded-[0.5px]" />
                          <div className="w-[2px] h-[8px] bg-white/40 rounded-[0.5px]" />
                          <div className="w-[2px] h-[10px] bg-white/15 rounded-[0.5px]" />
                        </div>
                        <div className="flex items-center gap-[1px]">
                          <div className="w-[14px] h-[7px] border border-white/30 rounded-[2px] p-[1px]">
                            <div className="w-[70%] h-full bg-[#07C160] rounded-[1px]" />
                          </div>
                          <div className="w-[1px] h-[3px] bg-white/20 rounded-r-full" />
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp header */}
                    <div className="px-4 pt-1 pb-2 flex items-center justify-between">
                      <h3 className="text-[15px] font-bold text-white tracking-tight">Conversas</h3>
                      <div className="flex items-center gap-3">
                        <svg className="w-[14px] h-[14px] text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <circle cx="12" cy="13" r="3" />
                        </svg>
                        <svg className="w-[14px] h-[14px] text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                        </svg>
                        <svg className="w-[14px] h-[14px] text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="6" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="18" r="1" fill="currentColor" />
                        </svg>
                      </div>
                    </div>

                    {/* Search */}
                    <div className="mx-3 mb-2">
                      <div className="h-[28px] bg-white/[0.06] rounded-lg flex items-center px-3 gap-1.5">
                        <svg className="w-[10px] h-[10px] text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                        </svg>
                        <span className="text-[11px] text-white/20">Pesquisar</span>
                      </div>
                    </div>

                    {/* Chat list */}
                    <div>
                      {chats.map((chat, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-3 py-[8px] border-b border-white/[0.02] last:border-0">
                          {chat.name.startsWith("DG CONTINGENCIA") ? (
                            <img src={dgRemaster} alt="DG" className="w-[36px] h-[36px] rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div
                              className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                              style={{ backgroundColor: chat.color + "20", color: chat.color }}
                            >
                              {chat.avatar}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-[2px]">
                              <span className={`text-[13px] truncate ${chat.unread > 0 ? "font-semibold text-white" : "text-white/70"}`}>
                                {chat.name}
                              </span>
                              <span className={`text-[10px] flex-shrink-0 ml-1 ${chat.unread > 0 ? "text-[#07C160]" : "text-white/20"}`}>
                                {chat.time}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 truncate pr-2">
                                {chat.unread === 0 && (
                                  <svg className="w-[12px] h-[12px] text-[#53BDEB] flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M11.07 4.93a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 011.06-1.06L6.5 8.36l3.47-3.43a.75.75 0 011.06 0z" />
                                    <path d="M14.07 4.93a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06-1.06l4-4a.75.75 0 011.06 0z" />
                                  </svg>
                                )}
                                <span className="text-[11px] text-white/30 truncate">{chat.msg}</span>
                              </div>
                              {chat.unread > 0 && (
                                <span 
                                  className="flex-shrink-0 min-w-[16px] h-[16px] rounded-full text-[7px] font-bold text-white flex items-center justify-center px-1"
                                  style={{ backgroundColor: chat.badgeColor }}
                                >
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
                      {[
                        { name: "Conversas", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
                        { name: "Atualizações", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" },
                        { name: "Ligações", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
                      ].map((tab, i) => (
                        <div key={tab.name} className="flex flex-col items-center gap-1">
                          <svg className={`w-[14px] h-[14px] ${i === 0 ? "text-[#07C160]" : "text-white/20"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                          </svg>
                          <span className={`text-[8px] ${i === 0 ? "text-[#07C160] font-semibold" : "text-white/20"}`}>{tab.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Home indicator */}
                    <div className="flex justify-center pb-2 pt-1">
                      <div className="w-[100px] h-[4px] bg-white/10 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Shadow beneath phone */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[65%] h-8 bg-[#07C160]/[0.06] blur-3xl rounded-full" />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[75%] h-6 bg-black/50 blur-2xl rounded-full" />
              </div>
            </div>

            {/* Floating notification bubbles — simulating real-time activity */}
            <div className="hidden lg:block">
              {/* Notification 1 — Message sent (right side, top) */}
              <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.9 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="absolute right-[-60px] top-[8%] w-[210px]"
              >
                <div className="relative rounded-2xl p-4 overflow-hidden"
                  style={{
                    background: "linear-gradient(145deg, rgba(17,24,39,0.98), rgba(10,15,25,0.96))",
                    boxShadow: "0 24px 48px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(7,193,96,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#07C160]/30 to-transparent" />
                  
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#07C160] animate-pulse" />
                    <span className="text-[10px] text-[#07C160] font-bold tracking-[0.12em] uppercase">Ao vivo</span>
                  </div>

                  {/* Simulated sent messages */}
                  <div className="space-y-2">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex-1 h-[28px] rounded-lg bg-[#07C160]/[0.12] border border-[#07C160]/10 flex items-center px-2.5 gap-1.5">
                        <svg className="w-3 h-3 text-[#07C160] flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M11.07 4.93a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 011.06-1.06L6.5 8.36l3.47-3.43a.75.75 0 011.06 0z" />
                          <path d="M14.07 4.93a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06-1.06l4-4a.75.75 0 011.06 0z" />
                        </svg>
                        <span className="text-[10px] text-white/50 truncate">+55 11 ****-2847</span>
                      </div>
                      <span className="text-[8px] text-white/20 flex-shrink-0">agora</span>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.7 }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex-1 h-[28px] rounded-lg bg-[#07C160]/[0.12] border border-[#07C160]/10 flex items-center px-2.5 gap-1.5">
                        <svg className="w-3 h-3 text-[#07C160] flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M11.07 4.93a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 011.06-1.06L6.5 8.36l3.47-3.43a.75.75 0 011.06 0z" />
                          <path d="M14.07 4.93a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06-1.06l4-4a.75.75 0 011.06 0z" />
                        </svg>
                        <span className="text-[10px] text-white/50 truncate">+55 21 ****-9314</span>
                      </div>
                      <span className="text-[8px] text-white/20 flex-shrink-0">2s</span>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.9 }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex-1 h-[28px] rounded-lg bg-white/[0.03] border border-white/[0.04] flex items-center px-2.5 gap-1.5">
                        <div className="w-3 h-3 rounded-full border border-white/10 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
                        </div>
                        <span className="text-[10px] text-white/30 truncate">+55 31 ****-7720</span>
                      </div>
                      <span className="text-[8px] text-white/15 flex-shrink-0">5s</span>
                    </motion.div>
                  </div>

                  {/* Counter */}
                  <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between">
                    <span className="text-[9px] text-white/25">Mensagens hoje</span>
                    <motion.span
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.0 }}
                      className="text-[13px] font-bold text-white tabular-nums"
                    >342</motion.span>
                  </div>
                </div>
              </motion.div>

              {/* Notification 2 — Progress ring (left side) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="absolute left-[-55px] top-[25%]"
              >
                <div className="relative rounded-2xl p-4 overflow-hidden"
                  style={{
                    background: "linear-gradient(145deg, rgba(17,24,39,0.98), rgba(10,15,25,0.96))",
                    boxShadow: "0 24px 48px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(7,193,96,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#07C160]/25 to-transparent" />
                  <div className="flex items-center gap-3">
                    {/* SVG ring */}
                    <div className="relative w-12 h-12">
                      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                        <motion.circle
                          cx="24" cy="24" r="20" fill="none"
                          stroke="#07C160" strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                          whileInView={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - 0.89) }}
                          viewport={{ once: true }}
                          transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-bold text-white">89%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-white/80 font-semibold">Aquecimento</p>
                      <p className="text-[9px] text-[#07C160]/70 mt-0.5">Dia 12 de 14</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Notification 3 — Instâncias conectadas (bottom left) */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="absolute left-[-30px] bottom-[12%]"
              >
                <div className="relative rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 overflow-hidden"
                  style={{
                    background: "linear-gradient(145deg, rgba(17,24,39,0.98), rgba(10,15,25,0.96))",
                    boxShadow: "0 16px 40px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(7,193,96,0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="absolute top-0 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-[#07C160]/20 to-transparent" />
                  <div className="w-7 h-7 rounded-lg bg-[#07C160]/[0.08] flex items-center justify-center border border-[#07C160]/10">
                    <svg className="w-3.5 h-3.5 text-[#07C160]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[11px] text-white/70 font-medium block">43 instâncias</span>
                    <span className="text-[8px] text-[#07C160]/60">Todas online</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
