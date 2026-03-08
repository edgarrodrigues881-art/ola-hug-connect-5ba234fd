import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const CommunityPoolTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEnrolled, setFilterEnrolled] = useState("all");
  const [filterPhase, setFilterPhase] = useState("all");

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
    if (filterStatus !== "all" && d.status?.toLowerCase() !== filterStatus) return false;
    if (filterEnrolled === "yes" && !d.is_enrolled) return false;
    if (filterEnrolled === "no" && d.is_enrolled) return false;
    if (filterPhase !== "all" && d.cycle_phase !== filterPhase) return false;
    return true;
  });

  const statusColor = (s: string) => {
    const lower = s?.toLowerCase();
    if (lower === "connected" || lower === "ready") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (lower === "disconnected") return "bg-red-500/15 text-red-400 border-red-500/30";
    return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar telefone, nome, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 bg-background border-border text-xs h-8" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] h-8 bg-background border-border text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="disconnected">Disconnected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEnrolled} onValueChange={setFilterEnrolled}>
            <SelectTrigger className="w-[110px] h-8 bg-background border-border text-xs"><SelectValue placeholder="Pool" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="yes">No Pool</SelectItem>
              <SelectItem value="no">Fora do Pool</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPhase} onValueChange={setFilterPhase}>
            <SelectTrigger className="w-[140px] h-8 bg-background border-border text-xs"><SelectValue placeholder="Phase" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas phases</SelectItem>
              <SelectItem value="pre_24h">pre_24h</SelectItem>
              <SelectItem value="groups_only">groups_only</SelectItem>
              <SelectItem value="autosave_enabled">autosave_enabled</SelectItem>
              <SelectItem value="community_enabled">community_enabled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 gap-1 text-xs ml-auto">
            <RefreshCw size={12} /> Atualizar
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground font-medium">{filtered.length} instância(s)</p>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="max-h-[calc(100vh-340px)] overflow-y-auto" style={{ contain: "layout style", willChange: "scroll-position", overscrollBehavior: "contain" }}>
          <Table>
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="bg-card">
                <TableHead className="text-xs">Usuário</TableHead>
                <TableHead className="text-xs">Instância</TableHead>
                <TableHead className="text-xs">Telefone</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Ciclo</TableHead>
                <TableHead className="text-xs">Phase</TableHead>
                <TableHead className="text-xs">Dia</TableHead>
                <TableHead className="text-xs text-center">No Pool</TableHead>
                <TableHead className="text-xs text-center">Elegível</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d: any) => (
                <TableRow key={d.id} className="text-xs">
                  <TableCell className="py-2">
                    <div className="truncate max-w-[150px]">{d.owner_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{d.owner_email}</div>
                  </TableCell>
                  <TableCell className="py-2 font-medium">{d.name}</TableCell>
                  <TableCell className="py-2">{d.number || "—"}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className={`text-[10px] ${statusColor(d.status)}`}>{d.status}</Badge>
                  </TableCell>
                  <TableCell className="py-2">{d.cycle_active ? "✅" : "—"}</TableCell>
                  <TableCell className="py-2">
                    {d.cycle_phase ? <Badge variant="outline" className="text-[10px]">{d.cycle_phase}</Badge> : "—"}
                  </TableCell>
                  <TableCell className="py-2">{d.cycle_active ? `${d.cycle_day_index}/${d.cycle_days_total}` : "—"}</TableCell>
                  <TableCell className="py-2 text-center">
                    <Switch
                      checked={d.is_enrolled}
                      onCheckedChange={(v) => toggleMutation.mutate({ device_id: d.id, field: "is_enrolled", value: v, user_id: d.user_id })}
                      className="scale-75"
                    />
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <Switch
                      checked={d.is_eligible}
                      onCheckedChange={(v) => toggleMutation.mutate({ device_id: d.id, field: "is_eligible", value: v, user_id: d.user_id })}
                      className="scale-75"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default CommunityPoolTab;