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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  QrCode,
  RefreshCw,
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
} from "lucide-react";

const statusColors: Record<string, string> = {
  connected: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  connecting: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  disconnected: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  connected: "Conectado",
  connecting: "Conectando",
  disconnected: "Desconectado",
  error: "Erro",
};

const logIcons: Record<string, typeof Info> = {
  INFO: Info,
  WARN: AlertTriangle,
  ERROR: AlertTriangle,
};

const logColors: Record<string, string> = {
  INFO: "text-blue-400",
  WARN: "text-yellow-500",
  ERROR: "text-destructive",
};

type Group = { id: string; name: string; participantsCount?: number | null };

const ReportWhatsApp = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState("disconnected");
  const [connPhone, setConnPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null); // tracks which action is loading

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [frequency, setFrequency] = useState("1h");
  const [toggleCampaigns, setToggleCampaigns] = useState(true);
  const [toggleWarmup, setToggleWarmup] = useState(true);
  const [toggleInstances, setToggleInstances] = useState(true);
  const [alertDisconnect, setAlertDisconnect] = useState(true);
  const [alertCampaignEnd, setAlertCampaignEnd] = useState(true);
  const [alertHighFailures, setAlertHighFailures] = useState(false);

  // Devices query
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data } = await supabase.from("devices").select("id, name, number, status").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Invoke edge function helper
  const invoke = useCallback(async (action: string, body: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("report-wa", {
      body: { action, ...body },
    });
    if (error) throw new Error(error.message || "Erro na requisição");
    return data;
  }, []);

  // Poll status every 3s
  useEffect(() => {
    if (!user) return;
    const poll = async () => {
      try {
        const data = await invoke("status");
        setConnStatus(data.status || "disconnected");
        setConnPhone(data.connectedPhone || null);
        if (data.config) {
          if (data.config.group_id && !selectedGroup) {
            setSelectedGroup({ id: data.config.group_id, name: data.config.group_name || "" });
          }
          setFrequency(data.config.frequency || "1h");
          setToggleCampaigns(data.config.toggle_campaigns ?? true);
          setToggleWarmup(data.config.toggle_warmup ?? true);
          setToggleInstances(data.config.toggle_instances ?? true);
          setAlertDisconnect(data.config.alert_disconnect ?? true);
          setAlertCampaignEnd(data.config.alert_campaign_end ?? true);
          setAlertHighFailures(data.config.alert_high_failures ?? false);
          if (data.config.device_id) setSelectedDeviceId(data.config.device_id);
        }
      } catch { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [user, invoke, selectedGroup]);

  // Logs query with polling
  const { data: logs = [] } = useQuery({
    queryKey: ["report-wa-logs"],
    queryFn: async () => {
      const data = await invoke("logs");
      return data.logs || [];
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  // Actions
  const handleConnect = async () => {
    if (!selectedDeviceId) {
      toast({ title: "Selecione um dispositivo", variant: "destructive", duration: 2500 });
      return;
    }
    setLoading("connect");
    try {
      const data = await invoke("connect", { deviceId: selectedDeviceId });
      setQrCode(data.qrCodeDataUrl || null);
      if (!data.qrCodeDataUrl) toast({ title: "QR não disponível", description: "Tente atualizar.", variant: "destructive", duration: 2500 });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive", duration: 2500 });
    } finally {
      setLoading(null);
    }
  };

  const handleRefreshQr = async () => {
    setLoading("refresh");
    try {
      const data = await invoke("refresh-qr");
      setQrCode(data.qrCodeDataUrl || null);
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
        toast({ title: "Nenhum grupo encontrado", description: "Entre em um grupo com esse número e tente novamente.", duration: 2500 });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive", duration: 2500 });
    } finally {
      setLoading(null);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedGroup) {
      toast({ title: "Selecione um grupo", variant: "destructive", duration: 2500 });
      return;
    }
    setLoading("save");
    try {
      await invoke("config", {
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        frequency,
        toggleCampaigns,
        toggleWarmup,
        toggleInstances,
        alertDisconnect,
        alertCampaignEnd,
        alertHighFailures,
      });
      toast({ title: "Configuração salva", duration: 2500 });
      queryClient.invalidateQueries({ queryKey: ["report-wa-logs"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive", duration: 2500 });
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
      toast({ title: "Mensagem de teste enviada!", duration: 2500 });
      queryClient.invalidateQueries({ queryKey: ["report-wa-logs"] });
    } catch (err: any) {
      toast({ title: "Erro ao enviar teste", description: err.message, variant: "destructive", duration: 2500 });
    } finally {
      setLoading(null);
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const isConnected = connStatus === "connected";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Relatório via WhatsApp</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte seu WhatsApp e receba relatórios automáticos em um grupo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── SEÇÃO A: Conectar número ─── */}
        <Card className="border-border/50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                Conectar número de relatório
              </h2>
              <Badge variant="outline" className={`text-[10px] font-semibold ${statusColors[connStatus] || statusColors.disconnected}`}>
                {statusLabels[connStatus] || "Desconectado"}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              Conecte um WhatsApp exclusivo para receber relatórios em um grupo.
            </p>

            {/* Device selector */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Dispositivo</label>
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Selecione um dispositivo" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} {d.number ? `(${d.number})` : ""} — {d.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5" onClick={handleConnect} disabled={!!loading || !selectedDeviceId}>
                {loading === "connect" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                Gerar QR Code
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleRefreshQr} disabled={!!loading}>
                {loading === "refresh" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Atualizar QR
              </Button>
            </div>

            {/* QR Code display */}
            {qrCode && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCode} alt="QR Code" className="max-w-[220px]" />
              </div>
            )}

            {/* Connected info */}
            {isConnected && connPhone && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-foreground font-medium">{connPhone}</span>
              </div>
            )}

            {!isConnected && !qrCode && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                <WifiOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Nenhum número conectado</span>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 w-full"
              onClick={handleLoadGroups}
              disabled={!isConnected || !!loading}
            >
              {loading === "groups" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
              Carregar grupos
            </Button>
          </CardContent>
        </Card>

        {/* ─── SEÇÃO B: Selecionar grupo ─── */}
        <Card className="border-border/50">
          <CardContent className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Escolher grupo
            </h2>

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
              <div className="text-xs text-muted-foreground p-4 text-center border border-dashed border-border/30 rounded-lg">
                Entre no grupo com esse número e clique em "Carregar grupos".
              </div>
            ) : (
              <div className="max-h-[280px] overflow-y-auto space-y-1 pr-1">
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
                    <span className="font-medium">{g.name}</span>
                    {g.participantsCount != null && (
                      <span className="text-[10px] text-muted-foreground ml-2">
                        {g.participantsCount} membros
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedGroup && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">
                  Grupo selecionado: <strong>{selectedGroup.name}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── SEÇÃO C: Configurações ─── */}
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-5">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Configurações do relatório
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left col */}
            <div className="space-y-4">
              {/* Frequency */}
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

              {/* Content toggles */}
              <div className="space-y-3">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Conteúdo</span>
                <ToggleRow label="Campanhas" sublabel="Progresso, enviadas, falhas, pendentes" checked={toggleCampaigns} onChange={setToggleCampaigns} />
                <ToggleRow label="Aquecimento" sublabel="Dia, ações hoje, última atividade" checked={toggleWarmup} onChange={setToggleWarmup} />
                <ToggleRow label="Instâncias" sublabel="Online/offline, desconexões" checked={toggleInstances} onChange={setToggleInstances} />
              </div>
            </div>

            {/* Right col */}
            <div className="space-y-4">
              {/* Alert toggles */}
              <div className="space-y-3">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Alertas</span>
                <ToggleRow label="Alertar desconexão" checked={alertDisconnect} onChange={setAlertDisconnect} />
                <ToggleRow label="Alertar finalização/pausa de campanha" checked={alertCampaignEnd} onChange={setAlertCampaignEnd} />
                <ToggleRow label="Alertar falhas altas" checked={alertHighFailures} onChange={setAlertHighFailures} />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="gap-1.5" onClick={handleSaveConfig} disabled={!selectedGroup || !!loading}>
                  {loading === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar configuração
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={handleTest} disabled={!selectedGroup || !!loading}>
                  {loading === "test" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar teste no grupo
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Logs ─── */}
      <Card className="border-border/50">
        <CardContent className="p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Histórico</h2>

          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum log registrado.</p>
          ) : (
            <div className="max-h-[240px] overflow-y-auto space-y-1">
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

// Reusable toggle row
function ToggleRow({ label, sublabel, checked, onChange }: { label: string; sublabel?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default ReportWhatsApp;
