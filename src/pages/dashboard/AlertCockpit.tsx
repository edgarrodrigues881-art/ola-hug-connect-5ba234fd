import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Radio, Plug, Megaphone, Flame, AlertTriangle, CheckCircle2,
  Clock, Filter, Copy, RefreshCw, Send, Eye, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Alert = {
  id: string;
  created_at: string;
  type: string;
  severity: string;
  instance_name: string | null;
  phone_number: string | null;
  campaign_name: string | null;
  message_rendered: string;
  payload_json: any;
  whatsapp_sent: boolean;
  whatsapp_group_id: string | null;
  whatsapp_sent_at: string | null;
  whatsapp_error: string | null;
  resolved: boolean;
  resolved_at: string | null;
  instance_id: string | null;
  campaign_id: string | null;
  user_id: string;
};

const TYPE_META: Record<string, { icon: React.ReactNode; label: string; category: string }> = {
  INSTANCE_CONNECTED: { icon: <Plug className="w-4 h-4 text-emerald-500" />, label: "Instância conectada", category: "Conexões" },
  INSTANCE_DISCONNECTED: { icon: <Plug className="w-4 h-4 text-destructive" />, label: "Instância desconectada", category: "Conexões" },
  QRCODE_GENERATED: { icon: <Plug className="w-4 h-4 text-yellow-500" />, label: "QR Code gerado", category: "Conexões" },
  CAMPAIGN_STARTED: { icon: <Megaphone className="w-4 h-4 text-blue-500" />, label: "Campanha iniciada", category: "Campanhas" },
  CAMPAIGN_PAUSED: { icon: <Megaphone className="w-4 h-4 text-yellow-500" />, label: "Campanha pausada", category: "Campanhas" },
  CAMPAIGN_FINISHED: { icon: <Megaphone className="w-4 h-4 text-emerald-500" />, label: "Campanha finalizada", category: "Campanhas" },
  CAMPAIGN_ERROR: { icon: <AlertTriangle className="w-4 h-4 text-destructive" />, label: "Erro na campanha", category: "Campanhas" },
  HIGH_FAILURE_RATE: { icon: <AlertTriangle className="w-4 h-4 text-destructive" />, label: "Alta taxa de falhas", category: "Campanhas" },
  WARMUP_REPORT_24H: { icon: <Flame className="w-4 h-4 text-orange-500" />, label: "Relatório de aquecimento", category: "Aquecimento" },
  TEST_ALERT: { icon: <Radio className="w-4 h-4 text-primary" />, label: "Alerta de teste", category: "Teste" },
};

const SEVERITY_COLORS: Record<string, string> = {
  INFO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  WARNING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  CRITICAL: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AlertCockpit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("24h");

  const periodMs: Record<string, number> = {
    "1h": 3600000,
    "24h": 86400000,
    "7d": 604800000,
  };

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["alerts", user?.id, filterPeriod],
    queryFn: async () => {
      const since = new Date(Date.now() - (periodMs[filterPeriod] || 86400000)).toISOString();
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", user!.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as Alert[];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Get notification instance status
  const { data: reportConfig } = useQuery({
    queryKey: ["report-wa-config", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("report_wa_configs")
        .select("device_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: notifDevice } = useQuery({
    queryKey: ["notif-device", reportConfig?.device_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("devices")
        .select("id, status, name")
        .eq("id", reportConfig!.device_id!)
        .single();
      return data;
    },
    enabled: !!reportConfig?.device_id,
  });

  const isMonitoringActive = notifDevice?.status === "Ready";

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      if (filterType !== "all") {
        const cat = TYPE_META[a.type]?.category;
        if (filterType === "Erros" && !["CAMPAIGN_ERROR", "HIGH_FAILURE_RATE"].includes(a.type)) return false;
        if (filterType !== "Erros" && cat !== filterType) return false;
      }
      if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
      return true;
    });
  }, [alerts, filterType, filterSeverity]);

  // Counters for last 24h
  const counters = useMemo(() => {
    const now = Date.now();
    const day = alerts.filter((a) => now - new Date(a.created_at).getTime() < 86400000);
    return {
      connections: day.filter((a) => a.type === "INSTANCE_CONNECTED").length,
      disconnections: day.filter((a) => a.type === "INSTANCE_DISCONNECTED").length,
      campaigns: {
        started: day.filter((a) => a.type === "CAMPAIGN_STARTED").length,
        paused: day.filter((a) => a.type === "CAMPAIGN_PAUSED").length,
        finished: day.filter((a) => a.type === "CAMPAIGN_FINISHED").length,
      },
      errors: day.filter((a) => ["CAMPAIGN_ERROR", "HIGH_FAILURE_RATE"].includes(a.type)).length,
    };
  }, [alerts]);

  const markResolved = async (alert: Alert) => {
    await supabase
      .from("alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString() } as any)
      .eq("id", alert.id);
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
    setSelectedAlert(null);
    toast.success("Alerta marcado como resolvido");
  };

  const copyMessage = (msg: string) => {
    navigator.clipboard.writeText(msg);
    toast.success("Mensagem copiada");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="w-6 h-6 text-primary" />
            Cockpit de Alertas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Todos os eventos críticos do sistema em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMonitoringActive ? (
            <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
              <ShieldCheck className="w-3.5 h-3.5" /> Monitoramento ativo
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 border-destructive/30 text-destructive bg-destructive/10">
              <ShieldAlert className="w-3.5 h-3.5" /> Instância desconectada
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["alerts"] })}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Plug className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counters.connections}</p>
              <p className="text-[11px] text-muted-foreground">Conexões</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Plug className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counters.disconnections}</p>
              <p className="text-[11px] text-muted-foreground">Desconexões</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Megaphone className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {counters.campaigns.started + counters.campaigns.paused + counters.campaigns.finished}
              </p>
              <p className="text-[11px] text-muted-foreground">Campanhas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counters.errors}</p>
              <p className="text-[11px] text-muted-foreground">Erros / Falhas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Conexões">Conexões</SelectItem>
            <SelectItem value="Campanhas">Campanhas</SelectItem>
            <SelectItem value="Aquecimento">Aquecimento</SelectItem>
            <SelectItem value="Erros">Erros</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="INFO">INFO</SelectItem>
            <SelectItem value="WARNING">WARNING</SelectItem>
            <SelectItem value="CRITICAL">CRITICAL</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">1 hora</SelectItem>
            <SelectItem value="24h">24 horas</SelectItem>
            <SelectItem value="7d">7 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alert Feed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Alertas ({filtered.length})</span>
            <span className="text-[11px] font-normal text-muted-foreground">Últimas {filterPeriod === "1h" ? "1 hora" : filterPeriod === "24h" ? "24 horas" : "7 dias"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum alerta encontrado neste período.
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="divide-y divide-border">
                {filtered.map((alert) => {
                  const meta = TYPE_META[alert.type] || { icon: <Radio className="w-4 h-4" />, label: alert.type, category: "Outro" };
                  return (
                    <button
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-start gap-3 ${alert.resolved ? "opacity-50" : ""}`}
                    >
                      <div className="mt-0.5 shrink-0">{meta.icon}</div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{meta.label}</span>
                          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${SEVERITY_COLORS[alert.severity] || ""}`}>
                            {alert.severity}
                          </Badge>
                          {alert.resolved && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Resolvido</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {alert.instance_name && `${alert.instance_name}`}
                          {alert.phone_number && ` (${alert.phone_number})`}
                          {alert.campaign_name && ` • ${alert.campaign_name}`}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR })}
                          {alert.whatsapp_sent ? (
                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 gap-0.5 border-emerald-500/20 text-emerald-500">
                              <CheckCircle2 className="w-2.5 h-2.5" /> WhatsApp
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] h-3.5 px-1 text-muted-foreground/60">
                              Não enviado
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Eye className="w-3.5 h-3.5 text-muted-foreground/40 mt-1 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedAlert && TYPE_META[selectedAlert.type]?.icon}
              {selectedAlert && TYPE_META[selectedAlert.type]?.label}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedAlert && new Date(selectedAlert.created_at).toLocaleString("pt-BR")}
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`${SEVERITY_COLORS[selectedAlert.severity]}`}>
                  {selectedAlert.severity}
                </Badge>
                {selectedAlert.whatsapp_sent ? (
                  <Badge variant="outline" className="border-emerald-500/20 text-emerald-500 gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Enviado via WhatsApp
                    {selectedAlert.whatsapp_sent_at && (
                      <span className="text-[10px] ml-1">
                        {new Date(selectedAlert.whatsapp_sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Não enviado via WhatsApp</Badge>
                )}
                {selectedAlert.resolved && (
                  <Badge variant="secondary">Resolvido</Badge>
                )}
              </div>

              {selectedAlert.whatsapp_error && (
                <div className="text-xs text-destructive bg-destructive/5 p-2 rounded">
                  Erro WhatsApp: {selectedAlert.whatsapp_error}
                </div>
              )}

              {/* Rendered message */}
              <div className="bg-muted/40 border rounded-lg p-3">
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                  {selectedAlert.message_rendered}
                </p>
              </div>

              {/* Context */}
              <div className="space-y-1 text-xs text-muted-foreground">
                {selectedAlert.instance_name && <p>Instância: {selectedAlert.instance_name}</p>}
                {selectedAlert.phone_number && <p>Número: {selectedAlert.phone_number}</p>}
                {selectedAlert.campaign_name && <p>Campanha: {selectedAlert.campaign_name}</p>}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => copyMessage(selectedAlert.message_rendered)}
                >
                  <Copy className="w-3 h-3" /> Copiar mensagem
                </Button>
                {!selectedAlert.resolved && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => markResolved(selectedAlert)}
                  >
                    <CheckCircle2 className="w-3 h-3" /> Marcar como resolvido
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
