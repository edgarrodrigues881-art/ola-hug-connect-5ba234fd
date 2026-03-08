import { useState, useMemo, useEffect } from "react";
import { useAdminDashboard, useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Send, MessageCircle, Clock, AlertTriangle, XCircle, Skull,
  Loader2, Check, ChevronRight, User, ArrowLeft, Wifi, WifiOff,
  Settings2, Radio, Smartphone, RefreshCw, Trash2, History, Zap
} from "lucide-react";

const SUPORTE_NUMERO = "(62) 99419-2500";

const TEMPLATES = [
  {
    type: "boas-vindas",
    label: "Boas-vindas",
    icon: MessageCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    bgActive: "bg-emerald-500 text-white",
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
    bg: "bg-yellow-500/10 border-yellow-500/20",
    bgActive: "bg-yellow-500 text-black",
    desc: "3 dias p/ vencer",
    build: (v: any) =>
      `Olá ${v.nome}!\n\nSeu plano ${v.plano} vence em ${v.dias_restantes} dias (${v.vencimento}).\n\nRenove agora para não perder o acesso.\n\nSuporte: ${v.suporte_numero}`,
  },
  {
    type: "vence-hoje",
    label: "Vence hoje",
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-500/10 border-orange-500/20",
    bgActive: "bg-orange-500 text-white",
    desc: "No dia do vencimento",
    build: (v: any) =>
      `${v.nome}, seu plano ${v.plano} vence HOJE (${v.vencimento})!\n\nSem renovação, suas instâncias serão bloqueadas.\n\nRenove → ${v.suporte_numero}`,
  },
  {
    type: "vencido-1-dia",
    label: "Vencido 1 dia",
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/20",
    bgActive: "bg-destructive text-destructive-foreground",
    desc: "1 dia vencido",
    build: (v: any) =>
      `${v.nome}, seu plano ${v.plano} está vencido desde ${v.vencimento}.\n\nSuas instâncias estão bloqueadas.\n\nRenove → ${v.suporte_numero}`,
  },
  {
    type: "vencido-7-dias",
    label: "Vencido 7 dias",
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/20",
    bgActive: "bg-destructive text-destructive-foreground",
    desc: "7 dias vencido",
    build: (v: any) =>
      `${v.nome}, já se passaram 7 dias desde o vencimento do plano ${v.plano}.\n\nSuas instâncias continuam bloqueadas.\n\nAjuda? → ${v.suporte_numero}`,
  },
  {
    type: "vencido-30-dias",
    label: "Vencido 30 dias",
    icon: Skull,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/20",
    bgActive: "bg-destructive text-destructive-foreground",
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
  if (daysLeft === null) return null;
  if (daysLeft <= -30) return "vencido-30-dias";
  if (daysLeft <= -7) return "vencido-7-dias";
  if (daysLeft <= -1) return "vencido-1-dia";
  if (daysLeft === 0) return "vence-hoje";
  if (daysLeft <= 3) return "faltam-3-dias";
  return null;
}

type ViewMode = "pending" | "config" | "client-detail" | "history";

const AdminMessages = () => {
  const { data } = useAdminDashboard();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useAdminAction();

  const [view, setView] = useState<ViewMode>("pending");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<AdminUser | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Config state
  const [configDeviceId, setConfigDeviceId] = useState("");
  const [configGroupId, setConfigGroupId] = useState("");
  const [configGroupName, setConfigGroupName] = useState("");

  const users = data?.users || [];

  // Load WhatsApp report config
  const { data: reportConfig, isLoading: configLoading, refetch: refetchConfig } = useQuery({
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

  // Set config from loaded data
  useEffect(() => {
    if (reportConfig) {
      setConfigDeviceId(reportConfig.device_id || "");
      setConfigGroupId(reportConfig.group_id || "");
      setConfigGroupName(reportConfig.group_name || "");
    }
  }, [reportConfig]);

  const isConfigured = !!reportConfig?.device_id && !!reportConfig?.group_id;
  const connectedDevice = adminDevices.find((d: any) => d.id === (reportConfig?.device_id || configDeviceId));

  // Filter users with pending notifications
  const pendingUsers = useMemo(() => {
    return users.filter(u => {
      const d = getDaysLeft(u.plan_expires_at);
      return d !== null && getSuggestedType(d) !== null;
    }).sort((a, b) => {
      const da = getDaysLeft(a.plan_expires_at) ?? 999;
      const db = getDaysLeft(b.plan_expires_at) ?? 999;
      return da - db;
    });
  }, [users]);

  const filteredPending = useMemo(() => {
    if (!search) return pendingUsers;
    const q = search.toLowerCase();
    return pendingUsers.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  }, [pendingUsers, search]);

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

  // Send notification to WhatsApp group
  const sendToGroup = (client: AdminUser, templateType: string) => {
    if (!isConfigured) {
      toast({ title: "Configure primeiro", description: "Conecte uma instância e selecione o grupo", variant: "destructive" });
      setView("config");
      return;
    }

    const daysLeft = getDaysLeft(client.plan_expires_at);
    const tpl = TEMPLATES.find(t => t.type === templateType);
    if (!tpl) return;

    const vars = {
      nome: client.full_name || client.email,
      plano: client.plan_name || "Sem plano",
      vencimento: client.plan_expires_at ? new Date(client.plan_expires_at).toLocaleDateString("pt-BR") : "—",
      dias_restantes: daysLeft !== null ? String(daysLeft) : "—",
      suporte_numero: SUPORTE_NUMERO,
    };

    const messageToSend = tpl.build(vars);

    // Build the group notification
    const groupNotification =
      `📋 *RELATÓRIO DG CONTINGÊNCIA PRO*\n\n` +
      `👤 *Cliente:* ${client.full_name || "—"}\n` +
      `📧 *Email:* ${client.email}\n` +
      `📱 *Telefone:* ${client.phone || "—"}\n` +
      `📦 *Plano:* ${client.plan_name || "Sem plano"}\n` +
      `📅 *Vencimento:* ${client.plan_expires_at ? new Date(client.plan_expires_at).toLocaleDateString("pt-BR") : "—"}\n` +
      `⏳ *Status:* ${daysLeft !== null ? (daysLeft <= 0 ? `Vencido há ${Math.abs(daysLeft)} dia(s)` : `${daysLeft} dia(s) restante(s)`) : "—"}\n` +
      `🏷️ *Tipo:* ${tpl.label}\n\n` +
      `─────────────────\n` +
      `✉️ *Mensagem para enviar:*\n\n${messageToSend}`;

    setIsSending(true);
    mutate(
      {
        action: "wa-report-send-group",
        body: {
          target_user_id: client.id,
          template_type: templateType,
          message_content: messageToSend,
          group_notification: groupNotification,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "✅ Enviado para o grupo!" });
          queryClient.invalidateQueries({ queryKey: ["admin-wa-report-history"] });
          setIsSending(false);
          if (view === "client-detail") {
            setView("pending");
            setSelectedClient(null);
            setSelectedTemplate(null);
          }
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
          setView("pending");
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  // ─── CONFIG VIEW ───
  if (view === "config") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("pending")} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Settings2 size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Configuração</h2>
            <p className="text-xs text-muted-foreground">Conecte uma instância e selecione o grupo de notificações</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          {/* Device selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Instância WhatsApp (Admin)</label>
            <p className="text-[10px] text-muted-foreground">Selecione a instância que enviará as notificações ao grupo</p>
            {adminDevices.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border">
                Nenhuma instância encontrada. Crie uma instância primeiro.
              </p>
            ) : (
              <div className="space-y-1.5">
                {adminDevices.map((d: any) => (
                  <button
                    key={d.id}
                    onClick={() => setConfigDeviceId(d.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-all text-left ${
                      configDeviceId === d.id
                        ? "bg-primary/10 border-primary/40"
                        : "bg-muted/20 border-border hover:border-primary/20"
                    }`}
                  >
                    <Smartphone size={14} className={configDeviceId === d.id ? "text-primary" : "text-muted-foreground"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">{d.number || "Sem número"}</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] ${
                      d.status === "Connected" ? "border-emerald-500/30 text-emerald-500" : "border-destructive/30 text-destructive"
                    }`}>
                      {d.status === "Connected" ? <Wifi size={9} className="mr-1" /> : <WifiOff size={9} className="mr-1" />}
                      {d.status}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Group ID */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">ID do Grupo WhatsApp</label>
            <p className="text-[10px] text-muted-foreground">Cole o JID do grupo privado (ex: 5562999999999-1234567890@g.us)</p>
            <Input
              placeholder="5562999999999-1234567890@g.us"
              value={configGroupId}
              onChange={e => setConfigGroupId(e.target.value)}
              className="h-9 bg-background border-border text-sm font-mono"
            />
          </div>

          {/* Group name (optional) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Nome do Grupo (opcional)</label>
            <Input
              placeholder="Ex: Notificações DG Pro"
              value={configGroupName}
              onChange={e => setConfigGroupName(e.target.value)}
              className="h-9 bg-background border-border text-sm"
            />
          </div>

          <Button
            onClick={saveConfig}
            disabled={!configDeviceId || !configGroupId || isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check size={14} className="mr-1.5" />}
            Salvar Configuração
          </Button>
        </div>
      </div>
    );
  }

  // ─── CLIENT DETAIL VIEW ───
  if (view === "client-detail" && selectedClient) {
    const daysLeft = getDaysLeft(selectedClient.plan_expires_at);
    const suggestedType = getSuggestedType(daysLeft);

    const vars = {
      nome: selectedClient.full_name || selectedClient.email,
      plano: selectedClient.plan_name || "Sem plano",
      vencimento: selectedClient.plan_expires_at ? new Date(selectedClient.plan_expires_at).toLocaleDateString("pt-BR") : "—",
      dias_restantes: daysLeft !== null ? String(daysLeft) : "—",
      suporte_numero: SUPORTE_NUMERO,
    };

    const selectedTpl = TEMPLATES.find(t => t.type === (selectedTemplate || suggestedType));
    const message = selectedTpl ? selectedTpl.build(vars) : "";
    const activeTemplate = selectedTemplate || suggestedType;

    return (
      <div className="space-y-5">
        {/* Back + Client Info */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setView("pending"); setSelectedClient(null); setSelectedTemplate(null); }} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{selectedClient.full_name || selectedClient.email}</p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{selectedClient.email}</span>
                <span>·</span>
                <span>{selectedClient.phone || "—"}</span>
                {daysLeft !== null && (
                  <>
                    <span>·</span>
                    <span className={daysLeft <= 0 ? "text-destructive font-semibold" : daysLeft <= 3 ? "text-yellow-500 font-semibold" : ""}>
                      {daysLeft <= 0 ? `${Math.abs(daysLeft)}d vencido` : `${daysLeft}d restantes`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Selecionar Notificação</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {TEMPLATES.map(t => {
              const Icon = t.icon;
              const isActive = activeTemplate === t.type;
              const isSuggested = suggestedType === t.type && !selectedTemplate;
              return (
                <button
                  key={t.type}
                  onClick={() => setSelectedTemplate(t.type)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all text-center cursor-pointer
                    ${isActive ? `${t.bgActive} border-transparent shadow-md` : `${t.bg} hover:opacity-80`}
                  `}
                >
                  {isSuggested && (
                    <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full animate-pulse" />
                  )}
                  <Icon size={16} className={isActive ? "" : t.color} />
                  <span className={`text-[10px] font-semibold leading-tight ${isActive ? "" : "text-foreground"}`}>{t.label}</span>
                  <span className={`text-[8px] leading-tight ${isActive ? "opacity-80" : "text-muted-foreground"}`}>{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview + Send */}
        {selectedTpl && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Prévia do Relatório para o Grupo</p>
              <Badge variant="outline" className="text-[9px] border-border">{selectedTpl.label}</Badge>
            </div>

            {/* Group notification preview */}
            <div className="bg-muted/30 rounded-lg p-3 border border-border space-y-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium text-foreground">{selectedClient.full_name || "—"}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium text-foreground">{selectedClient.email}</span></div>
                <div><span className="text-muted-foreground">Telefone:</span> <span className="font-medium text-foreground">{selectedClient.phone || "—"}</span></div>
                <div><span className="text-muted-foreground">Plano:</span> <span className="font-medium text-foreground">{selectedClient.plan_name || "Sem plano"}</span></div>
              </div>
              <div className="border-t border-border pt-2">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">Mensagem para enviar ao cliente:</p>
                <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => sendToGroup(selectedClient, activeTemplate!)}
                disabled={isSending || !isConfigured}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
              >
                {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send size={13} className="mr-1.5" />}
                Enviar para o Grupo
              </Button>
              {!isConfigured && (
                <button onClick={() => setView("config")} className="text-[10px] text-primary hover:underline">
                  Configure a instância primeiro →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── HISTORY VIEW ───
  if (view === "history") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("pending")} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <History size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Histórico de Envios</h2>
            <p className="text-xs text-muted-foreground">Mensagens enviadas para o grupo</p>
          </div>
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{tpl?.label || m.template_type}</span>
                        <span className="text-[9px] text-muted-foreground">{new Date(m.sent_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {m.observation && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Cliente: {m.observation}</p>}
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

  // ─── PENDING LIST (Main view) ───
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Radio size={20} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Relatório via WhatsApp</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Envie relatórios de clientes para seu grupo privado</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setView("history")} className="text-xs h-8 gap-1.5">
            <History size={13} />
            Histórico
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView("config")}
            className={`text-xs h-8 gap-1.5 ${isConfigured ? "border-emerald-500/30 text-emerald-600" : "border-destructive/30 text-destructive"}`}
          >
            {isConfigured ? <Wifi size={13} /> : <WifiOff size={13} />}
            {isConfigured ? "Conectado" : "Configurar"}
          </Button>
        </div>
      </div>

      {/* Connection status */}
      {isConfigured && connectedDevice && (
        <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
          <Smartphone size={13} className="text-emerald-500" />
          <span className="text-[11px] text-foreground font-medium">{connectedDevice.name}</span>
          <span className="text-[10px] text-muted-foreground">({connectedDevice.number || "—"})</span>
          <span className="text-[10px] text-muted-foreground">→</span>
          <span className="text-[11px] text-foreground font-medium">{reportConfig?.group_name || "Grupo"}</span>
        </div>
      )}

      {!isConfigured && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-3">
          <p className="text-xs text-destructive font-medium">⚠️ Configure uma instância WhatsApp e grupo para começar a enviar relatórios.</p>
          <button onClick={() => setView("config")} className="text-xs text-primary hover:underline mt-1">Configurar agora →</button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar cliente pendente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 bg-card border-border text-sm" />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-[10px] border-border gap-1">
          <Zap size={10} className="text-yellow-500" />
          {pendingUsers.length} pendente(s)
        </Badge>
      </div>

      {/* Pending clients */}
      <ScrollArea className="max-h-[calc(100vh-380px)]">
        <div className="space-y-1.5">
          {filteredPending.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                <Check size={20} className="text-primary" />
              </div>
              <p className="text-muted-foreground text-sm">Nenhuma pendência no momento</p>
            </div>
          ) : filteredPending.map(u => {
            const d = getDaysLeft(u.plan_expires_at);
            const suggested = getSuggestedType(d);
            const tpl = TEMPLATES.find(t => t.type === suggested);
            return (
              <div
                key={u.id}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 hover:bg-muted/20 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                  <User size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.full_name || u.email}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{u.phone || "—"} · {u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tpl && (
                    <Badge variant="outline" className={`text-[9px] ${
                      (suggested || "").includes("vencido") ? "border-destructive/30 text-destructive" :
                      suggested === "vence-hoje" ? "border-orange-500/30 text-orange-500" :
                      "border-yellow-500/30 text-yellow-500"
                    }`}>
                      {tpl.label}
                    </Badge>
                  )}
                  {/* Quick send button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (suggested) sendToGroup(u, suggested);
                    }}
                    disabled={!isConfigured || isSending || !suggested}
                    className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                    title="Enviar direto para o grupo"
                  >
                    <Send size={12} />
                  </Button>
                  {/* Detail button */}
                  <button
                    onClick={() => {
                      setSelectedClient(u);
                      setSelectedTemplate(null);
                      setView("client-detail");
                    }}
                    className="p-1 text-muted-foreground/40 hover:text-primary transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdminMessages;
