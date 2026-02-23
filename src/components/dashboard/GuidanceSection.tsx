import { BookOpen, MessageCircle, Smartphone, Users, Megaphone, Settings, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    icon: Smartphone,
    title: "Conecte seu chip",
    description: "Adicione e conecte seu número de WhatsApp para começar a enviar mensagens.",
    route: "/dashboard/devices",
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
  {
    icon: Users,
    title: "Importe contatos",
    description: "Adicione seus contatos manualmente ou importe via arquivo Excel/CSV.",
    route: "/dashboard/contacts",
    color: "text-blue-400",
    bg: "bg-blue-500/15",
  },
  {
    icon: BookOpen,
    title: "Crie templates",
    description: "Monte modelos de mensagem com texto, imagem, áudio e botões.",
    route: "/dashboard/templates",
    color: "text-violet-400",
    bg: "bg-violet-500/15",
  },
  {
    icon: Megaphone,
    title: "Lance campanhas",
    description: "Envie mensagens em massa para seus contatos de forma automatizada.",
    route: "/dashboard/campaigns",
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
  {
    icon: MessageCircle,
    title: "Acompanhe resultados",
    description: "Monitore entregas, falhas e taxas de sucesso no painel principal.",
    route: "/dashboard",
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
  },
  {
    icon: Settings,
    title: "Configure ajustes",
    description: "Personalize respostas automáticas, warmup e integrações.",
    route: "/dashboard/settings",
    color: "text-rose-400",
    bg: "bg-rose-500/15",
  },
];

export const GuidanceSection = () => {
  const navigate = useNavigate();

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Orientação — Como usar a plataforma
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {steps.map((step, i) => (
            <button
              key={step.title}
              onClick={() => navigate(step.route)}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 hover:border-border/60 transition-all text-left group"
            >
              <div className={`w-9 h-9 rounded-lg ${step.bg} flex items-center justify-center shrink-0`}>
                <step.icon className={`w-4 h-4 ${step.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground/60 font-medium">Passo {i + 1}</span>
                </div>
                <p className="text-sm font-medium text-foreground truncate">{step.title}</p>
                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{step.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground/60 mt-1 shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
