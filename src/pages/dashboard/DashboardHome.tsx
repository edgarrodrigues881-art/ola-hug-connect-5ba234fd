import { Card, CardContent } from "@/components/ui/card";
import { Wifi, WifiOff, Flame, MessageSquare, Smartphone } from "lucide-react";
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
    { label: "Conectadas", value: connectedCount, icon: Wifi, iconClass: "text-emerald-400", bgClass: "bg-emerald-500/10", dotColor: "bg-emerald-400" },
    { label: "Aquecendo", value: warmingCount, icon: Flame, iconClass: "text-amber-400", bgClass: "bg-amber-500/10", dotColor: "bg-amber-400" },
    { label: "Desconectadas", value: disconnectedCount, icon: WifiOff, iconClass: "text-red-400", bgClass: "bg-red-500/10", dotColor: "bg-red-400" },
    { label: "Msg Hoje", value: messagesToday, icon: MessageSquare, iconClass: "text-blue-400", bgClass: "bg-blue-500/10", dotColor: "bg-blue-400" },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <GreetingHeader />
        <QuickActions />
      </div>

      {/* Top Status Cards - compact */}
      <div className="grid grid-cols-4 gap-2">
        {topCards.map((s) => (
          <Card key={s.label} className="border-border/50 bg-card">
            <CardContent className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${s.bgClass} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.iconClass}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-bold text-foreground leading-tight">
                    {isLoading ? (
                      <span className="inline-block w-6 h-5 bg-muted/50 rounded animate-pulse" />
                    ) : (
                      <AnimatedCounter value={s.value} />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight truncate">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instâncias */}
      <div>
        <h2 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
          Instâncias
        </h2>
        <DeviceInstanceCards chips={chips} isLoading={isLoading} />
      </div>

      {/* Gráfico + Desempenho */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <ActivityChart data={stats?.warmupEvolution || []} />
        </div>
        {stats?.performance && <PerformanceBlock performance={stats.performance} />}
      </div>
    </div>
  );
};

export default DashboardHome;
