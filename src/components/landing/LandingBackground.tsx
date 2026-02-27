const LandingBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Static mesh gradient blobs */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          top: "-15%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(circle, rgba(7,193,96,0.07) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          top: "25%",
          left: "-8%",
          background: "radial-gradient(circle, rgba(7,193,96,0.05) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          top: "45%",
          right: "-8%",
          background: "radial-gradient(circle, rgba(7,193,96,0.05) 0%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <div
        className="absolute w-[900px] h-[600px] rounded-full"
        style={{
          bottom: "-10%",
          left: "50%",
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse, rgba(7,193,96,0.06) 0%, transparent 65%)",
          filter: "blur(100px)",
        }}
      />

      {/* Subtle static grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(7,193,96,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(7,193,96,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse at 50% 40%, black 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 0%, transparent 70%)",
        }}
      />

      {/* Edge fade — top & bottom only */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to bottom, rgba(11,15,20,0.7) 0%, transparent 8%, transparent 92%, rgba(11,15,20,0.85) 100%)
          `,
        }}
      />
    </div>
  );
};

export default LandingBackground;
