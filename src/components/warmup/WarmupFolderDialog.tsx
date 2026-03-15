import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, Smartphone, Search } from "lucide-react";

const COLORS = [
  { value: "#10b981", tw: "bg-emerald-400" },
  { value: "#f59e0b", tw: "bg-amber-400" },
  { value: "#ef4444", tw: "bg-red-400" },
  { value: "#3b82f6", tw: "bg-blue-400" },
  { value: "#8b5cf6", tw: "bg-violet-400" },
  { value: "#ec4899", tw: "bg-pink-400" },
  { value: "#06b6d4", tw: "bg-cyan-400" },
  { value: "#f97316", tw: "bg-orange-400" },
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
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");
  const [saving, setSaving] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [deviceSearch, setDeviceSearch] = useState("");

  const { data: devices = [] } = useQuery({
    queryKey: ["devices-for-folders", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("id, name, number, status")
        .eq("user_id", user!.id)
        .neq("login_type", "report_wa")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (open) {
      setName(editingFolder?.name || "");
      setColor(editingFolder?.color || "#10b981");
      setSelectedDevices(new Set(currentDeviceIds));
      setDeviceSearch("");
    }
  }, [open, editingFolder, currentDeviceIds]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), color, deviceIds: Array.from(selectedDevices) });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleDevice = (id: string) => {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredDevices = devices.filter(d => {
    if (!deviceSearch) return true;
    const q = deviceSearch.toLowerCase();
    return d.name.toLowerCase().includes(q) || (d.number || "").includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-card border-border/30 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {editingFolder ? "Editar pasta" : "Nova pasta de aquecimento"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lote Janeiro, Chips DDD 47..."
              className="h-10 bg-muted/20 border-border/20"
              autoFocus
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
                    "w-7 h-7 rounded-lg transition-all",
                    c.tw,
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-offset-card ring-foreground scale-110"
                      : "opacity-50 hover:opacity-80"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Dispositivos ({selectedDevices.size})
              </label>
              <button
                className="text-[10px] text-primary hover:text-primary/80 font-bold"
                onClick={() => setSelectedDevices(prev => prev.size === devices.length ? new Set() : new Set(devices.map(d => d.id)))}
              >
                {selectedDevices.size > 0 ? "Desmarcar" : "Selecionar todos"}
              </button>
            </div>
            {devices.length > 5 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
                <Input
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="h-8 pl-8 text-xs bg-muted/20 border-border/20"
                />
              </div>
            )}
            <div className="max-h-[200px] overflow-y-auto space-y-1 rounded-xl border border-border/15 bg-muted/10 p-2 scrollbar-thin">
              {filteredDevices.map((d) => {
                const selected = selectedDevices.has(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => toggleDevice(d.id)}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-left transition-colors",
                      selected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/30 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                      selected ? "bg-primary border-primary" : "border-border/40"
                    )}>
                      {selected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground truncate">{d.name}</p>
                      {d.number && <p className="text-[10px] text-muted-foreground/50 font-mono">{d.number}</p>}
                    </div>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      ["Connected", "Ready", "authenticated"].includes(d.status) ? "bg-primary" : "bg-muted-foreground/30"
                    )} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t border-border/10">
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
