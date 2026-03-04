import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Wifi, WifiOff, Activity } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PerformanceBlock } from "@/components/dashboard/DeliveryRateCard";
import { ActivityChart } from "@/components/dashboard/ActivityChart";

const DashboardHome = () => {
  const { data: stats, isLoading } = useDashboardStats();

  const topCards = [
    {
      label: "Chips Online",
      value: stats?.chipsOnline ?? 0,
      icon: Wifi,
      iconClass: "text-emerald-500",
      bgClass: "bg-emerald-500/10",
    },
    {
      label: "Chips Ativos",
      value: stats?.chipsActive ?? 0,
      icon: Activity,
      iconClass: "text-emerald-500",
      bgClass: "bg-emerald-500/10",
    },
    {
      label: "Chips Inativos",
      value: stats?.chipsInactive ?? 0,
      icon: WifiOff,
      iconClass: "text-muted-foreground",
      bgClass: "bg-muted/20",
    },
    {
      label: "Média Diária/Chip",
      value: stats?.avgMessagesPerDay ?? 0,
      icon: BarChart3,
      iconClass: "text-muted-foreground",
      bgClass: "bg-muted/20",
    },
    {
      label: "Taxa Média Entrega",
      value: stats?.avgDeliveryRate ?? 100,
      icon: Activity,
      iconClass: "text-emerald-500",
      bgClass: "bg-emerald-500/10",
      suffix: "%",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <GreetingHeader />
        <QuickActions />
      </div>

      {/* Status Operacional */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {topCards.map((s) => (
          <Card key={s.label} className="border-border/50 bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.bgClass} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.iconClass}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <div className="text-xl font-bold text-foreground">
                    {isLoading ? (
                      <span className="inline-block w-6 h-5 bg-muted/50 rounded animate-pulse" />
                    ) : (
                      <>
                        <AnimatedCounter value={s.value} />
                        {s.suffix && <span className="text-xs text-muted-foreground font-normal">{s.suffix}</span>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desempenho + Gráfico */}
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
