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
  Loader2, Check, User, ArrowLeft, Wifi, WifiOff,
  Settings2, Smartphone, History, Radio, Users, RefreshCw
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

  // Filter users
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

  // ─── CONFIG VIEW ───
  if (view === "config") {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <Settings2 size={20} className="text-primary" />
          <h2 className="text-lg font-bold text-foreground">Configuração</h2>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Instância WhatsApp</label>
            {adminDevices.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border">
                Nenhuma instância encontrada.
              </p>
            ) : (
              <div className="space-y-1.5">
                {adminDevices.map((d: any) => (
                  <button
                    key={d.id}
                    onClick={() => setConfigDeviceId(d.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-all text-left ${
                      configDeviceId === d.id ? "bg-primary/10 border-primary/40" : "bg-muted/20 border-border hover:border-primary/20"
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

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">ID do Grupo WhatsApp</label>
            <p className="text-[10px] text-muted-foreground">Cole o JID do grupo (ex: 5562999999999-1234567890@g.us)</p>
            <Input
              placeholder="5562999999999-1234567890@g.us"
              value={configGroupId}
              onChange={e => setConfigGroupId(e.target.value)}
              className="h-9 bg-background border-border text-sm font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Nome do Grupo (opcional)</label>
            <Input
              placeholder="Ex: Notificações DG Pro"
              value={configGroupName}
              onChange={e => setConfigGroupName(e.target.value)}
              className="h-9 bg-background border-border text-sm"
            />
          </div>

          <Button onClick={saveConfig} disabled={!configDeviceId || !configGroupId || isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9">
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check size={14} className="mr-1.5" />}
            Salvar
          </Button>
        </div>
      </div>
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Radio size={20} className="text-emerald-500" />
          <div>
            <h2 className="text-lg font-bold text-foreground">Relatório via WhatsApp</h2>
            <p className="text-xs text-muted-foreground">Clique no cliente → veja a mensagem → envie</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setView("history")} className="text-xs h-8 gap-1.5">
            <History size={13} /> Histórico
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

      {!isConfigured && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-3">
          <p className="text-xs text-destructive font-medium">⚠️ Configure uma instância e grupo para enviar relatórios.</p>
          <button onClick={() => setView("config")} className="text-xs text-primary hover:underline mt-1">Configurar agora →</button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 bg-card border-border text-sm" />
      </div>

      {/* Client list */}
      <ScrollArea className="max-h-[calc(100vh-320px)]">
        <div className="space-y-1">
          {filteredUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-12">Nenhum cliente encontrado</p>
          ) : filteredUsers.map(u => {
            const d = getDaysLeft(u.plan_expires_at);
            const status = getStatusBadge(d);
            return (
              <button
                key={u.id}
                onClick={() => openClient(u)}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 hover:bg-muted/20 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                  <User size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.full_name || u.email}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{u.phone || "—"} · {u.plan_name || "Sem plano"}</p>
                </div>
                <Badge variant="outline" className={`text-[9px] shrink-0 ${status.className}`}>
                  {status.label}
                </Badge>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdminMessages;
