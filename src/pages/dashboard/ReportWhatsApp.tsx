import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  ChevronDown,
  History,
  RefreshCw,
  Plus,
  Trash2,
  Download,
} from "lucide-react";

type ConnectionStatus = "connected" | "pairing" | "disconnected" | "error";
type Group = { id: string; name: string; participantsCount?: number | null };
type ReportType = "warmup" | "campaigns" | "connection";

const REPORT_META: Record<ReportType, { label: string; emoji: string; icon: typeof Flame; color: string; bgColor: string; borderHover: string; description: string }> = {
  warmup: {
    label: "Aquecimento 24h",
    emoji: "🔥",
    icon: Flame,
    color: "text-orange-400",
    bgColor: "bg-orange-500/8",
    borderHover: "hover:border-orange-500/30",
    description: "Relatório diário automático do ciclo de aquecimento",
  },
  campaigns: {
    label: "Campanhas",
    emoji: "📣",
    icon: Megaphone,
    color: "text-blue-400",
    bgColor: "bg-blue-500/8",
    borderHover: "hover:border-blue-500/30",
    description: "Alertas ao iniciar, pausar ou finalizar campanhas",
  },
  connection: {
    label: "Status de Conexão",
    emoji: "🔌",
    icon: Zap,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/8",
    borderHover: "hover:border-emerald-500/30",
    description: "Alertas em tempo real de conexão e desconexão",
  },
};

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

  // Independent group selection per report type
  const [reportGroups, setReportGroups] = useState<Record<ReportType, Group | null>>({
    warmup: null, campaigns: null, connection: null,
  });
  const [reportToggles, setReportToggles] = useState<Record<ReportType, boolean>>({
    warmup: true, campaigns: true, connection: true,
  });

  // Group loading
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [groupPickerOpen, setGroupPickerOpen] = useState<ReportType | null>(null);
  const [groupSearch, setGroupSearch] = useState("");

  const [alertDisconnect, setAlertDisconnect] = useState(true);
  const [alertHighFailures, setAlertHighFailures] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);

  const [events, setEvents] = useState<Array<{ id: string; ts: string; type: string; level: string; text: string }>>([]);

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data } = await supabase.from("devices").select("id, name, number, status, updated_at, created_at").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);

  const invoke = useCallback(
    async (action: string, body: Record<string, unknown> = {}) => {
      const { data, error } = await supabase.functions.invoke("report-wa", { body: { action, ...body } });
      if (error) throw new Error(error.message || "Erro na requisição");
      return data;
    },
    []
  );

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
          if (data.config.group_id) {
            const g = { id: data.config.group_id, name: data.config.group_name || "" };
            setReportGroups((prev) => {
              const needsInit = !prev.warmup && !prev.campaigns && !prev.connection;
              if (needsInit) return { warmup: g, campaigns: g, connection: g };
              return prev;
            });
          }
          setAlertDisconnect(data.config.alert_disconnect ?? true);
          setAlertHighFailures(data.config.alert_high_failures ?? false);
          setReportToggles({
            warmup: data.config.toggle_warmup ?? true,
            campaigns: data.config.toggle_campaigns ?? true,
            connection: data.config.toggle_instances ?? true,
          });
        }

        try {
          const evData = await invoke("events");
          setEvents(evData.events || []);
        } catch { /* silent */ }
      } catch { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [user, invoke]);

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

  const handleLoadGroups = async (forType: ReportType) => {
    setLoading("groups");
    try {
      const data = await invoke("groups");
      setAllGroups(data.groups || []);
      if ((data.groups || []).length === 0) {
        toast({ title: "Nenhum grupo encontrado" });
      } else {
        setGroupPickerOpen(forType);
        setGroupSearch("");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleSelectGroupForType = async (type: ReportType, group: Group) => {
    setReportGroups((prev) => ({ ...prev, [type]: group }));
    setGroupPickerOpen(null);
    setGroupSearch("");

    if (!isConnected || !selectedDeviceId) return;
    setLoading("save");
    try {
      // Use the first selected group as the main config group
      const primaryGroup = group;
      await invoke("config", {
        instanceId: selectedDeviceId,
        groupId: primaryGroup.id,
        groupName: primaryGroup.name,
        frequency: "24h",
        toggleCampaigns: reportToggles.campaigns,
        toggleWarmup: reportToggles.warmup,
        toggleInstances: reportToggles.connection,
        alertDisconnect,
        alertCampaignEnd: true,
        alertHighFailures,
      });
      toast({ title: `Grupo configurado para ${REPORT_META[type].label}` });
      try {
        await invoke("test", { reportType: type, groupId: group.id, groupName: group.name });
        toast({ title: "✅ Teste enviado ao grupo!" });
      } catch { /* silent */ }
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleSaveAll = async () => {
    if (!isConnected) { toast({ title: "Conecte o número primeiro", variant: "destructive" }); return; }
    const primaryGroup = reportGroups.warmup || reportGroups.campaigns || reportGroups.connection;
    if (!primaryGroup) { toast({ title: "Selecione ao menos um grupo", variant: "destructive" }); return; }
    setLoading("save");
    try {
      await invoke("config", {
        instanceId: selectedDeviceId,
        groupId: primaryGroup.id,
        groupName: primaryGroup.name,
        frequency: "24h",
        toggleCampaigns: reportToggles.campaigns,
        toggleWarmup: reportToggles.warmup,
        toggleInstances: reportToggles.connection,
        alertDisconnect,
        alertCampaignEnd: true,
        alertHighFailures,
      });
      toast({ title: "Configuração salva com sucesso" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const filteredGroups = allGroups.filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase()));
  const isConnected = connStatus === "connected";
  const isPairing = connStatus === "pairing";
  const lastEvent = events.length > 0 ? events[0] : null;
  const totalEventsSent = events.filter((e) => e.text.includes("enviado") || e.text.includes("enviada")).length;

  // Group & deduplicate events
  const groupedEvents = useMemo(() => {
    const map = new Map<string, { text: string; level: string; count: number; ts: string; id: string }>();
    for (const ev of events) {
      const key = `${ev.level}::${ev.text}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        if (ev.ts > existing.ts) existing.ts = ev.ts;
      } else {
        map.set(key, { text: ev.text, level: ev.level, count: 1, ts: ev.ts, id: ev.id });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.ts.localeCompare(a.ts));
  }, [events]);

  const visibleEvents = showAllEvents ? groupedEvents : groupedEvents.slice(0, 4);

  const activeReportsCount = Object.values(reportToggles).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ═══════════════════════════════════════════
          1. CARD PRINCIPAL DE STATUS
          ═══════════════════════════════════════════ */}
      <Card className="overflow-hidden border-0 shadow-xl bg-card">
        <div className={`h-1.5 w-full ${isConnected ? "bg-emerald-500" : isPairing ? "bg-yellow-500 animate-pulse" : "bg-muted-foreground/15"}`} />
        <CardContent className="p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Centro de Monitoramento
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monitoramento operacional em tempo real via WhatsApp
              </p>
            </div>
            <Badge
              className={`text-sm font-semibold px-5 py-2.5 gap-2.5 shrink-0 border ${
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

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricBox icon={<Radio className="w-4 h-4" />} label="Status" value={isConnected ? "Ativo" : "Inativo"} accent={isConnected ? "emerald" : "muted"} />
            <MetricBox icon={<Activity className="w-4 h-4" />} label="Monitoramento" value={isConnected && activeReportsCount > 0 ? "Ativo" : "Inativo"} accent={isConnected ? "emerald" : "muted"} />
            <MetricBox icon={<Flame className="w-4 h-4" />} label="Ciclo" value="24h" accent="orange" />
            <MetricBox icon={<MessageSquare className="w-4 h-4" />} label="Alertas enviados" value={String(totalEventsSent)} accent="blue" />
            <MetricBox icon={<Clock className="w-4 h-4" />} label="Último evento" value={lastEvent ? new Date(lastEvent.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"} accent="purple" />
          </div>

          {configured && selectedDeviceId && (
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-muted/15 border border-border/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-3 h-3 rounded-full shrink-0 ${isConnected ? "bg-emerald-400" : isPairing ? "bg-yellow-400 animate-pulse" : "bg-muted-foreground/40"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{selectedDevice?.name || "Dispositivo"}</p>
                  <p className="text-xs text-muted-foreground">{isConnected && connPhone ? connPhone : selectedDevice?.number || "Sem número"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                  {activeReportsCount} relatório{activeReportsCount !== 1 ? "s" : ""} ativo{activeReportsCount !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════
          2. RELATÓRIOS ATIVOS (3 blocos independentes)
          ═══════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            📊 Relatórios Ativos
          </h2>
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={handleSaveAll} disabled={!!loading}>
            {loading === "save" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Salvar tudo
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {(["warmup", "campaigns", "connection"] as ReportType[]).map((type) => {
            const meta = REPORT_META[type];
            const Icon = meta.icon;
            const group = reportGroups[type];
            const isActive = reportToggles[type];

            return (
              <Card key={type} className={`border border-border/40 shadow-lg bg-card transition-all ${meta.borderHover} ${!isActive ? "opacity-60" : ""}`}>
                <CardContent className="p-6 space-y-5">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl ${meta.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{meta.label}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{meta.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border border-border/30">
                    <span className="text-xs font-medium text-foreground">Ativar relatório</span>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(v) => setReportToggles((prev) => ({ ...prev, [type]: v }))}
                    />
                  </div>

                  {/* Group selector */}
                  {isActive && (
                    <div className="space-y-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        Grupo de destino
                      </p>

                      {group ? (
                        <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-xs font-semibold text-foreground truncate">{group.name}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] text-muted-foreground shrink-0"
                            onClick={() => handleLoadGroups(type)}
                            disabled={!isConnected || !!loading}
                          >
                            <RefreshCw className="w-3 h-3" />
                            Alterar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full h-10 gap-2 text-xs"
                          onClick={() => handleLoadGroups(type)}
                          disabled={!isConnected || !!loading}
                        >
                          {loading === "groups" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                          Carregar grupos
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          3. ALERTAS CRÍTICOS
          ═══════════════════════════════════════════ */}
      <Card className="border border-border/40 shadow-lg bg-card">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            Alertas Críticos
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-muted/10 border border-border/30">
              <div className="flex items-center gap-3">
                <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Alertar desconexão</p>
                  <p className="text-[11px] text-muted-foreground">Notificar quando uma instância desconectar</p>
                </div>
              </div>
              <Switch checked={alertDisconnect} onCheckedChange={setAlertDisconnect} />
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-muted/10 border border-border/30">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Alertar falhas elevadas</p>
                  <p className="text-[11px] text-muted-foreground">Notificar quando taxa de falha ultrapassar limite</p>
                </div>
              </div>
              <Switch checked={alertHighFailures} onCheckedChange={setAlertHighFailures} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════
          4. EVENTOS RECENTES (agrupados e tipados)
          ═══════════════════════════════════════════ */}
      <Card className="border border-border/40 shadow-lg bg-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              Eventos recentes
            </h2>
            <div className="flex items-center gap-2">
              {groupedEvents.length > 0 && (
                <>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                    {groupedEvents.length}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-muted-foreground gap-1"
                    onClick={async () => {
                      setEvents([]);
                      try { await invoke("clear-events"); } catch { /* silent */ }
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                    Limpar
                  </Button>
                </>
              )}
            </div>
          </div>

          {groupedEvents.length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center rounded-xl border border-dashed border-border/50">
              Nenhum evento registrado.
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {visibleEvents.map((ev) => {
                  const isError = ev.level === "ERROR";
                  const isWarn = ev.level === "WARN";
                  const IconComp = isError ? XCircle : isWarn ? AlertTriangle : Info;
                  const iconColor = isError ? "text-red-400" : isWarn ? "text-yellow-400" : "text-blue-400";
                  const bgRow = isError ? "bg-red-500/3" : isWarn ? "bg-yellow-500/3" : "bg-transparent";
                  const levelLabel = isError ? "Crítico" : isWarn ? "Alerta" : "Info";
                  const levelBadgeClass = isError
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : isWarn
                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20";

                  return (
                    <div key={ev.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs ${bgRow} hover:bg-muted/15 transition-colors`}>
                      <IconComp className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
                      <Badge className={`text-[9px] px-1.5 py-0 border shrink-0 ${levelBadgeClass}`}>
                        {levelLabel}
                      </Badge>
                      <span className="text-muted-foreground shrink-0 font-mono tabular-nums text-[10px]">
                        {new Date(ev.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-foreground flex-1 truncate">{ev.text}</span>
                      {ev.count > 1 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 ml-auto">
                          ×{ev.count}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {groupedEvents.length > 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1.5 text-xs text-muted-foreground h-8"
                  onClick={() => setShowAllEvents(!showAllEvents)}
                >
                  <Download className="w-3 h-3" />
                  {showAllEvents ? "Recolher" : `Ver mais (${groupedEvents.length - 4} restantes)`}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════
          5. CONFIGURAÇÃO DO NÚMERO (estilo Devices card)
          ═══════════════════════════════════════════ */}
      <Card className="border border-border/30 shadow-md bg-card">
        <CardContent className="p-0">
          <div className="px-5 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5" />
              Número de Relatório
            </h2>
          </div>

          {!configured || !selectedDeviceId ? (
            <div className="px-5 pb-4">
              <Button className="w-full h-9 gap-2 text-xs" onClick={() => { setModalSelection(""); setModalOpen(true); }}>
                <Plus className="w-3.5 h-3.5" />
                Vincular instância
              </Button>
            </div>
          ) : (
            <>
              {/* Linha 1: Nome + Status Badge */}
              <div className="flex items-center justify-between gap-2 px-5 pb-1.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isConnected ? "bg-emerald-400" : isPairing ? "bg-yellow-400 animate-pulse" : "bg-red-400"}`} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-foreground truncate leading-tight">
                      {selectedDevice?.name || "Dispositivo"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/50 truncate leading-tight">
                      {isConnected && connPhone ? connPhone : selectedDevice?.number || "Sem número"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 h-4 shrink-0 whitespace-nowrap gap-1 ${
                    isConnected
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : isPairing
                      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}
                >
                  {isConnected ? (
                    <><Wifi className="w-2.5 h-2.5" /> Online</>
                  ) : isPairing ? (
                    <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Pareando</>
                  ) : (
                    <><WifiOff className="w-2.5 h-2.5" /> Offline</>
                  )}
                </Badge>
              </div>

              {/* Linha 2: Health bar + meta */}
              <div className="px-5 pb-2 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 shrink-0 text-emerald-400" />
                  <div className="h-1 flex-1 rounded-full bg-muted/20 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isConnected ? "bg-emerald-500" : "bg-red-500"}`}
                      style={{ width: isConnected ? "100%" : "20%" }}
                    />
                  </div>
                  <span className={`text-[9px] font-mono shrink-0 ${isConnected ? "text-emerald-400" : "text-red-400"}`}>
                    {isConnected ? "100" : "20"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                  <span className="truncate">
                    {selectedDevice?.updated_at
                      ? `${formatDistanceToNow(new Date(selectedDevice.updated_at), { locale: ptBR, addSuffix: true })}`
                      : "—"}
                  </span>
                  <span className="flex items-center gap-0.5 shrink-0">
                    <Radio className="w-2.5 h-2.5" />
                    {activeReportsCount} relatório{activeReportsCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* QR Code section */}
              {(isPairing || qrDataUrl) && !isConnected && (
                <div className="flex flex-col items-center gap-3 py-4 border-t border-border/10">
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

              {/* Connected confirmation */}
              {isConnected && connPhone && (
                <div className="mx-5 mb-2 flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-[10px] text-foreground">Conectado: <strong>{connPhone}</strong></span>
                </div>
              )}

              {/* Linha 3: Actions */}
              <div className="border-t border-border/10 px-3 py-1.5 flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setModalSelection(""); setModalOpen(true); }}>
                  <ArrowRightLeft className="w-2.5 h-2.5" />
                </Button>
                <div className="flex-1" />
                {connStatus === "disconnected" ? (
                  <Button size="sm" className="h-6 gap-0.5 text-[10px] px-1.5" onClick={handleGenerateQr} disabled={!!loading}>
                    {loading === "qr" ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                    Reconectar
                  </Button>
                ) : isConnected ? (
                  <Button variant="ghost" size="sm" className="h-6 gap-0.5 text-[10px] px-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDisconnect} disabled={!!loading}>
                    {loading === "disconnect" ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Power className="w-2.5 h-2.5" />}
                    Desconectar
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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

      {/* ── Modal: Selecionar grupo para relatório ── */}
      <Dialog open={!!groupPickerOpen} onOpenChange={(v) => !v && setGroupPickerOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Selecionar grupo
            </DialogTitle>
            <DialogDescription>
              {groupPickerOpen && `Escolha o grupo de destino para ${REPORT_META[groupPickerOpen].label}`}
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar grupo..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-1 max-h-[320px] overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum grupo encontrado.</p>
            ) : (
              filteredGroups.map((g) => {
                const isCurrentlySelected = groupPickerOpen && reportGroups[groupPickerOpen]?.id === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => groupPickerOpen && handleSelectGroupForType(groupPickerOpen, g)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      isCurrentlySelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/20 border border-transparent"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{g.name}</p>
                      {g.participantsCount != null && (
                        <p className="text-[11px] text-muted-foreground">{g.participantsCount} membros</p>
                      )}
                    </div>
                    {isCurrentlySelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
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
