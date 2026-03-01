import { useState, useMemo } from "react";
import { Search, ChevronRight, AlertTriangle, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/hooks/useAdmin";

interface Props {
  users: AdminUser[];
  onSelectClient: (u: AdminUser) => void;
}

const statusColors: Record<string, string> = {
  active: "bg-green-600",
  suspended: "bg-yellow-600",
  cancelled: "bg-red-600",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  cancelled: "Cancelado",
};

const AdminClientsTable = ({ users, onSelectClient }: Props) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (q && !u.full_name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q) && !u.phone?.includes(q)) return false;
      return true;
    });
  }, [users, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100"
          />
        </div>
        <div className="flex gap-1.5">
          {[
            { label: "Todos", value: "all" },
            { label: "Ativos", value: "active" },
            { label: "Suspensos", value: "suspended" },
            { label: "Cancelados", value: "cancelled" },
          ].map(f => (
            <Button
              key={f.value}
              size="sm"
              variant={statusFilter === f.value ? "default" : "outline"}
              onClick={() => setStatusFilter(f.value)}
              className={statusFilter === f.value ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-zinc-700 text-zinc-400"}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-zinc-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Telefone</th>
                <th className="text-left px-4 py-3">Plano</th>
                <th className="text-left px-4 py-3">Instâncias</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Vencimento</th>
                <th className="text-left px-4 py-3">Último Login</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-zinc-500">Nenhum cliente encontrado</td></tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors cursor-pointer" onClick={() => onSelectClient(u)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-100 font-medium">{u.full_name || "—"}</span>
                        {u.risk_flag && <span title="Alto risco"><AlertTriangle size={14} className="text-red-400" /></span>}
                        {u.roles.includes("admin") && <span title="Admin"><Shield size={14} className="text-purple-400" /></span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                    <td className="px-4 py-3 text-zinc-400">{u.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-zinc-300">{u.plan_name || "Sem plano"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-zinc-300">{u.devices_connected}/{u.devices_count}</span>
                      <span className="text-zinc-500 text-xs ml-1">de {u.max_instances}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${statusColors[u.status] || "bg-zinc-600"} text-white text-[10px] px-2`}>
                        {statusLabels[u.status] || u.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("pt-BR") : "Nunca"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                        Gerenciar <ChevronRight size={14} className="ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-zinc-500 text-right">{filtered.length} de {users.length} clientes</p>
    </div>
  );
};

export default AdminClientsTable;
