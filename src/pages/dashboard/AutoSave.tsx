import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import {
  useAutosaveContacts, type WarmupAutosaveContact,
} from "@/hooks/useWarmupV2";
import { useAutosaveMutations } from "@/hooks/useAutosaveMutations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus, Upload, Search, Zap, Trash2, Edit2, Power, PowerOff,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Users,
} from "lucide-react";

// ── E.164 parser ──
function parseToE164(raw: string): { valid: boolean; phone: string; original: string } {
  const original = raw.trim();
  const digits = original.replace(/\D/g, "");
  if (!digits || digits.length < 10 || digits.length > 15) {
    return { valid: false, phone: "", original };
  }
  // If already starts with country code
  if (digits.startsWith("55") && digits.length >= 12) {
    return { valid: true, phone: `+${digits}`, original };
  }
  // Brazilian number without country code
  if (digits.length === 10 || digits.length === 11) {
    return { valid: true, phone: `+55${digits}`, original };
  }
  // Other international
  return { valid: true, phone: `+${digits}`, original };
}

const AutoSave = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: contacts = [], isLoading } = useAutosaveContacts();
  const { createContact, updateContact, deleteContact, bulkCreate } = useAutosaveMutations();

  // Filters
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addTags, setAddTags] = useState("");

  // Edit modal
  const [editContact, setEditContact] = useState<WarmupAutosaveContact | null>(null);
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<{
    valid: { phone: string; original: string }[];
    invalid: string[];
    duplicates: string[];
  } | null>(null);
  const [importing, setImporting] = useState(false);

  // All unique tags
  const allTags = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach(c => {
      if (c.tags) c.tags.split(",").map(t => t.trim()).filter(Boolean).forEach(t => s.add(t));
    });
    return Array.from(s).sort();
  }, [contacts]);

  // Filtered contacts
  const filtered = useMemo(() => {
    return contacts.filter(c => {
      if (statusFilter === "active" && !c.is_active) return false;
      if (statusFilter === "inactive" && c.is_active) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.contact_name.toLowerCase().includes(q) && !c.phone_e164.includes(q)) return false;
      }
      if (tagFilter && (!c.tags || !c.tags.toLowerCase().includes(tagFilter.toLowerCase()))) return false;
      return true;
    });
  }, [contacts, search, tagFilter, statusFilter]);

  const activeCount = contacts.filter(c => c.is_active).length;

  // ── Handlers ──
  const handleAdd = () => {
    const parsed = parseToE164(addPhone);
    if (!parsed.valid) {
      toast({ title: "Número inválido", description: "Insira um número válido (ex: 62994192500)", variant: "destructive" });
      return;
    }
    createContact.mutate(
      { contact_name: addName || "Sem nome", phone_e164: parsed.phone, tags: addTags },
      {
        onSuccess: () => {
          toast({ title: "Contato adicionado" });
          setAddOpen(false);
          setAddName("");
          setAddPhone("");
          setAddTags("");
        },
        onError: (err: any) => {
          const msg = err.message?.includes("duplicate") ? "Número já cadastrado" : err.message;
          toast({ title: "Erro", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const handleEdit = () => {
    if (!editContact) return;
    updateContact.mutate(
      { id: editContact.id, contact_name: editName, tags: editTags },
      {
        onSuccess: () => {
          toast({ title: "Contato atualizado" });
          setEditContact(null);
        },
      }
    );
  };

  const handleToggleActive = (c: WarmupAutosaveContact) => {
    updateContact.mutate(
      { id: c.id, is_active: !c.is_active },
      { onSuccess: () => toast({ title: c.is_active ? "Contato desativado" : "Contato ativado" }) }
    );
  };

  const handleDelete = (id: string) => {
    deleteContact.mutate(id, { onSuccess: () => toast({ title: "Contato excluído" }) });
  };

  // ── Import ──
  const handleValidateImport = () => {
    const lines = importText.split("\n").map(l => l.trim()).filter(Boolean);
    const existingPhones = new Set(contacts.map(c => c.phone_e164));
    const valid: { phone: string; original: string }[] = [];
    const invalid: string[] = [];
    const duplicates: string[] = [];
    const seenInBatch = new Set<string>();

    lines.forEach(line => {
      const parsed = parseToE164(line);
      if (!parsed.valid) {
        invalid.push(line);
      } else if (existingPhones.has(parsed.phone) || seenInBatch.has(parsed.phone)) {
        duplicates.push(line);
      } else {
        valid.push(parsed);
        seenInBatch.add(parsed.phone);
      }
    });

    setImportPreview({ valid, invalid, duplicates });
  };

  const handleImport = async () => {
    if (!importPreview || importPreview.valid.length === 0) return;
    setImporting(true);
    try {
      await bulkCreate.mutateAsync(
        importPreview.valid.map(v => ({ contact_name: "", phone_e164: v.phone, tags: "importado" }))
      );
      toast({
        title: "Importação concluída",
        description: `${importPreview.valid.length} contatos importados`,
      });
      setImportOpen(false);
      setImportText("");
      setImportPreview(null);
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Auto Save
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie os contatos que serão usados na camada de interação Auto Save
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setImportOpen(true)}>
            <Upload className="w-3.5 h-3.5" /> Importar
          </Button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-foreground">{contacts.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-emerald-400">{activeCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Ativos</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold tabular-nums text-muted-foreground">{contacts.length - activeCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Inativos</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar nome ou número..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs h-6 px-2">Todos</TabsTrigger>
            <TabsTrigger value="active" className="text-xs h-6 px-2">Ativos</TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs h-6 px-2">Inativos</TabsTrigger>
          </TabsList>
        </Tabs>
        {allTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {tagFilter && (
              <Badge
                variant="outline"
                className="text-[10px] h-6 cursor-pointer hover:bg-destructive/10"
                onClick={() => setTagFilter("")}
              >
                ✕ {tagFilter}
              </Badge>
            )}
            {allTags.filter(t => t !== tagFilter).slice(0, 5).map(tag => (
              <Badge
                key={tag}
                variant="outline"
                className="text-[10px] h-6 cursor-pointer hover:bg-primary/10"
                onClick={() => setTagFilter(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {contacts.length === 0 ? "Nenhum contato cadastrado" : "Nenhum contato encontrado com esses filtros"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(c => (
            <Card key={c.id} className={cn(!c.is_active && "opacity-50")}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  c.is_active ? "bg-emerald-400" : "bg-muted-foreground/30"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {c.contact_name || "Sem nome"}
                    </p>
                    {c.tags && c.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                      <Badge key={tag} variant="outline" className="text-[9px] h-4">{tag}</Badge>
                    ))}
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground/60">{c.phone_e164}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => { setEditContact(c); setEditName(c.contact_name); setEditTags(c.tags || ""); }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => handleToggleActive(c)}
                  >
                    {c.is_active ? <PowerOff className="w-3 h-3 text-amber-400" /> : <Power className="w-3 h-3 text-emerald-400" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(c.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Add Modal ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Adicionar Contato</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Nome do contato" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Número (E.164)</Label>
              <Input value={addPhone} onChange={e => setAddPhone(e.target.value)} placeholder="62994192500" className="mt-1 font-mono" />
              <p className="text-[10px] text-muted-foreground mt-1">Exemplo: 62994192500 ou +5562994192500</p>
            </div>
            <div>
              <Label className="text-xs">Tags (separadas por vírgula)</Label>
              <Input value={addTags} onChange={e => setAddTags(e.target.value)} placeholder="cliente, vip" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAdd} disabled={!addPhone.trim() || createContact.isPending}>
              {createContact.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog open={!!editContact} onOpenChange={v => !v && setEditContact(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Contato</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Número</Label>
              <Input value={editContact?.phone_e164 || ""} disabled className="mt-1 font-mono opacity-50" />
            </div>
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tags</Label>
              <Input value={editTags} onChange={e => setEditTags(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditContact(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleEdit} disabled={updateContact.isPending}>
              {updateContact.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import Modal ── */}
      <Dialog open={importOpen} onOpenChange={v => { setImportOpen(v); if (!v) { setImportText(""); setImportPreview(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Contatos</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Cole os números (um por linha)</Label>
              <Textarea
                value={importText}
                onChange={e => { setImportText(e.target.value); setImportPreview(null); }}
                placeholder={"62994192500\n11987654321\n+5521999887766"}
                className="mt-1 font-mono text-xs min-h-[120px]"
              />
            </div>

            {!importPreview ? (
              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={handleValidateImport}
                disabled={!importText.trim()}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Validar
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Card><CardContent className="p-2 text-center">
                    <p className="text-lg font-bold text-emerald-400 tabular-nums">{importPreview.valid.length}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Válidos</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-2 text-center">
                    <p className="text-lg font-bold text-destructive tabular-nums">{importPreview.invalid.length}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Inválidos</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-2 text-center">
                    <p className="text-lg font-bold text-amber-400 tabular-nums">{importPreview.duplicates.length}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Duplicados</p>
                  </CardContent></Card>
                </div>

                {importPreview.invalid.length > 0 && (
                  <div className="bg-destructive/5 border border-destructive/10 rounded-md p-2">
                    <p className="text-[10px] text-destructive font-medium mb-1 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Inválidos:
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {importPreview.invalid.slice(0, 5).join(", ")}
                      {importPreview.invalid.length > 5 && ` +${importPreview.invalid.length - 5} mais`}
                    </p>
                  </div>
                )}

                {importPreview.duplicates.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-md p-2">
                    <p className="text-[10px] text-amber-400 font-medium mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Duplicados (serão ignorados):
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {importPreview.duplicates.slice(0, 5).join(", ")}
                      {importPreview.duplicates.length > 5 && ` +${importPreview.duplicates.length - 5} mais`}
                    </p>
                  </div>
                )}

                <Button
                  className="w-full gap-1.5"
                  onClick={handleImport}
                  disabled={importPreview.valid.length === 0 || importing}
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Importar {importPreview.valid.length} contato{importPreview.valid.length !== 1 ? "s" : ""}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutoSave;
