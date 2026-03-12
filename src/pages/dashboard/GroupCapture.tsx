import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  UsersRound, Link2, Copy, Check, LogIn, Pause, Play, Timer,
  RotateCcw, ClipboardCopy, AlertTriangle, CheckCircle2, XCircle, Clock,
  Loader2, Shield, Megaphone, BarChart3, Users, StopCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import dgLogo from "@/assets/dg-contingencia.jpeg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast as sonnerToast } from "sonner";

const SUGGESTED_GROUPS: { name: string; link: string }[] = [];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copy}>
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </Button>
  );
}

// ── Group Join Campaigns Widget ──────────────────────────────────
function GroupJoinCampaignsWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["group-join-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_join_campaigns" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Fetch queue items for the active campaign detail
  const activeCampaign = campaigns.find((c: any) => c.status === "running");
  const { data: queueItems = [] } = useQuery({
    queryKey: ["group-join-queue", activeCampaign?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_join_queue" as any)
        .select("*")
        .eq("campaign_id", activeCampaign!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!activeCampaign,
    refetchInterval: 5000,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      // Mark campaign as cancelled
      await supabase.from("group_join_campaigns" as any).update({ status: "cancelled", completed_at: new Date().toISOString() } as any).eq("id", id);
      // Mark pending queue items as cancelled
      await supabase.from("group_join_queue" as any).update({ status: "cancelled" } as any).eq("campaign_id", id).eq("status", "pending");
    },
    onSuccess: () => {
      sonnerToast.success("Campanha cancelada");
      queryClient.invalidateQueries({ queryKey: ["group-join-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["group-join-queue"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_join_campaigns" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      sonnerToast.success("Campanha removida");
      queryClient.invalidateQueries({ queryKey: ["group-join-campaigns"] });
    },
  });

  if (campaigns.length === 0) return null;

  const active = campaigns.filter((c: any) => c.status === "running");
  const history = campaigns.filter((c: any) => c.status !== "running");

  const statusMap: Record<string, { label: string; color: string }> = {
    running: { label: "Em andamento", color: "bg-emerald-400 animate-pulse" },
    paused: { label: "Pausada", color: "bg-amber-400" },
    done: { label: "Concluída", color: "bg-blue-400" },
    cancelled: { label: "Cancelada", color: "bg-muted-foreground" },
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendente", color: "text-muted-foreground" },
    running: { label: "Em andamento", color: "text-primary" },
    success: { label: "Sucesso", color: "text-emerald-500" },
    error: { label: "Falha", color: "text-destructive" },
    already_member: { label: "Já participa", color: "text-teal-500" },
    pending_approval: { label: "Aprovação", color: "text-amber-500" },
    cancelled: { label: "Cancelado", color: "text-muted-foreground" },
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const renderCampaign = (camp: any, showDelete = false) => {
    const total = camp.total_items || 0;
    const success = (camp.success_count || 0) + (camp.already_member_count || 0);
    const errors = camp.error_count || 0;
    const pending = Math.max(0, total - success - errors);
    const progress = total > 0 ? ((success + errors) / total) * 100 : 0;
    const st = statusMap[camp.status] || statusMap.done;
    const deviceCount = Array.isArray(camp.device_ids) ? camp.device_ids.length : 0;
    const groupCount = Array.isArray(camp.group_links) ? camp.group_links.length : 0;

    return (
      <div key={camp.id} className="rounded-xl border border-border/30 bg-card/60 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${st.color}`} />
            <span className="text-[13px] font-semibold text-foreground truncate">
              {camp.name || `Campanha ${formatDate(camp.created_at)}`}
            </span>
          </div>
          <Badge variant="outline" className="text-[9px] shrink-0">{st.label}</Badge>
        </div>

        <Progress value={progress} className="h-1.5" />

        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">Sucesso</p>
            <p className="text-xs font-bold text-emerald-500">{success}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Erros</p>
            <p className={`text-xs font-bold ${errors > 0 ? "text-destructive" : "text-foreground"}`}>{errors}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Pendentes</p>
            <p className="text-xs font-bold text-foreground">{pending}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Total</p>
            <p className="text-xs font-bold text-foreground">{total}</p>
          </div>
        </div>

        {/* Queue item detail for active campaign */}
        {camp.status === "running" && queueItems.length > 0 && camp.id === activeCampaign?.id && (
          <div className="max-h-40 overflow-y-auto space-y-0.5 rounded-md border border-border/20 p-1.5">
            {queueItems.map((item: any) => {
              const cfg = statusConfig[item.status] || statusConfig.pending;
              return (
                <div key={item.id} className="flex items-center gap-2 p-1 rounded text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.status === "success" || item.status === "already_member" ? "bg-emerald-400" :
                    item.status === "error" ? "bg-destructive" :
                    item.status === "pending" ? "bg-muted-foreground/30" : "bg-primary animate-pulse"
                  }`} />
                  <span className="font-medium text-foreground truncate">{item.device_name}</span>
                  <span className="text-muted-foreground/30">→</span>
                  <span className="text-foreground/70 truncate flex-1">{item.group_name}</span>
                  <span className={`text-[10px] shrink-0 ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border/15">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> {deviceCount} inst.
            </span>
            <span className="flex items-center gap-1">
              <UsersRound className="w-3 h-3" /> {groupCount} grupo{groupCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDate(camp.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {camp.status === "running" && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
                onClick={() => cancelMutation.mutate(camp.id)}>
                <StopCircle className="w-3 h-3 mr-1" /> Parar
              </Button>
            )}
            {showDelete && camp.status !== "running" && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive"
                onClick={() => deleteMutation.mutate(camp.id)}>
                <XCircle className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {active.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Campanhas de Grupo Ativas</h2>
            <Badge variant="secondary" className="text-[10px] ml-auto">{active.length}</Badge>
          </div>
          {active.map((c: any) => renderCampaign(c))}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground">Histórico</h2>
            <Badge variant="secondary" className="text-[10px] ml-auto">{history.length}</Badge>
          </div>
          {history.map((c: any) => renderCampaign(c, true))}
        </div>
      )}
    </div>
  );
}

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
      const { data, error } = await supabase
        .from("warmup_groups" as any)
        .select("id, name, link, description, created_at")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["devices-for-join"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("id, name, number, status")
        .eq("user_id", user!.id)
        .neq("login_type", "report_wa")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const { data: joinLogs = [] } = useQuery({
    queryKey: ["group-join-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_join_logs")
        .select("device_id, result, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as { device_id: string; result: string; created_at: string }[];
    },
    enabled: !!user,
  });

  const deviceStats = useMemo(() => {
    const stats: Record<string, { joined: number; lastAt: string | null }> = {};
    for (const log of joinLogs) {
      if (!stats[log.device_id]) stats[log.device_id] = { joined: 0, lastAt: null };
      if (log.result === "success" || log.result === "already_member") stats[log.device_id].joined++;
      if (!stats[log.device_id].lastAt) stats[log.device_id].lastAt = log.created_at;
    }
    return stats;
  }, [joinLogs]);

  const startJoinProcess = async () => {
    if (!user) return;
    setIsStarting(true);

    try {
      const uniqueGrps = [
        ...SUGGESTED_GROUPS.map((sg) => ({ name: sg.name, link: sg.link })),
        ...groups.map((g: any) => ({ name: g.name, link: g.link })),
      ].filter((g, i, arr) => arr.findIndex((x) => x.link === g.link) === i);

      // Build queue items
      const queueItems: { device_id: string; device_name: string; group_link: string; group_name: string }[] = [];
      for (const deviceId of selectedDevices) {
        const dev = devices.find((d) => d.id === deviceId);
        for (const groupLink of selectedGroups) {
          const grp = uniqueGrps.find((g) => g.link === groupLink);
          queueItems.push({
            device_id: deviceId,
            device_name: dev?.name || deviceId,
            group_link: groupLink,
            group_name: grp?.name || groupLink,
          });
        }
      }

      // Create campaign
      const campaignName = `${selectedDevices.length} inst. × ${selectedGroups.length} grupos`;
      const { data: campData, error: campError } = await supabase
        .from("group_join_campaigns" as any)
        .insert({
          user_id: user.id,
          name: campaignName,
          status: "running",
          total_items: queueItems.length,
          device_ids: selectedDevices,
          group_links: selectedGroups,
          min_delay: 10,
          max_delay: 30,
        } as any)
        .select("id")
        .single();

      if (campError) throw campError;
      const campaignId = (campData as any)?.id;

      // Insert queue items
      const rows = queueItems.map((item) => ({
        campaign_id: campaignId,
        user_id: user.id,
        device_id: item.device_id,
        device_name: item.device_name,
        group_link: item.group_link,
        group_name: item.group_name,
        status: "pending",
      }));

      const { error: queueError } = await supabase
        .from("group_join_queue" as any)
        .insert(rows as any);

      if (queueError) throw queueError;

      // Trigger background processing (fire-and-forget)
      supabase.functions.invoke("process-group-join-campaign", {
        body: { campaign_id: campaignId },
      }).catch(() => {});

      queryClient.invalidateQueries({ queryKey: ["group-join-campaigns"] });

      toast({
        title: "Campanha iniciada!",
        description: `${queueItems.length} entradas agendadas. O processo continua em segundo plano mesmo se você fechar esta página.`,
      });

      setJoinModalOpen(false);
      setSelectedGroups([]);
      setSelectedDevices([]);
    } catch (err) {
      toast({ title: "Erro ao criar campanha", description: String(err), variant: "destructive" });
    } finally {
      setIsStarting(false);
    }
  };

  const toggleGroup = (link: string) => setSelectedGroups((prev) => prev.includes(link) ? prev.filter((l) => l !== link) : [...prev, link]);
  const toggleDevice = (id: string) => setSelectedDevices((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);

  const uniqueGroups = [
    ...SUGGESTED_GROUPS.map((sg) => ({ name: sg.name, link: sg.link })),
    ...groups.map((g: any) => ({ name: g.name, link: g.link })),
  ].filter((g, i, arr) => arr.findIndex((x) => x.link === g.link) === i);

  const selectAllGroups = () => setSelectedGroups(selectedGroups.length === uniqueGroups.length ? [] : uniqueGroups.map((g) => g.link));
  const selectAllDevices = () => setSelectedDevices(selectedDevices.length === devices.length ? [] : devices.map((d) => d.id));

  const hasOfflineDevices = selectedDevices.some(id => {
    const d = devices.find(dev => dev.id === id);
    return d && !["Connected", "Ready", "authenticated"].includes(d.status);
  });
  const canStart = selectedGroups.length > 0 && selectedDevices.length > 0 && !hasOfflineDevices && !isStarting;
  const totalOps = selectedGroups.length * selectedDevices.length;

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    return `${Math.floor(hrs / 24)}d atrás`;
  };

  const renderGroupCard = (key: string, name: string, link: string, isDG: boolean) => (
    <div key={key} className="group flex items-center gap-3 px-3.5 py-3 rounded-xl bg-card/60 border border-border/10 hover:border-border/25 hover:bg-card/80 transition-all duration-200">
      {isDG ? (
        <img src={dgLogo} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-border/20" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
          <UsersRound className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-tight">{name}</p>
        <p className="text-[10px] text-muted-foreground/40 truncate mt-0.5 font-mono">{link}</p>
      </div>
      <CopyButton text={link} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Grupos de Aquecimento</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Grupos para aquecimento automático de chips</p>
        </div>
        <Button onClick={() => setJoinModalOpen(true)} size="sm" className="gap-1.5">
          <LogIn className="w-3.5 h-3.5" /> Entrar nos Grupos
        </Button>
      </div>

      {/* Group join campaigns widget */}
      <GroupJoinCampaignsWidget />

      {/* Group count badge */}
      {!isLoading && (groups.length > 0 || SUGGESTED_GROUPS.length > 0) && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5">
            {groups.length + SUGGESTED_GROUPS.filter(sg => !groups.some((g: any) => g.link === sg.link)).length} grupos
          </Badge>
        </div>
      )}

      {/* Group list */}
      <div className="space-y-1.5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {SUGGESTED_GROUPS.filter(sg => !groups.some((g: any) => g.link === sg.link)).map((sg) =>
              renderGroupCard(sg.link, sg.name, sg.link, true)
            )}
            {groups.map((g: any) =>
              renderGroupCard(g.id, g.name, g.link, g.name?.includes("DG CONTINGÊNCIA"))
            )}
            {groups.length === 0 && SUGGESTED_GROUPS.length === 0 && (
              <div className="text-center py-16 text-sm text-muted-foreground/60">
                <UsersRound className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhum grupo cadastrado
              </div>
            )}
          </>
        )}
      </div>

      {/* Join Modal */}
      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0">
          <div className="px-5 pt-5 pb-3">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-[15px] font-semibold">Entrar nos Grupos</DialogTitle>
              <p className="text-[11px] text-muted-foreground/60">
                Selecione instâncias e grupos. O processo roda <span className="font-semibold text-foreground">em segundo plano</span> — pode fechar a página.
              </p>
            </DialogHeader>
          </div>

          <div className="px-5 pb-5 space-y-5">
            {/* Instâncias */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground tracking-wide uppercase">
                  Instâncias
                  <span className="ml-1.5 text-muted-foreground/50 font-normal normal-case tracking-normal">
                    ({selectedDevices.length}/{devices.length})
                  </span>
                </h3>
                <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2 text-primary hover:text-primary" onClick={selectAllDevices}>
                  {selectedDevices.length === devices.length ? "Desmarcar" : "Todas"}
                </Button>
              </div>
              <div className="space-y-0.5 max-h-44 overflow-y-auto rounded-xl border border-border/10 bg-muted/5 p-2">
                {devices.map((d) => {
                  const isOnline = ["Connected", "Ready", "authenticated"].includes(d.status);
                  const stats = deviceStats[d.id];
                  const isSelected = selectedDevices.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/5 border border-primary/15" : "hover:bg-muted/30 border border-transparent"
                      }`}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleDevice(d.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? "bg-emerald-400" : "bg-red-400"}`} />
                          <span className="text-[12px] font-medium truncate text-foreground">{d.name}</span>
                          {d.number && <span className="text-[10px] text-muted-foreground/40 font-mono">{d.number}</span>}
                        </div>
                        {stats && (
                          <div className="flex items-center gap-2 ml-4 mt-0.5">
                            <span className="text-[10px] text-muted-foreground/40">
                              {stats.joined} grupo{stats.joined !== 1 ? "s" : ""}
                            </span>
                            {stats.lastAt && (
                              <span className="text-[10px] text-muted-foreground/25">
                                · {formatTimeAgo(stats.lastAt)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
                {devices.length === 0 && (
                  <p className="text-[11px] text-muted-foreground/50 text-center py-4">Nenhuma instância cadastrada</p>
                )}
              </div>
            </div>

            {/* Grupos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground tracking-wide uppercase">
                  Grupos
                  <span className="ml-1.5 text-muted-foreground/50 font-normal normal-case tracking-normal">
                    ({selectedGroups.length}/{uniqueGroups.length})
                  </span>
                </h3>
                <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2 text-primary hover:text-primary" onClick={selectAllGroups}>
                  {selectedGroups.length === uniqueGroups.length ? "Desmarcar" : "Todos"}
                </Button>
              </div>
              <div className="space-y-0.5 max-h-36 overflow-y-auto rounded-xl border border-border/10 bg-muted/5 p-2">
                {uniqueGroups.map((g) => {
                  const isSelected = selectedGroups.includes(g.link);
                  return (
                    <label
                      key={g.link}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? "bg-primary/5 border border-primary/15" : "hover:bg-muted/30 border border-transparent"
                      }`}
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleGroup(g.link)} />
                      <span className="text-[12px] font-medium truncate text-foreground">{g.name}</span>
                    </label>
                  );
                })}
                {uniqueGroups.length === 0 && (
                  <p className="text-[11px] text-muted-foreground/50 text-center py-4">Nenhum grupo disponível</p>
                )}
              </div>
            </div>

            {/* Delay info */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/10 bg-muted/5">
              <Timer className="w-3.5 h-3.5 text-primary/60 shrink-0" />
              <span className="text-[11px] text-muted-foreground/70">
                Delay aleatório de <span className="font-semibold text-foreground">10s – 30s</span> entre cada entrada
              </span>
            </div>

            {/* Background info */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-emerald-500/15 bg-emerald-500/5">
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="text-[11px] text-emerald-600/80">
                Roda no servidor — <span className="font-semibold">pode fechar o navegador</span>
              </span>
            </div>

            {/* Warnings */}
            {hasOfflineDevices && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-red-500/5 border border-red-500/10">
                <Shield className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-[11px] text-red-400/80">
                  Instâncias offline selecionadas. Reconecte antes de iniciar.
                </p>
              </div>
            )}

            {/* Summary + Footer */}
            <div className="pt-1 border-t border-border/10 space-y-3">
              {totalOps > 0 && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground/50 px-0.5">
                  <span>{totalOps} operação{totalOps !== 1 ? "ões" : ""}</span>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setJoinModalOpen(false)} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button
                  onClick={startJoinProcess}
                  disabled={!canStart}
                  size="sm"
                  className="gap-1.5 h-8 text-xs"
                >
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
