import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Download,
  Search,
  Plus,
  Trash2,
  Tag,
  Filter,
  Copy,
  Users,
  MoreVertical,
  X,
  Send,
  UserPlus,
} from "lucide-react";

interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  lastSent: string | null;
  status: "active" | "blocked";
  createdAt: string;
}

const initialContacts: Contact[] = [
  { id: "1", name: "João Silva", phone: "+5511999991234", tags: ["cliente", "vip"], lastSent: "2026-02-13", status: "active", createdAt: "2026-01-10" },
  { id: "2", name: "Maria Santos", phone: "+5511988882345", tags: ["lead"], lastSent: "2026-02-12", status: "active", createdAt: "2026-01-12" },
  { id: "3", name: "Carlos Oliveira", phone: "+5521977773456", tags: ["cliente"], lastSent: null, status: "active", createdAt: "2026-01-15" },
  { id: "4", name: "Ana Costa", phone: "+5531966664567", tags: ["lead", "novo"], lastSent: "2026-02-10", status: "active", createdAt: "2026-01-20" },
  { id: "5", name: "Pedro Lima", phone: "+5541955555678", tags: ["cliente"], lastSent: "2026-02-14", status: "active", createdAt: "2026-01-22" },
  { id: "6", name: "Fernanda Rocha", phone: "+5511944446789", tags: ["vip"], lastSent: "2026-02-11", status: "blocked", createdAt: "2026-01-25" },
  { id: "7", name: "Lucas Mendes", phone: "+5521933337890", tags: ["lead"], lastSent: null, status: "active", createdAt: "2026-02-01" },
  { id: "8", name: "Juliana Ferreira", phone: "+5511922228901", tags: ["cliente", "novo"], lastSent: "2026-02-09", status: "active", createdAt: "2026-02-03" },
  { id: "9", name: "Roberto Alves", phone: "+5531911119012", tags: [], lastSent: null, status: "active", createdAt: "2026-02-05" },
  { id: "10", name: "Camila Souza", phone: "+5511999991234", tags: ["cliente"], lastSent: "2026-02-08", status: "active", createdAt: "2026-02-07" },
];

const allTags = ["cliente", "lead", "vip", "novo"];

const Contacts = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addTagDialogOpen, setAddTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });

  // Filtering
  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);
    const matchesTag = tagFilter === "all" || c.tags.includes(tagFilter);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesTag && matchesStatus;
  });

  // Selection
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  // Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const header = lines[0].toLowerCase();
      const nameIdx = header.split(/[,;]/).findIndex((h) => h.trim().includes("nom"));
      const phoneIdx = header.split(/[,;]/).findIndex((h) => h.trim().includes("tel") || h.trim().includes("phone") || h.trim().includes("numero"));

      let imported = 0;
      const newContacts: Contact[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[,;]/);
        const name = cols[nameIdx >= 0 ? nameIdx : 0]?.trim();
        const phone = cols[phoneIdx >= 0 ? phoneIdx : 1]?.trim();
        if (phone) {
          newContacts.push({
            id: crypto.randomUUID(),
            name: name || "Sem nome",
            phone: phone.replace(/\D/g, "").replace(/^(\d{2})(\d+)/, "+$1$2"),
            tags: [],
            lastSent: null,
            status: "active",
            createdAt: new Date().toISOString().split("T")[0],
          });
          imported++;
        }
      }
      setContacts((prev) => [...prev, ...newContacts]);
      toast({ title: "Importação concluída", description: `${imported} contatos importados com sucesso.` });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Export CSV
  const handleExport = () => {
    const rows = [["Nome", "Telefone", "Tags", "Status", "Último Envio"]];
    const list = selected.size > 0 ? contacts.filter((c) => selected.has(c.id)) : filtered;
    list.forEach((c) => rows.push([c.name, c.phone, c.tags.join("|"), c.status, c.lastSent || ""]));
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

  // Remove duplicates
  const removeDuplicates = () => {
    const seen = new Map<string, Contact>();
    contacts.forEach((c) => {
      const normalized = c.phone.replace(/\D/g, "");
      if (!seen.has(normalized)) seen.set(normalized, c);
    });
    const unique = Array.from(seen.values());
    const removed = contacts.length - unique.length;
    setContacts(unique);
    setSelected(new Set());
    toast({ title: "Duplicados removidos", description: `${removed} contatos duplicados foram removidos.` });
  };

  // Delete selected
  const deleteSelected = () => {
    setContacts((prev) => prev.filter((c) => !selected.has(c.id)));
    toast({ title: "Contatos removidos", description: `${selected.size} contatos excluídos.` });
    setSelected(new Set());
  };

  // Add tag to selected
  const addTagToSelected = () => {
    if (!newTagName.trim()) return;
    const tag = newTagName.trim().toLowerCase();
    setContacts((prev) =>
      prev.map((c) =>
        selected.has(c.id) && !c.tags.includes(tag)
          ? { ...c, tags: [...c.tags, tag] }
          : c
      )
    );
    toast({ title: "Tag adicionada", description: `Tag "${tag}" adicionada a ${selected.size} contatos.` });
    setNewTagName("");
    setAddTagDialogOpen(false);
  };

  // Add contact
  const handleAddContact = () => {
    if (!newContact.phone.trim()) return;
    setContacts((prev) => [
      {
        id: crypto.randomUUID(),
        name: newContact.name || "Sem nome",
        phone: newContact.phone,
        tags: [],
        lastSent: null,
        status: "active",
        createdAt: new Date().toISOString().split("T")[0],
      },
      ...prev,
    ]);
    setNewContact({ name: "", phone: "" });
    setAddContactOpen(false);
    toast({ title: "Contato adicionado" });
  };

  // Remove tag
  const removeTag = (contactId: string, tag: string) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId ? { ...c, tags: c.tags.filter((t) => t !== tag) } : c
      )
    );
  };

  const stats = {
    total: contacts.length,
    active: contacts.filter((c) => c.status === "active").length,
    blocked: contacts.filter((c) => c.status === "blocked").length,
    tagged: contacts.filter((c) => c.tags.length > 0).length,
  };

  return (
    <div className="space-y-6 animate-fade-up">
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

      {/* Filters & Actions */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tags</SelectItem>
                {allTags.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border flex-wrap">
              <span className="text-xs text-muted-foreground">{selected.size} selecionado(s)</span>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setAddTagDialogOpen(true)}>
                <Tag className="w-3 h-3" /> Adicionar Tag
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={removeDuplicates}>
                <Copy className="w-3 h-3" /> Remover Duplicados
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" onClick={deleteSelected}>
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
                <th className="p-3 text-left w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground text-xs">Nome</th>
                <th className="p-3 text-left font-medium text-muted-foreground text-xs">Telefone</th>
                <th className="p-3 text-left font-medium text-muted-foreground text-xs hidden md:table-cell">Tags</th>
                <th className="p-3 text-left font-medium text-muted-foreground text-xs hidden lg:table-cell">Último Envio</th>
                <th className="p-3 text-left font-medium text-muted-foreground text-xs">Status</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="p-3">
                    <Checkbox
                      checked={selected.has(contact.id)}
                      onCheckedChange={() => toggleSelect(contact.id)}
                    />
                  </td>
                  <td className="p-3 font-medium text-foreground">{contact.name}</td>
                  <td className="p-3 text-muted-foreground font-mono text-xs">{contact.phone}</td>
                  <td className="p-3 hidden md:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {contact.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/10 group"
                          onClick={() => removeTag(contact.id, tag)}
                        >
                          {tag}
                          <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Badge>
                      ))}
                      {contact.tags.length === 0 && (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {contact.lastSent || "Nunca"}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        contact.status === "active"
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-destructive/15 text-destructive border-destructive/30"
                      }`}
                    >
                      {contact.status === "active" ? "Ativo" : "Bloqueado"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-xs gap-2">
                          <Send className="w-3 h-3" /> Histórico de envio
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2">
                          <Tag className="w-3 h-3" /> Editar tags
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs gap-2 text-destructive focus:text-destructive"
                          onClick={() => {
                            setContacts((prev) => prev.filter((c) => c.id !== contact.id));
                            toast({ title: "Contato removido" });
                          }}
                        >
                          <Trash2 className="w-3 h-3" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground text-sm">
                    Nenhum contato encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          {filtered.length} contato(s) exibido(s) de {contacts.length} total
        </div>
      </Card>

      {/* Add Tag Dialog */}
      <Dialog open={addTagDialogOpen} onOpenChange={setAddTagDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs">Nome da tag</Label>
            <Input
              placeholder="Ex: vip, lead, cliente"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTagToSelected()}
            />
            <div className="flex gap-1.5 flex-wrap">
              {allTags.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="cursor-pointer text-xs hover:bg-primary/10"
                  onClick={() => setNewTagName(t)}
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTagDialogOpen(false)}>Cancelar</Button>
            <Button onClick={addTagToSelected}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                placeholder="Nome do contato"
                value={newContact.name}
                onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input
                placeholder="+5511999999999"
                value={newContact.phone}
                onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAddContact()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddContactOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddContact}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contacts;
