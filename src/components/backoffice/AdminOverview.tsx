import { useState, useMemo, useEffect } from "react";
import { Clock, XCircle, Gauge, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AdminDashboard } from "@/hooks/useAdmin";
import { PeriodFilter, usePeriodFilter, type PeriodRange } from "./PeriodFilter";

const DEFAULT_MAX = 500;
const STORAGE_KEY_MAX = "dg-server-max-instances";

function loadMaxInstances(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY_MAX);
    return v ? Number(v) : DEFAULT_MAX;
  } catch { return DEFAULT_MAX; }
}

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

const AdminOverview = ({ data }: { data: AdminDashboard }) => {
  const { stats, users = [], cycles = [], payments = [], costs = [] } = data ?? { stats: { total_users: 0, total_devices: 0, active_devices: 0, total_campaigns: 0, total_contacts: 0, total_subscriptions: 0 }, users: [], cycles: [], payments: [], costs: [] };

  const periodFilter = usePeriodFilter();
  const { range } = periodFilter;
  const [maxInstances, setMaxInstances] = useState(loadMaxInstances);
  const [editingMax, setEditingMax] = useState(false);
  const [editMaxValue, setEditMaxValue] = useState("");

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
  const serverOccupancy = Math.round((totalInUse / maxInstances) * 100);

  const startEditMax = () => { setEditMaxValue(String(maxInstances)); setEditingMax(true); };
  const confirmEditMax = () => {
    const v = parseInt(editMaxValue);
    if (v > 0) { setMaxInstances(v); localStorage.setItem(STORAGE_KEY_MAX, String(v)); }
    setEditingMax(false);
  };
  const activePlans = users.filter(u => u.plan_expires_at && new Date(u.plan_expires_at) > now && u.plan_price > 0).length;

  const isPositive = netRevenue >= 0;
  const hasMovements = paymentsCount > 0 || periodCosts > 0;

  return (
    <div className="space-y-3">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-[-0.03em] leading-none uppercase">
            DG CONTROL CENTER
          </h1>
          <p className="text-[10px] text-muted-foreground/30 mt-1 capitalize tracking-wide font-medium">
            {format(now, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <span className="text-[7px] uppercase tracking-[0.35em] font-bold text-emerald-400/40 mb-0.5">
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
        <div className="flex items-center gap-3 mb-2">
          <p className="text-[9px] text-muted-foreground/25 uppercase tracking-[0.25em] font-bold whitespace-nowrap">Financeiro</p>
          <div className="h-px flex-1 bg-border/20" />
        </div>
        <PeriodFilter {...periodFilter} />
      </div>

      {/* ═══ KPIs — 5 colunas iguais ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {/* Receita Líquida — leve destaque */}
        <div className={`bg-card border rounded-md px-3 py-3 ${isPositive ? "border-emerald-500/25" : "border-red-500/25"}`}>
          <p className="text-[9px] text-muted-foreground/35 uppercase tracking-[0.15em] font-semibold">Receita Líquida</p>
          <p className={`text-xl font-black mt-1 leading-none ${isPositive ? "text-green-400" : "text-red-400"}`}>{fmt(netRevenue)}</p>
          <p className="text-[9px] text-muted-foreground/20 mt-1.5">
            {!hasMovements ? "Sem movimentos" : isPositive ? "▲ Positivo" : "▼ Negativo"}
          </p>
        </div>
        <div className="bg-card border border-border/40 rounded-md px-3 py-3">
          <p className="text-[9px] text-muted-foreground/35 uppercase tracking-[0.15em] font-semibold">Recebida</p>
          <p className="text-xl font-black text-green-400 mt-1 leading-none">{fmt(revenueReceived)}</p>
          <p className="text-[9px] text-muted-foreground/20 mt-1.5">{paymentsCount} pgto{paymentsCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-card border border-border/40 rounded-md px-3 py-3">
          <p className="text-[9px] text-muted-foreground/35 uppercase tracking-[0.15em] font-semibold">Contratada</p>
          <p className="text-xl font-black text-teal-400 mt-1 leading-none">{fmt(revenueBrute)}</p>
          <p className="text-[9px] text-muted-foreground/20 mt-1.5">{activePlans} planos</p>
        </div>
        <div className="bg-card border border-border/40 rounded-md px-3 py-3">
          <p className="text-[9px] text-muted-foreground/35 uppercase tracking-[0.15em] font-semibold">Descontos</p>
          <p className="text-xl font-black text-orange-400 mt-1 leading-none">{fmt(discounts)}</p>
          <p className="text-[9px] text-muted-foreground/20 mt-1.5">Concedidos</p>
        </div>
        <div className="bg-card border border-border/40 rounded-md px-3 py-3">
          <p className="text-[9px] text-muted-foreground/35 uppercase tracking-[0.15em] font-semibold">Taxas & Custos</p>
          <p className="text-xl font-black text-red-400 mt-1 leading-none">{fmt(totalCosts)}</p>
          <p className="text-[9px] text-muted-foreground/20 mt-1.5">Op {fmt(periodCosts)} · Tx {fmt(paymentFees)}</p>
        </div>
      </div>


      {/* ═══ OPERAÇÃO — card horizontal único ═══ */}
      <div className="bg-card/50 border border-border/30 rounded-md px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[9px] text-muted-foreground/25 uppercase tracking-[0.25em] font-bold">Operação</p>
          {editingMax ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground/40 font-medium">Capacidade:</span>
              <input
                type="number"
                value={editMaxValue}
                onChange={e => setEditMaxValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && confirmEditMax()}
                className="w-16 h-5 text-[10px] font-bold bg-background border border-border rounded px-1.5 text-foreground focus:outline-none focus:border-foreground/30"
                autoFocus
              />
              <button onClick={confirmEditMax} className="text-primary/70 hover:text-primary transition-colors"><Check size={12} /></button>
              <button onClick={() => setEditingMax(false)} className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"><X size={12} /></button>
            </div>
          ) : (
            <button onClick={startEditMax} className="flex items-center gap-1 text-[9px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors group">
              <span className="font-medium">Capacidade: {maxInstances}</span>
              <Pencil size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-x-6 gap-y-1">
          <div>
            <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider font-medium">Liberadas</p>
            <p className="text-sm font-black text-foreground/70 mt-0.5">{totalAllocated} <span className="text-[9px] font-medium text-muted-foreground/20">/ {maxInstances}</span></p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider font-medium">Em Uso</p>
            <p className="text-sm font-black text-foreground/70 mt-0.5">{totalInUse} <span className="text-[9px] font-medium text-muted-foreground/20">{stats.active_devices} on</span></p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider font-medium">Ocupação</p>
            <p className={`text-sm font-black mt-0.5 ${serverOccupancy >= 80 ? "text-red-400/80" : "text-foreground/70"}`}>{serverOccupancy}%</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider font-medium">Bloqueados</p>
            <p className="text-sm font-black text-foreground/70 mt-0.5">{blocked.length}</p>
          </div>
        </div>
        <div className="mt-2.5">
          <div className="relative h-1.5 bg-background/80 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                serverOccupancy >= 90 ? "bg-red-500" : serverOccupancy >= 70 ? "bg-yellow-500" : "bg-emerald-500/80"
              }`}
              style={{ width: `${Math.max(Math.min(serverOccupancy, 100), 2)}%` }}
            />
          </div>
          <p className="text-[8px] text-muted-foreground/20 mt-1 font-medium">{totalInUse} / {maxInstances} instâncias</p>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
