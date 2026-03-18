import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, FileText, Search, Loader2,
  Copy, Eye, ToggleLeft, ToggleRight, Sparkles
} from "lucide-react";

interface DispatchTemplate {
  id: string;
  admin_id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "custom", label: "Personalizado", color: "text-primary" },
  { value: "lifecycle", label: "Ciclo de vida", color: "text-yellow-400" },
  { value: "billing", label: "Cobrança", color: "text-red-400" },
  { value: "welcome", label: "Boas-vindas", color: "text-emerald-400" },
  { value: "promo", label: "Promoção", color: "text-purple-400" },
];

const AVAILABLE_VARS = [
  { var: "{{nome}}", desc: "Nome do cliente" },
  { var: "{{email}}", desc: "Email do cliente" },
  { var: "{{plano}}", desc: "Plano atual" },
  { var: "{{telefone}}", desc: "Telefone" },
  { var: "{{vencimento}}", desc: "Data de vencimento" },
  { var: "{{dias_restantes}}", desc: "Dias até vencer" },
];

export default function AdminDispatchTemplates() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [form, setForm] = useState({ name: "", category: "custom", content: "" });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["admin-dispatch-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_dispatch_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DispatchTemplate[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string; category: string; content: string; id?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      if (payload.id) {
        const { error } = await supabase
          .from("admin_dispatch_templates" as any)
          .update({ name: payload.name, category: payload.category, content: payload.content, updated_at: new Date().toISOString() })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("admin_dispatch_templates" as any)
          .insert({ admin_id: user.id, name: payload.name, category: payload.category, content: payload.content });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Modelo atualizado" : "Modelo criado");
      queryClient.invalidateQueries({ queryKey: ["admin-dispatch-templates"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_dispatch_templates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modelo excluído");
      queryClient.invalidateQueries({ queryKey: ["admin-dispatch-templates"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("admin_dispatch_templates" as any)
        .update({ is_active: active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-dispatch-templates"] }),
  });

  const resetForm = () => { setForm({ name: "", category: "custom", content: "" }); setEditingId(null); };

  const openEdit = (t: DispatchTemplate) => {
    setForm({ name: t.name, category: t.category, content: t.content });
    setEditingId(t.id);
    setDialogOpen(true);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.name.trim() || !form.content.trim()) {
      toast.error("Preencha nome e conteúdo");
      return;
    }
    saveMutation.mutate({ ...form, id: editingId || undefined });
  };

  const insertVar = (v: string) => {
    setForm(f => ({ ...f, content: f.content + v }));
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return templates.filter(t => {
      if (filterCat !== "all" && t.category !== filterCat) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.content.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, search, filterCat]);

  const catConfig = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Modelos de Mensagem
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Crie e gerencie templates reutilizáveis para disparos
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 text-sm">
          <Plus size={15} /> Novo Modelo
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Buscar modelo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 bg-card/50 border-border/60 text-sm"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterCat("all")}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
              filterCat === "all" ? "bg-primary/15 text-primary border-primary/40" : "bg-card border-border/60 text-muted-foreground hover:border-border"
            }`}
          >
            Todos ({templates.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = templates.filter(t => t.category === cat.value).length;
            return (
              <button
                key={cat.value}
                onClick={() => setFilterCat(f => f === cat.value ? "all" : cat.value)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                  filterCat === cat.value ? "bg-primary/15 text-primary border-primary/40" : "bg-card border-border/60 text-muted-foreground hover:border-border"
                }`}
              >
                {cat.label} {count > 0 && <span className="text-[9px] ml-1 opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/50 rounded-xl">
          <FileText size={28} className="mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground/60">Nenhum modelo encontrado</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openNew}>
            <Plus size={14} className="mr-1" /> Criar primeiro modelo
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => {
            const cat = catConfig(t.category);
            return (
              <div
                key={t.id}
                className={`group relative bg-card/60 border rounded-xl p-4 transition-all hover:border-primary/30 ${
                  t.is_active ? "border-border/50" : "border-border/30 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">{t.name}</h3>
                      {!t.is_active && (
                        <Badge variant="outline" className="text-[9px] border-border/50 text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium ${cat.color}`}>{cat.label}</span>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 mb-3 max-h-24 overflow-hidden">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                    {t.content}
                  </p>
                </div>

                <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setPreviewContent(t.content); setPreviewOpen(true); }}
                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Visualizar"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(t.content); toast.success("Copiado!"); }}
                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Copiar"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={() => toggleMutation.mutate({ id: t.id, active: !t.is_active })}
                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                    title={t.is_active ? "Desativar" : "Ativar"}
                  >
                    {t.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => { if (confirm("Excluir modelo?")) deleteMutation.mutate(t.id); }}
                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              {editingId ? "Editar Modelo" : "Novo Modelo"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Nome do modelo</label>
              <Input
                placeholder="Ex: Lembrete de vencimento"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Conteúdo da mensagem</label>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={6}
                className="resize-none text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_VARS.map(v => (
                  <button
                    key={v.var}
                    onClick={() => insertVar(v.var)}
                    className="text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-mono"
                    title={v.desc}
                  >
                    {v.var}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              {editingId ? "Salvar" : "Criar Modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preview da Mensagem</DialogTitle>
          </DialogHeader>
          <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
            <p className="text-sm whitespace-pre-wrap text-foreground">{previewContent}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
