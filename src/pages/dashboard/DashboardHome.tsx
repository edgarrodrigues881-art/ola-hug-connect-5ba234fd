import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone, Send, CheckCircle, TrendingUp, AlertTriangle, Activity, Users, FileText, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useSystemStats } from "@/hooks/useSystemApi";

const hourlyData = [
  { hora: "08h", enviadas: 45 }, { hora: "09h", enviadas: 120 }, { hora: "10h", enviadas: 230 },
  { hora: "11h", enviadas: 180 }, { hora: "12h", enviadas: 90 }, { hora: "13h", enviadas: 60 },
  { hora: "14h", enviadas: 200 }, { hora: "15h", enviadas: 280 }, { hora: "16h", enviadas: 210 },
  { hora: "17h", enviadas: 150 }, { hora: "18h", enviadas: 80 },
];

const sessions = [
  { name: "Chip 01 – Vendas", status: "Ready", number: "+55 11 9****-1234" },
  { name: "Chip 02 – Suporte", status: "Ready", number: "+55 11 9****-5678" },
  { name: "Chip 03 – Marketing", status: "Disconnected", number: "+55 21 9****-9012" },
];

const statusColor: Record<string, string> = {
  Ready: "bg-success/15 text-success border-success/30",
  Disconnected: "bg-destructive/15 text-destructive border-destructive/30",
  Loading: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
};

const DashboardHome = () => {
  const { data: stats, isLoading } = useSystemStats();

  const dashStats = [
    { label: "Contatos", value: stats?.contacts.total ?? 0, icon: Users, trend: "Total cadastrado" },
    { label: "Campanhas", value: stats?.campaigns.total ?? 0, icon: Send, trend: `${stats?.campaigns.completed ?? 0} concluídas` },
    { label: "Mensagens Enviadas", value: stats?.campaigns.totalSent ?? 0, icon: TrendingUp, trend: `${stats?.campaigns.totalFailed ?? 0} falharam` },
    { label: "Templates", value: stats?.templates.total ?? 0, icon: FileText, trend: "Modelos salvos" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu sistema de mensagens</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashStats.map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground">{isLoading ? "..." : s.value}</p>
                  <p className="text-[11px] text-primary font-medium">{s.trend}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts + Recent campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Envio por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorEnviadas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152, 55%, 42%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(152, 55%, 42%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 12%, 90%)" />
                  <XAxis dataKey="hora" tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
                  <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(150, 12%, 90%)", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="enviadas" stroke="hsl(152, 55%, 42%)" strokeWidth={2} fillOpacity={1} fill="url(#colorEnviadas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Campaigns */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-foreground">Campanhas Recentes</CardTitle>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!stats?.campaigns.recent?.length ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma campanha ainda</p>
            ) : (
              stats.campaigns.recent.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">{c.total_contacts} contatos · {c.sent_count} enviadas</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${
                    c.status === "completed" ? "bg-success/15 text-success border-success/30" :
                    c.status === "processing" ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {c.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sessions */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-foreground">Sessões</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sessions.map((s) => (
              <div key={s.name} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground">{s.number}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${statusColor[s.status]}`}>{s.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHome;
