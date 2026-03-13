import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  useDeviceCycle,
  useInstanceGroups, useAutosaveContacts, useCommunityMembership,
  useWarmupAuditLogs, useWarmupPlans, useToggleCommunity, useToggleAutosave,
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
  CalendarDays, Target, UserPlus, Send, RotateCcw,
  FastForward, SkipForward, ChevronDown, ImageIcon,
} from "lucide-react";

const EVENT_TYPE_LABELS: Record<string, string> = {
  cycle_started: "Ciclo iniciado",
  cycle_paused: "Ciclo pausado",
  cycle_resumed: "Ciclo retomado",
  cycle_stopped: "Ciclo encerrado",
  group_joined: "Entrou no grupo",
  group_msg_sent: "Msg em grupo",
  group_interaction: "Interação grupo",
  autosave_interaction: "Auto Save",
  community_interaction: "Comunidade",
  daily_reset: "Reset diário",
  phase_transition: "Mudança de fase",
  health_check: "Verificação",
  enable_autosave: "Ativou Auto Save",
  enable_community: "Ativou Comunidade",
  join_group: "Entrada em grupo",
  error: "Erro",
};
function translateEventType(type: string) {
  return EVENT_TYPE_LABELS[type] || type.replace(/_/g, " ");
}
import { formatDistanceToNow, differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ── phase config ── */
const phaseConfig: Record<string, { label: string; color: string; icon: typeof Clock; step: number }> = {
  pre_24h:            { label: "Primeiras 24h",  color: "text-amber-400",           icon: Timer,        step: 1 },
  groups_only:        { label: "Grupos",          color: "text-teal-400",            icon: Users,        step: 2 },
  autosave_enabled:   { label: "Auto Save",       color: "text-emerald-400",         icon: MessageSquare, step: 3 },
  community_enabled:  { label: "Comunidade",      color: "text-purple-400",          icon: Globe,        step: 4 },
  community_light:    { label: "Comunidade Light", color: "text-purple-400",          icon: Globe,        step: 4 },
  completed:          { label: "Concluído",        color: "text-muted-foreground",    icon: CheckCircle2, step: 5 },
  paused:             { label: "Pausado",          color: "text-amber-400",           icon: Pause,        step: 0 },
  error:              { label: "Erro",             color: "text-destructive",         icon: AlertTriangle, step: 0 },
};

const phaseSteps = ["pre_24h", "groups_only", "autosave_enabled", "community_enabled", "completed"] as const;

/* ── Helper: autosave / community start day based on chip_state ── */
function getAutosaveStartDay(chipState: string): number {
  // Estável (new/recovered) = dia 5, Banido (unstable) = dia 7
  const groupsEnd = chipState === "unstable" ? 6 : 4;
  return groupsEnd + 1;
}
function getCommunityStartDay(chipState: string): number {
  const groupsEnd = chipState === "unstable" ? 6 : 4;
  return groupsEnd + 2;
}

/* ── component ── */
const WarmupInstanceDetail = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
  const toggleAutosave = useToggleAutosave();

  const { data: instanceGroups = [] } = useInstanceGroups(deviceId!);
  const { data: autosaveContacts = [] } = useAutosaveContacts();
  const { data: community } = useCommunityMembership(deviceId!);
  const { data: auditLogs = [] } = useWarmupAuditLogs(cycle?.id);
  const { data: plans = [] } = useWarmupPlans();

  // Fetch scheduled jobs for this cycle
  const { data: scheduledJobs = [] } = useQuery({
    queryKey: ["warmup_jobs_scheduled", cycle?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warmup_jobs")
        .select("id, job_type, status, run_at, payload")
        .eq("cycle_id", cycle!.id)
        .order("run_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!cycle?.id,
    refetchInterval: 30_000,
  });

  // statusToday removed — UAZAPI v2 does not support status posting

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
  const [daysTotal, setDaysTotal] = useState("7");
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showShortDaysWarning, setShowShortDaysWarning] = useState(false);
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);
  const [showAccelerateConfirm, setShowAccelerateConfirm] = useState(false);
  const [accelerating, setAccelerating] = useState(false);
  const [advancingPhase, setAdvancingPhase] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  // Auto-enable community when community day is reached
  useEffect(() => {
    if (!cycle || !deviceId || !user) return;
    const communityDay = getCommunityStartDay(cycle.chip_state || "new");
    if (cycle.day_index >= communityDay && community === null) {
      // No membership record yet — auto-enable
      toggleCommunity.mutate({ deviceId, cycleId: cycle.id, enable: true });
    }
  }, [cycle?.day_index, cycle?.chip_state, community, deviceId, user]);

  /* accelerate: set ALL pending jobs to run NOW */
  const handleAccelerate = async () => {
    if (!cycle?.id) return;
    setAccelerating(true);
    try {
      const now = new Date().toISOString();
      // Set all pending jobs for this cycle to run immediately
      const { data: updated, error } = await supabase
        .from("warmup_jobs")
        .update({ run_at: now })
        .eq("cycle_id", cycle.id)
        .eq("status", "pending")
        .select("id");
      if (error) throw error;

      const count = updated?.length || 0;
      if (count === 0) {
        toast({ title: "Nenhum job pendente", description: "Não há tarefas para acelerar." });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["warmup_jobs_scheduled", cycle.id] });

      toast({
        title: "⚡ Acelerado!",
        description: `${count} tarefa(s) serão executadas agora.`,
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setAccelerating(false);
    }
  };

  /* advance day: skip current day's jobs, move to next day (or complete if last day) */
  const handleAdvancePhase = async () => {
    if (!deviceId || !cycle) return;
    setAdvancingPhase(true);
    try {
      // Always read latest cycle from DB to avoid stale UI/cache
      const { data: latestCycle, error: latestErr } = await supabase
        .from("warmup_cycles")
        .select("id, phase, day_index, days_total, chip_state")
        .eq("id", cycle.id)
        .single();
      if (latestErr) throw latestErr;

      // If already completed, nothing to do
      if (latestCycle.phase === "completed") {
        toast({ title: "Ciclo já concluído", description: "Este ciclo já foi finalizado." });
        return;
      }

      const newDayIndex = (latestCycle.day_index || 1) + 1;
      const isLastDay = newDayIndex > (latestCycle.days_total || 30);
      const finalDayIndex = isLastDay ? latestCycle.days_total : newDayIndex;
      
      // Phase progression matching engine logic:
      // Day 1 = pre_24h, Days 2-4(new/recovered) or 2-7(unstable) = groups_only,
      // Next day = autosave_enabled, Then = community_enabled
      const chip = latestCycle.chip_state || "new";
      const groupsEndDay = chip === "unstable" ? 7 : 4;
      const getPhaseForDay = (day: number) => {
        if (day <= 1) return "pre_24h";
        if (day <= groupsEndDay) return "groups_only";
        if (day === groupsEndDay + 1) return "autosave_enabled";
        return "community_enabled";
      };
      const nextPhase = isLastDay ? "completed" : getPhaseForDay(finalDayIndex);

      // 1) Cancel ALL pending jobs (including daily_reset, phase_transition)
      // This prevents the old daily_reset from firing and advancing the day again
      await supabase
        .from("warmup_jobs")
        .update({ status: "cancelled", last_error: "Dia pulado manualmente" })
        .eq("cycle_id", cycle.id)
        .eq("status", "pending");

      // 2) Persist new day + phase
      const { error } = await supabase
        .from("warmup_cycles")
        .update({
          phase: nextPhase,
          previous_phase: latestCycle.phase,
          day_index: finalDayIndex,
          daily_interaction_budget_used: 0,
          daily_unique_recipients_used: 0,
          is_running: !isLastDay,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cycle.id);
      if (error) throw error;

      // 3) Schedule jobs for new day + new daily_reset for tomorrow
      if (!isLastDay) {
        // Schedule interaction jobs for today's remaining window (7-19 BRT)
        const { error: fnErr } = await supabase.functions.invoke("warmup-engine", {
          body: {
            action: "schedule_day",
            device_id: deviceId,
            cycle_id: cycle.id,
            day_index: finalDayIndex,
            phase: nextPhase,
            chip_state: latestCycle.chip_state || "new",
          },
        });
        if (fnErr) console.warn("schedule_day invoke error:", fnErr);

        // Schedule new daily_reset for tomorrow at 00:05 BRT (03:05 UTC)
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(3, 5, 0, 0);
        await supabase.from("warmup_jobs").insert({
          user_id: user!.id,
          device_id: deviceId,
          cycle_id: cycle.id,
          job_type: "daily_reset",
          payload: {},
          run_at: tomorrow.toISOString(),
          status: "pending",
        });
      }

      // 4) Audit log
      await supabase.from("warmup_audit_logs").insert({
        user_id: user!.id,
        device_id: deviceId,
        cycle_id: cycle.id,
        event_type: "manual_day_advance",
        level: "info",
        message: isLastDay
          ? `Ciclo concluído manualmente no dia ${latestCycle.day_index}`
          : `Dia pulado: ${latestCycle.day_index} → ${finalDayIndex} (fase: ${nextPhase})`,
        meta: { from_day: latestCycle.day_index, to_day: finalDayIndex, phase: nextPhase },
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["warmup_cycle_device", deviceId] }),
        queryClient.invalidateQueries({ queryKey: ["warmup_cycles"] }),
        queryClient.invalidateQueries({ queryKey: ["warmup_jobs_scheduled", cycle.id] }),
        queryClient.invalidateQueries({ queryKey: ["warmup_audit_logs", cycle.id] }),
      ]);

      toast({
        title: isLastDay ? "✅ Ciclo concluído!" : "🚀 Dia pulado!",
        description: isLastDay
          ? "O aquecimento foi finalizado."
          : `Avançou para dia ${finalDayIndex}/${latestCycle.days_total}`,
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setAdvancingPhase(false);
    }
  };

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

  // Count unique groups (deduplicate by group_id)
  const joinedGroupIds = new Set(instanceGroups.filter(g => g.join_status === "joined").map(g => g.group_id));
  const pendingGroupIds = new Set(instanceGroups.filter(g => g.join_status === "pending").map(g => g.group_id));
  const joinedGroups = joinedGroupIds.size;
  const pendingGroups = pendingGroupIds.size;
  const activeContacts = autosaveContacts.filter(c => c.is_active).length;
  const pc = cycle ? phaseConfig[cycle.phase] || phaseConfig.pre_24h : null;
  const isTerminalCycle = cycle ? ["completed", "error"].includes(cycle.phase) : false;

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
          {cycle && !isTerminalCycle && (
            <div className="px-5 pb-5 space-y-2">
              {cycle.is_running ? (
                <Button
                  className="w-full gap-2 h-10 rounded-xl bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20 font-semibold"
                  variant="ghost"
                  onClick={handlePause}
                >
                  <Pause className="w-4 h-4" /> Pausar aquecimento
                </Button>
              ) : cycle.phase === "paused" ? (
                <Button
                  className="w-full gap-2 h-10 rounded-xl bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20 font-semibold"
                  variant="ghost"
                  onClick={handleResume}
                >
                  <Play className="w-4 h-4" /> Retomar aquecimento
                </Button>
              ) : null}

              {/* Accelerate buttons */}
              {cycle.is_running && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="gap-1.5 h-9 rounded-xl text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/15 hover:text-amber-400 font-semibold"
                    onClick={() => setShowAccelerateConfirm(true)}
                    disabled={accelerating || scheduledJobs.filter(j => j.status === "pending").length === 0}
                  >
                    {accelerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FastForward className="w-3.5 h-3.5" />}
                    Executar Agora
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5 h-9 rounded-xl text-xs border-purple-500/30 text-purple-500 hover:bg-purple-500/15 hover:text-purple-400 font-semibold"
                    onClick={() => setShowAdvanceConfirm(true)}
                    disabled={advancingPhase || cycle.phase === "completed"}
                  >
                    {advancingPhase ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SkipForward className="w-3.5 h-3.5" />}
                    Pular Dia
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ WIZARD (no cycle) ═══════════ */}
      {(!cycle || isTerminalCycle) && !cycleLoading && (
        <div className="space-y-5">
          {/* chip state selector */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Estado do chip</p>
            <div className="grid grid-cols-3 gap-2.5">
              {([
                { value: "new" as const, label: "Chip Novo", desc: "Progressão conservadora", emoji: "🟢" },
                { value: "recovered" as const, label: "Chip Recuperado", desc: "Extra cauteloso, já sofreu ban", emoji: "🔴" },
                { value: "unstable" as const, label: "Chip Fraco", desc: "Sofre restrição facilmente", emoji: "🟡" },
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
                {[7, 14, 21, 30].map(d => (
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
            onClick={() => {
              if (Number(daysTotal) <= 7) {
                setShowShortDaysWarning(true);
              } else {
                handleStartWarmup();
              }
            }}
            disabled={!isConnected || engine.isPending}
          >
            {engine.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Flame className="w-4 h-4" />
            )}
            {isTerminalCycle ? "Começar Novo Aquecimento" : "Começar Aquecimento"}
          </Button>
          {!isConnected && (
            <p className="text-[11px] text-amber-400 text-center -mt-2">⚠ Conecte a instância primeiro para iniciar</p>
          )}
        </div>
      )}

      {/* Short days warning dialog */}
      <Dialog open={showShortDaysWarning} onOpenChange={setShowShortDaysWarning}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Duração curta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong className="text-foreground">7 dias não é o ideal para aquecimento.</strong></p>
            <p>Recomendamos no mínimo <strong className="text-foreground">14 dias</strong> para que o chip passe por todas as fases de forma segura e eficiente.</p>
            <p className="text-xs text-muted-foreground/60">Com apenas 7 dias, o chip pode não atingir maturidade suficiente para envios em massa.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowShortDaysWarning(false); setDaysTotal("14"); }}>
              Alterar para 14 dias
            </Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { setShowShortDaysWarning(false); handleStartWarmup(); }}>
              Iniciar com {daysTotal} dias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ ACTIVE CYCLE ═══════════ */}
      {cycle && !isTerminalCycle && (
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

          {/* ── Plano do Dia — O que vai acontecer hoje ── */}
          <div className="rounded-xl border border-border/20 bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border/15 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold text-foreground">Plano do Dia {cycle.day_index}</span>
                <p className="text-[10px] text-muted-foreground">O que está programado para hoje</p>
              </div>
              <Badge className="text-[9px] h-5 rounded-lg font-bold bg-primary/10 text-primary border-0 hover:bg-primary/10">
                {pc?.label}
              </Badge>
            </div>

            {/* Phase explanation */}
            <div className="px-5 py-4 border-b border-border/10">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {cycle.phase === "pre_24h" && (
                  <>
                    🛡️ <strong className="text-foreground">Fase de proteção inicial.</strong> Nenhuma mensagem será enviada. O chip ficará ocioso enquanto entra gradualmente nos 8 grupos oficiais do sistema para parecer um uso natural.
                  </>
                )}
                {(cycle.phase === "groups_only" || cycle.phase === "autosave_enabled" || cycle.phase === "community_enabled" || (cycle.phase as string) === "community_light") && (
                  <>
                    💬 <strong className="text-foreground">Fase de interação em grupos.</strong> O sistema enviará mensagens nos grupos que já ingressou e fará postagens de status, simulando participação natural com textos variados e delays aleatórios.
                  </>
                )}
                {cycle.phase === "completed" && (
                  <>
                    ✅ <strong className="text-foreground">Aquecimento concluído!</strong> O chip está pronto para uso em campanhas.
                  </>
                )}
                {cycle.phase === "paused" && (
                  <>
                    ⏸️ <strong className="text-foreground">Aquecimento pausado.</strong> {cycle.last_error || "Retome quando quiser continuar o processo."}
                  </>
                )}
              </p>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-4 divide-x divide-border/10">
              <div className="px-3 py-3.5 text-center group relative">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Msgs Hoje</p>
                <p className="text-lg font-extrabold tabular-nums text-foreground">
                  {cycle.daily_interaction_budget_used}
                  <span className="text-xs text-muted-foreground/40 font-normal">/{cycle.daily_interaction_budget_target}</span>
                </p>
                <p className="text-[8px] text-muted-foreground/60 mt-0.5">Enviadas / limite</p>
              </div>
              <div className="px-3 py-3.5 text-center group relative">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Destinos</p>
                <p className="text-lg font-extrabold tabular-nums text-foreground">
                  {cycle.daily_unique_recipients_used}
                  <span className="text-xs text-muted-foreground/40 font-normal">/{cycle.daily_unique_recipients_cap}</span>
                </p>
                <p className="text-[8px] text-muted-foreground/60 mt-0.5">Pessoas contactadas</p>
              </div>
              <div className="px-3 py-3.5 text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-1">Grupos</p>
                <p className="text-lg font-extrabold tabular-nums text-foreground">
                  {joinedGroups}
                  <span className="text-xs text-muted-foreground/40 font-normal">/8</span>
                </p>
                {pendingGroups > 0 ? (
                  <p className="text-[8px] text-amber-400 font-semibold mt-0.5">{pendingGroups} aguardando</p>
                ) : (
                  <p className="text-[8px] text-muted-foreground/60 mt-0.5">Ingressados</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Auto Save Toggle ── */}
          {(() => {
            const autosaveDay = getAutosaveStartDay(cycle.chip_state || "new");
            const isUnlockedAS = cycle.day_index >= autosaveDay;
            const isAutosavePhase = ["autosave_enabled", "community_enabled", "community_light"].includes(cycle.phase);
            const autosaveActive = isUnlockedAS && isAutosavePhase;

            return (
              <div className={cn(
                "rounded-xl border bg-card overflow-hidden transition-all",
                isUnlockedAS ? "border-emerald-500/30" : "border-border/20 opacity-60"
              )}>
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center",
                    isUnlockedAS ? "bg-emerald-500/10" : "bg-muted/20"
                  )}>
                    <MessageSquare className={cn("w-4 h-4", isUnlockedAS ? "text-emerald-400" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-sm font-bold", isUnlockedAS ? "text-foreground" : "text-muted-foreground")}>
                      Auto Save
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      {isUnlockedAS
                        ? autosaveActive
                          ? "Ativo — salvando contatos automaticamente"
                          : "Desativado"
                        : `🔒 Disponível a partir do Dia ${autosaveDay}`
                      }
                    </p>
                  </div>
                  <Switch
                    checked={autosaveActive}
                    disabled={!isUnlockedAS}
                    onCheckedChange={(checked) => {
                      toggleAutosave.mutate({
                        deviceId: deviceId!,
                        cycleId: cycle.id,
                        enable: checked,
                      });
                    }}
                  />
                </div>
                {!isUnlockedAS && (
                  <div className="px-5 pb-3">
                    <div className="flex items-center gap-2">
                      <Progress value={(cycle.day_index / autosaveDay) * 100} className="h-1.5 flex-1" />
                      <span className="text-[9px] text-muted-foreground font-mono">
                        Dia {cycle.day_index}/{autosaveDay}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Comunitário Toggle ── */}
          {(() => {
            const communityDay = getCommunityStartDay(cycle.chip_state || "new");
            const isUnlocked = cycle.day_index >= communityDay;
            const isCommunityPhase = ["community_enabled", "community_light"].includes(cycle.phase);
            const isEnabled = community?.is_enabled ?? false;

            // Auto-enable community on the first render of community day if not yet toggled
            const shouldAutoEnable = isUnlocked && !community && !isCommunityPhase;

            return (
              <div className={cn(
                "rounded-xl border bg-card overflow-hidden transition-all",
                isUnlocked ? "border-purple-500/30" : "border-border/20 opacity-60"
              )}>
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center",
                    isUnlocked ? "bg-purple-500/10" : "bg-muted/20"
                  )}>
                    <Globe className={cn("w-4 h-4", isUnlocked ? "text-purple-400" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-sm font-bold", isUnlocked ? "text-foreground" : "text-muted-foreground")}>
                      Comunitário
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      {isUnlocked
                        ? isEnabled || isCommunityPhase
                          ? "Ativo — trocando mensagens com outros chips do sistema"
                          : "Desativado — este chip não participa do comunitário"
                        : `🔒 Disponível a partir do Dia ${communityDay}`
                      }
                    </p>
                  </div>
                  <Switch
                    checked={isEnabled || isCommunityPhase || shouldAutoEnable}
                    disabled={!isUnlocked || toggleCommunity.isPending}
                    onCheckedChange={(checked) => {
                      toggleCommunity.mutate({
                        deviceId: deviceId!,
                        cycleId: cycle.id,
                        enable: checked,
                      });
                    }}
                  />
                </div>
                {!isUnlocked && (
                  <div className="px-5 pb-3">
                    <div className="flex items-center gap-2">
                      <Progress value={(cycle.day_index / communityDay) * 100} className="h-1.5 flex-1" />
                      <span className="text-[9px] text-muted-foreground font-mono">
                        Dia {cycle.day_index}/{communityDay}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {(() => {
            // Use São Paulo timezone day buckets to avoid client timezone drift
            const nowUtc = new Date();
            const toBrtDayKey = (date: Date) =>
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/Sao_Paulo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(date);
            const formatBrtTime = (date: Date) =>
              new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).format(date);

            const actionableTypes = new Set([
              "join_group",
              "group_interaction",
              "autosave_interaction",
              "community_interaction",
              "post_status",
            ]);

            const sortedJobs = [...scheduledJobs]
              .filter((j) => j.status !== "cancelled")
              .sort((a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime());

            const todayKey = toBrtDayKey(nowUtc);
            const todayJobs = sortedJobs.filter((j) => toBrtDayKey(new Date(j.run_at)) === todayKey);
            const futureJobs = sortedJobs.filter((j) => new Date(j.run_at) >= nowUtc);

            // If there is no job for "today" in BRT, show the next planned day
            let displayJobs = todayJobs;
            if (displayJobs.length === 0) {
              const nextPlannedJob = futureJobs.find((j) => actionableTypes.has(j.job_type)) ?? futureJobs[0];
              if (nextPlannedJob) {
                const nextDayKey = toBrtDayKey(new Date(nextPlannedJob.run_at));
                displayJobs = sortedJobs.filter((j) => toBrtDayKey(new Date(j.run_at)) === nextDayKey);
              }
            }

            const jobTypeLabels: Record<string, { label: string; icon: typeof Target; color: string }> = {
              join_group: { label: "Entrar no grupo", icon: UserPlus, color: "text-teal-400" },
              group_interaction: { label: "Mensagem em grupo", icon: Send, color: "text-primary" },
              autosave_interaction: { label: "Mensagem privada", icon: MessageSquare, color: "text-emerald-400" },
              community_interaction: { label: "Interação comunitária", icon: Globe, color: "text-purple-400" },
              post_status: { label: "Postar status", icon: ImageIcon, color: "text-pink-400" },
              phase_transition: { label: "Avançar fase", icon: Zap, color: "text-amber-400" },
              daily_reset: { label: "Reset diário", icon: RotateCcw, color: "text-muted-foreground" },
              health_check: { label: "Verificação de saúde", icon: Shield, color: "text-emerald-400" },
              enable_autosave: { label: "Ativar Auto Save", icon: Zap, color: "text-emerald-400" },
              enable_community: { label: "Ativar Comunidade", icon: Globe, color: "text-purple-400" },
            };

            const statusIcon = (status: string) => {
              if (status === "succeeded") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
              if (status === "running") return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
              if (status === "failed") return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
              if (status === "cancelled") return <Square className="w-3.5 h-3.5 text-muted-foreground/40" />;
              return <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />;
            };

            if (displayJobs.length === 0 && futureJobs.length === 0) return null;

            // Summarize displayed jobs by type
            const typeSummary: Record<string, { total: number; done: number; failed: number; next: Date | null }> = {};
            for (const job of displayJobs) {
              const key = job.job_type;
              if (!typeSummary[key]) typeSummary[key] = { total: 0, done: 0, failed: 0, next: null };
              if (job.status === "succeeded") {
                typeSummary[key].total++;
                typeSummary[key].done++;
              } else if (job.status === "failed") {
                typeSummary[key].total++;
                typeSummary[key].failed++;
              } else if (job.status === "pending") {
                const runAt = new Date(job.run_at);
                typeSummary[key].total++;
                if (!typeSummary[key].next || runAt < typeSummary[key].next!) {
                  typeSummary[key].next = runAt;
                }
              } else if (job.status === "running") {
                typeSummary[key].total++;
              }
            }

            // Cap group_interaction total to the daily budget target for consistency with "Msgs Hoje"
            if (cycle && typeSummary["group_interaction"]) {
              const budget = cycle.daily_interaction_budget_target;
              if (typeSummary["group_interaction"].total > budget) {
                typeSummary["group_interaction"].total = budget;
              }
            }

            const doneToday = cycle?.daily_interaction_budget_used ?? displayJobs.filter((j) => j.status === "succeeded").length;
            const failedToday = displayJobs.filter((j) => j.status === "failed").length;
            const totalDisplay = cycle?.daily_interaction_budget_target || Math.max(
              displayJobs.filter((j) => actionableTypes.has(j.job_type)).length,
              displayJobs.length,
            );
            const nextPendingJob =
              displayJobs.find((j) => j.status === "pending" && new Date(j.run_at) >= nowUtc) ||
              displayJobs.find((j) => j.status === "pending") ||
              null;

            return (
              <>
              {/* ── Progresso do Dia (compact) ── */}
              <div className="rounded-xl border border-border/20 bg-card overflow-hidden">
                <div className="px-5 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 flex items-center justify-center">
                    <Target className="w-4 h-4 text-teal-400" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-foreground">Progresso do Dia</span>
                    <p className="text-[10px] text-muted-foreground">
                      ✅ {doneToday} concluídas · ⏳ {Math.max(0, totalDisplay - doneToday - failedToday)} restantes{failedToday > 0 ? ` · ❌ ${failedToday} falhas` : ""}
                    </p>
                  </div>
                  {nextPendingJob && (
                    <div className="text-right">
                      <p className="text-[9px] text-muted-foreground uppercase">Próxima</p>
                      <p className="text-xs font-bold text-foreground font-mono">{formatBrtTime(new Date(nextPendingJob.run_at))}</p>
                    </div>
                  )}
                </div>
                <div className="px-5 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-foreground">{doneToday + failedToday}/{totalDisplay}</span>
                    <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${totalDisplay > 0 ? ((doneToday + failedToday) / totalDisplay) * 100 : 0}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{totalDisplay > 0 ? Math.round(((doneToday + failedToday) / totalDisplay) * 100) : 0}%</span>
                  </div>
                </div>
              </div>

              {/* ── Histórico de Dias ── */}
              <div className="rounded-xl border border-border/20 bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border/15 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-foreground">Histórico</span>
                    <p className="text-[10px] text-muted-foreground">
                      Dia {cycle.day_index} de {cycle.days_total}
                    </p>
                  </div>
                </div>
                <div className="px-5 py-3 space-y-1.5 max-h-[200px] overflow-y-auto">
                  {Array.from({ length: cycle.day_index }, (_, i) => {
                    const day = i + 1;
                    const isCurrent = day === cycle.day_index;
                    const isPast = day < cycle.day_index;
                    return (
                      <div key={day} className={cn(
                        "flex items-center gap-2.5 py-1 px-2 rounded-lg transition-colors",
                        isCurrent && "bg-primary/5"
                      )}>
                        {isPast ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                        )}
                        <span className={cn(
                          "text-xs font-medium",
                          isCurrent ? "text-primary font-bold" : "text-muted-foreground"
                        )}>
                          Dia {day}
                        </span>
                        <span className={cn(
                          "text-[10px] ml-auto",
                          isPast ? "text-emerald-500" : "text-primary"
                        )}>
                          {isPast ? "Concluído" : "Em andamento"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              </>
            );
          })()}


          {/* ── Erro do ciclo ── */}
          {cycle.last_error && (
            <div className="rounded-xl border border-destructive/15 bg-gradient-to-r from-destructive/5 to-transparent p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">Último erro</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{cycle.last_error}</p>
              </div>
            </div>
          )}

          {/* ── Encerrar ciclo ── */}
          {cycle.phase !== "completed" && (
            <div className="flex justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs rounded-lg h-9 px-4 font-medium border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setShowFinishConfirm(true)}
              >
                Encerrar Ciclo
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
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowFinishConfirm(false)}>Cancelar</Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleFinish}
                  disabled={engine.isPending}
                >
                  {engine.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Encerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Confirm advance day dialog */}
          <Dialog open={showAdvanceConfirm} onOpenChange={setShowAdvanceConfirm}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Pular dia?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Avançar o dia manualmente <strong className="text-foreground">cancela as tarefas pendentes do dia atual</strong> e agenda novas para o próximo dia.</p>
                <p>O aquecimento gradual existe para proteger seu número contra restrições e banimentos do WhatsApp.</p>
                {cycle && (
                  <p className="text-xs bg-muted/30 rounded-lg p-2.5 border border-border/30">
                    <span className="font-semibold text-foreground">Dia {cycle.day_index}</span>
                    <span className="mx-1.5">→</span>
                    <span className="font-semibold text-foreground">
                      {cycle.day_index + 1 > cycle.days_total ? "Concluído" : `Dia ${cycle.day_index + 1}`}
                    </span>
                    <span className="text-muted-foreground/60 ml-1">/ {cycle.days_total}</span>
                  </p>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAdvanceConfirm(false)}>Cancelar</Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                  onClick={() => { setShowAdvanceConfirm(false); handleAdvancePhase(); }}
                  disabled={advancingPhase}
                >
                  {advancingPhase && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <SkipForward className="w-3.5 h-3.5" />
                  Confirmar avanço
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Confirm accelerate dialog */}
          <Dialog open={showAccelerateConfirm} onOpenChange={setShowAccelerateConfirm}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Executar agora?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>O <strong className="text-foreground">primeiro job será executado imediatamente</strong>. Os demais manterão o espaçamento original entre si, apenas antecipados a partir de agora.</p>
                <p>Isso preserva o padrão natural de delays e protege seu chip.</p>
                <p className="text-xs bg-muted/30 rounded-lg p-2.5 border border-border/30">
                  <strong className="text-foreground">{scheduledJobs.filter(j => j.status === "pending").length}</strong> tarefa(s) pendente(s) serão aceleradas.
                </p>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAccelerateConfirm(false)}>Cancelar</Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                  onClick={() => { setShowAccelerateConfirm(false); handleAccelerate(); }}
                  disabled={accelerating}
                >
                  {accelerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <FastForward className="w-3.5 h-3.5" />
                  Confirmar execução
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      )}
    </div>
  );
};

export default WarmupInstanceDetail;
