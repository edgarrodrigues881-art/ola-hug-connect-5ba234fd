import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Wifi, WifiOff, CheckCircle2, Smartphone, Activity, AlertTriangle,
  XCircle, Flame, Megaphone, Zap, Clock, Radio, ShieldAlert,
  History, ExternalLink, HeartPulse, Pause, FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const MonitoringCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Devices ──
  const { data: devices = [] } = useQuery({
    queryKey: ["monitoring-devices", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("devices")
        .select("id, name, number, status, updated_at, created_at")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  // ── Warmup sessions (for cycle active) ──
  const { data: warmupSessions = [] } = useQuery({
    queryKey: ["monitoring-warmup", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("warmup_sessions")
        .select("id, device_id, status")
        .eq("user_id", user!.id)
        .eq("status", "running");
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // ── Campaigns (for paused alerts) ──
  const { data: campaigns = [] } = useQuery({
    queryKey: ["monitoring-campaigns", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("campaigns")
        .select("id, name, status")
        .eq("user_id", user!.id)
        .in("status", ["paused", "sending"]);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // ── Report config ──
  const { data: reportConfig } = useQuery({
    queryKey: ["monitoring-report-config", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("report_wa_configs")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // ── Notifications sent today ──
  const { data: todayNotifications = [] } = useQuery({
    queryKey: ["monitoring-notifications-today", user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("report_wa_logs")
        .select("id, created_at, message, level")
        .eq("user_id", user!.id)
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // ── Derived ──
  const onlineDevices = devices.filter((d) => ["Connected", "Ready", "authenticated"].includes(d.status));
  const offlineDevices = devices.filter((d) => !["Connected", "Ready", "authenticated"].includes(d.status));
  const pausedCampaigns = campaigns.filter((c) => c.status === "paused");

  const activeAlerts = useMemo(() => {
    const alerts: Array<{ id: string; type: "error" | "warn"; icon: typeof AlertTriangle; message: string; detail?: string }> = [];

    offlineDevices.forEach((d) => {
      alerts.push({
        id: `offline-${d.id}`,
        type: "error",
        icon: WifiOff,
        message: `Instância "${d.name}" desconectada`,
        detail: d.updated_at
          ? `Desde ${formatDistanceToNow(new Date(d.updated_at), { locale: ptBR, addSuffix: true })}`
          : undefined,
      });
    });

    pausedCampaigns.forEach((c) => {
      alerts.push({
        id: `paused-${c.id}`,
        type: "warn",
        icon: Pause,
        message: `Campanha "${c.name}" pausada`,
      });
    });

    return alerts.slice(0, 10);
  }, [offlineDevices, pausedCampaigns]);

  // Health
  const healthStatus = useMemo(() => {
    const errors = activeAlerts.filter((a) => a.type === "error").length;
    const warns = activeAlerts.filter((a) => a.type === "warn").length;
    if (errors > 0) return "critical";
    if (warns > 0 || offlineDevices.length > 0) return "attention";
    return "stable";
  }, [activeAlerts, offlineDevices]);

  const healthConfig = {
    stable: { label: "Estável", color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/25", dot: "bg-emerald-400", bar: "bg-emerald-500" },
    attention: { label: "Atenção", color: "text-amber-400", bg: "bg-amber-500/8", border: "border-amber-500/25", dot: "bg-amber-400 animate-pulse", bar: "bg-amber-500 animate-pulse" },
    critical: { label: "Crítico", color: "text-red-400", bg: "bg-red-500/8", border: "border-red-500/25", dot: "bg-red-400 animate-pulse", bar: "bg-red-500 animate-pulse" },
  };
  const health = healthConfig[healthStatus];

  // Oscillations: devices that recently changed status (simplified)
  const oscillations = 0; // Would need history tracking for real oscillation detection

  // Report toggles
  const reportActive = reportConfig
    ? (reportConfig.toggle_warmup || reportConfig.toggle_campaigns || reportConfig.toggle_instances)
    : false;

  return (
    <div className="space-y-8">

      {/* ═══════════════════════════════════════════
          1. SAÚDE GERAL DA ESTRUTURA
          ═══════════════════════════════════════════ */}
      <Card className={`overflow-hidden border-2 ${health.border} bg-card shadow-2xl`}>
        <div className={`h-2 w-full ${health.bar}`} />
        <CardContent className="p-8">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${health.bg} flex items-center justify-center`}>
                <HeartPulse className={`w-7 h-7 ${health.color}`} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  Centro de Monitoramento
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Visão operacional em tempo real da sua infraestrutura
                </p>
              </div>
            </div>
            <Badge className={`text-sm font-bold px-5 py-2.5 gap-2.5 shrink-0 border-2 ${health.bg} ${health.color} ${health.border}`}>
              <span className={`w-3.5 h-3.5 rounded-full ${health.dot}`} />
              {health.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <HealthMetric
              icon={<Wifi className="w-5 h-5" />}
              label="Instâncias online"
              value={String(onlineDevices.length)}
              accent="emerald"
            />
            <HealthMetric
              icon={<WifiOff className="w-5 h-5" />}
              label="Instâncias offline"
              value={String(offlineDevices.length)}
              accent={offlineDevices.length > 0 ? "red" : "muted"}
            />
            <HealthMetric
              icon={<AlertTriangle className="w-5 h-5" />}
              label="Alertas ativos"
              value={String(activeAlerts.length)}
              accent={activeAlerts.length > 0 ? "amber" : "muted"}
            />
            <HealthMetric
              icon={<Activity className="w-5 h-5" />}
              label="Oscilações detectadas"
              value={String(oscillations)}
              accent={oscillations > 0 ? "amber" : "muted"}
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
              const hasActiveCycle = warmupSessions.some((s) => s.device_id === device.id);

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
                        <p className={`text-[11px] font-medium mt-0.5 ${hasActiveCycle ? "text-emerald-400" : "text-muted-foreground"}`}>
                          {hasActiveCycle ? "Sim" : "Não"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                          {isOnline ? "Status" : "Tempo offline"}
                        </p>
                        <p className={`text-[11px] font-medium mt-0.5 ${statusColor}`}>
                          {isOnline
                            ? "Operando"
                            : device.updated_at
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
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            {
              key: "warmup" as const,
              label: "Aquecimento",
              icon: Flame,
              color: "text-orange-400",
              bgColor: "bg-orange-500/8",
              borderColor: "border-orange-500/20",
              description: "Relatório diário automático do ciclo de aquecimento",
              active: reportConfig?.toggle_warmup ?? false,
            },
            {
              key: "campaigns" as const,
              label: "Campanhas",
              icon: Megaphone,
              color: "text-blue-400",
              bgColor: "bg-blue-500/8",
              borderColor: "border-blue-500/20",
              description: "Alertas ao iniciar, pausar ou finalizar campanhas",
              active: reportConfig?.toggle_campaigns ?? false,
            },
            {
              key: "connection" as const,
              label: "Status de Conexão",
              icon: Zap,
              color: "text-emerald-400",
              bgColor: "bg-emerald-500/8",
              borderColor: "border-emerald-500/20",
              description: "Alertas de conexão e desconexão em tempo real",
              active: reportConfig?.toggle_instances ?? false,
            },
          ].map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.key} className={`border transition-all ${report.active ? report.borderColor : "border-border/30 opacity-50"} bg-card`}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${report.bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${report.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground">{report.label}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{report.description}</p>
                    </div>
                  </div>

                  {report.active ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-muted/5 border border-border/20 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">Alertas enviados</p>
                        <p className="text-sm font-bold text-foreground">
                          {todayNotifications.filter((n) => n.message?.toLowerCase().includes(report.key)).length || todayNotifications.length}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-muted/5 border border-border/20 text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">Último envio</p>
                        <p className="text-[11px] font-semibold text-foreground">
                          {todayNotifications.length > 0
                            ? new Date(todayNotifications[0].created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                      <p className="text-[10px] text-amber-400 font-medium">⚠ Relatório desativado</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Alertas de {report.label.toLowerCase()} não estão sendo enviados via WhatsApp.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] text-muted-foreground">
                      {report.active ? "Ativo" : "Inativo"}
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${
                      report.active ? "text-emerald-400 border-emerald-500/20" : "text-muted-foreground border-border/30"
                    }`}>
                      {report.active ? "Ativado" : "Desativado"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          5. VER LOGS COMPLETOS
          ═══════════════════════════════════════════ */}
      <Card className="border border-border/30 bg-card">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto">
            <History className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Histórico Completo</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Acesse o log detalhado de todos os eventos, alertas e atividades do sistema.
            </p>
          </div>
          <Button className="gap-2" onClick={() => navigate("/dashboard/notifications")}>
            <ExternalLink className="w-4 h-4" />
            Ver Logs Completos
          </Button>
        </CardContent>
      </Card>
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
    <div className={`rounded-xl p-5 ${c.bg} border border-border/30`}>
      <div className={`mb-2 ${c.text}`}>{icon}</div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold tracking-tight ${c.text}`}>{value}</p>
    </div>
  );
}

export default MonitoringCenter;
