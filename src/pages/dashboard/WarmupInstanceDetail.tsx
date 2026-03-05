import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  useDeviceCycle, useCreateCycle, useUpdateCycle,
  useInstanceGroups, useAutosaveContacts, useCommunityMembership,
  useWarmupAuditLogs, useWarmupPlans,
  type WarmupCycle,
} from "@/hooks/useWarmupV2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  groups_only: { label: "Grupos", color: "text-blue-400", icon: Users, step: 2 },
  autosave_enabled: { label: "Auto Save", color: "text-emerald-400", icon: MessageSquare, step: 3 },
  community_enabled: { label: "Comunidade", color: "text-purple-400", icon: Globe, step: 4 },
  completed: { label: "Concluído", color: "text-muted-foreground", icon: CheckCircle2, step: 5 },
  paused: { label: "Pausado", color: "text-amber-400", icon: Pause, step: 0 },
  error: { label: "Erro", color: "text-destructive", icon: AlertTriangle, step: 0 },
};

const logLevelColors: Record<string, string> = {
  info: "text-blue-400",
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
        .select("*")
        .eq("id", deviceId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!deviceId,
  });

  // Cycle
  const { data: cycle, isLoading: cycleLoading } = useDeviceCycle(deviceId!);
  const createCycle = useCreateCycle();
  const updateCycle = useUpdateCycle();

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
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) { setCountdown("Concluído"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
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
    createCycle.mutate(
      { device_id: deviceId, chip_state: chipState, days_total: Number(daysTotal), plan_id: plan?.id },
      {
        onSuccess: () => toast({ title: "Aquecimento iniciado!", description: "O ciclo começou. As primeiras 24h são de adaptação." }),
        onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handlePause = () => {
    if (!cycle) return;
    updateCycle.mutate(
      { id: cycle.id, is_running: false, phase: "paused" } as any,
      { onSuccess: () => toast({ title: "Aquecimento pausado" }) }
    );
  };

  const handleResume = () => {
    if (!cycle) return;
    updateCycle.mutate(
      { id: cycle.id, is_running: true, phase: "groups_only", next_run_at: new Date().toISOString() } as any,
      { onSuccess: () => toast({ title: "Aquecimento retomado" }) }
    );
  };

  const handleFinish = () => {
    if (!cycle) return;
    updateCycle.mutate(
      { id: cycle.id, is_running: false, phase: "completed" } as any,
      { onSuccess: () => toast({ title: "Ciclo encerrado" }) }
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
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard/warmup-v2")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground truncate">{device.name}</h1>
            <Badge variant="outline" className={cn("text-[9px] h-5", isConnected ? "text-emerald-400" : "text-muted-foreground")}>
              {isConnected ? <Wifi className="w-2.5 h-2.5 mr-1" /> : <WifiOff className="w-2.5 h-2.5 mr-1" />}
              {isConnected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
          {device.number && <p className="text-[11px] font-mono text-muted-foreground/60">{device.number}</p>}
        </div>
      </div>

      {/* Connection warning */}
      {!isConnected && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <QrCode className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Instância desconectada</p>
              <p className="text-xs text-muted-foreground">Conecte o QR Code antes de iniciar o aquecimento.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/devices")}>
              Conectar QR
            </Button>
          </CardContent>
        </Card>
      )}

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
              disabled={!isConnected || createCycle.isPending}
            >
              {createCycle.isPending ? (
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
              <CardContent className="p-4 text-center">
                <Timer className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Período de adaptação</p>
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
                  <Users className="w-3 h-3 text-blue-400" />
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
                    Rede entre contas do sistema para interação mútua
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  cycle.phase === "community_enabled" ? "text-purple-400 border-purple-400/20" : "text-muted-foreground"
                )}
              >
                {cycle.phase === "community_enabled" ? "Habilitada" : "Bloqueada pela fase"}
              </Badge>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {cycle.is_running && cycle.phase !== "completed" ? (
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={handlePause}>
                <Pause className="w-3 h-3" /> Pausar Aquecimento
              </Button>
            ) : cycle.phase === "paused" ? (
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={handleResume}>
                <Play className="w-3 h-3" /> Retomar Aquecimento
              </Button>
            ) : null}

            {cycle.phase !== "completed" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleFinish}
              >
                <Square className="w-3 h-3" /> Encerrar Ciclo
              </Button>
            )}
          </div>

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
                        log.level === "error" ? "bg-destructive" : log.level === "warn" ? "bg-amber-400" : "bg-blue-400"
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
