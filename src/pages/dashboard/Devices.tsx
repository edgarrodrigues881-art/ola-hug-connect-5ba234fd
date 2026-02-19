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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, QrCode, Link2, Pencil, Power, Trash2, Smartphone, CheckCircle2, XCircle, Loader2, Shield, RefreshCw, Key, ChevronDown, Layers,
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
  whapi_token: string | null;
  profile_picture: string | null;
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
  const [instanceToken, setInstanceToken] = useState("");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editToken, setEditToken] = useState("");

  // Bulk create dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPrefix, setBulkPrefix] = useState("Instância");
  const [bulkSelectedProxies, setBulkSelectedProxies] = useState<string[]>([]);
  const [bulkNoProxyCount, setBulkNoProxyCount] = useState(0);

  // Selection for bulk delete
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const [deleteDisconnectedOpen, setDeleteDisconnectedOpen] = useState(false);
  const [deleteSingleOpen, setDeleteSingleOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [deleteSingleDevice, setDeleteSingleDevice] = useState<Device | null>(null);

  // Connect dialog
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectingDevice, setConnectingDevice] = useState<Device | null>(null);
  const [connectStep, setConnectStep] = useState<"choose" | "proxy" | "qr" | "code" | "connecting" | "done">("choose");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [connectError, setConnectError] = useState("");
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Fetch devices from database
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        number: d.number || "",
        status: d.status as "Ready" | "Disconnected" | "Loading",
        login_type: d.login_type,
        proxy_id: d.proxy_id,
        whapi_token: d.whapi_token || null,
        profile_picture: d.profile_picture || null,
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
        .order("display_id", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const availableProxies = dbProxies.map((p, index) => ({
    id: p.id,
    label: `#${index + 1} - ${p.host}:${p.port}`,
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
    mutationFn: async (device: { name: string; login_type: string; whapi_token?: string }) => {
      const { error } = await supabase.from("devices").insert({
        name: device.name,
        login_type: device.login_type,
        user_id: session?.user.id,
        whapi_token: device.whapi_token || null,
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
      const device = devices.find(d => d.id === id);
      if (device?.proxy_id) {
        await supabase.from("proxies").update({ status: "USADA" } as any).eq("id", device.proxy_id);
        await supabase.from("devices").update({ proxy_id: null } as any).eq("id", id);
      }
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
      toast({ title: "Instância removida" });
    },
    onError: (err: any) => {
      console.error("Delete error:", err);
      toast({ title: "Erro ao apagar instância", description: err?.message || "Erro desconhecido", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("devices").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  const handleCreate = () => {
    if (!instanceName.trim()) {
      toast({ title: "Informe o nome da instância", variant: "destructive" });
      return;
    }
    createMutation.mutate({ name: instanceName, login_type: loginType, whapi_token: instanceToken || undefined });
    setCreateOpen(false);
    setInstanceName("");
    setInstanceToken("");
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
      for (const proxyId of bulkSelectedProxies) {
        inserts.push({
          name: `${bulkPrefix} ${idx}`,
          login_type: "qr",
          user_id: session?.user.id,
          proxy_id: proxyId,
        });
        idx++;
      }
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
      queryClient.invalidateQueries({ queryKey: ["devices"] });
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
      for (const id of ids) {
        const device = devices.find(d => d.id === id);
        if (device?.proxy_id) {
          await supabase.from("proxies").update({ status: "USADA" } as any).eq("id", device.proxy_id);
          await supabase.from("devices").update({ proxy_id: null } as any).eq("id", id);
        }
        const { error } = await supabase.from("devices").delete().eq("id", id);
        if (error) throw error;
      }
      const { data: remaining } = await supabase
        .from("devices")
        .select("id, name")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
      if (remaining) {
        for (let i = 0; i < remaining.length; i++) {
          const newName = `Instância ${i + 1}`;
          if (remaining[i].name !== newName) {
            await supabase.from("devices").update({ name: newName } as any).eq("id", remaining[i].id);
          }
        }
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
    setEditToken(device.whapi_token || "");
    setEditProxyValue(device.proxy_id || "none");
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editingDevice || !editName.trim()) return;
    const proxyId = editProxyValue === "none" ? null : editProxyValue;
    updateMutation.mutate({
      id: editingDevice.id,
      updates: { name: editName, proxy_id: proxyId, whapi_token: editToken || null },
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

  const handleLogout = async () => {
    if (!loggingOutDevice) return;
    // Call Whapi logout if token exists
    if (loggingOutDevice.whapi_token) {
      try {
        await callWhapi({ action: "logout", deviceId: loggingOutDevice.id });
      } catch (err) {
        console.error("Logout API error:", err);
      }
    }
    if (loggingOutDevice.proxy_id) {
      await supabase.from("proxies").update({ status: "USADA" } as any).eq("id", loggingOutDevice.proxy_id);
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
    }
    updateMutation.mutate({
      id: loggingOutDevice.id,
      updates: { status: "Disconnected", number: "", proxy_id: null },
    });
    toast({ title: "Desconectado", description: `${loggingOutDevice.name} foi desconectado.` });
    setLogoutOpen(false);
    setLoggingOutDevice(null);
  };

  // Helper to call evolution-connect edge function (now Whapi)
  const callWhapi = async (body: Record<string, any>) => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) throw new Error("Not authenticated");
    const response = await supabase.functions.invoke("evolution-connect", {
      body,
      headers: { Authorization: `Bearer ${s.access_token}` },
    });
    if (response.error) throw response.error;
    return response.data;
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  // Poll connection status via Whapi
  const startPolling = (deviceId: string, proxyId: string | null) => {
    stopPolling();
    const interval = setInterval(async () => {
      try {
        const result = await callWhapi({ action: "status", deviceId });
        // Whapi returns status field: "authenticated" means connected
        const whapiStatus = result?.status;
        if (whapiStatus === "authenticated") {
          clearInterval(interval);
          setPollingInterval(null);
          // Sync all devices
          const { data: { session: s } } = await supabase.auth.getSession();
          if (s) {
            await supabase.functions.invoke("sync-devices", {
              headers: { Authorization: `Bearer ${s.access_token}` },
            });
          }
          queryClient.invalidateQueries({ queryKey: ["devices"] });
          queryClient.invalidateQueries({ queryKey: ["proxies"] });
          setConnectStep("done");
          toast({ title: "Conectado!", description: "Instância conectada com sucesso!" });
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);
    setPollingInterval(interval);
  };

  // Connect
  const openConnect = (device: Device) => {
    if (!device.whapi_token) {
      toast({ title: "Token Whapi não configurado", description: "Edite a instância e adicione o token Whapi antes de conectar.", variant: "destructive" });
      return;
    }
    setConnectingDevice(device);
    setConnectStep("choose");
    setQrCodeBase64("");
    setPairingCode("");
    setConnectError("");
    stopPolling();
    setConnectOpen(true);
  };

  const handleConnect = (method: "qr" | "code") => {
    setConnectMethod(method);
    const currentIdx = availableProxies.findIndex(p => p.id === selectedProxy);
    const nextIdx = (currentIdx + 1) % availableProxies.length;
    setSelectedProxy(availableProxies[nextIdx]?.id || availableProxies[0]?.id || "");
    setConnectStep("proxy");
  };

  const handleConfirmProxy = async () => {
    if (!connectingDevice) return;
    const proxyId = selectedProxy && selectedProxy !== "none" ? selectedProxy : null;

    if (proxyId) {
      await supabase.from("devices").update({ proxy_id: proxyId } as any).eq("id", connectingDevice.id);
      await supabase.from("proxies").update({ status: "USANDO" } as any).eq("id", proxyId);
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
    }

    setConnectError("");
    setConnectStep(connectMethod);

    try {
      // Call Whapi to get QR code
      let qrFound = false;
      for (let attempt = 1; attempt <= 8; attempt++) {
        console.log(`QR poll attempt ${attempt}/8`);
        try {
          const connectResult = await callWhapi({
            action: "connect",
            deviceId: connectingDevice.id,
          });

          // Already connected
          if (connectResult.alreadyConnected) {
            // Device already updated by edge function, just refresh
            queryClient.invalidateQueries({ queryKey: ["devices"] });
            setConnectStep("done");
            const phoneMsg = connectResult.phone ? ` Número: ${connectResult.phone}` : "";
            toast({ title: "Já conectado!", description: `Esta instância já está autenticada.${phoneMsg}` });
            setConnectOpen(false);
            return;
          }

          if (connectResult.base64) {
            const b64 = connectResult.base64;
            setQrCodeBase64(b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);
            qrFound = true;
            break;
          }
          if (connectResult.qr) {
            setQrCodeBase64(connectResult.qr.startsWith("data:") ? connectResult.qr : `data:image/png;base64,${connectResult.qr}`);
            qrFound = true;
            break;
          }
        } catch (e) {
          console.log(`QR poll attempt ${attempt} error:`, e);
        }

        await new Promise(resolve => setTimeout(resolve, 2000 + attempt * 500));
      }

      if (!qrFound) {
        throw new Error("Não foi possível gerar o QR Code após várias tentativas. Verifique o token Whapi.");
      }

      // Start polling for connection status
      startPolling(connectingDevice.id, proxyId);
    } catch (err: any) {
      console.error("Connect error:", err);
      setConnectError(err?.message || "Erro ao conectar com a Whapi");
      toast({ title: "Erro ao gerar QR Code", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dispositivos ({devices.length})</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus números conectados via Whapi</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedDevices.length > 0 && (
            <Button size="sm" variant="destructive" className="gap-1.5 text-xs" onClick={() => setDeleteSelectedOpen(true)}>
              <Trash2 className="w-3.5 h-3.5" /> Apagar {selectedDevices.length} selecionada{selectedDevices.length !== 1 ? "s" : ""}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90">
                <Plus className="w-3.5 h-3.5" /> Criar instância <ChevronDown className="w-3 h-3 ml-0.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-2" /> Criar uma
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setBulkOpen(true); setBulkPrefix("Instância"); setBulkSelectedProxies([]); setBulkNoProxyCount(0); }}>
                <Layers className="w-3.5 h-3.5 mr-2" /> Criar em massa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            disabled={syncLoading}
            onClick={async () => {
              setSyncLoading(true);
              try {
                const { data: { session: s } } = await supabase.auth.getSession();
                if (!s) throw new Error("Not authenticated");

                const response = await supabase.functions.invoke("sync-devices", {
                  headers: { Authorization: `Bearer ${s.access_token}` },
                });

                if (response.error) throw response.error;

                const result = response.data;
                const found = result.devices?.filter((d: any) => d.found).length || 0;
                const notFound = result.devices?.filter((d: any) => !d.found).length || 0;
                const proxiesUpdated = result.proxiesUpdated || 0;

                queryClient.invalidateQueries({ queryKey: ["devices"] });
                queryClient.invalidateQueries({ queryKey: ["proxies"] });

                toast({
                  title: "Sincronizado com Whapi!",
                  description: `${found} instância(s) encontrada(s), ${notFound} não encontrada(s), ${proxiesUpdated} proxy(s) atualizada(s).`,
                });
              } catch (err: any) {
                console.error("Sync error:", err);
                toast({ title: "Erro ao sincronizar", description: err?.message || "Verifique os tokens Whapi.", variant: "destructive" });
              } finally {
                setSyncLoading(false);
              }
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? "animate-spin" : ""}`} /> {syncLoading ? "Sincronizando..." : "Sincronizar"}
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
        {devices.map((d, index) => {
          const sc = statusConfig[d.status] || statusConfig.Disconnected;
          const StatusIcon = sc.icon;
          const assignedProxy = d.proxy_id ? availableProxies.find(p => p.id === d.proxy_id) : null;
          const isSelected = selectedDevices.includes(d.id);
          return (
            <Card key={d.id} className={`border bg-card/50 backdrop-blur-sm transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary" : ""}`}>
              <CardContent className="p-0">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectDevice(d.id)}
                    />
                    <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center relative overflow-hidden">
                      {d.profile_picture ? (
                        <img src={d.profile_picture} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${d.status === "Ready" ? "bg-emerald-500" : d.status === "Loading" ? "bg-yellow-500" : "bg-muted-foreground/40"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">Instância {index + 1}</p>
                      <p className="text-xs text-muted-foreground">{d.number || "Sem número"}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-medium ${sc.badgeClass}`}>
                    {sc.label}
                  </Badge>
                </div>

                {/* Info */}
                <div className="px-5 pb-3 flex items-center gap-4 text-[11px] text-muted-foreground">
                  {assignedProxy && (
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" /> {assignedProxy.label}
                    </span>
                  )}
                  {d.whapi_token && (
                    <span className="flex items-center gap-1">
                      <Key className="w-3 h-3" /> ...{d.whapi_token.slice(-6)}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t px-5 py-3 flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs flex-1" onClick={() => openEdit(d)}>
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                  {d.status === "Disconnected" && (
                    <Button size="sm" className="h-8 gap-1.5 text-xs flex-1 bg-primary hover:bg-primary/90" onClick={() => openConnect(d)}>
                      <Link2 className="w-3 h-3" /> Conectar
                    </Button>
                  )}
                  {d.status === "Ready" && (
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs flex-1 text-destructive hover:text-destructive" onClick={() => openLogout(d)}>
                      <Power className="w-3 h-3" /> Sair
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => {
                    if (d.status === "Ready") {
                      setDeleteSingleDevice(d);
                      setDeleteSingleOpen(true);
                    } else {
                      handleDelete(d.id);
                    }
                  }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
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
            <div className="space-y-2">
              <Label className="text-xs">Token Whapi (canal)</Label>
              <Input value={instanceToken} onChange={e => setInstanceToken(e.target.value)} placeholder="Cole o token do canal Whapi aqui" className="h-9 text-sm font-mono" type="password" />
              <p className="text-[11px] text-muted-foreground">Obtenha o token no painel da Whapi.cloud → Canais → Token do canal</p>
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
              <Label className="text-xs">Token Whapi</Label>
              <Input value={editToken} onChange={e => setEditToken(e.target.value)} placeholder="Token do canal Whapi" className="h-9 text-sm font-mono" type="password" />
              <p className="text-[11px] text-muted-foreground">Token do canal na Whapi.cloud</p>
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
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${p.status === "USANDO" ? "border-yellow-500/30 text-yellow-500" : p.status === "USADA" ? "border-red-500/30 text-red-500" : "border-emerald-500/30 text-emerald-500"}`}>
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

      <Dialog open={connectOpen} onOpenChange={(open) => {
        if (!open) {
          stopPolling();
          setConnectOpen(false);
        }
      }}>
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
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${p.status === "USANDO" ? "border-yellow-500/30 text-yellow-500" : p.status === "USADA" ? "border-red-500/30 text-red-500" : "border-emerald-500/30 text-emerald-500"}`}>
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
              {qrCodeBase64 ? (
                <img
                  src={qrCodeBase64}
                  alt="QR Code"
                  className="w-56 h-56 rounded-xl border border-border"
                />
              ) : connectError ? (
                <div className="w-56 h-56 bg-destructive/10 rounded-xl flex flex-col items-center justify-center border border-destructive/30 p-4">
                  <XCircle className="w-10 h-10 text-destructive mb-2" />
                  <p className="text-xs text-destructive text-center">{connectError}</p>
                </div>
              ) : (
                <div className="w-56 h-56 bg-muted rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-border">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
                  <p className="text-xs text-muted-foreground">Gerando QR Code...</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">Abra o WhatsApp no celular → Configurações → Aparelhos conectados → Conectar dispositivo</p>
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Aguardando leitura do QR Code...</p>
              </div>
            </div>
          )}

          {connectStep === "code" && (
            <div className="flex flex-col items-center gap-4 py-4">
              {pairingCode ? (
                <div className="bg-muted rounded-xl px-8 py-4 border border-border">
                  <p className="text-2xl font-mono font-bold tracking-[0.3em] text-foreground">{pairingCode}</p>
                </div>
              ) : connectError ? (
                <div className="bg-destructive/10 rounded-xl px-8 py-4 border border-destructive/30">
                  <p className="text-sm text-destructive text-center">{connectError}</p>
                </div>
              ) : (
                <div className="bg-muted rounded-xl px-8 py-4 border border-border flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Gerando código...</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">Insira este código no WhatsApp → Configurações → Aparelhos conectados → Conectar com número de telefone</p>
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Aguardando emparelhamento...</p>
              </div>
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
              <Button onClick={() => { stopPolling(); setConnectOpen(false); }} className="bg-primary hover:bg-primary/90">Fechar</Button>
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
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${p.status === "USANDO" ? "border-yellow-500/30 text-yellow-500" : p.status === "USADA" ? "border-red-500/30 text-red-500" : "border-emerald-500/30 text-emerald-500"}`}>
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

      {/* Delete disconnected confirmation */}
      <AlertDialog open={deleteDisconnectedOpen} onOpenChange={setDeleteDisconnectedOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Apagar instâncias desconectadas</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja apagar {devices.filter(d => d.status === "Disconnected").length} instância{devices.filter(d => d.status === "Disconnected").length !== 1 ? "s" : ""} desconectada{devices.filter(d => d.status === "Disconnected").length !== 1 ? "s" : ""}? As instâncias restantes serão renumeradas automaticamente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => handleBulkDelete(devices.filter(d => d.status === "Disconnected").map(d => d.id))}>
              Apagar desconectadas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete single connected device confirmation */}
      <AlertDialog open={deleteSingleOpen} onOpenChange={setDeleteSingleOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Instância conectada</AlertDialogTitle>
            <AlertDialogDescription>Esta instância está conectada. Tem certeza que deseja apagá-la?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => { if (deleteSingleDevice) handleDelete(deleteSingleDevice.id); setDeleteSingleDevice(null); }}>
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Devices;
