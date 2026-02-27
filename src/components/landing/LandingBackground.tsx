import { motion } from "framer-motion";
import { useMemo } from "react";

const LandingBackground = () => {
  // Generate random particles
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.4 + 0.1,
    })),
  []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Mesh gradient blobs */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          top: "-15%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(circle, rgba(7,193,96,0.08) 0%, rgba(7,193,96,0.02) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          top: "25%",
          left: "-8%",
          background: "radial-gradient(circle, rgba(7,193,96,0.06) 0%, rgba(0,200,150,0.02) 50%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          top: "45%",
          right: "-8%",
          background: "radial-gradient(circle, rgba(7,193,96,0.06) 0%, rgba(0,150,200,0.015) 50%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div
        className="absolute w-[900px] h-[600px] rounded-full"
        style={{
          bottom: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse, rgba(7,193,96,0.07) 0%, rgba(7,193,96,0.02) 40%, transparent 65%)",
          filter: "blur(100px)",
        }}
      />

      {/* Animated mesh blobs that move slowly */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(7,193,96,0.05) 0%, transparent 70%)",
          filter: "blur(120px)",
        }}
        animate={{
          x: ["-10%", "10%", "-10%"],
          y: ["20%", "40%", "20%"],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          right: "10%",
          background: "radial-gradient(circle, rgba(0,180,160,0.04) 0%, transparent 70%)",
          filter: "blur(120px)",
        }}
        animate={{
          y: ["60%", "30%", "60%"],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(7,193,96,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(7,193,96,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Animated grid glow pulse */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(7,193,96,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(7,193,96,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse at 50% 50%, black 0%, transparent 60%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 0%, transparent 60%)",
        }}
        animate={{ opacity: [0.02, 0.06, 0.02] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#07C160]"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: 0,
          }}
          animate={{
            y: [0, -80, -160],
            x: [0, (Math.random() - 0.5) * 40],
            opacity: [0, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Glassmorphism blur overlay at edges */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom, rgba(11,15,20,0.8) 0%, transparent 15%, transparent 85%, rgba(11,15,20,0.9) 100%),
            linear-gradient(to right, rgba(11,15,20,0.5) 0%, transparent 20%, transparent 80%, rgba(11,15,20,0.5) 100%)
          `,
        }}
      />
    </div>
  );
};

export default LandingBackground;
