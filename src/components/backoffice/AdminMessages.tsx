import { useState, useMemo, useEffect, useRef } from "react";
import { useAdminDashboard, useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Send, MessageCircle, Clock, AlertTriangle, XCircle, Skull,
  Loader2, Check, User, ArrowLeft, Wifi, WifiOff,
  Settings2, Smartphone, History, Radio, Users, RefreshCw, QrCode
} from "lucide-react";

const SUPORTE_NUMERO = "(62) 99419-2500";

const TEMPLATES = [
  {
    type: "boas-vindas",
    label: "Boas-vindas",
    icon: MessageCircle,
    color: "text-emerald-500",
    desc: "Primeiro login",
    build: (v: any) => {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 3);
      return `Olá ${v.nome}! 👋\n\nSeja bem-vindo(a) ao DG CONTINGÊNCIA PRO!\n\nSeu plano Trial de 3 dias já está ativo.\nVencimento: ${trialEnd.toLocaleDateString("pt-BR")}\n\nQualquer dúvida, fale com nosso suporte: ${v.suporte_numero}\n\nBons envios! 🚀`;
    },
  },
  {
    type: "faltam-3-dias",
    label: "Faltam 3 dias",
    icon: Clock,
    color: "text-yellow-500",
    desc: "3 dias p/ vencer",
    build: (v: any) =>
      `Olá ${v.nome}!\n\nSeu plano ${v.plano} vence em ${v.dias_restantes} dias (${v.vencimento}).\n\nRenove agora para não perder o acesso.\n\nSuporte: ${v.suporte_numero}`,
  },
  {
    type: "vence-hoje",
    label: "Vence hoje",
    icon: AlertTriangle,
    color: "text-orange-500",
    desc: "No dia do vencimento",
    build: (v: any) =>
      `${v.nome}, seu plano ${v.plano} vence HOJE (${v.vencimento})!\n\nSem renovação, suas instâncias serão bloqueadas.\n\nRenove → ${v.suporte_numero}`,
  },
  {
    type: "vencido-1-dia",
    label: "Vencido 1 dia",
    icon: XCircle,
    color: "text-destructive",
    desc: "1 dia vencido",
    build: (v: any) =>
      `${v.nome}, seu plano ${v.plano} está vencido desde ${v.vencimento}.\n\nSuas instâncias estão bloqueadas.\n\nRenove → ${v.suporte_numero}`,
  },
  {
    type: "vencido-7-dias",
    label: "Vencido 7 dias",
    icon: XCircle,
    color: "text-destructive",
    desc: "7 dias vencido",
    build: (v: any) =>
      `${v.nome}, já se passaram 7 dias desde o vencimento do plano ${v.plano}.\n\nSuas instâncias continuam bloqueadas.\n\nAjuda? → ${v.suporte_numero}`,
  },
  {
    type: "vencido-30-dias",
    label: "Vencido 30 dias",
    icon: Skull,
    color: "text-destructive",
    desc: "30 dias — remoção",
    build: (v: any) =>
      `${v.nome}, seu plano ${v.plano} está vencido há 30 dias.\n\nSuas instâncias poderão ser removidas em breve.\n\nContato: ${v.suporte_numero}`,
  },
];

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

function getSuggestedType(daysLeft: number | null) {
  if (daysLeft === null) return "boas-vindas";
  if (daysLeft <= -30) return "vencido-30-dias";
  if (daysLeft <= -7) return "vencido-7-dias";
  if (daysLeft <= -1) return "vencido-1-dia";
  if (daysLeft === 0) return "vence-hoje";
  if (daysLeft <= 3) return "faltam-3-dias";
  return "boas-vindas";
}

function getStatusBadge(daysLeft: number | null) {
  if (daysLeft === null) return { label: "Sem plano", className: "border-border text-muted-foreground" };
  if (daysLeft <= -7) return { label: `${Math.abs(daysLeft)}d vencido`, className: "border-destructive/40 text-destructive bg-destructive/5" };
  if (daysLeft <= 0) return { label: daysLeft === 0 ? "Vence hoje" : `${Math.abs(daysLeft)}d vencido`, className: "border-orange-500/40 text-orange-500 bg-orange-500/5" };
  if (daysLeft <= 3) return { label: `${daysLeft}d restante(s)`, className: "border-yellow-500/40 text-yellow-500 bg-yellow-500/5" };
  return { label: `${daysLeft}d restante(s)`, className: "border-emerald-500/40 text-emerald-500 bg-emerald-500/5" };
}

type ViewMode = "list" | "config" | "detail" | "history";

const AdminMessages = () => {
  const { data } = useAdminDashboard();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useAdminAction();

  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<AdminUser | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Config state
  const [configDeviceId, setConfigDeviceId] = useState("");
  const [configGroupId, setConfigGroupId] = useState("");
  const [configGroupName, setConfigGroupName] = useState("");
  const [newToken, setNewToken] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("https://dgcontingencia.uazapi.com");
  const [newInstanceName, setNewInstanceName] = useState("Relatório WA");
  const [creatingDevice, setCreatingDevice] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [deviceGroups, setDeviceGroups] = useState<any[]>([]);

  // QR Code state
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrConnected, setQrConnected] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrDeviceId, setQrDeviceId] = useState("");
  const [qrCountdown, setQrCountdown] = useState(30);
  const qrCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const users = data?.users || [];

  // Load WhatsApp report config
  const { data: reportConfig, refetch: refetchConfig } = useQuery({
    queryKey: ["admin-wa-report-config"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-data?action=wa-report-config-get");
      if (error) throw error;
      return data?.config || null;
    },
  });

  // Load admin devices for config
  const { data: adminDevices = [] } = useQuery({
    queryKey: ["admin-wa-report-devices"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-data?action=wa-report-devices");
      if (error) throw error;
      return data?.devices || [];
    },
  });

  useEffect(() => {
    if (reportConfig) {
      setConfigDeviceId(reportConfig.device_id || "");
      setConfigGroupId(reportConfig.group_id || "");
      setConfigGroupName(reportConfig.group_name || "");
    }
  }, [reportConfig]);

  const isConfigured = !!reportConfig?.device_id && !!reportConfig?.group_id;

  // Fetch groups when device is selected in config
  const fetchGroups = async (deviceId: string) => {
    setLoadingGroups(true);
    setDeviceGroups([]);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data?action=wa-report-groups", {
        body: { device_id: deviceId },
      });
      if (error) throw error;
      setDeviceGroups(data?.groups || []);
    } catch (e: any) {
      toast({ title: "Erro ao buscar grupos", description: e.message, variant: "destructive" });
    } finally {
      setLoadingGroups(false);
    }
  };

  const selectDevice = (id: string) => {
    setConfigDeviceId(id);
    setConfigGroupId("");
    setConfigGroupName("");
    fetchGroups(id);
  };

  // ─── QR CODE FUNCTIONS ───
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

  const openQrDialog = (deviceId: string) => {
    setQrDeviceId(deviceId);
    setQrDialogOpen(true);
    setQrCodeBase64("");
    setQrConnected(false);
    setQrError("");
    setQrLoading(true);
    // Start QR flow
    callApi({ action: "connect", deviceId, method: "qr" }).then(result => {
      if (result?.alreadyConnected) {
        setQrConnected(true);
        queryClient.invalidateQueries({ queryKey: ["admin-wa-report-devices"] });
        toast({ title: "✅ Já conectado!" });
        return;
      }
      const b64 = result?.base64 || result?.qr;
      if (b64) {
        setQrCodeBase64(b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);
      } else {
        setQrError("QR Code não retornado. Verifique se o token está atribuído.");
      }
    }).catch(err => {
      setQrError(err?.message || "Erro ao gerar QR Code");
    }).finally(() => setQrLoading(false));
  };

  // QR auto-refresh countdown
  useEffect(() => {
    if (!qrDialogOpen || !qrCodeBase64 || qrConnected) return;
    setQrCountdown(30);
    if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
    qrCountdownRef.current = setInterval(() => {
      setQrCountdown(prev => {
        if (prev <= 1) {
          // Refresh QR
          callApi({ action: "refreshQr", deviceId: qrDeviceId }).then(result => {
            const b64 = result?.base64 || result?.qr;
            if (b64) setQrCodeBase64(b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);
          }).catch(() => {});
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (qrCountdownRef.current) { clearInterval(qrCountdownRef.current); qrCountdownRef.current = null; } };
  }, [qrDialogOpen, qrCodeBase64, qrConnected, qrDeviceId]);

  // Poll connection status
  useEffect(() => {
    if (!qrDialogOpen || !qrDeviceId || qrConnected) return;
    pollRef.current = setInterval(async () => {
      try {
        const result = await callApi({ action: "status", deviceId: qrDeviceId });
        if (result?.status === "authenticated" || result?.status === "connected" || result?.status === "Ready") {
          setQrConnected(true);
          queryClient.invalidateQueries({ queryKey: ["admin-wa-report-devices"] });
          toast({ title: "✅ Instância conectada!" });
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setTimeout(() => setQrDialogOpen(false), 2000);
        }
      } catch (_e) {}
    }, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [qrDialogOpen, qrDeviceId, qrConnected]);

  const filteredUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      const da = getDaysLeft(a.plan_expires_at) ?? 999;
      const db = getDaysLeft(b.plan_expires_at) ?? 999;
      return da - db;
    });
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  }, [users, search]);

  // History
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["admin-wa-report-history"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-data?action=wa-report-history");
      if (error) throw error;
      return data?.messages || [];
    },
    enabled: view === "history",
  });

  // Open client detail
  const openClient = (u: AdminUser) => {
    const d = getDaysLeft(u.plan_expires_at);
    setSelectedClient(u);
    setSelectedTemplate(getSuggestedType(d));
    setView("detail");
  };

  // Send
  const sendToGroup = () => {
    if (!selectedClient || !selectedTemplate) return;
    if (!isConfigured) {
      toast({ title: "Configure primeiro", description: "Conecte uma instância e grupo", variant: "destructive" });
      setView("config");
      return;
    }

    const daysLeft = getDaysLeft(selectedClient.plan_expires_at);
    const tpl = TEMPLATES.find(t => t.type === selectedTemplate);
    if (!tpl) return;

    const vars = {
      nome: selectedClient.full_name || selectedClient.email,
      plano: selectedClient.plan_name || "Sem plano",
      vencimento: selectedClient.plan_expires_at ? new Date(selectedClient.plan_expires_at).toLocaleDateString("pt-BR") : "—",
      dias_restantes: daysLeft !== null ? String(daysLeft) : "—",
      suporte_numero: SUPORTE_NUMERO,
    };

    const messageToSend = tpl.build(vars);

    const groupNotification =
      `👤 *Cliente:* ${selectedClient.full_name || "—"}\n` +
      `📧 *Email:* ${selectedClient.email}\n` +
      `📱 *Telefone:* ${selectedClient.phone || "—"}\n` +
      `📦 *Plano:* ${selectedClient.plan_name || "Sem plano"}\n` +
      `📅 *Vencimento:* ${selectedClient.plan_expires_at ? new Date(selectedClient.plan_expires_at).toLocaleDateString("pt-BR") : "—"}\n` +
      `🏷️ *Tipo:* ${tpl.label}\n\n` +
      `─────────────────\n` +
      `✉️ *Mensagem enviada:*\n\n${messageToSend}`;

    setIsSending(true);
    mutate(
      {
        action: "wa-report-send-group",
        body: {
          target_user_id: selectedClient.id,
          template_type: selectedTemplate,
          message_content: messageToSend,
          group_notification: groupNotification,
        },
      },
      {
        onSuccess: (data: any) => {
          const pvOk = data?.pv_sent;
          const grpOk = data?.group_sent;
          const msg = pvOk && grpOk
            ? "✅ Mensagem enviada no PV e notificação enviada ao grupo!"
            : pvOk ? "✅ PV enviado, mas falha no grupo"
            : grpOk ? "⚠️ Grupo notificado, mas falha no PV: " + (data?.pv_error || "")
            : "Enviado com ressalvas";
          toast({ title: msg });
          queryClient.invalidateQueries({ queryKey: ["admin-wa-report-history"] });
          setIsSending(false);
          setView("list");
          setSelectedClient(null);
          setSelectedTemplate(null);
        },
        onError: (e) => {
          toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
          setIsSending(false);
        },
      }
    );
  };

  // Save config
  const saveConfig = () => {
    mutate(
      {
        action: "wa-report-config-save",
        body: { device_id: configDeviceId, group_id: configGroupId, group_name: configGroupName },
      },
      {
        onSuccess: () => {
          toast({ title: "✅ Configuração salva" });
          refetchConfig();
          setView("list");
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  // QR Dialog component (rendered in all views)
  const qrDialog = (
    <Dialog open={qrDialogOpen} onOpenChange={(open) => {
      if (!open) {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        if (qrCountdownRef.current) { clearInterval(qrCountdownRef.current); qrCountdownRef.current = null; }
        setQrDialogOpen(false);
      }
    }}>
      <DialogContent className="sm:max-w-sm border-primary/20 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <QrCode size={16} className="text-primary" />
            </div>
            Conectar WhatsApp
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-5 py-2">
          {qrLoading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          )}
          {qrError && !qrLoading && (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                <XCircle size={28} className="text-destructive" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Falha ao gerar QR</p>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{qrError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openQrDialog(qrDeviceId)} className="mt-1 gap-1.5">
                <RefreshCw size={12} /> Tentar novamente
              </Button>
            </div>
          )}
          {qrCodeBase64 && !qrConnected && !qrLoading && (
            <div className="space-y-4 w-full flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl shadow-lg shadow-primary/5 border border-border/50">
                <img src={qrCodeBase64} alt="QR Code" className="w-52 h-52 object-contain" />
              </div>
              <div className="text-center space-y-1.5">
                <p className="text-sm font-medium text-foreground">Abra o WhatsApp e escaneie</p>
                <p className="text-xs text-muted-foreground">
                  Atualiza em <span className="font-mono font-bold text-primary">{qrCountdown}s</span>
                </p>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(qrCountdown / 30) * 100}%` }}
                />
              </div>
            </div>
          )}
          {qrConnected && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Check size={28} className="text-emerald-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-foreground">Conectado com sucesso!</p>
                <p className="text-xs text-muted-foreground">Agora selecione o grupo de destino.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // ─── CONFIG VIEW ───
  if (view === "config") {
    return (
      <>{qrDialog}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings2 size={16} className="text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Configuração</h2>
            <p className="text-[10px] text-muted-foreground">Configure a instância e o grupo para relatórios</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Step 1: Select device */}
          <div className="p-5 space-y-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">1</div>
              <label className="text-xs font-semibold text-foreground">Selecione a Instância</label>
            </div>

            {adminDevices.length === 0 ? (
              <div className="space-y-3 bg-muted/10 rounded-xl p-4 border border-dashed border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Smartphone size={14} />
                  <p className="text-xs">Adicione uma instância colando o token:</p>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Nome (ex: Relatório WA)"
                    value={newInstanceName}
                    onChange={e => setNewInstanceName(e.target.value)}
                    className="h-9 text-xs bg-background border-border/60"
                  />
                  <Input
                    placeholder="URL base (ex: https://dgcontingencia.uazapi.com)"
                    value={newBaseUrl}
                    onChange={e => setNewBaseUrl(e.target.value)}
                    className="h-9 text-xs bg-background border-border/60"
                  />
                  <Input
                    placeholder="Instance Token (UUID)"
                    value={newToken}
                    onChange={e => setNewToken(e.target.value)}
                    className="h-9 text-xs bg-background border-border/60 font-mono"
                  />
                  <Button
                    size="sm"
                    disabled={!newToken.trim() || !newBaseUrl.trim() || creatingDevice}
                    onClick={async () => {
                      setCreatingDevice(true);
                      try {
                        const { error } = await supabase.functions.invoke("admin-data?action=wa-report-create-device", {
                          body: {
                            name: newInstanceName.trim() || "Relatório WA",
                            base_url: newBaseUrl.trim(),
                            token: newToken.trim(),
                          },
                        });
                        if (error) throw error;
                        toast({ title: "✅ Instância criada!" });
                        setNewToken("");
                        queryClient.invalidateQueries({ queryKey: ["admin-wa-report-devices"] });
                      } catch (e: any) {
                        toast({ title: "Erro", description: e.message, variant: "destructive" });
                      } finally {
                        setCreatingDevice(false);
                      }
                    }}
                    className="w-full h-9 text-xs gap-2"
                  >
                    {creatingDevice ? <Loader2 size={13} className="animate-spin" /> : <Smartphone size={13} />}
                    Adicionar Instância
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {adminDevices.map((d: any) => {
                  const isConnected = d.status === "Connected" || d.status === "Ready";
                  const isSelected = configDeviceId === d.id;
                  return (
                    <div key={d.id} className={`flex items-center gap-2 rounded-xl border transition-all ${
                      isSelected ? "border-primary/40 bg-primary/5" : "border-border bg-muted/10 hover:border-primary/20"
                    }`}>
                      <button
                        onClick={() => selectDevice(d.id)}
                        className="flex-1 flex items-center gap-3 px-4 py-3 text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? "bg-primary/15" : "bg-muted/30"
                        }`}>
                          <Smartphone size={15} className={isSelected ? "text-primary" : "text-muted-foreground"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground">{d.number || "Sem número"}</p>
                        </div>
                        <Badge variant="outline" className={`text-[9px] px-2 py-0.5 ${
                          isConnected ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" : "border-destructive/30 text-destructive bg-destructive/5"
                        }`}>
                          {isConnected ? <Wifi size={9} className="mr-1" /> : <WifiOff size={9} className="mr-1" />}
                          {d.status}
                        </Badge>
                      </button>
                      <div className="pr-3 flex items-center gap-1.5">
                        {isConnected && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await callApi({ action: "logout", deviceId: d.id });
                                toast({ title: "✅ Instância desconectada" });
                                queryClient.invalidateQueries({ queryKey: ["admin-wa-report-devices"] });
                              } catch (err: any) {
                                toast({ title: "Erro ao desconectar", description: err?.message, variant: "destructive" });
                              }
                            }}
                            className="h-9 px-3 gap-1.5 shrink-0 border-destructive/20 text-destructive hover:bg-destructive/10"
                          >
                            <WifiOff size={14} />
                            <span className="text-[10px]">Desconectar</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openQrDialog(d.id)}
                          className={`h-9 px-3 gap-1.5 shrink-0 ${
                            isConnected
                              ? "border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
                              : "border-primary/30 text-primary hover:bg-primary/10"
                          }`}
                        >
                          <QrCode size={14} />
                          <span className="text-[10px]">{isConnected ? "Reconectar" : "Conectar"}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Select group */}
          {configDeviceId && (
            <div className="p-5 space-y-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">2</div>
                  <label className="text-xs font-semibold text-foreground">Selecione o Grupo</label>
                </div>
                <button
                  onClick={() => fetchGroups(configDeviceId)}
                  disabled={loadingGroups}
                  className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 transition-colors bg-primary/5 rounded-md px-2 py-1"
                >
                  <RefreshCw size={10} className={loadingGroups ? "animate-spin" : ""} />
                  Atualizar
                </button>
              </div>

              {loadingGroups ? (
                <div className="flex items-center justify-center py-8 bg-muted/10 rounded-xl border border-dashed border-border">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                  <span className="text-xs text-muted-foreground">Buscando grupos...</span>
                </div>
              ) : deviceGroups.length === 0 ? (
                <div className="text-center py-6 bg-muted/10 rounded-xl border border-dashed border-border space-y-1">
                  <Users size={20} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhum grupo encontrado.</p>
                  <p className="text-[10px] text-muted-foreground/60">Verifique se a instância está conectada.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-1.5">
                    {deviceGroups.map((g: any) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          setConfigGroupId(g.id);
                          setConfigGroupName(g.name);
                        }}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all text-left ${
                          configGroupId === g.id ? "bg-primary/10 border-primary/40" : "bg-muted/10 border-border hover:border-primary/20"
                        }`}
                      >
                        <Users size={14} className={configGroupId === g.id ? "text-primary" : "text-muted-foreground"} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{g.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{g.id}</p>
                        </div>
                        {g.participants > 0 && (
                          <span className="text-[9px] text-muted-foreground">{g.participants} membros</span>
                        )}
                        {configGroupId === g.id && <Check size={14} className="text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Summary + Save */}
          <div className="p-5 space-y-3">
            {configGroupId && configGroupName && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2.5">
                <Check size={14} className="text-primary shrink-0" />
                <div className="text-xs">
                  <span className="text-muted-foreground">Grupo: </span>
                  <span className="font-semibold text-foreground">{configGroupName}</span>
                </div>
              </div>
            )}

            <Button onClick={saveConfig} disabled={!configDeviceId || !configGroupId || isPending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-10 gap-2">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={15} />}
              Salvar Configuração
            </Button>
          </div>
        </div>
      </div>
      </>
    );
  }

  // ─── DETAIL VIEW (Simple: info + message + send button) ───
  if (view === "detail" && selectedClient) {
    const daysLeft = getDaysLeft(selectedClient.plan_expires_at);
    const status = getStatusBadge(daysLeft);
    const tpl = TEMPLATES.find(t => t.type === selectedTemplate);

    const vars = {
      nome: selectedClient.full_name || selectedClient.email,
      plano: selectedClient.plan_name || "Sem plano",
      vencimento: selectedClient.plan_expires_at ? new Date(selectedClient.plan_expires_at).toLocaleDateString("pt-BR") : "—",
      dias_restantes: daysLeft !== null ? String(daysLeft) : "—",
      suporte_numero: SUPORTE_NUMERO,
    };

    const message = tpl ? tpl.build(vars) : "";

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setView("list"); setSelectedClient(null); }} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <h2 className="text-lg font-bold text-foreground">Enviar Relatório</h2>
        </div>

        {/* Client info card */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{selectedClient.full_name || "Sem nome"}</p>
              <p className="text-xs text-muted-foreground truncate">{selectedClient.email}</p>
            </div>
            <Badge variant="outline" className={`text-[10px] ${status.className}`}>{status.label}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 rounded-lg p-3 border border-border/50">
            <div><span className="text-muted-foreground">Telefone:</span> <span className="font-medium text-foreground">{selectedClient.phone || "—"}</span></div>
            <div><span className="text-muted-foreground">Plano:</span> <span className="font-medium text-foreground">{selectedClient.plan_name || "Sem plano"}</span></div>
            <div><span className="text-muted-foreground">Vencimento:</span> <span className="font-medium text-foreground">{selectedClient.plan_expires_at ? new Date(selectedClient.plan_expires_at).toLocaleDateString("pt-BR") : "—"}</span></div>
            <div><span className="text-muted-foreground">Instâncias:</span> <span className="font-medium text-foreground">{selectedClient.devices_connected}/{selectedClient.devices_count}</span></div>
          </div>
        </div>

        {/* Template selector (simple pills) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Tipo de mensagem:</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map(t => {
              const isActive = selectedTemplate === t.type;
              return (
                <button
                  key={t.type}
                  onClick={() => setSelectedTemplate(t.type)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border text-foreground hover:border-primary/30"
                  }`}
                >
                  <t.icon size={12} className={isActive ? "" : t.color} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Message preview */}
        {tpl && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Mensagem que será enviada no PV do cliente:</p>
            <div className="bg-muted/30 rounded-xl p-4 border border-border">
              <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
            </div>
          </div>
        )}

        {/* SEND BUTTON — big and obvious */}
        <Button
          onClick={sendToGroup}
          disabled={isSending || !isConfigured || !tpl}
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold gap-2"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {isSending ? "Enviando..." : "Enviar no PV + Notificar Grupo"}
        </Button>

        {!isConfigured && (
          <button onClick={() => setView("config")} className="w-full text-center text-xs text-primary hover:underline">
            ⚠️ Configure a instância e grupo primeiro →
          </button>
        )}
      </div>
    );
  }

  // ─── HISTORY VIEW ───
  if (view === "history") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <History size={20} className="text-primary" />
          <h2 className="text-lg font-bold text-foreground">Histórico de Envios</h2>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          {historyLoading ? (
            <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-xs text-center py-8">Nenhuma notificação enviada ainda</p>
          ) : (
            <div className="space-y-1.5 max-h-[calc(100vh-300px)] overflow-y-auto">
              {history.map((m: any) => {
                const tpl = TEMPLATES.find(t => t.type === m.template_type);
                return (
                  <div key={m.id} className="flex items-start gap-3 bg-muted/20 rounded-lg px-3 py-2.5 border border-border/50">
                    <div className="shrink-0 mt-0.5">
                      {tpl ? <tpl.icon size={14} className={tpl.color} /> : <MessageCircle size={14} className="text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-foreground">{tpl?.label || m.template_type}</span>
                      <span className="text-[9px] text-muted-foreground ml-2">
                        {new Date(m.sent_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {m.observation && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{m.observation}</p>}
                    </div>
                    <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-500 shrink-0">
                      <Check size={8} className="mr-0.5" /> Enviado
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── MAIN LIST ───
  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Radio size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground tracking-tight">Relatório via WhatsApp</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Clique no cliente → veja a mensagem → envie</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setView("history")}
              className="text-[11px] h-8 gap-1.5 rounded-lg border-border hover:bg-muted/30">
              <History size={13} /> Histórico
            </Button>
            <Button variant="outline" size="sm" onClick={() => setView("config")}
              className={`text-[11px] h-8 gap-1.5 rounded-lg ${
                isConfigured
                  ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10"
                  : "border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10"
              }`}>
              {isConfigured ? <Wifi size={13} /> : <WifiOff size={13} />}
              {isConfigured ? "Conectado" : "Configurar"}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-10 bg-card border-border text-sm rounded-xl"
          />
        </div>

        {/* Client list */}
        <ScrollArea className="max-h-[calc(100vh-320px)]">
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <User size={28} className="text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground text-sm">Nenhum cliente encontrado</p>
              </div>
            ) : filteredUsers.map(u => {
              const d = getDaysLeft(u.plan_expires_at);
              const status = getStatusBadge(d);
              return (
                <button key={u.id} onClick={() => openClient(u)}
                  className="w-full flex items-center gap-3.5 bg-card border border-border rounded-xl px-4 py-3.5 hover:border-primary/30 hover:bg-primary/[0.02] transition-all text-left group">
                  <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <User size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{u.full_name || u.email}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{u.phone || "—"} · {u.plan_name || "Sem plano"}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] px-2.5 py-0.5 shrink-0 rounded-md ${status.className}`}>
                    {status.label}
                  </Badge>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      {qrDialog}
    </>
  );
};

export default AdminMessages;
