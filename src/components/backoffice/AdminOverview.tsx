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

const StatCard = ({ icon: Icon, label, value, sub, hint, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; hint?: string; color: string;
}) => (
  <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
    <div className={`p-2 rounded-md shrink-0 ${color}`}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium leading-tight">{label}</p>
      <p className="text-xl font-bold mt-0.5 text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      {hint && <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">{hint}</p>}
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
  const revenueReceived = useMemo(() =>
    (payments || []).reduce((s: number, p: any) => {
      const paid = new Date(p.paid_at);
      return paid >= monthStart ? s + Number(p.amount) : s;
    }, 0),
  [payments]);

  const monthPaymentsCount = useMemo(() =>
    (payments || []).filter((p: any) => new Date(p.paid_at) >= monthStart).length,
  [payments]);

  // ── Descontos Concedidos ──
  const discounts = useMemo(() => {
    return (cycles || []).reduce((s: number, c: any) => {
      const created = new Date(c.created_at);
      if (created >= monthStart) {
        const basePrice = PLAN_PRICES[c.plan_name] || 0;
        const diff = basePrice - Number(c.cycle_amount);
        if (diff > 0) return s + diff;
      }
      return s;
    }, 0);
  }, [cycles]);

  // ── Taxas & Custos ──
  const monthCosts = useMemo(() =>
    (costs || []).reduce((s: number, c: any) => {
      const d = new Date(c.cost_date);
      return d >= monthStart ? s + Number(c.amount) : s;
    }, 0),
  [costs]);

  // ── Receita Líquida ──
  const netRevenue = revenueReceived - monthCosts;

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
    <div className="space-y-6">
      {/* Alert banners */}
      {(expiringSoon.length > 0 || expired.length > 0 || serverOccupancy >= 80) && (
        <div className="space-y-2">
          {expired.length > 0 && (
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5">
              <XCircle size={16} className="text-destructive shrink-0" />
              <span className="text-sm text-destructive font-medium">
                {expired.length} cliente{expired.length > 1 ? "s" : ""} com plano vencido — {fmt(revenueExpired)} em inadimplência
              </span>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-600/30 rounded-lg px-4 py-2.5">
              <Clock size={16} className="text-yellow-500 shrink-0" />
              <span className="text-sm text-yellow-500 font-medium">
                {expiringSoon.length} cliente{expiringSoon.length > 1 ? "s" : ""} vencendo — {fmt(revenueAtRisk)} em risco
              </span>
            </div>
          )}
          {serverOccupancy >= 80 && (
            <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-600/30 rounded-lg px-4 py-2.5">
              <Gauge size={16} className="text-orange-500 shrink-0" />
              <span className="text-sm text-orange-500 font-medium">
                Servidor em {serverOccupancy}% ({totalInUse}/{SERVER_MAX_INSTANCES})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Financeiro */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
          Financeiro — {monthLabel}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={DollarSign} label="Receita Bruta (Contratada)"
            value={fmt(revenueBrute)}
            sub={`${users.filter(u => u.plan_expires_at && new Date(u.plan_expires_at) > now && u.plan_price > 0).length} planos ativos`}
            hint="Valor esperado dos ciclos/planos ativos"
            color="bg-green-600/15 text-green-500" />
          <StatCard icon={Receipt} label="Receita Recebida (Caixa)"
            value={fmt(revenueReceived)}
            sub={`${monthPaymentsCount} pagamento${monthPaymentsCount !== 1 ? "s" : ""} registrado${monthPaymentsCount !== 1 ? "s" : ""}`}
            hint="Total efetivamente recebido no mês"
            color="bg-blue-600/15 text-blue-500" />
          <StatCard icon={TrendingDown} label="Descontos Concedidos"
            value={fmt(discounts)}
            sub={monthLabel}
            hint="Diferença entre valor base e valor cobrado"
            color="bg-orange-500/15 text-orange-500" />
          <StatCard icon={AlertTriangle} label="Taxas & Custos"
            value={fmt(monthCosts)}
            sub={`${(costs || []).filter((c: any) => new Date(c.cost_date) >= monthStart).length} registros`}
            hint="VPS, APIs, proxies e ferramentas"
            color="bg-destructive/15 text-destructive" />
          <StatCard icon={Wallet} label="Receita Líquida (No Bolso)"
            value={fmt(netRevenue)}
            sub={netRevenue >= 0 ? "Positivo" : "Negativo"}
            hint="Recebida − Taxas & Custos"
            color={netRevenue >= 0 ? "bg-green-600/15 text-green-500" : "bg-destructive/15 text-destructive"} />
        </div>
      </div>

      {/* Operacional */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Operacional</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Server} label="Instâncias Liberadas"
            value={totalAllocated} sub={`Capacidade: ${SERVER_MAX_INSTANCES}`}
            color="bg-primary/15 text-primary" />
          <StatCard icon={Server} label="Instâncias em Uso"
            value={totalInUse} sub={`${stats.active_devices} conectadas`}
            color="bg-blue-600/15 text-blue-500" />
          <StatCard icon={Gauge} label="Ocupação do Servidor"
            value={`${serverOccupancy}%`} sub={`${totalInUse}/${SERVER_MAX_INSTANCES}`}
            color={serverOccupancy >= 80 ? "bg-destructive/15 text-destructive" : "bg-green-600/15 text-green-500"} />
          <StatCard icon={Ban} label="Clientes Bloqueados"
            value={blocked.length} sub="Suspensos + cancelados"
            color="bg-muted text-muted-foreground" />
        </div>

        {/* Capacity bar */}
        <div className="bg-card border border-border rounded-lg p-4 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Capacidade do Servidor</span>
            <span className="text-xs text-foreground">{totalInUse} / {SERVER_MAX_INSTANCES}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
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
