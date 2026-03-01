import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wifi,
  WifiOff,
  Search,
  Users,
  Send,
  Save,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Smartphone,
  ArrowRightLeft,
  Plug,
} from "lucide-react";

const statusConfig: Record<string, { label: string; class: string }> = {
  connected: { label: "Conectado", class: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  connecting: { label: "Sincronizando", class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  disconnected: { label: "Desconectado", class: "bg-muted/40 text-muted-foreground border-border" },
  error: { label: "Erro", class: "bg-destructive/15 text-destructive border-destructive/30" },
};

const logIcons: Record<string, typeof Info> = { INFO: Info, WARN: AlertTriangle, ERROR: AlertTriangle };
const logColors: Record<string, string> = { INFO: "text-blue-400", WARN: "text-yellow-500", ERROR: "text-destructive" };

type Group = { id: string; name: string; participantsCount?: number | null };

const ReportWhatsApp = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [connStatus, setConnStatus] = useState("disconnected");
  const [connPhone, setConnPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [configured, setConfigured] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSelection, setModalSelection] = useState<string>("");

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [frequency, setFrequency] = useState("1h");
  const [toggleCampaigns, setToggleCampaigns] = useState(true);
  const [toggleWarmup, setToggleWarmup] = useState(true);
  const [toggleInstances, setToggleInstances] = useState(true);
  const [alertDisconnect, setAlertDisconnect] = useState(true);
  const [alertHighFailures, setAlertHighFailures] = useState(false);

  // Devices
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data } = await supabase.from("devices").select("id, name, number, status").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  const invoke = useCallback(async (action: string, body: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("report-wa", { body: { action, ...body } });
    if (error) throw new Error(error.message || "Erro na requisição");
    return data;
  }, []);

  // Poll status
  useEffect(() => {
    if (!user) return;
    const poll = async () => {
      try {
        const data = await invoke("status");
        setConnStatus(data.status || "disconnected");
        setConnPhone(data.connectedPhone || null);
        if (data.config) {
          if (data.config.device_id) {
            setSelectedDeviceId(data.config.device_id);
            setConfigured(true);
          }
          if (data.config.group_id && !selectedGroup) {
            setSelectedGroup({ id: data.config.group_id, name: data.config.group_name || "" });
          }
          setFrequency(data.config.frequency || "1h");
          setToggleCampaigns(data.config.toggle_campaigns ?? true);
          setToggleWarmup(data.config.toggle_warmup ?? true);
          setToggleInstances(data.config.toggle_instances ?? true);
          setAlertDisconnect(data.config.alert_disconnect ?? true);
          setAlertHighFailures(data.config.alert_high_failures ?? false);
        }
      } catch { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [user, invoke, selectedGroup]);

  // Logs
  const { data: logs = [] } = useQuery({
    queryKey: ["report-wa-logs"],
    queryFn: async () => {
      const data = await invoke("logs");
      return data.logs || [];
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Confirm device selection from modal
  const handleConfirmDevice = async () => {
    if (!modalSelection) return;
    setLoading("connect");
    try {
      await invoke("connect", { deviceId: modalSelection });
      setSelectedDeviceId(modalSelection);
      setConfigured(true);
      setModalOpen(false);
      setModalSelection("");
      toast({ title: "Número de relatório vinculado", duration: 2500 });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive", duration: 2500 });
    } finally {
      setLoading(null);
    }
  };

  const handleConnect = async () => {
    if (!selectedDeviceId) return;
    setLoading("connect");
    try {
      await invoke("connect", { deviceId: selectedDeviceId });
      toast({ title: "Dispositivo reconectado", duration: 2500 });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive", duration: 2500 });
    } finally {
      setLoading(null);
    }
  };

  const handleLoadGroups = async () => {
    setLoading("groups");
    try {
      const data = await invoke("groups");
      setGroups(data.groups || []);
      if ((data.groups || []).length === 0) {
        toast({ title: "Nenhum grupo encontrado", duration: 2500 });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive", duration: 2500 });
    } finally {
      setLoading(null);
    }
  };

  const handleSaveConfig = async () => {
    if (!isConnected) {
      toast({ title: "Conecte o número primeiro", variant: "destructive", duration: 3000 });
      return;
    }
    if (!selectedGroup) {
      toast({ title: "Selecione um grupo", variant: "destructive", duration: 3000 });
      return;
    }
    setLoading("save");
    try {
      await invoke("config", {
        instanceId: selectedDeviceId,
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        frequency,
        toggleCampaigns,
        toggleWarmup,
        toggleInstances,
        alertDisconnect,
        alertCampaignEnd: false,
        alertHighFailures,
      });
      toast({ title: "Configuração salva", duration: 3000 });
      queryClient.invalidateQueries({ queryKey: ["report-wa-logs"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive", duration: 3000 });
    } finally {
      setLoading(null);
    }
  };

  const handleTest = async () => {
    if (!selectedGroup) {
      toast({ title: "Selecione um grupo", variant: "destructive", duration: 2500 });
      return;
    }
    setLoading("test");
    try {
      await invoke("test");
      toast({ title: "Teste enviado!", duration: 2500 });
      queryClient.invalidateQueries({ queryKey: ["report-wa-logs"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive", duration: 2500 });
    } finally {
      setLoading(null);
    }
  };

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(groupSearch.toLowerCase()));
  const isConnected = connStatus === "connected";
  const status = statusConfig[connStatus] || statusConfig.disconnected;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Relatório via WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Conecte um número e receba relatórios em um grupo.</p>
        </div>
        <Badge variant="outline" className={`text-xs font-semibold px-3 py-1 ${status.class}`}>
          {status.label}
        </Badge>
      </div>

      {/* ── CARD 1: Número de Relatório ── */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Smartphone className="w-4 h-4 text-primary" />
            Número de Relatório
          </h2>

          {!configured || !selectedDeviceId ? (
            <Button className="w-full gap-2" variant="outline" onClick={() => { setModalSelection(""); setModalOpen(true); }}>
              <Plug className="w-4 h-4" />
              Selecionar número de relatório
            </Button>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedDevice?.name || "Dispositivo"}</p>
                  <p className="text-xs text-muted-foreground">
                    {connPhone || selectedDevice?.number || "Sem número"}
                    <span className="ml-2">{isConnected ? "Online" : "Offline"}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleConnect} disabled={!!loading}>
                  {loading === "connect" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                  Conectar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground"
                  onClick={() => { setModalSelection(""); setModalOpen(true); }}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Trocar número
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal: Selecionar instância ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar número de relatório</DialogTitle>
            <DialogDescription>Escolha uma instância para receber os relatórios.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma instância disponível.</p>
            ) : (
              devices.map(d => (
                <button
                  key={d.id}
                  onClick={() => setModalSelection(d.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    modalSelection === d.id
                      ? "bg-primary/10 border border-primary/30 text-foreground"
                      : "hover:bg-muted/40 border border-transparent text-foreground"
                  }`}
                >
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.number || "Sem número"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      ["Connected", "Ready", "authenticated"].includes(d.status) ? "bg-emerald-400" : "bg-muted-foreground"
                    }`} />
                    {modalSelection === d.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleConfirmDevice} disabled={!modalSelection || loading === "connect"}>
              {loading === "connect" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CARD 2: Grupo de destino ── */}
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Grupo de destino
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleLoadGroups}
              disabled={!isConnected || !!loading}
            >
              {loading === "groups" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
              Carregar grupos
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar grupo..."
              value={groupSearch}
              onChange={e => setGroupSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {groups.length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center border border-dashed border-border/40 rounded-lg">
              {isConnected
                ? "Clique em \"Carregar grupos\" para listar."
                : "Conecte o número para listar os grupos."}
            </div>
          ) : (
            <div className="max-h-[240px] overflow-y-auto space-y-1">
              {filteredGroups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    selectedGroup?.id === g.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "hover:bg-muted/40 text-foreground border border-transparent"
                  }`}
                >
                  {g.name}
                  {g.participantsCount != null && (
                    <span className="text-[10px] text-muted-foreground ml-2">{g.participantsCount} membros</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedGroup && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">
                Grupo: <strong>{selectedGroup.name}</strong>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CARD 3: Configurações ── */}
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Configurações
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Frequência do resumo</label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10min">A cada 10 minutos</SelectItem>
                    <SelectItem value="30min">A cada 30 minutos</SelectItem>
                    <SelectItem value="1h">A cada 1 hora</SelectItem>
                    <SelectItem value="6h">A cada 6 horas</SelectItem>
                    <SelectItem value="1d">1x por dia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Conteúdo</span>
                <ToggleRow label="Campanhas" checked={toggleCampaigns} onChange={setToggleCampaigns} />
                <ToggleRow label="Aquecimento" checked={toggleWarmup} onChange={setToggleWarmup} />
                <ToggleRow label="Instâncias" checked={toggleInstances} onChange={setToggleInstances} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Alertas</span>
                <ToggleRow label="Alertar desconexão" checked={alertDisconnect} onChange={setAlertDisconnect} />
                <ToggleRow label="Alertar falhas altas" checked={alertHighFailures} onChange={setAlertHighFailures} />
              </div>

              <div className="flex gap-2 pt-3">
                <Button size="sm" className="gap-1.5" onClick={handleSaveConfig} disabled={!selectedGroup || !!loading}>
                  {loading === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar configuração
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleTest} disabled={!selectedGroup || !!loading}>
                  {loading === "test" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar teste
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Logs ── */}
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Histórico</h2>
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum log registrado.</p>
          ) : (
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {logs.map((log: any) => {
                const Icon = logIcons[log.level] || Info;
                const color = logColors[log.level] || "text-muted-foreground";
                return (
                  <div key={log.id} className="flex items-start gap-2 px-3 py-1.5 rounded text-xs hover:bg-muted/20">
                    <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${color}`} />
                    <span className="text-muted-foreground shrink-0 font-mono">
                      {new Date(log.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-foreground">{log.message}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-foreground">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default ReportWhatsApp;
