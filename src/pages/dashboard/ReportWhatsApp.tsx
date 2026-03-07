import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Radio, RefreshCw, Flame, Megaphone, Plug, Loader2, Send, CheckCircle2, Eye, Smartphone, Users, Clock, Zap, Plus, QrCode, XCircle, LogOut, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


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
  const [disconnecting, setDisconnecting] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(30);
  const [qrConnected, setQrConnected] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [connectStep, setConnectStep] = useState<"qr" | "done">("qr");
  
  const qrCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);




  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ["report-wa-config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_wa_configs")
        .select("id, device_id, toggle_campaigns, toggle_warmup, toggle_instances, alert_disconnect, alert_campaign_end, alert_high_failures, group_id, group_name, frequency, connected_phone, connection_status, warmup_group_id, warmup_group_name, campaigns_group_id, campaigns_group_name, connection_group_id, connection_group_name, created_at, updated_at")
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
        .select("id, name, number, status, login_type")
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
      const { data, error } = await supabase.functions.invoke("manage-devices", {
        body: { action: "create-report" },
      });
      if (error) throw new Error(error.message || "Erro ao criar instância");
      if (data?.error) throw new Error(data.error);
      
      // Link to config
      if (data?.device) {
        await upsertConfig.mutateAsync({ device_id: data.device.id });
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

  const handleDisconnect = async () => {
    if (!reportDevice?.id) return;
    setDisconnecting(true);
    try {
      await callApi({ action: "logout", deviceId: reportDevice.id });
      queryClient.invalidateQueries({ queryKey: ["report-device"] });
      setGroups([]);
      toast.success("Instância desconectada");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  };

  const callApi = async (body: Record<string, any>) => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) throw new Error("Não autenticado");
    const response = await supabase.functions.invoke("evolution-connect", {
      body,
      headers: { Authorization: `Bearer ${s.access_token}` },
    });
    if (response.error) throw response.error;
    return response.data;
  };

  const openConnectDialog = () => {
    setQrDialogOpen(true);
    setQrCodeBase64("");
    setQrConnected(false);
    setConnectError("");
    // Start QR flow immediately
    handleConnectQR();
  };

  const handleConnectQR = async () => {
    if (!reportDevice?.id) return;
    setConnectStep("qr");
    setQrLoading(true);
    setQrCodeBase64("");
    setConnectError("");
    try {
      // Token must be pre-assigned by admin — no auto-creation
      const result = await callApi({ action: "connect", deviceId: reportDevice.id, method: "qr" });
      if (result?.alreadyConnected) {
        setQrConnected(true);
        setConnectStep("done");
        queryClient.invalidateQueries({ queryKey: ["report-device"] });
        toast.success("Já conectado!");
        return;
      }
      const b64 = result?.base64 || result?.qr;
      if (b64) {
        setQrCodeBase64(b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);
      }
    } catch (err: any) {
      setConnectError(err?.message || "Erro ao gerar QR Code");
      toast.error("Erro ao gerar QR Code");
    } finally {
      setQrLoading(false);
    }
  };


  // QR auto-refresh every 30s
  useEffect(() => {
    if (connectStep === "qr" && qrCodeBase64) {
      setQrCountdown(30);
      if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
      qrCountdownRef.current = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) {
            setQrCodeBase64("");
            if (reportDevice?.id) {
              // Use refreshQr to avoid recreating the instance
              callApi({ action: "refreshQr", deviceId: reportDevice.id }).then(result => {
                if (result?.alreadyConnected) {
                  setQrConnected(true);
                  setConnectStep("done");
                  queryClient.invalidateQueries({ queryKey: ["report-device"] });
                  return;
                }
                const b64 = result?.base64 || result?.qr;
                if (b64) setQrCodeBase64(b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);
              }).catch(() => {});
            }
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (qrCountdownRef.current) { clearInterval(qrCountdownRef.current); qrCountdownRef.current = null; }
    }
    return () => { if (qrCountdownRef.current) { clearInterval(qrCountdownRef.current); qrCountdownRef.current = null; } };
  }, [connectStep, qrCodeBase64, reportDevice?.id]);

  // Poll connection status while QR dialog open
  useEffect(() => {
    if (!qrDialogOpen || !reportDevice?.id || qrConnected) return;
    pollRef.current = setInterval(async () => {
      try {
        const result = await callApi({ action: "status", deviceId: reportDevice.id });
        if (result?.status === "authenticated" || result?.status === "connected") {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setQrConnected(true);
          setConnectStep("done");
          queryClient.invalidateQueries({ queryKey: ["report-device"] });
          toast.success("Instância conectada com sucesso!");
          setTimeout(() => setQrDialogOpen(false), 2000);
        }
      } catch {}
    }, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [qrDialogOpen, reportDevice?.id, qrConnected, connectStep]);

  const fetchGroups = async (deviceId: string) => {
    setLoadingGroups(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whapi-chats?action=list_chats&device_id=${deviceId}&count=200`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      if (!res.ok) {
        throw new Error(`Erro ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      const chats = json.chats || [];
      const groupChats: WhatsAppGroup[] = chats.map((c: any) => ({
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




  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            Relatório Via WhatsApp
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 ml-[46px]">
            Painel de monitoramento e configuração de notificações via WhatsApp.
          </p>
        </div>
      </div>

      {/* Instância de Notificação — Status Panel */}
      <Card className={`border-border/60 relative overflow-hidden ${isConnected ? "shadow-[0_0_30px_-10px_rgba(16,185,129,0.15)]" : ""}`}>
        {/* Top status strip */}
        <div className={`h-1 w-full ${isConnected ? "bg-gradient-to-r from-emerald-500/60 via-emerald-400/40 to-emerald-500/60" : "bg-gradient-to-r from-destructive/40 via-destructive/20 to-destructive/40"}`} />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isConnected ? "bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]" : "bg-destructive/10"}`}>
                <Smartphone className={`w-4.5 h-4.5 ${isConnected ? "text-emerald-500" : "text-destructive"}`} />
              </div>
              Instância de Notificação
            </CardTitle>
            {reportDevice && (
              isConnected ? (
                <Badge variant="outline" className="gap-1.5 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-3 py-1 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" /> Online
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1.5 text-xs border-destructive/30 text-destructive bg-destructive/10 px-3 py-1">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" /> Offline
                </Badge>
              )
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {!reportDevice ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground/70">Nenhuma instância configurada</p>
                <p className="text-xs text-muted-foreground/60">Crie uma instância para começar a receber alertas.</p>
              </div>
              <Button
                onClick={handleCreateReportInstance}
                disabled={creatingInstance}
                className="gap-1.5"
              >
                {creatingInstance ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar instância
              </Button>
            </div>
          ) : (
            <div className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border ${isConnected ? "bg-emerald-500/[0.03] border-emerald-500/15" : "bg-muted/20 border-border/40"}`}>
              <div className="flex-1 space-y-2.5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">Número</p>
                    <p className="text-sm font-bold text-foreground mt-0.5 font-mono">{reportDevice.number || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-semibold">Instância</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{reportDevice.name}</p>
                  </div>
                </div>
                {groups.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                    <Users className="w-3.5 h-3.5" />
                    <span>{groups.length} grupos disponíveis</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!isConnected && (
                  <Button
                    size="sm"
                    onClick={openConnectDialog}
                    className="gap-1.5"
                  >
                    <Plug className="w-3.5 h-3.5" />
                    Conectar
                  </Button>
                )}
                {isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reportDevice?.id && fetchGroups(reportDevice.id)}
                    disabled={loadingGroups}
                    className="gap-1.5"
                  >
                    {loadingGroups ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sincronizar grupos
                  </Button>
                )}
                {isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                    Desconectar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendTestMessage}
                  disabled={sendingTest || !reportDevice?.id || !isConnected}
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
          icon={<Flame className="w-7 h-7 text-orange-500" />}
          iconColor="orange"
          title="Relatórios de Aquecimento"
          description="Relatórios enviados automaticamente após cada ciclo de aquecimento (24h)."
          
          groups={groups}
          selectedGroupId={config?.warmup_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("warmup_group_id", "warmup_group_name", id)}
          onRefreshGroups={() => reportDevice?.id && fetchGroups(reportDevice.id)}
          enabled={config?.toggle_warmup ?? false}
          onToggle={(v) => handleToggle("toggle_warmup", v)}
          loadingGroups={loadingGroups}
          infoItems={[]}
          monitoredEvents={["Ciclo de aquecimento concluído"]}
          previewMessage={`🔥 RELATÓRIO DE AQUECIMENTO (24H)\n\nInstância: ${reportDevice?.name || "{nome_instancia}"}\nNúmero: ${reportDevice?.number || "{numero}"}\n\n📊 Atividades registradas\n\n📨 Mensagens enviadas: {msgs_enviadas}\n📩 Mensagens recebidas: {msgs_recebidas}\n\n🖼 Fotos enviadas: {fotos}\n🎧 Áudios enviados: {audios}\n\n🟢 Status postados: {status}\n👥 Interações em grupos: {grupos_interacoes}\n\n⏱ Última atividade registrada:\n{ultima_atividade}\n\n🔎 Status atual da instância:\n${isConnected ? "🟢 Online" : "🔴 Offline"}\n\nRelatório gerado automaticamente após o ciclo de aquecimento de 24h.`}
        />

        <AlertCard
          icon={<Megaphone className="w-7 h-7 text-teal-500" />}
          iconColor="teal"
          title="Relatórios de Campanhas"
          description="Alertas enviados automaticamente quando eventos da campanha ocorrem."
          
          groups={groups}
          selectedGroupId={config?.campaigns_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("campaigns_group_id", "campaigns_group_name", id)}
          onRefreshGroups={() => reportDevice?.id && fetchGroups(reportDevice.id)}
          enabled={config?.toggle_campaigns ?? false}
          onToggle={(v) => handleToggle("toggle_campaigns", v)}
          loadingGroups={loadingGroups}
          infoItems={[]}
          monitoredEvents={["Campanha iniciada", "Campanha pausada", "Campanha finalizada", "Falhas detectadas"]}
          previewMessage={`📣 CAMPANHA FINALIZADA\n\nCampanha: {nome_campanha}\n\n📊 Resultado da campanha\n\n👥 Total de contatos: {total}\n\n✅ Mensagens enviadas: {enviadas}\n📬 Mensagens entregues: {entregues}\n\n❌ Falhas registradas: {falhas}\n⏳ Pendentes: {pendentes}\n\n⏱ Tempo total de execução:\n{tempo_execucao}\n\nStatus da campanha: Concluída`}
        />

        <AlertCard
          icon={<Plug className="w-7 h-7 text-emerald-500" />}
          iconColor="emerald"
          title="Alertas de Conexão"
          description="Alertas enviados automaticamente quando o status da instância muda."
          
          groups={groups}
          selectedGroupId={config?.connection_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("connection_group_id", "connection_group_name", id)}
          onRefreshGroups={() => reportDevice?.id && fetchGroups(reportDevice.id)}
          enabled={config?.alert_disconnect ?? false}
          onToggle={(v) => handleToggle("alert_disconnect", v)}
          loadingGroups={loadingGroups}
          infoItems={[]}
          monitoredEvents={["Instância conectada", "Instância desconectada", "QR Code gerado"]}
          previewMessage={`⚠️ ALERTA DE CONEXÃO\n\nInstância: ${reportDevice?.name || "{nome_instancia}"}\nNúmero: ${reportDevice?.number || "{numero}"}\n\n❌ Status: Desconectado\n\n⏱ Horário da ocorrência:\n${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\n\nA instância perdeu conexão com o WhatsApp.\n\nPara continuar utilizando o sistema,\né necessário realizar a reconexão.`}
        />
      </div>

      {/* Connect Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={(open) => {
        if (!open) { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } setQrDialogOpen(false); }
      }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Header com gradiente */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {connectStep === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : connectStep === "qr" || connectStep === "code" ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <Smartphone className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {connectStep === "done" ? "Conectado!" : "Conectar instância"}
                </DialogTitle>
                {reportDevice && connectStep !== "done" && (
                  <div>
                    <p className="text-[11px] text-muted-foreground/50">{reportDevice.name}</p>
                    {reportDevice.number && (
                      <p className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">{reportDevice.number}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
            {/* QR Code display */}
            {connectStep === "qr" && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  {qrCodeBase64 ? (
                    <div className="relative p-3 rounded-2xl bg-card border-2 border-border/20 shadow-lg">
                      <img src={qrCodeBase64} alt="QR Code" className="w-52 h-52 rounded-lg" />
                    </div>
                  ) : connectError ? (
                    <div className="w-52 h-52 bg-destructive/5 rounded-2xl flex flex-col items-center justify-center border-2 border-destructive/20 p-4">
                      <XCircle className="w-8 h-8 text-destructive mb-2" />
                      <p className="text-[11px] text-destructive text-center leading-relaxed">{connectError}</p>
                    </div>
                  ) : (
                    <div className="w-56 h-56 rounded-2xl flex flex-col items-center justify-center border-2 border-primary/20 bg-primary/[0.02] relative overflow-hidden">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <QrCode className="w-6 h-6 text-primary animate-pulse" />
                      </div>
                      <p className="text-xs font-medium text-foreground">Preparando QR Code</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">Isso pode levar alguns segundos...</p>
                      <div className="flex items-center gap-1 mt-3">
                        <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-foreground">Aguardando leitura</span>
                  </div>
                  {qrCodeBase64 && (
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <div className="relative w-6 h-6">
                        <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
                          <circle cx="12" cy="12" r="10" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"
                            strokeDasharray={`${(qrCountdown / 30) * 62.83} 62.83`}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-linear"
                          />
                        </svg>
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                        Atualiza em {qrCountdown}s
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground/40 leading-relaxed max-w-[240px]">
                    Abra o WhatsApp → Configurações → Aparelhos conectados → Conectar
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8"
                  onClick={async () => {
                    try {
                      const result = await callApi({ action: "status", deviceId: reportDevice!.id });
                      const state = result?.status;
                      if (state === "authenticated" || state === "connected") {
                        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
                        setQrConnected(true);
                        setConnectStep("done");
                        queryClient.invalidateQueries({ queryKey: ["report-device"] });
                        toast.success("Conectado!");
                        try {
                          const { data: { session: s } } = await supabase.auth.getSession();
                          if (s) {
                            await supabase.functions.invoke("sync-devices", { headers: { Authorization: `Bearer ${s.access_token}` } });
                            queryClient.invalidateQueries({ queryKey: ["report-device"] });
                          }
                        } catch {}
                      } else {
                        toast.info("QR Code ainda não foi escaneado. Escaneie e tente novamente.");
                      }
                    } catch {
                      toast.error("Erro ao verificar conexão");
                    }
                  }}
                >
                  <RefreshCw className="w-3 h-3" /> Já escaneei, sincronizar
                </Button>
              </div>
            )}

            {/* Done */}
            {connectStep === "done" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-foreground">Conectado com sucesso</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">A instância de relatório está online e pronta.</p>
                </div>
                <Button size="sm" className="h-9 px-6" onClick={() => setQrDialogOpen(false)}>Fechar</Button>
              </div>
            )}

            {/* Done */}
            {connectStep === "done" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-foreground">Conectado com sucesso</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">A instância de relatório está online e pronta.</p>
                </div>
                <Button size="sm" className="h-9 px-6" onClick={() => setQrDialogOpen(false)}>Fechar</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Alert Card ───
interface AlertCardProps {
  icon: React.ReactNode;
  iconColor: "orange" | "teal" | "emerald";
  title: string;
  description: string;
  
  groups: WhatsAppGroup[];
  selectedGroupId: string;
  onGroupSelect: (id: string) => void;
  onRefreshGroups?: () => void;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  loadingGroups: boolean;
  infoItems: { icon: React.ReactNode; label: string; value: string }[];
  monitoredEvents: string[];
  previewMessage: string;
}

function AlertCard({
  icon, iconColor, title, description, groups, selectedGroupId,
  onGroupSelect, onRefreshGroups, enabled, onToggle, loadingGroups, infoItems, monitoredEvents, previewMessage,
}: AlertCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const filteredGroups = groups
    .filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const iconGlow = {
    orange: "bg-orange-500/10 shadow-[0_0_14px_rgba(249,115,22,0.15)] border-orange-500/20",
    teal: "bg-teal-500/10 shadow-[0_0_14px_rgba(20,184,166,0.15)] border-teal-500/20",
    emerald: "bg-emerald-500/10 shadow-[0_0_14px_rgba(16,185,129,0.15)] border-emerald-500/20",
  }[iconColor];

  return (
    <>
      <Card className="flex flex-col border-border/60 relative overflow-hidden">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${iconGlow}`}>
              {icon}
            </div>
            <CardTitle className="text-sm font-bold text-foreground">{title}</CardTitle>
          </div>
          <CardDescription className="text-xs leading-relaxed text-muted-foreground/80">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 flex-1 pt-0">
          {/* Group selector */}
          <div>
            <Label className="text-[10px] font-bold mb-2 block text-muted-foreground/60 uppercase tracking-widest">Grupo de destino</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between h-9 text-xs font-normal">
                  <span className="truncate">{selectedGroup ? selectedGroup.name : (loadingGroups ? "Carregando..." : "Selecione um grupo")}</span>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {selectedGroup && (
                      <span
                        role="button"
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        onClick={(e) => { e.stopPropagation(); onGroupSelect(""); }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <div className="p-2 border-b border-border/40 flex gap-1.5">
                  <Input
                    placeholder="Pesquisar grupo..."
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="h-8 text-xs flex-1"
                    autoFocus
                  />
                  {onRefreshGroups && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onRefreshGroups} disabled={loadingGroups}>
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingGroups ? "animate-spin" : ""}`} />
                    </Button>
                  )}
                </div>
                <div className="max-h-[200px] overflow-y-auto p-1">
                  {filteredGroups.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      {loadingGroups ? "Carregando..." : groupSearch ? "Nenhum grupo encontrado" : "Conecte uma instância"}
                    </p>
                  ) : (
                    filteredGroups.map((g) => (
                      <button
                        key={g.id}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs hover:bg-accent transition-colors flex items-center justify-between gap-2 ${selectedGroupId === g.id ? "bg-accent" : ""}`}
                        onClick={() => { onGroupSelect(g.id); setGroupSearch(""); setPopoverOpen(false); }}
                      >
                        <span className="truncate">{g.name}</span>
                        {g.participants && (
                          <span className="text-muted-foreground flex items-center gap-0.5 shrink-0">
                            <Users className="w-3 h-3" />{g.participants}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {selectedGroup && (
              <div className="flex items-center gap-2 mt-2.5 px-2 py-1.5 rounded-md bg-emerald-500/[0.04] border border-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <p className="text-[11px] text-foreground/80 font-medium truncate">{selectedGroup.name}</p>
                {selectedGroup.participants && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5 ml-auto shrink-0">
                    <Users className="w-2.5 h-2.5" />{selectedGroup.participants}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Toggle */}
          <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors duration-300 ${enabled ? "bg-emerald-500/[0.04] border-emerald-500/15" : "bg-muted/20 border-border/40"}`}>
            <div>
              <Label className="text-xs font-semibold block text-foreground/90">Ativar envio para WhatsApp</Label>
              <p className={`text-[10px] mt-0.5 transition-colors duration-300 ${enabled ? "text-emerald-500/70" : "text-muted-foreground/50"}`}>{enabled ? "Notificações ativas" : "Notificações desativadas"}</p>
            </div>
            <Switch checked={enabled} onCheckedChange={onToggle} className="transition-all duration-300" />
          </div>

          {/* Info items */}
          {infoItems.length > 0 && (
            <div className="space-y-2">
              {infoItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/[0.04] border border-primary/10">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <div className="text-primary">{item.icon}</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold">{item.label}</p>
                    <p className="text-xs font-bold text-foreground mt-0.5">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Monitored events */}
          <div>
            <Label className="text-[10px] font-bold text-muted-foreground/60 mb-2 block uppercase tracking-widest">Eventos monitorados</Label>
            <div className="space-y-1.5">
              {monitoredEvents.map((evt) => (
                <div key={evt} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80 shrink-0" />
                  <span className="text-foreground/70">{evt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-2 mt-auto h-9 border-border/50 hover:bg-primary/[0.04] hover:border-primary/20 transition-all duration-200"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="w-3.5 h-3.5" />
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
              <p className="text-white text-sm font-medium">Relatório Via WhatsApp</p>
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
