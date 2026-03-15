import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

const COLORS = [
  "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
  "#14b8a6", "#eab308", "#f43f5e", "#6366f1",
  "#a855f7", "#d946ef", "#0ea5e9", "#84cc16",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFolder: { id: string; name: string; color: string } | null;
  onSave: (data: { name: string; color: string; deviceIds: string[] }) => Promise<void>;
  onDelete?: (id: string) => void;
  currentDeviceIds?: string[];
}

export function WarmupFolderDialog({ open, onOpenChange, editingFolder, onSave, onDelete, currentDeviceIds = [] }: Props) {
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
      await onSave({ name: name.trim(), color, deviceIds: currentDeviceIds });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[320px] bg-card border-border/20 p-5">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            {editingFolder ? "Editar pasta" : "Nova pasta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lote Janeiro"
              className="h-9 text-sm bg-muted/20 border-border/20"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cor</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all",
                    color === c
                      ? "ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110"
                      : "opacity-40 hover:opacity-70"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3">
          {editingFolder && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { onDelete(editingFolder.id); onOpenChange(false); }}
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Excluir pasta"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-9 px-4">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || saving} className="h-9 px-4">
            {saving ? "..." : editingFolder ? "Salvar" : "Criar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
