import { useState, useMemo } from "react";
import { Clock, XCircle, Gauge } from "lucide-react";
import { format, differenceInDays, eachDayOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { AdminDashboard } from "@/hooks/useAdmin";
import { PeriodFilter, usePeriodFilter, type PeriodRange } from "./PeriodFilter";

const SERVER_MAX_INSTANCES = 500;

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

type ChartMetric = "received" | "net" | "gross";

const AdminOverview = ({ data }: { data: AdminDashboard }) => {
  const { stats, users = [], cycles = [], payments = [], costs = [] } = data ?? { stats: { total_users: 0, total_devices: 0, active_devices: 0, total_campaigns: 0, total_contacts: 0, total_subscriptions: 0 }, users: [], cycles: [], payments: [], costs: [] };

  const periodFilter = usePeriodFilter();
  const { range } = periodFilter;
  const [chartMetric, setChartMetric] = useState<ChartMetric>("received");

  const now = new Date();

  // ── Period-filtered calculations ──
  const revenueBrute = useMemo(() => {
    const filteredCycles = (cycles || []).filter((c: any) => {
      const start = new Date(c.cycle_start);
      const end = new Date(c.cycle_end);
      return end >= range.start && start <= range.end;
    });
    const usersWithCycles = new Set(filteredCycles.map((c: any) => c.user_id));
    let total = filteredCycles.reduce((s: number, c: any) => s + Number(c.cycle_amount), 0);
    users.forEach(u => {
      if (!usersWithCycles.has(u.id) && u.plan_expires_at && new Date(u.plan_expires_at) > now && u.plan_price > 0) {
        total += u.plan_price;
      }
    });
    return total;
  }, [users, cycles, range]);

  const filteredPayments = useMemo(() =>
    (payments || []).filter((p: any) => {
      const d = new Date(p.paid_at);
      return d >= range.start && d <= range.end;
    }),
  [payments, range]);

  const revenueReceived = useMemo(() =>
    filteredPayments.reduce((s: number, p: any) => s + Number(p.amount), 0),
  [filteredPayments]);

  const paymentsCount = filteredPayments.length;

  const discounts = useMemo(() =>
    filteredPayments.reduce((s: number, p: any) => s + Number(p.discount || 0), 0),
  [filteredPayments]);

  const paymentFees = useMemo(() =>
    filteredPayments.reduce((s: number, p: any) => s + Number(p.fee || 0), 0),
  [filteredPayments]);

  const periodCosts = useMemo(() =>
    (costs || []).reduce((s: number, c: any) => {
      const d = new Date(c.cost_date);
      return d >= range.start && d <= range.end ? s + Number(c.amount) : s;
    }, 0),
  [costs, range]);

  const totalCosts = periodCosts + paymentFees;
  const netRevenue = revenueReceived - totalCosts;

  // ── Chart data ──
  const chartData = useMemo(() => {
    const spanDays = differenceInDays(range.end, range.start);
    const useWeeks = spanDays > 60;

    if (useWeeks) {
      const weeks = eachWeekOfInterval({ start: range.start, end: range.end }, { weekStartsOn: 1 });
      return weeks.map(weekStart => {
        const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekPayments = filteredPayments.filter((p: any) => {
          const d = new Date(p.paid_at);
          return d >= weekStart && d <= wEnd;
        });
        const received = weekPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
        const fees = weekPayments.reduce((s: number, p: any) => s + Number(p.fee || 0), 0);
        const weekCosts = (costs || []).reduce((s: number, c: any) => {
          const d = new Date(c.cost_date);
          return d >= weekStart && d <= wEnd ? s + Number(c.amount) : s;
        }, 0);
        return {
          label: format(weekStart, "dd/MM", { locale: ptBR }),
          received,
          net: received - fees - weekCosts,
          gross: revenueBrute / Math.max(weeks.length, 1), // distributed
        };
      });
    }

    const days = eachDayOfInterval({ start: range.start, end: range.end });
    return days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayPayments = filteredPayments.filter((p: any) => format(new Date(p.paid_at), "yyyy-MM-dd") === dayStr);
      const received = dayPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
      const fees = dayPayments.reduce((s: number, p: any) => s + Number(p.fee || 0), 0);
      const dayCosts = (costs || []).reduce((s: number, c: any) => format(new Date(c.cost_date), "yyyy-MM-dd") === dayStr ? s + Number(c.amount) : s, 0);
      return {
        label: format(day, "dd/MM", { locale: ptBR }),
        received,
        net: received - fees - dayCosts,
        gross: 0,
      };
    });
  }, [filteredPayments, costs, range, revenueBrute]);

  // ── Operational (not period-dependent) ──
  const revenueAtRisk = useMemo(() =>
    users.reduce((sum, u) => {
      const d = getDaysLeft(u.plan_expires_at);
      if (d !== null && d > 0 && d <= 3 && u.plan_price > 0) return sum + u.plan_price;
      return sum;
    }, 0),
  [users]);

  const revenueExpired = useMemo(() =>
    users.reduce((sum, u) => {
      const d = getDaysLeft(u.plan_expires_at);
      if (d !== null && d <= 0 && u.plan_price > 0) return sum + u.plan_price;
      return sum;
    }, 0),
  [users]);

  const expiringSoon = useMemo(() =>
    users.filter(u => { const d = getDaysLeft(u.plan_expires_at); return d !== null && d > 0 && d <= 3; }),
  [users]);

  const expired = useMemo(() =>
    users.filter(u => { const d = getDaysLeft(u.plan_expires_at); return d !== null && d <= 0; }),
  [users]);

  const blocked = useMemo(() =>
    users.filter(u => u.status === "suspended" || u.status === "cancelled"),
  [users]);

  const totalAllocated = useMemo(() => users.reduce((s, u) => s + u.max_instances + (u.instance_override || 0), 0), [users]);
  const totalInUse = stats.total_devices;
  const serverOccupancy = Math.round((totalInUse / SERVER_MAX_INSTANCES) * 100);
  const activePlans = users.filter(u => u.plan_expires_at && new Date(u.plan_expires_at) > now && u.plan_price > 0).length;

  const isPositive = netRevenue >= 0;
  const hasMovements = paymentsCount > 0 || periodCosts > 0;

  const METRIC_OPTIONS: { id: ChartMetric; label: string; color: string }[] = [
    { id: "received", label: "Recebida", color: "hsl(142, 71%, 45%)" },
    { id: "net", label: "Líquida", color: "hsl(142, 50%, 50%)" },
    { id: "gross", label: "Bruta", color: "hsl(217, 91%, 60%)" },
  ];

  return (
    <div className="max-w-5xl space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-[-0.03em] leading-none uppercase">
            DG CONTROL CENTER
          </h1>
          <p className="text-[11px] text-muted-foreground/30 mt-2 capitalize tracking-wide font-medium">
            {format(now, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <span className="text-[7px] uppercase tracking-[0.35em] font-bold text-emerald-400/40 mb-1">
          ● PROD
        </span>
      </div>

      {/* ═══ ALERTS ═══ */}
      {(expiringSoon.length > 0 || expired.length > 0 || serverOccupancy >= 80) && (
        <div className="flex flex-wrap gap-2">
          {expired.length > 0 && (
            <span className="text-[9px] text-destructive/70 font-semibold">⬤ {expired.length} vencido{expired.length > 1 ? "s" : ""} · {fmt(revenueExpired)}</span>
          )}
          {expiringSoon.length > 0 && (
            <span className="text-[9px] text-yellow-500/60 font-semibold">⬤ {expiringSoon.length} vencendo · {fmt(revenueAtRisk)}</span>
          )}
          {serverOccupancy >= 80 && (
            <span className="text-[9px] text-orange-500/60 font-semibold">⬤ Servidor {serverOccupancy}%</span>
          )}
        </div>
      )}

      {/* ═══ PERIOD FILTER ═══ */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <p className="text-[9px] text-muted-foreground/25 uppercase tracking-[0.25em] font-bold whitespace-nowrap">Financeiro</p>
          <div className="h-px flex-1 bg-border/20" />
        </div>
        <PeriodFilter {...periodFilter} />
      </div>

      {/* ═══ HERO: RECEITA LÍQUIDA ═══ */}
      <div
        className="relative rounded-lg p-8 overflow-hidden"
        style={{
          background: isPositive
            ? 'linear-gradient(135deg, hsl(142 40% 4%), hsl(142 30% 6%))'
            : 'linear-gradient(135deg, hsl(0 40% 4%), hsl(0 30% 6%))',
          boxShadow: isPositive
            ? '0 0 80px -20px rgba(34,197,94,0.08), inset 0 1px 0 rgba(34,197,94,0.06)'
            : '0 0 80px -20px rgba(239,68,68,0.08), inset 0 1px 0 rgba(239,68,68,0.06)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isPositive
              ? 'radial-gradient(ellipse 60% 50% at 20% 50%, rgba(34,197,94,0.04), transparent)'
              : 'radial-gradient(ellipse 60% 50% at 20% 50%, rgba(239,68,68,0.04), transparent)',
          }}
        />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] text-muted-foreground/35 uppercase tracking-[0.25em] font-bold">Receita Líquida</p>
            <span className={`text-[10px] font-bold tracking-wide ${isPositive ? "text-emerald-500/40" : "text-red-500/40"}`}>
              {!hasMovements ? "SEM MOVIMENTOS" : isPositive ? "▲ POSITIVO" : "▼ NEGATIVO"}
            </span>
          </div>
          <p className={`text-5xl font-black leading-none tracking-tight ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {fmt(netRevenue)}
          </p>
          <p className="text-[10px] text-muted-foreground/20 mt-3 font-medium">
            Recebida − Taxas & Custos · {range.label}
          </p>
        </div>
      </div>

      {/* ═══ FINANCEIRO GRID ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-card border border-border/40 rounded-md px-4 py-3.5 hover:border-border/70 transition-colors">
          <p className="text-[9px] text-muted-foreground/35 uppercase tracking-[0.15em] font-semibold">Recebida</p>
          <p className="text-2xl font-black text-green-400 mt-1.5 leading-none">{fmt(revenueReceived)}</p>
          <p className="text-[9px] text-muted-foreground/20 mt-2">{paymentsCount} pgto{paymentsCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-card border border-border/40 rounded-md px-4 py-3.5 hover:border-border/70 transition-colors">
          <p className="text-[9px] text-muted-foreground/35 uppercase tracking-[0.15em] font-semibold">Contratada</p>
          <p className="text-2xl font-black text-blue-400 mt-1.5 leading-none">{fmt(revenueBrute)}</p>
          <p className="text-[9px] text-muted-foreground/20 mt-2">{activePlans} planos</p>
        </div>
        <div className="bg-card border border-border/40 rounded-md px-4 py-3.5 hover:border-border/70 transition-colors">
          <p className="text-[9px] text-muted-foreground/35 uppercase tracking-[0.15em] font-semibold">Descontos</p>
          <p className="text-2xl font-black text-orange-400 mt-1.5 leading-none">{fmt(discounts)}</p>
          <p className="text-[9px] text-muted-foreground/20 mt-2">Concedidos</p>
        </div>
        <div className="bg-card border border-border/40 rounded-md px-4 py-3.5 hover:border-border/70 transition-colors">
          <p className="text-[9px] text-muted-foreground/35 uppercase tracking-[0.15em] font-semibold">Taxas & Custos</p>
          <p className="text-2xl font-black text-red-400 mt-1.5 leading-none">{fmt(totalCosts)}</p>
          <p className="text-[9px] text-muted-foreground/20 mt-2">Op {fmt(periodCosts)} · Tx {fmt(paymentFees)}</p>
        </div>
      </div>

      {/* ═══ REVENUE CHART ═══ */}
      <div className="bg-card/50 border border-border/30 rounded-md p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] text-muted-foreground/25 uppercase tracking-[0.25em] font-bold">Faturamento no período</p>
          <div className="flex gap-1">
            {METRIC_OPTIONS.map(m => (
              <button
                key={m.id}
                onClick={() => setChartMetric(m.id)}
                className={`text-[9px] font-semibold px-2 py-0.5 rounded transition-all ${
                  chartMetric === m.id
                    ? "bg-foreground/10 text-foreground border border-border"
                    : "text-muted-foreground/30 hover:text-muted-foreground/60 border border-transparent"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 10% 15%)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'hsl(220 10% 30%)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'hsl(220 10% 30%)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(220 15% 8%)',
                  border: '1px solid hsl(220 10% 15%)',
                  borderRadius: 6,
                  fontSize: 10,
                  color: 'hsl(220 10% 70%)',
                }}
                formatter={(value: number) => [fmt(value), METRIC_OPTIONS.find(m => m.id === chartMetric)?.label]}
                labelStyle={{ color: 'hsl(220 10% 50%)', fontSize: 9 }}
              />
              <Bar
                dataKey={chartMetric}
                fill={METRIC_OPTIONS.find(m => m.id === chartMetric)?.color}
                radius={[2, 2, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ OPERAÇÃO ═══ */}
      <div className="bg-card/50 border border-border/30 rounded-md px-5 py-4">
        <p className="text-[9px] text-muted-foreground/25 uppercase tracking-[0.25em] font-bold mb-3">Operação</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2.5">
          <div>
            <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider font-medium">Liberadas</p>
            <p className="text-base font-black text-foreground/70 mt-0.5">{totalAllocated} <span className="text-[9px] font-medium text-muted-foreground/20">/ {SERVER_MAX_INSTANCES}</span></p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider font-medium">Em Uso</p>
            <p className="text-base font-black text-foreground/70 mt-0.5">{totalInUse} <span className="text-[9px] font-medium text-muted-foreground/20">{stats.active_devices} on</span></p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider font-medium">Ocupação</p>
            <p className={`text-base font-black mt-0.5 ${serverOccupancy >= 80 ? "text-red-400/80" : "text-foreground/70"}`}>{serverOccupancy}%</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider font-medium">Bloqueados</p>
            <p className="text-base font-black text-foreground/70 mt-0.5">{blocked.length}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="relative h-2 bg-background/80 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                serverOccupancy >= 90 ? "bg-red-500" : serverOccupancy >= 70 ? "bg-yellow-500" : "bg-emerald-500/80"
              }`}
              style={{ width: `${Math.max(Math.min(serverOccupancy, 100), 2)}%` }}
            />
          </div>
          <p className="text-[9px] text-muted-foreground/20 mt-1.5 font-medium">{totalInUse} / {SERVER_MAX_INSTANCES} instâncias</p>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
