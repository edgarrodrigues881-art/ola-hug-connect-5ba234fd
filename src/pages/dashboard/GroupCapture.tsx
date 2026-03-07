import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  UsersRound, Link2, Copy, Check, LogIn, Pause, Play, Timer,
  RotateCcw, ClipboardCopy, AlertTriangle, CheckCircle2, XCircle, Clock,
  Loader2, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dgLogo from "@/assets/dg-contingencia.jpeg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

type JoinStatus = "idle" | "running" | "paused" | "cancelled" | "done";
type ItemStatus = "pending" | "running" | "success" | "error" | "already_member" | "pending_approval";

interface JoinItem {
  deviceId: string;
  deviceName: string;
  groupLink: string;
  groupName: string;
  status: ItemStatus;
  error?: string;
  responseStatus?: number;
}

const statusConfig: Record<ItemStatus, { icon: typeof Check; label: string; color: string }> = {
  pending: { icon: Clock, label: "Pendente", color: "text-muted-foreground" },
  running: { icon: Loader2, label: "Em andamento", color: "text-primary" },
  success: { icon: CheckCircle2, label: "Sucesso", color: "text-emerald-500" },
  error: { icon: XCircle, label: "Falha", color: "text-destructive" },
  already_member: { icon: CheckCircle2, label: "Já participa", color: "text-teal-500" },
  pending_approval: { icon: AlertTriangle, label: "Aguardando aprovação", color: "text-amber-500" },
};

const GroupCapture = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [minDelay, setMinDelay] = useState(8);
  const [maxDelay, setMaxDelay] = useState(25);
  const [activeTab, setActiveTab] = useState("groups");

  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [joinItems, setJoinItems] = useState<JoinItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);

  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const itemsRef = useRef<JoinItem[]>([]);

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

  const { data: devices = [], refetch: refetchDevices } = useQuery({
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
    refetchInterval: 60000, // Device list doesn't change often
  });

  // Fetch join logs for per-device stats
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

  // Per-device stats
  const deviceStats = useMemo(() => {
    const stats: Record<string, { joined: number; lastAt: string | null }> = {};
    for (const log of joinLogs) {
      if (!stats[log.device_id]) stats[log.device_id] = { joined: 0, lastAt: null };
      if (log.result === "success" || log.result === "already_member") {
        stats[log.device_id].joined++;
      }
      if (!stats[log.device_id].lastAt) stats[log.device_id].lastAt = log.created_at;
    }
    return stats;
  }, [joinLogs]);

  useEffect(() => {
    const channel = supabase
      .channel('devices-join-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'devices' }, () => {
        refetchDevices();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchDevices]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForResume = useCallback(async () => {
    while (pausedRef.current && !cancelledRef.current) {
      await sleep(300);
    }
  }, []);

  const startCountdown = useCallback((seconds: number): Promise<void> => {
    return new Promise((resolve) => {
      let remaining = seconds;
      setCountdown(remaining);
      countdownRef.current = setInterval(() => {
        if (cancelledRef.current) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setCountdown(0);
          resolve();
          return;
        }
        if (!pausedRef.current) {
          remaining--;
          setCountdown(remaining);
          if (remaining <= 0) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            setCountdown(0);
            resolve();
          }
        }
      }, 1000);
    });
  }, []);

  const updateItem = (index: number, update: Partial<JoinItem>) => {
    itemsRef.current = itemsRef.current.map((item, i) => i === index ? { ...item, ...update } : item);
    setJoinItems([...itemsRef.current]);
  };

  const processItems = useCallback(async (items: JoinItem[], startFrom: number = 0) => {
    pausedRef.current = false;
    cancelledRef.current = false;
    setJoinStatus("running");

    

    for (let i = startFrom; i < items.length; i++) {
      if (cancelledRef.current) break;
      await waitForResume();
      if (cancelledRef.current) break;

      const item = items[i];
      if (item.status === "success" || item.status === "already_member") continue;

      setCurrentIndex(i);
      updateItem(i, { status: "running", error: undefined });

      try {
        const { data, error } = await supabase.functions.invoke("join-group", {
          body: {
            items: [{
              groupLink: item.groupLink,
              groupName: item.groupName,
              deviceId: item.deviceId,
              deviceName: item.deviceName,
            }],
          },
        });

        if (error) {
          updateItem(i, { status: "error", error: String(error) });
        } else {
          const result = data?.results?.[0];
          if (result) {
            const status = result.status as ItemStatus;
            updateItem(i, {
              status,
              error: result.error,
              responseStatus: result.responseStatus,
            });

            // 429 handled by random delay range
          } else {
            updateItem(i, { status: "error", error: "Resposta vazia do servidor" });
          }
        }
      } catch (err) {
        updateItem(i, { status: "error", error: String(err) });
      }

      if (i < items.length - 1 && !cancelledRef.current) {
        const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        await startCountdown(randomDelay);
      }
    }

    setJoinStatus(cancelledRef.current ? "cancelled" : "done");
    setCountdown(0);

    const finalItems = itemsRef.current;
    const successCount = finalItems.filter((r) => r.status === "success" || r.status === "already_member").length;
    const errorCount = finalItems.filter((r) => r.status === "error").length;
    toast({
      title: cancelledRef.current ? "Processo cancelado" : "Processo concluído",
      description: `${successCount} sucesso, ${errorCount} erros de ${finalItems.length} tentativas`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  }, [minDelay, maxDelay, waitForResume, startCountdown, toast]);

  const startJoinProcess = useCallback(async () => {
    const uniqueGrps = [
      ...SUGGESTED_GROUPS.map((sg) => ({ name: sg.name, link: sg.link })),
      ...groups.map((g: any) => ({ name: g.name, link: g.link })),
    ].filter((g, i, arr) => arr.findIndex((x) => x.link === g.link) === i);

    const items: JoinItem[] = [];
    for (const deviceId of selectedDevices) {
      const dev = devices.find((d) => d.id === deviceId);
      for (const groupLink of selectedGroups) {
        const grp = uniqueGrps.find((g) => g.link === groupLink);
        items.push({
          deviceId,
          deviceName: dev?.name || deviceId,
          groupLink,
          groupName: grp?.name || groupLink,
          status: "pending",
        });
      }
    }

    itemsRef.current = items;
    setJoinItems(items);
    await processItems(items);
  }, [selectedGroups, selectedDevices, devices, groups, processItems]);

  const retryFailures = useCallback(async () => {
    const items = itemsRef.current.map((item) =>
      item.status === "error" ? { ...item, status: "pending" as ItemStatus, error: undefined } : item
    );
    itemsRef.current = items;
    setJoinItems([...items]);
    await processItems(items);
  }, [processItems]);

  const handlePause = () => { pausedRef.current = true; setJoinStatus("paused"); };
  const handleResume = () => { pausedRef.current = false; setJoinStatus("running"); };
  const handleCancel = () => {
    cancelledRef.current = true;
    pausedRef.current = false;
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(0);
  };

  const handleCloseModal = (openState?: boolean | React.MouseEvent) => {
    if (openState === true) return;
    if (joinStatus === "running" || joinStatus === "paused") {
      cancelledRef.current = true;
      pausedRef.current = false;
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(0);
    }
    setJoinModalOpen(false);
    setJoinStatus("idle");
    setJoinItems([]);
    setCurrentIndex(0);
    setSelectedGroups([]);
    setSelectedDevices([]);
  };

  const copyReport = () => {
    const lines = itemsRef.current.map((item) => {
      const cfg = statusConfig[item.status];
      return `[${cfg.label}] ${item.deviceName} → ${item.groupName}${item.error ? ` | Erro: ${item.error}` : ""}`;
    });
    const summary = itemsRef.current.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const header = `Relatório - ${new Date().toLocaleString("pt-BR")}\nTotal: ${itemsRef.current.length} | Sucesso: ${(summary.success || 0) + (summary.already_member || 0)} | Falhas: ${summary.error || 0}\n---`;
    navigator.clipboard.writeText(`${header}\n${lines.join("\n")}`);
    toast({ title: "Relatório copiado!" });
  };

  const toggleGroup = (link: string) => setSelectedGroups((prev) => prev.includes(link) ? prev.filter((l) => l !== link) : [...prev, link]);
  const toggleDevice = (id: string) => setSelectedDevices((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);

  const uniqueGroups = [
    ...SUGGESTED_GROUPS.map((sg) => ({ name: sg.name, link: sg.link })),
    ...groups.map((g: any) => ({ name: g.name, link: g.link })),
  ].filter((g, i, arr) => arr.findIndex((x) => x.link === g.link) === i);

  const selectAllGroups = () => setSelectedGroups(selectedGroups.length === uniqueGroups.length ? [] : uniqueGroups.map((g) => g.link));
  const selectAllDevices = () => setSelectedDevices(selectedDevices.length === devices.length ? [] : devices.map((d) => d.id));

  const isProcessing = joinStatus === "running" || joinStatus === "paused";
  const isDone = joinStatus === "done" || joinStatus === "cancelled";
  const failedCount = joinItems.filter((i) => i.status === "error").length;
  const successCount = joinItems.filter((i) => i.status === "success" || i.status === "already_member").length;

  // Validation
  const hasOfflineDevices = selectedDevices.some(id => {
    const d = devices.find(dev => dev.id === id);
    return d && !["Connected", "Ready", "authenticated"].includes(d.status);
  });
  const canStart = selectedGroups.length > 0 && selectedDevices.length > 0 && !hasOfflineDevices;
  const totalOps = selectedGroups.length * selectedDevices.length;
  const avgDelay = (minDelay + maxDelay) / 2;
  const estimatedTime = totalOps > 1 ? (totalOps - 1) * avgDelay : 0;

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    return `${Math.floor(hrs / 24)}d atrás`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Grupos de Aquecimento</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Grupos para aquecimento automático de chips</p>
        </div>
        <Button onClick={() => setJoinModalOpen(true)} size="sm" className="gap-1.5">
          <LogIn className="w-3.5 h-3.5" /> Entrar nos Grupos
        </Button>
      </div>

      {/* Group list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {SUGGESTED_GROUPS.filter(sg => !groups.some((g: any) => g.link === sg.link)).map((sg) => (
              <Card key={sg.link} className="border-border/15">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <img src={dgLogo} alt={sg.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground">{sg.name}</p>
                      <p className="text-[11px] text-muted-foreground/50 truncate">{sg.link}</p>
                    </div>
                    <CopyButton text={sg.link} />
                  </div>
                </CardContent>
              </Card>
            ))}

            {groups.map((g: any) => (
              <Card key={g.id} className="border-border/15">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {g.name?.includes("DG CONTINGÊNCIA") ? (
                      <img src={dgLogo} alt={g.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <UsersRound className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground">{g.name}</p>
                      <p className="text-[11px] text-muted-foreground/50 truncate">{g.link}</p>
                    </div>
                    <CopyButton text={g.link} />
                  </div>
                </CardContent>
              </Card>
            ))}

            {groups.length === 0 && SUGGESTED_GROUPS.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Nenhum grupo cadastrado
              </div>
            )}
          </>
        )}
      </div>

      {/* Join Modal */}
      <Dialog open={joinModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Entrar nos Grupos</DialogTitle>
            <DialogDescription className="text-xs">
              Selecione grupos e instâncias. O delay protege contra bloqueios.
            </DialogDescription>
          </DialogHeader>

          {!isProcessing && !isDone ? (
            <>
              <div className="space-y-4">
                {/* Groups */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-medium text-foreground">Grupos ({selectedGroups.length}/{uniqueGroups.length})</h3>
                    <Button variant="ghost" size="sm" className="text-[11px] h-6" onClick={selectAllGroups}>
                      {selectedGroups.length === uniqueGroups.length ? "Desmarcar" : "Todos"}
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto rounded-md border border-border/20 p-1.5">
                    {uniqueGroups.map((g) => (
                      <label key={g.link} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 cursor-pointer">
                        <Checkbox checked={selectedGroups.includes(g.link)} onCheckedChange={() => toggleGroup(g.link)} />
                        <span className="text-xs truncate">{g.name}</span>
                      </label>
                    ))}
                    {uniqueGroups.length === 0 && (
                      <p className="text-[11px] text-muted-foreground text-center py-2">Nenhum grupo disponível</p>
                    )}
                  </div>
                </div>

                {/* Devices with stats */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-medium text-foreground">Instâncias ({selectedDevices.length}/{devices.length})</h3>
                    <Button variant="ghost" size="sm" className="text-[11px] h-6" onClick={selectAllDevices}>
                      {selectedDevices.length === devices.length ? "Desmarcar" : "Todas"}
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto rounded-md border border-border/20 p-1.5">
                    {devices.map((d) => {
                      const isOnline = ["Connected", "Ready", "authenticated"].includes(d.status);
                      const stats = deviceStats[d.id];
                      return (
                        <label key={d.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 cursor-pointer">
                          <Checkbox checked={selectedDevices.includes(d.id)} onCheckedChange={() => toggleDevice(d.id)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? "bg-emerald-400" : "bg-red-400"}`} />
                              <span className="text-xs font-medium truncate">{d.name}</span>
                              {d.number && <span className="text-[10px] text-muted-foreground/50">{d.number}</span>}
                            </div>
                            {stats && (
                              <div className="flex items-center gap-2 ml-4 mt-0.5">
                                <span className="text-[10px] text-muted-foreground/50">
                                  {stats.joined} grupo{stats.joined !== 1 ? "s" : ""}
                                </span>
                                {stats.lastAt && (
                                  <span className="text-[10px] text-muted-foreground/30">
                                    última: {formatTimeAgo(stats.lastAt)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                    {devices.length === 0 && (
                      <p className="text-[11px] text-muted-foreground text-center py-2">Nenhuma instância cadastrada</p>
                    )}
                  </div>
                </div>

                {/* Delay min/max — same style as campaigns */}
                <div className="p-3 rounded-lg border border-border/20 bg-muted/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[13px] font-medium text-foreground">Delay entre entradas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Mín (s)</label>
                      <Input
                        type="number"
                        value={minDelay}
                        onChange={(e) => { const v = parseInt(e.target.value) || 0; setMinDelay(v); }}
                        onBlur={() => { const v = Math.max(minDelay, 1); setMinDelay(v); if (v > maxDelay) setMaxDelay(v); }}
                        className="h-9 text-xs bg-muted/15 border-border/15 tabular-nums"
                        min={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Máx (s)</label>
                      <Input
                        type="number"
                        value={maxDelay}
                        onChange={(e) => { const v = parseInt(e.target.value) || 0; setMaxDelay(v); }}
                        onBlur={() => { const v = Math.max(maxDelay, 1); setMaxDelay(v < minDelay ? minDelay : v); }}
                        className="h-9 text-xs bg-muted/15 border-border/15 tabular-nums"
                        min={1}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 tabular-nums">{minDelay}s – {maxDelay}s a cada entrada</p>

                  {minDelay < 8 && (
                    <div className="flex items-center gap-2 mt-1 p-2 rounded-md bg-amber-500/5 border border-amber-500/15">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <p className="text-[11px] text-amber-400/80">
                        Delay abaixo de 8s aumenta risco de bloqueio temporário.
                      </p>
                    </div>
                  )}
                </div>

                {/* Offline devices warning */}
                {hasOfflineDevices && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-red-500/5 border border-red-500/15">
                    <Shield className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <p className="text-[11px] text-red-400/80">
                      Instâncias offline selecionadas. Remova-as ou reconecte antes de iniciar.
                    </p>
                  </div>
                )}

                {/* Summary */}
                {totalOps > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                    <span>{totalOps} operação{totalOps !== 1 ? "ões" : ""}</span>
                    {estimatedTime > 0 && <span>~{formatDuration(estimatedTime)}</span>}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => handleCloseModal()}>Cancelar</Button>
                <Button
                  onClick={startJoinProcess}
                  disabled={!canStart}
                  size="sm"
                  className="gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Iniciar ({totalOps})
                </Button>
              </DialogFooter>
            </>
          ) : (
            /* Progress View */
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-mono text-foreground">{successCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5 text-destructive" />
                  <span className="font-mono text-foreground">{failedCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="font-mono text-foreground">{joinItems.filter(i => i.status === "pending").length}</span>
                </div>
                <span className="ml-auto text-xs text-muted-foreground font-mono">
                  {successCount + failedCount}/{joinItems.length}
                </span>
              </div>

              <Progress value={joinItems.length > 0 ? ((successCount + failedCount) / joinItems.length) * 100 : 0} className="h-1.5" />

              {/* Countdown + delay info */}
              {countdown > 0 && (
                <div className="flex items-center gap-2 text-xs bg-muted/10 rounded-md p-2 border border-border/15">
                  <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Próximo em</span>
                  <span className="font-mono text-foreground font-medium">{countdown}s</span>
                  <span className="text-muted-foreground/30 ml-auto">delay: {minDelay}–{maxDelay}s</span>
                </div>
              )}

              {joinStatus === "paused" && (
                <div className="flex items-center gap-2 text-xs bg-amber-500/5 rounded-md p-2 border border-amber-500/15">
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400">Pausado</span>
                </div>
              )}

              {/* Task list */}
              <div className="max-h-52 overflow-y-auto space-y-0.5 rounded-md border border-border/20 p-1.5">
                {joinItems.map((item, i) => {
                  const cfg = statusConfig[item.status];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={`${item.deviceId}-${item.groupLink}`}
                      className={`flex items-start gap-2 p-1.5 rounded text-xs ${
                        i === currentIndex && isProcessing ? "bg-muted/30" : ""
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.color} ${item.status === "running" ? "animate-spin" : ""}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-foreground truncate">{item.deviceName}</span>
                          <span className="text-muted-foreground/30">→</span>
                          <span className="text-foreground/70 truncate">{item.groupName}</span>
                        </div>
                        {item.error && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-destructive/60 truncate mt-0.5 cursor-help text-[10px]">{item.error}</p>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">
                                <p className="text-xs">{item.error}</p>
                                {item.responseStatus && <p className="text-xs mt-1">HTTP {item.responseStatus}</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <span className={`text-[10px] shrink-0 ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Controls */}
              <div className="flex gap-2 flex-wrap">
                {isProcessing && (
                  <>
                    {joinStatus === "running" ? (
                      <Button variant="outline" size="sm" onClick={handlePause} className="gap-1 text-xs h-7">
                        <Pause className="w-3 h-3" /> Pausar
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleResume} className="gap-1 text-xs h-7">
                        <Play className="w-3 h-3" /> Retomar
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={handleCancel} className="gap-1 text-xs h-7">
                      <XCircle className="w-3 h-3" /> Cancelar
                    </Button>
                  </>
                )}

                {isDone && (
                  <>
                    {failedCount > 0 && (
                      <Button variant="outline" size="sm" onClick={retryFailures} className="gap-1 text-xs h-7">
                        <RotateCcw className="w-3 h-3" /> Repetir falhas ({failedCount})
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={copyReport} className="gap-1 text-xs h-7">
                      <ClipboardCopy className="w-3 h-3" /> Copiar relatório
                    </Button>
                    <Button size="sm" onClick={() => handleCloseModal()} className="ml-auto text-xs h-7">
                      Fechar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupCapture;
