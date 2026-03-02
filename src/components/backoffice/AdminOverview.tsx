import { useMemo } from "react";
import {
  DollarSign, TrendingDown, AlertTriangle, Server, Gauge,
  Ban, Clock, XCircle, Receipt, Wallet
} from "lucide-react";
import type { AdminDashboard } from "@/hooks/useAdmin";
import dgLogo from "@/assets/dg-logo-new.png";

const SERVER_MAX_INSTANCES = 500;

const PLAN_PRICES: Record<string, number> = { Start: 149.9, Pro: 349.9, Scale: 549.9, Elite: 899.9 };

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

const StatCard = ({ icon: Icon, label, value, sub, hint, valueColor, highlight, large }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; hint?: string; valueColor?: string; highlight?: boolean; large?: boolean;
}) => (
  <div className={`rounded-md flex items-start gap-3 transition-all ${
    large ? "px-4 py-3.5" : "px-3 py-2.5"
  } ${
    highlight
      ? "bg-[#151821] border-[1.5px] border-green-500/30 shadow-[0_0_20px_-6px_rgba(34,197,94,0.12)]"
      : "bg-[#151821] border border-[rgba(255,255,255,0.06)]"
  }`}>
    <div className="shrink-0 mt-0.5">
      <Icon size={large ? 18 : 15} className="text-[hsl(220,10%,45%)]" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-[hsl(220,10%,50%)] uppercase tracking-wider font-medium leading-tight">{label}</p>
      <p className={`font-bold mt-0.5 ${large ? "text-xl" : "text-lg"} ${valueColor || "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[10px] text-[hsl(220,10%,40%)] mt-0.5">{sub}</p>}
      {hint && <p className="text-[9px] text-[hsl(220,10%,32%)] mt-0.5 italic">{hint}</p>}
    </div>
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

  return (
    <div className="space-y-3" style={{ background: "#0F1115", margin: "-24px", padding: "20px", borderRadius: "8px" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <img src={dgLogo} alt="DG Logo" className="h-9 w-9 rounded-md object-cover" />
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="text-lg">DG</span>{" "}
              <span className="text-sm font-medium text-[hsl(220,10%,55%)]">Control Center</span>
            </h1>
            <p className="text-[10px] text-[hsl(220,10%,38%)] mt-0.5 capitalize">{monthLabel} {now.getFullYear()}</p>
          </div>
        </div>
        <span className="text-[9px] uppercase tracking-widest font-medium text-[hsl(220,10%,40%)] bg-[hsl(220,12%,14%)] border border-[rgba(255,255,255,0.06)] px-2.5 py-1 rounded-full">
          Produção
        </span>
      </div>

      {/* Alert banners */}
      {(expiringSoon.length > 0 || expired.length > 0 || serverOccupancy >= 80) && (
        <div className="space-y-1">
          {expired.length > 0 && (
            <div className="flex items-center gap-3 bg-destructive/8 border border-destructive/20 rounded-md px-3 py-1.5">
              <XCircle size={13} className="text-destructive shrink-0" />
              <span className="text-[11px] text-destructive/90 font-medium">
                {expired.length} cliente{expired.length > 1 ? "s" : ""} vencido{expired.length > 1 ? "s" : ""} — {fmt(revenueExpired)} inadimplência
              </span>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="flex items-center gap-3 bg-yellow-500/8 border border-yellow-600/20 rounded-md px-3 py-1.5">
              <Clock size={13} className="text-yellow-500/80 shrink-0" />
              <span className="text-[11px] text-yellow-500/80 font-medium">
                {expiringSoon.length} cliente{expiringSoon.length > 1 ? "s" : ""} vencendo — {fmt(revenueAtRisk)} em risco
              </span>
            </div>
          )}
          {serverOccupancy >= 80 && (
            <div className="flex items-center gap-3 bg-orange-500/8 border border-orange-600/20 rounded-md px-3 py-1.5">
              <Gauge size={13} className="text-orange-500/80 shrink-0" />
              <span className="text-[11px] text-orange-500/80 font-medium">
                Servidor em {serverOccupancy}% ({totalInUse}/{SERVER_MAX_INSTANCES})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Financeiro */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.04)]" />
          <span className="text-[9px] uppercase tracking-[0.15em] text-[hsl(220,10%,38%)] font-semibold">Financeiro — {monthLabel}</span>
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.04)]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-1.5">
          <StatCard icon={DollarSign} label="Receita Bruta"
            value={fmt(revenueBrute)}
            sub={`${users.filter(u => u.plan_expires_at && new Date(u.plan_expires_at) > now && u.plan_price > 0).length} planos ativos`}
            hint="Contratada no mês"
            valueColor="text-blue-400" />
          <StatCard icon={Receipt} label="Receita Recebida"
            value={fmt(revenueReceived)}
            sub={`${monthPaymentsCount} pgto${monthPaymentsCount !== 1 ? "s" : ""}`}
            hint="Caixa efetivo"
            valueColor="text-green-400" />
          <StatCard icon={TrendingDown} label="Descontos"
            value={fmt(discounts)}
            sub={`${monthPaymentsCount} pgto${monthPaymentsCount !== 1 ? "s" : ""}`}
            hint="Concedidos no mês"
            valueColor="text-orange-400" />
          <StatCard icon={AlertTriangle} label="Taxas & Custos"
            value={fmt(totalCosts)}
            sub={`Op: ${fmt(monthCosts)} | Tx: ${fmt(paymentFees)}`}
            hint="Operacionais + taxas"
            valueColor="text-red-400" />
          <StatCard icon={Wallet} label="Receita Líquida"
            value={fmt(netRevenue)}
            sub={netRevenue >= 0 ? "Positivo" : "Negativo"}
            hint="Recebida − Taxas & Custos"
            valueColor={netRevenue >= 0 ? "text-green-400" : "text-red-400"}
            highlight={netRevenue >= 0}
            large />
        </div>
      </div>

      {/* Operacional */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.04)]" />
          <span className="text-[9px] uppercase tracking-[0.15em] text-[hsl(220,10%,38%)] font-semibold">Operacional</span>
          <div className="h-px flex-1 bg-[rgba(255,255,255,0.04)]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
          <StatCard icon={Server} label="Instâncias Liberadas"
            value={totalAllocated} sub={`Capacidade: ${SERVER_MAX_INSTANCES}`} />
          <StatCard icon={Server} label="Instâncias em Uso"
            value={totalInUse} sub={`${stats.active_devices} conectadas`} />
          <StatCard icon={Gauge} label="Ocupação"
            value={`${serverOccupancy}%`} sub={`${totalInUse}/${SERVER_MAX_INSTANCES}`}
            valueColor={serverOccupancy >= 80 ? "text-red-400" : "text-green-400"} />
          <StatCard icon={Ban} label="Bloqueados"
            value={blocked.length} sub="Suspensos + cancelados" />
        </div>

        {/* Capacity bar - modernized */}
        <div className="bg-[#151821] border border-[rgba(255,255,255,0.06)] rounded-md px-3.5 py-2.5 mt-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[hsl(220,10%,42%)] uppercase tracking-wider font-medium">Capacidade do Servidor</span>
          </div>
          <div className="relative h-5 bg-[hsl(220,12%,12%)] rounded overflow-hidden">
            <div
              className={`h-full rounded transition-all flex items-center justify-center ${
                serverOccupancy >= 90
                  ? "bg-gradient-to-r from-red-600 to-red-500"
                  : serverOccupancy >= 70
                  ? "bg-gradient-to-r from-yellow-600 to-yellow-500"
                  : "bg-gradient-to-r from-emerald-600 to-emerald-500"
              }`}
              style={{ width: `${Math.max(Math.min(serverOccupancy, 100), 8)}%` }}
            >
              <span className="text-[10px] font-bold text-white drop-shadow-sm">
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
