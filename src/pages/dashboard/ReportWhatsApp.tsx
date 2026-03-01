import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Wifi,
  WifiOff,
  Search,
  Users,
  Send,
  Save,
  CheckCircle2,
  Loader2,
  Smartphone,
  ArrowRightLeft,
  Plug,
  Circle,
  QrCode,
  Power,
  Activity,
  AlertTriangle,
  Info,
  XCircle,
  Flame,
  Megaphone,
  Zap,
  Clock,
  Radio,
  ShieldAlert,
  Timer,
  MessageSquare,
} from "lucide-react";

type ConnectionStatus = "connected" | "pairing" | "disconnected" | "error";
type Group = { id: string; name: string; participantsCount?: number | null };

const ReportWhatsApp = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [connStatus, setConnStatus] = useState<ConnectionStatus>("disconnected");
  const [connPhone, setConnPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [configured, setConfigured] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSelection, setModalSelection] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [alertDisconnect, setAlertDisconnect] = useState(true);
  const [alertHighFailures, setAlertHighFailures] = useState(false);

  const [events, setEvents] = useState<Array<{ id: string; ts: string; type: string; level: string; text: string }>>([]);

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("devices")
        .select("id, name, number, status")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  const invoke = useCallback(
    async (action: string, body: Record<string, unknown> = {}) => {
      const { data, error } = await supabase.functions.invoke("report-wa", {
        body: { action, ...body },
      });
      if (error) throw new Error(error.message || "Erro na requisição");
      return data;
    },
    []
  );

  // Poll status every 3s
  useEffect(() => {
    if (!user) return;
    const poll = async () => {
      try {
        const data = await invoke("status");
        const newStatus = (data.status || "disconnected") as ConnectionStatus;
        setConnStatus(newStatus);
        setConnPhone(data.connectedPhone || null);
        if (newStatus === "connected") setQrDataUrl(null);

        if (data.config) {
          if (data.config.device_id) {
            setSelectedDeviceId(data.config.device_id);
            setConfigured(true);
          }
          if (data.config.group_id && !selectedGroup) {
            setSelectedGroup({ id: data.config.group_id, name: data.config.group_name || "" });
          }
          setAlertDisconnect(data.config.alert_disconnect ?? true);
          setAlertHighFailures(data.config.alert_high_failures ?? false);
        }

        try {
          const evData = await invoke("events");
          setEvents(evData.events || []);
        } catch { /* silent */ }
      } catch { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [user, invoke, selectedGroup]);

  // ── Handlers ──
  const handleConfirmDevice = async () => {
    if (!modalSelection) return;
    setLoading("connect");
    try {
      await invoke("connect", { deviceId: modalSelection });
      setSelectedDeviceId(modalSelection);
      setConfigured(true);
      setModalOpen(false);
      setModalSelection("");
      setQrDataUrl(null);
      toast({ title: "Número vinculado" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateQr = async () => {
    if (!selectedDeviceId) return;
    setLoading("qr");
    try {
      const data = await invoke("qr", { instanceId: selectedDeviceId });
      setQrDataUrl(data.qrCodeDataUrl || null);
      if (!data.qrCodeDataUrl) toast({ title: "QR não disponível", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Erro ao gerar QR", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async () => {
    setLoading("disconnect");
    try {
      await invoke("disconnect", { instanceId: selectedDeviceId });
      setConnStatus("disconnected");
      setConnPhone(null);
      setQrDataUrl(null);
      toast({ title: "Desconectado" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleLoadGroups = async () => {
    setLoading("groups");
    try {
      const data = await invoke("groups");
      setGroups(data.groups || []);
      if ((data.groups || []).length === 0) toast({ title: "Nenhum grupo encontrado" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleSaveConfig = async () => {
    if (!isConnected) { toast({ title: "Conecte o número primeiro", variant: "destructive" }); return; }
    if (!selectedGroup) { toast({ title: "Selecione um grupo", variant: "destructive" }); return; }
    setLoading("save");
    try {
      await invoke("config", {
        instanceId: selectedDeviceId,
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        frequency: "24h",
        toggleCampaigns: true,
        toggleWarmup: true,
        toggleInstances: true,
        alertDisconnect,
        alertCampaignEnd: true,
        alertHighFailures,
      });
      toast({ title: "Configuração salva" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleTest = async () => {
    if (!selectedGroup) { toast({ title: "Selecione um grupo", variant: "destructive" }); return; }
    setLoading("test");
    try {
      await invoke("test");
      toast({ title: "Teste enviado!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const filteredGroups = groups.filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase()));
  const isConnected = connStatus === "connected";
  const isPairing = connStatus === "pairing";

  const lastEvent = events.length > 0 ? events[0] : null;
  const totalEventsSent = events.filter((e) => e.text.includes("enviado") || e.text.includes("enviada")).length;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ═══════════════════════════════════════════
          BLOCO PRINCIPAL: STATUS DO MONITORAMENTO  
          ═══════════════════════════════════════════ */}
      <Card className="overflow-hidden border-0 shadow-xl bg-card">
        <div className={`h-1 w-full ${isConnected ? "bg-emerald-500" : isPairing ? "bg-yellow-500 animate-pulse" : "bg-muted-foreground/20"}`} />
        <CardContent className="p-6 space-y-6">
          {/* Top row: title + status badge */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Centro de Monitoramento
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Monitoramento operacional em tempo real via WhatsApp
              </p>
            </div>
            <Badge
              className={`text-sm font-semibold px-5 py-2 gap-2.5 shrink-0 border ${
                isConnected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : isPairing
                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/25"
                  : "bg-muted/30 text-muted-foreground border-border"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? "bg-emerald-400" : isPairing ? "bg-yellow-400 animate-pulse" : "bg-muted-foreground/50"
              }`} />
              {isConnected ? "Online" : isPairing ? "Aguardando QR" : "Offline"}
            </Badge>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricBox
              icon={<Radio className="w-4 h-4" />}
              label="Monitoramento"
              value={isConnected ? "Ativo" : "Inativo"}
              accent={isConnected ? "emerald" : "muted"}
            />
            <MetricBox
              icon={<Flame className="w-4 h-4" />}
              label="Aquecimento"
              value="Ciclo 24h"
              accent="orange"
            />
            <MetricBox
              icon={<MessageSquare className="w-4 h-4" />}
              label="Alertas enviados"
              value={String(totalEventsSent)}
              accent="blue"
            />
            <MetricBox
              icon={<Clock className="w-4 h-4" />}
              label="Último evento"
              value={lastEvent ? new Date(lastEvent.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
              accent="purple"
            />
          </div>

          {/* Instance info strip */}
          {configured && selectedDeviceId && (
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-muted/20 border border-border/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isConnected ? "bg-emerald-400" : isPairing ? "bg-yellow-400 animate-pulse" : "bg-muted-foreground/40"
                }`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {selectedDevice?.name || "Dispositivo"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isConnected && connPhone ? connPhone : selectedDevice?.number || "Sem número"}
                  </p>
                </div>
              </div>
              {selectedGroup && (
                <div className="text-right min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Grupo</p>
                  <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{selectedGroup.name}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════
          RELATÓRIOS ATIVOS - 3 Cards
          ═══════════════════════════════════════ */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          📊 Relatórios Ativos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Aquecimento 24h */}
          <Card className="border border-border/50 shadow-lg bg-card hover:border-orange-500/20 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-400" />
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/25 text-[10px] px-2 py-0.5">
                  Ativo
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Aquecimento 24h</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Ciclo automático ativo</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Timer className="w-3 h-3" />
                Relatório enviado diariamente
              </div>
            </CardContent>
          </Card>

          {/* Campanhas */}
          <Card className="border border-border/50 shadow-lg bg-card hover:border-blue-500/20 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-blue-400" />
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/25 text-[10px] px-2 py-0.5">
                  Ativo
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Campanhas</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Alerta ao finalizar campanha</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Send className="w-3 h-3" />
                Enviado automaticamente
              </div>
            </CardContent>
          </Card>

          {/* Status de Conexão */}
          <Card className="border border-border/50 shadow-lg bg-card hover:border-emerald-500/20 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/25 text-[10px] px-2 py-0.5">
                  Ativo
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Status de Conexão</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Alertas em tempo real</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Activity className="w-3 h-3" />
                Monitoramento contínuo
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          ALERTAS CRÍTICOS
          ═══════════════════════════════════════ */}
      <Card className="border border-border/50 shadow-lg bg-card">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            Alertas Críticos
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/10 border border-border/30">
              <div className="flex items-center gap-3">
                <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Alertar desconexão</p>
                  <p className="text-xs text-muted-foreground">Notificar quando uma instância desconectar</p>
                </div>
              </div>
              <Switch checked={alertDisconnect} onCheckedChange={setAlertDisconnect} />
            </div>

            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/10 border border-border/30">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Alertar falhas elevadas</p>
                  <p className="text-xs text-muted-foreground">Notificar quando taxa de falha ultrapassar limite</p>
                </div>
              </div>
              <Switch checked={alertHighFailures} onCheckedChange={setAlertHighFailures} />
            </div>
          </div>

          {/* Save + Test */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSaveConfig}
              disabled={!selectedGroup || !!loading}
            >
              {loading === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleTest}
              disabled={!selectedGroup || !!loading}
            >
              {loading === "test" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Enviar teste
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════
          EVENTOS RECENTES
          ═══════════════════════════════════════ */}
      <Card className="border border-border/50 shadow-lg bg-card">
        <CardContent className="p-5 space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            Eventos recentes
          </h2>

          {events.length === 0 ? (
            <div className="text-xs text-muted-foreground py-10 text-center rounded-lg border border-dashed border-border/50">
              Nenhum evento registrado.
            </div>
          ) : (
            <div className="max-h-[280px] overflow-y-auto space-y-1">
              {events.map((ev) => {
                const IconComp = ev.level === "ERROR" ? XCircle : ev.level === "WARN" ? AlertTriangle : Info;
                const iconColor = ev.level === "ERROR" ? "text-destructive" : ev.level === "WARN" ? "text-yellow-500" : "text-muted-foreground";
                return (
                  <div key={ev.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs hover:bg-muted/20 transition-colors">
                    <IconComp className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${iconColor}`} />
                    <span className="text-muted-foreground shrink-0 font-mono tabular-nums">
                      {new Date(ev.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-foreground">{ev.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════
          CONFIGURAÇÃO (secundário)
          ═══════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Número de relatório */}
        <Card className="border border-border/30 shadow-md bg-card">
          <CardContent className="p-5 space-y-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5" />
              Número de Relatório
            </h2>

            {!configured || !selectedDeviceId ? (
              <Button
                className="w-full h-11 gap-2 text-sm"
                variant="outline"
                onClick={() => { setModalSelection(""); setModalOpen(true); }}
              >
                <Plug className="w-4 h-4" />
                Selecionar número
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      isConnected ? "bg-emerald-400" : isPairing ? "bg-yellow-400 animate-pulse" : "bg-muted-foreground/40"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{selectedDevice?.name || "Dispositivo"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {isConnected && connPhone ? connPhone : selectedDevice?.number || "Sem número"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {connStatus === "disconnected" && (
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={handleGenerateQr} disabled={!!loading}>
                        {loading === "qr" ? <Loader2 className="w-3 h-3 animate-spin" /> : <QrCode className="w-3 h-3" />}
                        QR
                      </Button>
                    )}
                    {isConnected && (
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs text-destructive hover:text-destructive" onClick={handleDisconnect} disabled={!!loading}>
                        {loading === "disconnect" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Power className="w-3 h-3" />}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs text-muted-foreground" onClick={() => { setModalSelection(""); setModalOpen(true); }}>
                      <ArrowRightLeft className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* QR Code */}
                {(isPairing || qrDataUrl) && !isConnected && (
                  <div className="flex flex-col items-center gap-3 py-3">
                    {qrDataUrl ? (
                      <>
                        <div className="p-2.5 bg-white rounded-xl">
                          <img src={qrDataUrl} alt="QR Code" className="w-44 h-44 object-contain" />
                        </div>
                        <p className="text-[11px] text-muted-foreground">Escaneie com o WhatsApp</p>
                        <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={handleGenerateQr} disabled={!!loading}>
                          {loading === "qr" ? <Loader2 className="w-3 h-3 animate-spin" /> : <QrCode className="w-3 h-3" />}
                          Atualizar
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-3">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground">Gerando QR...</p>
                      </div>
                    )}
                  </div>
                )}

                {isConnected && connPhone && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-foreground">
                      Conectado: <strong>{connPhone}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grupo de destino */}
        <Card className="border border-border/30 shadow-md bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                Grupo de destino
              </h2>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs"
                onClick={handleLoadGroups}
                disabled={!isConnected || !!loading}
              >
                {loading === "groups" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Users className="w-3 h-3" />}
                Carregar
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Buscar grupo..." value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} className="pl-9 h-8 text-xs" />
            </div>

            {groups.length === 0 ? (
              <div className="text-[11px] text-muted-foreground py-8 text-center rounded-lg border border-dashed border-border/50">
                {isConnected ? 'Clique em "Carregar" para listar.' : "Conecte o número primeiro."}
              </div>
            ) : (
              <div className="max-h-[180px] overflow-y-auto space-y-0.5">
                {filteredGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroup(g)}
                    className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                      selectedGroup?.id === g.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted/30 text-foreground border border-transparent"
                    }`}
                  >
                    <span>{g.name}</span>
                    {g.participantsCount != null && (
                      <span className="text-[10px] text-muted-foreground ml-2">{g.participantsCount} membros</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedGroup && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/15">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs text-foreground truncate">
                  <strong>{selectedGroup.name}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Modal: Selecionar instância ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar número</DialogTitle>
            <DialogDescription>Escolha uma instância para receber os relatórios.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma instância disponível.</p>
            ) : (
              devices.map((d) => {
                const isOnline = ["Connected", "Ready", "authenticated"].includes(d.status);
                const isSelected = modalSelection === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setModalSelection(d.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/30 border border-transparent"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.number || "Sem número"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Circle className={`w-2 h-2 fill-current ${isOnline ? "text-emerald-400" : "text-muted-foreground/40"}`} />
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleConfirmDevice} disabled={!modalSelection || loading === "connect"}>
              {loading === "connect" && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ── Metric Box Component ── */
function MetricBox({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  const accentColors: Record<string, string> = {
    emerald: "text-emerald-400",
    orange: "text-orange-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    muted: "text-muted-foreground",
  };
  const bgColors: Record<string, string> = {
    emerald: "bg-emerald-500/5",
    orange: "bg-orange-500/5",
    blue: "bg-blue-500/5",
    purple: "bg-purple-500/5",
    muted: "bg-muted/10",
  };

  return (
    <div className={`rounded-xl p-4 ${bgColors[accent] || bgColors.muted} border border-border/30`}>
      <div className={`mb-2 ${accentColors[accent] || accentColors.muted}`}>{icon}</div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-lg font-bold tracking-tight ${accentColors[accent] || accentColors.muted}`}>{value}</p>
    </div>
  );
}

export default ReportWhatsApp;
