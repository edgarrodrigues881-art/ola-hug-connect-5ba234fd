import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, BotMessageSquare, Pencil, Copy, Trash2, MoreHorizontal,
  Zap, Clock, Search, Filter, GitBranch, MousePointerClick, Play,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  steps: number;
  buttons: number;
  lastRun: Date | null;
}

const triggerLabels: Record<string, string> = {
  any_message: "Qualquer mensagem",
  keyword: "Palavra-chave",
  new_contact: "Novo contato",
  start_chat: "Início de atendimento",
};

const initialModels: AutoReplyModel[] = [
  {
    id: "1",
    name: "Boas-vindas principal",
    description: "Mensagem de boas-vindas com opções de atendimento",
    trigger: "keyword",
    isActive: true,
    updatedAt: new Date(),
    steps: 4,
    buttons: 3,
    lastRun: new Date(Date.now() - 3600000),
  },
  {
    id: "2",
    name: "Fora do horário",
    description: "Resposta automática para mensagens fora do expediente",
    trigger: "any_message",
    isActive: false,
    updatedAt: new Date(Date.now() - 86400000 * 2),
    steps: 2,
    buttons: 1,
    lastRun: new Date(Date.now() - 86400000 * 3),
  },
  {
    id: "3",
    name: "Promoção de lançamento",
    description: "Fluxo de divulgação para novos contatos",
    trigger: "new_contact",
    isActive: true,
    updatedAt: new Date(Date.now() - 86400000),
    steps: 6,
    buttons: 4,
    lastRun: null,
  },
];

export default function AutoReplyList() {
  const navigate = useNavigate();
  const [models, setModels] = useState<AutoReplyModel[]>(initialModels);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  const filtered = useMemo(() => {
    return models.filter((m) => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" ||
        (statusFilter === "active" && m.isActive) ||
        (statusFilter === "inactive" && !m.isActive);
      return matchSearch && matchStatus;
    });
  }, [models, search, statusFilter]);

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
    setModels((prev) => [...prev, {
      ...model,
      id: `${Date.now()}`,
      name: `${model.name} (cópia)`,
      isActive: false,
      updatedAt: new Date(),
    }]);
    toast.success("Modelo duplicado");
  };

  const deleteModel = (id: string) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
    toast.success("Modelo excluído");
  };

  const startRename = (model: AutoReplyModel) => {
    setRenameId(model.id);
    setRenameName(model.name);
  };

  const confirmRename = () => {
    if (!renameId || !renameName.trim()) return;
    setModels((prev) =>
      prev.map((m) => (m.id === renameId ? { ...m, name: renameName.trim(), updatedAt: new Date() } : m))
    );
    setRenameId(null);
    toast.success("Modelo renomeado");
  };

  const activeCount = models.filter((m) => m.isActive).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <BotMessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Resposta Automática</h1>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {models.length} automação{models.length !== 1 ? "ões" : ""} · {activeCount} ativa{activeCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate("/dashboard/auto-reply/new")} className="h-9 text-xs gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> Criar nova automação
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-card/60 border-border/30 focus:border-primary/40"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-xs bg-card/60 border-border/30">
            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground/40" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Models list */}
      {filtered.length === 0 && models.length > 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-8 h-8 text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground/50">Nenhuma automação encontrada</p>
          <p className="text-xs text-muted-foreground/30 mt-1">Tente ajustar a busca ou o filtro</p>
        </div>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-5 ring-1 ring-border/20">
            <BotMessageSquare className="w-8 h-8 text-muted-foreground/20" />
          </div>
          <h2 className="text-sm font-semibold text-foreground mb-1.5">Nenhuma automação criada</h2>
          <p className="text-xs text-muted-foreground/50 max-w-xs mb-6">
            Crie sua primeira automação e use seus modelos existentes como mensagens do fluxo.
          </p>
          <Button onClick={() => navigate("/dashboard/auto-reply/new")} className="h-9 text-xs gap-2">
            <Plus className="w-4 h-4" /> Criar primeira automação
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((model) => (
            <div
              key={model.id}
              className="group relative rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30 hover:border-border/50 hover:bg-card/80 transition-all duration-200 overflow-hidden"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl transition-colors ${
                model.isActive ? "bg-emerald-500" : "bg-transparent"
              }`} />
              <div className="flex items-start sm:items-center gap-4 px-5 py-4 pl-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 transition-colors mt-0.5 sm:mt-0 ${
                  model.isActive ? "bg-emerald-500/10 ring-emerald-500/20" : "bg-muted/20 ring-border/30"
                }`}>
                  <BotMessageSquare className={`w-4 h-4 ${model.isActive ? "text-emerald-500" : "text-muted-foreground/40"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    {renameId === model.id ? (
                      <form onSubmit={(e) => { e.preventDefault(); confirmRename(); }} className="flex items-center gap-2">
                        <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} className="h-7 text-sm font-semibold w-48" autoFocus onBlur={confirmRename} />
                      </form>
                    ) : (
                      <h3 className="text-sm font-semibold text-foreground truncate">{model.name}</h3>
                    )}
                    <Badge variant={model.isActive ? "default" : "secondary"} className={`text-[10px] px-2 py-0 h-5 font-medium shrink-0 ${
                      model.isActive
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15"
                        : "bg-muted/30 text-muted-foreground/50 border-border/30 hover:bg-muted/40"
                    }`}>
                      {model.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {model.description && (
                    <p className="text-xs text-muted-foreground/50 truncate mb-2">{model.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                      <Zap className="w-3 h-3 text-amber-500/60" /> {triggerLabels[model.trigger] || model.trigger}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
                      <GitBranch className="w-3 h-3" /> {model.steps} etapa{model.steps !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
                      <MousePointerClick className="w-3 h-3" /> {model.buttons} botão{model.buttons !== 1 ? "ões" : ""}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
                      <Play className="w-3 h-3" /> {model.lastRun ? format(model.lastRun, "dd MMM, HH:mm", { locale: ptBR }) : "Nunca executado"}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/30">
                      <Clock className="w-3 h-3" /> {format(model.updatedAt, "dd MMM, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={model.isActive} onCheckedChange={() => toggleActive(model.id)} className="scale-[0.85]" />
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-border/40 hover:border-primary/40 hover:text-primary transition-colors" onClick={() => navigate(`/dashboard/auto-reply/${model.id}`)}>
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground/40 hover:text-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => duplicateModel(model.id)}>
                        <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => startRename(model)}>
                        <FileText className="w-3.5 h-3.5 mr-2" /> Renomear
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => deleteModel(model.id)} className="text-destructive focus:text-destructive">
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
