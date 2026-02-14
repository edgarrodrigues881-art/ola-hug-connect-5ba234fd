import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  CheckCircle,
  XCircle,
  MessageSquare,
  Download,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

const campaignData = [
  { id: 1, name: "Promoção Janeiro", sent: 1500, delivered: 1470, failed: 30, replies: 180, date: "2026-01-15" },
  { id: 2, name: "Follow-up Leads", sent: 450, delivered: 438, failed: 12, replies: 67, date: "2026-01-22" },
  { id: 3, name: "Black Friday", sent: 3200, delivered: 3140, failed: 60, replies: 412, date: "2026-02-01" },
  { id: 4, name: "Lançamento Produto", sent: 890, delivered: 872, failed: 18, replies: 95, date: "2026-02-07" },
  { id: 5, name: "Reativação", sent: 620, delivered: 601, failed: 19, replies: 43, date: "2026-02-12" },
];

const dailyData = [
  { dia: "08/02", enviadas: 320, entregues: 314, falhas: 6 },
  { dia: "09/02", enviadas: 450, entregues: 441, falhas: 9 },
  { dia: "10/02", enviadas: 280, entregues: 273, falhas: 7 },
  { dia: "11/02", enviadas: 510, entregues: 498, falhas: 12 },
  { dia: "12/02", enviadas: 620, entregues: 601, falhas: 19 },
  { dia: "13/02", enviadas: 380, entregues: 374, falhas: 6 },
  { dia: "14/02", enviadas: 470, entregues: 462, falhas: 8 },
];

const totals = campaignData.reduce(
  (acc, c) => ({
    sent: acc.sent + c.sent,
    delivered: acc.delivered + c.delivered,
    failed: acc.failed + c.failed,
    replies: acc.replies + c.replies,
  }),
  { sent: 0, delivered: 0, failed: 0, replies: 0 }
);

const pieData = [
  { name: "Entregues", value: totals.delivered },
  { name: "Falhas", value: totals.failed },
];

const PIE_COLORS = ["hsl(152, 55%, 42%)", "hsl(0, 72%, 51%)"];

const Reports = () => {
  const { toast } = useToast();
  const [period, setPeriod] = useState("week");

  const exportCSV = () => {
    const rows = [["Campanha", "Enviadas", "Entregues", "Falhas", "Respostas", "Data"]];
    campaignData.forEach((c) =>
      rows.push([c.name, String(c.sent), String(c.delivered), String(c.failed), String(c.replies), c.date])
    );
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Relatório exportado", description: "Arquivo CSV baixado com sucesso." });
  };

  const stats = [
    { label: "Total Enviado", value: totals.sent.toLocaleString(), icon: Send, color: "text-primary" },
    { label: "Entregues", value: totals.delivered.toLocaleString(), icon: CheckCircle, color: "text-success" },
    { label: "Falhas", value: totals.failed.toLocaleString(), icon: XCircle, color: "text-destructive" },
    { label: "Respostas", value: totals.replies.toLocaleString(), icon: MessageSquare, color: "text-primary" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatório</h1>
          <p className="text-sm text-muted-foreground">Métricas detalhadas de envio e entrega</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mês</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Envios Diários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorEntregues" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(152, 55%, 42%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(152, 55%, 42%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFalhas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 12%, 90%)" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
                  <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(150, 12%, 90%)", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area type="monotone" dataKey="entregues" name="Entregues" stroke="hsl(152, 55%, 42%)" strokeWidth={2} fillOpacity={1} fill="url(#colorEntregues)" />
                  <Area type="monotone" dataKey="falhas" name="Falhas" stroke="hsl(0, 72%, 51%)" strokeWidth={2} fillOpacity={1} fill="url(#colorFalhas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Taxa de Entrega</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {((totals.delivered / totals.sent) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">de entrega geral</p>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success" /> Entregues
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive" /> Falhas
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Breakdown */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Por Campanha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 12%, 90%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(160, 10%, 45%)" width={120} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="delivered" name="Entregues" fill="hsl(152, 55%, 42%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="failed" name="Falhas" fill="hsl(0, 72%, 51%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="replies" name="Respostas" fill="hsl(210, 60%, 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-3 text-left font-medium text-muted-foreground text-xs">Campanha</th>
                <th className="p-3 text-right font-medium text-muted-foreground text-xs">Enviadas</th>
                <th className="p-3 text-right font-medium text-muted-foreground text-xs">Entregues</th>
                <th className="p-3 text-right font-medium text-muted-foreground text-xs">Falhas</th>
                <th className="p-3 text-right font-medium text-muted-foreground text-xs">Respostas</th>
                <th className="p-3 text-right font-medium text-muted-foreground text-xs">Taxa</th>
                <th className="p-3 text-right font-medium text-muted-foreground text-xs">Data</th>
              </tr>
            </thead>
            <tbody>
              {campaignData.map((c) => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-medium text-foreground">{c.name}</td>
                  <td className="p-3 text-right text-muted-foreground">{c.sent.toLocaleString()}</td>
                  <td className="p-3 text-right text-success font-medium">{c.delivered.toLocaleString()}</td>
                  <td className="p-3 text-right text-destructive font-medium">{c.failed}</td>
                  <td className="p-3 text-right text-primary font-medium">{c.replies}</td>
                  <td className="p-3 text-right">
                    <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[10px]">
                      {((c.delivered / c.sent) * 100).toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="p-3 text-right text-muted-foreground text-xs">{c.date}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-semibold">
                <td className="p-3 text-foreground">Total</td>
                <td className="p-3 text-right text-foreground">{totals.sent.toLocaleString()}</td>
                <td className="p-3 text-right text-success">{totals.delivered.toLocaleString()}</td>
                <td className="p-3 text-right text-destructive">{totals.failed}</td>
                <td className="p-3 text-right text-primary">{totals.replies}</td>
                <td className="p-3 text-right">
                  <Badge variant="outline" className="bg-success/15 text-success border-success/30 text-[10px]">
                    {((totals.delivered / totals.sent) * 100).toFixed(1)}%
                  </Badge>
                </td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
