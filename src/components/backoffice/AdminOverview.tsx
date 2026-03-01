import { Users, Wifi, Send, Contact, CreditCard, Server } from "lucide-react";
import type { AdminDashboard } from "@/hooks/useAdmin";

const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) => (
  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex items-start gap-4">
    <div className={`p-2.5 rounded-lg ${color}`}>
      <Icon size={22} />
    </div>
    <div>
      <p className="text-xs text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  </div>
);

const AdminOverview = ({ data }: { data: AdminDashboard }) => {
  const { stats } = data;
  
  // Compute expiring soon (next 3 days)
  const now = new Date();
  const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const expiringSoon = data.users.filter(u => {
    if (!u.plan_expires_at) return false;
    const exp = new Date(u.plan_expires_at);
    return exp > now && exp <= threeDays;
  });
  const expired = data.users.filter(u => {
    if (!u.plan_expires_at) return false;
    return new Date(u.plan_expires_at) < now;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total de Usuários" value={stats.total_users} color="bg-purple-600/20 text-purple-400" />
        <StatCard icon={Server} label="Total de Instâncias" value={stats.total_devices} color="bg-blue-600/20 text-blue-400" />
        <StatCard icon={Wifi} label="Instâncias Conectadas" value={stats.active_devices} color="bg-green-600/20 text-green-400" />
        <StatCard icon={Send} label="Campanhas" value={stats.total_campaigns} color="bg-orange-600/20 text-orange-400" />
        <StatCard icon={Contact} label="Contatos" value={stats.total_contacts} color="bg-cyan-600/20 text-cyan-400" />
        <StatCard icon={CreditCard} label="Assinaturas" value={stats.total_subscriptions} color="bg-pink-600/20 text-pink-400" />
      </div>

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-yellow-300 mb-2">⚠️ Vencendo em até 3 dias ({expiringSoon.length})</h3>
          <div className="space-y-1">
            {expiringSoon.map(u => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{u.full_name || u.email}</span>
                <span className="text-yellow-400 text-xs">
                  {u.plan_name} — Vence {new Date(u.plan_expires_at!).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired */}
      {expired.length > 0 && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-red-300 mb-2">🔴 Planos Expirados ({expired.length})</h3>
          <div className="space-y-1">
            {expired.map(u => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{u.full_name || u.email}</span>
                <span className="text-red-400 text-xs">
                  {u.plan_name} — Expirou {new Date(u.plan_expires_at!).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
