import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Download, Search, Plus, Trash2, Tag, Copy, Users, MoreVertical, X, Send, UserPlus,
} from "lucide-react";
import { useContacts, useCreateContact, useCreateContacts, useUpdateContact, useDeleteContacts } from "@/hooks/useContacts";

const allTags = ["cliente", "lead", "vip", "novo"];

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users },
          { label: "Ativos", value: stats.active, icon: Send },
          { label: "Bloqueados", value: stats.blocked, icon: Trash2 },
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
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tags</SelectItem>
                {allTags.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
              <span className="text-xs text-muted-foreground">{selected.size} selecionado(s)</span>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAddTagDialogOpen(true)}>
                <Tag className="w-3 h-3" /> Adicionar Tag
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-3 text-left w-10"><Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></th>
                <th className="p-3 text-left font-medium text-muted-foreground text-xs">Nome</th>
                <th className="p-3 text-left font-medium text-muted-foreground text-xs">Telefone</th>
                <th className="p-3 text-left font-medium text-muted-foreground text-xs hidden md:table-cell">Tags</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">Nenhum contato encontrado</td></tr>
              ) : (
                filtered.map((contact) => (
                  <tr key={contact.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="p-3"><Checkbox checked={selected.has(contact.id)} onCheckedChange={() => toggleSelect(contact.id)} /></td>
                    <td className="p-3 font-medium text-foreground">{contact.name}</td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{contact.phone}</td>
                    <td className="p-3 hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {(contact.tags || []).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 group" onClick={() => removeTag(contact.id, tag)}>
                            {tag}
                            <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Badge>
                        ))}
                        {(contact.tags || []).length === 0 && <span className="text-[11px] text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="w-3.5 h-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-xs gap-2 text-destructive focus:text-destructive" onClick={() => {
                            deleteContacts.mutate([contact.id], { onSuccess: () => toast({ title: "Contato removido" }) });
                          }}>
                            <Trash2 className="w-3 h-3" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
};

export default Contacts;
