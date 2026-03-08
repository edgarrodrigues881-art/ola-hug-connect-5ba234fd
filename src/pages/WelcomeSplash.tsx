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
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {/* Large background glow */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 40%, transparent 70%)",
              filter: "blur(80px)",
            }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={phase >= 1 ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 2, ease: "easeOut" }}
          />

          {/* Horizontal blur stripe */}
          <motion.div
            className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-64 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.08) 15%, hsl(var(--primary) / 0.20) 50%, hsl(var(--primary) / 0.08) 85%, transparent 100%)",
              filter: "blur(70px)",
            }}
            initial={{ opacity: 0, scaleX: 0.3 }}
            animate={phase >= 2 ? { opacity: 1, scaleX: 1 } : {}}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />

          <div className="relative flex flex-col items-center gap-2">
            {/* Bem-vindo */}
            <motion.span
              className="text-sm sm:text-base font-bold tracking-[0.35em] uppercase text-primary"
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              Bem-vindo
            </motion.span>

            {/* ao */}
            <motion.span
              className="text-sm text-muted-foreground/60 tracking-[0.5em] uppercase font-medium"
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              ao
            </motion.span>

            {/* Logo with glow */}
            <motion.div
              className="mt-5 relative"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={phase >= 3 ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Glow behind logo */}
              <motion.div
                className="absolute -inset-6 rounded-3xl pointer-events-none"
                style={{
                  background: "radial-gradient(circle, hsl(var(--primary) / 0.35) 0%, hsl(var(--primary) / 0.10) 50%, transparent 75%)",
                  filter: "blur(25px)",
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={phase >= 3 ? { opacity: [0, 1, 0.7], scale: [0.5, 1.2, 1] } : {}}
                transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
              />

              {/* Rotating light sweep border */}
              <motion.div
                className="absolute -inset-[3px] rounded-2xl overflow-hidden"
                initial={{ opacity: 0 }}
                animate={phase >= 3 ? { opacity: 1 } : {}}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary)) 8%, hsl(var(--primary) / 0.5) 15%, transparent 25%, transparent 100%)",
                  }}
                  initial={{ rotate: 0 }}
                  animate={phase >= 3 ? { rotate: 360 } : {}}
                  transition={{ duration: 2, ease: "linear", repeat: 1 }}
                />
              </motion.div>

              {/* Inner mask */}
              <div className="absolute inset-[2px] rounded-[14px] bg-background z-[1]" />

              <img
                src={logo}
                alt="DG Contingência"
                className="relative z-[2] w-32 h-32 sm:w-40 sm:h-40 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
              />
            </motion.div>

            {/* Brand name */}
            <motion.div
              className="mt-6 flex flex-col items-center gap-1.5"
              initial={{ opacity: 0, y: 24 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1
                className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                <span className="text-primary">DG</span>{" "}
                <span>CONTINGÊNCIA</span>
              </h1>
              <motion.span
                className="text-[10px] sm:text-xs tracking-[0.4em] uppercase text-muted-foreground/40 font-medium"
                initial={{ opacity: 0 }}
                animate={phase >= 3 ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                Plataforma de Automação
              </motion.span>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              className="mt-10 relative w-60 h-[6px] rounded-full overflow-hidden"
              initial={{ opacity: 0, scaleX: 0.7 }}
              animate={phase >= 3 ? { opacity: 1, scaleX: 1 } : {}}
              transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
            >
              <div className="absolute inset-0 bg-primary/15 rounded-full" />
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: "linear-gradient(90deg, hsl(var(--primary) / 0.3), hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                  boxShadow: "0 0 20px hsl(var(--primary) / 0.5), 0 0 6px hsl(var(--primary) / 0.3)",
                }}
                initial={{ width: "0%" }}
                animate={phase >= 3 ? { width: "100%" } : {}}
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
