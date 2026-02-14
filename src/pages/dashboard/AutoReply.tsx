import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, BarChart3, MessageSquareText, ChevronLeft, ChevronRight } from "lucide-react";

interface Rule {
  id: string;
  keyword: string;
  matchType: "exact" | "contains" | "starts";
  response: string;
  delay: number;
  enabled: boolean;
  device: string;
  createdAt: string;
}

const matchLabels: Record<string, string> = {
  exact: "Exata",
  contains: "Contém",
  starts: "Começa com",
};

const emptyForm: { keyword: string; matchType: "exact" | "contains" | "starts"; response: string; delay: number; device: string } = { keyword: "", matchType: "contains", response: "", delay: 3, device: "Todos" };

const AutoReply = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setForm({ keyword: rule.keyword, matchType: rule.matchType, response: rule.response, delay: rule.delay, device: rule.device });
    setDialogOpen(true);
  };

  const save = () => {
    if (!form.keyword.trim() || !form.response.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (editingId) {
      setRules(prev => prev.map(r => r.id === editingId ? { ...r, ...form } : r));
      toast({ title: "Regra atualizada" });
    } else {
      setRules(prev => [
        ...prev,
        { id: crypto.randomUUID(), ...form, enabled: true, createdAt: new Date().toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
      ]);
      toast({ title: "Regra criada" });
    }
    setDialogOpen(false);
  };

  const remove = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    toast({ title: "Regra removida" });
  };

  const clearAll = () => {
    setRules([]);
    toast({ title: "Todas as regras removidas" });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resposta automática</h1>
          <p className="text-sm text-muted-foreground">Gerencie respostas automáticas por palavra-chave</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={clearAll}>
            <Trash2 className="w-3.5 h-3.5" /> Limpar tudo
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Mostrar relatório
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90" onClick={openNew}>
            <Plus className="w-3.5 h-3.5" /> Adicionar resposta automática
          </Button>
        </div>
      </div>

      {/* Empty state or table */}
      {rules.length === 0 ? (
        <div className="border border-border rounded-lg flex flex-col items-center justify-center py-20">
          <MessageSquareText className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhuma resposta automática encontrada</p>
          <Button onClick={openNew} className="bg-primary hover:bg-primary/90 gap-1.5">
            <Plus className="w-4 h-4" /> Adicionar resposta automática
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs w-12">SN</TableHead>
                <TableHead className="text-xs">Palavra-chave</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Resposta</TableHead>
                <TableHead className="text-xs">Delay</TableHead>
                <TableHead className="text-xs">Dispositivo</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Criado em</TableHead>
                <TableHead className="text-xs">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule, idx) => (
                <TableRow key={rule.id}>
                  <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="text-sm font-medium">"{rule.keyword}"</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{matchLabels[rule.matchType]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{rule.response}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{rule.delay}s</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{rule.device}</TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{rule.createdAt}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => openEdit(rule)}>
                        <Pencil className="w-3 h-3" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => remove(rule.id)}
                      >
                        <Trash2 className="w-3 h-3" /> Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-border text-xs text-muted-foreground">
            <span>1-{rules.length} of {rules.length} items</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="w-7 h-7 flex items-center justify-center rounded border border-primary text-primary text-xs font-medium">1</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Regra" : "Adicionar resposta automática"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Palavra-chave</Label>
                <Input placeholder="Ex: preço, oi, pix" value={form.keyword} onChange={e => setForm(p => ({ ...p, keyword: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de correspondência</Label>
                <Select value={form.matchType} onValueChange={v => setForm(p => ({ ...p, matchType: v as Rule["matchType"] }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exact">Exata</SelectItem>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="starts">Começa com</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Resposta automática</Label>
              <Textarea placeholder="Digite a resposta..." rows={4} value={form.response} onChange={e => setForm(p => ({ ...p, response: e.target.value }))} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Delay (segundos)</Label>
                <Input type="number" min={0} max={60} value={form.delay} onChange={e => setForm(p => ({ ...p, delay: Number(e.target.value) }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dispositivo</Label>
                <Select value={form.device} onValueChange={v => setForm(p => ({ ...p, device: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Chip 01">Chip 01</SelectItem>
                    <SelectItem value="Chip 02">Chip 02</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-primary hover:bg-primary/90">{editingId ? "Salvar" : "Criar Regra"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutoReply;
