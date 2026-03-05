import { useEffect, useRef } from "react";
import createGlobe from "cobe";

interface GlobeProps {
  size?: number;
  className?: string;
}

export function InteractiveGlobe({ size = 420, className = "" }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;
    let width = 0;

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener("resize", onResize);
    onResize();

    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: size * 2,
      height: size * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 3,
      mapSamples: 16000,
      mapBrightness: 1.2,
      baseColor: [0.05, 0.2, 0.1],
      markerColor: [0.027, 0.757, 0.376],
      glowColor: [0.027, 0.757, 0.376],
      markers: [
        { location: [-23.5505, -46.6333], size: 0.06 },
        { location: [-22.9068, -43.1729], size: 0.05 },
        { location: [-15.7975, -47.8919], size: 0.04 },
        { location: [40.7128, -74.006], size: 0.05 },
        { location: [51.5074, -0.1278], size: 0.04 },
        { location: [35.6762, 139.6503], size: 0.04 },
      ],
      onRender: (state) => {
        state.phi = phi;
        phi += 0.005;
        state.width = size * 2;
        state.height = size * 2;
      },
    });

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [size]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.8,
          height: size * 0.8,
          background: "radial-gradient(circle, rgba(7,193,96,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          maxWidth: "100%",
          aspectRatio: "1",
        }}
      />
    </div>
  );
}

export default InteractiveGlobe;
