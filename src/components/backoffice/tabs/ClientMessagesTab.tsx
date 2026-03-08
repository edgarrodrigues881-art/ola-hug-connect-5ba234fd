import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Loader2, Send, MessageCircle, Clock, AlertTriangle, XCircle, Skull, Trash2 } from "lucide-react";

const SUPORTE_NUMERO = "(62) 99419-2500";

const TEMPLATES = [
  {
    type: "boas-vindas",
    label: "Boas-vindas",
    icon: MessageCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    bgActive: "bg-emerald-500 text-white",
    desc: "Enviada no primeiro login do cliente",
    build: (v: any) => {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 3);
      const trialVencimento = trialEnd.toLocaleDateString("pt-BR");
      return `Olá ${v.nome}! 👋\n\nSeja bem-vindo(a) ao DG CONTINGÊNCIA PRO!\n\nSeu plano Trial de 3 dias já está ativo.\nVencimento: ${trialVencimento}\n\nQualquer dúvida, fale com nosso suporte: ${v.suporte_numero}\n\nBons envios! 🚀`;
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
      `Olá ${v.nome}!\n\nSeu plano ${v.plano} vence em ${v.dias_restantes} dias (${v.vencimento}).\n\nRenove agora para não perder o acesso às suas instâncias.\n\nSuporte: ${v.suporte_numero}`,
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
      `${v.nome}, seu plano ${v.plano} vence HOJE (${v.vencimento})!\n\nSem renovação, suas instâncias serão bloqueadas.\n\nRenove agora → Suporte: ${v.suporte_numero}`,
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
      `${v.nome}, seu plano ${v.plano} está vencido desde ${v.vencimento}.\n\nSuas instâncias estão bloqueadas para novas criações.\n\nRenove para reativar → ${v.suporte_numero}`,
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
      `${v.nome}, já se passaram 7 dias desde o vencimento do seu plano ${v.plano}.\n\nSuas instâncias continuam bloqueadas.\n\nPrecisa de ajuda para renovar? → ${v.suporte_numero}`,
  },
  {
    type: "vencido-30-dias",
    label: "Vencido 30 dias",
    icon: Skull,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/20",
    bgActive: "bg-destructive text-destructive-foreground",
    desc: "30 dias após — remoção iminente",
    build: (v: any) =>
      `${v.nome}, seu plano ${v.plano} está vencido há 30 dias.\n\nPor questões de segurança, suas instâncias poderão ser removidas em breve.\n\nEntre em contato: ${v.suporte_numero}`,
  },
];

interface Props { client: AdminUser; detail: any; }

const ClientMessagesTab = ({ client, detail }: Props) => {
  const sub = detail?.subscription;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useAdminAction();

  const daysLeft = sub?.expires_at
    ? Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000)
    : null;

  const vars = {
    nome: client.full_name || client.email,
    plano: sub?.plan_name || client.plan_name || "Sem plano",
    vencimento: sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-BR") : "—",
    dias_restantes: daysLeft !== null ? String(daysLeft) : "—",
    suporte_numero: SUPORTE_NUMERO,
  };

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [observation, setObservation] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedTpl = TEMPLATES.find(t => t.type === selectedTemplate);
  const message = useMemo(() => selectedTpl ? selectedTpl.build(vars) : "", [selectedTemplate, vars]);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["admin-messages", client.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-data?action=list-messages", {
        body: { target_user_id: client.id },
      });
      if (error) throw error;
      return data?.messages || [];
    },
  });

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Mensagem copiada!" });
  };

  const markAsSent = () => {
    if (!selectedTemplate) return;
    mutate(
      {
        action: "save-message",
        body: { target_user_id: client.id, template_type: selectedTemplate, message_content: message, observation },
      },
      {
        onSuccess: () => {
          toast({ title: "Marcado como enviado" });
          setObservation("");
          queryClient.invalidateQueries({ queryKey: ["admin-messages", client.id] });
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  // Detect suggested template based on daysLeft
  const suggestedType = daysLeft !== null
    ? daysLeft <= -30 ? "vencido-30-dias"
      : daysLeft <= -7 ? "vencido-7-dias"
      : daysLeft <= -1 ? "vencido-1-dia"
      : daysLeft === 0 ? "vence-hoje"
      : daysLeft <= 3 ? "faltam-3-dias"
      : null
    : null;

  return (
    <div className="space-y-4">
      {/* ── Ciclo de vida ── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ciclo de Vida — Mensagens</p>

        {/* Timeline visual */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {TEMPLATES.map((t) => {
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

      {/* ── Preview + Ações ── */}
      {selectedTpl && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Prévia da Mensagem</p>
            <Badge variant="outline" className="text-[9px] border-border">{selectedTpl.label}</Badge>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 border border-border">
            <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{message}</pre>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-medium">Observação (opcional)</p>
            <Textarea
              value={observation}
              onChange={e => setObservation(e.target.value)}
              className="bg-muted/30 border-border text-foreground text-xs min-h-[60px]"
              rows={2}
              placeholder="Ex: Cliente disse que paga amanhã..."
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={markAsSent} disabled={isPending} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send size={13} className="mr-1.5" />}
              Marcar como Enviado
            </Button>
          </div>
        </div>
      )}

      {/* ── Histórico ── */}
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Histórico de Envios</p>
        {isLoading ? (
          <div className="text-center py-6"><Loader2 className="w-4 h-4 animate-spin mx-auto text-primary" /></div>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-6">Nenhuma mensagem enviada para este cliente</p>
        ) : (
          <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
            {history.map((m: any) => {
              const tpl = TEMPLATES.find(t => t.type === m.template_type);
              return (
                <div key={m.id} className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2 border border-border/50">
                  <div className="shrink-0">
                    {tpl ? <tpl.icon size={13} className={tpl.color} /> : <MessageCircle size={13} className="text-muted-foreground" />}
                  </div>
                  <span className="text-[10px] font-semibold text-foreground">{tpl?.label || m.template_type}</span>
                  <span className="text-[9px] text-muted-foreground ml-auto shrink-0">{new Date(m.sent_at).toLocaleDateString("pt-BR")}</span>
                  <button
                    onClick={() => deleteMessage(m.id)}
                    className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors ml-1"
                    title="Apagar"
                  >
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
};

export default ClientMessagesTab;
