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
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PROFILES, DURATION_OPTIONS, getPlanSummary, getSessionParams, type QualityProfile } from "@/lib/warmupMotor";


const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  running: { label: "Ativo", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  paused: { label: "Pausado", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", dot: "bg-amber-400" },
  completed: { label: "Concluído", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

const safetyLabels: Record<string, { label: string; color: string }> = {
  normal: { label: "Normal", color: "text-emerald-400" },
  alerta: { label: "Alerta", color: "text-amber-400" },
  recuo: { label: "Recuo", color: "text-red-400" },
};

const Warmup = () => {
  const { toast } = useToast();
  const { user } = useAuth();
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
      const { data, error } = await supabase.from("devices").select("id, name, status, number");
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
        toast({ title: "Aquecimento iniciado com Modo Humano!" });
        setDialogOpen(false);
        setFormDeviceId("");
      },
      onError: (err: any) => {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      },
    });
  };

  const toggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "running" ? "paused" : "running";
    updateWarmup.mutate({ id, status: newStatus } as any);
  };

  const removeSession = (id: string) => {
    deleteWarmup.mutate(id, {
      onSuccess: () => toast({ title: "Sessão removida" }),
    });
  };

  const executeNow = async (sessionId: string) => {
    setExecutingId(sessionId);
    try {
      const { data, error } = await supabase.functions.invoke("warmup-execute", {
        body: { sessionId, forceExecute: true },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (result?.status === "ok") {
        toast({ title: "Executado!", description: `${result.sent} ações realizadas` });
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
      onSuccess: () => { setNewMessage(""); toast({ title: "Mensagem adicionada!" }); },
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
    toast({ title: "20 mensagens padrão adicionadas!" });
  };

  const getDeviceName = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device ? device.name : deviceId.slice(0, 8);
  };

  const getDeviceNumber = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device?.number || null;
  };

  const totalActions = sessions.reduce((a, s) => a + s.messages_sent_total, 0);
  const activeCount = sessions.filter(s => s.status === "running").length;
  const usedDeviceIds = new Set(sessions.map(s => s.device_id));
  const todayActions = sessions.reduce((a, s) => a + s.messages_sent_today, 0);
  const errorCount = logs.filter(l => l.status === "error").length;

  const hasSessions = sessions.length > 0;
  const isMotorActive = activeCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">Aquecimento</h1>
              <Badge variant="outline" className="text-[9px] h-5 bg-primary/10 text-primary border-primary/30 font-medium">
                Modo Humano
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Automação com padrão orgânico e progressão controlada</p>
          </div>
        </div>
        {hasSessions && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Nova Sessão
          </Button>
        )}
      </div>

      {/* Motor status indicator */}
      <div className={cn(
        "flex items-center gap-2.5 px-4 py-2.5 rounded-lg border transition-colors duration-100",
        isMotorActive
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-muted/20 border-border/20"
      )}>
        <div className="relative flex items-center justify-center">
          <Radio className={cn("w-4 h-4", isMotorActive ? "text-emerald-400" : "text-muted-foreground/40")} />
          {isMotorActive && (
            <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400/30" style={{ animationDuration: "2s" }} />
          )}
        </div>
        <span className={cn("text-xs font-medium", isMotorActive ? "text-emerald-400" : "text-muted-foreground/60")}>
          {isMotorActive ? "Motor ativo" : "Nenhuma execução no momento"}
        </span>
        {isMotorActive && (
          <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">
            {activeCount} sessão{activeCount > 1 ? "ões" : ""} em execução
          </span>
        )}
      </div>

      {/* Stats (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Sessões Ativas", value: activeCount, icon: Activity, highlight: activeCount > 0 ? "emerald" as const : null },
          { label: "Execuções Hoje", value: todayActions, icon: Zap, highlight: todayActions > 0 ? "blue" as const : null },
          { label: "Total de Ações", value: totalActions, icon: MessageSquare, highlight: null },
          { label: "Erros", value: errorCount, icon: AlertTriangle, highlight: errorCount > 0 ? "red" as const : null },
        ].map(s => {
          const borderColor = s.highlight === "emerald"
            ? "border-emerald-500/30 shadow-emerald-500/5"
            : s.highlight === "red"
              ? "border-red-500/30 shadow-red-500/5"
              : s.highlight === "blue"
                ? "border-blue-500/20"
                : "border-border/15";
          const iconColor = s.highlight === "emerald"
            ? "text-emerald-400"
            : s.highlight === "red"
              ? "text-red-400"
              : s.highlight === "blue"
                ? "text-blue-400"
                : "text-muted-foreground/40";

          return (
            <Card
              key={s.label}
              className={cn(
                "overflow-hidden transition-shadow duration-100 hover:shadow-md group",
                borderColor,
                s.highlight && "shadow-lg"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <s.icon className={cn("w-4 h-4 transition-colors", iconColor)} />
                </div>
                <p className={cn(
                  "text-3xl font-bold tabular-nums leading-none tracking-tight",
                  s.highlight ? "text-foreground" : "text-muted-foreground/70"
                )}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mt-2">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="bg-transparent border-b border-border/20 rounded-none p-0 h-auto gap-0">
          {[
            { value: "sessions", label: "Sessões", icon: Flame },
            { value: "chart", label: "Evolução", icon: BarChart3 },
            { value: "logs", label: "Log", icon: ScrollText },
            { value: "messages", label: "Mensagens", icon: MessageSquare },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative gap-1.5 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-muted-foreground data-[state=active]:text-foreground transition-colors duration-100"
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="sessions">
          <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              ) : !hasSessions ? (
                /* Empty state */
                <Card className="border-dashed border-border/30">
                  <CardContent className="flex flex-col items-center justify-center py-20">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 flex items-center justify-center mb-5">
                      <Flame className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1">Nenhum aquecimento em execução</h3>
                    <p className="text-xs text-muted-foreground mb-6 text-center max-w-xs">
                      Crie uma sessão para iniciar um aquecimento com padrão humano.
                    </p>
                    <Button onClick={() => setDialogOpen(true)} className="gap-2">
                      <Sparkles className="w-4 h-4" /> Iniciar Novo Aquecimento
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                sessions.map(session => {
                  const progress = Math.round((session.current_day / session.total_days) * 100);
                  const sc = statusConfig[session.status] || statusConfig.paused;
                  const currentLimit = Math.min(
                    session.messages_per_day + (session.current_day - 1) * session.daily_increment,
                    session.max_messages_per_day
                  );
                  const isExecuting = executingId === session.id;
                  const isExpanded = expandedSession === session.id;
                  const dailyProgress = currentLimit > 0 ? Math.round((session.messages_sent_today / currentLimit) * 100) : 0;
                  const deviceNumber = getDeviceNumber(session.device_id);
                  const profileLabel = PROFILES[(session as any).quality_profile as QualityProfile]?.label || "—";
                  const safety = safetyLabels[(session as any).safety_state] || safetyLabels.normal;
                  const isRunning = session.status === "running";

                  return (
                    <Card
                      key={session.id}
                      className={cn(
                        "overflow-hidden transition-shadow duration-100 hover:shadow-lg",
                        isRunning ? "border-emerald-500/15 shadow-md" : "border-border/15"
                      )}
                    >
                      <CardContent className="p-0">
                        {/* === Identity area === */}
                        <div className="p-5 pb-4">
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                isRunning
                                  ? "bg-gradient-to-br from-orange-500/15 to-amber-500/10"
                                  : "bg-muted/20"
                              )}>
                                <Flame className={cn("w-5 h-5", isRunning ? "text-orange-500" : "text-muted-foreground/40")} />
                              </div>
                              {/* Pulsing dot for running */}
                              {isRunning && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border-2 border-card" />
                                </span>
                              )}
                              {!isRunning && (
                                <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card", sc.dot)} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-semibold text-foreground truncate">{getDeviceName(session.device_id)}</p>
                                <Badge variant="outline" className={cn("text-[9px] h-5 shrink-0", sc.color)}>{sc.label}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                {deviceNumber && <span className="font-mono text-muted-foreground/70">{deviceNumber}</span>}
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.start_time}–{session.end_time}</span>
                              </div>
                            </div>

                            <div className="hidden sm:flex items-center gap-5">
                              <div className="text-center">
                                <p className="text-xl font-bold text-foreground tabular-nums">{session.messages_sent_today}</p>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Hoje</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xl font-bold text-foreground tabular-nums">{session.messages_sent_total}</p>
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</p>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                            >
                              <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isExpanded && "rotate-180")} />
                            </Button>
                          </div>
                        </div>

                        {/* === Plan summary strip === */}
                        <div className="px-5 pb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-muted-foreground">Perfil:</span>
                              <Badge variant="outline" className="text-[9px] h-5 bg-primary/5 text-primary/80 border-primary/20">{profileLabel}</Badge>
                            </div>
                            <div className="w-px h-3 bg-border/20" />
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-muted-foreground">Duração:</span>
                              <span className="text-foreground font-medium">{session.total_days} dias</span>
                            </div>
                            <div className="w-px h-3 bg-border/20" />
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-muted-foreground">Estado:</span>
                              <span className={cn("flex items-center gap-1 font-medium", safety.color)}>
                                <Shield className="w-3 h-3" />{safety.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* === Progress bars === */}
                        <div className="px-5 pb-5">
                          <div className="grid grid-cols-2 gap-5">
                            {/* Daily progress */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Progresso de hoje</p>
                              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                                  style={{ width: `${Math.min(dailyProgress, 100)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-foreground/80 font-medium">
                                  {session.messages_sent_today} de {currentLimit} ações
                                </span>
                                <span className="text-[10px] text-muted-foreground tabular-nums">{Math.min(dailyProgress, 100)}%</span>
                              </div>
                            </div>

                            {/* Cycle progress */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Progresso do ciclo</p>
                              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-foreground/80 font-medium">
                                  Dia {session.current_day} de {session.total_days}
                                </span>
                                <span className="text-[10px] text-muted-foreground tabular-nums">{Math.min(progress, 100)}%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded actions */}
                          {isExpanded && (
                            <div className="overflow-hidden">
                              <div className="border-t border-border/10 bg-muted/5 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs flex-1"
                                    onClick={() => toggleStatus(session.id, session.status)}
                                    disabled={session.status === "completed"}
                                  >
                                    {session.status === "running" ? <><Pause className="w-3 h-3" /> Pausar</> : <><Play className="w-3 h-3" /> Retomar</>}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-xs flex-1"
                                    onClick={() => executeNow(session.id)}
                                    disabled={isExecuting || session.status !== "running"}
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
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
        </TabsContent>

        {/* ===== CHART TAB ===== */}
        <TabsContent value="chart">
          <div>
              <Card className="border-border/15 shadow-md">
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
          </div>
        </TabsContent>

        {/* ===== LOGS TAB ===== */}
        <TabsContent value="logs">
          <div>
              <Card className="border-border/15 shadow-md">
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
                        <div key={log.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/5 transition-colors">
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
          </div>
        </TabsContent>

        {/* ===== MESSAGES TAB ===== */}
        <TabsContent value="messages">
          <div>
              <Card className="border-border/15 shadow-md">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Mensagens para Aquecimento</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Mensagens aleatórias enviadas nos grupos. Quanto mais variadas, mais natural.
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
                        <div key={msg.id} className="flex items-center gap-2 group rounded-lg px-3 py-2 hover:bg-muted/10 transition-colors">
                          <MessageSquare className="w-3 h-3 text-muted-foreground/30 shrink-0" />
                          <span className="text-xs text-foreground/80 flex-1">{msg.content}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 transition-opacity"
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
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== CREATE DIALOG ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Nova Sessão de Aquecimento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
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
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-xs">Duração do aquecimento</Label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setFormDuration(d)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors duration-100",
                      formDuration === d
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/20 text-muted-foreground border-border/30 hover:bg-muted/40"
                    )}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Profile */}
            <div className="space-y-2">
              <Label className="text-xs">Qualidade / Estado do chip</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(PROFILES) as [QualityProfile, typeof PROFILES[QualityProfile]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setFormProfile(key)}
                    className={cn(
                      "rounded-lg border p-3 text-center transition-colors duration-100",
                      formProfile === key
                        ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                        : "bg-muted/10 border-border/30 hover:bg-muted/20"
                    )}
                  >
                    <p className={cn("text-sm font-semibold", formProfile === key ? "text-foreground" : "text-muted-foreground")}>{cfg.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{cfg.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Plan Summary */}
            <div className="rounded-xl border border-border/20 bg-muted/10 p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" /> Resumo do plano
              </p>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Perfil:</span>
                  <span className="ml-1 text-foreground font-medium">{planSummary.profile}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="ml-1 text-foreground font-medium">{planSummary.duration} dias</span>
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <p className="text-muted-foreground font-medium">Projeção (estimativa):</p>
                <p className="text-foreground">• Volume inicial/dia: {planSummary.volumeStart[0]}–{planSummary.volumeStart[1]}</p>
                <p className="text-foreground">• Volume final/dia: {planSummary.volumeEnd[0]}–{planSummary.volumeEnd[1]}</p>
                <p className="text-foreground">• Pico máximo/dia: {planSummary.peakMax[0]}–{planSummary.peakMax[1]}</p>
                <p className="text-foreground">• Total estimado: ~{planSummary.totalEstimated} ações</p>
              </div>

              <div className="space-y-1 text-[11px]">
                <p className="text-muted-foreground font-medium">Componentes do modo humano:</p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { label: "Conversas privadas", active: planSummary.components.privateChat },
                    { label: "Interações em grupos", active: planSummary.components.groupChat },
                    { label: "Status automático", active: planSummary.components.statusPost },
                    { label: "Resposta automática", active: planSummary.components.autoReply },
                  ].map(c => (
                    <span key={c.label} className={cn(
                      "flex items-center gap-1",
                      c.active ? "text-emerald-400" : "text-muted-foreground/50"
                    )}>
                      {c.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1 text-[11px]">
                <p className="text-muted-foreground font-medium">Proteções automáticas:</p>
                {planSummary.protections.map(p => (
                  <p key={p} className="text-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3 text-primary/60" /> {p}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createWarmup.isPending} className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {createWarmup.isPending ? "Iniciando..." : "Iniciar Aquecimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Warmup;
