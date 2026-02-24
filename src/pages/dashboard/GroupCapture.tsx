import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UsersRound, Link2, Loader2, Copy, Check, LogIn, Pause, Play, Square, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dgLogo from "@/assets/dg-contingencia.jpeg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

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
type JoinResult = { device: string; group: string; status: string; error?: string };

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

  // Join process state
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("idle");
  const [joinProgress, setJoinProgress] = useState(0);
  const [joinTotal, setJoinTotal] = useState(0);
  const [joinCurrent, setJoinCurrent] = useState("");
  const [joinResults, setJoinResults] = useState<JoinResult[]>([]);
  const [countdown, setCountdown] = useState(0);

  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const { data: devices = [] } = useQuery({
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

  const startJoinProcess = useCallback(async () => {
    pausedRef.current = false;
    cancelledRef.current = false;
    setJoinStatus("running");
    setJoinResults([]);

    const pairs: { groupLink: string; groupName: string; deviceId: string }[] = [];
    const uniqueGrps = [
      ...SUGGESTED_GROUPS.map((sg) => ({ name: sg.name, link: sg.link })),
      ...groups.map((g: any) => ({ name: g.name, link: g.link })),
    ].filter((g, i, arr) => arr.findIndex((x) => x.link === g.link) === i);

    for (const deviceId of selectedDevices) {
      for (const groupLink of selectedGroups) {
        const grp = uniqueGrps.find((g) => g.link === groupLink);
        pairs.push({ groupLink, groupName: grp?.name || groupLink, deviceId });
      }
    }

    setJoinTotal(pairs.length);
    setJoinProgress(0);

    const results: JoinResult[] = [];

    for (let i = 0; i < pairs.length; i++) {
      if (cancelledRef.current) break;
      await waitForResume();
      if (cancelledRef.current) break;

      const { groupLink, groupName, deviceId } = pairs[i];
      const deviceName = devices.find((d) => d.id === deviceId)?.name || deviceId;
      setJoinCurrent(`${deviceName} → ${groupName}`);

      try {
        const { data, error } = await supabase.functions.invoke("join-group", {
          body: { groupLinks: [groupLink], deviceIds: [deviceId] },
        });

        const result: JoinResult = {
          device: deviceName,
          group: groupName,
          status: error ? "error" : (data?.results?.[0]?.status || "success"),
          error: error ? String(error) : data?.results?.[0]?.error,
        };
        results.push(result);
        setJoinResults([...results]);
      } catch (err) {
        results.push({ device: deviceName, group: groupName, status: "error", error: String(err) });
        setJoinResults([...results]);
      }

      setJoinProgress(i + 1);

      // Delay before next (skip if last)
      if (i < pairs.length - 1 && !cancelledRef.current) {
        await startCountdown(delaySeconds);
      }
    }

    setJoinStatus(cancelledRef.current ? "cancelled" : "done");
    setJoinCurrent("");
    setCountdown(0);

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;
    toast({
      title: cancelledRef.current ? "Processo cancelado" : "Processo concluído",
      description: `${successCount} sucesso, ${errorCount} erros de ${results.length} tentativas`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  }, [selectedGroups, selectedDevices, devices, groups, delaySeconds, waitForResume, startCountdown, toast]);

  const handlePause = () => {
    pausedRef.current = true;
    setJoinStatus("paused");
  };

  const handleResume = () => {
    pausedRef.current = false;
    setJoinStatus("running");
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    pausedRef.current = false;
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(0);
  };

  const handleCloseModal = () => {
    if (joinStatus === "running" || joinStatus === "paused") return;
    setJoinModalOpen(false);
    setJoinStatus("idle");
    setJoinProgress(0);
    setJoinTotal(0);
    setJoinResults([]);
    setSelectedGroups([]);
    setSelectedDevices([]);
  };

  const toggleGroup = (link: string) => {
    setSelectedGroups((prev) =>
      prev.includes(link) ? prev.filter((l) => l !== link) : [...prev, link]
    );
  };

  const toggleDevice = (id: string) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const uniqueGroups = [
    ...SUGGESTED_GROUPS.map((sg) => ({ name: sg.name, link: sg.link })),
    ...groups.map((g: any) => ({ name: g.name, link: g.link })),
  ].filter((g, i, arr) => arr.findIndex((x) => x.link === g.link) === i);

  const selectAllGroups = () => {
    setSelectedGroups(selectedGroups.length === uniqueGroups.length ? [] : uniqueGroups.map((g) => g.link));
  };

  const selectAllDevices = () => {
    setSelectedDevices(selectedDevices.length === devices.length ? [] : devices.map((d) => d.id));
  };

  const isProcessing = joinStatus === "running" || joinStatus === "paused";

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

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Grupos de Aquecimento</h2>

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
      </div>

      {/* Modal de Entrar nos Grupos */}
      <Dialog open={joinModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Entrar nos Grupos</DialogTitle>
            <DialogDescription>
              Selecione os grupos, instâncias e configure o delay entre entradas.
            </DialogDescription>
          </DialogHeader>

          {!isProcessing && joinStatus !== "done" && joinStatus !== "cancelled" ? (
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
                    <h3 className="text-sm font-semibold text-foreground">Instâncias (Dispositivos)</h3>
                    <Button variant="ghost" size="sm" className="text-xs h-6" onClick={selectAllDevices}>
                      {selectedDevices.length === devices.length ? "Desmarcar todos" : "Selecionar todos"}
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-md border border-border/50 p-2">
                    {devices.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer">
                        <Checkbox checked={selectedDevices.includes(d.id)} onCheckedChange={() => toggleDevice(d.id)} />
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm truncate">{d.name}</span>
                          {d.number && <span className="text-xs text-muted-foreground">{d.number}</span>}
                          <span className={`w-2 h-2 rounded-full shrink-0 ${d.status === "Connected" ? "bg-emerald-400" : "bg-destructive/60"}`} />
                        </div>
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
                <Button variant="outline" onClick={handleCloseModal}>
                  Cancelar
                </Button>
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
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-mono text-foreground">{joinProgress}/{joinTotal}</span>
                </div>
                <Progress value={joinTotal > 0 ? (joinProgress / joinTotal) * 100 : 0} className="h-2" />
              </div>

              {joinCurrent && (
                <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-md p-2.5 border border-border/30">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                  <span className="truncate text-foreground">{joinCurrent}</span>
                  {countdown > 0 && (
                    <span className="ml-auto text-xs font-mono text-muted-foreground shrink-0">
                      ⏳ {countdown}s
                    </span>
                  )}
                </div>
              )}

              {joinStatus === "paused" && (
                <div className="flex items-center gap-2 text-sm bg-accent/30 rounded-md p-2.5 border border-accent/50">
                  <Pause className="w-3.5 h-3.5 text-accent-foreground" />
                  <span className="text-accent-foreground">Pausado</span>
                </div>
              )}

              {/* Results log */}
              {joinResults.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1 text-xs rounded-md border border-border/50 p-2">
                  {joinResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-1.5 ${r.status === "success" ? "text-emerald-400" : r.status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                      <span>{r.status === "success" ? "✓" : r.status === "error" ? "✗" : "⊘"}</span>
                      <span className="truncate">{r.device} → {r.group}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Controls */}
              {isProcessing && (
                <div className="flex gap-2">
                  {joinStatus === "running" ? (
                    <Button variant="outline" onClick={handlePause} className="flex-1 gap-2">
                      <Pause className="w-4 h-4" /> Pausar
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleResume} className="flex-1 gap-2">
                      <Play className="w-4 h-4" /> Retomar
                    </Button>
                  )}
                  <Button variant="destructive" onClick={handleCancel} className="flex-1 gap-2">
                    <Square className="w-4 h-4" /> Cancelar
                  </Button>
                </div>
              )}

              {(joinStatus === "done" || joinStatus === "cancelled") && (
                <DialogFooter>
                  <Button onClick={handleCloseModal}>Fechar</Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupCapture;
