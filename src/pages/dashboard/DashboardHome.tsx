import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, WifiOff, Flame, MessageSquare, BarChart3, Pause } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PerformanceBlock } from "@/components/dashboard/DeliveryRateCard";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { DeviceInstanceCards } from "@/components/dashboard/DeviceInstanceCards";

const DashboardHome = () => {
  const { data: stats, isLoading } = useDashboardStats();

  const chips = stats?.chips || [];
  const connectedCount = chips.filter((c) => c.connected).length;
  const warmingCount = chips.filter((c) => c.warmupStatus === "running").length;
  const disconnectedCount = chips.filter((c) => !c.connected).length;
  const messagesToday = chips.reduce((a, c) => a + c.volumeToday, 0);

  const topCards = [
    {
      label: "Conectadas",
      value: connectedCount,
      icon: Wifi,
      dotColor: "bg-emerald-400",
      iconClass: "text-emerald-400",
      bgClass: "bg-emerald-500/10",
    },
    {
      label: "Aquecendo",
      value: warmingCount,
      icon: Flame,
      dotColor: "bg-amber-400",
      iconClass: "text-amber-400",
      bgClass: "bg-amber-500/10",
    },
    {
      label: "Desconectadas",
      value: disconnectedCount,
      icon: WifiOff,
      dotColor: "bg-red-400",
      iconClass: "text-red-400",
      bgClass: "bg-red-500/10",
    },
    {
      label: "Mensagens Hoje",
      value: messagesToday,
      icon: MessageSquare,
      dotColor: "bg-blue-400",
      iconClass: "text-blue-400",
      bgClass: "bg-blue-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <GreetingHeader />
        <QuickActions />
      </div>

      {/* Top Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {topCards.map((s) => (
          <Card key={s.label} className="border-border/50 bg-card hover:border-border/80 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${s.bgClass} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.iconClass}`} />
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${s.dotColor}`} />
              </div>
              <div className="text-2xl font-bold text-foreground">
                {isLoading ? (
                  <span className="inline-block w-8 h-6 bg-muted/50 rounded animate-pulse" />
                ) : (
                  <AnimatedCounter value={s.value} />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instâncias */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Pause className="w-4 h-4 text-muted-foreground" />
          Instâncias
        </h2>
        <DeviceInstanceCards chips={chips} isLoading={isLoading} />
      </div>

      {/* Gráfico + Desempenho */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityChart data={stats?.warmupEvolution || []} />
        </div>
        {stats?.performance && <PerformanceBlock performance={stats.performance} />}
      </div>
    </div>
  );
};

export default DashboardHome;
