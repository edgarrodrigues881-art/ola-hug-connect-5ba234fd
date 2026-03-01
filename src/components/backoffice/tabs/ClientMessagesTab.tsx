import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Copy, Check, Loader2, Send } from "lucide-react";

const SUPORTE_NUMERO = "(11) 99999-9999"; // ajustar

const TEMPLATES: { type: string; label: string; build: (vars: any) => string }[] = [
  { type: "boas-vindas", label: "🎉 Boas-vindas", build: (v) =>
    `Olá ${v.nome}! 👋\n\nSeja bem-vindo(a) ao DG CONTINGÊNCIA PRO!\n\nSeu plano ${v.plano} já está ativo.\nVencimento: ${v.vencimento}\n\nQualquer dúvida, fale com nosso suporte: ${v.suporte_numero}\n\nBons envios! 🚀`
  },
  { type: "faltam-3-dias", label: "⚠️ Faltam 3 dias", build: (v) =>
    `Olá ${v.nome}!\n\nSeu plano ${v.plano} vence em ${v.dias_restantes} dias (${v.vencimento}).\n\nRenove agora para não perder o acesso às suas instâncias.\n\nSuporte: ${v.suporte_numero}`
  },
  { type: "vence-hoje", label: "🔴 Vence hoje", build: (v) =>
    `${v.nome}, seu plano ${v.plano} vence HOJE (${v.vencimento})!\n\nSem renovação, suas instâncias serão bloqueadas.\n\nRenove agora → Suporte: ${v.suporte_numero}`
  },
  { type: "vencido-1-dia", label: "❌ Vencido 1 dia", build: (v) =>
    `${v.nome}, seu plano ${v.plano} está vencido desde ${v.vencimento}.\n\nSuas instâncias estão bloqueadas para novas criações.\n\nRenove para reativar → ${v.suporte_numero}`
  },
  { type: "vencido-7-dias", label: "⚠️ Vencido 7 dias", build: (v) =>
    `${v.nome}, já se passaram 7 dias desde o vencimento do seu plano ${v.plano}.\n\nSuas instâncias continuam bloqueadas.\n\nPrecisa de ajuda para renovar? → ${v.suporte_numero}`
  },
  { type: "vencido-30-dias", label: "🗑️ Vencido 30 dias", build: (v) =>
    `${v.nome}, seu plano ${v.plano} está vencido há 30 dias.\n\nPor questões de segurança, suas instâncias poderão ser removidas em breve.\n\nEntre em contato: ${v.suporte_numero}`
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

  const message = useMemo(() => {
    const t = TEMPLATES.find(t => t.type === selectedTemplate);
    return t ? t.build(vars) : "";
  }, [selectedTemplate, vars]);

  // Fetch message history
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
        body: {
          target_user_id: client.id,
          template_type: selectedTemplate,
          message_content: message,
          observation,
        },
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

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquare size={20} className="text-purple-400" />
        <h3 className="text-lg font-semibold text-zinc-200">Mensagens (Manual)</h3>
      </div>

      {/* Template selector */}
      <div>
        <p className="text-xs text-zinc-400 mb-2">Selecione um template:</p>
        <div className="flex gap-2 flex-wrap">
          {TEMPLATES.map(t => (
            <Button
              key={t.type}
              size="sm"
              variant={selectedTemplate === t.type ? "default" : "outline"}
              onClick={() => setSelectedTemplate(t.type)}
              className={selectedTemplate === t.type ? "bg-purple-600 hover:bg-purple-700 text-white text-xs" : "border-zinc-700 text-zinc-400 text-xs"}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Message preview */}
      {selectedTemplate && (
        <div className="space-y-3">
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
            <p className="text-xs text-zinc-400 mb-2">Prévia da mensagem:</p>
            <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans">{message}</pre>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-1">Observação (opcional):</p>
            <Textarea
              value={observation}
              onChange={e => setObservation(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-zinc-100"
              rows={2}
              placeholder="Ex: Cliente disse que paga amanhã..."
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={copyMessage} variant="outline" size="sm" className="border-zinc-600 text-zinc-300 text-xs">
              {copied ? <Check size={14} className="mr-1.5 text-green-400" /> : <Copy size={14} className="mr-1.5" />}
              {copied ? "Copiado!" : "Copiar Mensagem"}
            </Button>
            <Button onClick={markAsSent} disabled={isPending} size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send size={14} className="mr-1.5" />}
              Marcar como Enviado
            </Button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="border-t border-zinc-700 pt-4">
        <h4 className="text-sm font-medium text-zinc-300 mb-3">Histórico de Mensagens</h4>
        {isLoading ? (
          <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-400" /></div>
        ) : history.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">Nenhuma mensagem registrada</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {history.map((m: any) => (
              <div key={m.id} className="bg-zinc-900 rounded-lg px-4 py-3 border border-zinc-700/50">
                <div className="flex items-center justify-between mb-1">
                  <Badge className="bg-purple-600/50 text-purple-200 text-[10px]">{m.template_type}</Badge>
                  <span className="text-[10px] text-zinc-500">{new Date(m.sent_at).toLocaleString("pt-BR")}</span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{m.message_content}</p>
                {m.observation && <p className="text-xs text-zinc-500 mt-1 italic">📝 {m.observation}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientMessagesTab;
