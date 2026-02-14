import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Upload, Play, Pause, RotateCcw, Clock, Send } from "lucide-react";

const campaigns = [
  { id: 1, name: "Promoção Janeiro", status: "Rodando", sent: 823, total: 1500, device: "Chip 01" },
  { id: 2, name: "Follow-up Leads", status: "Pausada", sent: 210, total: 450, device: "Chip 02" },
  { id: 3, name: "Black Friday", status: "Finalizada", sent: 3200, total: 3200, device: "Chip 01" },
];

const statusColor: Record<string, string> = {
  Rodando: "bg-success/15 text-success border-success/30",
  Pausada: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  Finalizada: "bg-muted text-muted-foreground border-border",
};

const Campaigns = () => (
  <div className="space-y-6 animate-fade-up">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Enviar Mensagem</h1>
        <p className="text-sm text-muted-foreground">Crie e gerencie suas campanhas de disparo</p>
      </div>
      <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Campanha</Button>
    </div>

    {/* New campaign form */}
    <Card className="glass-card">
      <CardHeader><CardTitle className="text-sm">Nova Campanha</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Nome da Campanha</Label>
            <Input placeholder="Ex: Promoção de Verão" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Dispositivo</Label>
            <Select>
              <SelectTrigger><SelectValue placeholder="Selecionar dispositivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="chip1">Chip 01 – Vendas</SelectItem>
                <SelectItem value="chip2">Chip 02 – Suporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Mensagem (use {"{{nome}}"} para variáveis)</Label>
          <Textarea placeholder="Olá {{nome}}, temos uma oferta especial para você!" rows={4} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Delay (segundos)</Label>
            <div className="flex gap-2">
              <Input type="number" placeholder="Min" className="w-full" defaultValue={5} />
              <Input type="number" placeholder="Max" className="w-full" defaultValue={15} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Limite por Hora</Label>
            <Input type="number" placeholder="100" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Lista de Contatos</Label>
            <Button variant="outline" className="w-full gap-2 text-xs">
              <Upload className="w-3.5 h-3.5" /> Importar CSV
            </Button>
          </div>
        </div>
        <Button className="gap-2"><Play className="w-4 h-4" /> Iniciar Campanha</Button>
      </CardContent>
    </Card>

    {/* Campaigns list */}
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Campanhas Ativas</h2>
      {campaigns.map((c) => (
        <Card key={c.id} className="glass-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Send className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.device} · {c.sent}/{c.total} enviadas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] ${statusColor[c.status]}`}>{c.status}</Badge>
              {c.status === "Rodando" && (
                <Button variant="ghost" size="icon" className="h-8 w-8"><Pause className="w-4 h-4" /></Button>
              )}
              {c.status === "Pausada" && (
                <Button variant="ghost" size="icon" className="h-8 w-8"><Play className="w-4 h-4" /></Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default Campaigns;
