import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Send, Megaphone } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useNavigate } from "react-router-dom";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DeviceStatusList } from "@/components/dashboard/DeviceStatusList";
import { DeliveryRateCard } from "@/components/dashboard/DeliveryRateCard";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { ActivityTimeline, type TimelineEvent } from "@/components/dashboard/ActivityTimeline";


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

  const topCards = [
    {
      label: "Chips Ativos",
      value: stats?.chipsActive ?? 0,
      icon: Smartphone,
      gradient: "from-emerald-500/20 to-emerald-500/5",
      glow: "shadow-emerald-500/10",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/15",
    },
    {
      label: "Mensagens Enviadas",
      value: stats?.totalSent ?? 0,
      icon: Send,
      gradient: "from-violet-500/20 to-violet-500/5",
      glow: "shadow-violet-500/10",
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/15",
    },
    {
      label: "Campanhas",
      value: stats?.recentCampaigns?.length ?? 0,
      icon: Megaphone,
      gradient: "from-blue-500/20 to-blue-500/5",
      glow: "shadow-blue-500/10",
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/15",
    },
  ];

  // Build timeline from campaigns
  const timelineEvents: TimelineEvent[] = (stats?.recentCampaigns || []).map((c) => ({
    id: c.id,
    type: "campaign" as const,
    title: c.name,
    description: `${statusLabels[c.status] || c.status} — ${c.sentCount} enviadas`,
    timestamp: c.createdAt,
  }));

  return (
    <div className="space-y-6">
      {/* Header + Quick Actions */}
      <div className="animate-fade-in flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <GreetingHeader />
        <QuickActions />
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {topCards.map((s, i) => (
          <div
            key={s.label}
            className="animate-fade-in"
            style={{ animationDelay: `${i * 100 + 100}ms` }}
          >
            <Card className={`relative overflow-hidden border-border/50 bg-gradient-to-br ${s.gradient} backdrop-blur-sm shadow-lg ${s.glow} hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer`}>
              <div className="absolute inset-0 rounded-xl border border-white/[0.05]" />
              <CardContent className="p-5 relative">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0 ring-1 ring-white/[0.05]`}>
                    <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground/80 tracking-wide uppercase">{s.label}</p>
                    <div className="text-2xl font-bold text-foreground mt-0.5">
                      {isLoading ? (
                        <span className="inline-block w-8 h-6 bg-muted/50 rounded animate-pulse" />
                      ) : (
                        <AnimatedCounter value={s.value} />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Chart + Delivery Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: "400ms" }}>
        <div className="lg:col-span-2">
          <ActivityChart data={stats?.activityData || []} />
        </div>
        <DeliveryRateCard
          rate={stats?.deliveryRate ?? 100}
          totalSent={stats?.totalSent ?? 0}
          totalDelivered={stats?.totalDelivered ?? 0}
          totalFailed={stats?.totalFailed ?? 0}
        />
      </div>

      {/* Devices + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "500ms" }}>
        <DeviceStatusList devices={stats?.devices || []} loading={isLoading} />
        <ActivityTimeline events={timelineEvents} />
      </div>

      {/* Campanhas Recentes */}
      <div className="animate-fade-in" style={{ animationDelay: "600ms" }}>
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Campanhas Recentes</CardTitle>
              <button
                onClick={() => navigate("/dashboard/campaign-list")}
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
                  <div key={c.id} className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-1.5 hover:bg-muted/50 transition-colors">
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

    </div>
  );
};

export default DashboardHome;
