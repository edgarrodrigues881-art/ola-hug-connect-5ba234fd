import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAction } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Key, Trash2, Loader2, Search, ShieldCheck, ShieldX, ShieldQuestion,
  CircleDot, Zap, Lock, AlertTriangle, RefreshCw
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Token {
  id: string;
  user_id: string;
  token: string;
  label: string | null;
  status: string;
  healthy: boolean | null;
  device_id: string | null;
  created_at: string;
  client_name: string;
  device_name: string | null;
}

const AdminTokensGlobal = () => {
  const { toast } = useToast();
  const { mutate, isPending } = useAdminAction();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cleaningIdle, setCleaningIdle] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-global-tokens"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action: "list-all-tokens" },
      });
      if (error) throw error;
      return data as { tokens: Token[]; total: number };
    },
    staleTime: 30_000,
  });

  const tokens = data?.tokens || [];

  const filtered = useMemo(() => {
    let result = tokens;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.token.toLowerCase().includes(q) ||
        t.client_name.toLowerCase().includes(q) ||
        (t.label || "").toLowerCase().includes(q) ||
        (t.device_name || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") result = result.filter(t => t.status === statusFilter);
    if (healthFilter === "valid") result = result.filter(t => t.healthy === true);
    if (healthFilter === "invalid") result = result.filter(t => t.healthy === false);
    if (healthFilter === "pending") result = result.filter(t => t.healthy === null);
    return result;
  }, [tokens, search, statusFilter, healthFilter]);

  const handleDeleteOne = (tokenId: string, userId: string) => {
    mutate(
      { action: "delete-token", body: { token_id: tokenId, target_user_id: userId } },
      {
        onSuccess: (d: any) => {
          toast({ title: `Token removido${d?.provider_deleted ? " + UAZAPI" : ""}` });
          setSelectedIds(prev => { const n = new Set(prev); n.delete(tokenId); return n; });
          refetch();
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleDeleteSelected = () => {
    const selected = tokens.filter(t => selectedIds.has(t.id));
    if (selected.length === 0) return;

    // Group by user_id for efficient deletion
    let completed = 0;
    const total = selected.length;

    selected.forEach(t => {
      mutate(
        { action: "delete-token", body: { token_id: t.id, target_user_id: t.user_id } },
        {
          onSuccess: () => {
            completed++;
            if (completed === total) {
              toast({ title: `${total} token(s) removido(s) + instâncias UAZAPI` });
              setSelectedIds(new Set());
              refetch();
            }
          },
          onError: (e) => {
            completed++;
            toast({ title: "Erro ao deletar", description: e.message, variant: "destructive" });
          },
        }
      );
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(t => t.id)));
    }
  };

  // Stats
  const available = tokens.filter(t => t.status === "available").length;
  const inUse = tokens.filter(t => t.status === "in_use").length;
  const blocked = tokens.filter(t => t.status === "blocked").length;
  const invalid = tokens.filter(t => t.healthy === false).length;
  const idle = tokens.filter(t => t.status !== "in_use" && !t.device_id).length;

  const handleCleanIdle = () => {
    setCleaningIdle(true);
    mutate(
      { action: "bulk-delete-idle-tokens", body: {} },
      {
        onSuccess: (d: any) => {
          toast({ title: `${d?.removed ?? 0} token(s) ociosos removidos (${d?.provider_deleted ?? 0} da UAZAPI)` });
          setCleaningIdle(false);
          setSelectedIds(new Set());
          refetch();
        },
        onError: (e) => {
          toast({ title: "Erro", description: e.message, variant: "destructive" });
          setCleaningIdle(false);
        },
      }
    );
  };

  const getHealthIcon = (healthy: boolean | null) => {
    if (healthy === true) return <ShieldCheck size={12} className="text-primary" />;
    if (healthy === false) return <ShieldX size={12} className="text-destructive" />;
    return <ShieldQuestion size={12} className="text-muted-foreground/50" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === "in_use") return <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/10"><CircleDot size={8} className="mr-0.5" />Em uso</Badge>;
    if (status === "blocked") return <Badge className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10"><Lock size={8} className="mr-0.5" />Bloq</Badge>;
    return <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10"><Zap size={8} className="mr-0.5" />Disp</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Key size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Tokens Globais</h2>
            <p className="text-xs text-muted-foreground">{tokens.length} tokens em {new Set(tokens.map(t => t.user_id)).size} contas</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs rounded-lg h-8">
          <RefreshCw size={13} /> Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Zap size={14} className="text-primary" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-medium">Disponíveis</p><p className="text-xl font-bold tabular-nums">{available}</p></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><CircleDot size={14} className="text-amber-500" /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-medium">Em uso</p><p className="text-xl font-bold tabular-nums">{inUse}</p></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${blocked > 0 ? "bg-destructive/10" : "bg-muted/50"}`}><Lock size={14} className={blocked > 0 ? "text-destructive" : "text-muted-foreground/40"} /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-medium">Bloqueados</p><p className="text-xl font-bold tabular-nums">{blocked}</p></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${invalid > 0 ? "bg-destructive/10" : "bg-muted/50"}`}><AlertTriangle size={14} className={invalid > 0 ? "text-destructive" : "text-muted-foreground/40"} /></div>
          <div><p className="text-[10px] text-muted-foreground uppercase font-medium">Inválidos</p><p className="text-xl font-bold tabular-nums">{invalid}</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por token, cliente, label..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-muted/30 border-border text-xs h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="available">Disponível</SelectItem>
            <SelectItem value="in_use">Em uso</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos saúde</SelectItem>
            <SelectItem value="valid">Válidos</SelectItem>
            <SelectItem value="invalid">Inválidos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-2.5">
          <span className="text-xs text-foreground font-medium">{selectedIds.size} selecionado(s)</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" className="gap-1.5 text-xs h-7 ml-auto" disabled={isPending}>
                <Trash2 size={12} /> Apagar selecionados + UAZAPI
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Apagar {selectedIds.size} token(s)?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Os tokens serão removidos do banco E as instâncias deletadas da UAZAPI. Esta ação é permanente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Apagar todos
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2.5 text-left w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-muted-foreground font-medium">#</th>
                <th className="px-3 py-2.5 text-left text-muted-foreground font-medium">Cliente</th>
                <th className="px-3 py-2.5 text-left text-muted-foreground font-medium">Token</th>
                <th className="px-3 py-2.5 text-left text-muted-foreground font-medium">Label</th>
                <th className="px-3 py-2.5 text-left text-muted-foreground font-medium">Status</th>
                <th className="px-3 py-2.5 text-left text-muted-foreground font-medium">Saúde</th>
                <th className="px-3 py-2.5 text-left text-muted-foreground font-medium">Instância</th>
                <th className="px-3 py-2.5 text-right text-muted-foreground font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum token encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((t, idx) => (
                  <tr
                    key={t.id}
                    className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                      t.healthy === false ? "bg-destructive/[0.02]" : ""
                    } ${selectedIds.has(t.id) ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground/50 tabular-nums">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-foreground max-w-[140px] truncate">{t.client_name}</td>
                    <td className="px-3 py-2">
                      <code className="text-[10px] font-mono bg-muted/40 px-1.5 py-0.5 rounded max-w-[150px] truncate block">
                        {t.token}
                      </code>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">{t.label || "—"}</td>
                    <td className="px-3 py-2">{getStatusBadge(t.status)}</td>
                    <td className="px-3 py-2">{getHealthIcon(t.healthy)}</td>
                    <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">{t.device_name || "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10" disabled={isPending}>
                            <Trash2 size={12} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apagar token?</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                              Token de <strong>{t.client_name}</strong> será removido do banco e a instância deletada da UAZAPI.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteOne(t.id, t.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Apagar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-[10px] text-muted-foreground">
            Exibindo {filtered.length} de {tokens.length} tokens
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTokensGlobal;
