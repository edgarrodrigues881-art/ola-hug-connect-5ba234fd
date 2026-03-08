import { useState, useMemo } from "react";
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
  Loader2, Check, ChevronRight, Trash2, User, ArrowLeft
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
    desc: "Primeiro login do cliente",
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
    desc: "3 dias antes do vencimento",
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
    desc: "1 dia após o vencimento",
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
    desc: "7 dias após o vencimento",
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
    desc: "30 dias — remoção iminente",
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

const AdminMessages = () => {
  const { data } = useAdminDashboard();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useAdminAction();

  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<AdminUser | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const users = data?.users || [];

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    );
  }, [users, search]);

  const daysLeft = selectedClient ? getDaysLeft(selectedClient.plan_expires_at) : null;
  const suggestedType = getSuggestedType(daysLeft);

  const vars = selectedClient ? {
    nome: selectedClient.full_name || selectedClient.email,
    plano: selectedClient.plan_name || "Sem plano",
    vencimento: selectedClient.plan_expires_at ? new Date(selectedClient.plan_expires_at).toLocaleDateString("pt-BR") : "—",
    dias_restantes: daysLeft !== null ? String(daysLeft) : "—",
    suporte_numero: SUPORTE_NUMERO,
  } : null;

  const selectedTpl = TEMPLATES.find(t => t.type === selectedTemplate);
  const message = useMemo(() => (selectedTpl && vars) ? selectedTpl.build(vars) : "", [selectedTemplate, vars]);

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["admin-messages", selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient) return [];
      const { data, error } = await supabase.functions.invoke("admin-data?action=list-messages", {
        body: { target_user_id: selectedClient.id },
      });
      if (error) throw error;
      return data?.messages || [];
    },
    enabled: !!selectedClient,
  });

  const markAsSent = () => {
    if (!selectedTemplate || !selectedClient) return;
    mutate(
      {
        action: "save-message",
        body: { target_user_id: selectedClient.id, template_type: selectedTemplate, message_content: message, observation: "" },
      },
      {
        onSuccess: () => {
          toast({ title: "✅ Marcado como enviado" });
          queryClient.invalidateQueries({ queryKey: ["admin-messages", selectedClient.id] });
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const deleteMessage = (messageId: string) => {
    if (!selectedClient) return;
    mutate(
      { action: "delete-message", body: { message_id: messageId, target_user_id: selectedClient.id } },
      {
        onSuccess: () => {
          toast({ title: "Mensagem apagada" });
          queryClient.invalidateQueries({ queryKey: ["admin-messages", selectedClient.id] });
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  // ── Client selected view ──
  if (selectedClient) {
    return (
      <div className="space-y-5">
        {/* Back + Client Info */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedClient(null); setSelectedTemplate(null); }} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User size={16} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{selectedClient.full_name || selectedClient.email}</p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{selectedClient.plan_name || "Sem plano"}</span>
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
              const isActive = selectedTemplate === t.type;
              const isSuggested = suggestedType === t.type;
              return (
                <button
                  key={t.type}
                  onClick={() => setSelectedTemplate(isActive ? null : t.type)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all text-center cursor-pointer
                    ${isActive ? `${t.bgActive} border-transparent shadow-md` : `${t.bg} hover:opacity-80`}
                  `}
                >
                  {isSuggested && !isActive && (
                    <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary rounded-full animate-pulse" />
                  )}
                  <Icon size={16} className={isActive ? "" : t.color} />
                  <span className={`text-[10px] font-semibold leading-tight ${isActive ? "" : "text-foreground"}`}>{t.label}</span>
                  <span className={`text-[8px] leading-tight ${isActive ? "opacity-80" : "text-muted-foreground"}`}>{t.desc}</span>
                </button>
              );
            })}
          </div>
          {suggestedType && !selectedTemplate && (
            <p className="text-[10px] text-primary mt-2 flex items-center gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Sugestão automática baseada no vencimento ({daysLeft} dias)
            </p>
          )}
        </div>

        {/* Preview + Send */}
        {selectedTpl && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Prévia da Mensagem</p>
              <Badge variant="outline" className="text-[9px] border-border">{selectedTpl.label}</Badge>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border border-border">
              <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
            </div>
            <Button onClick={markAsSent} disabled={isPending} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send size={13} className="mr-1.5" />}
              Marcar como Enviado
            </Button>
          </div>
        )}

        {/* History */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Histórico de Envios</p>
          {historyLoading ? (
            <div className="text-center py-6"><Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" /></div>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground text-xs text-center py-6">Nenhuma mensagem enviada</p>
          ) : (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {history.map((m: any) => {
                const tpl = TEMPLATES.find(t => t.type === m.template_type);
                return (
                  <div key={m.id} className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2 border border-border/50">
                    <div className="shrink-0">
                      {tpl ? <tpl.icon size={13} className={tpl.color} /> : <MessageCircle size={13} className="text-muted-foreground" />}
                    </div>
                    <span className="text-[10px] font-semibold text-foreground">{tpl?.label || m.template_type}</span>
                    <span className="text-[9px] text-muted-foreground ml-auto shrink-0">{new Date(m.sent_at).toLocaleDateString("pt-BR")}</span>
                    <button onClick={() => deleteMessage(m.id)} className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors ml-1" title="Apagar">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Client selection view ──
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <MessageCircle size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Mensagens</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Envie notificações de ciclo de vida para os clientes</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 bg-card border-border text-sm" />
      </div>

      {/* Client list */}
      <ScrollArea className="max-h-[calc(100vh-280px)]">
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">Nenhum cliente encontrado</p>
          ) : filtered.map(u => {
            const d = getDaysLeft(u.plan_expires_at);
            const suggested = getSuggestedType(d);
            return (
              <button
                key={u.id}
                onClick={() => setSelectedClient(u)}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/30 hover:bg-muted/20 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                  <User size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.full_name || u.email}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{u.phone || "—"} · {u.plan_name || "Sem plano"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {suggested && (
                    <Badge variant="outline" className={`text-[9px] ${
                      suggested.includes("vencido") ? "border-destructive/30 text-destructive" :
                      suggested === "vence-hoje" ? "border-orange-500/30 text-orange-500" :
                      "border-yellow-500/30 text-yellow-500"
                    }`}>
                      {TEMPLATES.find(t => t.type === suggested)?.label}
                    </Badge>
                  )}
                  <ChevronRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdminMessages;
