const LandingBackground = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{ contain: "strict", willChange: "auto" }}
    >
      {/* Single background layer with all effects baked in — no individual GPU layers */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(800px 800px at 50% -15%, rgba(7,193,96,0.06) 0%, transparent 60%),
            radial-gradient(600px 600px at -8% 25%, rgba(7,193,96,0.04) 0%, transparent 60%),
            radial-gradient(600px 600px at 108% 45%, rgba(7,193,96,0.04) 0%, transparent 60%),
            radial-gradient(900px 600px at 50% 110%, rgba(7,193,96,0.05) 0%, transparent 55%)
          `,
        }}
      />

      {/* Static grid — single layer */}
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

      {/* Edge fade */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(11,15,20,0.7) 0%, transparent 8%, transparent 92%, rgba(11,15,20,0.85) 100%)",
        }}
      />
    </div>
  );
};

export default LandingBackground;
