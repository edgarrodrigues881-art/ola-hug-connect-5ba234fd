import { useMemo } from "react";

const PARTICLE_COUNT = 35;

const GalacticParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const size = Math.random() * 2.5 + 1;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const duration = Math.random() * 20 + 15;
      const delay = Math.random() * -30;
      const hue = 130 + Math.random() * 40;
      const opacity = Math.random() * 0.5 + 0.2;
      return { id: i, size, x, y, duration, delay, hue, opacity };
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full will-change-transform"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: `hsl(${p.hue} 70% 65%)`,
            opacity: p.opacity,
            animation: `particle-float-${p.id % 4} ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

export default GalacticParticles;
