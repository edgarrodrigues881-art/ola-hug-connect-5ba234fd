import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Send, Megaphone } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useNavigate } from "react-router-dom";

const techStatusConfig = {
  ok: { label: "OK", className: "bg-success/15 text-success border-success/30" },
  warning: { label: "Warning", className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  risk: { label: "Risk", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  scheduled: "Agendada",
  running: "Enviando",
  completed: "Concluída",
  failed: "Falhou",
  paused: "Pausada",
};

const DashboardHome = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const navigate = useNavigate();

  const totalSent = stats?.totalSent ?? 0;

  const topCards = [
    {
      label: "Chips Ativos",
      value: stats?.chipsActive ?? 0,
      icon: Smartphone,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Mensagens Enviadas",
      value: totalSent,
      icon: Send,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Campanhas",
      value: stats?.recentCampaigns?.length ?? 0,
      icon: Megaphone,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu sistema</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {topCards.map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground truncate">{s.label}</p>
                  <p className="text-xl font-bold text-foreground">{isLoading ? "..." : s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campanhas Recentes */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground">Campanhas Recentes</CardTitle>
            <button
              onClick={() => navigate("/dashboard/campaigns")}
              className="text-xs text-primary hover:underline"
            >
              Ver todas
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {!stats?.recentCampaigns?.length ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma campanha ainda</p>
          ) : (
            stats.recentCampaigns.map((c) => {
              const cfg = techStatusConfig[c.techStatus];
              return (
                <div key={c.id} className="p-2.5 rounded-lg bg-muted/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {statusLabels[c.status] || c.status}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[11px] text-muted-foreground">
                    <span>{c.sentCount} enviadas</span>
                    <span>{c.deliveredCount} entregues</span>
                    <span className={c.failedCount > 0 ? "text-destructive" : ""}>{c.failedCount} falhas</span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
