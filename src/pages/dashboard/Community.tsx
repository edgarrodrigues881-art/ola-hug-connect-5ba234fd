import dgLogo from "@/assets/dg-logo-crown.jpeg";
import { Megaphone, Sparkles, ShieldCheck, MessageCircle, UsersRound } from "lucide-react";

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

const Community = () => {
  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial gold glow behind logo area */}
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.08)_0%,transparent_70%)]" />
        {/* Subtle green glow at bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[radial-gradient(ellipse,hsl(var(--primary)/0.06)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center gap-10">
        {/* Logo with gold ring */}
        <div className="relative flex items-center justify-center">
          {/* Outer gold glow */}
          <div className="absolute w-32 h-32 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.2)_0%,transparent_70%)] blur-xl" />
          {/* Gold ring */}
          <div className="relative w-24 h-24 rounded-full p-[3px] bg-gradient-to-br from-[#d4af37] via-[#f5d76e] to-[#b8860b] shadow-[0_0_30px_rgba(212,175,55,0.25)]">
            <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
              <img
                src={dgLogo}
                alt="DG Contingência PRO"
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <p className="text-xs font-bold tracking-[0.35em] uppercase text-[#d4af37]/80">
            Comunidade Oficial
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            DG Contingência{" "}
            <span className="bg-gradient-to-r from-[#d4af37] via-[#f5d76e] to-[#d4af37] bg-clip-text text-transparent">
              PRO
            </span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed mt-3">
            Receba atualizações, melhorias, correções e avisos importantes da ferramenta em primeira mão.
          </p>
        </div>

        {/* Benefit cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="group flex items-start gap-3.5 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 transition-all duration-300 hover:border-[#d4af37]/30 hover:bg-card/80 hover:shadow-[0_0_20px_rgba(212,175,55,0.05)]"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center transition-colors duration-300 group-hover:bg-primary/15 group-hover:border-primary/30">
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
            className="flex items-center justify-center gap-2 flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-300 shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
          >
            <UsersRound className="w-4 h-4" />
            Entrar na Comunidade
          </a>
          <a
            href="https://wa.me/5562994192500?text=Ol%C3%A1%2C%20vim%20do%20site%20da%20DG%20Conting%C3%AAncia%20PRO%20e%20preciso%20de%20suporte."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 flex-1 h-12 rounded-xl border border-border/60 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent/50 transition-all duration-300"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com Suporte
          </a>
        </div>

        {/* Subtle footer note */}
        <p className="text-[11px] text-muted-foreground/40 text-center">
          Ao entrar, você concorda em receber comunicados oficiais da DG Contingência PRO.
        </p>
      </div>
    </div>
  );
};

export default Community;
