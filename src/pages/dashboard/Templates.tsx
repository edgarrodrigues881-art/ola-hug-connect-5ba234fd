import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Link, Phone, MessageSquare, X } from "lucide-react";
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from "@/hooks/useTemplates";
import { useToast } from "@/hooks/use-toast";

interface TemplateButton {
  id: number;
  type: "reply" | "url" | "phone";
  text: string;
  value: string;
}

const Templates = () => {
  const { toast } = useToast();
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
  const [formButtons, setFormButtons] = useState<TemplateButton[]>([]);
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
    setFormButtons([]);
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormType(t.type);
    setFormContent(t.content);
    setFormMediaUrl(t.media_url || "");
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

  const handleSave = () => {
    if (!formName.trim() || !formContent.trim()) return;
    const payload = {
      name: formName,
      type: formType,
      content: formContent,
      media_url: formMediaUrl || undefined,
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
              <div className="space-y-1.5">
                <Label className="text-xs">URL da mídia</Label>
                <Input value={formMediaUrl} onChange={e => setFormMediaUrl(e.target.value)} placeholder="https://exemplo.com/imagem.jpg" className="h-9 text-sm font-mono" />
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Pré-visualização: {previewTemplate?.name}</DialogTitle></DialogHeader>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Tipo: {previewTemplate ? typeLabel(previewTemplate.type) : ""}</p>
            <div className="bg-background rounded-md p-3 text-sm whitespace-pre-wrap">{previewTemplate?.content}</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
