import { useState, useMemo, useEffect } from "react";
import { Pencil, Check, X, TrendingUp, TrendingDown, DollarSign, CreditCard, Tag, AlertTriangle, BarChart3 } from "lucide-react";
import RevenueChart from "./RevenueChart";
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
  const isPositive = netRevenue >= 0;
  const hasMovements = paymentsCount > 0 || periodCosts > 0;

  // ── Operational ──
  const revenueAtRisk = useMemo(() =>
    users.reduce((sum, u) => {
      const d = getDaysLeft(u.plan_expires_at);
      if (d !== null && d > 0 && d <= 3 && u.plan_price > 0) return sum + u.plan_price;
      return sum;
    }, 0),
  [users]);

  const expiringSoon = useMemo(() =>
    users.filter(u => { const d = getDaysLeft(u.plan_expires_at); return d !== null && d > 0 && d <= 3; }),
  [users]);

  const expired = useMemo(() =>
    users.filter(u => { const d = getDaysLeft(u.plan_expires_at); return d !== null && d <= 0; }),
  [users]);

  const revenueExpired = useMemo(() =>
    users.reduce((sum, u) => {
      const d = getDaysLeft(u.plan_expires_at);
      if (d !== null && d <= 0 && u.plan_price > 0) return sum + u.plan_price;
      return sum;
    }, 0),
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

  return (
    <div className="space-y-6">

      {/* ═══ ALERTS ═══ */}
      {(expiringSoon.length > 0 || expired.length > 0 || serverOccupancy >= 80) && (
        <div className="flex flex-wrap gap-3">
          {expired.length > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
              <AlertTriangle size={14} />
              {expired.length} vencido{expired.length > 1 ? "s" : ""} · {fmt(revenueExpired)}
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 text-xs font-medium">
              <AlertTriangle size={14} />
              {expiringSoon.length} vencendo · {fmt(revenueAtRisk)}
            </div>
          )}
          {serverOccupancy >= 80 && (
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 text-xs font-medium">
              <BarChart3 size={14} />
              Servidor {serverOccupancy}%
            </div>
          )}
        </div>
      )}

      {/* ═══ PERIOD FILTER ═══ */}
      <div className="bg-white rounded-xl border border-[#e5e9f0] p-5">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign size={16} className="text-[#8892a4]" />
          <p className="text-xs font-bold text-[#8892a4] uppercase tracking-[0.15em]">Financeiro</p>
          <div className="h-px flex-1 bg-[#e5e9f0]" />
        </div>
        <PeriodFilter {...periodFilter} />
      </div>

      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Receita Líquida */}
        <div className={`bg-white rounded-xl border p-5 ${isPositive ? "border-emerald-200" : "border-red-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            {isPositive ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
            <p className="text-[11px] font-semibold text-[#8892a4] uppercase tracking-wider">Receita Líquida</p>
          </div>
          <p className={`text-2xl font-bold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>{fmt(netRevenue)}</p>
          <p className="text-[11px] text-[#b0b8c8] mt-1">
            {!hasMovements ? "Sem movimentos" : isPositive ? "▲ Positivo" : "▼ Negativo"}
          </p>
        </div>

        {/* Recebida */}
        <div className="bg-white rounded-xl border border-[#e5e9f0] p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-emerald-500" />
            <p className="text-[11px] font-semibold text-[#8892a4] uppercase tracking-wider">Recebida</p>
          </div>
          <p className="text-2xl font-bold text-[#2e3440]">{fmt(revenueReceived)}</p>
          <p className="text-[11px] text-[#b0b8c8] mt-1">{paymentsCount} pgto{paymentsCount !== 1 ? "s" : ""}</p>
        </div>

        {/* Contratada */}
        <div className="bg-white rounded-xl border border-[#e5e9f0] p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={14} className="text-teal-500" />
            <p className="text-[11px] font-semibold text-[#8892a4] uppercase tracking-wider">Contratada</p>
          </div>
          <p className="text-2xl font-bold text-[#2e3440]">{fmt(revenueBrute)}</p>
          <p className="text-[11px] text-[#b0b8c8] mt-1">{activePlans} planos</p>
        </div>

        {/* Descontos */}
        <div className="bg-white rounded-xl border border-[#e5e9f0] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={14} className="text-amber-500" />
            <p className="text-[11px] font-semibold text-[#8892a4] uppercase tracking-wider">Descontos</p>
          </div>
          <p className="text-2xl font-bold text-[#2e3440]">{fmt(discounts)}</p>
          <p className="text-[11px] text-[#b0b8c8] mt-1">Concedidos</p>
        </div>

        {/* Taxas & Custos */}
        <div className="bg-white rounded-xl border border-[#e5e9f0] p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={14} className="text-red-500" />
            <p className="text-[11px] font-semibold text-[#8892a4] uppercase tracking-wider">Taxas & Custos</p>
          </div>
          <p className="text-2xl font-bold text-[#2e3440]">{fmt(totalCosts)}</p>
          <p className="text-[11px] text-[#b0b8c8] mt-1">Op {fmt(periodCosts)} · Tx {fmt(paymentFees)}</p>
        </div>
      </div>

      {/* ═══ OPERAÇÃO ═══ */}
      <div className="bg-white rounded-xl border border-[#e5e9f0] p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-[#8892a4]" />
            <p className="text-xs font-bold text-[#8892a4] uppercase tracking-[0.15em]">Operação</p>
          </div>
          {editingMax ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8892a4]">Capacidade:</span>
              <input
                type="number"
                value={editMaxValue}
                onChange={e => setEditMaxValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && confirmEditMax()}
                className="w-20 h-7 text-xs font-semibold bg-[#f8f9fc] border border-[#e5e9f0] rounded-lg px-2 text-[#2e3440] focus:outline-none focus:border-primary"
                autoFocus
              />
              <button onClick={confirmEditMax} className="text-primary hover:text-primary/80"><Check size={14} /></button>
              <button onClick={() => setEditingMax(false)} className="text-[#b0b8c8] hover:text-[#8892a4]"><X size={14} /></button>
            </div>
          ) : (
            <button onClick={startEditMax} className="flex items-center gap-1.5 text-xs text-[#b0b8c8] hover:text-[#4c566a] transition-colors group">
              <span>Capacidade: {maxInstances}</span>
              <Pencil size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-[#f8f9fc] rounded-lg px-4 py-3">
            <p className="text-[11px] text-[#8892a4] font-medium uppercase tracking-wider">Liberadas</p>
            <p className="text-lg font-bold text-[#2e3440] mt-1">{totalAllocated} <span className="text-xs font-normal text-[#b0b8c8]">/ {maxInstances}</span></p>
          </div>
          <div className="bg-[#f8f9fc] rounded-lg px-4 py-3">
            <p className="text-[11px] text-[#8892a4] font-medium uppercase tracking-wider">Em Uso</p>
            <p className="text-lg font-bold text-[#2e3440] mt-1">{totalInUse} <span className="text-xs font-normal text-[#b0b8c8]">{stats.active_devices} on</span></p>
          </div>
          <div className="bg-[#f8f9fc] rounded-lg px-4 py-3">
            <p className="text-[11px] text-[#8892a4] font-medium uppercase tracking-wider">Ocupação</p>
            <p className={`text-lg font-bold mt-1 ${serverOccupancy >= 80 ? "text-red-500" : "text-[#2e3440]"}`}>{serverOccupancy}%</p>
          </div>
          <div className="bg-[#f8f9fc] rounded-lg px-4 py-3">
            <p className="text-[11px] text-[#8892a4] font-medium uppercase tracking-wider">Bloqueados</p>
            <p className="text-lg font-bold text-[#2e3440] mt-1">{blocked.length}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="relative h-2 bg-[#f0f2f8] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                serverOccupancy >= 90 ? "bg-red-500" : serverOccupancy >= 70 ? "bg-amber-500" : "bg-primary"
              }`}
              style={{ width: `${Math.max(Math.min(serverOccupancy, 100), 2)}%` }}
            />
          </div>
          <p className="text-[11px] text-[#b0b8c8] mt-1.5">{totalInUse} / {maxInstances} instâncias</p>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
