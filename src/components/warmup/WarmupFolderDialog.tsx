import { useState, useEffect, KeyboardEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Trash2, X, Plus, Tag } from "lucide-react";

const COLORS = [
  "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
  "#14b8a6", "#eab308", "#f43f5e", "#6366f1",
  "#a855f7", "#d946ef", "#0ea5e9", "#84cc16",
];

const TAG_COLORS = [
  "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

export interface FolderTag {
  label: string;
  color: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFolder: { id: string; name: string; color: string; tags?: FolderTag[] } | null;
  onSave: (data: { name: string; color: string; tags: FolderTag[]; deviceIds: string[] }) => Promise<void>;
  onDelete?: (id: string) => void;
  currentDeviceIds?: string[];
}

export function WarmupFolderDialog({ open, onOpenChange, editingFolder, onSave, onDelete, currentDeviceIds = [] }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");
  const [tags, setTags] = useState<FolderTag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editingFolder?.name || "");
      setColor(editingFolder?.color || "#10b981");
      setTags(editingFolder?.tags || []);
      setTagInput("");
      setShowTagInput(false);
      setTagColor(TAG_COLORS[0]);
    }
  }, [open, editingFolder]);

  const addTag = () => {
    const label = tagInput.trim();
    if (!label || tags.some(t => t.label.toLowerCase() === label.toLowerCase())) return;
    setTags(prev => [...prev, { label, color: tagColor }]);
    setTagInput("");
    // cycle to next color
    const idx = TAG_COLORS.indexOf(tagColor);
    setTagColor(TAG_COLORS[(idx + 1) % TAG_COLORS.length]);
  };

  const removeTag = (label: string) => {
    setTags(prev => prev.filter(t => t.label !== label));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), color, tags, deviceIds: currentDeviceIds });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] bg-card border-border/20 p-5">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            {editingFolder ? "Editar pasta" : "Nova pasta"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Name */}
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

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cor</label>
            <div className="grid grid-cols-8 gap-2">
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

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags
            </label>

            {/* Existing tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag.label}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.label}
                    <button
                      onClick={() => removeTag(tag.label)}
                      className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add tag */}
            {showTagInput ? (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nome da tag"
                    className="h-7 text-xs bg-muted/20 border-border/20 flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={addTag}
                    disabled={!tagInput.trim()}
                    className="h-7 w-7 p-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {/* Tag color picker */}
                <div className="flex gap-1.5 items-center">
                  <span className="text-[9px] text-muted-foreground/50 mr-1">Cor:</span>
                  {TAG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setTagColor(c)}
                      className={cn(
                        "w-4 h-4 rounded-full transition-all",
                        tagColor === c
                          ? "ring-2 ring-offset-1 ring-offset-card ring-foreground scale-110"
                          : "opacity-40 hover:opacity-70"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="text-[11px] text-primary hover:text-primary/80 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar tag
              </button>
            )}
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
