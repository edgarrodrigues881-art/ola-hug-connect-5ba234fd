import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/dg-contingencia-avatar.png";

const WelcomeSplash = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("to") || "/dashboard";
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1300);
    const t4 = setTimeout(() => setPhase(4), 4300);
    const t5 = setTimeout(() => navigate(redirectTo, { replace: true }), 4800);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [navigate, redirectTo]);

  return (
    <AnimatePresence>
      {phase < 4 && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Static background glow — no animation on blur, GPU-friendly */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full pointer-events-none will-change-transform"
            style={{
              background: "radial-gradient(circle, hsl(var(--primary) / 0.07) 0%, hsl(var(--primary) / 0.02) 40%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />

          {/* Static horizontal stripe — no animation, just present */}
          <div
            className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-48 sm:h-64 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.05) 15%, hsl(var(--primary) / 0.10) 50%, hsl(var(--primary) / 0.05) 85%, transparent 100%)",
              filter: "blur(60px)",
            }}
          />

          <div className="relative flex flex-col items-center gap-2 px-6">
            {/* Bem-vindo — only opacity + translateY, GPU composited */}
            <motion.span
              className="text-sm sm:text-base font-bold tracking-[0.35em] uppercase text-primary will-change-[opacity,transform]"
              initial={{ opacity: 0, y: 16 }}
              animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              Bem-vindo
            </motion.span>

            {/* ao — only opacity */}
            <motion.span
              className="text-sm text-muted-foreground/60 tracking-[0.5em] uppercase font-medium will-change-[opacity]"
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 1 } : {}}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              ao
            </motion.span>

            {/* Logo — only opacity + scale, GPU composited */}
            <motion.div
              className="mt-4 sm:mt-5 relative will-change-[opacity,transform]"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={phase >= 3 ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Static glow behind logo — no keyframe animation */}
              <div
                className="absolute -inset-5 sm:-inset-6 rounded-3xl pointer-events-none"
                style={{
                  background: "radial-gradient(circle, hsl(var(--primary) / 0.18) 0%, hsl(var(--primary) / 0.05) 50%, transparent 75%)",
                  filter: "blur(20px)",
                  opacity: phase >= 3 ? 1 : 0,
                  transition: "opacity 0.8s ease-out",
                }}
              />

              {/* Rotating border — uses CSS animation instead of framer-motion for smoother GPU perf */}
              <div
                className="absolute -inset-[3px] rounded-2xl overflow-hidden"
                style={{
                  opacity: phase >= 3 ? 1 : 0,
                  transition: "opacity 0.3s ease-out 0.3s",
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary) / 0.6) 8%, hsl(var(--primary) / 0.2) 15%, transparent 25%, transparent 100%)",
                    animation: phase >= 3 ? "spin 3s linear forwards" : "none",
                  }}
                />
              </div>

              {/* Inner mask */}
              <div className="absolute inset-[2px] rounded-[14px] bg-background z-[1]" />

              <img
                src={logo}
                alt="DG Contingência Pro"
                className="relative z-[2] w-28 h-28 sm:w-40 sm:h-40 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
              />
            </motion.div>

            {/* Brand name — only opacity + translateY */}
            <motion.div
              className="mt-5 sm:mt-6 flex flex-col items-center gap-1.5 will-change-[opacity,transform]"
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1
                className="text-2xl sm:text-5xl font-extrabold tracking-tight text-foreground text-center"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="text-primary">DG</span>{" "}
                <span>CONTINGÊNCIA</span>{" "}
                <span className="text-primary">PRO</span>
              </h1>
              <motion.span
                className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-muted-foreground/40 font-medium will-change-[opacity]"
                initial={{ opacity: 0 }}
                animate={phase >= 3 ? { opacity: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                Plataforma de Automação
              </motion.span>
            </motion.div>

            {/* Loading bar — only width animation, GPU composited */}
            <motion.div
              className="mt-8 sm:mt-10 relative w-48 sm:w-60 h-[5px] rounded-full overflow-hidden will-change-[opacity]"
              initial={{ opacity: 0 }}
              animate={phase >= 3 ? { opacity: 1 } : {}}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <div className="absolute inset-0 bg-primary/10 rounded-full" />
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: "linear-gradient(90deg, hsl(var(--primary) / 0.3), hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                  boxShadow: "0 0 12px hsl(var(--primary) / 0.4)",
                  width: phase >= 3 ? "100%" : "0%",
                  transition: "width 2.5s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeSplash;
