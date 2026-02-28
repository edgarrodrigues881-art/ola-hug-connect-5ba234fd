import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, BarChart3, Wifi, WifiOff, Activity } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PerformanceBlock } from "@/components/dashboard/DeliveryRateCard";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
          <Card key={s.label} className="border-border/50 bg-card/80 backdrop-blur-sm">
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

      {/* Status das Instâncias */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            Status das Instâncias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted/30 rounded animate-pulse" />
              ))}
            </div>
          ) : (stats?.chips?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma instância cadastrada</p>
          ) : (
            <div className="space-y-1.5">
              {/* Header row */}
              <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
                <span>Instância</span>
                <span>Status</span>
                <span>Volume Hoje</span>
                <span>Última Atividade</span>
                <span>Proxy</span>
              </div>
              {stats!.chips.map((chip) => (
                <div
                  key={chip.id}
                  className="flex items-center sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 p-2.5 rounded-lg bg-muted/5 border border-border/20"
                >
                  {/* Name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 sm:flex-none">
                    <div className="w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                      {chip.profilePicture ? (
                        <img src={chip.profilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Smartphone className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{chip.number || chip.name}</p>
                      {chip.warmupDay && (
                        <p className="text-[10px] text-muted-foreground">Dia {chip.warmupDay}/{chip.warmupTotal}</p>
                      )}
                    </div>
                  </div>

                  {/* Connected/Disconnected */}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${chip.connected ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                    <span className="text-xs text-muted-foreground">
                      {chip.connected ? "Conectado" : "Desconectado"}
                    </span>
                  </div>

                  {/* Volume today */}
                  <div className="hidden sm:block">
                    <span className="text-xs text-foreground">{chip.volumeToday}</span>
                  </div>

                  {/* Last activity */}
                  <div className="hidden sm:block">
                    <span className="text-[11px] text-muted-foreground">
                      {chip.lastActivity
                        ? formatDistanceToNow(new Date(chip.lastActivity), { addSuffix: true, locale: ptBR })
                        : "—"}
                    </span>
                  </div>

                  {/* Proxy */}
                  <div className="hidden sm:block">
                    <span className="text-[11px] text-muted-foreground truncate">
                      {chip.proxyHost || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
