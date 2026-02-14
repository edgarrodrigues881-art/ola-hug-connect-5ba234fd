import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, QrCode, Link2, Pencil, Power, Trash2, Smartphone } from "lucide-react";

const devices = [
  { id: 1, name: "Chip 01 – Vendas", number: "+55 11 9****-1234", status: "Ready" },
  { id: 2, name: "Chip 02 – Suporte", number: "+55 11 9****-5678", status: "Ready" },
  { id: 3, name: "Chip 03 – Marketing", number: "+55 21 9****-9012", status: "Disconnected" },
  { id: 4, name: "Chip 04 – Financeiro", number: "+55 31 9****-3456", status: "Loading" },
];

const statusColor: Record<string, string> = {
  Ready: "bg-success/15 text-success border-success/30",
  Disconnected: "bg-destructive/15 text-destructive border-destructive/30",
  Loading: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
};

const Devices = () => (
  <div className="space-y-6 animate-fade-up">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dispositivos</h1>
        <p className="text-sm text-muted-foreground">Gerencie seus números conectados</p>
      </div>
      <Button className="gap-2">
        <Plus className="w-4 h-4" /> Nova Instância
      </Button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {devices.map((d) => (
        <Card key={d.id} className="glass-card card-glow">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.number}</p>
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] ${statusColor[d.status]}`}>
                {d.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                <QrCode className="w-3.5 h-3.5" /> QR Code
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                <Link2 className="w-3.5 h-3.5" /> Código
              </Button>
            </div>
            <div className="flex items-center gap-1.5 border-t border-border pt-3">
              <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Power className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default Devices;
