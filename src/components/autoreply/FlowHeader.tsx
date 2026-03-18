import { Save, Play, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Props {
  name: string;
  onNameChange: (n: string) => void;
  isActive: boolean;
  onToggleActive: () => void;
}

export function FlowHeader({ name, onNameChange, isActive, onToggleActive }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="text-sm font-semibold bg-transparent border-none outline-none text-foreground w-48 focus:ring-0"
        placeholder="Nome da automação"
      />
      <div className="flex-1" />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Power className="w-3.5 h-3.5" />
        <Switch checked={isActive} onCheckedChange={onToggleActive} className="scale-90" />
        <span>{isActive ? "Ativo" : "Inativo"}</span>
      </div>
      <Button size="sm" variant="outline" onClick={() => toast.info("Teste do fluxo iniciado (simulação)")}>
        <Play className="w-3.5 h-3.5 mr-1" /> Testar
      </Button>
      <Button size="sm" onClick={() => toast.success("Fluxo salvo com sucesso!")}>
        <Save className="w-3.5 h-3.5 mr-1" /> Salvar
      </Button>
    </div>
  );
}
