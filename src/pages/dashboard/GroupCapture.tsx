import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  UsersRound, Link2, Loader2, Copy, Check, LogIn, Pause, Play, Timer,
  RotateCcw, ClipboardCopy, AlertTriangle, CheckCircle2, XCircle, Clock,
  Filter, Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dgLogo from "@/assets/dg-contingencia.jpeg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

const SUGGESTED_GROUPS = [
  { name: "DG CONTINGÊNCIA #01", link: "https://chat.whatsapp.com/I1gvz1bfEhrEIM9iMFsCik?mode=gi_t" },
  { name: "DG CONTINGÊNCIA #02", link: "https://chat.whatsapp.com/BZNGH9zeFxF5UOj2pD2Wbk?mode=gi_t" },
  { name: "DG CONTINGÊNCIA #03", link: "https://chat.whatsapp.com/JnIfueI6qZsFgWuoYimS85?mode=gi_t" },
];

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
  already_member: { icon: CheckCircle2, label: "Já participa", color: "text-blue-500" },
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
  const [delaySeconds, setDelaySeconds] = useState(10);
  const [activeTab, setActiveTab] = useState("groups");

  // Join process state
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [joinItems, setJoinItems] = useState<JoinItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);

  // Log filters
  const [logFilterDevice, setLogFilterDevice] = useState("all");
  const [logFilterStatus, setLogFilterStatus] = useState("all");
  const [logSearch, setLogSearch] = useState("");

  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const itemsRef = useRef<JoinItem[]>([]);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["warmup-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warmup_groups" as any)
        .select("*")
        .order("created_at", { ascending: false });
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
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Realtime sync for device status
  useEffect(() => {
    const channel = supabase
      .channel('devices-join-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'devices' }, () => {
        refetchDevices();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetchDevices]);

  const { data: joinLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["group-join-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_join_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

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

    let dynamicDelay = delaySeconds;

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

            // Backoff on rate limit
            if (result.responseStatus === 429) {
              dynamicDelay = Math.min(dynamicDelay + 10, 120);
            }
          } else {
            updateItem(i, { status: "error", error: "Resposta vazia do servidor" });
          }
        }
      } catch (err) {
        updateItem(i, { status: "error", error: String(err) });
      }

      // Delay before next
      if (i < items.length - 1 && !cancelledRef.current) {
        await startCountdown(dynamicDelay);
      }
    }

    setJoinStatus(cancelledRef.current ? "cancelled" : "done");
    setCountdown(0);
    refetchLogs();

    const finalItems = itemsRef.current;
    const successCount = finalItems.filter((r) => r.status === "success" || r.status === "already_member").length;
    const errorCount = finalItems.filter((r) => r.status === "error").length;
    toast({
      title: cancelledRef.current ? "Processo cancelado" : "Processo concluído",
      description: `${successCount} sucesso, ${errorCount} erros de ${finalItems.length} tentativas`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  }, [delaySeconds, waitForResume, startCountdown, toast, refetchLogs]);

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

  // Filtered logs
  const filteredLogs = joinLogs.filter((log: any) => {
    if (logFilterDevice !== "all" && log.device_name !== logFilterDevice) return false;
    if (logFilterStatus !== "all" && log.result !== logFilterStatus) return false;
    if (logSearch && !log.group_name?.toLowerCase().includes(logSearch.toLowerCase()) && !log.device_name?.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  const uniqueLogDevices = [...new Set(joinLogs.map((l: any) => l.device_name))];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grupos de Aquecimento</h1>
          <p className="text-sm text-muted-foreground">Links dos grupos do WhatsApp para aquecimento</p>
        </div>
        <Button onClick={() => setJoinModalOpen(true)} className="gap-2">
          <LogIn className="w-4 h-4" /> Entrar nos Grupos
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            Logs
            {joinLogs.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{joinLogs.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {SUGGESTED_GROUPS.filter(sg => !groups.some((g: any) => g.link === sg.link)).map((sg) => (
                <Card key={sg.link} className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <img src={dgLogo} alt={sg.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">{sg.name}</p>
                          <CopyButton text={sg.link} />
                        </div>
                        <div className="flex items-center gap-1.5 bg-muted/30 rounded-md px-2.5 py-1.5 border border-border/30">
                          <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground break-all select-all">{sg.link}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {groups.map((g: any) => (
                <Card key={g.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {g.name?.includes("DG CONTINGÊNCIA") ? (
                        <img src={dgLogo} alt={g.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <UsersRound className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">{g.name}</p>
                          <CopyButton text={g.link} />
                        </div>
                        <div className="flex items-center gap-1.5 bg-muted/30 rounded-md px-2.5 py-1.5 border border-border/30">
                          <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground break-all select-all">{g.link}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {groups.length === 0 && SUGGESTED_GROUPS.length === 0 && (
                <Card className="border-border/50 bg-card/80">
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    Nenhum grupo cadastrado ainda. Adicione o primeiro acima.
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-3 mt-4">
          {/* Log Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar grupo ou instância..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={logFilterDevice} onValueChange={setLogFilterDevice}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Instância" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas instâncias</SelectItem>
                {uniqueLogDevices.map((d) => (
                  <SelectItem key={String(d)} value={String(d)}>{String(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={logFilterStatus} onValueChange={setLogFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="already_member">Já participa</SelectItem>
                <SelectItem value="pending_approval">Aprovação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredLogs.length === 0 ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                Nenhum log encontrado.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {filteredLogs.map((log: any) => {
                const cfg = statusConfig[log.result as ItemStatus] || statusConfig.error;
                const Icon = cfg.icon;
                return (
                  <TooltipProvider key={log.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/30 bg-card/60 hover:bg-card/90 transition-colors text-sm">
                          <Icon className={`w-4 h-4 shrink-0 ${cfg.color} ${log.result === "running" ? "animate-spin" : ""}`} />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-foreground">{log.device_name}</span>
                            <span className="text-muted-foreground mx-1.5">→</span>
                            <span className="text-foreground">{log.group_name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {log.duration_ms > 0 && (
                              <span className="text-[10px] font-mono text-muted-foreground">{log.duration_ms}ms</span>
                            )}
                            <Badge variant={log.result === "success" || log.result === "already_member" ? "default" : log.result === "error" ? "destructive" : "secondary"} className="text-[10px]">
                              {cfg.label}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-sm">
                        <div className="space-y-1 text-xs">
                          <p><strong>Invite Code:</strong> {log.invite_code}</p>
                          <p><strong>HTTP Status:</strong> {log.response_status}</p>
                          {log.error_message && <p><strong>Erro:</strong> {log.error_message}</p>}
                          {log.response_body && <p className="truncate"><strong>Resposta:</strong> {log.response_body.substring(0, 150)}</p>}
                          <p><strong>Tentativa:</strong> {log.attempt}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Entrar nos Grupos */}
      <Dialog open={joinModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Entrar nos Grupos</DialogTitle>
            <DialogDescription>
              Selecione os grupos, instâncias e configure o delay entre entradas.
            </DialogDescription>
          </DialogHeader>

          {!isProcessing && !isDone ? (
            <>
              <div className="space-y-4">
                {/* Seleção de Grupos */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Grupos</h3>
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={selectAllGroups}>
                      {selectedGroups.length === uniqueGroups.length ? "Desmarcar todos" : "Selecionar todos"}
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-md border border-border/50 p-2">
                    {uniqueGroups.map((g) => (
                      <label key={g.link} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                        <Checkbox checked={selectedGroups.includes(g.link)} onCheckedChange={() => toggleGroup(g.link)} />
                        <span className="text-sm truncate">{g.name}</span>
                      </label>
                    ))}
                    {uniqueGroups.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Nenhum grupo disponível</p>
                    )}
                  </div>
                </div>

                {/* Seleção de Instâncias */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Instâncias</h3>
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={selectAllDevices}>
                      {selectedDevices.length === devices.length ? "Desmarcar todos" : "Selecionar todos"}
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-md border border-border/50 p-2">
                    {devices.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                        <Checkbox checked={selectedDevices.includes(d.id)} onCheckedChange={() => toggleDevice(d.id)} />
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm truncate">{d.name}</span>
                          {d.number && <span className="text-xs text-muted-foreground">{d.number}</span>}
                        </div>
                        <Badge variant={d.status === "Connected" ? "default" : "destructive"} className="text-[10px] shrink-0">
                          {d.status === "Connected" ? "Online" : "Offline"}
                        </Badge>
                      </label>
                    ))}
                    {devices.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Nenhuma instância cadastrada</p>
                    )}
                  </div>
                </div>

                {/* Delay */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Delay entre entradas</h3>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground ml-auto">
                      {delaySeconds}s
                    </span>
                  </div>
                  <Slider
                    value={[delaySeconds]}
                    onValueChange={([v]) => setDelaySeconds(v)}
                    min={3}
                    max={120}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>3s</span>
                    <span>120s</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => handleCloseModal()}>Cancelar</Button>
                <Button
                  onClick={startJoinProcess}
                  disabled={selectedGroups.length === 0 || selectedDevices.length === 0}
                  className="gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Iniciar ({selectedGroups.length}g × {selectedDevices.length}i)
                </Button>
              </DialogFooter>
            </>
          ) : (
            /* Progress View */
            <div className="space-y-4">
              {/* Summary bar */}
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

              <Progress value={joinItems.length > 0 ? ((successCount + failedCount) / joinItems.length) * 100 : 0} className="h-2" />

              {/* Countdown */}
              {countdown > 0 && (
                <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-md p-2 border border-border/30">
                  <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Próximo em</span>
                  <span className="font-mono text-foreground">{countdown}s</span>
                </div>
              )}

              {joinStatus === "paused" && (
                <div className="flex items-center gap-2 text-sm bg-amber-500/10 rounded-md p-2 border border-amber-500/30">
                  <Pause className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-500">Pausado</span>
                </div>
              )}

              {/* Task list */}
              <div className="max-h-60 overflow-y-auto space-y-1 rounded-md border border-border/50 p-2">
                <AnimatePresence>
                  {joinItems.map((item, i) => {
                    const cfg = statusConfig[item.status];
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={`${item.deviceId}-${item.groupLink}`}
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        className={`flex items-start gap-2 p-2 rounded-md text-xs ${
                          i === currentIndex && isProcessing ? "bg-muted/50" : ""
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.color} ${item.status === "running" ? "animate-spin" : ""}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-foreground truncate">{item.deviceName}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-foreground truncate">{item.groupName}</span>
                          </div>
                          {item.error && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-destructive/80 truncate mt-0.5 cursor-help">{item.error}</p>
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
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Controls */}
              <div className="flex gap-2 flex-wrap">
                {isProcessing && (
                  <>
                    {joinStatus === "running" ? (
                      <Button variant="outline" size="sm" onClick={handlePause} className="gap-1.5">
                        <Pause className="w-3.5 h-3.5" /> Pausar
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleResume} className="gap-1.5">
                        <Play className="w-3.5 h-3.5" /> Retomar
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={handleCancel} className="gap-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Cancelar
                    </Button>
                  </>
                )}

                {isDone && (
                  <>
                    {failedCount > 0 && (
                      <Button variant="outline" size="sm" onClick={retryFailures} className="gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" /> Repetir falhas ({failedCount})
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={copyReport} className="gap-1.5">
                      <ClipboardCopy className="w-3.5 h-3.5" /> Copiar relatório
                    </Button>
                    <Button size="sm" onClick={() => handleCloseModal()} className="ml-auto">
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
