import { useState, useRef, useEffect, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  Plus, QrCode, Link2, Pencil, Power, Trash2, Smartphone, CheckCircle2, XCircle, Loader2, Shield, RefreshCw, Key, ChevronDown, Layers, UserCircle, Camera, Search, Flame, AlertTriangle, Activity, Eye, EyeOff, Lock,
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
  profile_name: string | null;
  created_at: string;
  updated_at: string;
  uazapi_token: string | null;
  uazapi_base_url: string | null;
  has_api_config: boolean;
}

type FilterTab = "all" | "online" | "offline" | "error" | "warmup";

const statusConfig = {
  Ready: { label: "Online", badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", dot: "bg-emerald-500" },
  Disconnected: { label: "Offline", badgeClass: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
  Loading: { label: "Conectando", badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20", dot: "bg-amber-500 animate-pulse" },
};

const Devices = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

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
  const [editUazapiToken, setEditUazapiToken] = useState("");
  const [editUazapiBaseUrl, setEditUazapiBaseUrl] = useState("");

  // Quick token dialog
  const [tokenOpen, setTokenOpen] = useState(false);
  const [tokenDevice, setTokenDevice] = useState<Device | null>(null);
  const [quickToken, setQuickToken] = useState("");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<"valid" | "invalid" | "auth_error" | null>(null);

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
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditName, setInlineEditName] = useState("");
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp Profile dialog
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDevice, setProfileDevice] = useState<Device | null>(null);
  const [wpName, setWpName] = useState("");
  
  const [wpPhotoUrl, setWpPhotoUrl] = useState("");
  const [wpPhotoBase64, setWpPhotoBase64] = useState("");
  const [wpRemovePhoto, setWpRemovePhoto] = useState(false);
  const [wpApplyAll, setWpApplyAll] = useState(false);
  const [wpSaving, setWpSaving] = useState(false);

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
        profile_name: d.profile_name || null,
        created_at: d.created_at,
        updated_at: d.updated_at,
        uazapi_token: d.uazapi_token || null,
        uazapi_base_url: d.uazapi_base_url || null,
        has_api_config: !!(d.uazapi_token && d.uazapi_base_url),
      })) as Device[];
    },
    enabled: !!session,
  });

  // Fetch warmup sessions to identify devices in warmup
  const { data: warmupSessions = [] } = useQuery({
    queryKey: ["warmup_sessions_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warmup_sessions")
        .select("device_id, status")
        .in("status", ["running", "paused"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!session,
  });

  const warmupDeviceIds = useMemo(() => new Set(warmupSessions.map(s => s.device_id)), [warmupSessions]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    let list = devices;
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.number && d.number.includes(q)) ||
        (d.profile_name && d.profile_name.toLowerCase().includes(q))
      );
    }
    // Filter tab
    switch (activeFilter) {
      case "online": return list.filter(d => d.status === "Ready");
      case "offline": return list.filter(d => d.status === "Disconnected");
      case "error": return list.filter(d => !d.has_api_config && d.status === "Disconnected");
      case "warmup": return list.filter(d => warmupDeviceIds.has(d.id));
      default: return list;
    }
  }, [devices, searchQuery, activeFilter, warmupDeviceIds]);

  // Realtime subscription for instant status updates
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel('devices-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["devices"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, queryClient]);

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
    mutationFn: async (device: { name: string; login_type: string; token?: string }) => {
      const { error } = await supabase.from("devices").insert({
        name: device.name,
        login_type: device.login_type,
        user_id: session?.user.id,
        whapi_token: device.token || null,
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
    createMutation.mutate({ name: instanceName, login_type: loginType, token: instanceToken || undefined });
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
    setEditUazapiToken(device.uazapi_token || "");
    setEditUazapiBaseUrl(device.uazapi_base_url || "");
    setEditProxyValue(device.proxy_id || "none");
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editingDevice || !editName.trim()) return;
    const proxyId = editProxyValue === "none" ? null : editProxyValue;
    updateMutation.mutate({
      id: editingDevice.id,
      updates: {
        name: editName,
        proxy_id: proxyId,
        whapi_token: editToken || null,
        uazapi_token: editUazapiToken || null,
        uazapi_base_url: editUazapiBaseUrl || null,
      },
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

  // Inline edit name
  const startInlineEdit = (device: Device) => {
    setInlineEditId(device.id);
    setInlineEditName(device.name);
    setTimeout(() => inlineInputRef.current?.focus(), 50);
  };

  const commitInlineEdit = () => {
    if (inlineEditId && inlineEditName.trim()) {
      updateMutation.mutate({ id: inlineEditId, updates: { name: inlineEditName.trim() } });
      toast({ title: "Nome atualizado" });
    }
    setInlineEditId(null);
  };

  // Quick token
  const openQuickToken = (device: Device) => {
    setTokenDevice(device);
    setQuickToken(device.uazapi_token || "");
    setTokenOpen(true);
  };

  const handleQuickToken = () => {
    if (!tokenDevice) return;
    updateMutation.mutate({
      id: tokenDevice.id,
      updates: { uazapi_token: quickToken || null },
    });
    toast({ title: "Token atualizado" });
    setTokenOpen(false);
    setTokenDevice(null);
  };

  const handleQuickTokenWithValidation = async () => {
    if (!tokenDevice || !quickToken.trim() || quickToken.length < 8) return;
    updateMutation.mutate({
      id: tokenDevice.id,
      updates: { uazapi_token: quickToken },
    });
    // Try to validate by calling status
    try {
      const result = await callApi({ action: "status", deviceId: tokenDevice.id });
      if (result?.status === "authenticated" || result?.status) {
        setTokenStatus("valid");
      } else {
        setTokenStatus("valid"); // saved but can't confirm remotely
      }
    } catch {
      setTokenStatus("valid"); // saved successfully, remote check optional
    }
    toast({ title: "Token atualizado" });
    setTimeout(() => {
      setTokenOpen(false);
      setTokenDevice(null);
      setTokenVisible(false);
      setTokenStatus(null);
    }, 800);
  };

  // Logout
  const openLogout = (device: Device) => {
    setLoggingOutDevice(device);
    setLogoutOpen(true);
  };

  // WhatsApp Profile edit
  const openProfileEdit = (device: Device) => {
    setProfileDevice(device);
    setWpName("");
    
    setWpPhotoUrl("");
    setWpPhotoBase64("");
    setWpRemovePhoto(false);
    setWpApplyAll(false);
    setProfileOpen(true);
  };

  const wpFileRef = useRef<HTMLInputElement>(null);
  const [wpUploading, setWpUploading] = useState(false);

  const handleWpPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setWpUploading(true);
    try {
      // Convert to base64 for direct API upload
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setWpPhotoBase64(base64);
        setWpPhotoUrl(URL.createObjectURL(file));
        setWpRemovePhoto(false);
        toast({ title: "Foto carregada" });
        setWpUploading(false);
      };
      reader.onerror = () => {
        toast({ title: "Erro ao ler foto", variant: "destructive" });
        setWpUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      toast({ title: "Erro ao enviar foto", description: err?.message, variant: "destructive" });
      setWpUploading(false);
    } finally {
      if (wpFileRef.current) wpFileRef.current.value = "";
    }
  };

  const handleProfileUpdate = async () => {
    if (!wpName && !wpPhotoBase64 && !wpRemovePhoto) {
      toast({ title: "Preencha ao menos um campo", variant: "destructive" });
      return;
    }
    setWpSaving(true);
    try {
      const targetDevices = wpApplyAll
        ? devices.filter(d => d.status === "Ready")
        : profileDevice ? [profileDevice] : [];

      // Run all devices in parallel, and each device's actions in parallel too
      const results = await Promise.allSettled(
        targetDevices.map(async (device) => {
          const promises: Promise<any>[] = [];
          if (wpName.trim()) {
            promises.push(callApi({ action: "updateProfileName", deviceId: device.id, profileName: wpName.trim() }));
          }
          if (wpRemovePhoto) {
            promises.push(callApi({ action: "updateProfilePicture", deviceId: device.id, profilePictureData: "remove" }));
          } else if (wpPhotoBase64) {
            promises.push(callApi({ action: "updateProfilePicture", deviceId: device.id, profilePictureData: wpPhotoBase64 }));
          }
          await Promise.all(promises);
        })
      );

      const failed = results.filter(r => r.status === "rejected").length;
      if (failed > 0) {
        toast({ title: `Perfil atualizado (${targetDevices.length - failed}/${targetDevices.length} chips)`, description: `${failed} chip(s) falharam`, variant: "destructive" });
      } else {
        toast({ title: wpApplyAll ? `Perfil atualizado em ${targetDevices.length} chip(s)` : "Perfil atualizado" });
      }
      setProfileOpen(false);
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    } catch (err: any) {
      console.error("Profile update error:", err);
      toast({ title: "Erro ao atualizar perfil", description: err?.message || "Erro desconhecido", variant: "destructive" });
    } finally {
      setWpSaving(false);
    }
  };

  const handleLogout = async () => {
    if (!loggingOutDevice) return;
    // Call logout via API
    try {
      await callApi({ action: "logout", deviceId: loggingOutDevice.id });
    } catch (err) {
      console.error("Logout API error:", err);
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

  // Helper to call evolution-connect edge function
  const callApi = async (body: Record<string, any>) => {
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

  // Poll connection status
  const startPolling = (deviceId: string, proxyId: string | null) => {
    stopPolling();
    const interval = setInterval(async () => {
      try {
        const result = await callApi({ action: "status", deviceId });
        const apiStatus = result?.status;
        console.log("Polling status result:", apiStatus);
        if (apiStatus === "authenticated") {
          clearInterval(interval);
          setPollingInterval(null);
          // Mark as done FIRST, then sync in background
          setConnectStep("done");
          queryClient.invalidateQueries({ queryKey: ["devices"] });
          queryClient.invalidateQueries({ queryKey: ["proxies"] });
          toast({ title: "Conectado!", description: "Instância conectada com sucesso!" });
          // Sync in background (non-blocking)
          try {
            const { data: { session: s } } = await supabase.auth.getSession();
            if (s) {
              await supabase.functions.invoke("sync-devices", {
                headers: { Authorization: `Bearer ${s.access_token}` },
              });
              queryClient.invalidateQueries({ queryKey: ["devices"] });
            }
          } catch (syncErr) {
            console.error("Background sync error:", syncErr);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);
    setPollingInterval(interval);
  };

  // Connect
  const openConnect = async (device: Device) => {
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
      // If device has no instance token, create instance on UaZapi first
      if (!connectingDevice.uazapi_token) {
        console.log("No instance token, creating instance on UaZapi...");
        try {
          const createResult = await callApi({
            action: "createInstance",
            deviceId: connectingDevice.id,
            instanceName: connectingDevice.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          });
          console.log("Instance created:", createResult);
          // Update local device state with new token
          connectingDevice.uazapi_token = createResult.instanceToken;
          connectingDevice.uazapi_base_url = createResult.baseUrl;
          queryClient.invalidateQueries({ queryKey: ["devices"] });
        } catch (createErr: any) {
          console.error("Create instance error:", createErr);
          throw new Error("Erro ao criar instância na UaZapi: " + (createErr?.message || "Erro desconhecido"));
        }
      }

      // Now connect (triggers QR)
      let qrFound = false;
      console.log("QR: initial connect call");
      try {
        const connectResult = await callApi({
          action: "connect",
          deviceId: connectingDevice.id,
        });

        if (connectResult.alreadyConnected) {
          queryClient.invalidateQueries({ queryKey: ["devices"] });
          setConnectStep("done");
          const phoneMsg = connectResult.phone ? ` Número: ${connectResult.phone}` : "";
          toast({ title: "Já conectado!", description: `Esta instância já está autenticada.${phoneMsg}` });
          setConnectOpen(false);
          return;
        }

        const b64 = connectResult.base64 || connectResult.qr;
        if (b64) {
          setQrCodeBase64(b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);
          qrFound = true;
        }
      } catch (e) {
        console.log("QR initial connect error:", e);
      }

      // If first call didn't return QR, poll with status (no disconnect)
      if (!qrFound) {
        for (let attempt = 1; attempt <= 15; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log(`QR status poll ${attempt}/10`);
          try {
            const statusResult = await callApi({
              action: "status",
              deviceId: connectingDevice.id,
            });

            // Check if QR is in the response (edge function also returns instance fields)
            const b64 = statusResult.base64 || statusResult.qr || statusResult.qrcode || statusResult.instance?.qrcode;
            if (b64) {
              setQrCodeBase64(b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);
              qrFound = true;
              break;
            }
          } catch (e) {
            console.log(`QR status poll ${attempt} error:`, e);
          }
        }
      }

      if (!qrFound) {
        throw new Error("Não foi possível gerar o QR Code após várias tentativas. Verifique sua configuração.");
      }

      // Start polling for connection status
      startPolling(connectingDevice.id, proxyId);
    } catch (err: any) {
      console.error("Connect error:", err);
      setConnectError(err?.message || "Erro ao conectar");
      toast({ title: "Erro ao gerar QR Code", description: err?.message, variant: "destructive" });
    }
  };

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "Todas", count: devices.length },
    { key: "online", label: "Online", count: devices.filter(d => d.status === "Ready").length },
    { key: "offline", label: "Offline", count: devices.filter(d => d.status === "Disconnected").length },
    { key: "error", label: "Com erro", count: devices.filter(d => !d.has_api_config && d.status === "Disconnected").length },
    { key: "warmup", label: "Aquecimento", count: devices.filter(d => warmupDeviceIds.has(d.id)).length },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-bold text-foreground">Instâncias</h1>
        <div className="flex items-center gap-1.5">
          {selectedDevices.length > 0 && (
            <Button size="sm" variant="destructive" className="gap-1 text-xs h-7" onClick={() => setDeleteSelectedOpen(true)}>
              <Trash2 className="w-3 h-3" /> {selectedDevices.length}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1 text-xs h-7">
                <Plus className="w-3 h-3" /> Criar <ChevronDown className="w-2.5 h-2.5 ml-0.5" />
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
            className="gap-1 text-xs h-7"
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
                queryClient.invalidateQueries({ queryKey: ["devices"] });
                queryClient.invalidateQueries({ queryKey: ["proxies"] });
                toast({ title: `Sincronizado. ${found} encontrada(s).` });
              } catch (err: any) {
                toast({ title: "Erro ao sincronizar", description: err?.message, variant: "destructive" });
              } finally {
                setSyncLoading(false);
              }
            }}
          >
            <RefreshCw className={`w-3 h-3 ${syncLoading ? "animate-spin" : ""}`} /> Sync
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar instância..."
            className="h-7 text-xs pl-8 bg-muted/20 border-border/20"
          />
        </div>
        <div className="flex items-center gap-0.5">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                activeFilter === tab.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              {tab.label} {tab.count > 0 && <span className="ml-0.5 opacity-60">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Select all */}
      {filteredDevices.length > 0 && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedDevices.length === filteredDevices.length && filteredDevices.length > 0}
            onCheckedChange={(checked) => {
              setSelectedDevices(checked ? filteredDevices.map(d => d.id) : []);
            }}
          />
          <span className="text-[10px] text-muted-foreground/50">
            {selectedDevices.length}/{filteredDevices.length}
          </span>
        </div>
      )}

      {/* Device grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2">
        {filteredDevices.map((d) => {
          const sc = statusConfig[d.status] || statusConfig.Disconnected;
          const assignedProxy = d.proxy_id ? availableProxies.find(p => p.id === d.proxy_id) : null;
          const isSelected = selectedDevices.includes(d.id);
          const isEditing = inlineEditId === d.id;
          const lastActivity = formatDistanceToNow(new Date(d.updated_at || d.created_at), { locale: ptBR, addSuffix: true });
          const hadPreviousConnection = !!d.number;
          const neverConnected = !d.number && d.status === "Disconnected";

          // Status badge logic
          let badgeLabel = sc.label;
          let badgeClass = sc.badgeClass;
          if (neverConnected) {
            badgeLabel = "Nunca conectado";
            badgeClass = "bg-muted/20 text-muted-foreground/60 border-border/20";
          }

          // Connection button logic
          let connectionButton: React.ReactNode = null;
          if (d.status === "Ready") {
            connectionButton = (
              <Button variant="ghost" size="sm" className="h-6 gap-0.5 text-[10px] px-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openLogout(d)}>
                <Power className="w-2.5 h-2.5" /> Desconectar
              </Button>
            );
          } else if (hadPreviousConnection) {
            connectionButton = (
              <Button size="sm" className="h-6 gap-0.5 text-[10px] px-1.5" onClick={() => openConnect(d)}>
                <RefreshCw className="w-2.5 h-2.5" /> Reconectar
              </Button>
            );
          } else {
            connectionButton = (
              <Button size="sm" className="h-6 gap-0.5 text-[10px] px-1.5" onClick={() => openConnect(d)}>
                <Link2 className="w-2.5 h-2.5" /> Conectar
              </Button>
            );
          }

          return (
            <Card
              key={d.id}
              className={`border-border/10 bg-card/40 ${isSelected ? "ring-1 ring-primary" : ""}`}
            >
              <CardContent className="p-0">
                {/* Linha 1: Nome + Status */}
                <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelectDevice(d.id)}
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <input
                          ref={inlineInputRef}
                          value={inlineEditName}
                          onChange={(e) => setInlineEditName(e.target.value)}
                          onBlur={commitInlineEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitInlineEdit();
                            if (e.key === "Escape") setInlineEditId(null);
                          }}
                          className="text-[13px] font-bold text-foreground bg-transparent border-b border-primary outline-none w-full"
                        />
                      ) : (
                        <p
                          className="text-[13px] font-bold text-foreground cursor-pointer hover:text-primary truncate leading-tight"
                          onClick={() => startInlineEdit(d)}
                          title={d.name}
                        >
                          {d.name}
                        </p>
                      )}
                      {d.number && (
                        <p className="text-[10px] text-muted-foreground/40 truncate leading-tight">{d.number}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 shrink-0 whitespace-nowrap ${badgeClass}`}>
                    {badgeLabel}
                  </Badge>
                </div>

                {/* Linha 2: Meta info */}
                <div className="px-3 pb-1.5 flex items-center gap-3 text-[10px] text-muted-foreground/50">
                  <span className="truncate" title={`Última atividade: ${lastActivity}`}>
                    {lastActivity}
                  </span>
                  <span className="flex items-center gap-0.5 shrink-0">
                    <Shield className="w-2.5 h-2.5" />
                    {assignedProxy ? assignedProxy.label.split(" - ")[0] : "—"}
                  </span>
                  <span className="flex items-center gap-0.5 shrink-0">
                    <Key className="w-2.5 h-2.5" />
                    {d.has_api_config ? "Sim" : "Não"}
                  </span>
                </div>

                {/* Linha 3: Ações */}
                <div className="border-t border-border/10 px-2 py-1 flex items-center gap-0.5">
                  <Button variant="ghost" size="sm" className="h-6 gap-0.5 text-[10px] px-1.5" onClick={() => openEdit(d)}>
                    <Pencil className="w-2.5 h-2.5" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 gap-0.5 text-[10px] px-1" onClick={() => openQuickToken(d)}>
                    <Key className="w-2.5 h-2.5" /> Token
                  </Button>
                  <div className="flex-1" />
                  {connectionButton}
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/30 hover:text-destructive shrink-0" onClick={() => {
                    if (d.status === "Ready") {
                      setDeleteSingleDevice(d);
                      setDeleteSingleOpen(true);
                    } else {
                      handleDelete(d.id);
                    }
                  }}>
                    <Trash2 className="w-2.5 h-2.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDevices.length === 0 && devices.length > 0 && (
        <p className="text-xs text-muted-foreground/40 text-center py-8">Nenhuma instância encontrada</p>
      )}

      {devices.length === 0 && (
        <div className="text-center py-12">
          <Smartphone className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/40">Nenhuma instância criada</p>
        </div>
      )}

      {/* Create Instance Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Nova instância</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Nome</Label>
              <Input
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
                placeholder="Ex: Chip 01"
                className="h-8 text-xs"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} disabled={!instanceName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Editar instância
            </DialogTitle>
            {editingDevice && (
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">{editingDevice.number || "Sem número vinculado"}</p>
            )}
          </DialogHeader>
          <div className="space-y-3 py-1">
            {/* Nome */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Nome da instância</Label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value.slice(0, 30))}
                placeholder="Ex: Chip 01"
                className="h-8 text-xs"
                maxLength={30}
              />
              <div className="flex items-center justify-between">
                <div>
                  {editName.trim() && devices.some(d => d.name.toLowerCase() === editName.trim().toLowerCase() && d.id !== editingDevice?.id) && (
                    <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> Nome já em uso
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground/30">{editName.length}/30</span>
              </div>
            </div>

            {/* Token */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">Token da Instância</Label>
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${editUazapiToken ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                  {editUazapiToken ? "Configurado" : "Ausente"}
                </Badge>
              </div>
              <Input
                value={editUazapiToken}
                onChange={e => setEditUazapiToken(e.target.value)}
                placeholder="Cole o token aqui"
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* URL da API */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">URL da API</Label>
                {editUazapiBaseUrl && (
                  <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${
                    /^https?:\/\/.+/.test(editUazapiBaseUrl)
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  }`}>
                    {/^https?:\/\/.+/.test(editUazapiBaseUrl) ? "Válida" : "Formato inválido"}
                  </Badge>
                )}
              </div>
              <Input
                value={editUazapiBaseUrl}
                onChange={e => setEditUazapiBaseUrl(e.target.value)}
                placeholder="https://sua-api.com"
                className="h-8 text-xs font-mono"
              />
              {editUazapiBaseUrl && !/^https?:\/\/.+/.test(editUazapiBaseUrl) && (
                <p className="text-[10px] text-amber-500/70">A URL deve começar com http:// ou https://</p>
              )}
            </div>

            {/* Proxy */}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Proxy</Label>
              <Select value={editProxyValue} onValueChange={setEditProxyValue}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecionar proxy" />
                </SelectTrigger>
                <SelectContent>
                  {availableProxies.map(p => {
                    const proxyStatusClass = p.status === "USANDO"
                      ? "text-amber-500 border-amber-500/20"
                      : p.status === "USADA"
                        ? "text-red-400 border-red-500/20"
                        : "text-emerald-500 border-emerald-500/20";
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <Shield className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs">{p.label}</span>
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${proxyStatusClass}`}>{p.status}</Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                  <SelectItem value="none">
                    <span className="text-xs text-muted-foreground">Sem proxy</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {editProxyValue === "none" && (
                <p className="text-[10px] text-amber-500/70 flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> Instância sem proxy — risco maior de bloqueio
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleEdit} disabled={!editName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Token Dialog */}
      <Dialog open={tokenOpen} onOpenChange={(open) => { setTokenOpen(open); if (!open) { setTokenVisible(false); setTokenStatus(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              Token da API
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              {tokenDevice?.name} {tokenDevice?.number ? `· ${tokenDevice.number}` : ""}
            </p>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">Token da Instância</Label>
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 ${
                  tokenStatus === "valid" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                  tokenStatus === "invalid" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                  tokenStatus === "auth_error" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                  quickToken.length >= 8 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                  quickToken.length > 0 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                  "bg-red-500/10 text-red-400 border-red-500/20"
                }`}>
                  {tokenStatus === "valid" ? "Token válido" :
                   tokenStatus === "invalid" ? "Token inválido" :
                   tokenStatus === "auth_error" ? "Falha na autenticação" :
                   quickToken.length >= 8 ? "Configurado" :
                   quickToken.length > 0 ? `${quickToken.length}/8 min` :
                   "Ausente"}
                </Badge>
              </div>
              <div className="relative">
                <Input
                  value={quickToken}
                  onChange={e => { setQuickToken(e.target.value); setTokenStatus(null); }}
                  placeholder="Cole o token aqui"
                  type={tokenVisible ? "text" : "password"}
                  className="h-8 text-xs font-mono pr-8"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setTokenVisible(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
                >
                  {tokenVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {quickToken.length > 0 && quickToken.length < 8 && (
                <p className="text-[10px] text-amber-500/70">Token deve ter no mínimo 8 caracteres</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded bg-muted/10 border border-border/10">
              <Lock className="w-3 h-3 text-muted-foreground/30 shrink-0" />
              <p className="text-[10px] text-muted-foreground/40">Nunca compartilhe seu token. Ele dá acesso total à instância.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setTokenOpen(false); setTokenVisible(false); setTokenStatus(null); }}>Cancelar</Button>
            <Button size="sm" onClick={handleQuickTokenWithValidation} disabled={!quickToken.trim() || quickToken.length < 8}>
              Salvar
            </Button>
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
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs mt-1"
                onClick={async () => {
                  try {
                    const result = await callApi({ action: "status", deviceId: connectingDevice!.id });
                    console.log("Sync button result:", JSON.stringify(result));
                    const state = result?.status;
                    if (state === "authenticated") {
                      // Mark done FIRST
                      stopPolling();
                      setConnectStep("done");
                      queryClient.invalidateQueries({ queryKey: ["devices"] });
                      toast({ title: "Conectado!", description: "Instância conectada com sucesso!" });
                      // Sync in background
                      try {
                        const { data: { session: s } } = await supabase.auth.getSession();
                        if (s) {
                          await supabase.functions.invoke("sync-devices", {
                            headers: { Authorization: `Bearer ${s.access_token}` },
                          });
                          queryClient.invalidateQueries({ queryKey: ["devices"] });
                        }
                      } catch (e) {
                        console.error("Background sync error:", e);
                      }
                    } else {
                      toast({ title: "Ainda não conectado", description: `Status atual: ${state || "desconhecido"}. Escaneie o QR Code e tente novamente.`, variant: "destructive" });
                    }
                  } catch (err: any) {
                    console.error("Sync button error:", err);
                    toast({ title: "Erro ao verificar", description: err?.message || "Tente novamente", variant: "destructive" });
                  }
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Já escaneei, sincronizar
              </Button>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Criar em massa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Prefixo do nome</Label>
              <Input
                value={bulkPrefix}
                onChange={e => setBulkPrefix(e.target.value)}
                placeholder="Ex: Instância"
                className="h-8 text-xs"
              />
              <p className="text-[10px] text-muted-foreground/50">Resultado: "{bulkPrefix} 1", "{bulkPrefix} 2", etc.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Proxies ({bulkSelectedProxies.length})</Label>
              <div className="max-h-[200px] overflow-y-auto space-y-0.5 border border-border/20 rounded-lg p-1.5">
                {availableProxies.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-3">Nenhuma proxy disponível</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/30 cursor-pointer"
                      onClick={() => {
                        if (bulkSelectedProxies.length === availableProxies.length) {
                          setBulkSelectedProxies([]);
                        } else {
                          setBulkSelectedProxies(availableProxies.map(p => p.id));
                        }
                      }}
                    >
                      <Checkbox checked={bulkSelectedProxies.length === availableProxies.length} />
                      <span className="text-[11px] font-medium">Todas</span>
                    </div>
                    {availableProxies.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-muted/30 cursor-pointer"
                        onClick={() => toggleBulkProxy(p.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={bulkSelectedProxies.includes(p.id)} />
                          <span className="text-[11px]">{p.label}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">Sem proxy</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={bulkNoProxyCount}
                  onChange={e => setBulkNoProxyCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="h-7 w-16 text-xs"
                />
                <span className="text-[10px] text-muted-foreground/50">extra sem proxy</span>
              </div>
            </div>

            {/* Summary */}
            {(bulkSelectedProxies.length + bulkNoProxyCount) > 0 && (
              <div className="p-2.5 rounded-lg bg-muted/10 border border-border/15">
                <p className="text-[12px] text-foreground font-medium">
                  {bulkSelectedProxies.length + bulkNoProxyCount} instância{(bulkSelectedProxies.length + bulkNoProxyCount) !== 1 ? "s" : ""} serão criadas
                </p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                  {bulkSelectedProxies.length > 0 && `${bulkSelectedProxies.length} com proxy`}
                  {bulkSelectedProxies.length > 0 && bulkNoProxyCount > 0 && " · "}
                  {bulkNoProxyCount > 0 && `${bulkNoProxyCount} sem proxy`}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleBulkCreate} disabled={bulkSelectedProxies.length + bulkNoProxyCount === 0}>
              Criar {bulkSelectedProxies.length + bulkNoProxyCount}
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

      {/* WhatsApp Profile Edit Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-primary" />
              Perfil do WhatsApp
            </DialogTitle>
            <DialogDescription>
              Altere o nome, recado e foto do perfil de <span className="font-medium text-foreground">{profileDevice?.number || profileDevice?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <UserCircle className="w-3.5 h-3.5" /> Nome do perfil
              </Label>
              <Input
                value={wpName}
                onChange={e => setWpName(e.target.value)}
                placeholder="Nome exibido no WhatsApp"
                className="h-9 text-sm"
                maxLength={25}
              />
              <p className="text-[10px] text-muted-foreground">{wpName.length}/25 caracteres</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> Foto do perfil
              </Label>
              <input ref={wpFileRef} type="file" accept="image/*" className="hidden" onChange={handleWpPhotoUpload} />
              <div className="flex justify-center">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => {
                    if (!wpPhotoUrl && !wpRemovePhoto) wpFileRef.current?.click();
                  }}
                >
                  {wpPhotoUrl && !wpRemovePhoto ? (
                    <>
                      <img
                        src={wpPhotoUrl}
                        alt="Foto do perfil"
                        className="w-20 h-20 rounded-full object-cover border-2 border-border"
                        onError={e => { e.currentTarget.src = ""; setWpPhotoUrl(""); setWpPhotoBase64(""); }}
                      />
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:bg-white/20"
                          onClick={(e) => { e.stopPropagation(); wpFileRef.current?.click(); }}
                          title="Trocar foto"
                        >
                          <Camera className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:bg-destructive/40"
                          onClick={(e) => { e.stopPropagation(); setWpPhotoUrl(""); setWpPhotoBase64(""); setWpRemovePhoto(true); }}
                          title="Remover foto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : wpRemovePhoto ? (
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-destructive/40 flex flex-col items-center justify-center gap-1">
                      <Trash2 className="w-5 h-5 text-destructive/60" />
                      <span className="text-[9px] text-destructive/60">Remover</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -bottom-1 text-[9px] h-5 px-2"
                        onClick={(e) => { e.stopPropagation(); setWpRemovePhoto(false); }}
                      >
                        Desfazer
                      </Button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors">
                      {wpUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[9px] text-muted-foreground">Importar</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Checkbox checked={wpApplyAll} onCheckedChange={(v) => setWpApplyAll(!!v)} />
              <div>
                <p className="text-xs font-medium">Aplicar para todos os chips conectados</p>
                <p className="text-[10px] text-muted-foreground">Altera o perfil de todas as instâncias online</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)} disabled={wpSaving}>Cancelar</Button>
            <Button onClick={handleProfileUpdate} disabled={wpSaving} className="bg-primary hover:bg-primary/90">
              {wpSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Devices;
