import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Link, Phone, MessageSquare, X, Upload, Image, Loader2, FileText, Video, Mic, ArrowUp, ArrowDown, GripVertical, Eye } from "lucide-react";
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from "@/hooks/useTemplates";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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
  sendMode: "before" | "with";
}

const Templates = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const { data: templates = [], isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("text");
  const [formContent, setFormContent] = useState("");
  const [formMediaUrl, setFormMediaUrl] = useState("");
  const [formMediaFiles, setFormMediaFiles] = useState<MediaFile[]>([]);
  const [formButtons, setFormButtons] = useState<TemplateButton[]>([]);
  const [uploading, setUploading] = useState(false);
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<"sent" | "received">("sent");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const filtered = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || t.type === filterType;
    return matchSearch && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormType("text");
    setFormContent("");
    setFormMediaUrl("");
    setFormMediaFiles([]);
    setFormButtons([]);
    setDialogOpen(true);
  };

  // Auto-detect type based on what was added
  const getAutoType = () => {
    if (formButtons.length > 0) return "buttons";
    if (formMediaFiles.length > 0) return "text-media";
    return "text";
  };

  const parseMediaFiles = (mediaUrl: string | null): MediaFile[] => {
    if (!mediaUrl) return [];
    try {
      const parsed = JSON.parse(mediaUrl);
      if (Array.isArray(parsed)) return parsed.map((p: any, i: number) => ({ ...p, id: i + 1, sendMode: p.sendMode || "with" }));
    } catch {}
    const ext = mediaUrl.split(".").pop()?.toLowerCase() || "";
    const type = ["mp4", "webm", "mov", "avi"].includes(ext) ? "video"
      : ["mp3", "wav", "ogg", "m4a", "opus"].includes(ext) ? "audio"
      : ["pdf", "doc", "docx", "xls", "xlsx"].includes(ext) ? "document"
      : "image";
    return [{ id: 1, url: mediaUrl, type, name: mediaUrl.split("/").pop() || "arquivo", sendMode: "with" as const }];
  };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormType(t.type);
    setFormContent(t.content);
    setFormMediaUrl(t.media_url || "");
    const files = parseMediaFiles(t.media_url);
    setFormMediaFiles(files);
    setFormButtons(
      (t.buttons || []).map((b: any, i: number) => ({
        id: Date.now() + i,
        type: b.type || "reply",
        text: b.text || "",
        value: b.value || "",
      }))
    );
    setDialogOpen(true);
  };

  const detectFileType = (file: File): MediaFile["type"] => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  };

  const handleMediaUpload = async (file: File) => {
    if (!session) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 20MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${session.user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      const newFile: MediaFile = {
        id: Date.now(),
        url: urlData.publicUrl,
        type: detectFileType(file),
        name: file.name,
        sendMode: "with",
      };
      setFormMediaFiles(prev => [...prev, newFile]);
      toast({ title: "Arquivo enviado" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeMediaFile = (id: number) => {
    setFormMediaFiles(prev => prev.filter(f => f.id !== id));
  };

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

  const toggleSendMode = (id: number) => {
    setFormMediaFiles(prev => prev.map(f => {
      if (f.id === id) return { ...f, sendMode: f.sendMode === "with" ? "before" : "with" };
      // Only one can be "with" — reset others
      return { ...f, sendMode: f.sendMode === "with" ? "before" : f.sendMode };
    }));
  };

  const handleSave = () => {
    if (!formName.trim() || !formContent.trim()) return;
    const autoType = getAutoType();
    const mediaValue = formMediaFiles.length > 0
      ? JSON.stringify(formMediaFiles.map(f => ({ url: f.url, type: f.type, name: f.name, sendMode: f.sendMode })))
      : formMediaUrl || undefined;
    const payload = {
      name: formName,
      type: autoType,
      content: formContent,
      media_url: mediaValue,
      buttons: formButtons.map(b => ({ type: b.type, text: b.text, value: b.value })),
    };
    if (editingId) {
      updateTemplate.mutate({ id: editingId, ...payload }, {
        onSuccess: () => { setDialogOpen(false); toast({ title: "Modelo atualizado" }); },
      });
    } else {
      createTemplate.mutate(payload, {
        onSuccess: () => { setDialogOpen(false); toast({ title: "Modelo criado" }); },
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteTemplate.mutate(id, { onSuccess: () => toast({ title: "Modelo excluído" }) });
  };

  const addButton = (type: "reply" | "url" | "phone") => {
    setFormButtons(prev => [...prev, { id: Date.now(), type, text: "", value: "" }]);
  };

  const removeButton = (id: number) => {
    setFormButtons(prev => prev.filter(b => b.id !== id));
  };

  const updateButton = (id: number, field: keyof TemplateButton, val: string) => {
    setFormButtons(prev => prev.map(b => b.id === id ? { ...b, [field]: val } : b));
  };

  const showButtons = formType === "buttons";
  const showMedia = formType === "text-media";

  const typeLabel = (type: string) => {
    const map: Record<string, string> = { text: "Texto", "text-media": "Texto com mídia", buttons: "Botões", list: "Lista" };
    return map[type] || type;
  };

  const buttonTypeLabel = (type: string) => {
    const map: Record<string, string> = { reply: "Resposta", url: "Link", phone: "Telefone" };
    return map[type] || type;
  };

  const buttonTypeIcon = (type: string) => {
    if (type === "url") return <Link className="w-3 h-3" />;
    if (type === "phone") return <Phone className="w-3 h-3" />;
    return <MessageSquare className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Modelos</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Gerencie seus templates de mensagem</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5 rounded-xl px-5 shadow-sm">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar modelo..." className="pl-9 h-10 text-sm rounded-xl bg-muted/30 border-border/50 focus:bg-background transition-colors" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-10 w-36 sm:w-44 text-sm rounded-xl bg-muted/30 border-border/50"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="text">Texto</SelectItem>
            <SelectItem value="text-media">Texto com mídia</SelectItem>
            <SelectItem value="buttons">Botões</SelectItem>
            <SelectItem value="list">Lista</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="flex justify-center py-16 text-sm text-muted-foreground">Carregando...</div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <FileText className="w-10 h-10 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">Nenhum modelo encontrado</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {paginated.map((t, idx) => (
            <div
              key={t.id}
              className="group flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border/40 bg-card hover:border-primary/20 hover:shadow-[0_2px_12px_-4px_hsl(var(--primary)/0.08)] transition-all duration-200"
            >
              {/* Number */}
              <span className="text-xs font-mono text-muted-foreground/40 w-6 text-right tabular-nums shrink-0">
                {(currentPage - 1) * perPage + idx + 1}
              </span>

              {/* Type badge */}
              <Badge
                variant="outline"
                className="text-[10px] font-medium shrink-0 rounded-lg px-2 py-0.5 border-border/60 bg-muted/40 hidden sm:flex"
              >
                {typeLabel(t.type)}
              </Badge>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground/60 truncate mt-0.5 max-w-[300px]">{t.content}</p>
              </div>

              {/* Date */}
              <span className="text-[11px] text-muted-foreground/40 shrink-0 hidden lg:block tabular-nums">
                {new Date(t.created_at).toLocaleDateString("pt-BR")}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors"
                  onClick={() => { setPreviewTemplate(t); setPreviewOpen(true); }}
                  title="Pré-visualizar"
                >
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted/60 transition-colors"
                  onClick={() => openEdit(t)}
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-destructive/10 transition-colors"
                  onClick={() => handleDelete(t.id)}
                  title="Excluir"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > perPage && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground pt-1">
          <span className="text-muted-foreground/50">
            {(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1 ml-2">
            <button
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/40 hover:bg-muted/40 disabled:opacity-30 transition-colors"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-semibold">{currentPage}</span>
            <button
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border/40 hover:bg-muted/40 disabled:opacity-30 transition-colors"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar modelo" : "Adicionar modelo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nome do modelo" className="h-9 text-sm" />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mensagem</Label>
              <Textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="Conteúdo da mensagem" rows={4} className="text-sm" />
            </div>

            {/* Media — always visible */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Mídias <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => mediaFileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Adicionar
                </Button>
              </div>

              {formMediaFiles.length === 0 && (
                <div
                  className="border-2 border-dashed border-border/50 rounded-xl p-4 text-center cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => mediaFileRef.current?.click()}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-4 h-4 text-muted-foreground/40" />
                    <p className="text-[10px] text-muted-foreground/60">Imagens, vídeos, áudios, PDFs — até 20MB</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {formMediaFiles.map((file, idx) => (
                  <div key={file.id} className="border border-border/50 rounded-xl overflow-hidden">
                    {file.type === "image" && <img src={file.url} alt={file.name} className="w-full max-h-20 object-cover" />}
                    {file.type === "video" && <video src={file.url} controls className="w-full max-h-20" />}
                    {file.type === "audio" && (
                      <div className="p-2 flex items-center gap-2 bg-muted/30">
                        <Mic className="w-3.5 h-3.5 text-primary shrink-0" />
                        <audio src={file.url} controls className="w-full h-7" />
                      </div>
                    )}
                    {file.type === "document" && (
                      <div className="p-2 flex items-center gap-2 bg-muted/30">
                        <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline truncate">{file.name}</a>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/30 bg-muted/10">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5 mr-1">
                          <GripVertical className="w-3 h-3 text-muted-foreground/50" />
                          <Button type="button" variant="ghost" size="icon" className="h-5 w-5" disabled={idx === 0} onClick={() => moveMediaFile(file.id, "up")}><ArrowUp className="w-3 h-3" /></Button>
                          <Button type="button" variant="ghost" size="icon" className="h-5 w-5" disabled={idx === formMediaFiles.length - 1} onClick={() => moveMediaFile(file.id, "down")}><ArrowDown className="w-3 h-3" /></Button>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {file.type === "image" && <><Image className="w-2.5 h-2.5 mr-0.5" /> Imagem</>}
                          {file.type === "video" && <><Video className="w-2.5 h-2.5 mr-0.5" /> Vídeo</>}
                          {file.type === "audio" && <><Mic className="w-2.5 h-2.5 mr-0.5" /> Áudio</>}
                          {file.type === "document" && <><FileText className="w-2.5 h-2.5 mr-0.5" /> Doc</>}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant={file.sendMode === "before" ? "default" : "outline"} size="sm" className="h-5 text-[9px] px-1.5" onClick={() => toggleSendMode(file.id)}>
                          {file.sendMode === "before" ? "Antes da msg" : "Com a msg"}
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeMediaFile(file.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <input
                ref={mediaFileRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await handleMediaUpload(file);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Buttons — always visible */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Botões <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <div className="flex items-center gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => addButton("reply")}>
                    <MessageSquare className="w-3 h-3" /> Resposta
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => addButton("url")}>
                    <Link className="w-3 h-3" /> Link
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => addButton("phone")}>
                    <Phone className="w-3 h-3" /> Tel
                  </Button>
                </div>
              </div>

              {formButtons.length === 0 && (
                <p className="text-[10px] text-muted-foreground/50 text-center py-2">
                  Adicione botões interativos se desejar
                </p>
              )}

              {formButtons.map((btn) => (
                <div key={btn.id} className="border border-border/50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      {buttonTypeIcon(btn.type)} {buttonTypeLabel(btn.type)}
                    </Badge>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeButton(btn.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <Input value={btn.text} onChange={e => updateButton(btn.id, "text", e.target.value)} placeholder="Texto do botão" className="h-8 text-xs" />
                  {btn.type === "url" && (
                    <Input value={btn.value} onChange={e => updateButton(btn.id, "value", e.target.value)} placeholder="https://exemplo.com" className="h-8 text-xs font-mono" />
                  )}
                  {btn.type === "phone" && (
                    <Input value={btn.value} onChange={e => updateButton(btn.id, "value", e.target.value)} placeholder="5511999999999" className="h-8 text-xs font-mono" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createTemplate.isPending || updateTemplate.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-[380px] max-h-[85vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none [&>button]:hidden">

          {/* WhatsApp Preview Container */}
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
                  <button
                    key={mode}
                    onClick={() => setPreviewMode(mode)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150"
                    style={{
                      background: previewMode === mode ? "hsl(var(--primary) / 0.15)" : "transparent",
                      color: previewMode === mode ? "hsl(var(--primary))" : "#8696a0",
                      border: previewMode === mode ? "1px solid hsl(var(--primary) / 0.3)" : "1px solid transparent",
                    }}
                  >
                    {mode === "sent" ? "Enviada" : "Recebida"}
                  </button>
                ))}
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#ffffff10] transition-colors"
                >
                  <X className="w-3.5 h-3.5" style={{ color: "#8696a0" }} />
                </button>
              </div>
            </div>

            {/* Chat area */}
            <div
              className="px-5 py-8 min-h-[320px] flex flex-col justify-end gap-2"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'0.8\' fill=\'%23ffffff06\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill=\'url(%23p)\' width=\'200\' height=\'200\'/%3E%3C/svg%3E")',
              }}
            >
              {previewTemplate && (() => {
                const files = parseMediaFiles(previewTemplate.media_url);
                const beforeFiles = files.filter((f: MediaFile) => f.sendMode === "before");
                const withFile = files.find((f: MediaFile) => f.sendMode === "with");
                const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                const isSent = previewMode === "sent";
                const bubbleBg = isSent ? "#005c4b" : "#1f2c34";
                const align = isSent ? "self-end" : "self-start";
                const buttons = previewTemplate.buttons || [];

                return (
                  <>
                    {/* Files sent BEFORE */}
                    {beforeFiles.map((file: MediaFile, i: number) => (
                      <div key={`before-${i}`} className={`${align} max-w-[82%]`}>
                        <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: bubbleBg }}>
                          {file.type === "image" && <img src={file.url} alt={file.name} className="w-full max-h-48 object-cover" />}
                          {file.type === "video" && <video src={file.url} controls className="w-full max-h-48" />}
                          {file.type === "audio" && (
                            <div className="px-3 py-2.5 flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#00a884" }}>
                                <Mic className="w-4 h-4 text-white" />
                              </div>
                              <audio src={file.url} controls className="w-full h-7 [&::-webkit-media-controls-panel]:bg-transparent" />
                            </div>
                          )}
                          {file.type === "document" && (
                            <div className="px-3 py-2.5 flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(0,168,132,0.15)" }}>
                                <FileText className="w-4 h-4" style={{ color: "#00a884" }} />
                              </div>
                              <span className="text-[11px] truncate" style={{ color: "#e9edef" }}>{file.name}</span>
                            </div>
                          )}
                          <div className="flex justify-end px-2.5 pb-1.5">
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.55)" }}>{time} {isSent && "✓✓"}</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Main bubble */}
                    <div className={`${align} max-w-[82%]`}>
                      <div className="rounded-xl overflow-hidden shadow-md" style={{ background: bubbleBg }}>
                        {withFile && (
                          <>
                            {withFile.type === "image" && <img src={withFile.url} alt={withFile.name} className="w-full max-h-48 object-cover" />}
                            {withFile.type === "video" && <video src={withFile.url} controls className="w-full max-h-48" />}
                          </>
                        )}
                        <div className="px-3 py-2">
                          <p className="text-[13px] whitespace-pre-wrap leading-[1.4]" style={{ color: "#e9edef" }}>
                            {previewTemplate.content}
                          </p>
                          <div className="flex justify-end mt-1 gap-1 items-center">
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>{time}</span>
                            {isSent && <span className="text-[10px]" style={{ color: "#53bdeb" }}>✓✓</span>}
                          </div>
                        </div>

                        {/* Buttons */}
                        {buttons.length > 0 && (
                          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            {buttons.map((btn: any, i: number) => (
                              <div
                                key={i}
                                className="px-3 py-2.5 flex items-center justify-center gap-1.5 text-center cursor-pointer transition-colors"
                                style={{
                                  borderBottom: i < buttons.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                              >
                                {btn.type === "url" ? <Link className="w-3.5 h-3.5" style={{ color: "#00a884" }} /> : btn.type === "phone" ? <Phone className="w-3.5 h-3.5" style={{ color: "#00a884" }} /> : <MessageSquare className="w-3.5 h-3.5" style={{ color: "#00a884" }} />}
                                <span className="text-[13px] font-medium" style={{ color: "#00a884" }}>{btn.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
