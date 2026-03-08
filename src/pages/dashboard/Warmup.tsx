import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Flame, Plus, Play, Pause, Trash2, Clock, MessageSquare, TrendingUp,
  Zap, X, Send, RefreshCw, BarChart3, ScrollText, CheckCircle2, XCircle, ChevronDown,
  Shield, Activity, AlertTriangle, Sparkles, Radio,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useWarmupSessions, useCreateWarmup, useUpdateWarmup, useDeleteWarmup } from "@/hooks/useWarmup";
import { useWarmupMessages, useCreateWarmupMessage, useDeleteWarmupMessage } from "@/hooks/useWarmupMessages";
import { useWarmupLogs, useWarmupDailyStats } from "@/hooks/useWarmupLogs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { usePlanGate } from "@/hooks/usePlanGate";
import { PlanGateDialog } from "@/components/PlanGateDialog";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PROFILES, DURATION_OPTIONS, getPlanSummary, getSessionParams, type QualityProfile } from "@/lib/warmupMotor";

const profileBadge: Record<string, { label: string; class: string }> = {
  novo: { label: "Novo", class: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  estavel: { label: "Estável", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  recuperacao: { label: "Recuperação", class: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

const safetyBadge: Record<string, { label: string; class: string }> = {
  normal: { label: "Normal", class: "text-emerald-400" },
  alerta: { label: "Alerta", class: "text-amber-400" },
  recuo: { label: "Recuo", class: "text-red-400" },
};

const Warmup = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isBlocked, planState } = usePlanGate();
  const [planGateOpen, setPlanGateOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const { data: sessions = [], isLoading } = useWarmupSessions();
  const createWarmup = useCreateWarmup();
  const updateWarmup = useUpdateWarmup();
  const deleteWarmup = useDeleteWarmup();

  const { data: warmupMessages = [] } = useWarmupMessages();
  const createMessage = useCreateWarmupMessage();
  const deleteMessage = useDeleteWarmupMessage();

  const { data: logs = [], isLoading: logsLoading } = useWarmupLogs();
  const { data: dailyStats = [] } = useWarmupDailyStats();

  const { data: devices = [] } = useQuery({
    queryKey: ["devices-for-warmup", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("id, name, status, number").neq("login_type", "report_wa");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDeviceId, setFormDeviceId] = useState("");
  const [formDuration, setFormDuration] = useState<number>(14);
  const [formProfile, setFormProfile] = useState<QualityProfile>("novo");

  const [newMessage, setNewMessage] = useState("");
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("sessions");

  const planSummary = getPlanSummary(formDuration, formProfile);

  const handleCreate = () => {
    if (isBlocked) { setPlanGateOpen(true); return; }
    if (!formDeviceId) {
      toast({ title: "Selecione um dispositivo", variant: "destructive" });
      return;
    }
    const params = getSessionParams(formDuration, formProfile);
    createWarmup.mutate({
      device_id: formDeviceId,
      quality_profile: formProfile,
      ...params,
    }, {
      onSuccess: () => {
        toast({ title: "Sessão iniciada com sucesso" });
        setDialogOpen(false);
        setFormDeviceId("");
      },
      onError: (err: any) => {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      },
    });
  };

  const toggleStatus = (id: string, currentStatus: string) => {
    if (isBlocked) { setPlanGateOpen(true); return; }
    const newStatus = currentStatus === "running" ? "paused" : "running";
    updateWarmup.mutate({ id, status: newStatus } as any, {
      onSuccess: () => toast({ title: newStatus === "paused" ? "Sessão pausada" : "Sessão retomada" }),
    });
  };

  const removeSession = (id: string) => {
    deleteWarmup.mutate(id, {
      onSuccess: () => toast({ title: "Sessão removida" }),
    });
  };

  const executeNow = async (sessionId: string) => {
    if (isBlocked) { setPlanGateOpen(true); return; }
    setExecutingId(sessionId);
    try {
      const { data, error } = await supabase.functions.invoke("warmup-execute", {
        body: { sessionId, forceExecute: true },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (result?.status === "ok") {
        toast({ title: "Executado", description: `${result.sent} ações realizadas` });
      } else {
        toast({ title: "Info", description: result?.reason || "Nenhuma ação realizada", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setExecutingId(null);
    }
  };

  const handleAddMessage = () => {
    if (!newMessage.trim()) return;
    createMessage.mutate(newMessage.trim(), {
      onSuccess: () => { setNewMessage(""); toast({ title: "Mensagem adicionada" }); },
      onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
    });
  };

  const addDefaultMessages = () => {
    const defaults = [
      "Bom dia! 😊", "Boa tarde pessoal!", "Boa noite! 🌙",
      "Alguém sabe de alguma novidade?", "Como vocês estão?",
      "Valeu pessoal! 👍", "Ótima informação, obrigado!",
      "Concordo totalmente 👏", "Interessante isso!", "Show de bola! 🔥",
      "Boa semana a todos!", "Obrigado por compartilhar!",
      "Muito bom isso!", "Top demais 🚀", "Verdade!",
      "Com certeza!", "Excelente ponto!", "Parabéns pelo conteúdo 🎉",
      "Adorei essa dica!", "Muito útil, valeu!",
    ];
    defaults.forEach(msg => createMessage.mutate(msg));
    toast({ title: "20 mensagens padrão adicionadas" });
  };

  const getDeviceName = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device ? device.name : deviceId.slice(0, 8);
  };

  const getDeviceNumber = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device?.number || null;
  };

  // Computed
  const activeSessions = sessions.filter(s => s.status === "running");
  const pausedSessions = sessions.filter(s => s.status === "paused");
  const completedSessions = sessions.filter(s => s.status === "completed");
  const activeCount = activeSessions.length;
  const totalActions = sessions.reduce((a, s) => a + s.messages_sent_total, 0);
  const todayActions = sessions.reduce((a, s) => a + s.messages_sent_today, 0);
  const errorCount = logs.filter(l => l.status === "error").length;
  const usedDeviceIds = new Set(sessions.map(s => s.device_id));
  const hasSessions = sessions.length > 0;
  const isMotorActive = activeCount > 0;

  // Risk assessment helper
  const getRiskLevel = (session: any) => {
    const currentLimit = Math.min(
      session.messages_per_day + (session.current_day - 1) * session.daily_increment,
      session.max_messages_per_day
    );
    const usage = currentLimit > 0 ? session.messages_sent_today / currentLimit : 0;
    const safety = (session as any).safety_state;
    if (safety === "recuo") return { label: "Reduzir volume", class: "text-red-400", canIncrease: false };
    if (safety === "alerta") return { label: "Manter volume", class: "text-amber-400", canIncrease: false };
    if (usage > 0.9) return { label: "Manter volume", class: "text-amber-400", canIncrease: false };
    return { label: "Pode aumentar", class: "text-emerald-400", canIncrease: true };
  };

  const renderSessionCard = (session: any) => {
    const progress = Math.round((session.current_day / session.total_days) * 100);
    const currentLimit = Math.min(
      session.messages_per_day + (session.current_day - 1) * session.daily_increment,
      session.max_messages_per_day
    );
    const isExecuting = executingId === session.id;
    const isExpanded = expandedSession === session.id;
    const dailyProgress = currentLimit > 0 ? Math.round((session.messages_sent_today / currentLimit) * 100) : 0;
    const deviceNumber = getDeviceNumber(session.device_id);
    const profile = profileBadge[(session as any).quality_profile] || profileBadge.novo;
    const safety = safetyBadge[(session as any).safety_state] || safetyBadge.normal;
    const risk = getRiskLevel(session);
    const isRunning = session.status === "running";
    const isCompleted = session.status === "completed";

    return (
      <Card
        key={session.id}
        className={cn(
          "overflow-hidden",
          isRunning ? "border-emerald-500/15" : "border-border/15"
        )}
      >
        <CardContent className="p-0">
          {/* Main info row */}
          <div className="p-4 pb-3">
            <div className="flex items-start gap-3">
              {/* Status dot */}
              <div className="mt-1 shrink-0">
                <div className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  isRunning ? "bg-emerald-400" : isCompleted ? "bg-muted-foreground/30" : "bg-amber-400"
                )} />
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground truncate">{getDeviceName(session.device_id)}</p>
                  <Badge variant="outline" className={cn("text-[9px] h-5 shrink-0", profile.class)}>{profile.label}</Badge>
                </div>
                {deviceNumber && (
                  <p className="text-[11px] font-mono text-muted-foreground/60">{deviceNumber}</p>
                )}
              </div>

              {/* Key metrics - visible at a glance */}
              <div className="hidden sm:grid grid-cols-3 gap-4 text-center shrink-0">
                <div>
                  <p className="text-lg font-bold text-foreground tabular-nums leading-none">{session.current_day}<span className="text-xs font-normal text-muted-foreground">/{session.total_days}</span></p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Dia</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground tabular-nums leading-none">{currentLimit}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Limite/dia</p>
                </div>
                <div>
                  <p className={cn("text-lg font-bold tabular-nums leading-none", risk.class)}>{session.messages_sent_today}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">Enviados</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setExpandedSession(isExpanded ? null : session.id)}
              >
                <ChevronDown className={cn("w-4 h-4", isExpanded && "rotate-180")} />
              </Button>
            </div>
          </div>

          {/* Progress + recommendation bar */}
          <div className="px-4 pb-3">
            {/* Cycle progress */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    isCompleted ? "bg-muted-foreground/30" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{progress}%</span>
            </div>

            {/* Recommendation line */}
            {!isCompleted && (
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-muted-foreground">
                    <Clock className="w-3 h-3 inline mr-1" />{session.start_time}–{session.end_time}
                  </span>
                  <span className={cn("font-medium", safety.class)}>
                    <Shield className="w-3 h-3 inline mr-1" />{safety.label}
                  </span>
                </div>
                <span className={cn("text-[11px] font-medium", risk.class)}>
                  {risk.label}
                </span>
              </div>
            )}
          </div>

          {/* SM: mobile key metrics */}
          <div className="sm:hidden px-4 pb-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/10 rounded-md py-1.5">
                <p className="text-sm font-bold text-foreground tabular-nums">{session.current_day}/{session.total_days}</p>
                <p className="text-[9px] text-muted-foreground">Dia</p>
              </div>
              <div className="bg-muted/10 rounded-md py-1.5">
                <p className="text-sm font-bold text-foreground tabular-nums">{currentLimit}</p>
                <p className="text-[9px] text-muted-foreground">Limite</p>
              </div>
              <div className="bg-muted/10 rounded-md py-1.5">
                <p className={cn("text-sm font-bold tabular-nums", risk.class)}>{session.messages_sent_today}</p>
                <p className="text-[9px] text-muted-foreground">Enviados</p>
              </div>
            </div>
          </div>

          {/* Expanded details + actions */}
          {isExpanded && (
            <div className="border-t border-border/10 bg-muted/5 p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Total enviados:</span>
                  <span className="ml-1 text-foreground font-medium">{session.messages_sent_total}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Incremento/dia:</span>
                  <span className="ml-1 text-foreground font-medium">+{session.daily_increment}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Delay:</span>
                  <span className="ml-1 text-foreground font-medium">{session.min_delay_seconds}–{session.max_delay_seconds}s</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Máximo/dia:</span>
                  <span className="ml-1 text-foreground font-medium">{session.max_messages_per_day}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs flex-1"
                  onClick={() => toggleStatus(session.id, session.status)}
                  disabled={isCompleted}
                >
                  {isRunning ? <><Pause className="w-3 h-3" /> Pausar</> : <><Play className="w-3 h-3" /> Retomar</>}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs flex-1"
                  onClick={() => executeNow(session.id)}
                  disabled={isExecuting || !isRunning}
                >
                  {isExecuting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  {isExecuting ? "Executando..." : "Executar Agora"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => removeSession(session.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Warning popup */}
      <Dialog open={showWarning} onOpenChange={(open) => {
        if (!open) {
          setShowWarning(false);
          sessionStorage.setItem("warmup-warning-dismissed", "true");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Aviso importante
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Evite colocar números que estão caindo ou sendo restringidos pelo WhatsApp.</strong>
            </p>
            <p>
              O aquecimento é um processo gradual para fortalecer chips saudáveis. Números que já estão sendo banidos ou restringidos têm grandes chances de serem bloqueados permanentemente durante o processo.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Recomendamos usar chips novos ou estáveis para melhores resultados.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setShowWarning(false);
              sessionStorage.setItem("warmup-warning-dismissed", "true");
            }}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">Aquecimento</h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Controle de progressão e segurança dos chips</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs self-start sm:self-auto" onClick={() => setDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Iniciar Novo
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
        {[
          { label: "Ativas", value: activeCount, color: activeCount > 0 ? "text-emerald-400" : "text-muted-foreground/50" },
          { label: "Pausadas", value: pausedSessions.length, color: pausedSessions.length > 0 ? "text-amber-400" : "text-muted-foreground/50" },
          { label: "Concluídas", value: completedSessions.length, color: "text-muted-foreground/50" },
          { label: "Envios hoje", value: todayActions, color: todayActions > 0 ? "text-foreground" : "text-muted-foreground/50" },
          { label: "Erros", value: errorCount, color: errorCount > 0 ? "text-red-400" : "text-muted-foreground/50" },
        ].map(s => (
          <Card key={s.label} className="border-border/15">
            <CardContent className="p-3 sm:p-4">
              <p className={cn("text-xl sm:text-2xl font-bold tabular-nums leading-none", s.color)}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium mt-1 sm:mt-1.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="bg-transparent border-b border-border/20 rounded-none p-0 h-auto gap-0 w-max sm:w-full">
            {[
              { value: "sessions", label: "Sessões", icon: Flame },
              { value: "chart", label: "Evolução", icon: BarChart3 },
              { value: "logs", label: "Log", icon: ScrollText },
              { value: "messages", label: "Msgs", icon: MessageSquare },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative gap-1 sm:gap-1.5 text-[11px] sm:text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 py-2 sm:py-2.5 text-muted-foreground data-[state=active]:text-foreground"
              >
                <tab.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="sessions" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : !hasSessions ? (
            <Card className="border-dashed border-border/30">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Flame className="w-10 h-10 text-muted-foreground/20 mb-4" />
                <h3 className="text-sm font-semibold text-foreground mb-1">Nenhum aquecimento</h3>
                <p className="text-xs text-muted-foreground mb-5 text-center max-w-xs">
                  Crie uma sessão para iniciar o aquecimento controlado de um chip.
                </p>
                <Button onClick={() => setDialogOpen(true)} className="gap-2 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Iniciar Novo Aquecimento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {/* Active sessions */}
              {activeSessions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/80 px-1">
                    Ativas ({activeSessions.length})
                  </p>
                  <div className="space-y-2">
                    {activeSessions.map(renderSessionCard)}
                  </div>
                </div>
              )}

              {/* Paused sessions */}
              {pausedSessions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/80 px-1">
                    Pausadas ({pausedSessions.length})
                  </p>
                  <div className="space-y-2">
                    {pausedSessions.map(renderSessionCard)}
                  </div>
                </div>
              )}

              {/* Completed sessions */}
              {completedSessions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-1">
                    Concluídas ({completedSessions.length})
                  </p>
                  <div className="space-y-2">
                    {completedSessions.map(renderSessionCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Chart tab */}
        <TabsContent value="chart" className="mt-4">
          <Card className="border-border/15">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Evolução do Aquecimento</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Ações realizadas por dia</p>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" /> {dailyStats.length} dias
                </span>
              </div>

              {dailyStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BarChart3 className="w-10 h-10 text-muted-foreground/20 mb-3" />
                  <p className="text-xs text-muted-foreground">Nenhum dado disponível ainda</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailyStats} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.15)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                      formatter={(value: number) => [`${value} ações`, "Realizadas"]}
                    />
                    <Bar dataKey="msgs" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs tab */}
        <TabsContent value="logs" className="mt-4">
          <Card className="border-border/15">
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="flex justify-center py-16">
                  <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ScrollText className="w-10 h-10 text-muted-foreground/20 mb-3" />
                  <p className="text-xs text-muted-foreground">Nenhum log de envio ainda</p>
                </div>
              ) : (
                <div className="divide-y divide-border/10 max-h-[500px] overflow-y-auto">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/5">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                        log.status === "sent" ? "bg-emerald-500/10" : "bg-red-500/10"
                      )}>
                        {log.status === "sent"
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          : <XCircle className="w-3.5 h-3.5 text-red-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground/90 line-clamp-1">{log.message_content}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span>{getDeviceName(log.device_id)}</span>
                          {log.group_name && <span>• {log.group_name}</span>}
                          {log.group_jid && !log.group_name && <span>• {log.group_jid.split("@")[0]}</span>}
                          {log.error_message && <span className="text-red-400">• {log.error_message}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums shrink-0">
                        {format(new Date(log.created_at), "dd/MM HH:mm")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages tab */}
        <TabsContent value="messages" className="mt-4">
          <Card className="border-border/15">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Mensagens para Aquecimento</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Mensagens aleatórias enviadas nos grupos.
                  </p>
                </div>
                {warmupMessages.length === 0 && (
                  <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={addDefaultMessages}>
                    <Zap className="w-3 h-3" /> Carregar padrão
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite uma mensagem de aquecimento..."
                  className="h-9 text-xs bg-background/50 border-border/30 flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleAddMessage()}
                />
                <Button size="sm" className="h-9 text-xs gap-1 shrink-0" onClick={handleAddMessage} disabled={!newMessage.trim()}>
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </div>

              {warmupMessages.length === 0 ? (
                <div className="border border-dashed border-border/30 rounded-lg p-8 flex flex-col items-center gap-2 text-center">
                  <MessageSquare className="w-6 h-6 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">Nenhuma mensagem cadastrada</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {warmupMessages.map(msg => (
                    <div key={msg.id} className="flex items-center gap-2 group rounded-lg px-3 py-2 hover:bg-muted/10">
                      <MessageSquare className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                      <span className="text-xs text-foreground/80 flex-1">{msg.content}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteMessage.mutate(msg.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-[10px] text-muted-foreground/50 pt-2 border-t border-border/15 flex items-center justify-between">
                <span>{warmupMessages.length} mensagens cadastradas</span>
                {warmupMessages.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-[10px] h-6 text-muted-foreground/50 hover:text-foreground" onClick={addDefaultMessages}>
                    <Plus className="w-2.5 h-2.5 mr-1" /> Adicionar padrão
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Nova Sessão de Aquecimento</DialogTitle>
            <p className="text-xs text-muted-foreground">Escolha o cenário. Os limites são aplicados automaticamente.</p>
          </DialogHeader>
          <div className="space-y-5 py-1">
            {/* Device select */}
            <div className="space-y-1.5">
              <Label className="text-xs">Dispositivo</Label>
              <Select value={formDeviceId} onValueChange={setFormDeviceId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar dispositivo" /></SelectTrigger>
                <SelectContent>
                  {devices.filter(d => !usedDeviceIds.has(d.id)).map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} {d.number ? `(${d.number})` : ""} — {d.status}
                    </SelectItem>
                  ))}
                  {devices.filter(d => !usedDeviceIds.has(d.id)).length === 0 && (
                    <SelectItem value="none" disabled>Nenhum dispositivo disponível</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {/* Disconnected chip warning */}
              {formDeviceId && (() => {
                const selectedDevice = devices.find(d => d.id === formDeviceId);
                const isDisconnected = selectedDevice && selectedDevice.status !== "Connected";
                return isDisconnected ? (
                  <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-md px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Este chip não está conectado. Conecte antes de iniciar o aquecimento.</span>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-xs">Duração do ciclo</Label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setFormDuration(d)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-medium border",
                      formDuration === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/20 text-muted-foreground border-border/30 hover:bg-muted/40"
                    )}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Profile — enriched cards */}
            <div className="space-y-2">
              <Label className="text-xs">Estado do chip</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(PROFILES) as [QualityProfile, typeof PROFILES[QualityProfile]][]).map(([key, cfg]) => {
                  const selected = formProfile === key;
                  const riskLabel = key === "novo" ? "Médio" : key === "estavel" ? "Baixo" : "Alto";
                  const riskColor = key === "novo" ? "text-amber-400" : key === "estavel" ? "text-emerald-400" : "text-red-400";
                  const riskBg = key === "novo" ? "bg-amber-500/10" : key === "estavel" ? "bg-emerald-500/10" : "bg-red-500/10";
                  const startVol = `${cfg.baseVolumeStart[0]}–${cfg.baseVolumeStart[1]}`;
                  const maxVol = `${cfg.peakMax[0]}–${cfg.peakMax[1]}`;

                  return (
                    <button
                      key={key}
                      onClick={() => setFormProfile(key)}
                      className={cn(
                        "rounded-lg border p-3 text-left space-y-2",
                        selected
                          ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                          : "bg-muted/10 border-border/30 hover:bg-muted/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className={cn("text-sm font-semibold", selected ? "text-foreground" : "text-muted-foreground")}>{cfg.label}</p>
                        <Badge variant="outline" className={cn("text-[8px] h-4 px-1.5 border-0", riskBg, riskColor)}>
                          {riskLabel}
                        </Badge>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-muted-foreground">Início: <span className="text-foreground font-medium">{startVol}/dia</span></p>
                        <p className="text-[10px] text-muted-foreground">Máximo: <span className="text-foreground font-medium">{maxVol}/dia</span></p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Computed plan summary — compact */}
            <div className="rounded-lg border border-border/20 bg-muted/5 p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Plano automático</p>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Início", value: `${planSummary.volumeStart[0]}–${planSummary.volumeStart[1]}` },
                  { label: "Final", value: `${planSummary.volumeEnd[0]}–${planSummary.volumeEnd[1]}` },
                  { label: "Pico", value: `${planSummary.peakMax[0]}–${planSummary.peakMax[1]}` },
                  { label: "Total est.", value: `~${planSummary.totalEstimated}` },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-sm font-bold text-foreground tabular-nums leading-none">{s.value}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Limites, delays e pausas são aplicados automaticamente
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleCreate}
              disabled={createWarmup.isPending || !formDeviceId}
              className="gap-1.5"
            >
              <Flame className="w-3.5 h-3.5" />
              {createWarmup.isPending ? "Iniciando..." : "Iniciar Aquecimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PlanGateDialog open={planGateOpen} onOpenChange={setPlanGateOpen} planState={planState} />
    </div>
  );
};

export default Warmup;
