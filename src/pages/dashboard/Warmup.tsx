import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Flame, Plus, Play, Pause, Trash2, Smartphone, Clock, MessageSquare, TrendingUp,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface WarmupSession {
  id: string;
  device: string;
  status: "running" | "paused" | "completed";
  messagesPerDay: number;
  currentDay: number;
  totalDays: number;
  messagesSent: number;
  startDate: string;
}

const initialSessions: WarmupSession[] = [
  { id: "1", device: "Chip 01 – Vendas", status: "running", messagesPerDay: 20, currentDay: 5, totalDays: 14, messagesSent: 85, startDate: "10 Feb 2026" },
  { id: "2", device: "Chip 02 – Suporte", status: "paused", messagesPerDay: 15, currentDay: 3, totalDays: 14, messagesSent: 38, startDate: "12 Feb 2026" },
];

const statusConfig = {
  running: { label: "Rodando", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  paused: { label: "Pausado", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  completed: { label: "Concluído", color: "bg-muted text-muted-foreground border-border" },
};

const Warmup = () => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<WarmupSession[]>(initialSessions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDevice, setFormDevice] = useState("");
  const [formMsgsPerDay, setFormMsgsPerDay] = useState("20");
  const [formTotalDays, setFormTotalDays] = useState("14");

  const handleCreate = () => {
    if (!formDevice) {
      toast({ title: "Selecione um dispositivo", variant: "destructive" });
      return;
    }
    setSessions(prev => [...prev, {
      id: crypto.randomUUID(),
      device: formDevice,
      status: "running",
      messagesPerDay: Number(formMsgsPerDay),
      currentDay: 1,
      totalDays: Number(formTotalDays),
      messagesSent: 0,
      startDate: new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }),
    }]);
    toast({ title: "Aquecimento iniciado" });
    setDialogOpen(false);
    setFormDevice("");
  };

  const toggleStatus = (id: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: s.status === "running" ? "paused" : "running" } : s));
  };

  const removeSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    toast({ title: "Sessão removida" });
  };

  const totalMessages = sessions.reduce((a, s) => a + s.messagesSent, 0);
  const activeCount = sessions.filter(s => s.status === "running").length;

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
          { label: "Média/Dia", value: sessions.length > 0 ? Math.round(totalMessages / Math.max(1, sessions.reduce((a, s) => a + s.currentDay, 0))) : 0, icon: TrendingUp, color: "text-blue-500" },
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
      {sessions.length === 0 ? (
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
            const progress = Math.round((session.currentDay / session.totalDays) * 100);
            const sc = statusConfig[session.status];
            return (
              <Card key={session.id} className="glass-card">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                        <Flame className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{session.device}</p>
                        <p className="text-xs text-muted-foreground">Iniciado em {session.startDate}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${sc.color}`}>{sc.label}</Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Dia {session.currentDay} de {session.totalDays}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageSquare className="w-3 h-3" />
                      <span>{session.messagesSent} mensagens enviadas</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{session.messagesPerDay} msgs/dia</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs flex-1"
                      onClick={() => toggleStatus(session.id)}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Sessão de Aquecimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Dispositivo *</Label>
              <Select value={formDevice} onValueChange={setFormDevice}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar dispositivo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Chip 01 – Vendas">Chip 01 – Vendas</SelectItem>
                  <SelectItem value="Chip 02 – Suporte">Chip 02 – Suporte</SelectItem>
                  <SelectItem value="Chip 03 – Marketing">Chip 03 – Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Mensagens por dia</Label>
                <Input value={formMsgsPerDay} onChange={e => setFormMsgsPerDay(e.target.value)} type="number" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duração (dias)</Label>
                <Input value={formTotalDays} onChange={e => setFormTotalDays(e.target.value)} type="number" className="h-9 text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90">Iniciar Aquecimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Warmup;
