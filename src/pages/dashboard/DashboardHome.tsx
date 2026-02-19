import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone, TrendingUp, BarChart3, Wifi, Globe,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const techStatusConfig = {
  ok: { label: "OK", className: "bg-success/15 text-success border-success/30" },
  warning: { label: "Warning", className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  risk: { label: "Risk", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const DashboardHome = () => {
  const { data: stats, isLoading } = useDashboardStats();

  const topCards = [
    {
      label: "Chips Ativos",
      value: stats?.chipsActive ?? 0,
      icon: Smartphone,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Taxa de Entrega",
      value: `${stats?.deliveryRate ?? 0}%`,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Proxies",
      value: stats?.proxyStats.total ?? 0,
      icon: Globe,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header with system status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel</h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu sistema</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30">
          <Wifi className="w-3.5 h-3.5 text-success" />
          <span className="text-xs font-medium text-success">Sistema Online</span>
        </div>
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

      {/* Chart + Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Desempenho por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.hourlyData || []}>
                  <defs>
                    <linearGradient id="gradEnviadas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradEntregues" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(200, 80%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(200, 80%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 16%)" />
                  <XAxis dataKey="hora" tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 40%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(220, 10%, 40%)" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(220, 18%, 10%)",
                      border: "1px solid hsl(220, 15%, 20%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(220, 10%, 90%)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area type="monotone" dataKey="enviadas" name="Enviadas" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fillOpacity={1} fill="url(#gradEnviadas)" />
                  <Area type="monotone" dataKey="entregues" name="Entregues" stroke="hsl(200, 80%, 50%)" strokeWidth={2} fillOpacity={1} fill="url(#gradEntregues)" />
                  <Area type="monotone" dataKey="bloqueios" name="Bloqueios" stroke="hsl(0, 72%, 51%)" strokeWidth={1.5} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Campanhas Recentes */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Campanhas Recentes</CardTitle>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
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
                      <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
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
