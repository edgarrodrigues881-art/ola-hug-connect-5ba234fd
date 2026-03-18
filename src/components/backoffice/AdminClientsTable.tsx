import { useState, useMemo, useCallback, memo } from "react";
import { Search, ChevronRight, Shield, ChevronDown, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  // Brazilian: 55 + DDD(2) + number(8-9)
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)} ${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  }
  if (digits.length === 11) {
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  // Generic: country(1-3) + rest, just space every 4
  return `+${digits.replace(/(\d{2})(\d{2,5})(\d{4,})/, "$1 $2 $3")}`;
}

const PAGE_SIZE = 30;

const AdminClientsTable = memo(({ users, onSelectClient }: Props) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data?action=delete-client`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ target_user_id: deleteTarget.id }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Erro ao excluir");
      toast.success("Cliente excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir cliente");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, queryClient]);

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

  // Reset page when filters change
  const handleSearch = useCallback((val: string) => { setSearch(val); setPage(0); }, []);
  const handleFilter = useCallback((val: string) => { setFilter(val); setPage(0); }, []);

  const paginatedItems = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const counts = useMemo(() => {
    const exp = users.filter(u => getSubStatus(u).label === "Vencida").length;
    const expiring = users.filter(u => getSubStatus(u).label === "Vencendo").length;
    return { exp, expiring };
  }, [users]);

  const filterGroups = [
    {
      label: null,
      items: [{ label: "Todos", value: "all" }],
    },
    {
      label: "Status",
      items: [
        { label: "Ativos", value: "active" },
        { label: "Suspensos", value: "suspended" },
        { label: `Vencendo (${counts.expiring})`, value: "expiring" },
        { label: `Vencidos (${counts.exp})`, value: "expired" },
      ],
    },
    {
      label: "Planos",
      items: [
        { label: "Start", value: "Start" },
        { label: "Pro", value: "Pro" },
        { label: "Scale", value: "Scale" },
        { label: "Elite", value: "Elite" },
      ],
    },
  ];

  const renderFilterBtn = (f: { label: string; value: string }) => {
    const isActive = filter === f.value;
    const isDanger = f.value === "expired";
    return (
      <button
        key={f.value}
        onClick={() => handleFilter(f.value)}
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
  };

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por" value={search} onChange={e => handleSearch(e.target.value)} className="pl-9 h-9 bg-card border-border text-sm" />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
              showFilters || filter !== "all"
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            Filtros
            {filter !== "all" && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 p-3 bg-card border border-border rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
            {filterGroups.filter(g => g.label).map((group, gi) => (
              <>
                <span key={`l-${gi}`} className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold self-center">{group.label}</span>
                <div key={`f-${gi}`} className="flex items-center gap-1.5 overflow-x-auto">
                  {group.items.map(f => renderFilterBtn(f))}
                </div>
              </>
            ))}
          </div>
        )}
      </div>

      {/* ═══ MOBILE: Card layout ═══ */}
      <div className="space-y-2 sm:hidden">
        {paginatedItems.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhum cliente encontrado</p>
        ) : paginatedItems.map(u => {
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
                {!u.roles.includes("admin") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 p-1.5 h-auto shrink-0"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
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
                <th className="text-left px-3 py-2.5">Plano</th>
                <th className="text-left px-3 py-2.5">Instâncias</th>
                <th className="text-left px-3 py-2.5">Conta</th>
                <th className="text-left px-3 py-2.5">Assinatura</th>
                <th className="text-left px-3 py-2.5">Vencimento</th>
                <th className="text-right px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedItems.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</td></tr>
              ) : paginatedItems.map(u => {
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
                    <td className="px-3 py-2.5 text-muted-foreground text-xs font-mono tracking-wide whitespace-nowrap">{formatPhone(u.phone)}</td>
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
                      <div className="flex items-center justify-end gap-1">
                        {!u.roles.includes("admin") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 text-xs px-2"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 text-xs px-2">
                          Gerenciar <ChevronRight size={12} className="ml-1" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination + Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} de {users.length} clientes</p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground px-2">{page + 1}/{totalPages}</span>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Próxima
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os dados de <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong> serão removidos permanentemente: instâncias, campanhas, contatos, assinatura, logs e a conta de autenticação. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
AdminClientsTable.displayName = "AdminClientsTable";

export default AdminClientsTable;
