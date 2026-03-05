import { useEffect, useRef, useState } from "react";
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
];

const cardBg = "linear-gradient(145deg, rgba(17,24,39,0.98), rgba(10,15,25,0.96))";
const cardShadow = "0 0 0 1px rgba(7,193,96,0.12)";

const ChatListAnimated = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<boolean[]>([]);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(chats.map(() => true));
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          chats.forEach((_, i) => {
            setTimeout(() => setVisible((prev) => {
              const next = [...prev];
              next[i] = true;
              return next;
            }), i * 600);
          });
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {chats.map((chat, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 px-3 py-[8px] border-b border-white/[0.02] last:border-0"
          style={{
            opacity: visible[i] ? 1 : 0,
            transform: visible[i] ? "translateY(0)" : "translateY(10px)",
            transition: "opacity 300ms cubic-bezier(0.4,0,0.2,1), transform 300ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {chat.name.startsWith("DG CONTINGENCIA") ? (
            <img src={dgRemaster} alt="DG" width={36} height={36} loading="lazy" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
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
                <span className="flex-shrink-0 min-w-[16px] h-[16px] rounded-full bg-[#07C160] text-[7px] font-bold text-white flex items-center justify-center px-1">
                  {chat.unread >= 999 ? "999+" : chat.unread}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[auto] lg:min-h-screen flex items-center pt-20 pb-4 md:pb-10" style={{ overflowX: "clip", overflowY: "visible" }}>
      <div className="relative z-10 py-4 sm:py-8 lg:py-12 xl:py-16 mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_minmax(340px,460px)] gap-8 md:gap-10 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="max-w-xl animate-fade-in">
            <h1
              className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-5xl xl:text-[3.5rem] font-semibold text-white leading-[1.1] mb-5 sm:mb-6 tracking-[-0.02em]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Automação inteligente para preparar seu WhatsApp com{" "}
              <span className="text-[#07C160]">segurança.</span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-white/40 leading-relaxed mb-6 sm:mb-8 max-w-md">
              Conecte o QR Code e acompanhe em tempo real o processo de aquecimento do seu número.
            </p>

            <Button
              onClick={() => navigate("/auth")}
              className="h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base font-medium rounded-xl bg-[#07C160] hover:bg-[#06a852] text-white btn-press"
            >
              Começar Agora
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <div className="mt-4 flex items-center gap-3 px-4 py-3 sm:py-4 rounded-xl border border-white/[0.06] bg-white/[0.03] max-w-sm">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#07C160]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#07C160]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm text-white/40 leading-snug">
                Com poucos cliques, seu aquecimento vira <span className="text-[#07C160] font-medium">100% automático.</span>
              </p>
            </div>
          </div>

          {/* Right — HeroPhoneStage */}
          <div className="relative flex flex-col items-center justify-center animate-fade-in hero-phone-float" style={{ animationDelay: "80ms", overflow: "visible" }}>
            {/* Ambient glow — subtle */}
            <div
              className="absolute inset-0 pointer-events-none z-0"
              style={{
                background: "radial-gradient(circle at 50% 50%, rgba(7,193,96,0.08) 0%, transparent 55%)",
              }}
            />

            {/* HeroPhoneStage */}
            <div className="relative flex items-center justify-center" style={{ overflow: "visible" }}>

              {/* === PhoneLayer (z-10) — straight, larger === */}
              <div className="relative z-10 flex-shrink-0">
                <div className="relative w-[260px] sm:w-[280px] md:w-[300px] lg:w-[320px] xl:w-[350px]">
                {/* Neon border — subtle */}
                <div
                  className="absolute -inset-[3px] rounded-[2.7rem] z-0"
                  style={{
                    background: "linear-gradient(160deg, rgba(7,193,96,0.5), rgba(7,193,96,0.15) 40%, transparent 60%, rgba(7,193,96,0.3))",
                    boxShadow: "0 0 40px rgba(16,185,129,0.25)",
                  }}
                />

                {/* Phone chassis */}
                <div className="relative rounded-[2.4rem] p-[6px] z-10"
                  style={{
                    background: "linear-gradient(145deg, #333338, #1E1E22, #2A2A2E, #1A1A1E)",
                    boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="relative rounded-[2rem] overflow-hidden bg-[#0A0A0A]">
                    {/* Glass reflection overlay */}
                    <div
                      className="absolute inset-0 z-50 pointer-events-none rounded-[2rem]"
                      style={{
                        background: "linear-gradient(120deg, rgba(255,255,255,0.05) 0%, transparent 35%)",
                        opacity: 0.08,
                      }}
                    />
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

                    {/* Chat list — animated */}
                    <ChatListAnimated />

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
              </div>
              {/* End phone sizing div */}

              {/* === OverlayLayer (z-20) — desktop only, triangle layout === */}
              <div className="absolute inset-0 z-20 pointer-events-none hidden lg:block" style={{ overflow: "visible" }}>

                {/* Card 1 — AO VIVO (top-right, 30px from edge) */}
                <div className="absolute w-[170px] xl:w-[185px]"
                  style={{ top: "-20px", right: "-30px", transform: "translateX(40%)" }}>
                  <div className="relative rounded-xl p-3.5 border border-white/[0.06]" style={{ background: cardBg, boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
                    <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#07C160]/20 to-transparent" />
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#07C160]" />
                      <span className="text-[10px] text-[#07C160] font-bold tracking-[0.12em] uppercase">Ao vivo</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { phone: "+55 11 ****-2847", time: "agora", active: true },
                        { phone: "+55 21 ****-9314", time: "2s", active: true },
                        { phone: "+55 31 ****-7720", time: "5s", active: false },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className={`flex-1 h-[26px] rounded-lg flex items-center px-2 gap-1.5 ${item.active ? "bg-[#07C160]/[0.12] border border-[#07C160]/10" : "bg-white/[0.03] border border-white/[0.04]"}`}>
                            {item.active ? (
                              <svg className="w-3 h-3 text-[#07C160] flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M11.07 4.93a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 011.06-1.06L6.5 8.36l3.47-3.43a.75.75 0 011.06 0z" />
                                <path d="M14.07 4.93a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06-1.06l4-4a.75.75 0 011.06 0z" />
                              </svg>
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-white/10 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/60" />
                              </div>
                            )}
                            <span className={`text-[9px] truncate ${item.active ? "text-white/50" : "text-white/30"}`}>{item.phone}</span>
                          </div>
                          <span className={`text-[8px] flex-shrink-0 ${item.active ? "text-white/20" : "text-white/15"}`}>{item.time}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between">
                      <span className="text-[8px] text-white/25">Mensagens hoje</span>
                      <span className="text-[12px] font-bold text-white tabular-nums">342</span>
                    </div>
                  </div>
                </div>

                {/* Card 2 — Aquecimento 89% (mid-left, vertically centered) */}
                <div className="absolute"
                  style={{ top: "50%", left: "-30px", transform: "translate(-100%, -50%)" }}>
                  <div className="relative rounded-xl p-3.5 border border-white/[0.06]" style={{ background: cardBg, boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
                    <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#07C160]/20 to-transparent" />
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-10 h-10">
                        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                          <circle cx="24" cy="24" r="20" fill="none" stroke="#07C160" strokeWidth="3" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={2 * Math.PI * 20 * (1 - 0.89)} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">89%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/80 font-semibold">Aquecimento</p>
                        <p className="text-[8px] text-[#07C160]/70 mt-0.5">Dia 12 de 14</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 3 — 43 instâncias (bottom-left) */}
                <div className="absolute"
                  style={{ bottom: "5%", left: "-30px", transform: "translateX(-100%)" }}>
                  <div className="relative rounded-xl px-3 py-2.5 flex items-center gap-2 border border-white/[0.06]" style={{ background: cardBg, boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
                    <div className="absolute top-0 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-[#07C160]/20 to-transparent" />
                    <div className="w-6 h-6 rounded-lg bg-[#07C160]/[0.08] flex items-center justify-center border border-[#07C160]/10">
                      <svg className="w-3 h-3 text-[#07C160]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/70 font-medium block">43 instâncias</span>
                      <span className="text-[8px] text-[#07C160]/60">Todas online</span>
                    </div>
                  </div>
                </div>

              </div>
              {/* End OverlayLayer */}

              </div>
              {/* End PhoneLayer */}

            </div>
            {/* End HeroPhoneStage */}

          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
