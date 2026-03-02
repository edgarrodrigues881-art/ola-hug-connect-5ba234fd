import { useMemo } from "react";
import {
  DollarSign, TrendingUp, AlertTriangle, Users, Server, Gauge,
  Ban, Clock, XCircle
} from "lucide-react";
import type { AdminDashboard } from "@/hooks/useAdmin";

const SERVER_MAX_INSTANCES = 500;

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

const StatCard = ({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) => (
  <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
    <div className={`p-2 rounded-md ${color}`}>
      <Icon size={18} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      <p className="text-xl font-bold mt-0.5 text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </div>
);

const AdminOverview = ({ data }: { data: AdminDashboard }) => {
  const { stats, users } = data;

  const now = new Date();

  const activeRevenue = useMemo(() =>
    users.reduce((sum, u) => {
      if (u.plan_expires_at && new Date(u.plan_expires_at) > now && u.plan_price > 0) return sum + u.plan_price;
      return sum;
    }, 0),
  [users]);

  const maxRevenue = useMemo(() =>
    users.reduce((sum, u) => sum + (u.plan_price || 0), 0),
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

  const totalAllocated = useMemo(() => users.reduce((s, u) => s + u.max_instances, 0), [users]);
  const totalInUse = stats.total_devices;
  const occupancy = totalAllocated > 0 ? Math.round((totalInUse / totalAllocated) * 100) : 0;
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
                {expired.length} cliente{expired.length > 1 ? "s" : ""} com plano vencido
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {expired.slice(0, 3).map(u => u.full_name || u.email).join(", ")}
                {expired.length > 3 && ` +${expired.length - 3}`}
              </span>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-600/30 rounded-lg px-4 py-2.5">
              <Clock size={16} className="text-yellow-500 shrink-0" />
              <span className="text-sm text-yellow-500 font-medium">
                {expiringSoon.length} cliente{expiringSoon.length > 1 ? "s" : ""} vence{expiringSoon.length > 1 ? "m" : ""} em até 3 dias
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {expiringSoon.slice(0, 3).map(u => {
                  const d = getDaysLeft(u.plan_expires_at);
                  return `${u.full_name || u.email} (${d}d)`;
                }).join(", ")}
                {expiringSoon.length > 3 && ` +${expiringSoon.length - 3}`}
              </span>
            </div>
          )}
          {serverOccupancy >= 80 && (
            <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-600/30 rounded-lg px-4 py-2.5">
              <Gauge size={16} className="text-orange-500 shrink-0" />
              <span className="text-sm text-orange-500 font-medium">
                Capacidade do servidor em {serverOccupancy}% ({totalInUse}/{SERVER_MAX_INSTANCES})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Section: Financeiro */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Financeiro</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={DollarSign} label="Receita Ativa Mensal"
            value={`R$ ${activeRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            sub={`${users.filter(u => u.plan_expires_at && new Date(u.plan_expires_at) > now && u.plan_price > 0).length} planos ativos`}
            color="bg-green-600/15 text-green-500" />
          <StatCard icon={TrendingUp} label="Receita Potencial Máx."
            value={`R$ ${maxRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            sub="Se todos pagassem"
            color="bg-blue-600/15 text-blue-500" />
          <StatCard icon={AlertTriangle} label="Inadimplentes"
            value={expired.length} sub="Planos vencidos"
            color="bg-destructive/15 text-destructive" />
          <StatCard icon={Clock} label="Vencendo ≤3 dias"
            value={expiringSoon.length} sub="Risco de churn"
            color="bg-yellow-500/15 text-yellow-500" />
        </div>
      </div>

      {/* Section: Operacional */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Operacional</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Server} label="Instâncias Liberadas"
            value={totalAllocated} sub={`Servidor: ${totalInUse}/${SERVER_MAX_INSTANCES}`}
            color="bg-primary/15 text-primary" />
          <StatCard icon={Server} label="Instâncias em Uso"
            value={totalInUse} sub={`${stats.active_devices} conectadas`}
            color="bg-blue-600/15 text-blue-500" />
          <StatCard icon={Gauge} label="Ocupação do Sistema"
            value={`${occupancy}%`} sub={`Servidor: ${serverOccupancy}%`}
            color={serverOccupancy >= 80 ? "bg-destructive/15 text-destructive" : "bg-green-600/15 text-green-500"} />
          <StatCard icon={Ban} label="Clientes Bloqueados"
            value={blocked.length} sub="Suspensos + cancelados"
            color="bg-muted text-muted-foreground" />
        </div>
      </div>

      {/* Capacity bar */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Capacidade do Servidor</span>
          <span className="text-xs text-foreground">{totalInUse} / {SERVER_MAX_INSTANCES} instâncias</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              serverOccupancy >= 90 ? "bg-destructive" : serverOccupancy >= 70 ? "bg-yellow-500" : "bg-primary"
            }`}
            style={{ width: `${Math.min(serverOccupancy, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">0%</span>
          <span className={`text-[10px] font-medium ${serverOccupancy >= 80 ? "text-destructive" : "text-muted-foreground"}`}>
            {serverOccupancy}% utilizado
          </span>
          <span className="text-[10px] text-muted-foreground">100%</span>
        </div>
      </div>

      {/* Quick users info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total de Clientes" value={stats.total_users} color="bg-primary/15 text-primary" />
        <StatCard icon={Users} label="Alto Risco" value={users.filter(u => u.risk_flag).length} color="bg-destructive/15 text-destructive" />
        <StatCard icon={DollarSign} label="Ticket Médio" value={
          users.filter(u => u.plan_price > 0).length > 0
            ? `R$ ${(users.reduce((s, u) => s + (u.plan_price || 0), 0) / Math.max(users.filter(u => u.plan_price > 0).length, 1)).toFixed(2)}`
            : "R$ 0"
        } color="bg-green-600/15 text-green-500" />
        <StatCard icon={Users} label="Campanhas Totais" value={stats.total_campaigns} color="bg-orange-500/15 text-orange-500" />
      </div>
    </div>
  );
};

export default AdminOverview;
