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
import { Radio, RefreshCw, Flame, Megaphone, Plug, Loader2, Send, CheckCircle2, Eye, Smartphone, Users, Clock, Zap, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const [creatingInstance, setCreatingInstance] = useState(false);
  const navigate = useNavigate();

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

  // Dedicated report device
  const { data: reportDevice, isLoading: loadingDevice } = useQuery({
    queryKey: ["report-device", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("devices")
        .select("id, name, number, status, uazapi_token, uazapi_base_url, login_type")
        .eq("user_id", user!.id)
        .eq("login_type", "report_wa")
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const isConnected = reportDevice?.status === "Ready";

  const handleCreateReportInstance = async () => {
    if (!user) return;
    setCreatingInstance(true);
    try {
      const { data, error } = await supabase.from("devices").insert({
        user_id: user.id,
        name: "Relatorio Via Whatsapp",
        login_type: "report_wa",
        status: "Disconnected",
      } as any).select().single();
      if (error) throw error;
      
      // Link to config
      if (data) {
        await upsertConfig.mutateAsync({ device_id: data.id });
      }
      queryClient.invalidateQueries({ queryKey: ["report-device"] });
      toast.success("Instância de relatório criada");
    } catch (err: any) {
      console.error("Error creating report instance:", err);
      toast.error(err.message || "Erro ao criar instância");
    } finally {
      setCreatingInstance(false);
    }
  };

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
      const message = `[TESTE DE MONITORAMENTO]\n\nSistema de alertas ativo.\n\nInstância: ${reportDevice?.name || "—"}\nNúmero: ${reportDevice?.number || "—"}\n\nGrupo configurado: ${testGroupName}\n\nCentral de monitoramento funcionando corretamente.`;

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
        instance_name: reportDevice?.name || null,
        phone_number: reportDevice?.number || null,
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
    if (reportDevice?.id && reportDevice?.status === "Ready") {
      fetchGroups(reportDevice.id);
    }
  }, [reportDevice?.id, reportDevice?.status]);

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




  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getCardStatus = (enabled: boolean, groupId: string | null | undefined) => {
    if (!enabled) return "off" as const;
    if (!groupId) return "incomplete" as const;
    return "active" as const;
  };

  const warmupStatus = getCardStatus(config?.toggle_warmup ?? false, config?.warmup_group_id);
  const campaignsStatus = getCardStatus(config?.toggle_campaigns ?? false, config?.campaigns_group_id);
  const connectionStatus = getCardStatus(config?.alert_disconnect ?? false, config?.connection_group_id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            Central de Alertas
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 ml-[46px]">
            Painel de monitoramento e configuração de notificações via WhatsApp.
          </p>
        </div>
      </div>

      {/* Instância de Notificação */}
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-primary" />
              </div>
              Instância de Notificação
            </CardTitle>
            {reportDevice && (
              isConnected ? (
                <Badge variant="outline" className="gap-1.5 text-xs border-emerald-500/30 text-emerald-500 bg-emerald-500/10 px-3 py-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1.5 text-xs border-destructive/30 text-destructive bg-destructive/10 px-3 py-1">
                  <span className="w-2 h-2 rounded-full bg-destructive" /> Offline
                </Badge>
              )
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {!reportDevice ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Smartphone className="w-10 h-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground text-center">
                Nenhuma instância de relatório configurada.
              </p>
              <Button
                onClick={handleCreateReportInstance}
                disabled={creatingInstance}
                className="gap-1.5"
              >
                {creatingInstance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar instância "Relatorio Via Whatsapp"
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Número</p>
                    <p className="text-sm font-semibold mt-0.5">{reportDevice.number || "Sem número"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Instância</p>
                    <p className="text-sm font-semibold mt-0.5">{reportDevice.name}</p>
                  </div>
                </div>
                {groups.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <Users className="w-3 h-3 inline mr-1" />{groups.length} grupos disponíveis
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reportDevice?.id && fetchGroups(reportDevice.id)}
                  disabled={!reportDevice?.id || loadingGroups}
                  className="gap-1.5"
                >
                  {loadingGroups ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Atualizar grupos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendTestMessage}
                  disabled={sendingTest || !reportDevice?.id}
                  className="gap-1.5"
                >
                  {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Enviar teste
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3 Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AlertCard
          icon={<Flame className="w-6 h-6 text-orange-500" />}
          title="Relatórios de Aquecimento"
          description="Relatórios enviados automaticamente após cada ciclo de aquecimento (24h)."
          status={warmupStatus}
          groups={groups}
          selectedGroupId={config?.warmup_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("warmup_group_id", "warmup_group_name", id)}
          enabled={config?.toggle_warmup ?? false}
          onToggle={(v) => handleToggle("toggle_warmup", v)}
          loadingGroups={loadingGroups}
          infoItems={[
            { icon: <Clock className="w-4 h-4" />, label: "Frequência", value: "24 horas (automática)" },
          ]}
          monitoredEvents={["Ciclo de aquecimento concluído"]}
          previewMessage={`🔥 RELATÓRIO DE AQUECIMENTO (24H)\n\nInstância: ${reportDevice?.name || "{nome_instancia}"}\nNúmero: ${reportDevice?.number || "{numero}"}\n\n📊 Atividades registradas\n\n📨 Mensagens enviadas: {msgs_enviadas}\n📩 Mensagens recebidas: {msgs_recebidas}\n\n🖼 Fotos enviadas: {fotos}\n🎧 Áudios enviados: {audios}\n\n🟢 Status postados: {status}\n👥 Interações em grupos: {grupos_interacoes}\n\n⏱ Última atividade registrada:\n{ultima_atividade}\n\n🔎 Status atual da instância:\n${isConnected ? "🟢 Online" : "🔴 Offline"}\n\nRelatório gerado automaticamente após o ciclo de aquecimento de 24h.`}
        />

        <AlertCard
          icon={<Megaphone className="w-6 h-6 text-blue-500" />}
          title="Relatórios de Campanhas"
          description="Alertas enviados automaticamente quando eventos da campanha ocorrem."
          status={campaignsStatus}
          groups={groups}
          selectedGroupId={config?.campaigns_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("campaigns_group_id", "campaigns_group_name", id)}
          enabled={config?.toggle_campaigns ?? false}
          onToggle={(v) => handleToggle("toggle_campaigns", v)}
          loadingGroups={loadingGroups}
          infoItems={[
            { icon: <Zap className="w-4 h-4" />, label: "Tempo de envio", value: "< 10 segundos" },
          ]}
          monitoredEvents={["Campanha iniciada", "Campanha pausada", "Campanha finalizada", "Falhas detectadas"]}
          previewMessage={`📣 CAMPANHA FINALIZADA\n\nCampanha: {nome_campanha}\n\n📊 Resultado da campanha\n\n👥 Total de contatos: {total}\n\n✅ Mensagens enviadas: {enviadas}\n📬 Mensagens entregues: {entregues}\n\n❌ Falhas registradas: {falhas}\n⏳ Pendentes: {pendentes}\n\n⏱ Tempo total de execução:\n{tempo_execucao}\n\nStatus da campanha: Concluída`}
        />

        <AlertCard
          icon={<Plug className="w-6 h-6 text-emerald-500" />}
          title="Alertas de Conexão"
          description="Alertas enviados automaticamente quando o status da instância muda."
          status={connectionStatus}
          groups={groups}
          selectedGroupId={config?.connection_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("connection_group_id", "connection_group_name", id)}
          enabled={config?.alert_disconnect ?? false}
          onToggle={(v) => handleToggle("alert_disconnect", v)}
          loadingGroups={loadingGroups}
          infoItems={[
            { icon: <Zap className="w-4 h-4" />, label: "Tempo de envio", value: "< 5 segundos" },
          ]}
          monitoredEvents={["Instância conectada", "Instância desconectada", "QR Code gerado"]}
          previewMessage={`⚠️ ALERTA DE CONEXÃO\n\nInstância: ${reportDevice?.name || "{nome_instancia}"}\nNúmero: ${reportDevice?.number || "{numero}"}\n\n❌ Status: Desconectado\n\n⏱ Horário da ocorrência:\n${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\n\nA instância perdeu conexão com o WhatsApp.\n\nPara continuar utilizando o sistema,\né necessário realizar a reconexão.`}
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
  status: "active" | "incomplete" | "off";
  groups: WhatsAppGroup[];
  selectedGroupId: string;
  onGroupSelect: (id: string) => void;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  loadingGroups: boolean;
  infoItems: { icon: React.ReactNode; label: string; value: string }[];
  monitoredEvents: string[];
  previewMessage: string;
}

function AlertCard({
  icon, title, description, status, groups, selectedGroupId,
  onGroupSelect, enabled, onToggle, loadingGroups, infoItems, monitoredEvents, previewMessage,
}: AlertCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const statusBadge = {
    active: { label: "Ativo", className: "border-emerald-500/30 text-emerald-500 bg-emerald-500/10" },
    incomplete: { label: "Configuração incompleta", className: "border-yellow-500/30 text-yellow-500 bg-yellow-500/10" },
    off: { label: "Desativado", className: "border-destructive/30 text-destructive bg-destructive/10" },
  }[status];

  return (
    <>
      <Card className="flex flex-col border-border/60">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center border border-border/50">
              {icon}
            </div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 flex-1 pt-0">
          {/* Group selector */}
          <div>
            <Label className="text-[11px] font-semibold mb-2 block text-muted-foreground uppercase tracking-wider">Grupo de destino</Label>
            <Select value={selectedGroupId} onValueChange={onGroupSelect}>
              <SelectTrigger className="h-9 text-xs">
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
              <div className="flex items-center gap-2 mt-2 px-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
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
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
            <div>
              <Label className="text-xs font-semibold block">Ativar envio para WhatsApp</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">{enabled ? "Notificações ativas" : "Notificações desativadas"}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={onToggle} />
          </div>

          {/* Info items - highlighted */}
          <div className="space-y-2">
            {infoItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <div className="text-primary">{item.icon}</div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</p>
                  <p className="text-xs font-semibold text-foreground">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Monitored events */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground mb-2 block uppercase tracking-wider">Eventos monitorados</Label>
            <div className="space-y-1.5">
              {monitoredEvents.map((evt) => (
                <div key={evt} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-foreground/80">{evt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-2 mt-auto h-9"
            onClick={() => setPreviewOpen(true)}
          >
            Ver mensagem
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp-style Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <div className="bg-[#075E54] p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Central de Alertas</p>
              <p className="text-white/70 text-[11px]">online</p>
            </div>
          </div>
          <div className="bg-[#ECE5DD] dark:bg-[#0B141A] p-4 min-h-[220px]">
            <div className="bg-white dark:bg-[#1F2C34] rounded-lg p-3.5 shadow-sm max-w-[90%] ml-auto">
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#111B21] dark:text-[#E9EDEF]">
                {previewMessage}
              </p>
              <p className="text-[10px] text-[#667781] dark:text-[#8696A0] text-right mt-2 flex items-center justify-end gap-1">
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
