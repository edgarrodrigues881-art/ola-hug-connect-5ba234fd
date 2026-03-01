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
  Settings2,
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
} from "lucide-react";

type ConnectionStatus = "connected" | "pairing" | "disconnected" | "error";

const statusConfig: Record<ConnectionStatus, { label: string; dot: string; badge: string }> = {
  connected: {
    label: "Conectado",
    dot: "bg-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  },
  pairing: {
    label: "Aguardando QR",
    dot: "bg-yellow-400 animate-pulse",
    badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25",
  },
  disconnected: {
    label: "Desconectado",
    dot: "bg-muted-foreground/50",
    badge: "bg-muted/30 text-muted-foreground border-border",
  },
  error: {
    label: "Erro",
    dot: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/25",
  },
};

type Group = { id: string; name: string; participantsCount?: number | null };

const ReportWhatsApp = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const [frequency, setFrequency] = useState("1h");
  const [toggleCampaigns, setToggleCampaigns] = useState(true);
  const [toggleWarmup, setToggleWarmup] = useState(true);
  const [toggleInstances, setToggleInstances] = useState(true);
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

        // If connected, clear QR
        if (newStatus === "connected") {
          setQrDataUrl(null);
        }

        if (data.config) {
          if (data.config.device_id) {
            setSelectedDeviceId(data.config.device_id);
            setConfigured(true);
          }
          if (data.config.group_id && !selectedGroup) {
            setSelectedGroup({
              id: data.config.group_id,
              name: data.config.group_name || "",
            });
          }
          setFrequency(data.config.frequency || "1h");
          setToggleCampaigns(data.config.toggle_campaigns ?? true);
          setToggleWarmup(data.config.toggle_warmup ?? true);
          setToggleInstances(data.config.toggle_instances ?? true);
          setAlertDisconnect(data.config.alert_disconnect ?? true);
          setAlertHighFailures(data.config.alert_high_failures ?? false);
        }

        // Fetch events in same poll
        try {
          const evData = await invoke("events");
          setEvents(evData.events || []);
        } catch { /* silent */ }
      } catch {
        /* silent */
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [user, invoke, selectedGroup]);

  // Select device from modal (just saves, no QR yet)
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

  // Generate QR
  const handleGenerateQr = async () => {
    if (!selectedDeviceId) return;
    setLoading("qr");
    try {
      const data = await invoke("qr", { instanceId: selectedDeviceId });
      setQrDataUrl(data.qrCodeDataUrl || null);
      if (!data.qrCodeDataUrl) {
        toast({ title: "QR não disponível", description: "Tente novamente em alguns segundos.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar QR", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  // Disconnect
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
      if ((data.groups || []).length === 0) {
        toast({ title: "Nenhum grupo encontrado" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleSaveConfig = async () => {
    if (!isConnected) {
      toast({ title: "Conecte o número primeiro", variant: "destructive" });
      return;
    }
    if (!selectedGroup) {
      toast({ title: "Selecione um grupo", variant: "destructive" });
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
      toast({ title: "Configuração salva" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleTest = async () => {
    if (!selectedGroup) {
      toast({ title: "Selecione um grupo", variant: "destructive" });
      return;
    }
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

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );
  const isConnected = connStatus === "connected";
  const isPairing = connStatus === "pairing";
  const status = statusConfig[connStatus] || statusConfig.disconnected;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            Relatório via WhatsApp
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Conecte um número e receba relatórios automáticos.
          </p>
        </div>
        <Badge
          variant="outline"
          className={`text-xs font-semibold px-4 py-1.5 gap-2 shrink-0 ${status.badge}`}
        >
          <span className={`w-2 h-2 rounded-full ${status.dot}`} />
          {status.label}
        </Badge>
      </div>

      {/* ── CARD 1: Número de Relatório ── */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5" />
            Número de Relatório
          </h2>

          {!configured || !selectedDeviceId ? (
            <Button
              className="w-full h-12 gap-2 text-sm"
              variant="outline"
              onClick={() => {
                setModalSelection("");
                setModalOpen(true);
              }}
            >
              <Plug className="w-4 h-4" />
              Selecionar número de relatório
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Device info */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isConnected ? "bg-emerald-400" : isPairing ? "bg-yellow-400 animate-pulse" : "bg-muted-foreground/40"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedDevice?.name || "Dispositivo"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isConnected && connPhone ? connPhone : selectedDevice?.number || "Sem número"}
                      <span className="ml-2 font-medium">
                        · {isConnected ? "Online" : isPairing ? "Aguardando QR" : "Offline"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {/* Conditional buttons based on status */}
                  {connStatus === "disconnected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleGenerateQr}
                      disabled={!!loading}
                    >
                      {loading === "qr" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <QrCode className="w-3.5 h-3.5" />
                      )}
                      Gerar QR
                    </Button>
                  )}
                  {isConnected && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={handleDisconnect}
                      disabled={!!loading}
                    >
                      {loading === "disconnect" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Power className="w-3.5 h-3.5" />
                      )}
                      Desconectar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => {
                      setModalSelection("");
                      setModalOpen(true);
                    }}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Trocar
                  </Button>
                </div>
              </div>

              {/* QR Code display */}
              {(isPairing || qrDataUrl) && !isConnected && (
                <div className="flex flex-col items-center gap-3 py-4">
                  {qrDataUrl ? (
                    <>
                      <div className="p-3 bg-white rounded-xl">
                        <img
                          src={qrDataUrl}
                          alt="QR Code"
                          className="w-56 h-56 object-contain"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Escaneie o QR Code com o WhatsApp
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs"
                        onClick={handleGenerateQr}
                        disabled={!!loading}
                      >
                        {loading === "qr" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <QrCode className="w-3 h-3" />
                        )}
                        Atualizar QR
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Gerando QR Code...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Connected confirmation */}
              {isConnected && connPhone && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-foreground">
                    Conectado com <strong>{connPhone}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal: Selecionar instância ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar número</DialogTitle>
            <DialogDescription>
              Escolha uma instância para receber os relatórios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {devices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma instância disponível.
              </p>
            ) : (
              devices.map((d) => {
                const isOnline = ["Connected", "Ready", "authenticated"].includes(d.status);
                const isSelected = modalSelection === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setModalSelection(d.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/30 border border-transparent"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.number || "Sem número"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Circle
                        className={`w-2 h-2 fill-current ${
                          isOnline ? "text-emerald-400" : "text-muted-foreground/40"
                        }`}
                      />
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDevice}
              disabled={!modalSelection || loading === "connect"}
            >
              {loading === "connect" && (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              )}
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CARD 2: Grupo de destino ── */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Grupo de destino
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleLoadGroups}
              disabled={!isConnected || !!loading}
            >
              {loading === "groups" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Users className="w-3.5 h-3.5" />
              )}
              Carregar grupos
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar grupo..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {groups.length === 0 ? (
            <div className="text-xs text-muted-foreground py-10 text-center rounded-lg border border-dashed border-border/50">
              {isConnected
                ? 'Clique em "Carregar grupos" para listar.'
                : "Conecte o número para listar os grupos."}
            </div>
          ) : (
            <div className="max-h-[220px] overflow-y-auto space-y-1">
              {filteredGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroup(g)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                    selectedGroup?.id === g.id
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "hover:bg-muted/30 text-foreground border border-transparent"
                  }`}
                >
                  <span>{g.name}</span>
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
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground truncate">
                Grupo selecionado: <strong>{selectedGroup.name}</strong>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CARD 3: Configurações ── */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="w-3.5 h-3.5" />
            Configurações
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              <div>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Frequência do resumo
                </label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="h-9">
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
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Conteúdo
                </span>
                <ToggleRow label="Aquecimento" checked={toggleWarmup} onChange={setToggleWarmup} />
                <ToggleRow label="Campanhas" checked={toggleCampaigns} onChange={setToggleCampaigns} />
                <ToggleRow label="Instâncias" checked={toggleInstances} onChange={setToggleInstances} />
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-3">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Alertas
                </span>
                <ToggleRow label="Alertar desconexão" checked={alertDisconnect} onChange={setAlertDisconnect} />
                <ToggleRow label="Alertar falhas altas" checked={alertHighFailures} onChange={setAlertHighFailures} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={handleSaveConfig}
                  disabled={!selectedGroup || !!loading}
                >
                  {loading === "save" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Salvar configuração
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleTest}
                  disabled={!selectedGroup || !!loading}
                >
                  {loading === "test" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Enviar teste
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── CARD 4: Eventos ── */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            Eventos recentes
          </h2>

          {events.length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center rounded-lg border border-dashed border-border/50">
              Nenhum evento registrado.
            </div>
          ) : (
            <div className="max-h-[260px] overflow-y-auto space-y-1">
              {events.map((ev) => {
                const IconComp = ev.level === "ERROR" ? XCircle : ev.level === "WARN" ? AlertTriangle : Info;
                const iconColor = ev.level === "ERROR" ? "text-destructive" : ev.level === "WARN" ? "text-yellow-500" : "text-muted-foreground";
                return (
                  <div key={ev.id} className="flex items-start gap-2 px-3 py-2 rounded text-xs hover:bg-muted/20 transition-colors">
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
    </div>
  );
};

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-foreground">{label}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default ReportWhatsApp;
