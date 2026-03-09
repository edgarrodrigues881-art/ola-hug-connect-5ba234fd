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
import { Radio, RefreshCw, Flame, Megaphone, Plug, Loader2, Send, CheckCircle2, Eye, Smartphone, Users, Clock, Zap, QrCode, XCircle, LogOut, X, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePlanGate } from "@/hooks/usePlanGate";
import { PlanGateDialog } from "@/components/PlanGateDialog";


interface WhatsAppGroup {
  id: string;
  name: string;
  participants?: number;
}

export default function ReportWhatsApp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isBlocked, planState, profile, canUseReports } = usePlanGate();
  const [planGateOpen, setPlanGateOpen] = useState(false);
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

  // Access allowed when plan includes reports (Scale/Elite), addon active, or admin override
  const canUseReport = canUseReports;




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

  // Dedicated report device — auto-provision if missing
  const { data: reportDevice, isLoading: loadingDevice } = useQuery({
    queryKey: ["report-device", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("devices")
        .select("id, name, number, status, login_type")
        .eq("user_id", user!.id)
        .eq("login_type", "report_wa")
        .maybeSingle();
      
      if (data) return data;

      // Auto-create if not exists
      const { data: created, error } = await supabase.functions.invoke("manage-devices", {
        body: { action: "create-report" },
      });
      if (error || created?.error) {
        console.error("Auto-provision report instance failed:", error || created?.error);
        return null;
      }
      if (created?.device) {
        // Link to config
        await supabase.from("report_wa_configs").upsert({
          user_id: user!.id,
          device_id: created.device.id,
        }, { onConflict: "user_id" }).select().maybeSingle();
      }
      // Re-fetch the device
      const { data: refetched } = await supabase
        .from("devices")
        .select("id, name, number, status, login_type")
        .eq("user_id", user!.id)
        .eq("login_type", "report_wa")
        .maybeSingle();
      return refetched;
    },
    enabled: !!user && canUseReport,
  });

  const isConnected = reportDevice?.status === "Ready";


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
    if (!canUseReport) { setPlanGateOpen(true); return; }
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

  const fetchGroups = async (deviceId: string, forceRefresh = false) => {
    setLoadingGroups(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const refreshParam = forceRefresh ? "&refresh=true" : "";
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whapi-chats?action=list_chats&device_id=${deviceId}&count=200${refreshParam}`,
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
    <div className="space-y-6">
      {/* Plan gate banner */}
      {!canUseReport && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/20 bg-destructive/5">
          <Ban className="w-4 h-4 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-foreground">Funcionalidade bloqueada</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isBlocked ? "Ative ou renove seu plano para usar notificações via WhatsApp." : "Solicite ao administrador a liberação desta funcionalidade."}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Radio className="w-4 h-4 text-primary" />
          </div>
          Relatório Via WhatsApp
        </h1>
        <p className="text-muted-foreground text-xs mt-1 ml-[42px]">
          Configure notificações automáticas para grupos do WhatsApp.
        </p>
      </div>

      {/* Instância — compact panel */}
      <div className={`rounded-xl border overflow-hidden ${isConnected ? "border-emerald-500/15" : "border-border/30"}`}>
        <div className={`h-0.5 w-full ${isConnected ? "bg-emerald-500/50" : "bg-muted-foreground/10"}`} />
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isConnected ? "bg-emerald-500/10" : "bg-muted/30"}`}>
                <Smartphone className={`w-4 h-4 ${isConnected ? "text-emerald-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">Instância de Notificação</p>
                {reportDevice && (
                  <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">
                    {reportDevice.number || reportDevice.name}
                  </p>
                )}
              </div>
            </div>
            {reportDevice && (
              <Badge variant="outline" className={`text-[10px] gap-1 px-2 py-0.5 ${isConnected ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" : "border-destructive/20 text-destructive bg-destructive/5"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-destructive"}`} />
                {isConnected ? "Online" : "Offline"}
              </Badge>
            )}
          </div>

          {!reportDevice ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground/60">Provisionando instância...</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {!isConnected && (
                <Button size="sm" onClick={openConnectDialog} className="gap-1.5 h-7 text-[11px]">
                  <Plug className="w-3 h-3" /> Conectar
                </Button>
              )}
              {isConnected && (
                <>
                  <Button variant="outline" size="sm" onClick={() => reportDevice?.id && fetchGroups(reportDevice.id, true)} disabled={loadingGroups} className="gap-1.5 h-7 text-[11px]">
                    {loadingGroups ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Sincronizar
                  </Button>
                  <Button variant="outline" size="sm" onClick={sendTestMessage} disabled={sendingTest || !reportDevice?.id} className="gap-1.5 h-7 text-[11px]">
                    {sendingTest ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Teste
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting} className="gap-1.5 h-7 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
                    {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                    Desconectar
                  </Button>
                </>
              )}
              {groups.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40 ml-auto self-center">
                  <Users className="w-3 h-3" /> {groups.length} grupos
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3 Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AlertCard
          icon={<Flame className="w-4 h-4 text-orange-500" />}
          iconColor="orange"
          title="Aquecimento"
          description="Relatórios após cada ciclo de 24h."
          groups={groups}
          selectedGroupId={config?.warmup_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("warmup_group_id", "warmup_group_name", id)}
          onRefreshGroups={() => reportDevice?.id && fetchGroups(reportDevice.id, true)}
          enabled={config?.toggle_warmup ?? false}
          onToggle={(v) => handleToggle("toggle_warmup", v)}
          loadingGroups={loadingGroups}
          infoItems={[]}
          monitoredEvents={["Ciclo de aquecimento concluído"]}
          previewMessage={`🔥 RELATÓRIO DE AQUECIMENTO (24H)\n\nInstância: ${reportDevice?.name || "{nome_instancia}"}\nNúmero: ${reportDevice?.number || "{numero}"}\n\n📊 Atividades registradas\n\n📨 Mensagens enviadas: {msgs_enviadas}\n📩 Mensagens recebidas: {msgs_recebidas}\n\n🖼 Fotos enviadas: {fotos}\n🎧 Áudios enviados: {audios}\n\n🟢 Status postados: {status}\n👥 Interações em grupos: {grupos_interacoes}\n\n⏱ Última atividade registrada:\n{ultima_atividade}\n\n🔎 Status atual da instância:\n${isConnected ? "🟢 Online" : "🔴 Offline"}\n\nRelatório gerado automaticamente após o ciclo de aquecimento de 24h.`}
        />

        <AlertCard
          icon={<Megaphone className="w-4 h-4 text-sky-500" />}
          iconColor="sky"
          title="Campanhas"
          description="Alertas de eventos de campanha."
          groups={groups}
          selectedGroupId={config?.campaigns_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("campaigns_group_id", "campaigns_group_name", id)}
          onRefreshGroups={() => reportDevice?.id && fetchGroups(reportDevice.id, true)}
          enabled={config?.toggle_campaigns ?? false}
          onToggle={(v) => handleToggle("toggle_campaigns", v)}
          loadingGroups={loadingGroups}
          infoItems={[]}
          monitoredEvents={["Campanha iniciada", "Campanha pausada", "Campanha finalizada", "Falhas detectadas"]}
          previewMessage={`📣 CAMPANHA FINALIZADA\n\nCampanha: {nome_campanha}\n\n📊 Resultado da campanha\n\n👥 Total de contatos: {total}\n\n✅ Mensagens enviadas: {enviadas}\n📬 Mensagens entregues: {entregues}\n\n❌ Falhas registradas: {falhas}\n⏳ Pendentes: {pendentes}\n\n⏱ Tempo total de execução:\n{tempo_execucao}\n\nStatus da campanha: Concluída`}
        />

        <AlertCard
          icon={<Plug className="w-4 h-4 text-emerald-500" />}
          iconColor="emerald"
          title="Conexão"
          description="Alertas de mudança de status."
          groups={groups}
          selectedGroupId={config?.connection_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("connection_group_id", "connection_group_name", id)}
          onRefreshGroups={() => reportDevice?.id && fetchGroups(reportDevice.id, true)}
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
          </div>
        </DialogContent>
      </Dialog>
      <PlanGateDialog open={planGateOpen} onOpenChange={setPlanGateOpen} planState={planState} context="notifications" />
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

  const accentMap = {
    orange: {
      bg: "bg-orange-500/8",
      border: "border-orange-500/15",
      dot: "bg-orange-500",
      text: "text-orange-500",
    },
    teal: {
      bg: "bg-primary/8",
      border: "border-primary/15",
      dot: "bg-primary",
      text: "text-primary",
    },
    emerald: {
      bg: "bg-emerald-500/8",
      border: "border-emerald-500/15",
      dot: "bg-emerald-500",
      text: "text-emerald-500",
    },
  }[iconColor];

  return (
    <>
      <div className={`flex flex-col rounded-2xl border bg-card/30 backdrop-blur-sm overflow-hidden transition-all duration-200 ${enabled ? accentMap.border : "border-border/10"}`}>
        {/* Accent line */}
        <div className={`h-[2px] w-full transition-colors duration-300 ${enabled ? accentMap.dot : "bg-muted/15"}`} />

        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${enabled ? accentMap.bg : "bg-muted/15"}`}>
                {icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5 leading-tight">{description}</p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={onToggle} className="mt-0.5" />
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 space-y-4 flex-1 flex flex-col">
          {/* Group selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              Grupo de destino
            </label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button className={`w-full flex items-center justify-between gap-2 h-9 px-3 rounded-xl border text-[12px] transition-all ${
                  selectedGroup 
                    ? "border-border/30 bg-card text-foreground" 
                    : "border-border/15 bg-muted/5 text-muted-foreground/50"
                } hover:border-border/40 hover:bg-card/60`}>
                  <span className="truncate text-left">{selectedGroup ? selectedGroup.name : (loadingGroups ? "Carregando..." : "Selecionar grupo...")}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedGroup && (
                      <span
                        role="button"
                        className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5"
                        onClick={(e) => { e.stopPropagation(); onGroupSelect(""); }}
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                    <Users className="w-3.5 h-3.5 text-muted-foreground/30" />
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl overflow-hidden" align="start">
                <div className="p-2.5 border-b border-border/15 flex gap-2 bg-card">
                  <Input
                    placeholder="Pesquisar grupo..."
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="h-8 text-[11px] flex-1 rounded-lg bg-muted/10 border-border/10"
                    autoFocus
                  />
                  {onRefreshGroups && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg hover:bg-muted/20" onClick={onRefreshGroups} disabled={loadingGroups}>
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingGroups ? "animate-spin" : ""}`} />
                    </Button>
                  )}
                </div>
                <div className="max-h-[220px] overflow-y-auto p-1.5">
                  {filteredGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                      <Users className="w-5 h-5 text-muted-foreground/20" />
                      <p className="text-[11px] text-muted-foreground/40">
                        {loadingGroups ? "Carregando grupos..." : groupSearch ? "Nenhum grupo encontrado" : "Conecte a instância primeiro"}
                      </p>
                    </div>
                  ) : (
                    filteredGroups.map((g) => (
                      <button
                        key={g.id}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all flex items-center justify-between gap-2 ${
                          selectedGroupId === g.id 
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-muted/15 text-foreground/80"
                        }`}
                        onClick={() => { onGroupSelect(g.id); setGroupSearch(""); setPopoverOpen(false); }}
                      >
                        <span className="truncate">{g.name}</span>
                        {g.participants && (
                          <span className="text-muted-foreground/30 flex items-center gap-0.5 shrink-0 text-[10px]">
                            <Users className="w-2.5 h-2.5" />{g.participants}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Monitored events */}
          <div className="space-y-2 mt-auto">
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              Eventos monitorados
            </label>
            <div className="flex flex-wrap gap-1.5">
              {monitoredEvents.map((evt) => (
                <span key={evt} className="text-[10px] px-2 py-1 rounded-md bg-muted/10 text-muted-foreground/60 border border-border/8">
                  {evt}
                </span>
              ))}
            </div>
          </div>

          {/* Preview button */}
          <button
            className="w-full flex items-center justify-center gap-2 h-8 rounded-xl text-[11px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 transition-all border border-transparent hover:border-border/15"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="w-3.5 h-3.5" />
            Ver mensagem
          </button>
        </div>
      </div>

      {/* WhatsApp-style Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          {/* WhatsApp header */}
          <div className="bg-[#202C33] px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#6B7B8D]/20 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-[#AEBAC1]" />
            </div>
            <div>
              <p className="text-[#E9EDEF] text-[14px] font-medium">Relatório Via WhatsApp</p>
              <p className="text-[#8696A0] text-[11px]">online</p>
            </div>
          </div>
          {/* Chat body */}
          <div className="p-4 min-h-[220px]" style={{ backgroundColor: "#0B141A" }}>
            <div className="bg-[#005C4B] rounded-xl p-3.5 shadow-md max-w-[88%] ml-auto">
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#E9EDEF]">
                {previewMessage}
              </p>
              <div className="flex items-center justify-end gap-1 mt-2">
                <span className="text-[10px] text-[#8696A0]/60">
                  {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-[10px] text-[#53BDEB]/70">✓✓</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
