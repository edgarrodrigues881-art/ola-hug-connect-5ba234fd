import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Bot,
  Pencil,
  Trash2,
  Clock,
  MessageSquare,
  Zap,
  Hash,
} from "lucide-react";

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

const initialRules: Rule[] = [
  { id: "1", keyword: "preço", matchType: "contains", response: "Olá! Nossos planos começam a partir de R$97/mês. Posso te enviar mais detalhes?", delay: 3, enabled: true, device: "Todos", createdAt: "2026-02-10" },
  { id: "2", keyword: "horário", matchType: "contains", response: "Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.", delay: 5, enabled: true, device: "Chip 01", createdAt: "2026-02-11" },
  { id: "3", keyword: "oi", matchType: "exact", response: "Olá! Seja bem-vindo(a)! Como posso te ajudar hoje?", delay: 2, enabled: false, device: "Todos", createdAt: "2026-02-12" },
  { id: "4", keyword: "pix", matchType: "contains", response: "Segue nossa chave PIX para pagamento: financeiro@dgcontingencia.com. Após o pagamento, envie o comprovante aqui.", delay: 4, enabled: true, device: "Chip 02", createdAt: "2026-02-13" },
];

const matchLabels: Record<string, string> = {
  exact: "Exata",
  contains: "Contém",
  starts: "Começa com",
};

const emptyRule: { keyword: string; matchType: "exact" | "contains" | "starts"; response: string; delay: number; device: string } = { keyword: "", matchType: "contains", response: "", delay: 3, device: "Todos" };

const AutoReply = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyRule);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyRule);
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
      setRules((prev) => prev.map((r) => r.id === editingId ? { ...r, ...form } : r));
      toast({ title: "Regra atualizada" });
    } else {
      setRules((prev) => [
        { id: crypto.randomUUID(), ...form, enabled: true, createdAt: new Date().toISOString().split("T")[0] },
        ...prev,
      ]);
      toast({ title: "Regra criada" });
    }
    setDialogOpen(false);
  };

  const remove = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Regra removida" });
  };

  const toggle = (id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const activeCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resposta Automática</h1>
          <p className="text-sm text-muted-foreground">Crie regras de resposta por palavra-chave</p>
        </div>
        <Button className="gap-2" onClick={openNew}>
          <Plus className="w-4 h-4" /> Nova Regra
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total de Regras", value: rules.length, icon: Hash },
          { label: "Ativas", value: activeCount, icon: Zap },
          { label: "Inativas", value: rules.length - activeCount, icon: Clock },
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

      {/* Rules list */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id} className={`glass-card card-glow transition-opacity ${!rule.enabled ? "opacity-60" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">"{rule.keyword}"</span>
                      <Badge variant="outline" className="text-[10px]">{matchLabels[rule.matchType]}</Badge>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">{rule.device}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{rule.response}</p>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Delay: {rule.delay}s</span>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Criada em {rule.createdAt}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={rule.enabled} onCheckedChange={() => toggle(rule.id)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rule)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(rule.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rules.length === 0 && (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <Bot className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma regra criada ainda. Clique em "Nova Regra" para começar.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Regra" : "Nova Regra"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Palavra-chave</Label>
                <Input placeholder="Ex: preço, oi, pix" value={form.keyword} onChange={(e) => setForm((p) => ({ ...p, keyword: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tipo de correspondência</Label>
                <Select value={form.matchType} onValueChange={(v) => setForm((p) => ({ ...p, matchType: v as Rule["matchType"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exact">Exata</SelectItem>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="starts">Começa com</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Resposta automática</Label>
              <Textarea placeholder="Digite a resposta que será enviada automaticamente..." rows={4} value={form.response} onChange={(e) => setForm((p) => ({ ...p, response: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Delay (segundos)</Label>
                <Input type="number" min={0} max={60} value={form.delay} onChange={(e) => setForm((p) => ({ ...p, delay: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Dispositivo</Label>
                <Select value={form.device} onValueChange={(v) => setForm((p) => ({ ...p, device: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Button onClick={save}>{editingId ? "Salvar" : "Criar Regra"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutoReply;
