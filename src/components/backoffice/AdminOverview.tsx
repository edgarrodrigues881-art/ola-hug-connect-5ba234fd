import { useMemo } from "react";
import {
  DollarSign, TrendingUp, AlertTriangle, Users, Server, Gauge,
  Ban, Clock, XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AdminDashboard } from "@/hooks/useAdmin";

// Server capacity — adjust this as your VPS scales
const SERVER_MAX_INSTANCES = 500;

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

const StatCard = ({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) => (
  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex items-start gap-4">
    <div className={`p-2.5 rounded-lg ${color}`}>
      <Icon size={20} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-0.5 text-zinc-100">{value}</p>
      {sub && <p className="text-[11px] text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const AdminOverview = ({ data }: { data: AdminDashboard }) => {
  const { stats, users } = data;

  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 86400000);

  // Financial metrics
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

  // Operational
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
            <div className="flex items-center gap-3 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3">
              <XCircle size={18} className="text-red-400 shrink-0" />
              <span className="text-sm text-red-300 font-medium">
                🔴 {expired.length} cliente{expired.length > 1 ? "s" : ""} com plano vencido
              </span>
              <div className="flex gap-1 ml-auto flex-wrap">
                {expired.slice(0, 3).map(u => (
                  <Badge key={u.id} className="bg-red-800/50 text-red-200 text-[10px]">{u.full_name || u.email}</Badge>
                ))}
                {expired.length > 3 && <Badge className="bg-red-800/50 text-red-200 text-[10px]">+{expired.length - 3}</Badge>}
              </div>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="flex items-center gap-3 bg-yellow-900/30 border border-yellow-700/50 rounded-xl px-4 py-3">
              <Clock size={18} className="text-yellow-400 shrink-0" />
              <span className="text-sm text-yellow-300 font-medium">
                ⚠️ {expiringSoon.length} cliente{expiringSoon.length > 1 ? "s" : ""} vence{expiringSoon.length > 1 ? "m" : ""} em até 3 dias
              </span>
              <div className="flex gap-1 ml-auto flex-wrap">
                {expiringSoon.slice(0, 3).map(u => {
                  const d = getDaysLeft(u.plan_expires_at);
                  return (
                    <Badge key={u.id} className="bg-yellow-800/50 text-yellow-200 text-[10px]">
                      {u.full_name || u.email} ({d}d)
                    </Badge>
                  );
                })}
                {expiringSoon.length > 3 && <Badge className="bg-yellow-800/50 text-yellow-200 text-[10px]">+{expiringSoon.length - 3}</Badge>}
              </div>
            </div>
          )}
          {serverOccupancy >= 80 && (
            <div className="flex items-center gap-3 bg-orange-900/30 border border-orange-700/50 rounded-xl px-4 py-3">
              <Gauge size={18} className="text-orange-400 shrink-0" />
              <span className="text-sm text-orange-300 font-medium">
                🔥 Capacidade do servidor em {serverOccupancy}% ({totalInUse}/{SERVER_MAX_INSTANCES} instâncias)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Section: Financeiro */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3 font-semibold">💰 Financeiro</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={DollarSign}
            label="Receita Ativa Mensal"
            value={`R$ ${activeRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            sub={`${users.filter(u => u.plan_expires_at && new Date(u.plan_expires_at) > now && u.plan_price > 0).length} planos ativos`}
            color="bg-green-600/20 text-green-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Receita Potencial Máx."
            value={`R$ ${maxRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
            sub="Se todos pagassem"
            color="bg-blue-600/20 text-blue-400"
          />
          <StatCard
            icon={AlertTriangle}
            label="Inadimplentes"
            value={expired.length}
            sub="Planos vencidos"
            color="bg-red-600/20 text-red-400"
          />
          <StatCard
            icon={Clock}
            label="Vencendo ≤3 dias"
            value={expiringSoon.length}
            sub="Risco de churn"
            color="bg-yellow-600/20 text-yellow-400"
          />
        </div>
      </div>

      {/* Section: Operacional */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3 font-semibold">⚙️ Operacional</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Server}
            label="Instâncias Liberadas"
            value={totalAllocated}
            sub={`Servidor: ${totalInUse}/${SERVER_MAX_INSTANCES}`}
            color="bg-purple-600/20 text-purple-400"
          />
          <StatCard
            icon={Server}
            label="Instâncias em Uso"
            value={totalInUse}
            sub={`${stats.active_devices} conectadas`}
            color="bg-blue-600/20 text-blue-400"
          />
          <StatCard
            icon={Gauge}
            label="Ocupação do Sistema"
            value={`${occupancy}%`}
            sub={`Servidor: ${serverOccupancy}%`}
            color={serverOccupancy >= 80 ? "bg-red-600/20 text-red-400" : "bg-green-600/20 text-green-400"}
          />
          <StatCard
            icon={Ban}
            label="Clientes Bloqueados"
            value={blocked.length}
            sub="Suspensos + cancelados"
            color="bg-zinc-600/20 text-zinc-400"
          />
        </div>
      </div>

      {/* Capacity bar */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-400 uppercase tracking-wide">Capacidade do Servidor</span>
          <span className="text-xs text-zinc-300">{totalInUse} / {SERVER_MAX_INSTANCES} instâncias</span>
        </div>
        <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              serverOccupancy >= 90 ? "bg-red-500" : serverOccupancy >= 70 ? "bg-yellow-500" : "bg-purple-500"
            }`}
            style={{ width: `${Math.min(serverOccupancy, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-zinc-500">0%</span>
          <span className={`text-[10px] font-medium ${serverOccupancy >= 80 ? "text-red-400" : "text-zinc-400"}`}>
            {serverOccupancy}% utilizado
          </span>
          <span className="text-[10px] text-zinc-500">100%</span>
        </div>
      </div>

      {/* Quick users info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total de Clientes" value={stats.total_users} color="bg-purple-600/20 text-purple-400" />
        <StatCard
          icon={Users}
          label="Alto Risco"
          value={users.filter(u => u.risk_flag).length}
          color="bg-red-600/20 text-red-400"
        />
        <StatCard icon={DollarSign} label="Ticket Médio" value={
          users.filter(u => u.plan_price > 0).length > 0
            ? `R$ ${(users.reduce((s, u) => s + (u.plan_price || 0), 0) / Math.max(users.filter(u => u.plan_price > 0).length, 1)).toFixed(2)}`
            : "R$ 0"
        } color="bg-green-600/20 text-green-400" />
        <StatCard icon={Users} label="Campanhas Totais" value={stats.total_campaigns} color="bg-orange-600/20 text-orange-400" />
      </div>
    </div>
  );
};

export default AdminOverview;
