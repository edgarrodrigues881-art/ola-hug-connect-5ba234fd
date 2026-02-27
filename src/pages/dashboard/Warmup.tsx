import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Flame, Plus, Play, Pause, Trash2, Smartphone, Clock, MessageSquare, TrendingUp, Settings2,
  Zap, X, Send, RefreshCw, BarChart3, ScrollText, CheckCircle2, XCircle, ChevronDown,
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

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  running: { label: "Ativo", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  paused: { label: "Pausado", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", dot: "bg-amber-400" },
  completed: { label: "Concluído", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
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
      const { data, error } = await supabase
        .from("devices")
        .select("id, name, status, number");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDeviceId, setFormDeviceId] = useState("");
  const [formMsgsPerDay, setFormMsgsPerDay] = useState("10");
  const [formIncrement, setFormIncrement] = useState("5");
  const [formMaxPerDay, setFormMaxPerDay] = useState("80");
  const [formTotalDays, setFormTotalDays] = useState("14");
  const [formMinDelay, setFormMinDelay] = useState("30");
  const [formMaxDelay, setFormMaxDelay] = useState("120");
  const [formStartTime, setFormStartTime] = useState("08:00");
  const [formEndTime, setFormEndTime] = useState("18:00");

  const [newMessage, setNewMessage] = useState("");
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const handleCreate = () => {
    if (!formDeviceId) {
      toast({ title: "Selecione um dispositivo", variant: "destructive" });
      return;
    }
    createWarmup.mutate({
      device_id: formDeviceId,
      messages_per_day: Number(formMsgsPerDay),
      daily_increment: Number(formIncrement),
      max_messages_per_day: Number(formMaxPerDay),
      total_days: Number(formTotalDays),
      min_delay_seconds: Number(formMinDelay),
      max_delay_seconds: Number(formMaxDelay),
      start_time: formStartTime,
      end_time: formEndTime,
    }, {
      onSuccess: () => {
        toast({ title: "Aquecimento iniciado!" });
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
        body: { sessionId },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (result?.status === "ok") {
        toast({ title: "Warmup executado!", description: `${result.sent} mensagens enviadas` });
      } else {
        toast({ title: "Warmup", description: result?.reason || "Nenhuma mensagem enviada", variant: "destructive" });
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

  const totalMessages = sessions.reduce((a, s) => a + s.messages_sent_total, 0);
  const activeCount = sessions.filter(s => s.status === "running").length;
  const usedDeviceIds = new Set(sessions.map(s => s.device_id));
  const todayMessages = sessions.reduce((a, s) => a + s.messages_sent_today, 0);
  const errorCount = logs.filter(l => l.status === "error").length;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            Aquecimento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Aqueça suas instâncias gradualmente para evitar bloqueios</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Nova Sessão
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Ativas", value: activeCount, icon: Flame, accent: "text-orange-500", bg: "from-orange-500/15 to-orange-500/5" },
          { label: "Sessões", value: sessions.length, icon: Smartphone, accent: "text-primary", bg: "from-primary/15 to-primary/5" },
          { label: "Hoje", value: todayMessages, icon: Zap, accent: "text-blue-400", bg: "from-blue-500/15 to-blue-500/5" },
          { label: "Total Enviadas", value: totalMessages, icon: MessageSquare, accent: "text-emerald-400", bg: "from-emerald-500/15 to-emerald-500/5" },
          { label: "Erros", value: errorCount, icon: XCircle, accent: "text-red-400", bg: "from-red-500/15 to-red-500/5" },
        ].map(s => (
          <Card key={s.label} className="glass-card border-border/20 overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", s.bg)}>
                <s.icon className={cn("w-4.5 h-4.5", s.accent)} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground tabular-nums">{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList className="bg-muted/30 border border-border/20">
          <TabsTrigger value="sessions" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <Flame className="w-3.5 h-3.5" /> Sessões
          </TabsTrigger>
          <TabsTrigger value="chart" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <BarChart3 className="w-3.5 h-3.5" /> Evolução
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <ScrollText className="w-3.5 h-3.5" /> Log de Envios
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-1.5 text-xs data-[state=active]:bg-background">
            <MessageSquare className="w-3.5 h-3.5" /> Mensagens
          </TabsTrigger>
        </TabsList>

        {/* ===== SESSIONS TAB ===== */}
        <TabsContent value="sessions" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <Card className="glass-card border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/5 flex items-center justify-center mb-4">
                  <Flame className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground mb-1">Nenhuma sessão de aquecimento</p>
                <p className="text-[11px] text-muted-foreground/60 mb-5">Crie uma sessão para começar a aquecer suas instâncias</p>
                <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Nova Sessão
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => {
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

                return (
                  <Card key={session.id} className="glass-card border-border/20 overflow-hidden">
                    <CardContent className="p-0">
                      {/* Main row */}
                      <div className="p-5">
                        <div className="flex items-center gap-4">
                          {/* Status indicator */}
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-500/5 flex items-center justify-center">
                              <Flame className={cn("w-6 h-6", session.status === "running" ? "text-orange-500" : "text-muted-foreground/50")} />
                            </div>
                            <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background", sc.dot)} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-foreground truncate">{getDeviceName(session.device_id)}</p>
                              <Badge variant="outline" className={cn("text-[9px] h-5 shrink-0", sc.color)}>{sc.label}</Badge>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              {deviceNumber && <span className="font-mono">{deviceNumber}</span>}
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.start_time}–{session.end_time}</span>
                              <span>Dia {session.current_day}/{session.total_days}</span>
                            </div>
                          </div>

                          {/* Right stats */}
                          <div className="hidden sm:flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-lg font-bold text-foreground tabular-nums">{session.messages_sent_today}</p>
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Hoje</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-foreground tabular-nums">{currentLimit}</p>
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Limite</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-foreground tabular-nums">{session.messages_sent_total}</p>
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</p>
                            </div>
                          </div>

                          {/* Expand */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                          >
                            <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                          </Button>
                        </div>

                        {/* Progress bars */}
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Progresso diário</span>
                              <span className="tabular-nums">{session.messages_sent_today}/{currentLimit}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                                style={{ width: `${Math.min(dailyProgress, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Ciclo geral</span>
                              <span className="tabular-nums">Dia {session.current_day}/{session.total_days}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t border-border/15 bg-muted/5 p-4 space-y-4">
                          {/* Config details */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: "Msgs/dia inicial", value: session.messages_per_day },
                              { label: "Incremento/dia", value: `+${session.daily_increment}` },
                              { label: "Máximo/dia", value: session.max_messages_per_day },
                              { label: "Delay", value: `${session.min_delay_seconds}–${session.max_delay_seconds}s` },
                            ].map(d => (
                              <div key={d.label} className="rounded-lg bg-background/50 border border-border/10 p-2.5 text-center">
                                <p className="text-sm font-semibold text-foreground">{d.value}</p>
                                <p className="text-[9px] text-muted-foreground mt-0.5">{d.label}</p>
                              </div>
                            ))}
                          </div>

                          {/* Actions */}
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
                              {isExecuting ? "Enviando..." : "Executar Agora"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => removeSession(session.id)}
                            >
                              <Trash2 className="w-3 h-3" /> Excluir
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== CHART TAB ===== */}
        <TabsContent value="chart" className="space-y-4">
          <Card className="glass-card border-border/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Evolução do Aquecimento</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Mensagens enviadas por dia</p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-muted-foreground">{dailyStats.length} dias</span>
                </div>
              </div>

              {dailyStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BarChart3 className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-xs text-muted-foreground">Nenhum dado disponível ainda</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Execute o aquecimento para ver o gráfico</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailyStats} barSize={28}>
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
                      formatter={(value: number) => [`${value} msgs`, "Enviadas"]}
                    />
                    <Bar dataKey="msgs" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== LOGS TAB ===== */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="glass-card border-border/20">
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="flex justify-center py-16">
                  <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ScrollText className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-xs text-muted-foreground">Nenhum log de envio ainda</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Os logs aparecerão aqui após as execuções</p>
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
                          {log.group_jid && <span>• {log.group_jid.split("@")[0]}</span>}
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

        {/* ===== MESSAGES TAB ===== */}
        <TabsContent value="messages" className="space-y-4">
          <Card className="glass-card border-border/20">
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

              {/* Add new message */}
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

              {/* Message list */}
              {warmupMessages.length === 0 ? (
                <div className="border border-dashed border-border/30 rounded-lg p-8 flex flex-col items-center gap-2 text-center">
                  <MessageSquare className="w-6 h-6 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Nenhuma mensagem cadastrada</p>
                  <p className="text-[10px] text-muted-foreground/60">Adicione mensagens ou carregue as mensagens padrão</p>
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
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Nova Sessão de Aquecimento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Dispositivo *</Label>
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

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Msgs/dia inicial</Label>
                <Input value={formMsgsPerDay} onChange={e => setFormMsgsPerDay(e.target.value)} type="number" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Incremento/dia</Label>
                <Input value={formIncrement} onChange={e => setFormIncrement(e.target.value)} type="number" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Máx msgs/dia</Label>
                <Input value={formMaxPerDay} onChange={e => setFormMaxPerDay(e.target.value)} type="number" className="h-9 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Duração (dias)</Label>
                <Input value={formTotalDays} onChange={e => setFormTotalDays(e.target.value)} type="number" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Delay entre msgs (seg)</Label>
                <div className="flex gap-1.5">
                  <Input value={formMinDelay} onChange={e => setFormMinDelay(e.target.value)} type="number" placeholder="Min" className="h-9 text-sm" />
                  <Input value={formMaxDelay} onChange={e => setFormMaxDelay(e.target.value)} type="number" placeholder="Max" className="h-9 text-sm" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Horário início</Label>
                <Input value={formStartTime} onChange={e => setFormStartTime(e.target.value)} type="time" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Horário fim</Label>
                <Input value={formEndTime} onChange={e => setFormEndTime(e.target.value)} type="time" className="h-9 text-sm" />
              </div>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground space-y-1.5 border border-border/10">
              <p className="font-medium text-foreground flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-primary" /> Simulação do aquecimento:</p>
              <p>• Dia 1: {formMsgsPerDay} mensagens</p>
              <p>• Dia 2: {Number(formMsgsPerDay) + Number(formIncrement)} mensagens</p>
              <p>• Dia 3: {Number(formMsgsPerDay) + 2 * Number(formIncrement)} mensagens</p>
              <p>• Máximo: {formMaxPerDay} mensagens/dia</p>
              <p>• Delay aleatório de {formMinDelay}s a {formMaxDelay}s entre cada envio</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createWarmup.isPending}>
              {createWarmup.isPending ? "Criando..." : "Iniciar Aquecimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Warmup;
