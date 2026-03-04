import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroPhone from "@/assets/hero-phone-clean.png";

const cardBg = "linear-gradient(145deg, rgba(17,24,39,0.98), rgba(10,15,25,0.96))";
const cardShadow = "0 0 0 1px rgba(7,193,96,0.12)";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      <div className="container relative z-10 py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left — Copy */}
          <div className="max-w-lg animate-fade-in">
            <h1
              className="text-[2.5rem] sm:text-5xl lg:text-[3.25rem] font-semibold text-white leading-[1.12] mb-6 tracking-[-0.02em]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Automação inteligente para preparar seu WhatsApp com{" "}
              <span className="text-[#07C160]">segurança.</span>
            </h1>

            <p className="text-[15px] lg:text-base text-white/40 leading-relaxed mb-10 max-w-md">
              Conecte o QR Code e acompanhe em tempo real o processo de aquecimento do seu número.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-3">
              <Button
                onClick={() => navigate("/auth")}
                className="h-12 px-8 text-sm font-medium rounded-xl bg-[#07C160] hover:bg-[#06a852] text-white transition-colors duration-120"
              >
                Começar Agora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                <div className="w-8 h-8 rounded-lg bg-[#07C160]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#07C160]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-[12px] text-white/40 leading-snug">
                  Com poucos cliques, seu aquecimento vira <span className="text-[#07C160] font-medium">100% automático.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right — Phone */}
          <div className="relative flex items-center justify-center animate-fade-in" style={{ animationDelay: "80ms" }}>
            <img 
              src={heroPhone} 
              alt="WhatsApp mockup" 
              className="w-[280px] lg:w-[340px] h-auto relative z-10"
              style={{ 
                mixBlendMode: "lighten",
                filter: "drop-shadow(0 20px 60px rgba(0,0,0,0.5)) drop-shadow(0 0 30px rgba(7,193,96,0.12))" 
              }}
            />

            {/* Floating notifications */}
            <div className="hidden lg:block">
              {/* Notification 1 — Ao vivo */}
              <div className="absolute right-[-40px] top-[5%] w-[200px] z-20">
                <div className="relative rounded-2xl p-3.5 overflow-hidden" style={{ background: cardBg, boxShadow: cardShadow }}>
                  <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#07C160]/30 to-transparent" />
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
                      <div key={i} className="flex items-center gap-2">
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
                          <span className={`text-[10px] truncate ${item.active ? "text-white/50" : "text-white/30"}`}>{item.phone}</span>
                        </div>
                        <span className={`text-[8px] flex-shrink-0 ${item.active ? "text-white/20" : "text-white/15"}`}>{item.time}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between">
                    <span className="text-[9px] text-white/25">Mensagens hoje</span>
                    <span className="text-[13px] font-bold text-white tabular-nums">342</span>
                  </div>
                </div>
              </div>

              {/* Notification 2 — Progress ring */}
              <div className="absolute left-[-30px] top-[30%] z-20">
                <div className="relative rounded-2xl p-3.5 overflow-hidden" style={{ background: cardBg, boxShadow: cardShadow }}>
                  <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#07C160]/25 to-transparent" />
                  <div className="flex items-center gap-3">
                    <div className="relative w-11 h-11">
                      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 48 48">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                        <circle cx="24" cy="24" r="20" fill="none" stroke="#07C160" strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 20}`} strokeDashoffset={2 * Math.PI * 20 * (1 - 0.89)} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">89%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-white/80 font-semibold">Aquecimento</p>
                      <p className="text-[9px] text-[#07C160]/70 mt-0.5">Dia 12 de 14</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification 3 — Instâncias */}
              <div className="absolute left-[0px] bottom-[15%] z-20">
                <div className="relative rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 overflow-hidden" style={{ background: cardBg, boxShadow: cardShadow }}>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
