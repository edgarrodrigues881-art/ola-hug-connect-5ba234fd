import { useState, useEffect, KeyboardEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X, Plus, Tag, Sparkles } from "lucide-react";

const TAG_COLORS = [
  "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
  "#14b8a6", "#eab308", "#f43f5e", "#6366f1",
  "#a855f7", "#d946ef", "#0ea5e9", "#84cc16",
];

export interface FolderTag {
  label: string;
  color: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: FolderTag[];
  onSave: (tags: FolderTag[]) => Promise<void>;
  folderName: string;
  folderColor: string;
}

export function TagManagerDialog({ open, onOpenChange, tags: initialTags, onSave, folderName, folderColor }: Props) {
  const [tags, setTags] = useState<FolderTag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTags([...initialTags]);
      setTagInput("");
      setTagColor(TAG_COLORS[0]);
    }
  }, [open, initialTags]);

  const addTag = () => {
    const label = tagInput.trim();
    if (!label || tags.some(t => t.label.toLowerCase() === label.toLowerCase())) return;
    setTags(prev => [...prev, { label, color: tagColor }]);
    setTagInput("");
    const idx = TAG_COLORS.indexOf(tagColor);
    setTagColor(TAG_COLORS[(idx + 1) % TAG_COLORS.length]);
  };

  const removeTag = (label: string) => {
    setTags(prev => prev.filter(t => t.label !== label));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(tags);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] bg-card/95 backdrop-blur-2xl border-border/10 p-0 overflow-hidden rounded-2xl shadow-2xl">
        {/* Header with gradient accent */}
        <div className="px-5 pt-5 pb-3">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${folderColor}20` }}>
                <Tag className="w-3.5 h-3.5" style={{ color: folderColor }} />
              </div>
              <div>
                <span className="text-foreground">Tags</span>
                <span className="text-muted-foreground/60 font-medium ml-1.5">— {folderName}</span>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Tags display */}
          <div className="min-h-[52px] rounded-xl border border-border/10 bg-muted/5 p-3">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.label}
                    className="group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-[11px] font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.label}
                    <button
                      onClick={() => removeTag(tag.label)}
                      className="opacity-60 group-hover:opacity-100 hover:bg-white/20 rounded-md p-0.5 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-3 gap-1.5">
                <Sparkles className="w-5 h-5 text-muted-foreground/20" />
                <p className="text-[11px] text-muted-foreground/40 font-medium">Nenhuma tag criada ainda</p>
              </div>
            )}
          </div>

          {/* Add tag section */}
          <div className="space-y-3">
            <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Nova tag</label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite o nome..."
                className="h-9 text-xs bg-muted/10 border-border/15 flex-1 rounded-lg placeholder:text-muted-foreground/30"
                autoFocus
              />
              <Button
                size="sm"
                onClick={addTag}
                disabled={!tagInput.trim()}
                className="h-9 w-9 p-0 rounded-lg shrink-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Cor da tag</label>
              <div className="grid grid-cols-8 gap-1.5">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setTagColor(c)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all duration-200",
                      tagColor === c
                        ? "ring-2 ring-offset-2 ring-offset-card ring-foreground/70 scale-110"
                        : "opacity-50 hover:opacity-80"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-border/10 bg-muted/5">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="flex-1 h-10 rounded-lg text-xs font-semibold border-border/15">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 h-10 rounded-lg text-xs font-semibold shadow-md">
            {saving ? "Salvando..." : "Salvar tags"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
