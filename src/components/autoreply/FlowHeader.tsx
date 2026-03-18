import { Save, Play, BotMessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  name: string;
  onNameChange: (n: string) => void;
  isActive: boolean;
  onToggleActive: () => void;
}

export function FlowHeader({ name, onNameChange, isActive, onToggleActive }: Props) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-4 px-5 py-3 border-b border-border/40 bg-card/50 backdrop-blur-sm shrink-0">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground/50 hover:text-foreground shrink-0"
        onClick={() => navigate("/dashboard/auto-reply")}
      >
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <BotMessageSquare className="w-4 h-4 text-primary" />
        </div>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="text-sm font-semibold bg-transparent border-none outline-none text-foreground w-52 focus:ring-0 placeholder:text-muted-foreground/40"
          placeholder="Nome da automação"
        />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 mr-2">
        <Switch checked={isActive} onCheckedChange={onToggleActive} className="scale-[0.85]" />
        <span className={`text-xs font-medium ${isActive ? "text-emerald-500" : "text-muted-foreground/50"}`}>
          {isActive ? "Ativo" : "Inativo"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs border-border/50 hover:border-border"
          onClick={() => toast.info("Teste do fluxo iniciado (simulação)")}
        >
          <Play className="w-3.5 h-3.5 mr-1.5" /> Testar
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => toast.success("Fluxo salvo com sucesso!")}
        >
          <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar
        </Button>
      </div>
    </div>
  );
}
