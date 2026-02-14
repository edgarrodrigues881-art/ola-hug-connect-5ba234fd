import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, QrCode, Link2, Pencil, Power, Trash2, Smartphone, CheckCircle2, XCircle, Loader2, Phone,
} from "lucide-react";

interface Device {
  id: string;
  name: string;
  number: string;
  status: "Ready" | "Disconnected" | "Loading";
  avatar?: string;
  loginType: "qr" | "phone" | "code";
}

const initialDevices: Device[] = [
  { id: "1", name: "instancehkhl6 xyz", number: "+55 11 9****-1234", status: "Ready", loginType: "qr" },
  { id: "2", name: "instancehkhl6 xyz", number: "+55 11 9****-5678", status: "Ready", loginType: "qr" },
  { id: "3", name: "instancehkhl6 xyz", number: "+55 21 9****-9012", status: "Ready", loginType: "phone" },
  { id: "4", name: "instancehbb3h xyz", number: "", status: "Disconnected", loginType: "qr" },
  { id: "5", name: "instancehbb3h xyz", number: "", status: "Disconnected", loginType: "code" },
  { id: "6", name: "instancehbb3h xyz", number: "+55 31 9****-3456", status: "Ready", loginType: "qr" },
];

const statusConfig = {
  Ready: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Ready", badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  Disconnected: { icon: XCircle, color: "text-blue-500", bg: "bg-blue-500/10", label: "Disconnected", badgeClass: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  Loading: { icon: Loader2, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Loading", badgeClass: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
};

const Devices = () => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [createOpen, setCreateOpen] = useState(false);
  const [loginType, setLoginType] = useState<"qr" | "phone" | "code">("qr");
  const [instanceName, setInstanceName] = useState("");

  const handleCreate = () => {
    if (!instanceName.trim()) {
      toast({ title: "Informe o nome da instância", variant: "destructive" });
      return;
    }
    setDevices(prev => [...prev, {
      id: crypto.randomUUID(),
      name: instanceName,
      number: "",
      status: "Disconnected",
      loginType,
    }]);
    toast({ title: "Instância criada" });
    setCreateOpen(false);
    setInstanceName("");
    setLoginType("qr");
  };

  const handleDelete = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
    toast({ title: "Instância removida" });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dispositivos ({devices.length})</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus números conectados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90">
            Instâncias em massa de porta
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Criar instância
          </Button>
        </div>
      </div>

      {/* Device grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {devices.map((d) => {
          const sc = statusConfig[d.status];
          const StatusIcon = sc.icon;
          return (
            <Card key={d.id} className="glass-card">
              <CardContent className="p-5 space-y-4">
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 relative">
                      <Smartphone className="w-5 h-5 text-muted-foreground" />
                      {d.status === "Ready" && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
                      )}
                      {d.status === "Disconnected" && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-background" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.name}</p>
                      {d.number && <p className="text-xs text-muted-foreground">{d.number}</p>}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-4 h-4 ${sc.color}`} />
                  <span className="text-sm font-medium text-foreground">{sc.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">Status: conectado</p>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Power className="w-3 h-3" /> Sair
                  </Button>
                  {d.status === "Disconnected" ? (
                    <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90">
                      <Link2 className="w-3 h-3" /> Conectar via código
                    </Button>
                  ) : (
                    <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle2 className="w-3 h-3" /> Pronto
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Instance Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar instância</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-xs text-destructive">*Selecione o tipo de login</Label>
              <div className="flex gap-2">
                {([
                  { value: "qr" as const, label: "Login por QR Code" },
                  { value: "phone" as const, label: "Login por telefone" },
                  { value: "code" as const, label: "Código de emparelhamento" },
                ]).map(opt => (
                  <Button
                    key={opt.value}
                    variant={loginType === opt.value ? "default" : "outline"}
                    size="sm"
                    className={`text-xs ${loginType === opt.value ? "bg-primary hover:bg-primary/90" : ""}`}
                    onClick={() => setLoginType(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-destructive">*Nome da instância</Label>
              <Input
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
                placeholder="Nome"
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Devices;
