import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, QrCode, Link2, Pencil, Power, Trash2, Smartphone, CheckCircle2, XCircle, Loader2, Shield, RefreshCw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Device {
  id: string;
  name: string;
  number: string;
  status: "Ready" | "Disconnected" | "Loading";
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

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [loginType, setLoginType] = useState<"qr" | "phone" | "code">("qr");
  const [instanceName, setInstanceName] = useState("");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");

  // Connect dialog
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectingDevice, setConnectingDevice] = useState<Device | null>(null);
  const [connectStep, setConnectStep] = useState<"choose" | "proxy" | "qr" | "code" | "connecting" | "done">("choose");

  // Fetch proxies from database
  const { data: dbProxies = [] } = useQuery({
    queryKey: ["proxies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proxies")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const availableProxies = dbProxies.map((p, i) => ({
    id: p.id,
    label: `#${i + 1} - ${p.host}:${p.port}`,
    host: p.host,
    port: p.port,
  }));
  const [selectedProxy, setSelectedProxy] = useState("");
  const [connectMethod, setConnectMethod] = useState<"qr" | "code">("qr");

  // Logout confirm dialog
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOutDevice, setLoggingOutDevice] = useState<Device | null>(null);

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

  // Edit
  const openEdit = (device: Device) => {
    setEditingDevice(device);
    setEditName(device.name);
    setEditNumber(device.number);
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editingDevice || !editName.trim()) return;
    setDevices(prev => prev.map(d =>
      d.id === editingDevice.id ? { ...d, name: editName, number: editNumber } : d
    ));
    toast({ title: "Instância atualizada" });
    setEditOpen(false);
    setEditingDevice(null);
  };

  // Logout
  const openLogout = (device: Device) => {
    setLoggingOutDevice(device);
    setLogoutOpen(true);
  };

  const handleLogout = () => {
    if (!loggingOutDevice) return;
    setDevices(prev => prev.map(d =>
      d.id === loggingOutDevice.id ? { ...d, status: "Disconnected" as const, number: "" } : d
    ));
    toast({ title: "Desconectado", description: `${loggingOutDevice.name} foi desconectado.` });
    setLogoutOpen(false);
    setLoggingOutDevice(null);
  };

  // Connect
  const openConnect = (device: Device) => {
    setConnectingDevice(device);
    setConnectStep("choose");
    setConnectOpen(true);
  };

  const handleConnect = (method: "qr" | "code") => {
    setConnectMethod(method);
    // Auto-rotate proxy: pick next available
    const currentIdx = availableProxies.findIndex(p => p.id === selectedProxy);
    const nextIdx = (currentIdx + 1) % availableProxies.length;
    setSelectedProxy(availableProxies[nextIdx]?.id || availableProxies[0]?.id || "");
    setConnectStep("proxy");
  };

  const handleConfirmProxy = () => {
    setConnectStep(connectMethod);

    // Simulate connection after delay
    setTimeout(() => {
      setConnectStep("connecting");
      setTimeout(() => {
        if (connectingDevice) {
          setDevices(prev => prev.map(d =>
            d.id === connectingDevice.id
              ? { ...d, status: "Ready" as const, loginType: connectMethod, number: `+55 ${Math.floor(10 + Math.random() * 89)} 9****-${Math.floor(1000 + Math.random() * 9000)}` }
              : d
          ));
        }
        setConnectStep("done");
        const proxyLabel = availableProxies.find(p => p.id === selectedProxy)?.label || "Sem proxy";
        toast({ title: "Conectado!", description: `Instância conectada via proxy ${proxyLabel}.` });
      }, 2000);
    }, 3000);
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
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-4 h-4 ${sc.color}`} />
                  <span className="text-sm font-medium text-foreground">{sc.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Status: {d.status === "Ready" ? "conectado" : d.status === "Loading" ? "carregando..." : "desconectado"}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => openEdit(d)}>
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                  {d.status === "Ready" && (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => openLogout(d)}>
                      <Power className="w-3 h-3" /> Sair
                    </Button>
                  )}
                  {d.status === "Disconnected" && (
                    <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90" onClick={() => openConnect(d)}>
                      <Link2 className="w-3 h-3" /> Conectar
                    </Button>
                  )}
                  {d.status === "Ready" && (
                    <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white pointer-events-none">
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
              <Input value={instanceName} onChange={e => setInstanceName(e.target.value)} placeholder="Nome" className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90">Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar instância</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs">Nome da instância</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome" className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Número</Label>
              <Input value={editNumber} onChange={e => setEditNumber(e.target.value)} placeholder="+55 11 99999-9999" className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} className="bg-primary hover:bg-primary/90">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout Confirm Dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Desconectar instância</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja desconectar <span className="font-medium text-foreground">{loggingOutDevice?.name}</span>? O número será desvinculado e você precisará reconectar.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleLogout}>Desconectar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connect Dialog */}
      <Dialog open={connectOpen} onOpenChange={(open) => { if (!open && connectStep !== "connecting") { setConnectOpen(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {connectStep === "choose" && "Conectar instância"}
              {connectStep === "proxy" && "Confirmar Proxy"}
              {connectStep === "qr" && "Escaneie o QR Code"}
              {connectStep === "code" && "Código de emparelhamento"}
              {connectStep === "connecting" && "Conectando..."}
              {connectStep === "done" && "Conectado!"}
            </DialogTitle>
          </DialogHeader>

          {connectStep === "choose" && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Escolha o método de conexão para <span className="font-medium text-foreground">{connectingDevice?.name}</span>:</p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleConnect("qr")}>
                  <QrCode className="w-6 h-6 text-primary" />
                  <span className="text-xs">QR Code</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleConnect("code")}>
                  <Link2 className="w-6 h-6 text-primary" />
                  <span className="text-xs">Código</span>
                </Button>
              </div>
            </div>
          )}

          {connectStep === "proxy" && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Shield className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Proxy atribuído automaticamente</p>
                  <p className="text-xs text-muted-foreground">Você pode confirmar, trocar ou remover antes de conectar.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Proxy selecionado</Label>
                <Select value={selectedProxy} onValueChange={setSelectedProxy}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecionar proxy" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProxies.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <Shield className="w-3 h-3 text-primary" />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Sem proxy</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedProxy && selectedProxy !== "none" && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
                  <p className="text-xs text-muted-foreground">Detalhes do proxy:</p>
                  <p className="text-sm font-medium text-foreground">
                    {availableProxies.find(p => p.id === selectedProxy)?.label}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    {connectMethod === "qr" ? "QR Code" : "Código"} + Proxy
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => setConnectStep("choose")}>
                  Voltar
                </Button>
                <Button className="flex-1 gap-1.5 text-xs bg-primary hover:bg-primary/90" onClick={handleConfirmProxy}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar e conectar
                </Button>
              </div>
            </div>
          )}

          {connectStep === "qr" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-48 h-48 bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-border">
                <QrCode className="w-24 h-24 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground text-center">Abra o WhatsApp no celular → Configurações → Aparelhos conectados → Conectar dispositivo</p>
            </div>
          )}

          {connectStep === "code" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-muted rounded-xl px-8 py-4 border border-border">
                <p className="text-2xl font-mono font-bold tracking-[0.3em] text-foreground">{Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">Insira este código no WhatsApp → Configurações → Aparelhos conectados → Conectar com número de telefone</p>
            </div>
          )}

          {connectStep === "connecting" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Aguardando conexão...</p>
            </div>
          )}

          {connectStep === "done" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-sm font-medium text-foreground">Instância conectada com sucesso!</p>
              <Button onClick={() => setConnectOpen(false)} className="bg-primary hover:bg-primary/90">Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Devices;
