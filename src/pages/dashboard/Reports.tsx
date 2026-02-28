import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Smartphone, Flame, AlertTriangle, TrendingUp, Shield, Search, ArrowUpDown,
  ChevronRight, Wifi, WifiOff, Activity, XCircle, CheckCircle, Clock, Zap,
  TrendingDown, ArrowUp, Minus, ArrowDown,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";

// ── Types ──
interface DeviceRow {
  id: string; name: string; number: string | null; status: string;
  created_at: string; profile_picture: string | null;
}
interface WarmupSessionRow {
  id: string; device_id: string; status: string; current_day: number;
  total_days: number; messages_sent_today: number; messages_sent_total: number;
  messages_per_day: number; daily_increment: number; max_messages_per_day: number;
  min_delay_seconds: number; max_delay_seconds: number; created_at: string;
  quality_profile: string; safety_state: string;
}
interface WarmupLogRow {
  id: string; device_id: string; status: string;
  error_message: string | null; created_at: string;
}

interface ChipData {
  id: string; name: string; number: string; online: boolean;
  profilePicture: string | null; daysActive: number;
  warmupDay: number; totalDays: number; sentToday: number; sentTotal: number;
  avgDaily: number; peakMax: number; growthPercent: number;
  failures: number; totalLogs: number; deliveryRate: number;
  errorsPerDay: number; daysWithoutError: number; volumeOscillation: number;
  riskLevel: "seguro" | "atencao" | "risco"; score: number;
  hasWarmup: boolean; sessionStatus: string; qualityProfile: string; safetyState: string;
  dailyLimit: number;
  dailyHistory: { day: string; sent: number; failed: number }[];
  disconnections: number; alerts: string[];
  recommendation: { action: "increase" | "maintain" | "reduce"; message: string };
}

type SortKey = "score" | "riskLevel" | "deliveryRate" | "daysActive" | "sentToday" | "errorsPerDay";

// ── Risk calc ──
function calcRisk(c: { deliveryRate: number; failures: number; totalLogs: number; growthPercent: number; disconnections: number; errorsPerDay: number; daysWithoutError: number }): { level: "seguro" | "atencao" | "risco"; score: number } {
  let score = 100;
  const failRate = c.totalLogs > 0 ? (c.failures / c.totalLogs) * 100 : 0;
  if (failRate > 8) score -= 35;
  else if (failRate > 4) score -= 20;
  else if (failRate > 2) score -= 8;
  if (c.deliveryRate < 90) score -= 30;
  else if (c.deliveryRate < 95) score -= 15;
  else if (c.deliveryRate < 98) score -= 5;
  if (c.growthPercent > 50) score -= 25;
  else if (c.growthPercent > 30) score -= 12;
  score -= Math.min(c.disconnections * 5, 20);
  if (c.errorsPerDay > 3) score -= 10;
  score = Math.max(0, Math.min(100, score));
  const level = score >= 70 ? "seguro" as const : score >= 40 ? "atencao" as const : "risco" as const;
  return { level, score };
}

// ── Recommendation engine ──
function getRecommendation(chip: Pick<ChipData, "score" | "riskLevel" | "growthPercent" | "errorsPerDay" | "daysWithoutError" | "deliveryRate" | "warmupDay" | "totalDays" | "safetyState">): { action: "increase" | "maintain" | "reduce"; message: string } {
  if (chip.safetyState === "recuo" || chip.riskLevel === "risco") {
    return { action: "reduce", message: "Reduzir volume agora. Risco alto de bloqueio." };
  }
  if (chip.safetyState === "alerta" || chip.riskLevel === "atencao") {
    return { action: "maintain", message: `Manter volume por mais ${Math.max(2, 5 - chip.daysWithoutError)} dias.` };
  }
  if (chip.errorsPerDay > 2) {
    return { action: "maintain", message: "Erro recorrente detectado. Manter volume atual." };
  }
  if (chip.growthPercent > 30) {
    return { action: "maintain", message: "Volume alto para o dia atual. Estabilizar antes de avançar." };
  }
  if (chip.daysWithoutError >= 3 && chip.deliveryRate >= 98 && chip.score >= 75) {
    return { action: "increase", message: "Pode avançar para próximo nível de volume." };
  }
  if (chip.daysWithoutError >= 2 && chip.deliveryRate >= 95) {
    return { action: "maintain", message: `Recomendado manter volume por mais ${3 - chip.daysWithoutError} dias.` };
  }
  return { action: "maintain", message: "Manter padrão atual. Dados insuficientes para avançar." };
}

const riskConfig = {
  seguro: { label: "Seguro", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  atencao: { label: "Atenção", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", dot: "bg-amber-400" },
  risco: { label: "Risco", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", dot: "bg-red-400" },
};

const recIcon = { increase: ArrowUp, maintain: Minus, reduce: ArrowDown };
const recColor = { increase: "text-emerald-400", maintain: "text-amber-400", reduce: "text-red-400" };
const recBg = { increase: "bg-emerald-500/5 border-emerald-500/15", maintain: "bg-amber-500/5 border-amber-500/15", reduce: "bg-red-500/5 border-red-500/15" };

const scoreColor = (s: number) => s >= 80 ? "text-emerald-400" : s >= 60 ? "text-amber-400" : "text-red-400";

// ── Component ──
const Reports = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedChip, setSelectedChip] = useState<ChipData | null>(null);

  const { data: devices = [] } = useQuery({
    queryKey: ["report-devices", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices")
        .select("id, name, number, status, created_at, profile_picture")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DeviceRow[];
    },
    enabled: !!user,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["report-warmup-sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("warmup_sessions")
        .select("id, device_id, status, current_day, total_days, messages_sent_today, messages_sent_total, messages_per_day, daily_increment, max_messages_per_day, min_delay_seconds, max_delay_seconds, created_at, quality_profile, safety_state")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WarmupSessionRow[];
    },
    enabled: !!user,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["report-warmup-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("warmup_logs")
        .select("id, device_id, status, error_message, created_at")
        .order("created_at", { ascending: true }).limit(1000);
      if (error) throw error;
      return data as WarmupLogRow[];
    },
    enabled: !!user,
  });

  const chips = useMemo<ChipData[]>(() => {
    return devices.map((device) => {
      const deviceSessions = sessions.filter(s => s.device_id === device.id);
      const activeSession = deviceSessions.find(s => s.status === "running") || deviceSessions[0];
      const deviceLogs = logs.filter(l => l.device_id === device.id);

      const daysActive = Math.max(1, Math.floor((Date.now() - new Date(device.created_at).getTime()) / 86400000));
      const sentTotal = activeSession?.messages_sent_total || deviceLogs.filter(l => l.status === "sent").length;
      const sentToday = activeSession?.messages_sent_today || 0;
      const failures = deviceLogs.filter(l => l.status === "error" || l.status === "failed").length;
      const totalLogs = deviceLogs.length;
      const deliveryRate = totalLogs > 0 ? ((totalLogs - failures) / totalLogs) * 100 : 100;
      const avgDaily = Math.round(sentTotal / daysActive);

      // Peak max
      const dailyCounts: Record<string, number> = {};
      deviceLogs.forEach(l => {
        if (l.status === "sent") {
          const d = new Date(l.created_at).toDateString();
          dailyCounts[d] = (dailyCounts[d] || 0) + 1;
        }
      });
      const peakMax = Object.values(dailyCounts).length > 0 ? Math.max(...Object.values(dailyCounts)) : 0;

      // Errors per day
      const errorsPerDay = daysActive > 0 ? Math.round((failures / daysActive) * 10) / 10 : 0;

      // Days without error (consecutive from today backwards)
      let daysWithoutError = 0;
      for (let i = 0; i < 30; i++) {
        const d = new Date(Date.now() - i * 86400000).toDateString();
        const dayErrors = deviceLogs.filter(l => new Date(l.created_at).toDateString() === d && (l.status === "error" || l.status === "failed")).length;
        if (dayErrors > 0) break;
        // Only count days that had activity
        const dayActivity = deviceLogs.filter(l => new Date(l.created_at).toDateString() === d).length;
        if (dayActivity > 0 || i === 0) daysWithoutError++;
      }

      // Volume oscillation (std dev of last 7 days)
      const last7: number[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(Date.now() - i * 86400000).toDateString();
        last7.push(deviceLogs.filter(l => new Date(l.created_at).toDateString() === d && l.status === "sent").length);
      }
      const mean7 = last7.reduce((a, b) => a + b, 0) / 7;
      const volumeOscillation = mean7 > 0 ? Math.round(Math.sqrt(last7.reduce((s, v) => s + (v - mean7) ** 2, 0) / 7) / mean7 * 100) : 0;

      // Growth
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const todayCount = dailyCounts[today] || 0;
      const yesterdayCount = dailyCounts[yesterday] || 0;
      const growthPercent = yesterdayCount > 0 ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) : 0;

      const disconnections = device.status === "Disconnected" ? 1 : 0;

      const { level, score } = calcRisk({ deliveryRate, failures, totalLogs, growthPercent, disconnections, errorsPerDay, daysWithoutError });

      // Daily limit
      const dailyLimit = activeSession
        ? Math.min(activeSession.messages_per_day + (activeSession.current_day - 1) * activeSession.daily_increment, activeSession.max_messages_per_day)
        : 0;

      // Daily history
      const dailyHistory: { day: string; sent: number; failed: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const dayStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        const dayDate = d.toDateString();
        dailyHistory.push({
          day: dayStr,
          sent: deviceLogs.filter(l => new Date(l.created_at).toDateString() === dayDate && l.status === "sent").length,
          failed: deviceLogs.filter(l => new Date(l.created_at).toDateString() === dayDate && (l.status === "error" || l.status === "failed")).length,
        });
      }

      // Alerts
      const alerts: string[] = [];
      if (growthPercent > 30) alerts.push("Volume alto para o dia atual");
      if (errorsPerDay > 2) alerts.push("Erro recorrente detectado");
      if (deliveryRate < 95) alerts.push(`Taxa de entrega baixa: ${deliveryRate.toFixed(1)}%`);
      if (failures > 0 && (failures / Math.max(totalLogs, 1)) * 100 > 4) alerts.push("Taxa de falhas acima de 4%");
      if (device.status === "Disconnected") alerts.push("Chip desconectado");
      if (!activeSession) alerts.push("Sem sessão de aquecimento ativa");
      if (volumeOscillation > 40) alerts.push("Oscilação de volume irregular");

      const recommendation = getRecommendation({
        score, riskLevel: level, growthPercent, errorsPerDay,
        daysWithoutError, deliveryRate,
        warmupDay: activeSession?.current_day || 0,
        totalDays: activeSession?.total_days || 0,
        safetyState: activeSession?.safety_state || "normal",
      });

      return {
        id: device.id, name: device.name, number: device.number || "—",
        online: device.status === "Connected" || device.status === "Ready",
        profilePicture: device.profile_picture, daysActive, warmupDay: activeSession?.current_day || 0,
        totalDays: activeSession?.total_days || 0, sentToday, sentTotal, avgDaily, peakMax,
        growthPercent, failures, totalLogs, deliveryRate, errorsPerDay, daysWithoutError,
        volumeOscillation, riskLevel: level, score, hasWarmup: !!activeSession,
        sessionStatus: activeSession?.status || "none",
        qualityProfile: activeSession?.quality_profile || "—",
        safetyState: activeSession?.safety_state || "normal",
        dailyLimit, dailyHistory, disconnections, alerts, recommendation,
      };
    });
  }, [devices, sessions, logs]);

  const sortedChips = useMemo(() => {
    const filtered = chips.filter(c => {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.number.includes(q);
    });
    return [...filtered].sort((a, b) => {
      let aV: number, bV: number;
      switch (sortBy) {
        case "score": aV = a.score; bV = b.score; break;
        case "riskLevel": aV = a.riskLevel === "risco" ? 0 : a.riskLevel === "atencao" ? 1 : 2; bV = b.riskLevel === "risco" ? 0 : b.riskLevel === "atencao" ? 1 : 2; break;
        case "deliveryRate": aV = a.deliveryRate; bV = b.deliveryRate; break;
        case "daysActive": aV = a.daysActive; bV = b.daysActive; break;
        case "sentToday": aV = a.sentToday; bV = b.sentToday; break;
        case "errorsPerDay": aV = a.errorsPerDay; bV = b.errorsPerDay; break;
        default: aV = a.score; bV = b.score;
      }
      return sortAsc ? aV - bV : bV - aV;
    });
  }, [chips, search, sortBy, sortAsc]);

  const stats = useMemo(() => {
    const active = chips.filter(c => c.online).length;
    const warming = chips.filter(c => c.hasWarmup && c.sessionStatus === "running").length;
    const atRisk = chips.filter(c => c.riskLevel === "risco").length;
    const avgDailySend = chips.length > 0 ? Math.round(chips.reduce((s, c) => s + c.avgDaily, 0) / chips.length) : 0;
    const avgScore = chips.length > 0 ? Math.round(chips.reduce((s, c) => s + c.score, 0) / chips.length) : 0;
    return { active, warming, atRisk, avgDailySend, avgScore, total: chips.length };
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Relatório de Aquecimento</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Saúde, risco e recomendação por chip</p>
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Buscar chip..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Chips Ativos", value: `${stats.active}/${stats.total}`, color: "text-emerald-400" },
          { label: "Em Aquecimento", value: stats.warming, color: "text-amber-400" },
          { label: "Em Risco", value: stats.atRisk, color: stats.atRisk > 0 ? "text-red-400" : "text-muted-foreground/50" },
          { label: "Média/Dia/Chip", value: stats.avgDailySend, color: "text-foreground" },
          { label: "Score Médio", value: stats.avgScore, color: scoreColor(stats.avgScore) },
        ].map(s => (
          <Card key={s.label} className="border-border/15">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold tabular-nums leading-none ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium mt-1.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chip Table */}
      <Card className="border-border/15 overflow-hidden">
        <CardHeader className="pb-0 pt-4 px-4">
          <CardTitle className="text-sm font-medium text-foreground">
            Chips ({sortedChips.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          {sortedChips.length === 0 ? (
            <div className="py-16 text-center">
              <Smartphone className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum chip encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/10">
                    <th className="p-3 text-left font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Chip</th>
                    <th className="p-3 text-center font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                    <SortHeader label="Hoje" sortKey="sentToday" />
                    <th className="p-3 text-right font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Média</th>
                    <th className="p-3 text-right font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Pico</th>
                    <SortHeader label="Erros/dia" sortKey="errorsPerDay" />
                    <SortHeader label="Entrega" sortKey="deliveryRate" />
                    <th className="p-3 text-center font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Risco</th>
                    <SortHeader label="Score" sortKey="score" />
                    <th className="p-3 text-center font-medium text-muted-foreground text-[11px] uppercase tracking-wider">Ação</th>
                    <th className="p-3 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedChips.map(chip => {
                    const risk = riskConfig[chip.riskLevel];
                    const RecIcon = recIcon[chip.recommendation.action];
                    return (
                      <tr key={chip.id} className="border-b border-border/20 hover:bg-muted/5 cursor-pointer" onClick={() => setSelectedChip(chip)}>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            {chip.profilePicture ? (
                              <img src={chip.profilePicture} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
                                {(chip.number !== "—" ? chip.number.slice(-2) : chip.name.slice(0, 2)).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-foreground truncate max-w-[130px]">{chip.number !== "—" ? chip.number : chip.name}</p>
                              {chip.hasWarmup && (
                                <p className="text-[10px] text-muted-foreground/50">Dia {chip.warmupDay}/{chip.totalDays}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${chip.online ? "text-emerald-400" : "text-red-400"}`}>
                            {chip.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                          </span>
                        </td>
                        <td className="p-3 text-right text-foreground font-medium text-[13px] tabular-nums">
                          {chip.sentToday}
                          {chip.dailyLimit > 0 && <span className="text-muted-foreground/40 font-normal">/{chip.dailyLimit}</span>}
                        </td>
                        <td className="p-3 text-right text-muted-foreground text-[13px] tabular-nums">{chip.avgDaily}</td>
                        <td className="p-3 text-right text-muted-foreground text-[13px] tabular-nums">{chip.peakMax}</td>
                        <td className="p-3 text-right">
                          <span className={`text-[13px] tabular-nums font-medium ${chip.errorsPerDay > 2 ? "text-red-400" : chip.errorsPerDay > 0 ? "text-amber-400" : "text-muted-foreground/30"}`}>
                            {chip.errorsPerDay}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-[13px] font-medium tabular-nums ${chip.deliveryRate >= 98 ? "text-emerald-400" : chip.deliveryRate >= 95 ? "text-amber-400" : "text-red-400"}`}>
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
                          <span className={`text-lg font-bold tabular-nums ${scoreColor(chip.score)}`}>{chip.score}</span>
                        </td>
                        <td className="p-3 text-center">
                          <RecIcon className={`w-4 h-4 mx-auto ${recColor[chip.recommendation.action]}`} />
                        </td>
                        <td className="p-3">
                          <ChevronRight className="w-4 h-4 text-muted-foreground/20" />
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

      {/* Detail Sheet */}
      <Sheet open={!!selectedChip} onOpenChange={open => { if (!open) setSelectedChip(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedChip && <ChipDetail chip={selectedChip} />}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// ── Detail Panel ──
function ChipDetail({ chip }: { chip: ChipData }) {
  const risk = riskConfig[chip.riskLevel];
  const RecIcon = recIcon[chip.recommendation.action];

  return (
    <div className="space-y-5">
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

      {/* Recommendation banner */}
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${recBg[chip.recommendation.action]}`}>
        <RecIcon className={`w-5 h-5 shrink-0 ${recColor[chip.recommendation.action]}`} />
        <div>
          <p className={`text-sm font-semibold ${recColor[chip.recommendation.action]}`}>
            {chip.recommendation.action === "increase" ? "Pode aumentar" : chip.recommendation.action === "maintain" ? "Manter volume" : "Reduzir agora"}
          </p>
          <p className="text-[11px] text-muted-foreground">{chip.recommendation.message}</p>
        </div>
      </div>

      {/* Score + Risk + Delivery */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="border-border/15">
          <CardContent className="p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Score</p>
            <p className={`text-2xl font-bold ${scoreColor(chip.score)}`}>{chip.score}</p>
          </CardContent>
        </Card>
        <Card className="border-border/15">
          <CardContent className="p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
            <Badge variant="outline" className={`${risk.bg} ${risk.color} ${risk.border} text-xs px-2 py-0.5`}>{risk.label}</Badge>
          </CardContent>
        </Card>
        <Card className="border-border/15">
          <CardContent className="p-3 text-center">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Entrega</p>
            <p className={`text-xl font-bold ${chip.deliveryRate >= 98 ? "text-emerald-400" : chip.deliveryRate >= 95 ? "text-amber-400" : "text-red-400"}`}>
              {chip.deliveryRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Média diária", value: chip.avgDaily },
          { label: "Pico máximo", value: chip.peakMax },
          { label: "Erros/dia", value: chip.errorsPerDay, alert: chip.errorsPerDay > 2 },
          { label: "Dias sem erro", value: chip.daysWithoutError, good: chip.daysWithoutError >= 3 },
          { label: "Oscilação vol.", value: `${chip.volumeOscillation}%`, alert: chip.volumeOscillation > 40 },
          { label: "Aquecimento", value: chip.hasWarmup ? `${chip.warmupDay}/${chip.totalDays}` : "—" },
          { label: "Crescimento", value: chip.growthPercent !== 0 ? `${chip.growthPercent > 0 ? "+" : ""}${chip.growthPercent}%` : "—", alert: chip.growthPercent > 30 },
          { label: "Total enviadas", value: chip.sentTotal },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between p-2.5 rounded-md bg-muted/5 border border-border/15">
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
            <span className={`text-sm font-semibold tabular-nums ${'alert' in s && s.alert ? "text-red-400" : 'good' in s && s.good ? "text-emerald-400" : "text-foreground"}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <Card className="border-border/15">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium text-muted-foreground">Evolução (7 dias)</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chip.dailyHistory}>
                <defs>
                  <linearGradient id="dSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                <Area type="monotone" dataKey="sent" name="Enviadas" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#dSent)" />
                <Area type="monotone" dataKey="failed" name="Falhas" stroke="hsl(0,72%,51%)" strokeWidth={1.5} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Failure bar chart */}
      {chip.failures > 0 && (
        <Card className="border-border/15">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Falhas por Dia</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chip.dailyHistory.filter(d => d.failed > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                  <Bar dataKey="failed" name="Falhas" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {chip.alerts.length > 0 && (
        <Card className="border-red-500/15 bg-red-500/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Alertas ({chip.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ul className="space-y-1.5">
              {chip.alerts.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-red-300/80">
                  <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />{a}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {chip.alerts.length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-[11px] text-emerald-400/80">Nenhum alerta. Chip em bom estado.</p>
        </div>
      )}
    </div>
  );
}

export default Reports;
