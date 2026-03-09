import { useState, useRef, useEffect, useCallback, useMemo, type ReactElement, type CSSProperties } from "react";
import { List as VirtualList } from "react-window";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Download, Search, Plus, Trash2, Tag, Copy, Users, MoreVertical, X, Send, UserPlus, ChevronDown,
} from "lucide-react";
import { useContacts, useCreateContact, useCreateContacts, useUpdateContact, useDeleteContacts } from "@/hooks/useContacts";

const DEFAULT_TAGS = ["cliente", "lead", "vip", "novo"];

// Virtualized row for contacts list
function ContactRow({ index, style, filtered, selected, onToggleSelect, onRemoveTag, onDelete, toast, deleteContacts, ariaAttributes }: any): ReactElement | null {
  const contact = filtered[index];
  if (!contact) return null;
  return (
    <div style={style} className="flex items-center border-b border-border/50 hover:bg-muted/20 text-sm">
      <div className="p-3 w-10"><Checkbox checked={selected.has(contact.id)} onCheckedChange={() => onToggleSelect(contact.id)} /></div>
      <div className="p-3 flex-[2] font-medium text-foreground truncate">{contact.name}</div>
      <div className="p-3 flex-[2] text-muted-foreground font-mono text-xs">{contact.phone}</div>
      <div className="p-3 flex-[2] hidden md:flex gap-1 flex-wrap">
        {(contact.tags || []).length > 0 ? (contact.tags || []).slice(0, 3).map((tag: string) => (
          <Badge key={tag} variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 group" onClick={() => onRemoveTag(contact.id, tag)}>
            {tag}
            <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Badge>
        )) : <span className="text-[11px] text-muted-foreground">—</span>}
      </div>
      <div className="p-3 w-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent"><MoreVertical className="w-3.5 h-3.5" /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-xs gap-2 text-destructive focus:text-destructive" onClick={() => {
              onDelete([contact.id]);
            }}>
              <Trash2 className="w-3 h-3" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

const Contacts = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: contacts = [], isLoading } = useContacts();
  const createContact = useCreateContact();
  const createContacts = useCreateContacts();
  const updateContact = useUpdateContact();
  const deleteContacts = useDeleteContacts();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [addTagDialogOpen, setAddTagDialogOpen] = useState(false);
  const [removeTagDialogOpen, setRemoveTagDialogOpen] = useState(false);
  const [removeTagName, setRemoveTagName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [createTagInput, setCreateTagInput] = useState("");

  // Load tags from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("contactCustomTags");
    if (stored) {
      setCustomTags(JSON.parse(stored));
    } else {
      setCustomTags(DEFAULT_TAGS);
      localStorage.setItem("contactCustomTags", JSON.stringify(DEFAULT_TAGS));
    }
  }, []);

  const handleCreateTag = () => {
    const tag = createTagInput.trim().toLowerCase();
    if (!tag) return;
    if (customTags.includes(tag)) {
      toast({ title: "Tag já existe", variant: "destructive" });
      return;
    }
    const newList = [...customTags, tag];
    setCustomTags(newList);
    localStorage.setItem("contactCustomTags", JSON.stringify(newList));
    setCreateTagInput("");
    toast({ title: `Tag "${tag}" criada` });
  };

  const handleDeleteTag = (tag: string) => {
    const newList = customTags.filter(t => t !== tag);
    setCustomTags(newList);
    localStorage.setItem("contactCustomTags", JSON.stringify(newList));
    if (tagFilter === tag) setTagFilter("all");
    toast({ title: `Tag "${tag}" removida` });
  };

  const filtered = contacts.filter((c) => {
    const matchesSearch = (c.name || "").toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchesTag = tagFilter === "all" || (c.tags || []).includes(tagFilter);
    return matchesSearch && matchesTag;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const header = lines[0].toLowerCase();
      const cols = header.split(/[,;]/);
      const nameIdx = cols.findIndex((h) => h.trim().includes("nom"));
      const phoneIdx = cols.findIndex((h) => h.trim().includes("tel") || h.trim().includes("phone") || h.trim().includes("numero"));

      const newContacts: { name: string; phone: string }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/[,;]/);
        const name = row[nameIdx >= 0 ? nameIdx : 0]?.trim();
        const phone = row[phoneIdx >= 0 ? phoneIdx : 1]?.trim();
        if (phone) {
          newContacts.push({ name: name || "Sem nome", phone: phone.replace(/\D/g, "").replace(/^(\d{2})(\d+)/, "+$1$2") });
        }
      }
      createContacts.mutate(newContacts, {
        onSuccess: () => toast({ title: "Importação concluída", description: `${newContacts.length} contatos importados.` }),
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExport = () => {
    const rows = [["Nome", "Telefone", "Tags"]];
    const list = selected.size > 0 ? contacts.filter((c) => selected.has(c.id)) : filtered;
    list.forEach((c) => rows.push([c.name, c.phone, (c.tags || []).join("|")]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contatos.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exportação concluída", description: `${list.length} contatos exportados.` });
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selected);
    deleteContacts.mutate(ids, {
      onSuccess: () => {
        toast({ title: "Contatos removidos", description: `${ids.length} contatos excluídos.` });
        setSelected(new Set());
      },
    });
  };

  const addTagToSelected = () => {
    if (!newTagName.trim()) return;
    const tag = newTagName.trim().toLowerCase();
    const toUpdate = contacts.filter(c => selected.has(c.id) && !(c.tags || []).includes(tag));
    toUpdate.forEach(c => {
      updateContact.mutate({ id: c.id, tags: [...(c.tags || []), tag] });
    });
    toast({ title: "Tag adicionada", description: `Tag "${tag}" adicionada a ${selected.size} contatos.` });
    setNewTagName("");
    setAddTagDialogOpen(false);
  };

  const removeTagFromSelected = () => {
    if (!removeTagName) return;
    const toUpdate = contacts.filter(c => selected.has(c.id) && (c.tags || []).includes(removeTagName));
    toUpdate.forEach(c => {
      updateContact.mutate({ id: c.id, tags: (c.tags || []).filter(t => t !== removeTagName) });
    });
    toast({ title: "Tag removida", description: `Tag "${removeTagName}" removida de ${toUpdate.length} contatos.` });
    setRemoveTagName("");
    setRemoveTagDialogOpen(false);
  };

  const handleAddContact = () => {
    if (!newContact.phone.trim()) return;
    createContact.mutate({ name: newContact.name || "Sem nome", phone: newContact.phone }, {
      onSuccess: () => {
        setNewContact({ name: "", phone: "" });
        setAddContactOpen(false);
        toast({ title: "Contato adicionado" });
      },
    });
  };

  const removeTag = (contactId: string, tag: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      updateContact.mutate({ id: contactId, tags: (contact.tags || []).filter(t => t !== tag) });
    }
  };

  const stats = {
    total: contacts.length,
    active: contacts.length,
    blocked: 0,
    tagged: contacts.filter((c) => (c.tags || []).length > 0).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-sm text-muted-foreground">Importe, organize e filtre seus contatos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" /> Importar CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setAddContactOpen(true)}>
            <UserPlus className="w-3.5 h-3.5" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users },
          { label: "Com Tags", value: stats.tagged, icon: Tag },
        ].map((s) => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-40 justify-between h-9 text-xs">
                  {tagFilter === "all" ? "Todas as tags" : tagFilter}
                  <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2">
                <div className="space-y-1">
                  <button
                    onClick={() => { setTagFilter("all"); setTagPopoverOpen(false); }}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors ${tagFilter === "all" ? "bg-muted font-medium" : ""}`}
                  >
                    ✓ Todas as tags
                  </button>
                  {customTags.map(tag => (
                    <div key={tag} className="flex items-center gap-1 group">
                      <button
                        onClick={() => { setTagFilter(tag); setTagPopoverOpen(false); }}
                        className={`flex-1 text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors ${tagFilter === tag ? "bg-muted font-medium" : ""}`}
                      >
                        {tag}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag); }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex gap-1">
                      <Input
                        placeholder="Nova tag..."
                        value={createTagInput}
                        onChange={e => setCreateTagInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleCreateTag()}
                        className="h-7 text-xs"
                      />
                      <Button size="sm" onClick={handleCreateTag} className="h-7 px-2">
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
              <span className="text-xs text-muted-foreground">{selected.size} selecionado(s)</span>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAddTagDialogOpen(true)}>
                <Tag className="w-3 h-3" /> Adicionar Tag
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setRemoveTagDialogOpen(true)}>
                <X className="w-3 h-3" /> Remover Tag
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={handleDeleteSelected}>
                <Trash2 className="w-3 h-3" /> Excluir
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Table */}
      <Card className="glass-card overflow-hidden">
        {/* Header row */}
        <div className="flex items-center border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
          <div className="p-3 w-10"><Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></div>
          <div className="p-3 flex-[2]">Nome</div>
          <div className="p-3 flex-[2]">Telefone</div>
          <div className="p-3 flex-[2] hidden md:block">Tags</div>
          <div className="p-3 w-10"></div>
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">Nenhum contato encontrado</div>
        ) : (
          <div style={{ height: Math.min(filtered.length * 48, window.innerHeight - 360), contain: "layout style" }}>
            <VirtualList
              rowCount={filtered.length}
              rowHeight={48}
              overscanCount={10}
              style={{ height: "100%", width: "100%" }}
              rowProps={contactRowProps}
              rowComponent={ContactRow}
            />
          </div>
        )}
      </Card>

      {/* Add Contact Dialog */}
      <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar contato</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={newContact.name} onChange={(e) => setNewContact(p => ({ ...p, name: e.target.value }))} placeholder="Nome do contato" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone</Label>
              <Input value={newContact.phone} onChange={(e) => setNewContact(p => ({ ...p, phone: e.target.value }))} placeholder="+5511999999999" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddContactOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddContact} disabled={createContact.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={addTagDialogOpen} onOpenChange={setAddTagDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Adicionar tag</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs">Nome da tag</Label>
            <Input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Ex: cliente, vip" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTagDialogOpen(false)}>Cancelar</Button>
            <Button onClick={addTagToSelected}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Tag Dialog */}
      <Dialog open={removeTagDialogOpen} onOpenChange={setRemoveTagDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remover tag</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs">Selecione a tag para remover dos {selected.size} contatos selecionados</Label>
            <Select value={removeTagName} onValueChange={setRemoveTagName}>
              <SelectTrigger><SelectValue placeholder="Escolha uma tag" /></SelectTrigger>
              <SelectContent>
                {Array.from(new Set(
                  contacts.filter(c => selected.has(c.id)).flatMap(c => c.tags || [])
                )).map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTagDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={removeTagFromSelected} disabled={!removeTagName}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contacts;
