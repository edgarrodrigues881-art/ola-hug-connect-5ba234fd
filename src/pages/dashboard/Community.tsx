import dgGroupAvatar from "@/assets/dg-group-avatar.png";
import { UsersRound, MessageCircle, Megaphone, Sparkles, ShieldCheck } from "lucide-react";

const Community = () => {
  return (
    <div className="max-w-2xl mx-auto py-10 px-4 flex flex-col items-center gap-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 text-center">
        <img
          src={dgGroupAvatar}
          alt="DG Contingência"
          className="w-20 h-20 rounded-full ring-2 ring-primary/30"
        />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comunidade DG Contingência</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-md">
            Participe da nossa comunidade oficial no WhatsApp para receber atualizações, melhorias e novidades em primeira mão.
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {[
          { icon: Megaphone, title: "Atualizações", desc: "Fique por dentro de cada nova funcionalidade assim que for lançada." },
          { icon: Sparkles, title: "Melhorias", desc: "Receba avisos de otimizações e correções no sistema." },
          { icon: ShieldCheck, title: "Dicas de Segurança", desc: "Boas práticas para manter seus chips saudáveis." },
          { icon: MessageCircle, title: "Suporte da Comunidade", desc: "Tire dúvidas e troque experiências com outros usuários." },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-4"
          >
            <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <item.icon className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
              <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">{item.desc}</p>
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
          className="flex items-center justify-center gap-2 flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <UsersRound className="w-4 h-4" />
          Entrar na Comunidade
        </a>
        <a
          href="https://wa.me/5562994192500?text=Ol%C3%A1%2C%20vim%20do%20site%20da%20DG%20Conting%C3%AAncia%20PRO%20e%20preciso%20de%20suporte."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 flex-1 h-11 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Falar com Suporte
        </a>
      </div>
    </div>
  );
};

export default Community;
