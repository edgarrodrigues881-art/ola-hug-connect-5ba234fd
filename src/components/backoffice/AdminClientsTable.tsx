import { useState, useMemo } from "react";
import { Search, ChevronRight, AlertTriangle, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/hooks/useAdmin";
import { calculateClientScore, scoreColors, type ScoreLevel } from "@/lib/clientScore";

interface Props {
  users: AdminUser[];
  cycles?: any[];
  adminLogs?: any[];
  onSelectClient: (u: AdminUser) => void;
}

const planColors: Record<string, string> = {
  Start: "text-zinc-400",
  Pro: "text-blue-400",
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

const AdminClientsTable = ({ users, cycles = [], adminLogs = [], onSelectClient }: Props) => {
  const [search, setSearch] = useState("");

  const userScores = useMemo(() => {
    const map = new Map<string, { level: ScoreLevel; label: string; score: number }>();
    users.forEach(u => {
      const uCycles = cycles.filter((c: any) => c.user_id === u.id);
      const uLogs = adminLogs.filter((l: any) => l.target_user_id === u.id);
      const s = calculateClientScore({ risk_flag: u.risk_flag, cycles: uCycles, admin_logs: uLogs });
      map.set(u.id, { level: s.level, label: s.label, score: s.score });
    });
    return map;
  }, [users, cycles, adminLogs]);
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      const sub = getSubStatus(u);
      if (filter === "expiring" && sub.label !== "Vencendo") return false;
      if (filter === "expired" && sub.label !== "Vencida") return false;
      if (filter === "risk" && !u.risk_flag) return false;
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
    const risk = users.filter(u => u.risk_flag).length;
    return { exp, expiring, risk };
  }, [users]);

  const filters = [
    { label: "Todos", value: "all" },
    { label: "Ativos", value: "active" },
    { label: "Suspensos", value: "suspended" },
    { label: `Vencendo (${counts.expiring})`, value: "expiring" },
    { label: `Vencidos (${counts.exp})`, value: "expired" },
    { label: `Risco (${counts.risk})`, value: "risk" },
    { label: "Start", value: "Start" },
    { label: "Pro", value: "Pro" },
    { label: "Scale", value: "Scale" },
    { label: "Elite", value: "Elite" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome, email ou telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-card border-border" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {filters.map(f => (
            <Button key={f.value} size="sm" variant={filter === f.value ? "default" : "outline"}
              onClick={() => setFilter(f.value)}
              className={filter === f.value
                ? "bg-primary hover:bg-primary/90 text-primary-foreground text-[11px]"
                : "border-border text-muted-foreground text-[11px] px-2"
              }
            >{f.label}</Button>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-wider">
                <th className="text-left px-3 py-2.5">Cliente</th>
                <th className="text-left px-3 py-2.5">Score</th>
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
                const us = userScores.get(u.id);
                const sColor = us ? scoreColors[us.level] : null;

                return (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onSelectClient(u)}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-foreground font-medium text-xs">{u.full_name || "—"}</span>
                        {u.risk_flag && <AlertTriangle size={12} className="text-destructive" />}
                        {u.roles.includes("admin") && <Shield size={12} className="text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      {us && sColor && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${sColor.bg} ${sColor.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sColor.dot}`} />
                          {us.score}
                        </span>
                      )}
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
