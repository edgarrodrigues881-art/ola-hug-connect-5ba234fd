import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import InteractiveGlobe from "@/components/ui/interactive-globe";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[auto] lg:min-h-screen flex items-center pt-20 pb-4 md:pb-10">
      <div className="relative z-10 py-4 sm:py-8 lg:py-12 xl:py-16 mx-auto w-full max-w-[1300px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left column — text */}
          <div className="animate-fade-in text-center lg:text-left order-1">
            <h1
              className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-5xl xl:text-[3.5rem] font-semibold text-white leading-[1.1] mb-5 sm:mb-6 tracking-[-0.02em]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Automação inteligente para preparar seu WhatsApp com{" "}
              <span className="text-[#07C160]">segurança.</span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-white/40 leading-relaxed mb-6 sm:mb-8 max-w-md mx-auto lg:mx-0">
              Conecte o QR Code e acompanhe em tempo real o processo de aquecimento do seu número.
            </p>

            <Button
              onClick={() => navigate("/auth")}
              className="h-12 sm:h-14 px-8 sm:px-10 text-sm sm:text-base font-medium rounded-xl bg-[#07C160] hover:bg-[#06a852] text-white btn-press"
            >
              Começar Agora
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <div className="mt-4 flex items-center gap-3 px-4 py-3 sm:py-4 rounded-xl border border-white/[0.06] bg-white/[0.03] max-w-sm mx-auto lg:mx-0">
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

          {/* Right column — globe card */}
          <div className="flex items-center justify-center order-2">
            <div className="relative w-full max-w-[520px] aspect-square rounded-2xl border border-emerald-500/15 bg-black/20 overflow-hidden">
              <InteractiveGlobe className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
