import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Mail, Clock, AlertTriangle, XCircle, Skull, Loader2,
  Save, Eye, ChevronDown, ChevronUp, Sparkles, RefreshCw,
  FileText, ToggleLeft
} from "lucide-react";
import { toast } from "sonner";

interface AutoTemplate {
  id: string;
  message_type: string;
  label: string;
  content: string;
  buttons: any[];
  variables: any[];
  is_active: boolean;
  updated_at: string;
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; border: string; description: string }> = {
  WELCOME:    { icon: Mail,          color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", description: "Enviada ao novo cliente após o cadastro" },
  DUE_3_DAYS: { icon: Clock,         color: "text-yellow-400",  bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  description: "Aviso 3 dias antes do vencimento" },
  DUE_TODAY:  { icon: AlertTriangle,  color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20",  description: "Alerta no dia do vencimento" },
  OVERDUE_1:  { icon: XCircle,        color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     description: "1 dia após o vencimento" },
  OVERDUE_7:  { icon: XCircle,        color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     description: "7 dias após o vencimento" },
  OVERDUE_30: { icon: Skull,          color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     description: "30 dias após o vencimento · Oferta de retorno" },
};

const VARIABLES = [
  { key: "{{nome}}", label: "Nome do cliente" },
  { key: "{{plano}}", label: "Nome do plano" },
  { key: "{{vencimento}}", label: "Data de vencimento" },
  { key: "{{suporte}}", label: "Número do suporte" },
];

const AdminAutoTemplates = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { data: templates = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["auto-message-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auto_message_templates" as any)
        .select("*")
        .order("message_type");
      if (error) throw error;
      return (data || []) as unknown as AutoTemplate[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, content, is_active }: { id: string; content?: string; is_active?: boolean }) => {
      const updates: any = { updated_at: new Date().toISOString(), updated_by: session?.user?.id };
      if (content !== undefined) updates.content = content;
      if (is_active !== undefined) updates.is_active = is_active;
      const { error } = await (supabase
        .from("auto_message_templates" as any)
        .update(updates) as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-message-templates"] });
    },
  });

  const handleSave = async (tpl: AutoTemplate) => {
    const newContent = editContent[tpl.id];
    if (newContent === undefined || newContent === tpl.content) {
      toast.info("Nenhuma alteração detectada");
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: tpl.id, content: newContent });
      toast.success(`Modelo "${tpl.label}" salvo com sucesso`);
      setEditContent(prev => { const n = { ...prev }; delete n[tpl.id]; return n; });
    } catch {
      toast.error("Erro ao salvar modelo");
    }
  };

  const handleToggle = async (tpl: AutoTemplate) => {
    try {
      await updateMutation.mutateAsync({ id: tpl.id, is_active: !tpl.is_active });
      toast.success(`${tpl.label} ${!tpl.is_active ? "ativado" : "desativado"}`);
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const insertVariable = (tplId: string, variable: string) => {
    const current = editContent[tplId] ?? templates.find(t => t.id === tplId)?.content ?? "";
    setEditContent(prev => ({ ...prev, [tplId]: current + variable }));
  };

  const getPreviewContent = (content: string) => {
    return content
      .replace(/\{\{nome\}\}/g, "João Silva")
      .replace(/\{\{plano\}\}/g, "Pro")
      .replace(/\{\{vencimento\}\}/g, "25/03/2026")
      .replace(/\{\{suporte\}\}/g, "(62) 99419-2500");
  };

  const sortOrder = ["WELCOME", "DUE_3_DAYS", "DUE_TODAY", "OVERDUE_1", "OVERDUE_7", "OVERDUE_30"];
  const sorted = [...templates].sort((a, b) => sortOrder.indexOf(a.message_type) - sortOrder.indexOf(b.message_type));

  const activeCount = templates.filter(t => t.is_active).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles size={17} className="text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Modelo Automático</h2>
            <p className="text-[11px] text-muted-foreground/50">
              Gerencie mensagens automáticas do ciclo de vida · {activeCount}/{templates.length} ativos
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}
          className="text-[11px] h-8 gap-1.5 rounded-lg border-border/50 hover:bg-muted/20">
          {isFetching ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Atualizar
        </Button>
      </div>

      {/* Variables legend */}
      <div className="flex flex-wrap gap-1.5 px-1">
        <span className="text-[10px] text-muted-foreground/50 font-medium mr-1">Variáveis disponíveis:</span>
        {VARIABLES.map(v => (
          <span key={v.key} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-primary/8 text-primary/80 border border-primary/15 font-mono">
            {v.key} <span className="text-muted-foreground/40 font-sans">= {v.label}</span>
          </span>
        ))}
      </div>

      {/* Templates list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((tpl) => {
            const config = TYPE_CONFIG[tpl.message_type] || TYPE_CONFIG.WELCOME;
            const Icon = config.icon;
            const isExpanded = expandedId === tpl.id;
            const isPreviewing = previewId === tpl.id;
            const currentContent = editContent[tpl.id] ?? tpl.content;
            const hasChanges = editContent[tpl.id] !== undefined && editContent[tpl.id] !== tpl.content;

            return (
              <div
                key={tpl.id}
                className={cn(
                  "border rounded-xl overflow-hidden transition-all",
                  tpl.is_active ? "border-border/40 bg-card/40" : "border-border/20 bg-card/20 opacity-60",
                  isExpanded && "border-primary/30 bg-card/60"
                )}
              >
                {/* Header row */}
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : tpl.id)}>
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                    <Icon size={15} className={config.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{tpl.label}</span>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5", config.border, config.color, config.bg)}>
                        {tpl.message_type}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground/50 mt-0.5">{config.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-medium", tpl.is_active ? "text-emerald-400" : "text-muted-foreground/40")}>
                        {tpl.is_active ? "Ativo" : "Inativo"}
                      </span>
                      <Switch
                        checked={tpl.is_active}
                        onCheckedChange={() => handleToggle(tpl)}
                        disabled={updateMutation.isPending}
                      />
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-muted-foreground/40" /> : <ChevronDown size={16} className="text-muted-foreground/40" />}
                </div>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                    {/* Variable insert buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-muted-foreground/50 font-medium self-center mr-1">Inserir:</span>
                      {VARIABLES.map(v => (
                        <button
                          key={v.key}
                          onClick={() => insertVariable(tpl.id, v.key)}
                          className="text-[10px] px-2 py-1 rounded-md bg-primary/8 text-primary/80 border border-primary/15 font-mono hover:bg-primary/15 transition-colors"
                        >
                          {v.key}
                        </button>
                      ))}
                    </div>

                    {/* Editor / Preview toggle */}
                    <div className="flex gap-1 bg-muted/20 rounded-lg p-0.5 w-fit border border-border/30">
                      <button
                        onClick={() => setPreviewId(null)}
                        className={cn(
                          "px-3 py-1.5 text-[10px] font-medium rounded-md transition-all",
                          !isPreviewing ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground/60"
                        )}
                      >
                        <FileText size={10} className="inline mr-1" /> Editar
                      </button>
                      <button
                        onClick={() => setPreviewId(isPreviewing ? null : tpl.id)}
                        className={cn(
                          "px-3 py-1.5 text-[10px] font-medium rounded-md transition-all",
                          isPreviewing ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground/60"
                        )}
                      >
                        <Eye size={10} className="inline mr-1" /> Preview
                      </button>
                    </div>

                    {isPreviewing ? (
                      <div className="bg-muted/20 border border-border/30 rounded-xl p-4">
                        <p className="text-[10px] text-muted-foreground/40 mb-2 font-medium">Pré-visualização com dados fictícios:</p>
                        <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                          {getPreviewContent(currentContent)}
                        </pre>
                      </div>
                    ) : (
                      <Textarea
                        value={currentContent}
                        onChange={e => setEditContent(prev => ({ ...prev, [tpl.id]: e.target.value }))}
                        className="min-h-[200px] bg-muted/10 border-border/30 text-sm font-mono resize-y"
                        placeholder="Escreva sua mensagem aqui..."
                      />
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground/30">
                        Última edição: {new Date(tpl.updated_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => handleSave(tpl)}
                        disabled={!hasChanges || updateMutation.isPending}
                        className="h-8 text-[11px] gap-1.5 rounded-lg"
                      >
                        {updateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Salvar alterações
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminAutoTemplates;
