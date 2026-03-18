import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, FileText, Search, Loader2,
  Copy, Eye, ToggleLeft, ToggleRight, Sparkles,
  X, Upload, Image as ImageIcon, Video, Mic,
  ArrowUp, ArrowDown, Bold, Italic, Strikethrough, Code,
  Smile, MousePointerClick, Link, Phone, MessageSquare,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { useAuth } from "@/lib/auth";

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

interface TemplateButton {
  id: number;
  type: "reply" | "url" | "phone";
  text: string;
  value: string;
}

interface MediaFile {
  id: number;
  url: string;
  type: "image" | "video" | "audio" | "document";
  name: string;
  sendMode: "before" | "with" | "after";
}

const CATEGORIES = [
  { value: "custom", label: "Personalizado", color: "text-primary" },
  { value: "lifecycle", label: "Ciclo de vida", color: "text-yellow-400" },
  { value: "billing", label: "Cobrança", color: "text-red-400" },
  { value: "welcome", label: "Boas-vindas", color: "text-emerald-400" },
  { value: "promo", label: "Promoção", color: "text-purple-400" },
];

const commonEmojis: Record<string, string[]> = {
  "Mais usados": ["😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤩", "😘", "🤗", "😁", "😉", "🥺", "😢", "😤", "🤔"],
  "Gestos": ["👍", "👋", "🙏", "💪", "🤝", "👏", "✌️", "🤞", "👊", "🫶", "☝️", "👆", "👇", "👉", "👈", "🫡"],
  "Negócios": ["✅", "⭐", "💰", "🚀", "📱", "💬", "📢", "🎯", "⚡", "🏆", "💎", "📞", "✨", "🛒", "🎁", "📊"],
  "Símbolos": ["❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "🔥", "💥", "⚠️", "🔔", "🎉", "🎊", "💯", "🆕"],
};

const SurfaceCard = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-xl sm:rounded-2xl border border-border/50 bg-card shadow-sm",
      "dark:border-[hsl(220_10%_16%)] dark:bg-[hsl(220_13%_9%)] dark:shadow-lg dark:shadow-black/30",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

const SectionLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h3 className={cn("text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70", className)}>
    {children}
  </h3>
);

export default function AdminDispatchTemplates() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("custom");
  const [formMessages, setFormMessages] = useState<string[]>(["", "", "", "", ""]);
  const [activeMessageTab, setActiveMessageTab] = useState(0);
  const [rotationMode, setRotationMode] = useState<"random" | "all">("random");
  const [formMediaFiles, setFormMediaFiles] = useState<MediaFile[]>([]);
  const [formButtons, setFormButtons] = useState<TemplateButton[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState("Mais usados");
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<"sent" | "received">("sent");

  const formContent = formMessages[activeMessageTab];
  const setFormContent = (val: string | ((prev: string) => string)) => {
    setFormMessages(prev => {
      const copy = [...prev];
      copy[activeMessageTab] = typeof val === "function" ? val(copy[activeMessageTab]) : val;
      return copy;
    });
  };
  const allMessages = formMessages.filter(m => m.trim());

  const detectedVars = useMemo(() => {
    const allText = formMessages.join(" ");
    const matches = allText.match(/{{[^}]+}}/g);
    return matches ? [...new Set(matches)] : [];
  }, [formMessages]);

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
    mutationFn: async (payload: { name: string; category: string; content: string; media_url?: string; buttons?: any[]; id?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const variables = (payload.content.match(/{{[^}]+}}/g) || []).filter((v, i, a) => a.indexOf(v) === i);

      if (payload.id) {
        const { error } = await supabase
          .from("admin_dispatch_templates" as any)
          .update({
            name: payload.name,
            category: payload.category,
            content: payload.content,
            variables,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("admin_dispatch_templates" as any)
          .insert({
            admin_id: user.id,
            name: payload.name,
            category: payload.category,
            content: payload.content,
            variables,
          });
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

  const resetForm = () => {
    setFormName("");
    setFormCategory("custom");
    setFormMessages(["", "", "", "", ""]);
    setActiveMessageTab(0);
    setRotationMode("random");
    setFormMediaFiles([]);
    setFormButtons([]);
    setEditingId(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const parseMediaFiles = (mediaUrl: string | null): MediaFile[] => {
    if (!mediaUrl) return [];
    try {
      const parsed = JSON.parse(mediaUrl);
      if (Array.isArray(parsed)) return parsed.map((p: any, i: number) => ({ ...p, id: i + 1, sendMode: p.sendMode || "with" }));
    } catch {}
    return [];
  };

  const openEdit = (t: DispatchTemplate) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormCategory(t.category);
    const contentParts = t.content.includes("|||") ? t.content.split("|||") : t.content.includes("|&&|") ? t.content.split("|&&|") : [t.content];
    const msgs = ["", "", "", "", ""];
    contentParts.forEach((p: string, i: number) => { if (i < 5) msgs[i] = p; });
    setFormMessages(msgs);
    setActiveMessageTab(0);
    setRotationMode(t.content.includes("|&&|") ? "all" : "random");
    setFormMediaFiles([]);
    setFormButtons([]);
    setDialogOpen(true);
  };

  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/") || file.type === "image/gif") { resolve(file); return; }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
          } else { resolve(file); }
        }, "image/webp", quality);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  const detectFileType = (file: File): MediaFile["type"] => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  };

  const handleMediaUpload = async (file: File) => {
    if (!session) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 20MB)"); return; }
    setUploading(true);
    try {
      const optimized = await compressImage(file);
      const ext = optimized.name.split(".").pop() || "bin";
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, optimized);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      setFormMediaFiles(prev => [...prev, { id: Date.now(), url: urlData.publicUrl, type: detectFileType(file), name: file.name, sendMode: "with" }]);
      toast.success("Arquivo enviado");
    } catch (err: any) { toast.error(err.message); } finally { setUploading(false); }
  };

  const removeMediaFile = (id: number) => setFormMediaFiles(prev => prev.filter(f => f.id !== id));
  const moveMediaFile = (id: number, direction: "up" | "down") => {
    setFormMediaFiles(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  };
  const cycleSendMode = (id: number) => {
    setFormMediaFiles(prev => {
      const current = prev.find(f => f.id === id);
      if (!current) return prev;
      const order: Array<MediaFile["sendMode"]> = ["before", "with", "after"];
      let nextIdx = (order.indexOf(current.sendMode) + 1) % order.length;
      let nextMode = order[nextIdx];
      if (nextMode === "with" && prev.some(f => f.id !== id && f.sendMode === "with")) nextMode = "after";
      return prev.map(f => f.id === id ? { ...f, sendMode: nextMode } : f);
    });
  };

  const handleSave = () => {
    if (!formName.trim() || allMessages.length === 0) { toast.error("Preencha nome e conteúdo"); return; }
    const combinedContent = allMessages.length > 1
      ? (rotationMode === "random" ? allMessages.join("|||") : allMessages.join("|&&|"))
      : allMessages[0] || "";
    saveMutation.mutate({ name: formName, category: formCategory, content: combinedContent, id: editingId || undefined });
  };

  const addButton = (type: "reply" | "url" | "phone") => {
    if (formButtons.length < 10) setFormButtons(prev => [...prev, { id: Date.now(), type, text: "", value: "" }]);
  };
  const removeButton = (id: number) => setFormButtons(prev => prev.filter(b => b.id !== id));
  const updateButton = (id: number, field: keyof TemplateButton, val: string) => {
    setFormButtons(prev => prev.map(b => b.id === id ? { ...b, [field]: val } : b));
  };
  const moveButton = (id: number, direction: "up" | "down") => {
    setFormButtons(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  };

  const wrapSelectedText = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) { setFormContent(prev => prev + before + after); return; }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = formContent.substring(start, end);
    const newText = formContent.substring(0, start) + before + selected + after + formContent.substring(end);
    setFormContent(newText);
    setTimeout(() => {
      textarea.focus();
      if (selected.length > 0) textarea.setSelectionRange(start + before.length, end + before.length);
      else textarea.setSelectionRange(start + before.length, start + before.length);
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) { setFormContent(prev => prev + text); return; }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = formContent.substring(0, start) + text + formContent.substring(end);
    setFormContent(newText);
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + text.length, start + text.length); }, 0);
  };

  const buttonTypeLabel = (type: string) => {
    const map: Record<string, string> = { reply: "Resposta Rápida", url: "Link (URL)", phone: "Ligar (Telefone)" };
    return map[type] || type;
  };
  const buttonTypeIcon = (type: string) => {
    if (type === "url") return Link;
    if (type === "phone") return Phone;
    return MousePointerClick;
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return templates.filter(t => {
      if (q && !t.name.toLowerCase().includes(q) && !t.content.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
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
          <p className="text-xs text-muted-foreground mt-0.5">Crie e gerencie templates reutilizáveis para disparos</p>
        </div>
        <Button onClick={openNew} className="gap-2 text-sm">
          <Plus size={15} /> Novo Modelo
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <Input placeholder="Buscar modelo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 bg-card/50 border-border/60 text-sm" />
        </div>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-primary" /></div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/50 rounded-xl">
          <FileText size={28} className="mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground/60">Nenhum modelo encontrado</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={openNew}><Plus size={14} className="mr-1" /> Criar primeiro modelo</Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginated.map((t, idx) => {
            return (
              <div key={t.id} className="group flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border/40 bg-card hover:border-primary/20 hover:shadow-[0_2px_12px_-4px_hsl(var(--primary)/0.08)] transition-all duration-200">
                <span className="text-xs font-mono text-muted-foreground/40 w-6 text-right tabular-nums shrink-0">
                  {(currentPage - 1) * perPage + idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                    {!t.is_active && <Badge variant="outline" className="text-[9px] border-border/50 text-muted-foreground">Inativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground/60 truncate mt-0.5 max-w-[400px]">{t.content}</p>
                </div>
                <span className="text-[11px] text-muted-foreground/40 shrink-0 hidden lg:block tabular-nums">
                  {new Date(t.created_at).toLocaleDateString("pt-BR")}
                </span>
                <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors"
                    onClick={() => { setPreviewTemplate({ ...t, buttons: [] }); setPreviewOpen(true); }} title="Preview">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors"
                    onClick={() => { navigator.clipboard.writeText(t.content); toast.success("Copiado!"); }} title="Copiar">
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors"
                    onClick={() => toggleMutation.mutate({ id: t.id, active: !t.is_active })} title={t.is_active ? "Desativar" : "Ativar"}>
                    {t.is_active ? <ToggleRight className="w-3.5 h-3.5 text-primary" /> : <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  <button className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors" onClick={() => openEdit(t)} title="Editar">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-destructive/10 transition-colors"
                    onClick={() => { if (confirm("Excluir modelo?")) deleteMutation.mutate(t.id); }} title="Excluir">
                    <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > perPage && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground pt-1">
          <span className="text-muted-foreground/50">
            {(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1 ml-2">
            <button className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/40 hover:bg-muted/40 disabled:opacity-30 transition-colors" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-semibold">{currentPage}</span>
            <button className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/40 hover:bg-muted/40 disabled:opacity-30 transition-colors" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Create/Edit Dialog — Full Editor ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/30">
            <DialogTitle className="text-lg flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              {editingId ? "Editar Modelo" : "Novo Modelo"}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-5">
            {/* Name + Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nome do modelo</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Lembrete de vencimento" className="h-11 text-sm bg-background/50 dark:bg-muted/20 border-border/30" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Categoria</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-11 bg-background/50 dark:bg-muted/20 border-border/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Message Editor */}
            <SurfaceCard className="p-4 sm:p-5 space-y-4">
              <SectionLabel>Mensagem</SectionLabel>

              {/* Message Tabs */}
              <div className="flex items-center gap-1 flex-wrap">
                {[0, 1, 2, 3, 4].map(i => {
                  const hasText = formMessages[i]?.trim();
                  return (
                    <button key={i} onClick={() => setActiveMessageTab(i)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border",
                        activeMessageTab === i
                          ? "bg-primary/15 text-primary border-primary/30"
                          : hasText ? "bg-muted/20 text-foreground/70 border-border/20 hover:bg-muted/30"
                          : "bg-muted/8 text-muted-foreground/40 border-border/10 hover:bg-muted/15"
                      )}>
                      Msg {i + 1}
                      {hasText && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
                    </button>
                  );
                })}
                <span className="text-[9px] text-muted-foreground/40 ml-2">{allMessages.length}/5 ativas</span>
              </div>

              {/* Rotation toggle */}
              {allMessages.length > 1 && (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-muted/10 border border-border/10">
                  <p className="text-[11px] font-medium text-foreground/70">Modo de envio das mensagens</p>
                  <div className="flex gap-2">
                    {([
                      { value: "random" as const, label: "Aleatório", icon: <Sparkles className="w-3 h-3 mr-1" />, desc: "Uma mensagem aleatória para cada contato" },
                      { value: "all" as const, label: "Todas", icon: <ArrowDown className="w-3 h-3 mr-1" />, desc: "Todas as mensagens para cada contato" },
                    ]).map(opt => (
                      <button key={opt.value} onClick={() => setRotationMode(opt.value)}
                        className={`flex-1 text-center p-2 rounded-lg border text-[10px] transition-all ${rotationMode === opt.value ? "border-primary bg-primary/10 text-primary font-medium" : "border-border/20 text-muted-foreground hover:border-border/40"}`}>
                        <div className="flex items-center justify-center">{opt.icon}{opt.label}</div>
                        <p className="text-[9px] text-muted-foreground/50 mt-1">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center gap-0.5 flex-wrap p-1.5 rounded-xl bg-muted/15 dark:bg-muted/8 border border-border/10">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium rounded-lg">
                      <FileText className="w-3.5 h-3.5" /> Variável
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-1.5 bg-popover border-border z-50" align="start">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 px-2 py-1">Cliente</p>
                    {[
                      { label: "Nome", tag: "{{nome}}" },
                      { label: "Email", tag: "{{email}}" },
                      { label: "Telefone", tag: "{{telefone}}" },
                      { label: "Plano", tag: "{{plano}}" },
                      { label: "Vencimento", tag: "{{vencimento}}" },
                      { label: "Dias Restantes", tag: "{{dias_restantes}}" },
                    ].map(v => (
                      <button key={v.tag} className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent transition-colors flex items-center justify-between"
                        onClick={() => insertAtCursor(v.tag)}>
                        <span>{v.label}</span>
                        <code className="text-[9px] text-muted-foreground">{v.tag}</code>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>

                <div className="h-5 w-px bg-border/20 mx-0.5" />
                {[
                  { icon: Bold, label: "Negrito", wrap: ["*", "*"] },
                  { icon: Italic, label: "Itálico", wrap: ["_", "_"] },
                  { icon: Strikethrough, label: "Tachado", wrap: ["~", "~"] },
                  { icon: Code, label: "Código", wrap: ["```", "```"] },
                ].map(({ icon: Icon, label, wrap }) => (
                  <Button key={label} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-foreground hover:bg-background/60 rounded-lg transition-colors" title={label}
                    onClick={() => wrapSelectedText(wrap[0], wrap[1])}>
                    <Icon className="w-3.5 h-3.5" />
                  </Button>
                ))}
                <div className="h-5 w-px bg-border/20 mx-0.5" />

                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-foreground hover:bg-background/60 rounded-lg" title="Emoji">
                      <Smile className="w-3.5 h-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-2 bg-popover border-border z-50" align="start">
                    <div className="flex items-center gap-0.5 mb-2 border-b border-border/20 pb-1.5">
                      {Object.keys(commonEmojis).map(cat => (
                        <button key={cat} onClick={() => setEmojiCategory(cat)}
                          className={cn("px-2 py-1 rounded text-[10px] transition-colors",
                            emojiCategory === cat ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
                          )}>{cat}</button>
                      ))}
                    </div>
                    <div className="grid grid-cols-8 gap-0.5">
                      {(commonEmojis[emojiCategory] || []).map(emoji => (
                        <button key={emoji} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent transition-colors text-base"
                          onClick={() => { insertAtCursor(emoji); setShowEmojiPicker(false); }}>{emoji}</button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Olá, {{nome}}.\n\nEscreva sua mensagem aqui..."
                rows={8}
                className="text-sm leading-[1.8] bg-muted/8 dark:bg-muted/4 border-border/15 resize-none focus-visible:ring-1 focus-visible:ring-primary/30 px-4 py-3 text-foreground/90 placeholder:text-muted-foreground/30 rounded-xl"
              />

              {/* Detected variables */}
              {detectedVars.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-muted-foreground/50 font-medium">Variáveis:</span>
                  {detectedVars.map(v => (
                    <span key={v} className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 dark:bg-primary/15 text-primary text-[10px] font-mono font-medium border border-primary/20">
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </SurfaceCard>

            {/* Mídia */}
            <SurfaceCard className="p-4 sm:p-5 space-y-3">
              <SectionLabel>Mídia</SectionLabel>
              {formMediaFiles.length === 0 ? (
                <button onClick={() => mediaFileRef.current?.click()} disabled={uploading}
                  className="w-full py-6 rounded-xl border-2 border-dashed border-border/30 dark:border-border/15 hover:border-primary/40 bg-muted/5 dark:bg-muted/3 flex flex-col items-center justify-center gap-2 transition-colors duration-100 hover:bg-primary/5 group">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <ImageIcon className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />}
                  <span className="text-[11px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">{uploading ? "Enviando..." : "Imagem, vídeo, áudio ou documento — até 20MB"}</span>
                </button>
              ) : (
                <div className="space-y-2">
                  {formMediaFiles.map((file, idx) => (
                    <div key={file.id} className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        {file.type === "image" && <img src={file.url} alt={file.name} className="w-12 h-12 rounded-lg object-cover shrink-0" loading="lazy" />}
                        {file.type === "video" && <div className="w-12 h-12 rounded-lg bg-muted/40 flex items-center justify-center shrink-0"><Video className="w-5 h-5 text-muted-foreground/60" /></div>}
                        {file.type === "audio" && <div className="w-12 h-12 rounded-lg bg-muted/40 flex items-center justify-center shrink-0"><Mic className="w-5 h-5 text-primary" /></div>}
                        {file.type === "document" && <div className="w-12 h-12 rounded-lg bg-muted/40 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-primary" /></div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                          <Badge variant="outline" className="text-[9px] h-4 border-border/60 bg-muted/30 px-1.5 mt-1">
                            {file.type === "image" ? "Imagem" : file.type === "video" ? "Vídeo" : file.type === "audio" ? "Áudio" : "Doc"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50 disabled:opacity-20" disabled={idx === 0} onClick={() => moveMediaFile(file.id, "up")}><ArrowUp className="w-3.5 h-3.5" /></button>
                          <button className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50 disabled:opacity-20" disabled={idx === formMediaFiles.length - 1} onClick={() => moveMediaFile(file.id, "down")}><ArrowDown className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => cycleSendMode(file.id)}
                            className={cn("h-7 px-2.5 rounded-lg text-[10px] font-medium transition-all border ml-1",
                              file.sendMode === "before" ? "bg-primary text-primary-foreground border-primary"
                              : file.sendMode === "with" ? "bg-primary/15 text-primary border-primary/40"
                              : "bg-muted/40 text-foreground/70 border-border/60"
                            )}>
                            {file.sendMode === "before" ? "Antes da msg" : file.sendMode === "with" ? "Com a msg" : "Depois da msg"}
                          </button>
                          <button className="text-muted-foreground/50 hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10" onClick={() => removeMediaFile(file.id)}><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm"
                    className="w-full h-9 text-xs gap-1.5 border-dashed border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5"
                    onClick={() => mediaFileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Adicionar mídia
                  </Button>
                </div>
              )}
              <input ref={mediaFileRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx" className="hidden"
                onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; await handleMediaUpload(file); e.target.value = ""; }} />
            </SurfaceCard>

            {/* Botões Interativos */}
            <SurfaceCard className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <SectionLabel>Botões Interativos</SectionLabel>
                <Badge variant="secondary" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20">{formButtons.length}/10</Badge>
              </div>
              <div className="space-y-3">
                {formButtons.map((btn, idx) => {
                  const TypeIcon = buttonTypeIcon(btn.type);
                  return (
                    <div key={btn.id} className="rounded-xl border border-border/30 dark:border-border/15 bg-muted/15 dark:bg-muted/8 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center"><TypeIcon className="w-3.5 h-3.5 text-primary" /></div>
                          <span className="text-[11px] font-semibold text-foreground/70">{buttonTypeLabel(btn.type)}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button className="text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/30 disabled:opacity-20" disabled={idx === 0} onClick={() => moveButton(btn.id, "up")}><ArrowUp className="w-3.5 h-3.5" /></button>
                          <button className="text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/30 disabled:opacity-20" disabled={idx === formButtons.length - 1} onClick={() => moveButton(btn.id, "down")}><ArrowDown className="w-3.5 h-3.5" /></button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-muted-foreground/40 hover:text-primary transition-colors p-1 rounded-lg hover:bg-primary/10"><Pencil className="w-3.5 h-3.5" /></button>
                            </PopoverTrigger>
                            <PopoverContent className="w-44 p-1.5 bg-popover border-border z-50" align="end">
                              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 px-2 py-1">Alterar tipo</p>
                              {[
                                { t: "reply" as const, label: "Resposta Rápida", Ic: MousePointerClick },
                                { t: "url" as const, label: "Link (URL)", Ic: Link },
                                { t: "phone" as const, label: "Ligar (Telefone)", Ic: Phone },
                              ].map(opt => (
                                <button key={opt.t} className={cn("w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-accent transition-colors flex items-center gap-2", btn.type === opt.t && "bg-accent")}
                                  onClick={() => updateButton(btn.id, "type", opt.t)}>
                                  <opt.Ic className="w-3.5 h-3.5 text-muted-foreground" /><span className="font-medium">{opt.label}</span>
                                </button>
                              ))}
                            </PopoverContent>
                          </Popover>
                          <button className="text-muted-foreground/30 hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10" onClick={() => removeButton(btn.id)}><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      {btn.type === "reply" ? (
                        <Input value={btn.text} onChange={(e) => updateButton(btn.id, "text", e.target.value)} placeholder="Texto exibido no botão" className="h-10 text-sm bg-background/50 dark:bg-background/20 border-border/15 font-medium" maxLength={20} />
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <Input value={btn.text} onChange={(e) => updateButton(btn.id, "text", e.target.value)} placeholder="Texto exibido" className="h-10 text-sm bg-background/50 dark:bg-background/20 border-border/15 font-medium" maxLength={20} />
                          <Input value={btn.value} onChange={(e) => updateButton(btn.id, "value", e.target.value)} placeholder={btn.type === "url" ? "https://..." : "+5511999999999"} className="h-10 text-sm bg-background/50 dark:bg-background/20 border-border/15 font-mono" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" disabled={formButtons.length >= 10}
                className="w-full h-11 gap-2 border-dashed border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors duration-100 text-xs font-medium"
                onClick={() => addButton("reply")}>
                <Plus className="w-4 h-4" /> Adicionar Botão
              </Button>
            </SurfaceCard>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/30">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || !formName.trim() || allMessages.length === 0}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingId ? "Salvar" : "Criar Modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Preview Dialog (WhatsApp Phone) ═══ */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[380px] max-h-[85vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none [&>button]:hidden">
          <div className="rounded-2xl overflow-hidden border border-[#ffffff0a] shadow-[0_8px_30px_rgba(0,0,0,0.4)]" style={{ background: "#0b141a" }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-[#ffffff08]" style={{ background: "#1f2c34" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#2a3942" }}>
                  <MessageSquare className="w-4.5 h-4.5" style={{ color: "#aebac1" }} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold leading-tight" style={{ color: "#e9edef" }}>Destinatário</p>
                  <p className="text-[10px]" style={{ color: "#8696a0" }}>online</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(["sent", "received"] as const).map((mode) => (
                  <button key={mode} onClick={() => setPreviewMode(mode)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
                    style={{
                      background: previewMode === mode ? "hsl(var(--primary) / 0.15)" : "transparent",
                      color: previewMode === mode ? "hsl(var(--primary))" : "#8696a0",
                      border: previewMode === mode ? "1px solid hsl(var(--primary) / 0.3)" : "1px solid transparent",
                    }}>
                    {mode === "sent" ? "Enviada" : "Recebida"}
                  </button>
                ))}
                <button onClick={() => setPreviewOpen(false)} className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#ffffff10] transition-colors">
                  <X className="w-3.5 h-3.5" style={{ color: "#8696a0" }} />
                </button>
              </div>
            </div>

            {/* Chat area */}
            <div className="px-5 py-8 min-h-[320px] flex flex-col justify-end gap-2"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'0.8\' fill=\'%23ffffff06\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill=\'url(%23p)\' width=\'200\' height=\'200\'/%3E%3C/svg%3E")' }}>
              {previewTemplate && (() => {
                const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                const isSent = previewMode === "sent";
                const bubbleBg = isSent ? "#005c4b" : "#1f2c34";
                const align = isSent ? "self-end" : "self-start";
                const buttons = previewTemplate.buttons || [];
                const content = previewTemplate.content
                  .replace(/\|\|\|/g, "\n---\n")
                  .replace(/\|&&\|/g, "\n---\n");

                return (
                  <div className={`${align} max-w-[82%]`}>
                    <div className="rounded-xl overflow-hidden shadow-md" style={{ background: bubbleBg }}>
                      <div className="px-3 py-2">
                        <p className="text-[13px] whitespace-pre-wrap leading-[1.4]" style={{ color: "#e9edef" }}>{content}</p>
                        <div className="flex justify-end mt-1 gap-1 items-center">
                          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>{time}</span>
                          {isSent && <span className="text-[10px]" style={{ color: "#53bdeb" }}>✓✓</span>}
                        </div>
                      </div>
                      {buttons.length > 0 && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          {buttons.map((btn: any, i: number) => (
                            <div key={i} className="px-3 py-2.5 flex items-center justify-center gap-1.5 text-center"
                              style={{ borderBottom: i < buttons.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                              {btn.type === "url" ? <Link className="w-3.5 h-3.5" style={{ color: "#00a884" }} /> : btn.type === "phone" ? <Phone className="w-3.5 h-3.5" style={{ color: "#00a884" }} /> : <MessageSquare className="w-3.5 h-3.5" style={{ color: "#00a884" }} />}
                              <span className="text-[13px] font-medium" style={{ color: "#00a884" }}>{btn.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
