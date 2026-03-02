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
  Shield,
  HeartPulse,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type ConnectionStatus = "connected" | "pairing" | "disconnected" | "error";
type Group = { id: string; name: string; participantsCount?: number | null };
type ReportType = "warmup" | "campaigns" | "connection";

const REPORT_META: Record<ReportType, { label: string; icon: typeof Flame; color: string; bgColor: string; borderColor: string; description: string }> = {
  warmup: {
    label: "Aquecimento 24h",
    icon: Flame,
    color: "text-orange-400",
    bgColor: "bg-orange-500/8",
    borderColor: "border-orange-500/20",
    description: "Relatório diário automático do ciclo de aquecimento",
  },
  campaigns: {
    label: "Campanhas",
    icon: Megaphone,
    color: "text-blue-400",
    bgColor: "bg-blue-500/8",
    borderColor: "border-blue-500/20",
    description: "Alertas ao iniciar, pausar ou finalizar campanhas",
  },
  connection: {
    label: "Status de Conexão",
    icon: Zap,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/8",
    borderColor: "border-emerald-500/20",
    description: "Alertas em tempo real de conexão e desconexão",
  },
};

const ReportWhatsApp = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [connStatus, setConnStatus] = useState<ConnectionStatus>("disconnected");
  const [connPhone, setConnPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [configured, setConfigured] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSelection, setModalSelection] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [initialGroupsLoaded, setInitialGroupsLoaded] = useState(false);

  const [reportGroups, setReportGroups] = useState<Record<ReportType, Group | null>>({
    warmup: null, campaigns: null, connection: null,
  });
  const [reportToggles, setReportToggles] = useState<Record<ReportType, boolean>>({
    warmup: false, campaigns: false, connection: false,
  });

  const [moduleGroups, setModuleGroups] = useState<Record<ReportType, Group[]>>({
    warmup: [], campaigns: [], connection: [],
  });
  const [moduleGroupsLoading, setModuleGroupsLoading] = useState<Record<ReportType, boolean>>({
    warmup: false, campaigns: false, connection: false,
  });
  const [groupPickerOpen, setGroupPickerOpen] = useState<ReportType | null>(null);
  const [groupSearch, setGroupSearch] = useState("");

  const [alertDisconnect, setAlertDisconnect] = useState(true);
  const [alertHighFailures, setAlertHighFailures] = useState(false);

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
          setReportToggles((prev) => ({
            warmup: data.config.toggle_warmup ?? prev.warmup,
            campaigns: data.config.toggle_campaigns ?? prev.campaigns,
            connection: data.config.toggle_instances ?? prev.connection,
          }));
          if (!initialGroupsLoaded) {
            const fallbackGroup = data.config.group_id ? { id: data.config.group_id, name: data.config.group_name || "" } : null;
            const toGroup = (id: string | null | undefined, name: string | null | undefined, fb: typeof fallbackGroup) =>
              id && id.trim() ? { id, name: name || "" } : fb;
            setReportGroups({
              warmup: toGroup(data.config.warmup_group_id, data.config.warmup_group_name, fallbackGroup),
              campaigns: toGroup(data.config.campaigns_group_id, data.config.campaigns_group_name, fallbackGroup),
              connection: toGroup(data.config.connection_group_id, data.config.connection_group_name, fallbackGroup),
            });
            setInitialGroupsLoaded(true);
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
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [user, invoke]);

  useEffect(() => {
    if (!configured || !selectedDeviceId) return;
    const primaryGroup = reportGroups.warmup || reportGroups.campaigns || reportGroups.connection;
    invoke("config", {
      instanceId: selectedDeviceId,
      groupId: primaryGroup?.id || "",
      groupName: primaryGroup?.name || "",
      frequency: "24h",
      toggleCampaigns: reportToggles.campaigns,
      toggleWarmup: reportToggles.warmup,
      toggleInstances: reportToggles.connection,
      alertDisconnect,
      alertCampaignEnd: true,
      alertHighFailures,
    }).catch(() => {});
  }, [reportToggles, configured, selectedDeviceId]);

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

  const [groupsDebug, setGroupsDebug] = useState<Record<ReportType, { deviceName: string; total: number; endpoint: string } | null>>({
    warmup: null, campaigns: null, connection: null,
  });

  const handleLoadGroups = async (forType: ReportType) => {
    if (!selectedDeviceId || !isConnected) {
      toast({ title: "Conecte uma instância do WhatsApp para carregar seus grupos", variant: "destructive" });
      return;
    }
    setModuleGroups((prev) => ({ ...prev, [forType]: [] }));
    setGroupsDebug((prev) => ({ ...prev, [forType]: null }));
    setModuleGroupsLoading((prev) => ({ ...prev, [forType]: true }));
    try {
      const data = await invoke("groups", { instanceId: selectedDeviceId });
      const groups = data.groups || [];
      const debug = data.debug || {};
      setModuleGroups((prev) => ({ ...prev, [forType]: groups }));
      setGroupsDebug((prev) => ({ ...prev, [forType]: {
        deviceName: debug.deviceName || selectedDevice?.name || "—",
        total: groups.length,
        endpoint: debug.usedEndpoint || "—",
      }}));
      if (groups.length === 0) {
        toast({ title: "Nenhum grupo encontrado nesta instância" });
      } else {
        setGroupPickerOpen(forType);
        setGroupSearch("");
      }
    } catch (err: any) {
      toast({ title: "Erro ao carregar grupos desta instância", description: err.message, variant: "destructive" });
    } finally {
      setModuleGroupsLoading((prev) => ({ ...prev, [forType]: false }));
    }
  };

  const handleSelectGroupForType = async (type: ReportType, group: Group) => {
    setReportGroups((prev) => ({ ...prev, [type]: group }));
    setGroupPickerOpen(null);
    setGroupSearch("");

    if (!isConnected || !selectedDeviceId) return;
    setLoading("save");
    try {
      await invoke("config", {
        instanceId: selectedDeviceId,
        reportType: type,
        perTypeGroup: { id: group.id, name: group.name },
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

  const currentModuleGroups = groupPickerOpen ? moduleGroups[groupPickerOpen] : [];
  const filteredGroups = currentModuleGroups.filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase()));
  const isConnected = connStatus === "connected";
  const isPairing = connStatus === "pairing";
  const totalEventsSent = events.filter((e) => e.text.includes("enviado") || e.text.includes("enviada")).length;
  const activeReportsCount = Object.values(reportToggles).filter(Boolean).length;

  // ── Derived data for new layout ──
  const onlineDevices = devices.filter((d) => ["Connected", "Ready", "authenticated"].includes(d.status));
  const offlineDevices = devices.filter((d) => !["Connected", "Ready", "authenticated"].includes(d.status));

  // Active alerts: real issues requiring action now
  const activeAlerts = useMemo(() => {
    const alerts: Array<{ id: string; type: "error" | "warn"; icon: typeof AlertTriangle; message: string; detail?: string }> = [];

    // Offline devices
    offlineDevices.forEach((d) => {
      alerts.push({
        id: `offline-${d.id}`,
        type: "error",
        icon: WifiOff,
        message: `Instância "${d.name}" desconectada`,
        detail: d.updated_at ? `Desde ${formatDistanceToNow(new Date(d.updated_at), { locale: ptBR, addSuffix: true })}` : undefined,
      });
    });

    // Events with WARN/ERROR level from recent data
    events.forEach((ev) => {
      if (ev.level === "ERROR") {
        alerts.push({ id: ev.id, type: "error", icon: XCircle, message: ev.text });
      } else if (ev.level === "WARN" && !ev.text.includes("desconectada")) {
        alerts.push({ id: ev.id, type: "warn", icon: AlertTriangle, message: ev.text });
      }
    });

    return alerts.slice(0, 8); // limit
  }, [offlineDevices, events]);

  // Health status
  const healthStatus = useMemo(() => {
    const errorAlerts = activeAlerts.filter((a) => a.type === "error").length;
    const warnAlerts = activeAlerts.filter((a) => a.type === "warn").length;
    if (errorAlerts > 0) return "critical";
    if (warnAlerts > 0 || offlineDevices.length > 0) return "attention";
    return "stable";
  }, [activeAlerts, offlineDevices]);

  const healthConfig = {
    stable: { label: "Estável", color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/25", dot: "bg-emerald-400", glow: "shadow-emerald-500/10" },
    attention: { label: "Atenção", color: "text-amber-400", bg: "bg-amber-500/8", border: "border-amber-500/25", dot: "bg-amber-400 animate-pulse", glow: "shadow-amber-500/10" },
    critical: { label: "Crítico", color: "text-red-400", bg: "bg-red-500/8", border: "border-red-500/25", dot: "bg-red-400 animate-pulse", glow: "shadow-red-500/10" },
  };

  const health = healthConfig[healthStatus];

  return (
    <div className="space-y-6">

      {/* ═══════════════════════════════════════════
          1. SAÚDE GERAL DA ESTRUTURA
          ═══════════════════════════════════════════ */}
      <Card className={`overflow-hidden border ${health.border} shadow-xl ${health.glow} bg-card`}>
        <div className={`h-1.5 w-full ${
          healthStatus === "stable" ? "bg-emerald-500" :
          healthStatus === "attention" ? "bg-amber-500 animate-pulse" :
          "bg-red-500 animate-pulse"
        }`} />
        <CardContent className="p-8">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Centro de Monitoramento
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Visão operacional em tempo real
              </p>
            </div>
            <Badge className={`text-sm font-bold px-5 py-2.5 gap-2.5 shrink-0 border ${health.bg} ${health.color} ${health.border}`}>
              <span className={`w-3 h-3 rounded-full ${health.dot}`} />
              {health.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <HealthMetric
              icon={<Wifi className="w-4 h-4" />}
              label="Instâncias online"
              value={String(onlineDevices.length)}
              accent="emerald"
            />
            <HealthMetric
              icon={<WifiOff className="w-4 h-4" />}
              label="Instâncias offline"
              value={String(offlineDevices.length)}
              accent={offlineDevices.length > 0 ? "red" : "muted"}
            />
            <HealthMetric
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Alertas ativos"
              value={String(activeAlerts.length)}
              accent={activeAlerts.length > 0 ? "amber" : "muted"}
            />
            <HealthMetric
              icon={<Activity className="w-4 h-4" />}
              label="Oscilações detectadas"
              value={String(events.filter((e) => e.level === "WARN").length)}
              accent={events.filter((e) => e.level === "WARN").length > 0 ? "amber" : "muted"}
            />
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════
          2. INSTÂNCIAS MONITORADAS
          ═══════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Radio className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Instâncias Monitoradas
          </h2>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">{devices.length}</Badge>
        </div>

        {devices.length === 0 ? (
          <Card className="border border-border/30 bg-card">
            <CardContent className="py-12 text-center">
              <Smartphone className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma instância cadastrada.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {devices.map((device) => {
              const isOnline = ["Connected", "Ready", "authenticated"].includes(device.status);
              const statusLabel = isOnline ? "Conectado" : "Desconectado";
              const statusColor = isOnline ? "text-emerald-400" : "text-red-400";
              const dotColor = isOnline ? "bg-emerald-400" : "bg-red-400";
              const borderColor = isOnline ? "border-emerald-500/15" : "border-red-500/15";

              // Check if device has active warmup session
              const hasActiveCycle = false; // Simplified - would need warmup_sessions query

              return (
                <Card key={device.id} className={`border ${borderColor} bg-card hover:bg-muted/5 transition-colors`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{device.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{device.number || "Sem número"}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 shrink-0 ${statusColor} border-current/20`}>
                        {statusLabel}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Última atividade</p>
                        <p className="text-[11px] font-medium text-foreground mt-0.5">
                          {device.updated_at
                            ? formatDistanceToNow(new Date(device.updated_at), { locale: ptBR, addSuffix: true })
                            : "—"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Ciclo ativo</p>
                        <p className="text-[11px] font-medium text-foreground mt-0.5">—</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                          {isOnline ? "Status" : "Tempo offline"}
                        </p>
                        <p className={`text-[11px] font-medium mt-0.5 ${statusColor}`}>
                          {isOnline ? "Operando" : device.updated_at
                            ? formatDistanceToNow(new Date(device.updated_at), { locale: ptBR })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          3. ALERTAS ATIVOS
          ═══════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <ShieldAlert className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Alertas Ativos
          </h2>
          {activeAlerts.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1 text-red-400 border-red-500/20">
              {activeAlerts.length}
            </Badge>
          )}
        </div>

        {activeAlerts.length === 0 ? (
          <Card className="border border-emerald-500/15 bg-card">
            <CardContent className="py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-emerald-400">Nenhum alerta ativo no momento.</p>
              <p className="text-xs text-muted-foreground mt-1">Todas as instâncias estão operando normalmente.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeAlerts.map((alert) => {
              const AlertIcon = alert.icon;
              const isError = alert.type === "error";
              return (
                <Card key={alert.id} className={`border ${isError ? "border-red-500/20" : "border-amber-500/20"} bg-card`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isError ? "bg-red-500/10" : "bg-amber-500/10"
                    }`}>
                      <AlertIcon className={`w-4 h-4 ${isError ? "text-red-400" : "text-amber-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{alert.message}</p>
                      {alert.detail && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{alert.detail}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 shrink-0 ${
                      isError ? "text-red-400 border-red-500/20" : "text-amber-400 border-amber-500/20"
                    }`}>
                      {isError ? "Crítico" : "Atenção"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          4. RELATÓRIOS ATIVOS
          ═══════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Relatórios Ativos
          </h2>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
            {activeReportsCount} de 3
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(["warmup", "campaigns", "connection"] as ReportType[]).map((type) => {
            const meta = REPORT_META[type];
            const Icon = meta.icon;
            const group = reportGroups[type];
            const isActive = reportToggles[type];

            return (
              <Card key={type} className={`border transition-all ${isActive ? meta.borderColor : "border-border/30 opacity-50"} bg-card`}>
                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${meta.bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground">{meta.label}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{meta.description}</p>
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

                  {/* Status info when active */}
                  {isActive && (
                    <div className="space-y-3">
                      {/* Group selector */}
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        Grupo de destino
                      </p>

                      {group ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-primary/5 border border-primary/15">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                              <span className="text-xs font-semibold text-foreground truncate">{group.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-muted-foreground"
                                onClick={() => handleLoadGroups(type)} disabled={!isConnected || moduleGroupsLoading[type]}>
                                <RefreshCw className="w-3 h-3" /> Alterar
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => {
                                  setReportGroups((prev) => ({ ...prev, [type]: null }));
                                  invoke("config", {
                                    instanceId: selectedDeviceId, reportType: type,
                                    perTypeGroup: { id: "", name: "" }, frequency: "24h",
                                    toggleCampaigns: reportToggles.campaigns, toggleWarmup: reportToggles.warmup,
                                    toggleInstances: reportToggles.connection, alertDisconnect, alertCampaignEnd: true, alertHighFailures,
                                  }).catch(() => {});
                                }}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          {/* Report stats */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded-lg bg-muted/5 border border-border/20 text-center">
                              <p className="text-[9px] text-muted-foreground uppercase">Alertas enviados</p>
                              <p className="text-sm font-bold text-foreground">{totalEventsSent}</p>
                            </div>
                            <div className="p-2 rounded-lg bg-muted/5 border border-border/20 text-center">
                              <p className="text-[9px] text-muted-foreground uppercase">Último envio</p>
                              <p className="text-[11px] font-semibold text-foreground">
                                {events.length > 0 ? new Date(events[0].ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : !isConnected ? (
                        <p className="text-[10px] text-muted-foreground text-center py-3">
                          Conecte uma instância do WhatsApp para carregar seus grupos.
                        </p>
                      ) : (
                        <>
                          <Button variant="outline" className="w-full h-10 gap-2 text-xs"
                            onClick={() => handleLoadGroups(type)} disabled={moduleGroupsLoading[type]}>
                            {moduleGroupsLoading[type] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                            Carregar grupos
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Impact when disabled */}
                  {!isActive && (
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                      <p className="text-[10px] text-amber-400 font-medium">⚠ Relatório desativado</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Você não receberá alertas de {meta.label.toLowerCase()} no WhatsApp.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          5. NÚMERO DE RELATÓRIO + VER LOGS
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Device config */}
        <Card className="border border-border/30 bg-card">
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
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 shrink-0 whitespace-nowrap gap-1 ${
                    isConnected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : isPairing ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {isConnected ? <><Wifi className="w-2.5 h-2.5" /> Online</> :
                     isPairing ? <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Pareando</> :
                     <><WifiOff className="w-2.5 h-2.5" /> Offline</>}
                  </Badge>
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

                {isConnected && connPhone && (
                  <div className="mx-5 mb-2 flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-[10px] text-foreground">Conectado: <strong>{connPhone}</strong></span>
                  </div>
                )}

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

        {/* Ver Logs Completos */}
        <Card className="border border-border/30 bg-card flex flex-col justify-center">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto">
              <History className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Histórico Completo</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Acesse o log detalhado de todos os eventos, alertas e atividades do sistema.
              </p>
            </div>
            <Button
              className="gap-2"
              onClick={() => navigate("/dashboard/reports")}
            >
              <ExternalLink className="w-4 h-4" />
              Ver Logs Completos
            </Button>
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
                  <button key={d.id} onClick={() => setModalSelection(d.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/30 border border-transparent"
                    }`}>
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
            <Input placeholder="Buscar grupo..." value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)}
              className="pl-9 h-9 text-sm" autoFocus />
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground/60 font-mono">
              Instância: {selectedDevice?.name || selectedDeviceId?.slice(0, 8) || "—"} • {filteredGroups.length} grupo{filteredGroups.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center justify-end">
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                onClick={() => groupPickerOpen && handleLoadGroups(groupPickerOpen)}
                disabled={!!(groupPickerOpen && moduleGroupsLoading[groupPickerOpen])}>
                {groupPickerOpen && moduleGroupsLoading[groupPickerOpen] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Atualizar
              </Button>
            </div>
          </div>

          <div className="space-y-1 max-h-[320px] overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum grupo encontrado.</p>
            ) : (
              filteredGroups.map((g) => {
                const isCurrentlySelected = groupPickerOpen && reportGroups[groupPickerOpen]?.id === g.id;
                return (
                  <button key={g.id} onClick={() => groupPickerOpen && handleSelectGroupForType(groupPickerOpen, g)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      isCurrentlySelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/20 border border-transparent"
                    }`}>
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

/* ── Health Metric Component ── */
function HealthMetric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  const colors: Record<string, { text: string; bg: string }> = {
    emerald: { text: "text-emerald-400", bg: "bg-emerald-500/8" },
    red: { text: "text-red-400", bg: "bg-red-500/8" },
    amber: { text: "text-amber-400", bg: "bg-amber-500/8" },
    blue: { text: "text-blue-400", bg: "bg-blue-500/8" },
    muted: { text: "text-muted-foreground", bg: "bg-muted/10" },
  };
  const c = colors[accent] || colors.muted;

  return (
    <div className={`rounded-xl p-4 ${c.bg} border border-border/30`}>
      <div className={`mb-2 ${c.text}`}>{icon}</div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${c.text}`}>{value}</p>
    </div>
  );
}

export default ReportWhatsApp;
