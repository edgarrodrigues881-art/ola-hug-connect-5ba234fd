import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Pencil, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";

interface Template {
  id: number;
  nome: string;
  tipo: string;
  mensagem: string;
  criadoEm: string;
}

const initialTemplates: Template[] = [
  { id: 1, nome: "1K", tipo: "Texto", mensagem: "contato para tentar entregar o produto...", criadoEm: "14 Feb 2026 12:03 PM" },
  { id: 2, nome: "Boas-vindas", tipo: "Texto", mensagem: "Olá! Seja bem-vindo ao nosso canal...", criadoEm: "13 Feb 2026 09:15 AM" },
  { id: 3, nome: "Promoção", tipo: "Texto com mídia", mensagem: "Aproveite nossa promoção especial...", criadoEm: "12 Feb 2026 03:30 PM" },
];

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formTipo, setFormTipo] = useState("Texto");
  const [formMensagem, setFormMensagem] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const filtered = templates.filter(t => {
    const matchSearch = t.nome.toLowerCase().includes(search.toLowerCase()) || t.mensagem.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || t.tipo === filterType;
    return matchSearch && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const openCreate = () => {
    setEditingTemplate(null);
    setFormNome("");
    setFormTipo("Texto");
    setFormMensagem("");
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setFormNome(t.nome);
    setFormTipo(t.tipo);
    setFormMensagem(t.mensagem);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formNome.trim() || !formMensagem.trim()) return;
    if (editingTemplate) {
      setTemplates(templates.map(t => t.id === editingTemplate.id ? { ...t, nome: formNome, tipo: formTipo, mensagem: formMensagem } : t));
    } else {
      setTemplates([...templates, {
        id: Date.now(),
        nome: formNome,
        tipo: formTipo,
        mensagem: formMensagem,
        criadoEm: new Date().toLocaleString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }),
      }]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modelos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus templates de mensagem</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Adicionar modelo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Procurar"
            className="pl-8 h-9 text-sm w-48"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-48 text-sm">
            <SelectValue placeholder="Tipo de mensagem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Texto">Texto</SelectItem>
            <SelectItem value="Texto com mídia">Texto com mídia</SelectItem>
            <SelectItem value="Botões">Botões</SelectItem>
            <SelectItem value="Lista">Lista</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs w-12">SN</TableHead>
              <TableHead className="text-xs">Nome</TableHead>
              <TableHead className="text-xs">Tipo de mensagem</TableHead>
              <TableHead className="text-xs">Mensagem</TableHead>
              <TableHead className="text-xs">Pré-visualização</TableHead>
              <TableHead className="text-xs">Criado em</TableHead>
              <TableHead className="text-xs">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum modelo encontrado
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((t, idx) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs text-muted-foreground">{(currentPage - 1) * perPage + idx + 1}</TableCell>
                  <TableCell className="text-sm font-medium">{t.nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.tipo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{t.mensagem}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1"
                      onClick={() => { setPreviewTemplate(t); setPreviewOpen(true); }}
                    >
                      Pré-visualização
                    </Button>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.criadoEm}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => openEdit(t)}>
                        <Pencil className="w-3 h-3" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span>{(currentPage - 1) * perPage + 1}-{Math.min(currentPage * perPage, filtered.length)} of {filtered.length} items</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="w-7 h-7 flex items-center justify-center rounded border border-primary text-primary text-xs font-medium">{currentPage}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar modelo" : "Adicionar modelo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Nome do modelo" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de mensagem</Label>
              <Select value={formTipo} onValueChange={setFormTipo}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Texto">Texto</SelectItem>
                  <SelectItem value="Texto com mídia">Texto com mídia</SelectItem>
                  <SelectItem value="Botões">Botões</SelectItem>
                  <SelectItem value="Lista">Lista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mensagem</Label>
              <Textarea value={formMensagem} onChange={e => setFormMensagem(e.target.value)} placeholder="Conteúdo da mensagem" rows={4} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pré-visualização: {previewTemplate?.nome}</DialogTitle>
          </DialogHeader>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Tipo: {previewTemplate?.tipo}</p>
            <div className="bg-background rounded-md p-3 text-sm whitespace-pre-wrap">{previewTemplate?.mensagem}</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
