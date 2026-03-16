import dgLogo from "@/assets/dg-logo-crown.jpeg";
import { Megaphone, Sparkles, ShieldCheck, MessageCircle, UsersRound } from "lucide-react";
import { useEffect, useRef } from "react";

const benefits = [
  {
    icon: Megaphone,
    title: "Atualizações",
    desc: "Fique por dentro de novas funcionalidades assim que forem lançadas.",
  },
  {
    icon: Sparkles,
    title: "Melhorias",
    desc: "Receba avisos sobre otimizações e correções da ferramenta.",
  },
  {
    icon: ShieldCheck,
    title: "Dicas de Segurança",
    desc: "Boas práticas para manter seus chips e operações seguras.",
  },
  {
    icon: MessageCircle,
    title: "Comunidade",
    desc: "Tire dúvidas, compartilhe experiências e evolua junto com outros usuários.",
  },
];

function GoldParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; decay: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => {
      if (particles.length < 25) {
        particles.push({
          x: Math.random() * canvas.offsetWidth,
          y: Math.random() * canvas.offsetHeight,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.4 - 0.1,
          size: Math.random() * 2 + 0.5,
          alpha: Math.random() * 0.5 + 0.2,
          decay: Math.random() * 0.003 + 0.001,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
        ctx.fill();
      }
      spawn();
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

const Community = () => {
  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center px-4 py-12 relative overflow-hidden mx-auto">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.07)_0%,transparent_60%)]" />
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.12)_0%,transparent_50%)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[radial-gradient(ellipse,hsl(var(--primary)/0.06)_0%,transparent_70%)]" />
        <GoldParticles />
      </div>

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center gap-10">
        {/* Logo with animated gold ring */}
        <div className="relative flex items-center justify-center">
          {/* Outer glow pulse */}
          <div className="absolute w-72 h-72 rounded-2xl bg-[radial-gradient(circle,rgba(212,175,55,0.15)_0%,transparent_65%)] blur-2xl animate-[pulse_3s_ease-in-out_infinite]" />
          {/* White glow behind gold border */}
          <div className="absolute w-64 h-64 rounded-2xl shadow-[0_0_60px_rgba(255,255,255,0.08),0_0_120px_rgba(255,255,255,0.04)] pointer-events-none" />
          {/* Animated conic border */}
          <div className="relative w-60 h-60 rounded-2xl p-[3px] shadow-[0_0_40px_rgba(212,175,55,0.3),0_0_80px_rgba(212,175,55,0.1)] overflow-hidden">
            <div
              className="absolute inset-[-50%] rounded-2xl"
              style={{
                background: "conic-gradient(from 0deg, #b8860b, #d4af37, #f5d76e, #fffbe6, #f5d76e, #d4af37, #b8860b)",
                animation: "spin-slow 4s linear infinite",
              }}
            />
            {/* Inner white glow between gold border and logo */}
            <div className="relative w-full h-full rounded-[13px] bg-background flex items-center justify-center overflow-hidden z-10 shadow-[inset_0_0_30px_rgba(255,255,255,0.06)]">
              <img
                src={dgLogo}
                alt="DG Contingência PRO"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2.5">
          <p className="text-[11px] font-bold tracking-[0.4em] uppercase text-[#d4af37]/70">
            Comunidade Exclusiva
          </p>
          <h1 className="text-3xl sm:text-[2.5rem] font-bold tracking-tight text-foreground leading-tight">
            DG Contingência{" "}
            <span className="bg-gradient-to-r from-[#d4af37] via-[#f5d76e] to-[#d4af37] bg-clip-text text-transparent">
              PRO
            </span>
          </h1>
          <p className="text-sm sm:text-[15px] text-muted-foreground max-w-md mx-auto leading-relaxed mt-3">
            Receba atualizações, melhorias, correções e avisos importantes da ferramenta em primeira mão.
          </p>
        </div>

        {/* Benefit cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="group flex items-start gap-3.5 rounded-xl border border-border/30 bg-card/40 backdrop-blur-md p-4 transition-all duration-300 hover:border-[#d4af37]/25 hover:bg-card/70 hover:shadow-[0_0_25px_rgba(212,175,55,0.06)]"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/20 group-hover:border-primary/40 group-hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)]">
                <item.icon className="w-[18px] h-[18px] text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground leading-tight">{item.title}</p>
                <p className="text-[12px] text-muted-foreground leading-snug mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <a
            href="https://chat.whatsapp.com/KpkJQCdw7i10ICftI1tpBf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-all duration-300 shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_35px_hsl(var(--primary)/0.35)] hover:bg-primary/90"
          >
            <UsersRound className="w-4 h-4" />
            Entrar na Comunidade
          </a>
          <a
            href="https://wa.me/5562994192500?text=Ol%C3%A1%2C%20vim%20do%20site%20da%20DG%20Conting%C3%AAncia%20PRO%20e%20preciso%20de%20suporte."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 flex-1 h-12 rounded-xl border border-border/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent/40 transition-all duration-300"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com Suporte
          </a>
        </div>

        <p className="text-[11px] text-muted-foreground/30 text-center">
          Ao entrar, você concorda em receber comunicados oficiais da DG Contingência PRO.
        </p>
      </div>
    </div>
  );
};

export default Community;
