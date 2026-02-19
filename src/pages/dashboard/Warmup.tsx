import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Flame, Plus, Play, Pause, Trash2, Smartphone, Clock, MessageSquare, TrendingUp, Settings2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useWarmupSessions, useCreateWarmup, useUpdateWarmup, useDeleteWarmup } from "@/hooks/useWarmup";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

const statusConfig = {
  running: { label: "Rodando", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  paused: { label: "Pausado", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  completed: { label: "Concluído", color: "bg-muted text-muted-foreground border-border" },
};

const Warmup = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: sessions = [], isLoading } = useWarmupSessions();
  const createWarmup = useCreateWarmup();
  const updateWarmup = useUpdateWarmup();
  const deleteWarmup = useDeleteWarmup();

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

  const getDeviceName = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    return device ? `${device.name}${device.number ? ` (${device.number})` : ""}` : deviceId.slice(0, 8);
  };

  const totalMessages = sessions.reduce((a, s) => a + s.messages_sent_total, 0);
  const activeCount = sessions.filter(s => s.status === "running").length;
  const usedDeviceIds = new Set(sessions.map(s => s.device_id));

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Aquecimento Automático</h1>
          <p className="text-sm text-muted-foreground">Aqueça suas instâncias gradualmente para evitar bloqueios</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90" onClick={() => setDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Nova Sessão
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Sessões Ativas", value: activeCount, icon: Flame, color: "text-orange-500" },
          { label: "Total Sessões", value: sessions.length, icon: Smartphone, color: "text-primary" },
          { label: "Msgs Enviadas", value: totalMessages, icon: MessageSquare, color: "text-emerald-500" },
          { label: "Média/Dia", value: sessions.length > 0 ? Math.round(totalMessages / Math.max(1, sessions.reduce((a, s) => a + s.current_day, 0))) : 0, icon: TrendingUp, color: "text-blue-500" },
        ].map(s => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sessions */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="border border-border rounded-lg flex flex-col items-center justify-center py-20">
          <Flame className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhuma sessão de aquecimento ativa</p>
          <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90 gap-1.5">
            <Plus className="w-4 h-4" /> Nova Sessão
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map(session => {
            const progress = Math.round((session.current_day / session.total_days) * 100);
            const sc = statusConfig[session.status] || statusConfig.paused;
            const currentLimit = Math.min(
              session.messages_per_day + (session.current_day - 1) * session.daily_increment,
              session.max_messages_per_day
            );
            return (
              <Card key={session.id} className="glass-card">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Flame className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{getDeviceName(session.device_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          Limite hoje: {currentLimit} msgs | Delay: {session.min_delay_seconds}-{session.max_delay_seconds}s
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Dia {session.current_day} de {session.total_days}</span>
                      <span>{Math.min(progress, 100)}%</span>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageSquare className="w-3 h-3" />
                      <span>{session.messages_sent_total} total | {session.messages_sent_today} hoje</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{session.start_time} - {session.end_time}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs flex-1"
                      onClick={() => toggleStatus(session.id, session.status)}
                      disabled={session.status === "completed"}
                    >
                      {session.status === "running" ? <><Pause className="w-3 h-3" /> Pausar</> : <><Play className="w-3 h-3" /> Retomar</>}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => removeSession(session.id)}
                    >
                      <Trash2 className="w-3 h-3" /> Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

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

            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">📈 Como funciona o aquecimento gradual:</p>
              <p>• Dia 1: {formMsgsPerDay} mensagens</p>
              <p>• Dia 2: {Number(formMsgsPerDay) + Number(formIncrement)} mensagens</p>
              <p>• Dia 3: {Number(formMsgsPerDay) + 2 * Number(formIncrement)} mensagens</p>
              <p>• Máximo: {formMaxPerDay} mensagens/dia</p>
              <p>• Delay aleatório de {formMinDelay}s a {formMaxDelay}s entre cada envio</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createWarmup.isPending} className="bg-primary hover:bg-primary/90">
              {createWarmup.isPending ? "Criando..." : "Iniciar Aquecimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Warmup;
