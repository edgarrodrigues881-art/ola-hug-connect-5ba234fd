import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Radio, RefreshCw, Flame, Megaphone, Plug, Loader2, Send, CheckCircle2, Eye, Smartphone, Users, Clock, Zap } from "lucide-react";

interface WhatsAppGroup {
  id: string;
  name: string;
  participants?: number;
}

export default function ReportWhatsApp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [sendingTest, setSendingTest] = useState(false);

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

  const selectedDevice = devices.find((d) => d.id === config?.device_id);
  const isConnected = selectedDevice?.status === "Ready";

  const fetchGroups = async (deviceId: string) => {
    setLoadingGroups(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whapi-chats?action=list_chats&device_id=${deviceId}&count=200`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      const json = await res.json();
      const chats = json.chats || [];
      const groupChats: WhatsAppGroup[] = chats
        .filter((c: any) => {
          const jid = c.id || c.jid || c.chatId || "";
          return jid.includes("@g.us") || c.isGroup === true;
        })
        .map((c: any) => ({
          id: c.id || c.jid || c.chatId || "",
          name: c.name || c.subject || c.title || c.id || "Grupo sem nome",
          participants: c.participants?.length || c.participantsCount || c.size || undefined,
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

  const sendTestMessage = async () => {
    if (!config?.device_id) return;
    setSendingTest(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const testGroupId = config?.warmup_group_id || config?.campaigns_group_id || config?.connection_group_id;
      if (!testGroupId) {
        toast.error("Selecione ao menos um grupo antes de enviar teste");
        setSendingTest(false);
        return;
      }
      const testGroupName = groups.find(g => g.id === testGroupId)?.name || testGroupId;
      const message = `[TESTE DE MONITORAMENTO]\n\nSistema de alertas ativo.\n\nInstância: ${selectedDevice?.name || "—"}\nNúmero: ${selectedDevice?.number || "—"}\n\nGrupo configurado: ${testGroupName}\n\nCentral de monitoramento funcionando corretamente.`;

      let whatsappSent = false;
      let whatsappError: string | null = null;
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whapi-chats?action=send_message&device_id=${config.device_id}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ to: testGroupId, message }),
          }
        );
        whatsappSent = true;
      } catch (e: any) {
        whatsappError = e?.message || "Erro ao enviar";
      }

      // Register alert in cockpit
      await supabase.from("alerts").insert({
        user_id: user!.id,
        type: "TEST_ALERT" as any,
        severity: "INFO" as any,
        instance_name: selectedDevice?.name || null,
        phone_number: selectedDevice?.number || null,
        instance_id: config.device_id,
        message_rendered: message,
        whatsapp_sent: whatsappSent,
        whatsapp_group_id: testGroupId,
        whatsapp_sent_at: whatsappSent ? new Date().toISOString() : null,
        whatsapp_error: whatsappError,
      });

      toast.success(whatsappSent ? "Alerta de teste enviado!" : "Alerta registrado (WhatsApp falhou)");
    } catch {
      toast.error("Erro ao enviar alerta de teste");
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    if (config?.device_id && connectedDevices.some((d) => d.id === config.device_id)) {
      fetchGroups(config.device_id);
    }
  }, [config?.device_id, connectedDevices.length]);

  const upsertConfig = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (config?.id) {
        const { error } = await supabase.from("report_wa_configs").update(updates).eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("report_wa_configs").insert({ user_id: user!.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-wa-config"] });
      toast.success("Configuração salva");
    },
    onError: () => toast.error("Erro ao salvar configuração"),
  });

  const handleToggle = (field: string, value: boolean) => upsertConfig.mutate({ [field]: value });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="w-6 h-6 text-primary" />
            Central de Alertas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure alertas automáticos via WhatsApp sobre suas operações.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={sendTestMessage}
          disabled={sendingTest || !config?.device_id}
          className="gap-1.5 self-start"
        >
          {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Enviar alerta de teste
        </Button>
      </div>

      {/* Instância de Notificação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Instância de Notificação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 w-full">
              <Select value={config?.device_id || ""} onValueChange={handleDeviceSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância conectada" />
                </SelectTrigger>
                <SelectContent>
                  {connectedDevices.length === 0 ? (
                    <SelectItem value="none" disabled>Nenhuma instância conectada</SelectItem>
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
          </div>

          {selectedDevice && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 rounded-lg bg-muted/40 border">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">WhatsApp conectado:</span>
                  <span className="font-medium">{selectedDevice.number || "Sem número"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  {isConnected ? (
                    <Badge variant="outline" className="gap-1 text-xs border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Conectado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-xs border-destructive/30 text-destructive bg-destructive/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" /> Desconectado
                    </Badge>
                  )}
                </div>
                {groups.length > 0 && (
                  <p className="text-xs text-muted-foreground">{groups.length} grupos encontrados</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => config?.device_id && fetchGroups(config.device_id)}
                disabled={!config?.device_id || loadingGroups}
              >
                {loadingGroups ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                Atualizar grupos
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3 Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aquecimento */}
        <AlertCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          title="Relatórios de Aquecimento"
          description="Relatórios enviados automaticamente após cada ciclo de aquecimento (24h)."
          groups={groups}
          selectedGroupId={config?.warmup_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("warmup_group_id", "warmup_group_name", id)}
          enabled={config?.toggle_warmup ?? false}
          onToggle={(v) => handleToggle("toggle_warmup", v)}
          loadingGroups={loadingGroups}
          infoItems={[
            { icon: <Clock className="w-3.5 h-3.5" />, text: "Frequência automática: 24 horas" },
          ]}
          monitoredEvents={[
            "Ciclo de aquecimento concluído",
          ]}
          previewMessage={`🔥 RELATÓRIO DE AQUECIMENTO (24H)\n\nInstância: ${selectedDevice?.name || "{nome_instancia}"}\nNúmero: ${selectedDevice?.number || "{numero}"}\n\n📊 Atividades registradas\n\n📨 Mensagens enviadas: {msgs_enviadas}\n📩 Mensagens recebidas: {msgs_recebidas}\n\n🖼 Fotos enviadas: {fotos}\n🎧 Áudios enviados: {audios}\n\n🟢 Status postados: {status}\n👥 Interações em grupos: {grupos_interacoes}\n\n⏱ Última atividade registrada:\n{ultima_atividade}\n\n🔎 Status atual da instância:\n${isConnected ? "🟢 Online" : "🔴 Offline"}\n\nRelatório gerado automaticamente após o ciclo de aquecimento de 24h.`}
        />

        {/* Campanhas */}
        <AlertCard
          icon={<Megaphone className="w-5 h-5 text-blue-500" />}
          title="Relatórios de Campanhas"
          description="Alertas enviados automaticamente quando eventos da campanha ocorrem."
          groups={groups}
          selectedGroupId={config?.campaigns_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("campaigns_group_id", "campaigns_group_name", id)}
          enabled={config?.toggle_campaigns ?? false}
          onToggle={(v) => handleToggle("toggle_campaigns", v)}
          loadingGroups={loadingGroups}
          infoItems={[
            { icon: <Zap className="w-3.5 h-3.5" />, text: "Tempo médio de envio: < 10 segundos" },
          ]}
          monitoredEvents={[
            "Campanha iniciada",
            "Campanha pausada",
            "Campanha finalizada",
            "Falhas detectadas",
          ]}
          previewMessage={`📣 CAMPANHA FINALIZADA\n\nCampanha: {nome_campanha}\n\n📊 Resultado da campanha\n\n👥 Total de contatos: {total}\n\n✅ Mensagens enviadas: {enviadas}\n📬 Mensagens entregues: {entregues}\n\n❌ Falhas registradas: {falhas}\n⏳ Pendentes: {pendentes}\n\n⏱ Tempo total de execução:\n{tempo_execucao}\n\nStatus da campanha: Concluída`}
        />

        {/* Conexão */}
        <AlertCard
          icon={<Plug className="w-5 h-5 text-emerald-500" />}
          title="Alertas de Conexão"
          description="Alertas enviados automaticamente quando o status da instância muda."
          groups={groups}
          selectedGroupId={config?.connection_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("connection_group_id", "connection_group_name", id)}
          enabled={config?.alert_disconnect ?? false}
          onToggle={(v) => handleToggle("alert_disconnect", v)}
          loadingGroups={loadingGroups}
          infoItems={[
            { icon: <Zap className="w-3.5 h-3.5" />, text: "Tempo médio de envio: < 5 segundos" },
          ]}
          monitoredEvents={[
            "Instância conectada",
            "Instância desconectada",
            "QR Code gerado",
          ]}
          previewMessage={`⚠️ ALERTA DE CONEXÃO\n\nInstância: ${selectedDevice?.name || "{nome_instancia}"}\nNúmero: ${selectedDevice?.number || "{numero}"}\n\n❌ Status: Desconectado\n\n⏱ Horário da ocorrência:\n${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\n\nA instância perdeu conexão com o WhatsApp.\n\nPara continuar utilizando o sistema,\né necessário realizar a reconexão.`}
        />
      </div>
    </div>
  );
}

// ─── Alert Card ───
interface AlertCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  groups: WhatsAppGroup[];
  selectedGroupId: string;
  onGroupSelect: (id: string) => void;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  loadingGroups: boolean;
  infoItems: { icon: React.ReactNode; text: string }[];
  monitoredEvents: string[];
  previewMessage: string;
}

function AlertCard({
  icon, title, description, groups, selectedGroupId,
  onGroupSelect, enabled, onToggle, loadingGroups, infoItems, monitoredEvents, previewMessage,
}: AlertCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">{icon}{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
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
                      <div className="flex items-center gap-2">
                        <span>{g.name}</span>
                        {g.participants && (
                          <span className="text-muted-foreground flex items-center gap-0.5">
                            <Users className="w-3 h-3" />{g.participants}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedGroup && (
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-[11px] text-muted-foreground truncate">{selectedGroup.name}</p>
                {selectedGroup.participants && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5">
                    <Users className="w-2.5 h-2.5" />{selectedGroup.participants}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/30">
            <Label className="text-xs font-medium">Ativar envio</Label>
            <Switch checked={enabled} onCheckedChange={onToggle} />
          </div>

          {/* Info items */}
          <div className="space-y-1.5">
            {infoItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                {item.icon}
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Monitored events */}
          <div>
            <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Eventos monitorados</Label>
            <div className="space-y-1">
              {monitoredEvents.map((evt) => (
                <div key={evt} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>{evt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5 mt-auto"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="w-3.5 h-3.5" />
            Visualizar mensagem
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp-style Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <div className="bg-[#075E54] p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Central de Alertas</p>
              <p className="text-white/70 text-[11px]">online</p>
            </div>
          </div>
          <div className="bg-[#ECE5DD] dark:bg-[#0B141A] p-4 min-h-[200px]">
            <div className="bg-white dark:bg-[#1F2C34] rounded-lg p-3 shadow-sm max-w-[90%] ml-auto">
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#111B21] dark:text-[#E9EDEF]">
                {previewMessage}
              </p>
              <p className="text-[10px] text-[#667781] dark:text-[#8696A0] text-right mt-1.5 flex items-center justify-end gap-1">
                {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                <CheckCircle2 className="w-3 h-3 text-[#53BDEB]" />
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
