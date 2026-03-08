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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col items-center gap-2 px-6">
            <motion.span
              className="text-sm sm:text-base font-black tracking-[0.35em] uppercase text-primary"
              style={{ willChange: "opacity, transform" }}
              initial={{ opacity: 0, translateY: 12 }}
              animate={phase >= 1 ? { opacity: 1, translateY: 0 } : undefined}
              transition={{ duration: 0.5 }}
            >
              Bem-vindo
            </motion.span>

            <motion.span
              className="text-sm font-bold tracking-[0.5em] uppercase text-slate-600 dark:text-muted-foreground/60"
              style={{ willChange: "opacity" }}
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 1 } : undefined}
              transition={{ duration: 0.4 }}
            >
              ao
            </motion.span>

            <motion.div
              className="mt-4 sm:mt-5"
              style={{ willChange: "opacity, transform" }}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={phase >= 3 ? { opacity: 1, scale: 1 } : undefined}
              transition={{ duration: 0.5 }}
            >
              <img
                src={logo}
                alt="DG Contingência Pro"
                className="w-28 h-28 sm:w-40 sm:h-40 rounded-2xl"
              />
            </motion.div>

            <motion.div
              className="mt-5 sm:mt-6 flex flex-col items-center gap-1.5"
              style={{ willChange: "opacity, transform" }}
              initial={{ opacity: 0, translateY: 16 }}
              animate={phase >= 3 ? { opacity: 1, translateY: 0 } : undefined}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1
                className="text-2xl sm:text-5xl font-black tracking-tight text-center text-slate-900 dark:text-foreground"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="text-primary">DG</span>{" "}
                CONTINGÊNCIA{" "}
                <span className="text-primary">PRO</span>
              </h1>
              <motion.span
                className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-slate-500 dark:text-muted-foreground/40 font-bold"
                style={{ willChange: "opacity" }}
                initial={{ opacity: 0 }}
                animate={phase >= 3 ? { opacity: 1 } : undefined}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                Plataforma de Automação
              </motion.span>
            </motion.div>

            <motion.div
              className="mt-8 sm:mt-10 w-48 sm:w-60 h-[5px] rounded-full bg-primary/10 overflow-hidden"
              style={{ willChange: "opacity" }}
              initial={{ opacity: 0 }}
              animate={phase >= 3 ? { opacity: 1 } : undefined}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <motion.div
                className="h-full rounded-full bg-primary"
                style={{
                  willChange: "transform",
                  transformOrigin: "left",
                  boxShadow: "0 0 8px hsl(var(--primary) / 0.3)",
                }}
                initial={{ scaleX: 0 }}
                animate={phase >= 3 ? { scaleX: 1 } : undefined}
                transition={{ duration: 2.5, ease: [0.4, 0, 0.2, 1] }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeSplash;
