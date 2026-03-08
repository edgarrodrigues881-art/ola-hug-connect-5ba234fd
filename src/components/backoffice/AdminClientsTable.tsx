import { useState, useMemo } from "react";
import { Search, ChevronRight, AlertTriangle, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/hooks/useAdmin";

interface Props {
  users: AdminUser[];
  onSelectClient: (u: AdminUser) => void;
}

const planColors: Record<string, string> = {
  Start: "text-zinc-400",
  Pro: "text-teal-400",
  Scale: "text-purple-400",
  Elite: "text-amber-500",
};

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

function getSubStatus(u: { plan_name: string | null; plan_expires_at: string | null }): { label: string; color: string } {
  if (!u.plan_name) return { label: "Sem plano", color: "text-muted-foreground" };
  const d = getDaysLeft(u.plan_expires_at);
  if (d === null) return { label: "Sem plano", color: "text-muted-foreground" };
  if (d <= 0) return { label: "Vencida", color: "text-destructive" };
  if (d <= 3) return { label: "Vencendo", color: "text-yellow-500" };
  return { label: "Ativa", color: "text-green-500" };
}

const statusLabels: Record<string, string> = { active: "Ativo", suspended: "Suspenso", cancelled: "Cancelado" };
const statusTextColor: Record<string, string> = { active: "text-green-500", suspended: "text-yellow-500", cancelled: "text-destructive" };

const AdminClientsTable = ({ users, onSelectClient }: Props) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      const sub = getSubStatus(u);
      if (filter === "expiring" && sub.label !== "Vencendo") return false;
      if (filter === "expired" && sub.label !== "Vencida") return false;
      
      if (["Start", "Pro", "Scale", "Elite"].includes(filter) && u.plan_name !== filter) return false;
      if (filter === "active" && u.status !== "active") return false;
      if (filter === "suspended" && u.status !== "suspended") return false;
      if (filter === "cancelled" && u.status !== "cancelled") return false;
      if (q && !u.full_name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q) && !u.phone?.includes(q)) return false;
      return true;
    });
  }, [users, search, filter]);

  const counts = useMemo(() => {
    const exp = users.filter(u => getSubStatus(u).label === "Vencida").length;
    const expiring = users.filter(u => getSubStatus(u).label === "Vencendo").length;
    return { exp, expiring };
  }, [users]);

  const filters = [
    { label: "Todos", value: "all" },
    { label: "Ativos", value: "active" },
    { label: "Suspensos", value: "suspended" },
    { label: `Vencendo (${counts.expiring})`, value: "expiring" },
    { label: `Vencidos (${counts.exp})`, value: "expired" },
    
    { label: "Start", value: "Start" },
    { label: "Pro", value: "Pro" },
    { label: "Scale", value: "Scale" },
    { label: "Elite", value: "Elite" },
  ];

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 bg-card border-border text-sm" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {filters.map(f => {
            const isActive = filter === f.value;
            const isDanger = f.value === "expired";
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`
                  shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150
                  ${isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : isDanger && counts.exp > 0
                      ? "bg-card border-destructive/30 text-destructive hover:bg-destructive/5"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }
                `}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ MOBILE: Card layout ═══ */}
      <div className="space-y-2 sm:hidden">
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhum cliente encontrado</p>
        ) : filtered.map(u => {
          const daysLeft = getDaysLeft(u.plan_expires_at);
          const isExpired = daysLeft !== null && daysLeft <= 0;
          const isExpiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 3;
          const sub = getSubStatus(u);

          return (
            <div
              key={u.id}
              onClick={() => onSelectClient(u)}
              className="bg-card border border-border rounded-xl p-3.5 active:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground font-semibold text-sm truncate">{u.full_name || "—"}</span>
                    
                    {u.roles.includes("admin") && <Shield size={12} className="text-primary shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{u.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="text-muted-foreground/60 font-medium">Plano</p>
                  <p className={`font-semibold ${planColors[u.plan_name || ""] || "text-muted-foreground"}`}>{u.plan_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground/60 font-medium">Instâncias</p>
                  <p className="font-semibold">
                    <span className={u.devices_count >= u.max_instances && u.max_instances > 0 ? "text-destructive" : "text-foreground"}>{u.devices_count}</span>
                    <span className="text-muted-foreground">/{u.max_instances}</span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground/60 font-medium">Status</p>
                  <p className={`font-semibold ${sub.color}`}>{sub.label}</p>
                </div>
              </div>

              {daysLeft !== null && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                  <span className="text-[11px] text-muted-foreground">
                    {u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString("pt-BR") : "—"}
                  </span>
                  <span className={`text-[11px] font-bold ${isExpired ? "text-destructive" : isExpiring ? "text-yellow-400" : "text-muted-foreground"}`}>
                    {isExpired ? `${Math.abs(daysLeft)}d vencido` : `${daysLeft}d restantes`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ DESKTOP: Table layout ═══ */}
      <div className="border border-border rounded-lg overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-wider">
                <th className="text-left px-3 py-2.5">Cliente</th>
                <th className="text-left px-3 py-2.5">Telefone</th>
                <th className="text-left px-3 py-2.5">Telefone</th>
                <th className="text-left px-3 py-2.5">Plano</th>
                <th className="text-left px-3 py-2.5">Instâncias</th>
                <th className="text-left px-3 py-2.5">Conta</th>
                <th className="text-left px-3 py-2.5">Assinatura</th>
                <th className="text-left px-3 py-2.5">Vencimento</th>
                <th className="text-right px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</td></tr>
              ) : filtered.map(u => {
                const daysLeft = getDaysLeft(u.plan_expires_at);
                const isExpired = daysLeft !== null && daysLeft <= 0;
                const isExpiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 3;
                const sub = getSubStatus(u);

                return (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onSelectClient(u)}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-foreground font-medium text-xs">{u.full_name || "—"}</span>
                        
                        {u.roles.includes("admin") && <Shield size={12} className="text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{u.phone || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-medium ${planColors[u.plan_name || ""] || "text-muted-foreground"}`}>
                        {u.plan_name || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`font-medium text-xs ${u.devices_count >= u.max_instances && u.max_instances > 0 ? "text-destructive" : "text-foreground"}`}>
                        {u.devices_count}
                      </span>
                      <span className="text-muted-foreground text-xs">/{u.max_instances}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-medium ${statusTextColor[u.status] || "text-muted-foreground"}`}>
                        {statusLabels[u.status] || u.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-medium ${sub.color}`}>{sub.label}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-muted-foreground text-[11px]">
                        {u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString("pt-BR") : "—"}
                      </span>
                      {daysLeft !== null && (
                        <span className={`ml-1.5 text-[10px] font-medium ${isExpired ? "text-destructive" : isExpiring ? "text-yellow-500" : "text-muted-foreground"}`}>
                          ({isExpired ? "vencido" : `${daysLeft}d`})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-xs px-2">
                        Gerenciar <ChevronRight size={12} className="ml-1" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-right">{filtered.length} de {users.length} clientes</p>
    </div>
  );
};

export default AdminClientsTable;
