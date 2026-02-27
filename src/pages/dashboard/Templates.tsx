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
    const mediaValue = formMediaFiles.length > 0
      ? JSON.stringify(formMediaFiles.map(f => ({ url: f.url, type: f.type, name: f.name, sendMode: f.sendMode })))
      : formMediaUrl || undefined;
    const payload = {
      name: formName,
      type: formType,
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
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modelos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus templates de mensagem</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Procurar" className="pl-8 h-9 text-sm w-full" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-36 sm:w-48 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="text">Texto</SelectItem>
            <SelectItem value="text-media">Texto com mídia</SelectItem>
            <SelectItem value="buttons">Botões</SelectItem>
            <SelectItem value="list">Lista</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs w-12 hidden sm:table-cell">SN</TableHead>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Mensagem</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Criado em</TableHead>
                <TableHead className="text-xs">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">Nenhum modelo encontrado</TableCell></TableRow>
              ) : (
                paginated.map((t, idx) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{(currentPage - 1) * perPage + idx + 1}</TableCell>
                    <TableCell className="text-sm font-medium">{t.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{typeLabel(t.type)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate hidden md:table-cell">{t.content}</TableCell>
                    <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{new Date(t.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setPreviewTemplate(t); setPreviewOpen(true); }} title="Pré-visualizar">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)} title="Editar">
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)} title="Excluir">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span>{(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, filtered.length)} de {filtered.length}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="w-7 h-7 flex items-center justify-center rounded border border-primary text-primary text-xs font-medium">{currentPage}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Editar modelo" : "Adicionar modelo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nome do modelo" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de mensagem</Label>
              <Select value={formType} onValueChange={(v) => { setFormType(v); if (v !== "buttons") setFormButtons([]); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="text-media">Texto com mídia</SelectItem>
                  <SelectItem value="buttons">Botões</SelectItem>
                  <SelectItem value="list">Lista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mensagem</Label>
              <Textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="Conteúdo da mensagem" rows={4} className="text-sm" />
            </div>

            {showMedia && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Mídias</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => mediaFileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Adicionar mídia
                  </Button>
                </div>

                {formMediaFiles.length === 0 && (
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => mediaFileRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground">Clique para enviar arquivos</p>
                      <p className="text-[9px] text-muted-foreground/60">Imagens, vídeos, áudios, PDFs — até 20MB</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {formMediaFiles.map((file, idx) => (
                    <div key={file.id} className="border border-border rounded-lg overflow-hidden">
                      {file.type === "image" && (
                        <img src={file.url} alt={file.name} className="w-full max-h-20 object-cover" />
                      )}
                      {file.type === "video" && (
                        <video src={file.url} controls className="w-full max-h-20" />
                      )}
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
                      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-muted/10">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5 mr-1">
                            <GripVertical className="w-3 h-3 text-muted-foreground/50" />
                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5" disabled={idx === 0} onClick={() => moveMediaFile(file.id, "up")}>
                              <ArrowUp className="w-3 h-3" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5" disabled={idx === formMediaFiles.length - 1} onClick={() => moveMediaFile(file.id, "down")}>
                              <ArrowDown className="w-3 h-3" />
                            </Button>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {file.type === "image" && <><Image className="w-2.5 h-2.5 mr-0.5" /> Imagem</>}
                            {file.type === "video" && <><Video className="w-2.5 h-2.5 mr-0.5" /> Vídeo</>}
                            {file.type === "audio" && <><Mic className="w-2.5 h-2.5 mr-0.5" /> Áudio</>}
                            {file.type === "document" && <><FileText className="w-2.5 h-2.5 mr-0.5" /> Documento</>}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant={file.sendMode === "before" ? "default" : "outline"}
                            size="sm"
                            className="h-5 text-[9px] px-1.5"
                            onClick={() => toggleSendMode(file.id)}
                          >
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
            )}

            {showButtons && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Botões</Label>
                  <div className="flex items-center gap-1.5">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => addButton("reply")}>
                      <MessageSquare className="w-3 h-3" /> Resposta
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => addButton("url")}>
                      <Link className="w-3 h-3" /> Link
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => addButton("phone")}>
                      <Phone className="w-3 h-3" /> Telefone
                    </Button>
                  </div>
                </div>

                {formButtons.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-lg">
                    Nenhum botão adicionado. Clique acima para adicionar.
                  </p>
                )}

                {formButtons.map((btn) => (
                  <div key={btn.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        {buttonTypeIcon(btn.type)} {buttonTypeLabel(btn.type)}
                      </Badge>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeButton(btn.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input
                      value={btn.text}
                      onChange={e => updateButton(btn.id, "text", e.target.value)}
                      placeholder="Texto do botão"
                      className="h-8 text-xs"
                    />
                    {btn.type === "url" && (
                      <Input
                        value={btn.value}
                        onChange={e => updateButton(btn.id, "value", e.target.value)}
                        placeholder="https://exemplo.com"
                        className="h-8 text-xs font-mono"
                      />
                    )}
                    {btn.type === "phone" && (
                      <Input
                        value={btn.value}
                        onChange={e => updateButton(btn.id, "value", e.target.value)}
                        placeholder="5511999999999"
                        className="h-8 text-xs font-mono"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createTemplate.isPending || updateTemplate.isPending} className="bg-primary hover:bg-primary/90">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-sm max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="px-4 pt-4 pb-0"><DialogTitle className="text-sm">Pré-visualização</DialogTitle></DialogHeader>
          
          {/* WhatsApp-style chat background */}
          <div className="bg-[#0b141a] px-4 py-6 min-h-[300px] flex flex-col justify-end gap-1.5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\' fill=\'%23ffffff08\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill=\'url(%23p)\' width=\'200\' height=\'200\'/%3E%3C/svg%3E")' }}>
            
            {previewTemplate && (() => {
              const files = parseMediaFiles(previewTemplate.media_url);
              const beforeFiles = files.filter((f: MediaFile) => f.sendMode === "before");
              const withFile = files.find((f: MediaFile) => f.sendMode === "with");
              const time = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

              return (
                <>
                  {/* Files sent BEFORE the message */}
                  {beforeFiles.map((file: MediaFile, i: number) => (
                    <div key={`before-${i}`} className="self-end max-w-[85%]">
                      <div className="bg-[#005c4b] rounded-lg overflow-hidden shadow-sm">
                        {file.type === "image" && <img src={file.url} alt={file.name} className="w-full max-h-48 object-cover" />}
                        {file.type === "video" && <video src={file.url} controls className="w-full max-h-48" />}
                        {file.type === "audio" && (
                          <div className="px-3 py-2 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center shrink-0">
                              <Mic className="w-4 h-4 text-white" />
                            </div>
                            <audio src={file.url} controls className="w-full h-7 [&::-webkit-media-controls-panel]:bg-transparent" />
                          </div>
                        )}
                        {file.type === "document" && (
                          <div className="px-3 py-2 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-md bg-[#00a884]/20 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-[#00a884]" />
                            </div>
                            <span className="text-[11px] text-[#e9edef] truncate">{file.name}</span>
                          </div>
                        )}
                        <div className="flex justify-end px-2 pb-1">
                          <span className="text-[10px] text-[#ffffff99]">{time} ✓✓</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Main message bubble (with optional "with" media) */}
                  <div className="self-end max-w-[85%]">
                    <div className="bg-[#005c4b] rounded-lg overflow-hidden shadow-sm">
                      {withFile && (
                        <>
                          {withFile.type === "image" && <img src={withFile.url} alt={withFile.name} className="w-full max-h-48 object-cover" />}
                          {withFile.type === "video" && <video src={withFile.url} controls className="w-full max-h-48" />}
                        </>
                      )}
                      <div className="px-2.5 py-1.5">
                        <p className="text-[13px] text-[#e9edef] whitespace-pre-wrap leading-snug">{previewTemplate.content}</p>
                        <div className="flex justify-end mt-0.5">
                          <span className="text-[10px] text-[#ffffff99]">{time} ✓✓</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  {previewTemplate.buttons && previewTemplate.buttons.length > 0 && (
                    <div className="self-end max-w-[85%] space-y-1">
                      {previewTemplate.buttons.map((btn: any, i: number) => (
                        <div key={i} className="bg-[#005c4b] rounded-lg px-3 py-2 flex items-center justify-center gap-1.5 shadow-sm">
                          {btn.type === "url" ? <Link className="w-3 h-3 text-[#00a884]" /> : btn.type === "phone" ? <Phone className="w-3 h-3 text-[#00a884]" /> : <MessageSquare className="w-3 h-3 text-[#00a884]" />}
                          <span className="text-[12px] text-[#00a884] font-medium">{btn.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
