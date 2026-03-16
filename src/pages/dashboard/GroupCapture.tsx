import { useState, useMemo, useCallback } from "react";
import dgGroupAvatar from "@/assets/dg-group-avatar.png";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  UsersRound, Copy, Check, LogIn, Timer,
  Loader2, Shield, StopCircle, XCircle, Clock, Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast as sonnerToast } from "sonner";

/* ── Helpers ── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/40 transition-colors shrink-0" onClick={copy}>
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground/40" />}
    </button>
  );
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const statusMap: Record<string, { label: string; dot: string }> = {
  running:   { label: "Em andamento", dot: "bg-emerald-400 animate-pulse" },
  paused:    { label: "Pausada",      dot: "bg-amber-400" },
  done:      { label: "Concluída",    dot: "bg-blue-400" },
  cancelled: { label: "Cancelada",    dot: "bg-muted-foreground" },
};

/* ── Campaign Card ── */
function CampaignCard({ camp, onCancel, onDelete, showDelete }: {
  camp: any; onCancel?: () => void; onDelete?: () => void; showDelete?: boolean;
}) {
  const total = camp.total_items || 0;
  const success = (camp.success_count || 0) + (camp.already_member_count || 0);
  const errors = camp.error_count || 0;
  const pending = Math.max(0, total - success - errors);
  const progress = total > 0 ? ((success + errors) / total) * 100 : 0;
  const st = statusMap[camp.status] || statusMap.done;

  return (
    <div className="relative rounded-2xl border border-border/20 bg-card/80 backdrop-blur-xl p-4 space-y-3 overflow-hidden group hover:border-border/30 transition-colors">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
          <span className="text-[13px] font-semibold text-foreground truncate">
            {camp.name || `Campanha ${formatDate(camp.created_at)}`}
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/20 text-muted-foreground/60 font-medium shrink-0">{st.label}</span>
      </div>

      <Progress value={progress} className="h-1" />

      <div className="grid grid-cols-4 gap-1 text-center text-[11px]">
        <div><span className="text-muted-foreground/50">OK</span> <span className="font-bold text-primary ml-0.5">{success}</span></div>
        <div><span className="text-muted-foreground/50">Erro</span> <span className={`font-bold ml-0.5 ${errors ? "text-destructive" : "text-foreground/60"}`}>{errors}</span></div>
        <div><span className="text-muted-foreground/50">Pend.</span> <span className="font-bold ml-0.5 text-foreground/60">{pending}</span></div>
        <div><span className="text-muted-foreground/50">Total</span> <span className="font-bold ml-0.5 text-foreground/60">{total}</span></div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border/10 text-[10px] text-muted-foreground/40">
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(camp.created_at)}</span>
        <div className="flex gap-1">
          {camp.status === "running" && onCancel && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive rounded-lg" onClick={onCancel}>
              <StopCircle className="w-3 h-3 mr-1" /> Parar
            </Button>
          )}
          {showDelete && camp.status !== "running" && onDelete && (
            <button className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive transition-colors" onClick={onDelete}>
              <XCircle className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Campaigns Widget ── */
function GroupJoinCampaignsWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["group-join-campaigns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_join_campaigns" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(15);
      return (data || []) as any[];
    },
    enabled: !!user,
    refetchInterval: 8000,
    staleTime: 5000,
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("group_join_campaigns" as any).update({ status: "cancelled", completed_at: new Date().toISOString() } as any).eq("id", id);
      await supabase.from("group_join_queue" as any).update({ status: "cancelled" } as any).eq("campaign_id", id).eq("status", "pending");
    },
    onSuccess: () => { sonnerToast.success("Cancelada"); queryClient.invalidateQueries({ queryKey: ["group-join-campaigns"] }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { await supabase.from("group_join_campaigns" as any).delete().eq("id", id); },
    onSuccess: () => { sonnerToast.success("Removida"); queryClient.invalidateQueries({ queryKey: ["group-join-campaigns"] }); },
  });

  if (campaigns.length === 0) return null;

  const active = campaigns.filter((c: any) => c.status === "running");
  const history = campaigns.filter((c: any) => c.status !== "running");

  return (
    <div className="space-y-3">
      {active.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" /> Ativas
            <Badge variant="secondary" className="text-[10px] ml-1">{active.length}</Badge>
          </h2>
          {active.map((c: any) => (
            <CampaignCard key={c.id} camp={c} onCancel={() => cancelMut.mutate(c.id)} />
          ))}
        </div>
      )}
      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Histórico
          </h2>
          {history.slice(0, 5).map((c: any) => (
            <CampaignCard key={c.id} camp={c} showDelete onDelete={() => deleteMut.mutate(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
const GroupCapture = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["warmup-groups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("warmup_groups" as any)
        .select("id, name, link, description, created_at")
        .order("name", { ascending: true });
      return (data || []) as any[];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["devices-for-join"],
    queryFn: async () => {
      const { data } = await supabase
        .from("devices")
        .select("id, name, number, status")
        .eq("user_id", user!.id)
        .neq("login_type", "report_wa")
        .order("name");
      return data || [];
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const toggleGroup = useCallback((link: string) =>
    setSelectedGroups((prev) => prev.includes(link) ? prev.filter((l) => l !== link) : [...prev, link]), []);
  const toggleDevice = useCallback((id: string) =>
    setSelectedDevices((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]), []);

  const selectAllGroups = useCallback(() =>
    setSelectedGroups((prev) => prev.length === groups.length ? [] : groups.map((g: any) => g.link)), [groups]);
  const selectAllDevices = useCallback(() =>
    setSelectedDevices((prev) => prev.length === devices.length ? [] : devices.map((d) => d.id)), [devices]);

  const hasOffline = useMemo(() =>
    selectedDevices.some(id => {
      const d = devices.find(dev => dev.id === id);
      return d && !["Connected", "Ready", "authenticated"].includes(d.status);
    }), [selectedDevices, devices]);

  const totalOps = selectedGroups.length * selectedDevices.length;
  const canStart = totalOps > 0 && !hasOffline && !isStarting;

  const startJoinProcess = async () => {
    if (!user) return;
    setIsStarting(true);
    try {
      const queueItems: { device_id: string; device_name: string; group_link: string; group_name: string }[] = [];
      for (const deviceId of selectedDevices) {
        const dev = devices.find((d) => d.id === deviceId);
        for (const groupLink of selectedGroups) {
          const grp = groups.find((g: any) => g.link === groupLink);
          queueItems.push({ device_id: deviceId, device_name: dev?.name || deviceId, group_link: groupLink, group_name: grp?.name || groupLink });
        }
      }

      const { data: campData, error: campError } = await supabase
        .from("group_join_campaigns" as any)
        .insert({ user_id: user.id, name: `${selectedDevices.length} inst. × ${selectedGroups.length} grupos`, status: "running", total_items: queueItems.length, device_ids: selectedDevices, group_links: selectedGroups, min_delay: 10, max_delay: 30 } as any)
        .select("id").single();
      if (campError) throw campError;
      const campaignId = (campData as any)?.id;

      const { error: queueError } = await supabase
        .from("group_join_queue" as any)
        .insert(queueItems.map((item) => ({ campaign_id: campaignId, user_id: user.id, ...item, status: "pending" })) as any);
      if (queueError) throw queueError;

      supabase.functions.invoke("process-group-join-campaign", { body: { campaign_id: campaignId } }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["group-join-campaigns"] });
      toast({ title: "Campanha iniciada!", description: `${queueItems.length} entradas agendadas em segundo plano.` });
      setJoinModalOpen(false);
      setSelectedGroups([]);
      setSelectedDevices([]);
    } catch (err) {
      toast({ title: "Erro", description: String(err), variant: "destructive" });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Grupos de Aquecimento</h1>
          <p className="text-xs text-muted-foreground">Grupos para aquecimento automático</p>
        </div>
        <Button onClick={() => setJoinModalOpen(true)} size="sm" className="gap-1.5 h-8 text-xs">
          <LogIn className="w-3.5 h-3.5" /> Entrar nos Grupos
        </Button>
      </div>

      {/* Campaigns */}
      <GroupJoinCampaignsWidget />

      {/* Groups List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
            <UsersRound className="w-8 h-8 mb-2 opacity-30" />
            <span className="text-sm">Nenhum grupo cadastrado</span>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-[10px]">{groups.length} grupo{groups.length !== 1 ? "s" : ""}</Badge>
          </div>
          {groups.map((g: any) => (
            <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/20 bg-card/40 hover:bg-card/70 transition-colors">
              <img src={dgGroupAvatar} alt="Grupo" className="w-8 h-8 rounded-full object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                <p className="text-[10px] text-muted-foreground/50 truncate font-mono">{g.link}</p>
              </div>
              <CopyButton text={g.link} />
            </div>
          ))}
        </div>
      )}

      {/* Join Modal */}
      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent className="max-w-sm sm:max-w-md max-h-[80vh] overflow-y-auto p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Entrar nos Grupos</DialogTitle>
            <p className="text-[11px] text-muted-foreground">
              Selecione instâncias e grupos. Roda <span className="font-medium text-foreground">em segundo plano</span>.
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Devices */}
            <section className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Instâncias <span className="text-muted-foreground font-normal normal-case">({selectedDevices.length}/{devices.length})</span>
                </span>
                <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2 text-primary" onClick={selectAllDevices}>
                  {selectedDevices.length === devices.length ? "Desmarcar" : "Todas"}
                </Button>
              </div>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-border/15 p-1.5 space-y-0.5">
                {devices.map((d) => {
                  const online = ["Connected", "Ready", "authenticated"].includes(d.status);
                  const sel = selectedDevices.includes(d.id);
                  return (
                    <label key={d.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${sel ? "bg-primary/5" : "hover:bg-muted/20"}`}>
                      <Checkbox checked={sel} onCheckedChange={() => toggleDevice(d.id)} />
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${online ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span className="text-xs truncate">{d.name}</span>
                      {d.number && <span className="text-[10px] text-muted-foreground/40 font-mono ml-auto">{d.number}</span>}
                    </label>
                  );
                })}
                {devices.length === 0 && <p className="text-[11px] text-muted-foreground/50 text-center py-3">Nenhuma instância</p>}
              </div>
            </section>

            {/* Groups */}
            <section className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  Grupos <span className="text-muted-foreground font-normal normal-case">({selectedGroups.length}/{groups.length})</span>
                </span>
                <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2 text-primary" onClick={selectAllGroups}>
                  {selectedGroups.length === groups.length ? "Desmarcar" : "Todos"}
                </Button>
              </div>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-border/15 p-1.5 space-y-0.5">
                {groups.map((g: any) => (
                  <label key={g.link} className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${selectedGroups.includes(g.link) ? "bg-primary/5" : "hover:bg-muted/20"}`}>
                    <Checkbox checked={selectedGroups.includes(g.link)} onCheckedChange={() => toggleGroup(g.link)} />
                    <span className="text-xs truncate">{g.name}</span>
                  </label>
                ))}
                {groups.length === 0 && <p className="text-[11px] text-muted-foreground/50 text-center py-3">Nenhum grupo</p>}
              </div>
            </section>

            {/* Info chips */}
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="flex items-center gap-1 px-2 py-1 rounded-md border border-border/15 text-muted-foreground">
                <Timer className="w-3 h-3" /> 10-30s delay
              </span>
              <span className="flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-500/15 text-emerald-600">
                <Shield className="w-3 h-3" /> Segundo plano
              </span>
            </div>

            {hasOffline && (
              <p className="text-[11px] text-destructive flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Instâncias offline selecionadas
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border/15">
              {totalOps > 0 && <span className="text-[11px] text-muted-foreground">{totalOps} op{totalOps !== 1 ? "s" : ""}</span>}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setJoinModalOpen(false)}>Cancelar</Button>
                <Button onClick={startJoinProcess} disabled={!canStart} size="sm" className="gap-1.5 h-8 text-xs">
                  {isStarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                  Iniciar ({totalOps})
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupCapture;
