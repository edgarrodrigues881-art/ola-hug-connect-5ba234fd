import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, BotMessageSquare, Pencil, Copy, Trash2, MoreHorizontal, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AutoReplyModel {
  id: string;
  name: string;
  description: string;
  trigger: string;
  isActive: boolean;
  updatedAt: Date;
}

const triggerLabels: Record<string, string> = {
  any_message: "Qualquer mensagem",
  keyword: "Palavra-chave",
  new_contact: "Novo contato",
  start_chat: "Início de atendimento",
};

// Demo data
const initialModels: AutoReplyModel[] = [
  {
    id: "1",
    name: "Boas-vindas principal",
    description: "Mensagem de boas-vindas com opções de atendimento",
    trigger: "keyword",
    isActive: true,
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "Fora do horário",
    description: "Resposta automática para mensagens fora do expediente",
    trigger: "any_message",
    isActive: false,
    updatedAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    id: "3",
    name: "Promoção de lançamento",
    description: "Fluxo de divulgação para novos contatos",
    trigger: "new_contact",
    isActive: true,
    updatedAt: new Date(Date.now() - 86400000),
  },
];

export default function AutoReplyList() {
  const navigate = useNavigate();
  const [models, setModels] = useState<AutoReplyModel[]>(initialModels);

  const toggleActive = (id: string) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m))
    );
    const model = models.find((m) => m.id === id);
    toast.success(model?.isActive ? "Modelo desativado" : "Modelo ativado");
  };

  const duplicateModel = (id: string) => {
    const model = models.find((m) => m.id === id);
    if (!model) return;
    const newModel: AutoReplyModel = {
      ...model,
      id: `${Date.now()}`,
      name: `${model.name} (cópia)`,
      isActive: false,
      updatedAt: new Date(),
    };
    setModels((prev) => [...prev, newModel]);
    toast.success("Modelo duplicado");
  };

  const deleteModel = (id: string) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
    toast.success("Modelo excluído");
  };

  const createNew = () => {
    navigate("/dashboard/auto-reply/new");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <BotMessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Resposta Automática</h1>
            <p className="text-[13px] text-muted-foreground/60">
              Gerencie seus modelos de automação
            </p>
          </div>
        </div>
        <Button onClick={createNew} className="h-9 text-xs gap-2">
          <Plus className="w-4 h-4" /> Criar novo modelo
        </Button>
      </div>

      {/* Models list */}
      {models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-5">
            <BotMessageSquare className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <h2 className="text-sm font-semibold text-foreground mb-1.5">
            Nenhum modelo criado
          </h2>
          <p className="text-[13px] text-muted-foreground/50 max-w-xs mb-6">
            Crie seu primeiro modelo de resposta automática para começar a automatizar suas mensagens.
          </p>
          <Button onClick={createNew} className="h-9 text-xs gap-2">
            <Plus className="w-4 h-4" /> Criar primeiro modelo
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {models.map((model) => (
            <div
              key={model.id}
              className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30 hover:border-border/50 hover:bg-card/80 transition-all duration-150"
            >
              {/* Icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 transition-colors ${
                model.isActive
                  ? "bg-emerald-500/10 ring-emerald-500/20"
                  : "bg-muted/20 ring-border/30"
              }`}>
                <BotMessageSquare className={`w-4 h-4 ${model.isActive ? "text-emerald-500" : "text-muted-foreground/40"}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-foreground truncate">{model.name}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    model.isActive
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-muted/30 text-muted-foreground/40"
                  }`}>
                    {model.isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>
                {model.description && (
                  <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5">{model.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/40">
                    <Zap className="w-3 h-3" /> {triggerLabels[model.trigger] || model.trigger}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/30">
                    <Clock className="w-3 h-3" /> {format(model.updatedAt, "dd MMM, HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <Switch
                  checked={model.isActive}
                  onCheckedChange={() => toggleActive(model.id)}
                  className="scale-[0.85]"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-border/40 hover:border-border opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => navigate(`/dashboard/auto-reply/${model.id}`)}
                >
                  <Pencil className="w-3 h-3 mr-1.5" /> Editar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground/30 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => duplicateModel(model.id)}>
                      <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => deleteModel(model.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
