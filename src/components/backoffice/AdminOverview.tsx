import { useMemo } from "react";
import {
  DollarSign, TrendingDown, AlertTriangle, Server, Gauge,
  Ban, Clock, XCircle, Receipt, Wallet
} from "lucide-react";
import type { AdminDashboard } from "@/hooks/useAdmin";

const SERVER_MAX_INSTANCES = 500;

const PLAN_PRICES: Record<string, number> = { Start: 149.9, Pro: 349.9, Scale: 549.9, Elite: 899.9 };

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

function fmt(v: number) {
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

const StatCard = ({ icon: Icon, label, value, sub, hint, valueColor, highlight }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; hint?: string; valueColor?: string; highlight?: boolean;
}) => (
  <div className={`bg-[hsl(220,15%,10%)] border rounded-md px-3.5 py-2.5 flex items-start gap-3 ${
    highlight ? "border-green-500/20 shadow-[0_0_12px_-4px_rgba(34,197,94,0.15)]" : "border-[rgba(255,255,255,0.05)]"
  }`}>
    <div className="shrink-0 mt-0.5">
      <Icon size={16} className="text-muted-foreground/70" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground/80 uppercase tracking-wider font-medium leading-tight">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${valueColor || "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
      {hint && <p className="text-[9px] text-muted-foreground/40 mt-0.5 italic">{hint}</p>}
    </div>
  </div>
);

const AdminOverview = ({ data }: { data: AdminDashboard }) => {
  const { stats, users = [], cycles = [], payments = [], costs = [] } = data ?? { stats: { total_users: 0, total_devices: 0, active_devices: 0, total_campaigns: 0, total_contacts: 0, total_subscriptions: 0 }, users: [], cycles: [], payments: [], costs: [] };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(now);

  // ── Receita Bruta (Contratada) ──
  // Sum cycle_amount for cycles active this month, fallback to plan_price for users without cycles
  const revenueBrute = useMemo(() => {
    const monthCycles = (cycles || []).filter((c: any) => {
      const start = new Date(c.cycle_start);
      const end = new Date(c.cycle_end);
      return end >= monthStart && start <= now;
    });

    const usersWithCycles = new Set(monthCycles.map((c: any) => c.user_id));
    let total = monthCycles.reduce((s: number, c: any) => s + Number(c.cycle_amount), 0);

    // Users with active plans but no cycles this month → use plan_price
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

  // ── Descontos Concedidos (from payments) ──
  const discounts = useMemo(() =>
    monthPayments.reduce((s: number, p: any) => s + Number(p.discount || 0), 0),
  [monthPayments]);

  // ── Taxas dos Pagamentos ──
  const paymentFees = useMemo(() =>
    monthPayments.reduce((s: number, p: any) => s + Number(p.fee || 0), 0),
  [monthPayments]);

  // ── Taxas & Custos ──
  const monthCosts = useMemo(() =>
    (costs || []).reduce((s: number, c: any) => {
      const d = new Date(c.cost_date);
      return d >= monthStart ? s + Number(c.amount) : s;
    }, 0),
  [costs]);

  // ── Receita Líquida = Recebida − Taxas & Custos (desconto já está embutido no valor recebido) ──
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
    <div className="space-y-4">
      {/* Alert banners */}
      {(expiringSoon.length > 0 || expired.length > 0 || serverOccupancy >= 80) && (
        <div className="space-y-1.5">
          {expired.length > 0 && (
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-md px-3.5 py-2">
              <XCircle size={14} className="text-destructive shrink-0" />
              <span className="text-xs text-destructive font-medium">
                {expired.length} cliente{expired.length > 1 ? "s" : ""} com plano vencido — {fmt(revenueExpired)} em inadimplência
              </span>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-600/30 rounded-md px-3.5 py-2">
              <Clock size={14} className="text-yellow-500 shrink-0" />
              <span className="text-xs text-yellow-500 font-medium">
                {expiringSoon.length} cliente{expiringSoon.length > 1 ? "s" : ""} vencendo — {fmt(revenueAtRisk)} em risco
              </span>
            </div>
          )}
          {serverOccupancy >= 80 && (
            <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-600/30 rounded-md px-3.5 py-2">
              <Gauge size={14} className="text-orange-500 shrink-0" />
              <span className="text-xs text-orange-500 font-medium">
                Servidor em {serverOccupancy}% ({totalInUse}/{SERVER_MAX_INSTANCES})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Financeiro */}
      <div>
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2 font-semibold">
          Financeiro — {monthLabel}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <StatCard icon={DollarSign} label="Receita Bruta (Contratada)"
            value={fmt(revenueBrute)}
            sub={`${users.filter(u => u.plan_expires_at && new Date(u.plan_expires_at) > now && u.plan_price > 0).length} planos ativos`}
            hint="Valor esperado dos ciclos/planos ativos"
            valueColor="text-blue-400" />
          <StatCard icon={Receipt} label="Receita Recebida (Caixa)"
            value={fmt(revenueReceived)}
            sub={`${monthPaymentsCount} pagamento${monthPaymentsCount !== 1 ? "s" : ""} registrado${monthPaymentsCount !== 1 ? "s" : ""}`}
            hint="Total efetivamente recebido no mês"
            valueColor="text-green-400" />
          <StatCard icon={TrendingDown} label="Descontos Concedidos"
            value={fmt(discounts)}
            sub={`${monthPaymentsCount} pagamento${monthPaymentsCount !== 1 ? "s" : ""}`}
            hint="Descontos registrados nos pagamentos do mês"
            valueColor="text-orange-400" />
          <StatCard icon={AlertTriangle} label="Taxas & Custos"
            value={fmt(totalCosts)}
            sub={`Custos: ${fmt(monthCosts)} + Taxas: ${fmt(paymentFees)}`}
            hint="Custos operacionais + taxas dos pagamentos"
            valueColor="text-red-400" />
          <StatCard icon={Wallet} label="Receita Líquida (No Bolso)"
            value={fmt(netRevenue)}
            sub={netRevenue >= 0 ? "Positivo" : "Negativo"}
            hint="Recebida − Taxas & Custos"
            valueColor={netRevenue >= 0 ? "text-green-400" : "text-red-400"}
            highlight={netRevenue >= 0} />
        </div>
      </div>

      {/* Operacional */}
      <div>
        <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-2 font-semibold">Operacional</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <StatCard icon={Server} label="Instâncias Liberadas"
            value={totalAllocated} sub={`Capacidade: ${SERVER_MAX_INSTANCES}`} />
          <StatCard icon={Server} label="Instâncias em Uso"
            value={totalInUse} sub={`${stats.active_devices} conectadas`} />
          <StatCard icon={Gauge} label="Ocupação do Servidor"
            value={`${serverOccupancy}%`} sub={`${totalInUse}/${SERVER_MAX_INSTANCES}`}
            valueColor={serverOccupancy >= 80 ? "text-red-400" : "text-green-400"} />
          <StatCard icon={Ban} label="Clientes Bloqueados"
            value={blocked.length} sub="Suspensos + cancelados" />
        </div>

        {/* Capacity bar */}
        <div className="bg-[hsl(220,15%,10%)] border border-[rgba(255,255,255,0.05)] rounded-md px-3.5 py-2.5 mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">Capacidade do Servidor</span>
            <span className="text-[10px] text-foreground/70">{totalInUse} / {SERVER_MAX_INSTANCES}</span>
          </div>
          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                serverOccupancy >= 90 ? "bg-destructive" : serverOccupancy >= 70 ? "bg-yellow-500" : "bg-primary"
              }`}
              style={{ width: `${Math.min(serverOccupancy, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
