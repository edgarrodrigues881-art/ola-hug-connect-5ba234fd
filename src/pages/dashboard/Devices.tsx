import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, QrCode, Link2, Pencil, Power, Trash2, Smartphone, CheckCircle2, XCircle, Loader2, Shield, RefreshCw,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Device {
  id: string;
  name: string;
  number: string;
  status: "Ready" | "Disconnected" | "Loading";
  login_type: string;
  proxy_id: string | null;
}

const statusConfig = {
  Ready: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Ready", badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  Disconnected: { icon: XCircle, color: "text-blue-500", bg: "bg-blue-500/10", label: "Disconnected", badgeClass: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  Loading: { icon: Loader2, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Loading", badgeClass: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
};

const Devices = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [loginType, setLoginType] = useState<"qr" | "phone" | "code">("qr");
  const [instanceName, setInstanceName] = useState("");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");

  // Bulk create dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState("Instância");
  const [bulkSelectedProxies, setBulkSelectedProxies] = useState<string[]>([]);
  const [bulkNoProxyCount, setBulkNoProxyCount] = useState(0);

  // Selection for bulk delete
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);

  // Connect dialog
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectingDevice, setConnectingDevice] = useState<Device | null>(null);
  const [connectStep, setConnectStep] = useState<"choose" | "proxy" | "qr" | "code" | "connecting" | "done">("choose");

  // Fetch devices from database
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        number: d.number || "",
        status: d.status as "Ready" | "Disconnected" | "Loading",
        login_type: d.login_type,
        proxy_id: d.proxy_id,
      })) as Device[];
    },
    enabled: !!session,
  });

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
    status: p.status || "NOVA",
  }));
  const [selectedProxy, setSelectedProxy] = useState("");
  const [connectMethod, setConnectMethod] = useState<"qr" | "code">("qr");

  // Logout confirm dialog
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOutDevice, setLoggingOutDevice] = useState<Device | null>(null);

  // Edit proxy dialog
  const [editProxyOpen, setEditProxyOpen] = useState(false);
  const [editProxyDevice, setEditProxyDevice] = useState<Device | null>(null);
  const [editProxyValue, setEditProxyValue] = useState("");

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (device: { name: string; login_type: string }) => {
      const { error } = await supabase.from("devices").insert({
        name: device.name,
        login_type: device.login_type,
        user_id: session?.user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Instância criada" });
    },
    onError: () => toast({ title: "Erro ao criar instância", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Instância removida" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates, oldProxyId, newProxyId }: { id: string; updates: Record<string, any>; oldProxyId?: string | null; newProxyId?: string | null }) => {
      const { error } = await supabase.from("devices").update(updates as any).eq("id", id);
      if (error) throw error;
      
      // Update proxy statuses if proxy changed
      if (oldProxyId && oldProxyId !== newProxyId) {
        // Check if old proxy is still used by another device
        const { data: otherDevices } = await supabase.from("devices").select("id").eq("proxy_id", oldProxyId).neq("id", id);
        if (!otherDevices || otherDevices.length === 0) {
          await supabase.from("proxies").update({ status: "USADA" } as any).eq("id", oldProxyId);
        }
      }
      if (newProxyId && newProxyId !== oldProxyId) {
        await supabase.from("proxies").update({ status: "USANDO" } as any).eq("id", newProxyId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
    },
  });

  const handleCreate = () => {
    if (!instanceName.trim()) {
      toast({ title: "Informe o nome da instância", variant: "destructive" });
      return;
    }
    createMutation.mutate({ name: instanceName, login_type: loginType });
    setCreateOpen(false);
    setInstanceName("");
    setLoginType("qr");
  };

  const handleBulkCreate = async () => {
    if (!bulkPrefix.trim()) {
      toast({ title: "Informe o prefixo do nome", variant: "destructive" });
      return;
    }
    const totalCount = bulkSelectedProxies.length + bulkNoProxyCount;
    if (totalCount === 0) {
      toast({ title: "Defina ao menos uma instância", variant: "destructive" });
      return;
    }
    try {
      const inserts: any[] = [];
      let idx = 1;
      // Instances with proxies
      for (const proxyId of bulkSelectedProxies) {
        inserts.push({
          name: `${bulkPrefix} ${idx}`,
          login_type: "qr",
          user_id: session?.user.id,
          proxy_id: proxyId,
        });
        idx++;
      }
      // Instances without proxy
      for (let i = 0; i < bulkNoProxyCount; i++) {
        inserts.push({
          name: `${bulkPrefix} ${idx}`,
          login_type: "qr",
          user_id: session?.user.id,
          proxy_id: null,
        });
        idx++;
      }
      const { error } = await supabase.from("devices").insert(inserts);
      if (error) throw error;
      for (const proxyId of bulkSelectedProxies) {
        await supabase.from("proxies").update({ status: "USANDO" } as any).eq("id", proxyId);
      }
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
      toast({ title: `${totalCount} instância${totalCount !== 1 ? "s" : ""} criada${totalCount !== 1 ? "s" : ""}` });
      setBulkOpen(false);
    } catch {
      toast({ title: "Erro ao criar instâncias", variant: "destructive" });
    }
  };

  const toggleBulkProxy = (proxyId: string) => {
    setBulkSelectedProxies(prev =>
      prev.includes(proxyId) ? prev.filter(id => id !== proxyId) : [...prev, proxyId]
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      // Release proxies used by these devices
      const devicesToDelete = devices.filter(d => ids.includes(d.id) && d.proxy_id);
      for (const d of devicesToDelete) {
        const { data: otherDevices } = await supabase.from("devices").select("id").eq("proxy_id", d.proxy_id!).not("id", "in", `(${ids.join(",")})`);
        if (!otherDevices || otherDevices.length === 0) {
          await supabase.from("proxies").update({ status: "USADA" } as any).eq("id", d.proxy_id!);
        }
      }
      for (const id of ids) {
        const { error } = await supabase.from("devices").delete().eq("id", id);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
      setSelectedDevices([]);
      toast({ title: `${ids.length} instância${ids.length !== 1 ? "s" : ""} removida${ids.length !== 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Erro ao remover instâncias", variant: "destructive" });
    }
  };

  const toggleSelectDevice = (id: string) => {
    setSelectedDevices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Edit
  const openEdit = (device: Device) => {
    setEditingDevice(device);
    setEditName(device.name);
    setEditProxyValue(device.proxy_id || "none");
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editingDevice || !editName.trim()) return;
    const proxyId = editProxyValue === "none" ? null : editProxyValue;
    updateMutation.mutate({
      id: editingDevice.id,
      updates: { name: editName, proxy_id: proxyId },
      oldProxyId: editingDevice.proxy_id,
      newProxyId: proxyId,
    });
    toast({ title: "Instância atualizada" });
    setEditOpen(false);
    setEditingDevice(null);
  };

  // Edit proxy
  const openEditProxy = (device: Device) => {
    setEditProxyDevice(device);
    setEditProxyValue(device.proxy_id || "none");
    setEditProxyOpen(true);
  };

  const handleEditProxy = () => {
    if (!editProxyDevice) return;
    const proxyId = editProxyValue === "none" ? null : editProxyValue;
    updateMutation.mutate({
      id: editProxyDevice.id,
      updates: { proxy_id: proxyId },
    });
    toast({ title: "Proxy atualizado" });
    setEditProxyOpen(false);
    setEditProxyDevice(null);
  };

  // Logout
  const openLogout = (device: Device) => {
    setLoggingOutDevice(device);
    setLogoutOpen(true);
  };

  const handleLogout = () => {
    if (!loggingOutDevice) return;
    updateMutation.mutate({
      id: loggingOutDevice.id,
      updates: { status: "Disconnected", number: "" },
    });
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
    const currentIdx = availableProxies.findIndex(p => p.id === selectedProxy);
    const nextIdx = (currentIdx + 1) % availableProxies.length;
    setSelectedProxy(availableProxies[nextIdx]?.id || availableProxies[0]?.id || "");
    setConnectStep("proxy");
  };

  const handleConfirmProxy = () => {
    setConnectStep(connectMethod);

    setTimeout(() => {
      setConnectStep("connecting");
      setTimeout(() => {
        if (connectingDevice) {
          const proxyId = selectedProxy && selectedProxy !== "none" ? selectedProxy : null;
          updateMutation.mutate({
            id: connectingDevice.id,
            updates: {
              status: "Ready",
              login_type: connectMethod,
              number: `+55 ${Math.floor(10 + Math.random() * 89)} 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
              proxy_id: proxyId,
            },
            oldProxyId: connectingDevice.proxy_id,
            newProxyId: proxyId,
          });
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
        <div className="flex items-center gap-2 flex-wrap">
          {selectedDevices.length > 0 && (
            <>
              <Button size="sm" variant="destructive" className="gap-1.5 text-xs" onClick={() => setDeleteSelectedOpen(true)}>
                <Trash2 className="w-3.5 h-3.5" /> Apagar {selectedDevices.length} selecionada{selectedDevices.length !== 1 ? "s" : ""}
              </Button>
            </>
          )}
          {devices.length > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteAllOpen(true)}>
              <Trash2 className="w-3.5 h-3.5" /> Apagar todas
            </Button>
          )}
          <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90" onClick={() => { setBulkOpen(true); setBulkPrefix("Instância"); setBulkSelectedProxies([]); setBulkNoProxyCount(0); }}>
            Instâncias em massa
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Criar instância
          </Button>
        </div>
      </div>

      {devices.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedDevices.length === devices.length && devices.length > 0}
            onCheckedChange={(checked) => {
              setSelectedDevices(checked ? devices.map(d => d.id) : []);
            }}
          />
          <span className="text-xs text-muted-foreground">
            {selectedDevices.length === devices.length ? "Desmarcar todas" : "Selecionar todas"} ({selectedDevices.length}/{devices.length})
          </span>
        </div>
      )}

      {/* Device grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {devices.map((d) => {
          const sc = statusConfig[d.status] || statusConfig.Disconnected;
          const StatusIcon = sc.icon;
          const assignedProxy = d.proxy_id ? availableProxies.find(p => p.id === d.proxy_id) : null;
          return (
            <Card key={d.id} className={`glass-card ${selectedDevices.includes(d.id) ? "ring-2 ring-primary" : ""}`}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedDevices.includes(d.id)}
                      onCheckedChange={() => toggleSelectDevice(d.id)}
                      className="mt-0.5"
                    />
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
                      <p className="text-xs text-muted-foreground">{d.number || "Sem número"}</p>
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

                {/* Proxy info */}
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {assignedProxy ? assignedProxy.label : "Sem proxy"}
                  </span>
                </div>

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
              <Label className="text-xs">Proxy</Label>
              <Select value={editProxyValue} onValueChange={setEditProxyValue}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecionar proxy" />
                </SelectTrigger>
                <SelectContent>
                  {availableProxies.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-2">
                          <Shield className="w-3 h-3 text-primary" />
                          {p.label}
                        </div>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${p.status === "USANDO" ? "border-emerald-500/30 text-emerald-500" : p.status === "USADA" ? "border-orange-500/30 text-orange-500" : "border-blue-500/30 text-blue-500"}`}>
                          {p.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Sem proxy</span>
                  </SelectItem>
                </SelectContent>
              </Select>
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
                        <div className="flex items-center justify-between gap-4 w-full">
                          <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3 text-primary" />
                            {p.label}
                          </div>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${p.status === "USANDO" ? "border-emerald-500/30 text-emerald-500" : p.status === "USADA" ? "border-orange-500/30 text-orange-500" : "border-blue-500/30 text-blue-500"}`}>
                            {p.status}
                          </Badge>
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

      {/* Bulk create dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Instâncias em massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-foreground">Prefixo do nome</Label>
              <Input
                value={bulkPrefix}
                onChange={e => setBulkPrefix(e.target.value)}
                placeholder="Ex: Instância"
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Cada instância será nomeada como "{bulkPrefix} 1", "{bulkPrefix} 2", etc.</p>
            </div>
            <div>
              <Label className="text-foreground mb-2 block">Selecione as proxies ({bulkSelectedProxies.length} selecionadas)</Label>
              <div className="max-h-[240px] overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {availableProxies.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma proxy disponível</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                      onClick={() => {
                        if (bulkSelectedProxies.length === availableProxies.length) {
                          setBulkSelectedProxies([]);
                        } else {
                          setBulkSelectedProxies(availableProxies.map(p => p.id));
                        }
                      }}
                    >
                      <Checkbox checked={bulkSelectedProxies.length === availableProxies.length} />
                      <span className="text-xs font-medium text-foreground">Selecionar todas</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Input
                        type="number"
                        min={0}
                        max={availableProxies.length}
                        placeholder="Qtd"
                        className="h-7 w-20 text-xs"
                        onChange={e => {
                          const num = parseInt(e.target.value);
                          if (!isNaN(num) && num >= 0) {
                            setBulkSelectedProxies(availableProxies.slice(0, Math.min(num, availableProxies.length)).map(p => p.id));
                          } else if (e.target.value === "") {
                            setBulkSelectedProxies([]);
                          }
                        }}
                      />
                      <span className="text-[11px] text-muted-foreground">Selecionar as primeiras N proxies</span>
                    </div>
                    {availableProxies.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                        onClick={() => toggleBulkProxy(p.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={bulkSelectedProxies.includes(p.id)} />
                          <Shield className="w-3 h-3 text-primary" />
                          <span className="text-xs text-foreground">{p.label}</span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${p.status === "USANDO" ? "border-emerald-500/30 text-emerald-500" : p.status === "USADA" ? "border-orange-500/30 text-orange-500" : "border-blue-500/30 text-blue-500"}`}>
                          {p.status}
                        </Badge>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
            <div>
              <Label className="text-foreground mb-1 block">Sem proxy</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={bulkNoProxyCount}
                  onChange={e => setBulkNoProxyCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-8 w-20 text-xs"
                />
                <span className="text-[11px] text-muted-foreground">instância{bulkNoProxyCount !== 1 ? "s" : ""} sem proxy</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancelar</Button>
            <Button onClick={handleBulkCreate} disabled={bulkSelectedProxies.length + bulkNoProxyCount === 0} className="bg-primary hover:bg-primary/90">
              Criar {bulkSelectedProxies.length + bulkNoProxyCount} instância{(bulkSelectedProxies.length + bulkNoProxyCount) !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete selected confirmation */}
      <AlertDialog open={deleteSelectedOpen} onOpenChange={setDeleteSelectedOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Apagar instâncias selecionadas</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja apagar {selectedDevices.length} instância{selectedDevices.length !== 1 ? "s" : ""}? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleBulkDelete(selectedDevices)}>
              Apagar {selectedDevices.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all confirmation */}
      <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Apagar todas as instâncias</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja apagar todas as {devices.length} instâncias? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleBulkDelete(devices.map(d => d.id))}>
              Apagar todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Devices;
