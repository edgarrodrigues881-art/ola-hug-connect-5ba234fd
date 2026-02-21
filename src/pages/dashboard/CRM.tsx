import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Pencil, Trash2, Users, DollarSign, TrendingUp, Clock,
} from "lucide-react";

interface Lead {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  empresa: string;
  etapa: string;
  valor: string;
  observacao: string;
  criadoEm: string;
}

const etapas = ["Novo Lead", "Contato Feito", "Proposta Enviada", "Negociação", "Fechado", "Perdido"];

const etapaColors: Record<string, string> = {
  "Novo Lead": "bg-blue-500/15 text-blue-600 border-blue-500/30",
  "Contato Feito": "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  "Proposta Enviada": "bg-purple-500/15 text-purple-600 border-purple-500/30",
  "Negociação": "bg-orange-500/15 text-orange-600 border-orange-500/30",
  "Fechado": "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  "Perdido": "bg-red-500/15 text-red-600 border-red-500/30",
};

const initialLeads: Lead[] = [
  { id: "1", nome: "João Silva", telefone: "+55 11 99999-1234", email: "joao@email.com", empresa: "Tech Corp", etapa: "Proposta Enviada", valor: "R$ 5.000", observacao: "Interessado no plano Pro", criadoEm: "14 Feb 2026" },
  { id: "2", nome: "Maria Santos", telefone: "+55 21 98888-5678", email: "maria@email.com", empresa: "Digital SA", etapa: "Novo Lead", valor: "R$ 2.500", observacao: "Veio pelo Instagram", criadoEm: "13 Feb 2026" },
  { id: "3", nome: "Carlos Oliveira", telefone: "+55 31 97777-9012", email: "carlos@email.com", empresa: "Vendas Plus", etapa: "Fechado", valor: "R$ 8.000", observacao: "Contrato assinado", criadoEm: "12 Feb 2026" },
];

const CRM = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [search, setSearch] = useState("");
  const [filterEtapa, setFilterEtapa] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", empresa: "", etapa: "Novo Lead", valor: "", observacao: "" });

  const filtered = leads.filter(l => {
    const matchSearch = l.nome.toLowerCase().includes(search.toLowerCase()) || l.telefone.includes(search) || l.empresa.toLowerCase().includes(search.toLowerCase());
    const matchEtapa = filterEtapa === "all" || l.etapa === filterEtapa;
    return matchSearch && matchEtapa;
  });

  const openCreate = () => { setEditingId(null); setForm({ nome: "", telefone: "", email: "", empresa: "", etapa: "Novo Lead", valor: "", observacao: "" }); setDialogOpen(true); };
  const openEdit = (l: Lead) => { setEditingId(l.id); setForm({ nome: l.nome, telefone: l.telefone, email: l.email, empresa: l.empresa, etapa: l.etapa, valor: l.valor, observacao: l.observacao }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.nome.trim() || !form.telefone.trim()) { toast({ title: "Preencha nome e telefone", variant: "destructive" }); return; }
    if (editingId) {
      setLeads(prev => prev.map(l => l.id === editingId ? { ...l, ...form } : l));
      toast({ title: "Lead atualizado" });
    } else {
      setLeads(prev => [...prev, { id: crypto.randomUUID(), ...form, criadoEm: new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) }]);
      toast({ title: "Lead adicionado" });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => { setLeads(prev => prev.filter(l => l.id !== id)); toast({ title: "Lead removido" }); };

  const stats = [
    { label: "Total Leads", value: leads.length, icon: Users, color: "text-primary" },
    { label: "Em Negociação", value: leads.filter(l => ["Contato Feito", "Proposta Enviada", "Negociação"].includes(l.etapa)).length, icon: TrendingUp, color: "text-yellow-500" },
    { label: "Fechados", value: leads.filter(l => l.etapa === "Fechado").length, icon: DollarSign, color: "text-emerald-500" },
    { label: "Novos Hoje", value: leads.filter(l => l.criadoEm.includes("14 Feb")).length, icon: Clock, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus leads e oportunidades</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> Novo Lead</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><s.icon className={`w-4 h-4 ${s.color}`} /></div>
              <div><p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar lead..." className="pl-8 h-9 text-sm w-48" />
        </div>
        <Select value={filterEtapa} onValueChange={setFilterEtapa}>
          <SelectTrigger className="h-9 w-48 text-sm"><SelectValue placeholder="Filtrar etapa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {etapas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs w-12">SN</TableHead>
              <TableHead className="text-xs">Nome</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Telefone</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Empresa</TableHead>
              <TableHead className="text-xs">Etapa</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Valor</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Criado em</TableHead>
              <TableHead className="text-xs">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Nenhum lead encontrado</TableCell></TableRow>
            ) : filtered.map((l, idx) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                <TableCell>
                  <div><p className="text-sm font-medium">{l.nome}</p><p className="text-xs text-muted-foreground">{l.email}</p></div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{l.telefone}</TableCell>
                <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{l.empresa}</TableCell>
                <TableCell><Badge variant="outline" className={`text-[10px] ${etapaColors[l.etapa] || ""}`}>{l.etapa}</Badge></TableCell>
                <TableCell className="text-xs font-medium hidden sm:table-cell">{l.valor}</TableCell>
                <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">{l.criadoEm}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => openEdit(l)}><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-destructive" onClick={() => handleDelete(l.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar Lead" : "Novo Lead"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Telefone *</Label><Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} placeholder="+55 11 99999-0000" className="h-9 text-sm" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" className="h-9 text-sm" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Empresa</Label><Input value={form.empresa} onChange={e => setForm(p => ({ ...p, empresa: e.target.value }))} placeholder="Nome da empresa" className="h-9 text-sm" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Etapa</Label><Select value={form.etapa} onValueChange={v => setForm(p => ({ ...p, etapa: v }))}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{etapas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Valor</Label><Input value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="R$ 0,00" className="h-9 text-sm" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Observação</Label><Textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} placeholder="Notas sobre o lead..." rows={3} className="text-sm" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRM;
