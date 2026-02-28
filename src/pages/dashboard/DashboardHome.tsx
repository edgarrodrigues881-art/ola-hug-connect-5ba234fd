import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Smartphone,
  Flame,
  AlertTriangle,
  BarChart3,
  Shield,
  AlertCircle,
  TrendingUp,
  Pause,
} from "lucide-react";
import { useDashboardStats, type SmartAlert } from "@/hooks/useDashboardStats";
import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { GreetingHeader } from "@/components/dashboard/GreetingHeader";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { DeliveryRateCard } from "@/components/dashboard/DeliveryRateCard";
import { ActivityChart } from "@/components/dashboard/ActivityChart";

const DashboardHome = () => {
  const { data: stats, isLoading } = useDashboardStats();

  const scoreColor = (s: number) =>
    s >= 75 ? "text-emerald-400" : s >= 50 ? "text-yellow-400" : "text-red-400";
  const scoreBg = (s: number) =>
    s >= 75 ? "bg-emerald-500/15" : s >= 50 ? "bg-yellow-500/15" : "bg-red-500/15";

  const topCards = [
    {
      label: "Chips Online",
      value: stats?.chipsOnline ?? 0,
      icon: Smartphone,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/15",
    },
    {
      label: "Em Aquecimento",
      value: stats?.chipsWarming ?? 0,
      icon: Flame,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/15",
    },
    {
      label: "Em Risco",
      value: stats?.chipsAtRisk ?? 0,
      icon: AlertTriangle,
      iconColor: "text-red-400",
      iconBg: "bg-red-500/15",
    },
    {
      label: "Média Diária/Chip",
      value: stats?.avgMessagesPerDay ?? 0,
      icon: BarChart3,
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/15",
    },
    {
      label: "Score do Sistema",
      value: stats?.systemScore ?? 0,
      icon: Shield,
      iconColor: scoreColor(stats?.systemScore ?? 0),
      iconBg: scoreBg(stats?.systemScore ?? 0),
      suffix: "/100",
    },
  ];

  const alertConfig: Record<SmartAlert["type"], { icon: typeof AlertCircle; className: string }> = {
    danger: { icon: AlertCircle, className: "border-red-500/30 bg-red-500/5 text-red-400" },
    warning: { icon: Pause, className: "border-yellow-500/30 bg-yellow-500/5 text-yellow-500" },
    success: { icon: TrendingUp, className: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <GreetingHeader />
        <QuickActions />
      </div>

      {/* Top Stats - 5 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {topCards.map((s) => (
          <Card key={s.label} className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.iconColor}`} />
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

      {/* Alerts */}
      {(stats?.alerts?.length ?? 0) > 0 && (
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Alertas Automáticos
              <Badge variant="secondary" className="text-[10px] ml-1">{stats!.alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats!.alerts.slice(0, 6).map((alert) => {
              const cfg = alertConfig[alert.type];
              const Icon = cfg.icon;
              return (
                <div key={alert.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${cfg.className}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-foreground">
                      {alert.chipNumber || alert.chipName}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">{alert.message}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Chart + Delivery Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityChart data={stats?.warmupEvolution || []} />
        </div>
        <DeliveryRateCard
          rate={stats?.deliveryRate ?? 100}
          totalSent={stats?.totalSent ?? 0}
          totalDelivered={stats?.totalDelivered ?? 0}
          totalFailed={stats?.totalFailed ?? 0}
        />
      </div>

      {/* Chip Health Table */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Saúde dos Chips
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
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum chip cadastrado</p>
          ) : (
            <div className="space-y-2">
              {stats!.chips.map((chip) => {
                const scoreCol = scoreColor(chip.score);
                return (
                  <div
                    key={chip.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/10 border border-border/20"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                      {chip.profilePicture ? (
                        <img src={chip.profilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Name + Status */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">
                        {chip.number || chip.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${chip.status === "Ready" ? "bg-emerald-400" : "bg-red-400"}`} />
                        <span className="text-[10px] text-muted-foreground">
                          {chip.warmupDay ? `Dia ${chip.warmupDay}/${chip.warmupTotal}` : chip.status === "Ready" ? "Online" : "Offline"}
                        </span>
                        {chip.warmupStatus === "running" && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-400 border-amber-500/20">
                            <Flame className="w-2.5 h-2.5 mr-0.5" /> Aquecendo
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Daily msgs */}
                    <div className="text-center shrink-0 hidden sm:block">
                      <p className="text-xs font-medium text-foreground">{chip.messagesSentToday}/{chip.messagesPerDay}</p>
                      <p className="text-[9px] text-muted-foreground">hoje/limite</p>
                    </div>

                    {/* Fails */}
                    <div className="text-center shrink-0 hidden sm:block">
                      <p className={`text-xs font-medium ${chip.failCount > 5 ? "text-red-400" : "text-foreground"}`}>
                        {chip.failCount}
                      </p>
                      <p className="text-[9px] text-muted-foreground">falhas</p>
                    </div>

                    {/* Score */}
                    <div className="flex items-center gap-2 shrink-0 w-24">
                      <Progress value={chip.score} className="h-1.5 flex-1" />
                      <span className={`text-xs font-bold ${scoreCol} w-7 text-right`}>{chip.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
