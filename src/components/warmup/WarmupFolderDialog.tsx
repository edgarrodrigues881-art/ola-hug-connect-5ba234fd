import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const COLORS = [
  { value: "#10b981", label: "Verde", tw: "bg-emerald-400" },
  { value: "#f59e0b", label: "Amarelo", tw: "bg-amber-400" },
  { value: "#ef4444", label: "Vermelho", tw: "bg-red-400" },
  { value: "#3b82f6", label: "Azul", tw: "bg-blue-400" },
  { value: "#8b5cf6", label: "Roxo", tw: "bg-violet-400" },
  { value: "#ec4899", label: "Rosa", tw: "bg-pink-400" },
  { value: "#06b6d4", label: "Ciano", tw: "bg-cyan-400" },
  { value: "#f97316", label: "Laranja", tw: "bg-orange-400" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFolder: { id: string; name: string; color: string } | null;
  onSave: (data: { name: string; color: string }) => Promise<void>;
}

export function WarmupFolderDialog({ open, onOpenChange, editingFolder, onSave }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editingFolder?.name || "");
      setColor(editingFolder?.color || "#10b981");
    }
  }, [open, editingFolder]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), color });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px] bg-card border-border/30">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editingFolder ? "Editar pasta" : "Nova pasta de aquecimento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lote Janeiro, Chips DDD 47..."
              className="h-10 bg-muted/20 border-border/20"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-8 h-8 rounded-lg transition-all",
                    c.tw,
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110"
                      : "opacity-50 hover:opacity-80"
                  )}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving} className="flex-1">
            {saving ? "Salvando..." : editingFolder ? "Salvar" : "Criar pasta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
