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

const AdminOverview = ({ data }: { data: AdminDashboard }) => {
  const { stats, users = [], cycles = [], payments = [], costs = [] } = data ?? { stats: { total_users: 0, total_devices: 0, active_devices: 0, total_campaigns: 0, total_contacts: 0, total_subscriptions: 0 }, users: [], cycles: [], payments: [], costs: [] };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(now);

  // ── calculations (unchanged) ──
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

  const monthPayments = useMemo(() =>
    (payments || []).filter((p: any) => new Date(p.paid_at) >= monthStart),
  [payments]);

  const revenueReceived = useMemo(() =>
    monthPayments.reduce((s: number, p: any) => s + Number(p.amount), 0),
  [monthPayments]);

  const monthPaymentsCount = monthPayments.length;

  const discounts = useMemo(() =>
    monthPayments.reduce((s: number, p: any) => s + Number(p.discount || 0), 0),
  [monthPayments]);

  const paymentFees = useMemo(() =>
    monthPayments.reduce((s: number, p: any) => s + Number(p.fee || 0), 0),
  [monthPayments]);

  const monthCosts = useMemo(() =>
    (costs || []).reduce((s: number, c: any) => {
      const d = new Date(c.cost_date);
      return d >= monthStart ? s + Number(c.amount) : s;
    }, 0),
  [costs]);

  const totalCosts = monthCosts + paymentFees;
  const netRevenue = revenueReceived - totalCosts;

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
    <div className="space-y-5 max-w-5xl">

      {/* ════════════════ HEADER ════════════════ */}
      <header className="flex items-end justify-between pb-4 border-b border-border/40">
        <div>
          <p className="text-[10px] text-muted-foreground/30 uppercase tracking-[0.3em] font-medium mb-1">Painel Administrativo</p>
          <h1 className="text-2xl font-black text-foreground tracking-[-0.02em] leading-none uppercase">
            DG CONTROL CENTER
          </h1>
          <p className="text-xs text-muted-foreground/40 mt-1.5 capitalize">{monthLabel} {now.getFullYear()}</p>
        </div>
        <span className="text-[8px] uppercase tracking-[0.3em] font-bold text-emerald-500/50 border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 rounded-sm mb-1">
          Produção
        </span>
      </header>

      {/* ════════════════ ALERTS (inline, compact) ════════════════ */}
      {(expiringSoon.length > 0 || expired.length > 0 || serverOccupancy >= 80) && (
        <div className="flex flex-wrap gap-2">
          {expired.length > 0 && (
            <div className="flex items-center gap-1.5 bg-destructive/5 border border-destructive/15 rounded-sm px-2 py-1">
              <XCircle size={10} className="text-destructive/70" />
              <span className="text-[9px] text-destructive/80 font-medium">{expired.length} vencido{expired.length > 1 ? "s" : ""} · {fmt(revenueExpired)}</span>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="flex items-center gap-1.5 bg-yellow-500/5 border border-yellow-500/15 rounded-sm px-2 py-1">
              <Clock size={10} className="text-yellow-500/60" />
              <span className="text-[9px] text-yellow-500/70 font-medium">{expiringSoon.length} vencendo · {fmt(revenueAtRisk)}</span>
            </div>
          )}
          {serverOccupancy >= 80 && (
            <div className="flex items-center gap-1.5 bg-orange-500/5 border border-orange-500/15 rounded-sm px-2 py-1">
              <Gauge size={10} className="text-orange-500/60" />
              <span className="text-[9px] text-orange-500/70 font-medium">Servidor {serverOccupancy}%</span>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ FINANCEIRO ════════════════ */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/40 font-bold whitespace-nowrap">Financeiro</h2>
          <div className="h-px flex-1 bg-border/30" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

          {/* ── COLUNA ESQUERDA: Hero + secundários (3/5) ── */}
          <div className="lg:col-span-3 flex flex-col gap-3">

            {/* HERO: Receita Líquida */}
            <div className={`rounded-md p-5 bg-card border-[1.5px] transition-all duration-300 ${
              netRevenue >= 0
                ? "border-green-500/20 hover:border-green-500/35"
                : "border-red-500/20 hover:border-red-500/35"
            }`}
              style={{ boxShadow: netRevenue >= 0 ? '0 0 40px -12px rgba(34,197,94,0.06)' : '0 0 40px -12px rgba(239,68,68,0.06)' }}
            >
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.2em] font-semibold">Receita Líquida</p>
                <span className={`text-[9px] font-medium ${netRevenue >= 0 ? "text-green-500/50" : "text-red-500/50"}`}>
                  {netRevenue >= 0 ? "▲ Positivo" : "▼ Negativo"}
                </span>
              </div>
              <p className={`text-4xl font-black mt-2 leading-none tracking-tight ${netRevenue >= 0 ? "text-green-400" : "text-red-400"}`}>
                {fmt(netRevenue)}
              </p>
              <p className="text-[9px] text-muted-foreground/30 mt-2.5">Recebida − Taxas & Custos operacionais</p>
            </div>

            {/* Receita Recebida + Receita Bruta */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border/60 rounded-md p-3.5 hover:bg-accent/5 transition-all duration-200">
                <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.15em] font-medium">Receita Recebida</p>
                <p className="text-xl font-black text-green-400 mt-1 leading-none">{fmt(revenueReceived)}</p>
                <p className="text-[9px] text-muted-foreground/30 mt-1.5">{monthPaymentsCount} pgto{monthPaymentsCount !== 1 ? "s" : ""} · Caixa efetivo</p>
              </div>
              <div className="bg-card border border-border/60 rounded-md p-3.5 hover:bg-accent/5 transition-all duration-200">
                <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.15em] font-medium">Receita Bruta</p>
                <p className="text-xl font-black text-blue-400 mt-1 leading-none">{fmt(revenueBrute)}</p>
                <p className="text-[9px] text-muted-foreground/30 mt-1.5">{activePlans} planos ativos · Contratada</p>
              </div>
            </div>
          </div>

          {/* ── COLUNA DIREITA: Descontos + Custos (2/5) ── */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="bg-card border border-border/60 rounded-md p-3.5 flex-1 hover:bg-accent/5 transition-all duration-200">
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.15em] font-medium">Descontos</p>
              <p className="text-xl font-black text-orange-400 mt-1 leading-none">{fmt(discounts)}</p>
              <p className="text-[9px] text-muted-foreground/30 mt-1.5">Concedidos no mês</p>
            </div>
            <div className="bg-card border border-border/60 rounded-md p-3.5 flex-1 hover:bg-accent/5 transition-all duration-200">
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.15em] font-medium">Taxas & Custos</p>
              <p className="text-xl font-black text-red-400 mt-1 leading-none">{fmt(totalCosts)}</p>
              <div className="flex gap-3 mt-1.5">
                <p className="text-[9px] text-muted-foreground/30">Op {fmt(monthCosts)}</p>
                <p className="text-[9px] text-muted-foreground/30">Tx {fmt(paymentFees)}</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════ OPERAÇÃO ════════════════ */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/40 font-bold whitespace-nowrap">Operação</h2>
          <div className="h-px flex-1 bg-border/30" />
        </div>

        {/* Metrics row */}
        <div className="bg-card border border-border/60 rounded-md p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3">
            <div>
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.15em] font-medium">Liberadas</p>
              <p className="text-lg font-black text-foreground mt-0.5 leading-none">{totalAllocated}</p>
              <p className="text-[9px] text-muted-foreground/25 mt-1">de {SERVER_MAX_INSTANCES}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.15em] font-medium">Em Uso</p>
              <p className="text-lg font-black text-foreground mt-0.5 leading-none">{totalInUse}</p>
              <p className="text-[9px] text-muted-foreground/25 mt-1">{stats.active_devices} conectadas</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.15em] font-medium">Ocupação</p>
              <p className={`text-lg font-black mt-0.5 leading-none ${serverOccupancy >= 80 ? "text-red-400" : "text-green-400"}`}>{serverOccupancy}%</p>
              <p className="text-[9px] text-muted-foreground/25 mt-1">{totalInUse}/{SERVER_MAX_INSTANCES}</p>
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground/40 uppercase tracking-[0.15em] font-medium">Bloqueados</p>
              <p className="text-lg font-black text-foreground mt-0.5 leading-none">{blocked.length}</p>
              <p className="text-[9px] text-muted-foreground/25 mt-1">Suspensos + cancelados</p>
            </div>
          </div>

          {/* Capacity bar */}
          <div className="mt-4 pt-3 border-t border-border/30">
            <div className="relative h-7 bg-background rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-500 flex items-center justify-center ${
                  serverOccupancy >= 90
                    ? "bg-gradient-to-r from-red-600 to-red-500"
                    : serverOccupancy >= 70
                    ? "bg-gradient-to-r from-yellow-600 to-yellow-500"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-500"
                }`}
                style={{ width: `${Math.max(Math.min(serverOccupancy, 100), 8)}%` }}
              >
                <span className="text-[11px] font-black text-white drop-shadow-sm whitespace-nowrap tracking-wide">
                  {totalInUse} / {SERVER_MAX_INSTANCES}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminOverview;
