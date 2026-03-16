import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, RefreshCw, Users, Wifi, WifiOff, ChevronDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";


const CommunityPoolTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("connected");
  const [filterEnrolled, setFilterEnrolled] = useState("all");
  const [filterPhase, setFilterPhase] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showOnlyWithCycle, setShowOnlyWithCycle] = useState(true);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["community-pool"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-data?action=community-pool-list");
      if (error) throw error;
      return data?.instances || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ device_id, field, value, user_id }: any) => {
      const { error } = await supabase.functions.invoke("admin-data?action=community-pool-toggle", {
        body: { device_id, field, value, user_id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-pool"] });
      toast({ title: "Atualizado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const filtered = (data || []).filter((d: any) => {
    if (search) {
      const q = search.toLowerCase();
      if (!d.name?.toLowerCase().includes(q) && !d.number?.includes(q) && !d.owner_name?.toLowerCase().includes(q) && !d.owner_email?.toLowerCase().includes(q)) return false;
    }
    if (filterStatus === "connected" && !["connected", "ready"].includes(d.status?.toLowerCase())) return false;
    if (filterStatus === "disconnected" && d.status?.toLowerCase() !== "disconnected") return false;
    if (filterEnrolled === "yes" && !d.is_enrolled) return false;
    if (filterEnrolled === "no" && d.is_enrolled) return false;
    if (filterPhase !== "all" && d.cycle_phase !== filterPhase) return false;
    if (showOnlyWithCycle && !d.cycle_active) return false;
    return true;
  });

  const allData = data || [];
  const enrolled = allData.filter((d: any) => d.is_enrolled).length;
  const connected = allData.filter((d: any) => ["connected", "ready"].includes(d.status?.toLowerCase())).length;
  const hasActiveFilter = filterStatus !== "connected" || filterEnrolled !== "all" || filterPhase !== "all" || !showOnlyWithCycle;

  const statusColor = (s: string) => {
    const lower = s?.toLowerCase();
    if (lower === "connected" || lower === "ready") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (lower === "disconnected") return "bg-red-500/15 text-red-400 border-red-500/30";
    return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Users size={16} className="mx-auto text-primary mb-1" />
          <p className="text-lg font-bold text-foreground">{allData.length}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Wifi size={16} className="mx-auto text-emerald-400 mb-1" />
          <p className="text-lg font-bold text-foreground">{connected}</p>
          <p className="text-[10px] text-muted-foreground">Conectados</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <WifiOff size={16} className="mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold text-foreground">{enrolled}</p>
          <p className="text-[10px] text-muted-foreground">Ativos</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 bg-card border-border text-xs h-8" />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
              showFilters || hasActiveFilter
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            <Filter size={12} />
            Filtros
            {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            <ChevronDown size={12} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 px-2 shrink-0">
            <RefreshCw size={13} />
          </Button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-card border border-border rounded-lg animate-in fade-in slide-in-from-top-1 duration-200">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 bg-background border-border text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="disconnected">Disconnected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEnrolled} onValueChange={setFilterEnrolled}>
              <SelectTrigger className="h-8 bg-background border-border text-xs"><SelectValue placeholder="Ativo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="yes">Ativo</SelectItem>
                <SelectItem value="no">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPhase} onValueChange={setFilterPhase}>
              <SelectTrigger className="h-8 bg-background border-border text-xs"><SelectValue placeholder="Phase" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas phases</SelectItem>
                <SelectItem value="pre_24h">pre_24h</SelectItem>
                <SelectItem value="groups_only">groups_only</SelectItem>
                <SelectItem value="autosave_enabled">autosave_enabled</SelectItem>
                <SelectItem value="community_enabled">community_enabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground font-medium">{filtered.length} instância(s)</p>

      {/* ═══ MOBILE: Card layout ═══ */}
      <div className="space-y-2 sm:hidden">
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma instância encontrada</p>
        ) : filtered.map((d: any) => (
          <div key={d.id} className="bg-card border border-border rounded-xl p-3.5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{d.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{d.owner_name} · {d.number || "—"}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColor(d.status)}`}>{d.status}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <p className="text-muted-foreground/60 font-medium">Phase</p>
                <p className="font-semibold text-foreground">{d.cycle_phase || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground/60 font-medium">Dia</p>
                <p className="font-semibold text-foreground">{d.cycle_active ? `${d.cycle_day_index}/${d.cycle_days_total}` : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground/60 font-medium">Ciclo</p>
                <p className="font-semibold text-foreground">{d.cycle_active ? "✅" : "—"}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Ativo</span>
                <Switch
                  checked={d.is_enrolled}
                  onCheckedChange={(v) => toggleMutation.mutate({ device_id: d.id, field: "is_enrolled", value: v, user_id: d.user_id })}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Elegível</span>
                <Switch
                  checked={d.is_eligible}
                  onCheckedChange={(v) => toggleMutation.mutate({ device_id: d.id, field: "is_eligible", value: v, user_id: d.user_id })}
                  className="scale-75"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ DESKTOP: Table layout ═══ */}
      <div className="border border-border rounded-lg overflow-hidden hidden sm:block">
        <div
          className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto"
          style={{ contain: "layout style", willChange: "scroll-position", overscrollBehavior: "contain" }}
        >
          <table className="w-full text-sm min-w-[980px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-wider">
                <th className="text-left px-3 py-2.5">Usuário</th>
                <th className="text-left px-3 py-2.5">Instância</th>
                <th className="text-left px-3 py-2.5">Telefone</th>
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-left px-3 py-2.5">Ciclo</th>
                <th className="text-left px-3 py-2.5">Phase</th>
                <th className="text-left px-3 py-2.5">Dia</th>
                <th className="text-center px-3 py-2.5">Ativo</th>
                <th className="text-center px-3 py-2.5">Elegível</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">Nenhuma instância encontrada</td></tr>
              ) : filtered.map((d: any) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors text-xs">
                  <td className="px-3 py-2.5">
                    <div className="truncate max-w-[150px] font-medium text-foreground">{d.owner_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{d.owner_email}</div>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-foreground">{d.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{d.number || "—"}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className={`text-[10px] ${statusColor(d.status)}`}>{d.status}</Badge>
                  </td>
                  <td className="px-3 py-2.5">{d.cycle_active ? "✅" : "—"}</td>
                  <td className="px-3 py-2.5">
                    {d.cycle_phase ? <Badge variant="outline" className="text-[10px]">{d.cycle_phase}</Badge> : "—"}
                  </td>
                  <td className="px-3 py-2.5">{d.cycle_active ? `${d.cycle_day_index}/${d.cycle_days_total}` : "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <Switch
                      checked={d.is_enrolled}
                      onCheckedChange={(v) => toggleMutation.mutate({ device_id: d.id, field: "is_enrolled", value: v, user_id: d.user_id })}
                      className="scale-75"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Switch
                      checked={d.is_eligible}
                      onCheckedChange={(v) => toggleMutation.mutate({ device_id: d.id, field: "is_eligible", value: v, user_id: d.user_id })}
                      className="scale-75"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CommunityPoolTab;
