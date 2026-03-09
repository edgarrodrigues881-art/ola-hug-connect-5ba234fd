import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  useDeviceCycle,
  useInstanceGroups, useAutosaveContacts, useCommunityMembership,
  useWarmupAuditLogs, useWarmupPlans, useToggleCommunity,
  type WarmupCycle,
} from "@/hooks/useWarmupV2";
import { useWarmupEngine } from "@/hooks/useWarmupEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Flame, Wifi, WifiOff, QrCode, Play, Pause, Square,
  Clock, Users, MessageSquare, Shield, Globe, ScrollText,
  AlertTriangle, CheckCircle2, XCircle, Info, Zap, Timer,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const phaseConfig: Record<string, { label: string; color: string; icon: typeof Clock; step: number }> = {
  pre_24h: { label: "Primeiras 24h", color: "text-amber-400", icon: Timer, step: 1 },
  groups_only: { label: "Grupos", color: "text-teal-400", icon: Users, step: 2 },
  autosave_enabled: { label: "Auto Save", color: "text-emerald-400", icon: MessageSquare, step: 3 },
  community_enabled: { label: "Comunidade", color: "text-purple-400", icon: Globe, step: 4 },
  completed: { label: "Concluído", color: "text-muted-foreground", icon: CheckCircle2, step: 5 },
  paused: { label: "Pausado", color: "text-amber-400", icon: Pause, step: 0 },
  error: { label: "Erro", color: "text-destructive", icon: AlertTriangle, step: 0 },
};

const logLevelColors: Record<string, string> = {
  info: "text-teal-400",
  warn: "text-amber-400",
  error: "text-destructive",
};

const WarmupInstanceDetail = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Device data
  const { data: device } = useQuery({
    queryKey: ["device-detail-warmup", deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("id, name, number, status, login_type, proxy_id, profile_picture, profile_name, created_at, updated_at, instance_type")
        .eq("id", deviceId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!deviceId,
  });

  // Cycle
  const { data: cycle, isLoading: cycleLoading } = useDeviceCycle(deviceId!);
  const engine = useWarmupEngine();
  const toggleCommunity = useToggleCommunity();

  // Related data
  const { data: instanceGroups = [] } = useInstanceGroups(deviceId!);
  const { data: autosaveContacts = [] } = useAutosaveContacts();
  const { data: community } = useCommunityMembership(deviceId!);
  const { data: auditLogs = [] } = useWarmupAuditLogs(cycle?.id);
  const { data: plans = [] } = useWarmupPlans();

  // Wizard state
  const [chipState, setChipState] = useState<"new" | "recovered">("new");
  const [daysTotal, setDaysTotal] = useState("14");

  // Countdown
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!cycle || cycle.phase !== "pre_24h") return;
    const tick = () => {
      const end = new Date(cycle.first_24h_ends_at).getTime();
      const start = end - 24 * 3600000; // 24h before end = start time
      const now = Date.now();
      const elapsed = now - start;
      if (elapsed >= 24 * 3600000) { setCountdown("24:00:00"); return; }
      if (elapsed < 0) { setCountdown("00:00:00"); return; }
      const h = Math.floor(elapsed / 3600000);
      const m = Math.floor((elapsed % 3600000) / 60000);
      const s = Math.floor((elapsed % 60000) / 1000);
      setCountdown(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [cycle]);

  const isConnected = device && ["Connected", "Ready", "authenticated"].includes(device.status);

  const handleStartWarmup = () => {
    if (!deviceId) return;
    const plan = plans.find(p => p.days_total === Number(daysTotal));
    engine.mutate(
      { action: "start", device_id: deviceId, chip_state: chipState, days_total: Number(daysTotal), plan_id: plan?.id },
      {
        onSuccess: () => toast({ title: "Aquecimento iniciado!", description: "O ciclo começou. As primeiras 24h são de adaptação." }),
        onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handlePause = () => {
    if (!deviceId) return;
    engine.mutate(
      { action: "pause", device_id: deviceId },
      { onSuccess: () => toast({ title: "Aquecimento pausado" }) }
    );
  };

  const handleResume = () => {
    if (!deviceId) return;
    engine.mutate(
      { action: "resume", device_id: deviceId },
      { onSuccess: () => toast({ title: "Aquecimento retomado" }) }
    );
  };

  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const handleFinish = () => {
    if (!deviceId) return;
    engine.mutate(
      { action: "stop", device_id: deviceId },
      {
        onSuccess: () => {
          setShowFinishConfirm(false);
          toast({ title: "Ciclo encerrado" });
        },
      }
    );
  };

  if (!device) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const joinedGroups = instanceGroups.filter(g => g.join_status === "joined").length;
  const pendingGroups = instanceGroups.filter(g => g.join_status === "pending").length;
  const activeContacts = autosaveContacts.filter(c => c.is_active).length;
  const pc = cycle ? phaseConfig[cycle.phase] || phaseConfig.pre_24h : null;
  const PhaseIcon = pc?.icon || Clock;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* ── Hero Card (inspired by reference) ── */}
      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 gap-1.5",
              isConnected
                ? "text-primary border-primary/30 bg-primary/5"
                : "text-muted-foreground border-muted-foreground/20 bg-muted/10"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
            STATUS: {isConnected ? "CONECTADO" : "DESCONECTADO"}
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => navigate("/dashboard/warmup-v2")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Instance info */}
        <div className="p-4 flex items-center gap-4">
          {/* Avatar / Phone icon */}
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shrink-0 ring-2",
            isConnected ? "bg-primary/10 ring-primary/30" : "bg-muted/30 ring-border/30"
          )}>
            {device.profile_picture ? (
              <img src={device.profile_picture} className="w-12 h-12 rounded-full object-cover" alt="" />
            ) : (
              <Flame className={cn("w-5 h-5", isConnected ? "text-primary" : "text-muted-foreground")} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">{device.profile_name || device.name}</h1>
            {device.number && (
              <p className="text-xs font-mono text-muted-foreground">{device.number}</p>
            )}
            {cycle && pc && (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                Dia {cycle.day_index} · <span className={pc.color}>{pc.label.toLowerCase()}</span> · {cycle.day_index}-{cycle.days_total}d
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {cycle && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            {cycle.is_running && cycle.phase !== "completed" ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs h-9 border-primary/30 text-primary hover:bg-primary/10"
                onClick={handlePause}
              >
                <Pause className="w-3.5 h-3.5" /> Parar aquecimento
              </Button>
            ) : cycle.phase === "paused" ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs h-9 border-primary/30 text-primary hover:bg-primary/10"
                onClick={handleResume}
              >
                <Play className="w-3.5 h-3.5" /> Retomar aquecimento
              </Button>
            ) : null}
          </div>
        )}

      </div>


      {/* ── WIZARD (no active cycle) ── */}
      {!cycle && !cycleLoading && (
        <Card className="border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" />
              Iniciar Aquecimento Automático
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Chip state */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Estado do chip</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "new" as const, label: "Chip Novo", desc: "Nunca foi banido, progressão conservadora" },
                  { value: "recovered" as const, label: "Chip Recuperado", desc: "Já sofreu ban, progressão extra cautelosa" },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setChipState(opt.value)}
                    className={cn(
                      "text-left p-3 rounded-lg border transition-colors",
                      chipState === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <p className="text-sm font-medium text-foreground">{opt.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Duração do ciclo</label>
              <Select value={daysTotal} onValueChange={setDaysTotal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[7, 14, 21, 30].map(d => (
                    <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Guardrails summary */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2.5">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                Proteções automáticas
              </p>
              {[
                { icon: Timer, text: "Primeiras 24h: sem mensagens. Apenas entrada gradual em grupos." },
                { icon: Users, text: "Entrada automática em 3 a 5 grupos (de um pool de 8) com delay aleatório." },
                { icon: Zap, text: "Após 24h: ativação progressiva → Grupos → Auto Save → Comunidade." },
                { icon: MessageSquare, text: "PV/Auto Save: orçamento diário de 20 a 30 interações." },
                { icon: Shield, text: "Limite de 55 destinatários únicos por dia (editável)." },
                { icon: ScrollText, text: "Tudo registrado em logs para auditoria completa." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <item.icon className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Button
              className="w-full gap-2"
              onClick={handleStartWarmup}
              disabled={!isConnected || engine.isPending}
            >
              {engine.isPending ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Flame className="w-4 h-4" />
              )}
              Começar Aquecimento
            </Button>
            {!isConnected && (
              <p className="text-[11px] text-amber-400 text-center">Conecte a instância primeiro</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── CYCLE PANEL ── */}
      {cycle && (
        <div className="space-y-4">
          {/* Phase timeline */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <PhaseIcon className={cn("w-4 h-4", pc?.color)} />
                  <span className={cn("text-sm font-semibold", pc?.color)}>{pc?.label}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Dia {cycle.day_index} / {cycle.days_total}
                </Badge>
              </div>

              {/* Phase steps */}
              <div className="flex items-center gap-1 mb-3">
                {["pre_24h", "groups_only", "autosave_enabled", "community_enabled", "completed"].map((p, i) => {
                  const isActive = cycle.phase === p;
                  const isPast = (phaseConfig[cycle.phase]?.step || 0) > (phaseConfig[p]?.step || 0);
                  return (
                    <div key={p} className="flex-1 flex items-center gap-1">
                      <div className={cn(
                        "h-1.5 flex-1 rounded-full",
                        isActive ? "bg-primary" : isPast ? "bg-primary/40" : "bg-muted/40"
                      )} />
                    </div>
                  );
                })}
              </div>

              {/* Day progress */}
              <Progress value={(cycle.day_index / cycle.days_total) * 100} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
                {Math.round((cycle.day_index / cycle.days_total) * 100)}% concluído
              </p>
            </CardContent>
          </Card>

          {/* Countdown for pre_24h */}
          {cycle.phase === "pre_24h" && (
            <Card className="border-amber-500/15 bg-amber-500/5">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <Timer className="w-6 h-6 text-amber-400 mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Tempo decorrido</p>
                <p className="text-3xl font-bold text-foreground font-mono tabular-nums">{countdown}</p>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Sem envio de mensagens. Entrada gradual em grupos em andamento.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Budget */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <MessageSquare className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget Diário</span>
                </div>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {cycle.daily_interaction_budget_used}
                  <span className="text-xs text-muted-foreground font-normal">/{cycle.daily_interaction_budget_target}</span>
                </p>
                <Progress
                  value={(cycle.daily_interaction_budget_used / cycle.daily_interaction_budget_target) * 100}
                  className="h-1 mt-1.5"
                />
              </CardContent>
            </Card>

            {/* Unique recipients */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Únicos Hoje</span>
                </div>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {cycle.daily_unique_recipients_used}
                  <span className="text-xs text-muted-foreground font-normal">/{cycle.daily_unique_recipients_cap}</span>
                </p>
                <Progress
                  value={(cycle.daily_unique_recipients_used / cycle.daily_unique_recipients_cap) * 100}
                  className="h-1 mt-1.5"
                />
              </CardContent>
            </Card>

            {/* Groups */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3 h-3 text-teal-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Grupos</span>
                </div>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {joinedGroups}
                  <span className="text-xs text-muted-foreground font-normal"> entrou</span>
                </p>
                {pendingGroups > 0 && (
                  <p className="text-[10px] text-amber-400 mt-0.5">{pendingGroups} pendente{pendingGroups > 1 ? "s" : ""}</p>
                )}
              </CardContent>
            </Card>

            {/* Auto Save */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Auto Save</span>
                </div>
                <p className="text-lg font-bold tabular-nums text-foreground">
                  {activeContacts}
                  <span className="text-xs text-muted-foreground font-normal"> contatos</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {["autosave_enabled", "community_enabled"].includes(cycle.phase) ? "Ativo" : "Bloqueado"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Auto Save alert when 0 contacts */}
          {activeContacts === 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">Sem contatos Auto Save</p>
                  <p className="text-[11px] text-muted-foreground">
                    Adicione contatos para habilitar essa camada quando chegar a fase.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => navigate("/dashboard/autosave")}>
                  Adicionar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Community status */}
          <Card>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">Comunidade</p>
                  <p className="text-[11px] text-muted-foreground">
                    {["autosave_enabled", "community_enabled", "completed"].includes(cycle.phase)
                      ? "Rede entre contas do sistema para interação mútua"
                      : "Bloqueado até fase Auto Save"}
                  </p>
                </div>
              </div>
              {["autosave_enabled", "community_enabled", "completed"].includes(cycle.phase) ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">
                    {community?.is_enabled ? "Habilitada" : "Desabilitada"}
                  </span>
                  <Switch
                    checked={community?.is_enabled ?? false}
                    disabled={toggleCommunity.isPending}
                    onCheckedChange={(checked) => {
                      if (!deviceId) return;
                      toggleCommunity.mutate(
                        { deviceId, cycleId: cycle.id, enable: checked },
                        {
                          onSuccess: () => toast({
                            title: checked ? "Comunidade habilitada" : "Comunidade desabilitada",
                          }),
                        }
                      );
                    }}
                  />
                </div>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  🔒 Bloqueado
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Encerrar ciclo */}
          {cycle.phase !== "completed" && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowFinishConfirm(true)}
              >
                <Square className="w-3 h-3" /> Encerrar Ciclo
              </Button>
            </div>
          )}

          {/* Confirmação de encerramento */}
          <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Encerrar ciclo de aquecimento?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Essa ação <strong className="text-foreground">não pode ser revertida</strong>. O ciclo será finalizado permanentemente.</p>
                <p>Todo o progresso será perdido e você precisará iniciar um novo ciclo do zero.</p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowFinishConfirm(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleFinish}
                  disabled={engine.isPending}
                >
                  {engine.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                  Encerrar definitivamente
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Audit Logs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-muted-foreground" />
                Logs Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-muted-foreground">Nenhum log registrado ainda</p>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto divide-y divide-border/10">
                  {auditLogs.map(log => (
                    <div key={log.id} className="px-4 py-2.5 flex items-start gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                        log.level === "error" ? "bg-destructive" : log.level === "warn" ? "bg-amber-400" : "bg-teal-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-[8px] h-4", logLevelColors[log.level])}>
                            {log.event_type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground/50">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{log.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default WarmupInstanceDetail;
