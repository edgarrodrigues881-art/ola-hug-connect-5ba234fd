import { useMemo } from "react";
import { Clock, XCircle, Gauge } from "lucide-react";
import type { AdminDashboard } from "@/hooks/useAdmin";

const SERVER_MAX_INSTANCES = 500;

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

/* ── Metric block (no icons, pure data) ── */
const Metric = ({ label, value, sub, valueColor, className = "" }: {
  label: string; value: string | number; sub?: string; valueColor?: string; className?: string;
}) => (
  <div className={`transition-all duration-200 ${className}`}>
    <p className="text-[9px] text-muted-foreground/60 uppercase tracking-[0.14em] font-medium mb-0.5">{label}</p>
    <p className={`font-extrabold leading-none ${valueColor || "text-foreground"}`}>{value}</p>
    {sub && <p className="text-[9px] text-muted-foreground/40 mt-1">{sub}</p>}
  </div>
);

const AdminOverview = ({ data }: { data: AdminDashboard }) => {
  const { stats, users = [], cycles = [], payments = [], costs = [] } = data ?? { stats: { total_users: 0, total_devices: 0, active_devices: 0, total_campaigns: 0, total_contacts: 0, total_subscriptions: 0 }, users: [], cycles: [], payments: [], costs: [] };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(now);

  // ── Receita Bruta (Contratada) ──
  const revenueBrute = useMemo(() => {
    const monthCycles = (cycles || []).filter((c: any) => {
      const start = new Date(c.cycle_start);
      const end = new Date(c.cycle_end);
      return end >= monthStart && start <= now;
    });
    const usersWithCycles = new Set(monthCycles.map((c: any) => c.user_id));
    let total = monthCycles.reduce((s: number, c: any) => s + Number(c.cycle_amount), 0);
    users.forEach(u => {
      if (!usersWithCycles.has(u.id) && u.plan_expires_at && new Date(u.plan_expires_at) > now && u.plan_price > 0) {
        total += u.plan_price;
      }
    });
    return total;
  }, [users, cycles]);

  // ── Receita Recebida (Caixa) ──
  const monthPayments = useMemo(() =>
    (payments || []).filter((p: any) => new Date(p.paid_at) >= monthStart),
  [payments]);

  const revenueReceived = useMemo(() =>
    monthPayments.reduce((s: number, p: any) => s + Number(p.amount), 0),
  [monthPayments]);

  const monthPaymentsCount = monthPayments.length;

  // ── Descontos Concedidos ──
  const discounts = useMemo(() =>
    monthPayments.reduce((s: number, p: any) => s + Number(p.discount || 0), 0),
  [monthPayments]);

  // ── Taxas dos Pagamentos ──
  const paymentFees = useMemo(() =>
    monthPayments.reduce((s: number, p: any) => s + Number(p.fee || 0), 0),
  [monthPayments]);

  // ── Custos ──
  const monthCosts = useMemo(() =>
    (costs || []).reduce((s: number, c: any) => {
      const d = new Date(c.cost_date);
      return d >= monthStart ? s + Number(c.amount) : s;
    }, 0),
  [costs]);

  // ── Receita Líquida ──
  const totalCosts = monthCosts + paymentFees;
  const netRevenue = revenueReceived - totalCosts;

  // ── Operational ──
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

  return (
    <div className="space-y-4">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-end justify-between border-b border-border/50 pb-3">
        <div>
          <h1 className="text-lg font-black text-foreground tracking-tight leading-none uppercase">
            DG Control Center
          </h1>
          <p className="text-[10px] text-muted-foreground/40 mt-1 capitalize tracking-wide">{monthLabel} {now.getFullYear()}</p>
        </div>
        <span className="text-[7px] uppercase tracking-[0.25em] font-semibold text-muted-foreground/30 border border-border/60 px-2 py-0.5 rounded mb-0.5">
          Prod
        </span>
      </div>

      {/* ═══ ALERTS ═══ */}
      {(expiringSoon.length > 0 || expired.length > 0 || serverOccupancy >= 80) && (
        <div className="flex flex-wrap gap-1.5">
          {expired.length > 0 && (
            <div className="flex items-center gap-2 bg-destructive/8 border border-destructive/20 rounded px-2.5 py-1">
              <XCircle size={11} className="text-destructive shrink-0" />
              <span className="text-[10px] text-destructive/90 font-medium">
                {expired.length} vencido{expired.length > 1 ? "s" : ""} — {fmt(revenueExpired)}
              </span>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="flex items-center gap-2 bg-yellow-500/8 border border-yellow-600/20 rounded px-2.5 py-1">
              <Clock size={11} className="text-yellow-500/70 shrink-0" />
              <span className="text-[10px] text-yellow-500/70 font-medium">
                {expiringSoon.length} vencendo — {fmt(revenueAtRisk)}
              </span>
            </div>
          )}
          {serverOccupancy >= 80 && (
            <div className="flex items-center gap-2 bg-orange-500/8 border border-orange-600/20 rounded px-2.5 py-1">
              <Gauge size={11} className="text-orange-500/70 shrink-0" />
              <span className="text-[10px] text-orange-500/70 font-medium">
                Servidor {serverOccupancy}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══ FINANCEIRO — asymmetric layout ═══ */}
      <div>
        <p className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground/40 font-semibold mb-2">Financeiro</p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
          {/* Hero: Receita Líquida */}
          <div className={`lg:col-span-5 rounded-md px-4 py-4 bg-card border transition-all duration-200 hover:border-green-500/30 ${
            netRevenue >= 0
              ? "border-green-500/20 shadow-[0_0_24px_-8px_rgba(34,197,94,0.08)]"
              : "border-red-500/20"
          }`}>
            <p className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.14em] font-medium">Receita Líquida</p>
            <p className={`text-3xl font-black mt-1 leading-none ${netRevenue >= 0 ? "text-green-400" : "text-red-400"}`}>
              {fmt(netRevenue)}
            </p>
            <p className="text-[9px] text-muted-foreground/35 mt-2">Recebida − Taxas & Custos · {netRevenue >= 0 ? "Positivo" : "Negativo"}</p>
          </div>

          {/* Secondary: Receita Bruta + Recebida */}
          <div className="lg:col-span-4 grid grid-cols-1 gap-2">
            <div className="bg-card border border-border rounded-md px-3.5 py-3 transition-all duration-200 hover:bg-accent/5">
              <Metric label="Receita Bruta" value={fmt(revenueBrute)} sub={`${activePlans} planos ativos · Contratada`} valueColor="text-blue-400" className="text-lg" />
            </div>
            <div className="bg-card border border-border rounded-md px-3.5 py-3 transition-all duration-200 hover:bg-accent/5">
              <Metric label="Receita Recebida" value={fmt(revenueReceived)} sub={`${monthPaymentsCount} pgto${monthPaymentsCount !== 1 ? "s" : ""} · Caixa`} valueColor="text-green-400" className="text-lg" />
            </div>
          </div>

          {/* Tertiary: Descontos + Custos */}
          <div className="lg:col-span-3 grid grid-cols-1 gap-2">
            <div className="bg-card border border-border rounded-md px-3 py-2.5 transition-all duration-200 hover:bg-accent/5">
              <Metric label="Descontos" value={fmt(discounts)} sub="Concedidos" valueColor="text-orange-400" className="text-base" />
            </div>
            <div className="bg-card border border-border rounded-md px-3 py-2.5 transition-all duration-200 hover:bg-accent/5">
              <Metric label="Taxas & Custos" value={fmt(totalCosts)} sub={`Op ${fmt(monthCosts)} · Tx ${fmt(paymentFees)}`} valueColor="text-red-400" className="text-base" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ OPERACIONAL ═══ */}
      <div>
        <p className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground/40 font-semibold mb-2">Operacional</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-card border border-border rounded-md px-3 py-2.5 transition-all duration-200 hover:bg-accent/5">
            <Metric label="Liberadas" value={totalAllocated} sub={`Cap. ${SERVER_MAX_INSTANCES}`} className="text-base" />
          </div>
          <div className="bg-card border border-border rounded-md px-3 py-2.5 transition-all duration-200 hover:bg-accent/5">
            <Metric label="Em Uso" value={totalInUse} sub={`${stats.active_devices} conectadas`} className="text-base" />
          </div>
          <div className="bg-card border border-border rounded-md px-3 py-2.5 transition-all duration-200 hover:bg-accent/5">
            <Metric label="Ocupação" value={`${serverOccupancy}%`} valueColor={serverOccupancy >= 80 ? "text-red-400" : "text-green-400"} className="text-base" />
          </div>
          <div className="bg-card border border-border rounded-md px-3 py-2.5 transition-all duration-200 hover:bg-accent/5">
            <Metric label="Bloqueados" value={blocked.length} sub="Suspensos + cancelados" className="text-base" />
          </div>
        </div>

        {/* Capacity bar */}
        <div className="mt-2 bg-card border border-border rounded-md px-3 py-2">
          <div className="relative h-5 bg-background rounded-sm overflow-hidden">
            <div
              className={`h-full rounded-sm transition-all flex items-center justify-center ${
                serverOccupancy >= 90
                  ? "bg-gradient-to-r from-red-600 to-red-500"
                  : serverOccupancy >= 70
                  ? "bg-gradient-to-r from-yellow-600 to-yellow-500"
                  : "bg-gradient-to-r from-emerald-600/90 to-emerald-500"
              }`}
              style={{ width: `${Math.max(Math.min(serverOccupancy, 100), 8)}%` }}
            >
              <span className="text-[10px] font-bold text-white drop-shadow-sm whitespace-nowrap">
                {totalInUse} / {SERVER_MAX_INSTANCES}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
