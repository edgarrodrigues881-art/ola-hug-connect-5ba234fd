import { useMemo } from "react";

const PARTICLE_COUNT = 12;
const ORB_COUNT = 2;

const GalacticParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const size = Math.random() * 3 + 1;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const duration = Math.random() * 20 + 15;
      const delay = Math.random() * -30;
      const hue = 130 + Math.random() * 40;
      const opacity = Math.random() * 0.6 + 0.2;
      const driftX = (Math.random() - 0.5) * 60;
      const driftY = (Math.random() - 0.5) * 60;
      return { id: i, size, x, y, duration, delay, hue, opacity, driftX, driftY };
    });
  }, []);

  const orbs = useMemo(() => {
    return Array.from({ length: ORB_COUNT }, (_, i) => {
      const size = Math.random() * 300 + 150;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const duration = Math.random() * 30 + 20;
      const delay = Math.random() * -15;
      const hue = 130 + Math.random() * 50;
      return { id: i, size, x, y, duration, delay, hue };
    });
  }, []);

  return (
    <>
      <style>{`
        @keyframes particle-drift {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: var(--p-opacity); }
          25% { transform: translate(calc(var(--dx) * 0.5px), calc(var(--dy) * -1px)) scale(1.5); opacity: calc(var(--p-opacity) * 1.5); }
          50% { transform: translate(var(--dx), var(--dy)) scale(0.8); opacity: calc(var(--p-opacity) * 0.6); }
          75% { transform: translate(calc(var(--dx) * -0.3px), calc(var(--dy) * 0.5px)) scale(1.2); opacity: var(--p-opacity); }
        }
        @keyframes orb-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.12; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.25; }
        }
        @keyframes orb-drift {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          33% { transform: translate(calc(-50% + 30px), calc(-50% - 20px)) scale(1.15); }
          66% { transform: translate(calc(-50% - 20px), calc(-50% + 30px)) scale(0.9); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: var(--p-opacity); }
          50% { opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden" style={{ contain: 'strict' }}>
        {/* Floating orbs */}
        {orbs.map((o) => (
          <div
            key={`orb-${o.id}`}
            className="absolute rounded-full"
            style={{
              width: o.size,
              height: o.size,
              left: `${o.x}%`,
              top: `${o.y}%`,
              background: `radial-gradient(circle, hsl(${o.hue} 70% 45% / 0.3) 0%, transparent 70%)`,
              animation: `orb-pulse ${o.duration}s ease-in-out ${o.delay}s infinite`,
              filter: 'blur(60px)',
              willChange: 'opacity',
            }}
          />
        ))}

        {/* Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              background: `hsl(${p.hue} 70% 65%)`,
              boxShadow: `0 0 ${p.size * 3}px hsl(${p.hue} 70% 65% / 0.4)`,
              '--p-opacity': p.opacity,
              '--dx': `${p.driftX}px`,
              '--dy': `${p.driftY}px`,
              animation: `twinkle ${p.duration * 0.5}s ease-in-out ${p.delay}s infinite`,
              willChange: 'opacity',
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
};

export default GalacticParticles;
