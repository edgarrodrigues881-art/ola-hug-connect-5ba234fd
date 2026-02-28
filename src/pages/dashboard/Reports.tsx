import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Smartphone,
  Flame,
  AlertTriangle,
  TrendingUp,
  Shield,
  Search,
  ArrowUpDown,
  ChevronRight,
  Wifi,
  WifiOff,
  Activity,
  XCircle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// ── Types ──
interface DeviceRow {
  id: string;
  name: string;
  number: string | null;
  status: string;
  created_at: string;
  profile_picture: string | null;
}

interface WarmupSessionRow {
  id: string;
  device_id: string;
  status: string;
  current_day: number;
  total_days: number;
  messages_sent_today: number;
  messages_sent_total: number;
  messages_per_day: number;
  daily_increment: number;
  min_delay_seconds: number;
  max_delay_seconds: number;
  created_at: string;
}

interface WarmupLogRow {
  id: string;
  device_id: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface ChipData {
  id: string;
  name: string;
  number: string;
  online: boolean;
  profilePicture: string | null;
  daysActive: number;
  warmupDay: number;
  totalDays: number;
  sentToday: number;
  sentTotal: number;
  avgDaily: number;
  growthPercent: number;
  failures: number;
  totalLogs: number;
  deliveryRate: number;
  riskLevel: "baixo" | "medio" | "alto";
  score: number;
  hasWarmup: boolean;
  dailyHistory: { day: string; sent: number; failed: number }[];
  disconnections: number;
  alerts: string[];
}

type SortKey = "score" | "riskLevel" | "deliveryRate" | "daysActive" | "sentToday";

// ── Helpers ──
function calcRisk(chip: { deliveryRate: number; failures: number; totalLogs: number; growthPercent: number; disconnections: number }): { level: "baixo" | "medio" | "alto"; score: number } {
  let score = 100;
  const failRate = chip.totalLogs > 0 ? (chip.failures / chip.totalLogs) * 100 : 0;

  // Fail rate penalty
  if (failRate > 8) score -= 35;
  else if (failRate > 4) score -= 20;
  else if (failRate > 2) score -= 8;

  // Delivery rate penalty
  if (chip.deliveryRate < 90) score -= 30;
  else if (chip.deliveryRate < 95) score -= 15;
  else if (chip.deliveryRate < 98) score -= 5;

  // Growth spike penalty
  if (chip.growthPercent > 50) score -= 25;
  else if (chip.growthPercent > 30) score -= 12;

  // Disconnection penalty
  score -= Math.min(chip.disconnections * 5, 20);

  score = Math.max(0, Math.min(100, score));

  const level = score >= 70 ? "baixo" : score >= 40 ? "medio" : "alto";
  return { level, score };
}

const riskConfig = {
  baixo: { label: "Baixo", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  medio: { label: "Médio", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", dot: "bg-amber-400" },
  alto: { label: "Alto", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", dot: "bg-red-400" },
};

// ── Component ──
const Reports = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedChip, setSelectedChip] = useState<ChipData | null>(null);

  // Fetch devices
  const { data: devices = [] } = useQuery({
    queryKey: ["report-devices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("id, name, number, status, created_at, profile_picture")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DeviceRow[];
    },
    enabled: !!user,
  });

  // Fetch warmup sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ["report-warmup-sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warmup_sessions")
        .select("id, device_id, status, current_day, total_days, messages_sent_today, messages_sent_total, messages_per_day, daily_increment, min_delay_seconds, max_delay_seconds, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WarmupSessionRow[];
    },
    enabled: !!user,
  });

  // Fetch warmup logs
  const { data: logs = [] } = useQuery({
    queryKey: ["report-warmup-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warmup_logs")
        .select("id, device_id, status, error_message, created_at")
        .order("created_at", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return data as WarmupLogRow[];
    },
    enabled: !!user,
  });

  // Build chip data
  const chips = useMemo<ChipData[]>(() => {
    return devices.map((device) => {
      const deviceSessions = sessions.filter((s) => s.device_id === device.id);
      const activeSession = deviceSessions.find((s) => s.status === "running") || deviceSessions[0];
      const deviceLogs = logs.filter((l) => l.device_id === device.id);

      const daysActive = Math.max(1, Math.floor((Date.now() - new Date(device.created_at).getTime()) / 86400000));
      const sentTotal = activeSession?.messages_sent_total || deviceLogs.filter((l) => l.status === "sent").length;
      const sentToday = activeSession?.messages_sent_today || 0;
      const failures = deviceLogs.filter((l) => l.status === "error" || l.status === "failed").length;
      const totalLogs = deviceLogs.length;
      const deliveryRate = totalLogs > 0 ? ((totalLogs - failures) / totalLogs) * 100 : 100;
      const avgDaily = Math.round(sentTotal / daysActive);

      // Growth: compare last 2 days
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const todayCount = deviceLogs.filter((l) => new Date(l.created_at).toDateString() === today && l.status === "sent").length;
      const yesterdayCount = deviceLogs.filter((l) => new Date(l.created_at).toDateString() === yesterday && l.status === "sent").length;
      const growthPercent = yesterdayCount > 0 ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) : 0;

      // Disconnections: rough count from status changes (we approximate)
      const disconnections = device.status === "Disconnected" ? 1 : 0;

      const { level, score } = calcRisk({ deliveryRate, failures, totalLogs, growthPercent, disconnections });

      // Daily history (last 7 days)
      const dailyHistory: { day: string; sent: number; failed: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const dayStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        const dayDate = d.toDateString();
        const daySent = deviceLogs.filter((l) => new Date(l.created_at).toDateString() === dayDate && l.status === "sent").length;
        const dayFailed = deviceLogs.filter((l) => new Date(l.created_at).toDateString() === dayDate && (l.status === "error" || l.status === "failed")).length;
        dailyHistory.push({ day: dayStr, sent: daySent, failed: dayFailed });
      }

      // Alerts
      const alerts: string[] = [];
      if (deliveryRate < 95) alerts.push(`Taxa de entrega baixa: ${deliveryRate.toFixed(1)}%`);
      if (failures > 0 && (failures / Math.max(totalLogs, 1)) * 100 > 4) alerts.push(`Taxa de falhas acima de 4%`);
      if (growthPercent > 30) alerts.push(`Crescimento abrupto: +${growthPercent}%`);
      if (device.status === "Disconnected") alerts.push("Chip desconectado");
      if (!activeSession) alerts.push("Sem sessão de aquecimento ativa");

      return {
        id: device.id,
        name: device.name,
        number: device.number || "—",
        online: device.status === "Connected" || device.status === "Ready",
        profilePicture: device.profile_picture,
        daysActive,
        warmupDay: activeSession?.current_day || 0,
        totalDays: activeSession?.total_days || 0,
        sentToday,
        sentTotal,
        avgDaily,
        growthPercent,
        failures,
        totalLogs,
        deliveryRate,
        riskLevel: level,
        score,
        hasWarmup: !!activeSession,
        dailyHistory,
        disconnections,
        alerts,
      };
    });
  }, [devices, sessions, logs]);

  // Sorting
  const sortedChips = useMemo(() => {
    const filtered = chips.filter((c) => {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.number.includes(q);
    });

    return [...filtered].sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortBy) {
        case "score": aVal = a.score; bVal = b.score; break;
        case "riskLevel": aVal = a.riskLevel === "alto" ? 0 : a.riskLevel === "medio" ? 1 : 2; bVal = b.riskLevel === "alto" ? 0 : b.riskLevel === "medio" ? 1 : 2; break;
        case "deliveryRate": aVal = a.deliveryRate; bVal = b.deliveryRate; break;
        case "daysActive": aVal = a.daysActive; bVal = b.daysActive; break;
        case "sentToday": aVal = a.sentToday; bVal = b.sentToday; break;
        default: aVal = a.score; bVal = b.score;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [chips, search, sortBy, sortAsc]);

  // Stats
  const stats = useMemo(() => {
    const active = chips.filter((c) => c.online).length;
    const warming = chips.filter((c) => c.hasWarmup).length;
    const atRisk = chips.filter((c) => c.riskLevel === "alto").length;
    const avgDailySend = chips.length > 0 ? Math.round(chips.reduce((s, c) => s + c.avgDaily, 0) / chips.length) : 0;
    const avgScore = chips.length > 0 ? Math.round(chips.reduce((s, c) => s + c.score, 0) / chips.length) : 0;
    return { active, warming, atRisk, avgDailySend, avgScore };
  }, [chips]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, sortKey, className = "" }: { label: string; sortKey: SortKey; className?: string }) => (
    <th
      className={`p-3 text-right font-medium text-muted-foreground text-[11px] uppercase tracking-wider cursor-pointer hover:text-foreground select-none ${className}`}
      onClick={() => toggleSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortBy === sortKey ? "text-primary" : "text-muted-foreground/30"}`} />
      </span>
    </th>
  );

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-red-400";
  };

  const statCards = [
    { label: "Chips Ativos", value: stats.active, total: chips.length, icon: Smartphone, accent: "text-emerald-400", iconBg: "bg-emerald-500/10" },
    { label: "Em Aquecimento", value: stats.warming, icon: Flame, accent: "text-amber-400", iconBg: "bg-amber-500/10" },
    { label: "Em Risco", value: stats.atRisk, icon: AlertTriangle, accent: "text-red-400", iconBg: "bg-red-500/10" },
    { label: "Média Diária/Chip", value: stats.avgDailySend, icon: TrendingUp, accent: "text-primary", iconBg: "bg-primary/10" },
    { label: "Score Médio", value: stats.avgScore, icon: Shield, accent: scoreColor(stats.avgScore), iconBg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Monitoramento de Chips
          </h1>
          <p className="text-sm text-muted-foreground">Saúde, risco e comportamento do aquecimento</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar chip..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.accent}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground truncate">{s.label}</p>
                  <p className={`text-xl font-bold ${s.accent}`}>
                    {s.value}
                    {"total" in s && s.total !== undefined && (
                      <span className="text-xs font-normal text-muted-foreground">/{s.total}</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chip Table */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-0 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-foreground">
            Saúde dos Chips ({sortedChips.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          {sortedChips.length === 0 ? (
            <div className="py-16 text-center">
              <Smartphone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum chip encontrado</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Conecte dispositivos para monitorar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="p-3 text-left font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Chip</th>
                    <th className="p-3 text-center font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                    <SortHeader label="Dia" sortKey="daysActive" />
                    <SortHeader label="Hoje" sortKey="sentToday" />
                    <th className="p-3 text-right font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Média</th>
                    <th className="p-3 text-right font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Cresc.</th>
                    <th className="p-3 text-right font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Falhas</th>
                    <SortHeader label="Entrega" sortKey="deliveryRate" />
                    <th className="p-3 text-center font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Risco</th>
                    <SortHeader label="Score" sortKey="score" />
                    <th className="p-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedChips.map((chip) => {
                    const risk = riskConfig[chip.riskLevel];
                    return (
                      <tr
                        key={chip.id}
                        className="border-b border-border/30 hover:bg-muted/10 cursor-pointer transition-colors duration-100"
                        onClick={() => setSelectedChip(chip)}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            {chip.profilePicture ? (
                              <img src={chip.profilePicture} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-muted/40 flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                                {(chip.number !== "—" ? chip.number.slice(-2) : chip.name.slice(0, 2)).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-foreground truncate max-w-[140px]">{chip.number !== "—" ? chip.number : chip.name}</p>
                              {chip.number !== "—" && <p className="text-[10px] text-muted-foreground/60 truncate max-w-[140px]">{chip.name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${chip.online ? "text-emerald-400" : "text-red-400"}`}>
                            {chip.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {chip.online ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="p-3 text-right text-muted-foreground text-[13px]">
                          {chip.hasWarmup ? (
                            <span>{chip.warmupDay}<span className="text-muted-foreground/40">/{chip.totalDays}</span></span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-foreground font-medium text-[13px]">{chip.sentToday}</td>
                        <td className="p-3 text-right text-muted-foreground text-[13px]">{chip.avgDaily}</td>
                        <td className="p-3 text-right">
                          {chip.growthPercent !== 0 ? (
                            <span className={`text-[12px] font-medium ${chip.growthPercent > 30 ? "text-red-400" : chip.growthPercent > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                              {chip.growthPercent > 0 ? "+" : ""}{chip.growthPercent}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30 text-[12px]">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-[13px] font-medium ${chip.failures > 0 ? "text-red-400" : "text-muted-foreground/40"}`}>
                            {chip.failures}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-[13px] font-medium ${chip.deliveryRate >= 98 ? "text-emerald-400" : chip.deliveryRate >= 95 ? "text-amber-400" : "text-red-400"}`}>
                            {chip.deliveryRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={`${risk.bg} ${risk.color} ${risk.border} text-[10px] px-2`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${risk.dot} mr-1.5 inline-block`} />
                            {risk.label}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-lg font-bold ${scoreColor(chip.score)}`}>{chip.score}</span>
                        </td>
                        <td className="p-3">
                          <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chip Detail Sheet */}
      <Sheet open={!!selectedChip} onOpenChange={(open) => { if (!open) setSelectedChip(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedChip && <ChipDetailPanel chip={selectedChip} />}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// ── Detail Panel ──
function ChipDetailPanel({ chip }: { chip: ChipData }) {
  const risk = riskConfig[chip.riskLevel];

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${chip.online ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
            {chip.online ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-red-400" />}
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{chip.number !== "—" ? chip.number : chip.name}</p>
            <p className="text-xs text-muted-foreground font-normal">{chip.name}</p>
          </div>
        </SheetTitle>
      </SheetHeader>

      {/* Score + Risk */}
      <div className="flex gap-3">
        <Card className="flex-1 border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Score</p>
            <p className={`text-3xl font-bold ${chip.score >= 80 ? "text-emerald-400" : chip.score >= 60 ? "text-amber-400" : "text-red-400"}`}>{chip.score}</p>
          </CardContent>
        </Card>
        <Card className="flex-1 border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Risco</p>
            <Badge variant="outline" className={`${risk.bg} ${risk.color} ${risk.border} text-sm px-3 py-1`}>
              {risk.label}
            </Badge>
          </CardContent>
        </Card>
        <Card className="flex-1 border-border/50">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Entrega</p>
            <p className={`text-2xl font-bold ${chip.deliveryRate >= 98 ? "text-emerald-400" : chip.deliveryRate >= 95 ? "text-amber-400" : "text-red-400"}`}>
              {chip.deliveryRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Dias Ativo", value: chip.daysActive, icon: Clock },
          { label: "Aquecimento", value: chip.hasWarmup ? `${chip.warmupDay}/${chip.totalDays}` : "—", icon: Flame },
          { label: "Enviadas Hoje", value: chip.sentToday, icon: Zap },
          { label: "Total Enviadas", value: chip.sentTotal, icon: TrendingUp },
          { label: "Média Diária", value: chip.avgDaily, icon: Activity },
          { label: "Falhas", value: chip.failures, icon: XCircle },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/10 border border-border/30">
            <s.icon className="w-4 h-4 text-muted-foreground/50 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className="text-sm font-semibold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">Evolução Diária (7 dias)</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chip.dailyHistory}>
                <defs>
                  <linearGradient id="detailSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Area type="monotone" dataKey="sent" name="Enviadas" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#detailSent)" />
                <Area type="monotone" dataKey="failed" name="Falhas" stroke="hsl(0, 72%, 51%)" strokeWidth={1.5} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Failure History Bar */}
      {chip.failures > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Falhas por Dia</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chip.dailyHistory.filter((d) => d.failed > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                  <Bar dataKey="failed" name="Falhas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {chip.alerts.length > 0 && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Alertas ({chip.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ul className="space-y-2">
              {chip.alerts.map((alert, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-red-300/80">
                  <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  {alert}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {chip.alerts.length === 0 && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-[12px] text-emerald-400/80">Nenhum alerta. Chip em bom estado.</p>
        </div>
      )}
    </div>
  );
}

export default Reports;
