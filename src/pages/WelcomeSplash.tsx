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
    const t1 = setTimeout(() => setPhase(1), 200);   // "Bem-vindo"
    const t2 = setTimeout(() => setPhase(2), 800);   // "ao"
    const t3 = setTimeout(() => setPhase(3), 1200);  // Logo + nome
    const t4 = setTimeout(() => setPhase(4), 2800);  // Fade out
    const t5 = setTimeout(() => navigate(redirectTo, { replace: true }), 3400);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [navigate, redirectTo]);

  return (
    <AnimatePresence>
      {phase < 4 && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Subtle glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
          </div>

          <div className="relative flex flex-col items-center gap-3">
            {/* Bem-vindo */}
            <motion.span
              className="text-lg sm:text-xl font-medium text-muted-foreground tracking-wider uppercase"
              initial={{ opacity: 0, y: 12 }}
              animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              Bem-vindo
            </motion.span>

            {/* ao */}
            <motion.span
              className="text-sm sm:text-base text-muted-foreground/70 tracking-widest"
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 1 } : {}}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              ao
            </motion.span>

            {/* Logo + Brand */}
            <motion.div
              className="flex flex-col items-center gap-4 mt-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={phase >= 3 ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <img
                src={logo}
                alt="DG Contingência"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-lg"
              />
              <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  DG CONTINGÊNCIA
                </span>
              </div>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              className="mt-8 h-0.5 rounded-full bg-primary/20 overflow-hidden w-40"
              initial={{ opacity: 0 }}
              animate={phase >= 3 ? { opacity: 1 } : {}}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={phase >= 3 ? { width: "100%" } : {}}
                transition={{ duration: 1.4, ease: "easeInOut" }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeSplash;
