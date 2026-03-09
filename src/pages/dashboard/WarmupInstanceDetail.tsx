import { useState, useEffect, useMemo } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Flame, Play, Pause, Square,
  Clock, Users, MessageSquare, Shield, Globe, ScrollText,
  AlertTriangle, CheckCircle2, Zap, Timer, Loader2,
} from "lucide-react";
import { formatDistanceToNow, differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ── phase config ── */
const phaseConfig: Record<string, { label: string; color: string; icon: typeof Clock; step: number }> = {
  pre_24h:            { label: "Primeiras 24h",  color: "text-amber-400",           icon: Timer,        step: 1 },
  groups_only:        { label: "Grupos",          color: "text-teal-400",            icon: Users,        step: 2 },
  autosave_enabled:   { label: "Auto Save",       color: "text-emerald-400",         icon: MessageSquare, step: 3 },
  community_enabled:  { label: "Comunidade",      color: "text-purple-400",          icon: Globe,        step: 4 },
  completed:          { label: "Concluído",        color: "text-muted-foreground",    icon: CheckCircle2, step: 5 },
  paused:             { label: "Pausado",          color: "text-amber-400",           icon: Pause,        step: 0 },
  error:              { label: "Erro",             color: "text-destructive",         icon: AlertTriangle, step: 0 },
};

const phaseSteps = ["pre_24h", "groups_only", "autosave_enabled", "community_enabled", "completed"] as const;

/* ── component ── */
const WarmupInstanceDetail = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

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

  const { data: cycle, isLoading: cycleLoading } = useDeviceCycle(deviceId!);
  const engine = useWarmupEngine();
  const toggleCommunity = useToggleCommunity();

  const { data: instanceGroups = [] } = useInstanceGroups(deviceId!);
  const { data: autosaveContacts = [] } = useAutosaveContacts();
  const { data: community } = useCommunityMembership(deviceId!);
  const { data: auditLogs = [] } = useWarmupAuditLogs(cycle?.id);
  const { data: plans = [] } = useWarmupPlans();

  // Group audit logs by warmup day
  const cycleStartedAt = cycle?.started_at ? new Date(cycle.started_at) : null;
  const dayGroups = useMemo(() => {
    if (!cycleStartedAt || auditLogs.length === 0) return [];
    const groups: Record<number, typeof auditLogs> = {};
    auditLogs.forEach(log => {
      const dayIdx = differenceInCalendarDays(new Date(log.created_at), cycleStartedAt) + 1;
      const day = Math.max(1, dayIdx);
      if (!groups[day]) groups[day] = [];
      groups[day].push(log);
    });
    return Object.entries(groups)
      .map(([day, logs]) => ({ day: Number(day), logs }))
      .sort((a, b) => b.day - a.day);
  }, [auditLogs, cycleStartedAt?.getTime()]);

  const [chipState, setChipState] = useState<"new" | "recovered" | "unstable">("new");
  const [daysTotal, setDaysTotal] = useState("3");
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  /* countdown */
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!cycle || cycle.phase !== "pre_24h") return;
    const tick = () => {
      const end = new Date(cycle.first_24h_ends_at).getTime();
      const start = end - 24 * 3600000;
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

  /* handlers */
  const handleStartWarmup = () => {
    if (!deviceId) return;
    const plan = plans.find(p => p.days_total === Number(daysTotal));
    engine.mutate(
      { action: "start", device_id: deviceId, chip_state: chipState, days_total: Number(daysTotal), plan_id: plan?.id },
      {
        onSuccess: () => toast({ title: "🔥 Aquecimento iniciado!", description: "Seu chip está sendo aquecido. Acompanhe o progresso aqui." }),
        onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handlePause = () => {
    if (!deviceId) return;
    engine.mutate({ action: "pause", device_id: deviceId }, { onSuccess: () => toast({ title: "Aquecimento pausado" }) });
  };

  const handleResume = () => {
    if (!deviceId) return;
    engine.mutate({ action: "resume", device_id: deviceId }, { onSuccess: () => toast({ title: "Aquecimento retomado" }) });
  };

  const handleFinish = () => {
    if (!deviceId) return;
    engine.mutate(
      { action: "stop", device_id: deviceId },
      { onSuccess: () => { setShowFinishConfirm(false); toast({ title: "✅ Ciclo encerrado", description: "O aquecimento foi finalizado com sucesso." }); } }
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">

      {/* ═══════════ HERO HEADER ═══════════ */}
      <div className="relative rounded-2xl border border-border/30 bg-gradient-to-b from-card to-background overflow-hidden">
        {/* subtle glow */}
        <div className={cn(
          "absolute -top-20 left-1/2 -translate-x-1/2 w-60 h-60 rounded-full blur-[100px] opacity-20 pointer-events-none",
          isConnected ? "bg-primary" : "bg-muted-foreground"
        )} />

        <div className="relative z-10">
          {/* top bar */}
          <div className="flex items-center justify-between px-5 pt-4">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={() => navigate("/dashboard/warmup-v2")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest px-3 py-1 gap-1.5 rounded-full border",
                isConnected
                  ? "text-primary border-primary/25 bg-primary/8"
                  : "text-muted-foreground border-border bg-muted/10"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full inline-block", isConnected ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
              {isConnected ? "CONECTADO" : "DESCONECTADO"}
            </Badge>
          </div>

          {/* instance identity */}
          <div className="px-5 pt-4 pb-5 flex items-center gap-4">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ring-2 ring-offset-2 ring-offset-background",
              isConnected ? "bg-primary/10 ring-primary/30" : "bg-muted/20 ring-border/20"
            )}>
              {device.profile_picture ? (
                <img src={device.profile_picture} className="w-14 h-14 rounded-2xl object-cover" alt="" />
              ) : (
                <Flame className={cn("w-6 h-6", isConnected ? "text-primary" : "text-muted-foreground")} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate leading-tight">
                {device.profile_name || device.name}
              </h1>
              {device.number && (
                <p className="text-[13px] font-mono text-muted-foreground/70 mt-0.5">{device.number}</p>
              )}
              {cycle && pc && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={cn("text-[11px] font-semibold", pc.color)}>{pc.label}</span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-[11px] text-muted-foreground">Dia {cycle.day_index}/{cycle.days_total}</span>
                </div>
              )}
            </div>
          </div>

          {/* action row */}
          {cycle && cycle.phase !== "completed" && (
            <div className="px-5 pb-5">
              {cycle.is_running ? (
                <Button
                  className="w-full gap-2 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                  variant="ghost"
                  onClick={handlePause}
                >
                  <Pause className="w-4 h-4" /> Pausar aquecimento
                </Button>
              ) : cycle.phase === "paused" ? (
                <Button
                  className="w-full gap-2 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15"
                  variant="ghost"
                  onClick={handleResume}
                >
                  <Play className="w-4 h-4" /> Retomar aquecimento
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ WIZARD (no cycle) ═══════════ */}
      {!cycle && !cycleLoading && (
        <div className="space-y-5">
          {/* chip state selector */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Estado do chip</p>
            <div className="grid grid-cols-3 gap-2.5">
              {([
                { value: "new" as const, label: "Chip Novo", desc: "Progressão conservadora", emoji: "🟢" },
                { value: "recovered" as const, label: "Recuperado", desc: "Extra cauteloso, já sofreu ban", emoji: "🟡" },
                { value: "unstable" as const, label: "Chip Fraco", desc: "Não aguenta 1 mensagem", emoji: "🔴" },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setChipState(opt.value)}
                  className={cn(
                    "text-left p-3.5 rounded-xl border-2 transition-all duration-150",
                    chipState === opt.value
                      ? "border-primary bg-primary/5 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.25)]"
                      : "border-border/40 hover:border-primary/20 bg-card"
                  )}
                >
                  <span className="text-base">{opt.emoji}</span>
                  <p className="text-[13px] font-semibold text-foreground mt-1.5">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* duration */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Duração do ciclo</p>
            <Select value={daysTotal} onValueChange={setDaysTotal}>
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 7, 14, 21, 30].map(d => (
                  <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* protections */}
          <div className="rounded-xl border border-border/30 bg-card p-5 space-y-3">
            <p className="text-xs font-bold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Proteções automáticas
            </p>
            <ul className="grid gap-1.5 list-disc list-inside">
              {[
                "Limites diários automáticos",
                "Delays aleatórios entre ações",
                "Evolução progressiva de fases",
                "Proteção contínua do chip",
              ].map((item, i) => (
                <li key={i} className="text-[11px] text-muted-foreground leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <Button
            className="w-full gap-2 h-12 rounded-xl text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20"
            onClick={handleStartWarmup}
            disabled={!isConnected || engine.isPending}
          >
            {engine.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Flame className="w-4 h-4" />
            )}
            Começar Aquecimento
          </Button>
          {!isConnected && (
            <p className="text-[11px] text-amber-400 text-center -mt-2">⚠ Conecte a instância primeiro para iniciar</p>
          )}
        </div>
      )}

      {/* ═══════════ ACTIVE CYCLE ═══════════ */}
      {cycle && (
        <div className="space-y-5">

          {/* Phase stepper + day progress */}
          <div className="rounded-xl border border-border/30 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {pc && <pc.icon className={cn("w-4 h-4", pc.color)} />}
                <span className={cn("text-sm font-bold", pc?.color)}>{pc?.label}</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-lg">
                Dia {cycle.day_index}/{cycle.days_total}
              </span>
            </div>

            {/* phase stepper */}
            <div className="flex items-center gap-1">
              {phaseSteps.map((p) => {
                const isActive = cycle.phase === p;
                const isPast = (phaseConfig[cycle.phase]?.step || 0) > (phaseConfig[p]?.step || 0);
                return (
                  <div key={p} className="flex-1 group relative">
                    <div className={cn(
                      "h-2 rounded-full transition-all",
                      isActive ? "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]" : isPast ? "bg-primary/35" : "bg-muted/30"
                    )} />
                    <span className={cn(
                      "absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-medium whitespace-nowrap transition-opacity",
                      isActive ? cn("opacity-100", pc?.color) : "opacity-0 group-hover:opacity-70 text-muted-foreground"
                    )}>
                      {phaseConfig[p]?.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3">
              <Progress value={(cycle.day_index / cycle.days_total) * 100} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                {Math.round((cycle.day_index / cycle.days_total) * 100)}% concluído
              </p>
            </div>
          </div>

          {/* Countdown (pre_24h only) */}
          {cycle.phase === "pre_24h" && (
            <div className="rounded-xl border border-amber-500/15 bg-gradient-to-b from-amber-500/5 to-transparent p-6 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
                <Timer className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Tempo decorrido</p>
              <p className="text-4xl font-bold text-foreground font-mono tabular-nums mt-1 tracking-tight">{countdown}</p>
              <p className="text-[11px] text-muted-foreground mt-3 max-w-xs leading-relaxed">
                Sem envio de mensagens. Entrada gradual em grupos em andamento.
              </p>
            </div>
          )}

          {/* ── Metrics ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: MessageSquare, label: "Budget Diário", color: "text-primary", bg: "bg-primary/8",
                value: cycle.daily_interaction_budget_used, max: cycle.daily_interaction_budget_target,
                suffix: null,
              },
              {
                icon: Shield, label: "Únicos Hoje", color: "text-emerald-400", bg: "bg-emerald-500/8",
                value: cycle.daily_unique_recipients_used, max: cycle.daily_unique_recipients_cap,
                suffix: null,
              },
            ].map((m, i) => (
              <div key={i} className="rounded-xl border border-border/20 bg-card p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", m.bg)}>
                    <m.icon className={cn("w-3 h-3", m.color)} />
                  </div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">{m.label}</span>
                </div>
                <p className="text-2xl font-extrabold tabular-nums text-foreground leading-none">
                  {m.value}
                  <span className="text-sm text-muted-foreground/40 font-normal">/{m.max}</span>
                </p>
                <div className="w-full h-1.5 bg-muted/20 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", m.color === "text-primary" ? "bg-primary" : "bg-emerald-400")}
                    style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}

            {/* Groups */}
            <div className="rounded-xl border border-border/20 bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-teal-500/8 flex items-center justify-center">
                  <Users className="w-3 h-3 text-teal-400" />
                </div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Grupos</span>
              </div>
              <div>
                <p className="text-2xl font-extrabold tabular-nums text-foreground leading-none">
                  {joinedGroups}
                  <span className="text-sm text-muted-foreground/40 font-normal"> entrou</span>
                </p>
                {pendingGroups > 0 && (
                  <p className="text-[10px] text-amber-400 mt-1.5 font-semibold flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                    {pendingGroups} pendente{pendingGroups > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Auto Save */}
            <div className="rounded-xl border border-border/20 bg-card p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/8 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Auto Save</span>
              </div>
              <p className="text-2xl font-extrabold tabular-nums text-foreground leading-none">
                {activeContacts}
                <span className="text-sm text-muted-foreground/40 font-normal"> contatos</span>
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] h-5 rounded-md font-semibold",
                  ["autosave_enabled", "community_enabled"].includes(cycle.phase)
                    ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5"
                    : "text-muted-foreground border-border/30"
                )}
              >
                {["autosave_enabled", "community_enabled"].includes(cycle.phase) ? "● Ativo" : "Bloqueado"}
              </Badge>
            </div>
          </div>

          {/* ── Auto Save alert ── */}
          {activeContacts === 0 && (
            <div className="rounded-xl border border-amber-500/15 bg-gradient-to-r from-amber-500/5 to-transparent p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">Sem contatos Auto Save</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Adicione contatos para habilitar essa camada.</p>
              </div>
              <Button size="sm" variant="outline" className="text-[11px] shrink-0 rounded-lg h-8 px-3 font-semibold" onClick={() => navigate("/dashboard/autosave")}>
                Adicionar
              </Button>
            </div>
          )}

          {/* ── Community ── */}
          <div className="rounded-xl border border-border/20 bg-card overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Globe className="w-4.5 h-4.5 text-purple-400" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-foreground">Comunidade</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {["autosave_enabled", "community_enabled", "completed"].includes(cycle.phase)
                      ? "Interação mútua entre contas do sistema"
                      : "Desbloqueada após fase Auto Save"}
                  </p>
                </div>
              </div>
              {["autosave_enabled", "community_enabled", "completed"].includes(cycle.phase) ? (
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    "text-[10px] font-semibold",
                    community?.is_enabled ? "text-purple-400" : "text-muted-foreground"
                  )}>
                    {community?.is_enabled ? "Ativa" : "Inativa"}
                  </span>
                  <Switch
                    checked={community?.is_enabled ?? false}
                    disabled={toggleCommunity.isPending}
                    onCheckedChange={(checked) => {
                      if (!deviceId) return;
                      toggleCommunity.mutate(
                        { deviceId, cycleId: cycle.id, enable: checked },
                        { onSuccess: () => toast({ title: checked ? "Comunidade habilitada" : "Comunidade desabilitada" }) }
                      );
                    }}
                  />
                </div>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground rounded-lg gap-1">
                  🔒 Bloqueado
                </Badge>
              )}
            </div>
          </div>

          {/* ── Encerrar ciclo ── */}
          {cycle.phase !== "completed" && (
            <div className="flex justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-[11px] text-destructive border-destructive/20 hover:bg-destructive/8 hover:border-destructive/30 rounded-lg h-8 px-3 font-semibold"
                onClick={() => setShowFinishConfirm(true)}
              >
                <Square className="w-3 h-3" /> Encerrar Ciclo
              </Button>
            </div>
          )}

          {/* Confirm dialog */}
          <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Encerrar ciclo?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Essa ação <strong className="text-foreground">não pode ser revertida</strong>.</p>
                <p>Todo o progresso será perdido.</p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowFinishConfirm(false)}>Cancelar</Button>
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleFinish} disabled={engine.isPending}>
                  {engine.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                  Encerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Audit Logs grouped by day ── */}
          <div className="rounded-xl border border-border/20 bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/15 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-muted/30 flex items-center justify-center">
                <ScrollText className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm font-bold text-foreground">Timeline do Aquecimento</span>
              {auditLogs.length > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 ml-auto rounded-md font-bold">
                  {auditLogs.length}
                </Badge>
              )}
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-10 text-center">
                <ScrollText className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground/50">Nenhum log registrado ainda</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {dayGroups.map(({ day, logs }) => (
                  <div key={day}>
                    {/* Day header */}
                    <div className="sticky top-0 z-10 px-5 py-2.5 bg-muted/20 backdrop-blur-sm border-b border-border/10 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-primary">{day}</span>
                      </div>
                      <span className="text-[11px] font-bold text-foreground">Dia {day}</span>
                      <span className="text-[10px] text-muted-foreground/50 ml-1">
                        {cycleStartedAt && format(
                          new Date(cycleStartedAt.getTime() + (day - 1) * 86400000),
                          "dd/MM",
                          { locale: ptBR }
                        )}
                      </span>
                      <Badge variant="outline" className="text-[8px] h-[16px] ml-auto rounded-md font-medium text-muted-foreground border-border/30">
                        {logs.length} {logs.length === 1 ? "evento" : "eventos"}
                      </Badge>
                    </div>
                    {/* Day logs */}
                    {logs.map((log, idx) => (
                      <div
                        key={log.id}
                        className={cn(
                          "px-5 py-3 flex items-start gap-3 hover:bg-muted/5 transition-colors",
                          idx !== logs.length - 1 && "border-b border-border/5"
                        )}
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5 shrink-0 ring-2",
                          log.level === "error"
                            ? "bg-destructive ring-destructive/20"
                            : log.level === "warn"
                              ? "bg-amber-400 ring-amber-400/20"
                              : "bg-teal-400 ring-teal-400/20"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[8px] h-[18px] rounded-md font-bold px-1.5",
                                log.level === "error"
                                  ? "text-destructive border-destructive/20"
                                  : log.level === "warn"
                                    ? "text-amber-400 border-amber-400/20"
                                    : "text-teal-400 border-teal-400/20"
                              )}
                            >
                              {log.event_type}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground/35 font-medium">
                              {format(new Date(log.created_at), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{log.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarmupInstanceDetail;
