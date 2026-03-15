import { useState, useEffect, KeyboardEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { X, Plus, Tag } from "lucide-react";

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
      <DialogContent className="sm:max-w-[340px] bg-card border-border/20 p-5">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Tag className="w-4 h-4" style={{ color: folderColor }} />
            Tags — {folderName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Existing tags */}
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag.label}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white"
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
          ) : (
            <p className="text-[11px] text-muted-foreground/50 text-center py-2">Nenhuma tag criada</p>
          )}

          {/* Add tag input */}
          <div className="space-y-2 rounded-xl border border-border/15 bg-muted/10 p-3">
            <div className="flex gap-1.5">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nova tag..."
                className="h-8 text-xs bg-background/50 border-border/20 flex-1"
                autoFocus
              />
              <Button
                size="sm"
                onClick={addTag}
                disabled={!tagInput.trim()}
                className="h-8 px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex gap-1.5 items-center">
              <span className="text-[9px] text-muted-foreground/50 mr-0.5">Cor:</span>
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTagColor(c)}
                  className={cn(
                    "w-5 h-5 rounded-full transition-all",
                    tagColor === c
                      ? "ring-2 ring-offset-1 ring-offset-card ring-foreground scale-110"
                      : "opacity-40 hover:opacity-70"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="flex-1 h-9">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="flex-1 h-9">
            {saving ? "..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
