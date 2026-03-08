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
    const t2 = setTimeout(() => setPhase(2), 900);
    const t3 = setTimeout(() => setPhase(3), 1400);
    const t4 = setTimeout(() => setPhase(4), 3200);
    const t5 = setTimeout(() => navigate(redirectTo, { replace: true }), 3800);

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
          {/* Animated glow orbs */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)" }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={phase >= 1 ? { scale: 1.2, opacity: 1 } : {}}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          <motion.div
            className="absolute top-[40%] left-[45%] w-[300px] h-[300px] rounded-full"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.04) 0%, transparent 70%)" }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={phase >= 2 ? { scale: 1.5, opacity: 1 } : {}}
            transition={{ duration: 2.5, ease: "easeOut" }}
          />

          {/* Particles / floating dots */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/20"
              style={{
                top: `${30 + Math.random() * 40}%`,
                left: `${20 + Math.random() * 60}%`,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= 2 ? { opacity: [0, 0.6, 0], y: -40 } : {}}
              transition={{ duration: 2.5, delay: i * 0.2, ease: "easeOut" }}
            />
          ))}

          <div className="relative flex flex-col items-center gap-2">
            {/* Bem-vindo */}
            <motion.span
              className="text-sm sm:text-base font-bold tracking-[0.35em] uppercase text-primary"
              initial={{ opacity: 0, y: 16, letterSpacing: "0.2em" }}
              animate={phase >= 1 ? { opacity: 1, y: 0, letterSpacing: "0.35em" } : {}}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              Bem-vindo
            </motion.span>

            {/* ao */}
            <motion.span
              className="text-sm text-muted-foreground/60 tracking-[0.5em] uppercase font-medium"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={phase >= 2 ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              ao
            </motion.span>

            {/* Logo */}
            <motion.div
              className="mt-4 relative"
              initial={{ opacity: 0, scale: 0.7, rotateY: -15 }}
              animate={phase >= 3 ? { opacity: 1, scale: 1, rotateY: 0 } : {}}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Logo glow ring */}
              <motion.div
                className="absolute -inset-3 rounded-3xl"
                style={{
                  background: "conic-gradient(from 0deg, hsl(var(--primary) / 0.15), transparent 40%, hsl(var(--primary) / 0.1), transparent 80%, hsl(var(--primary) / 0.15))",
                }}
                initial={{ opacity: 0, rotate: 0 }}
                animate={phase >= 3 ? { opacity: 1, rotate: 360 } : {}}
                transition={{ duration: 4, ease: "linear", repeat: Infinity }}
              />
              <img
                src={logo}
                alt="DG Contingência"
                className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] ring-1 ring-white/5"
              />
            </motion.div>

            {/* Brand name */}
            <motion.div
              className="mt-5 flex flex-col items-center gap-1"
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1
                className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground"
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

            {/* Premium loading bar */}
            <motion.div
              className="mt-10 relative w-48 h-[2px] rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={phase >= 3 ? { opacity: 1 } : {}}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <div className="absolute inset-0 bg-primary/10 rounded-full" />
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: "linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary)), hsl(var(--primary) / 0.6))",
                  boxShadow: "0 0 12px hsl(var(--primary) / 0.4)",
                }}
                initial={{ width: "0%" }}
                animate={phase >= 3 ? { width: "100%" } : {}}
                transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeSplash;
