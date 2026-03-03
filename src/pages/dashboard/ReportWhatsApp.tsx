import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Radio, RefreshCw, Flame, Megaphone, Plug, Loader2 } from "lucide-react";

interface WhatsAppGroup {
  id: string;
  name: string;
}

export default function ReportWhatsApp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);

  // Fetch config
  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ["report-wa-config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_wa_configs")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch devices
  const { data: devices = [] } = useQuery({
    queryKey: ["devices-for-report", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("devices")
        .select("id, name, number, status, uazapi_token, uazapi_base_url")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const connectedDevices = devices.filter(
    (d) => d.status === "Ready" && d.uazapi_token && d.uazapi_base_url
  );

  // Fetch groups from connected device
  const fetchGroups = async (deviceId: string) => {
    setLoadingGroups(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whapi-chats?action=list_chats&device_id=${deviceId}&count=200`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const json = await res.json();
      const chats = json.chats || [];
      // Filter only groups (JID ends with @g.us or has isGroup flag)
      const groupChats: WhatsAppGroup[] = chats
        .filter((c: any) => {
          const jid = c.id || c.jid || c.chatId || "";
          return jid.includes("@g.us") || c.isGroup === true;
        })
        .map((c: any) => ({
          id: c.id || c.jid || c.chatId || "",
          name: c.name || c.subject || c.title || c.id || "Grupo sem nome",
        }));
      setGroups(groupChats);
      if (groupChats.length === 0) {
        toast.info("Nenhum grupo encontrado neste WhatsApp");
      } else {
        toast.success(`${groupChats.length} grupos carregados`);
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
      toast.error("Erro ao buscar grupos do WhatsApp");
    } finally {
      setLoadingGroups(false);
    }
  };

  // Auto-fetch groups when device is set
  useEffect(() => {
    if (config?.device_id && connectedDevices.some((d) => d.id === config.device_id)) {
      fetchGroups(config.device_id);
    }
  }, [config?.device_id, connectedDevices.length]);

  // Upsert config
  const upsertConfig = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (config?.id) {
        const { error } = await supabase
          .from("report_wa_configs")
          .update(updates)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("report_wa_configs")
          .insert({ user_id: user!.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-wa-config"] });
      toast.success("Configuração salva");
    },
    onError: () => toast.error("Erro ao salvar configuração"),
  });

  const handleToggle = (field: string, value: boolean) => {
    upsertConfig.mutate({ [field]: value });
  };

  const handleGroupSelect = (field: string, nameField: string, groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    upsertConfig.mutate({ [field]: groupId, [nameField]: group?.name || "" });
  };

  const handleDeviceSelect = (deviceId: string) => {
    upsertConfig.mutate({ device_id: deviceId });
    fetchGroups(deviceId);
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedDeviceName = devices.find((d) => d.id === config?.device_id)?.name;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Radio className="w-6 h-6 text-primary" />
          Central de Alertas
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure alertas automáticos via WhatsApp sobre suas operações.
        </p>
      </div>

      {/* Device selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 w-full">
              <Label className="text-sm font-medium mb-2 block">
                Instância para envio de relatórios
              </Label>
              <Select
                value={config?.device_id || ""}
                onValueChange={handleDeviceSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância conectada" />
                </SelectTrigger>
                <SelectContent>
                  {connectedDevices.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhuma instância conectada
                    </SelectItem>
                  ) : (
                    connectedDevices.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} {d.number ? `(${d.number})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => config?.device_id && fetchGroups(config.device_id)}
              disabled={!config?.device_id || loadingGroups}
              className="mt-5 sm:mt-0"
            >
              {loadingGroups ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Atualizar grupos
            </Button>
          </div>
          {groups.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {groups.length} grupos encontrados
            </p>
          )}
        </CardContent>
      </Card>

      {/* 3 Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Aquecimento */}
        <AlertCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          title="Relatórios de Aquecimento"
          color="orange"
          groups={groups}
          selectedGroupId={config?.warmup_group_id || ""}
          selectedGroupName={config?.warmup_group_name || ""}
          onGroupSelect={(id) =>
            handleGroupSelect("warmup_group_id", "warmup_group_name", id)
          }
          enabled={config?.toggle_warmup ?? false}
          onToggle={(v) => handleToggle("toggle_warmup", v)}
          loadingGroups={loadingGroups}
          extraContent={
            <div>
              <Label className="text-xs font-medium mb-1.5 block">Frequência</Label>
              <Select
                value={config?.frequency || "1h"}
                onValueChange={(v) => upsertConfig.mutate({ frequency: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hora</SelectItem>
                  <SelectItem value="6h">6 horas</SelectItem>
                  <SelectItem value="12h">12 horas</SelectItem>
                  <SelectItem value="24h">24 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          previewMessage={`🔥 RELATÓRIO DE AQUECIMENTO

Instância: {nome_instancia}
Número: {numero}

Mensagens enviadas: {msgs_enviadas}
Mensagens recebidas: {msgs_recebidas}

Fotos enviadas: {fotos}
Áudios enviados: {audios}

Status postados: {status}

Interações em grupos: {grupos_interacoes}

Última atividade: {ultima_atividade}

Status atual: {online_offline}`}
        />

        {/* 2. Campanhas */}
        <AlertCard
          icon={<Megaphone className="w-5 h-5 text-blue-500" />}
          title="Relatórios de Campanhas"
          color="blue"
          groups={groups}
          selectedGroupId={config?.campaigns_group_id || ""}
          selectedGroupName={config?.campaigns_group_name || ""}
          onGroupSelect={(id) =>
            handleGroupSelect("campaigns_group_id", "campaigns_group_name", id)
          }
          enabled={config?.toggle_campaigns ?? false}
          onToggle={(v) => handleToggle("toggle_campaigns", v)}
          loadingGroups={loadingGroups}
          extraContent={
            <div className="space-y-2">
              <Label className="text-xs font-medium block">Eventos</Label>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Fim de campanha</span>
                <Switch
                  checked={config?.alert_campaign_end ?? true}
                  onCheckedChange={(v) => handleToggle("alert_campaign_end", v)}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Alerta de falhas</span>
                <Switch
                  checked={config?.alert_high_failures ?? false}
                  onCheckedChange={(v) => handleToggle("alert_high_failures", v)}
                  className="scale-75"
                />
              </div>
            </div>
          }
          previewMessage={`📣 CAMPANHA FINALIZADA

Campanha: {nome_campanha}

Total de contatos: {total}

Enviadas: {enviadas}
Entregues: {entregues}

Falhas: {falhas}

Pendentes: {pendentes}

Tempo total: {tempo_execucao}

Status: Concluída`}
        />

        {/* 3. Conexões */}
        <AlertCard
          icon={<Plug className="w-5 h-5 text-emerald-500" />}
          title="Alertas de Conexão"
          color="emerald"
          groups={groups}
          selectedGroupId={config?.connection_group_id || ""}
          selectedGroupName={config?.connection_group_name || ""}
          onGroupSelect={(id) =>
            handleGroupSelect("connection_group_id", "connection_group_name", id)
          }
          enabled={config?.alert_disconnect ?? false}
          onToggle={(v) => handleToggle("alert_disconnect", v)}
          loadingGroups={loadingGroups}
          extraContent={
            <div className="space-y-2">
              <Label className="text-xs font-medium block">Eventos</Label>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Instância conectada</span>
                <Switch
                  checked={config?.toggle_instances ?? true}
                  onCheckedChange={(v) => handleToggle("toggle_instances", v)}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Instância desconectada</span>
                <Switch
                  checked={config?.alert_disconnect ?? true}
                  onCheckedChange={(v) => handleToggle("alert_disconnect", v)}
                  className="scale-75"
                />
              </div>
            </div>
          }
          previewMessage={`⚠️ AVISO IMPORTANTE

Instância: {nome_instancia}

Número: {numero}

Status: ❌ Desconectado

Horário: {hora_evento}

A reconexão é necessária para continuar operações.`}
        />
      </div>
    </div>
  );
}

// ─── Reusable AlertCard ───
interface AlertCardProps {
  icon: React.ReactNode;
  title: string;
  color: string;
  groups: WhatsAppGroup[];
  selectedGroupId: string;
  selectedGroupName: string;
  onGroupSelect: (id: string) => void;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  loadingGroups: boolean;
  extraContent?: React.ReactNode;
  previewMessage: string;
}

function AlertCard({
  icon,
  title,
  groups,
  selectedGroupId,
  selectedGroupName,
  onGroupSelect,
  enabled,
  onToggle,
  loadingGroups,
  extraContent,
  previewMessage,
}: AlertCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {/* Group selector */}
        <div>
          <Label className="text-xs font-medium mb-1.5 block">Selecionar Grupo</Label>
          <Select value={selectedGroupId} onValueChange={onGroupSelect}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={loadingGroups ? "Carregando..." : "Selecione um grupo"} />
            </SelectTrigger>
            <SelectContent>
              {groups.length === 0 ? (
                <SelectItem value="none" disabled>
                  {loadingGroups ? "Carregando grupos..." : "Conecte uma instância primeiro"}
                </SelectItem>
              ) : (
                groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedGroupName && (
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              Grupo: {selectedGroupName}
            </p>
          )}
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">Ativar envio</Label>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>

        {/* Extra content (frequency, events) */}
        {extraContent}

        {/* Preview toggle */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground px-0 h-auto"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? "Ocultar preview" : "Ver preview da mensagem"}
          </Button>
          {showPreview && (
            <div className="mt-2 p-3 rounded-lg bg-muted/50 border text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/80">
              {previewMessage}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
