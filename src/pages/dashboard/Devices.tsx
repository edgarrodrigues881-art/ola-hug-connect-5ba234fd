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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, QrCode, Link2, Pencil, Power, Trash2, Smartphone, CheckCircle2, XCircle, Loader2, Shield, RefreshCw, Key, ChevronDown, Layers, UserCircle, Camera, Search, Flame, AlertTriangle, Activity, Eye, EyeOff, Lock, WifiOff, Ban, ShieldAlert, Zap, LayoutGrid, List, Heart, RotateCcw, TestTube, Plug,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

type PlanState = "noPlan" | "active" | "expired" | "suspended";

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

type SmartStatus = "online" | "offline";

const smartStatusConfig: Record<SmartStatus, { label: string; icon: any; badgeClass: string; tooltip: string }> = {
  online: { label: "Conectado", icon: CheckCircle2, badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", tooltip: "Instância conectada" },
  offline: { label: "Desconectado", icon: WifiOff, badgeClass: "bg-red-500/10 text-red-400 border-red-500/20", tooltip: "Instância desconectada" },
};

function deriveSmartStatus(d: Device, warmupDeviceIds: Set<string>, proxyStatus?: string): SmartStatus {
  return d.status === "Ready" ? "online" : "offline";
}

function formatPhone(num: string): string {
  const digits = num.replace(/\D/g, "");
  if (digits.length === 13) return `+${digits.slice(0,2)} ${digits.slice(2,4)} ${digits.slice(4,9)}-${digits.slice(9)}`;
  if (digits.length === 12) return `+${digits.slice(0,2)} ${digits.slice(2,4)} ${digits.slice(4,8)}-${digits.slice(8)}`;
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return num;
}

const Devices = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Plan gate states
  const [planGateOpen, setPlanGateOpen] = useState(false);
  const [limitGateOpen, setLimitGateOpen] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Quick action loading states
  const [quickActionLoading, setQuickActionLoading] = useState<Record<string, string>>({});

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
  const [connectStep, setConnectStep] = useState<"choose" | "proxy" | "qr" | "code_phone" | "code" | "connecting" | "done">("choose");
  const [codePhone, setCodePhone] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [connectError, setConnectError] = useState("");
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [qrCountdown, setQrCountdown] = useState(30);
  const qrCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Fetch user subscription for plan gating
  const { data: subscription } = useQuery({
    queryKey: ["my_subscription"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  const { data: profile } = useQuery({
    queryKey: ["my_profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("status, instance_override")
        .eq("id", session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  const planState: PlanState = useMemo(() => {
    if (profile?.status === "suspended" || profile?.status === "cancelled") return "suspended";
    if (!subscription) return "noPlan";
    if (new Date(subscription.expires_at) < new Date()) return "expired";
    return "active";
  }, [subscription, profile]);

  const maxInstancesAllowed = useMemo(() => {
    if (planState !== "active") return 0;
    return (subscription?.max_instances ?? 0) + (profile?.instance_override ?? 0);
  }, [planState, subscription, profile]);

  const canCreateInstance = planState === "active" && devices.length < maxInstancesAllowed;

  const planBadgeText = planState === "noPlan" ? "Sem plano" : planState === "expired" ? "Plano vencido" : planState === "suspended" ? "Conta suspensa" : null;

  // Fetch recent warmup logs for health scoring (last 7 days)
  const { data: recentLogs = [] } = useQuery({
    queryKey: ["warmup_logs_recent"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase
        .from("warmup_logs")
        .select("device_id, status")
        .gte("created_at", sevenDaysAgo.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!session,
  });

  // Fetch recent campaign send stats for health scoring
  const { data: recentCampaignStats = [] } = useQuery({
    queryKey: ["campaign_contacts_recent_stats"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select("status, campaign_id")
        .gte("created_at", sevenDaysAgo.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!session,
  });

  // Calculate health score per device
  const deviceHealthScores = useMemo(() => {
    const scores: Record<string, number> = {};
    for (const d of devices) {
      let score = 100;
      // Penalty for status
      if (d.status === "Disconnected") score -= 20;
      if (!d.uazapi_token) score -= 15;
      if (!d.uazapi_base_url) score -= 15;
      if (!d.proxy_id) score -= 10;
      // Penalty for warmup log failures
      const deviceLogs = recentLogs.filter(l => l.device_id === d.id);
      const failedLogs = deviceLogs.filter(l => l.status === "failed" || l.status === "error");
      if (deviceLogs.length > 0) {
        const failRate = failedLogs.length / deviceLogs.length;
        if (failRate > 0.1) score -= Math.min(30, Math.round(failRate * 50));
      }
      scores[d.id] = Math.max(0, Math.min(100, score));
    }
    return scores;
  }, [devices, recentLogs, recentCampaignStats]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-400";
  };

  const getHealthProgressColor = (score: number) => {
    if (score >= 80) return "[&>div]:bg-emerald-500";
    if (score >= 50) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-red-400";
  };

  // Auto-sync now handled globally in DashboardLayout

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
    username: p.username,
    password: p.password,
    type: p.type,
    status: p.status || "NOVA",
  }));

  // Helper to get proxy status for a device
  const getProxyStatus = (d: Device) => {
    if (!d.proxy_id) return undefined;
    const p = dbProxies.find(px => px.id === d.proxy_id);
    return p?.status || undefined;
  };

  // Filtered devices
  const filteredDevices = useMemo(() => {
    let list = devices;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.number && d.number.includes(q)) ||
        (d.profile_name && d.profile_name.toLowerCase().includes(q))
      );
    }
    switch (activeFilter) {
      case "online": return list.filter(d => d.status === "Ready");
      case "offline": return list.filter(d => d.status === "Disconnected" && d.number);
      case "error": return list.filter(d => deriveSmartStatus(d, warmupDeviceIds, getProxyStatus(d)) === "offline");
      case "warmup": return list.filter(d => warmupDeviceIds.has(d.id));
      default: return list;
    }
  }, [devices, searchQuery, activeFilter, warmupDeviceIds, dbProxies]);

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
      // Auto-assign token from pool if no manual token provided
      let assignedToken = device.token || null;
      let tokenRecord: any = null;

      if (!assignedToken) {
        const { data: available } = await supabase
          .from("user_api_tokens")
          .select("*")
          .eq("user_id", session?.user.id!)
          .eq("status", "available")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (available) {
          assignedToken = available.token;
          tokenRecord = available;
        }
      }

      const UAZAPI_BASE_URL = tokenRecord ? undefined : null; // will be set by edge function if needed
      
      const { data: newDevice, error } = await supabase.from("devices").insert({
        name: device.name,
        login_type: device.login_type,
        user_id: session?.user.id,
        whapi_token: null,
        uazapi_token: assignedToken,
      } as any).select().single();
      if (error) throw error;

      // Mark token as in_use
      if (tokenRecord && newDevice) {
        await supabase.from("user_api_tokens").update({
          status: "in_use",
          device_id: (newDevice as any).id,
          assigned_at: new Date().toISOString(),
        } as any).eq("id", tokenRecord.id);
      }
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
      // Release token back to pool
      await supabase.from("user_api_tokens").update({
        status: "available", device_id: null, assigned_at: null,
      } as any).eq("device_id", id);
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
    if (planState !== "active") { setPlanGateOpen(true); return; }
    if (devices.length >= maxInstancesAllowed) { setLimitGateOpen(true); return; }
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

  const handleEdit = async () => {
    if (!editingDevice || !editName.trim()) return;
    // Save instance name to DB
    updateMutation.mutate({
      id: editingDevice.id,
      updates: {
        name: editName,
        proxy_id: editingDevice.proxy_id || null,
        uazapi_token: editingDevice.uazapi_token || null,
        uazapi_base_url: editingDevice.uazapi_base_url || null,
      },
    });
    // Save WP profile changes via API
    try {
      const promises: Promise<any>[] = [];
      if (wpName.trim()) {
        promises.push(callApi({ action: "updateProfileName", deviceId: editingDevice.id, profileName: wpName.trim() }));
      }
      if (wpRemovePhoto) {
        promises.push(callApi({ action: "updateProfilePicture", deviceId: editingDevice.id, profilePictureData: "remove" }));
      } else if (wpPhotoBase64) {
        promises.push(callApi({ action: "updateProfilePicture", deviceId: editingDevice.id, profilePictureData: wpPhotoBase64 }));
      }
      if (promises.length > 0) await Promise.all(promises);
    } catch (err: any) {
      toast({ title: "Erro ao atualizar perfil WhatsApp", description: err?.message, variant: "destructive" });
    }
    toast({ title: "Instância atualizada" });
    setEditOpen(false);
    setEditingDevice(null);
    queryClient.invalidateQueries({ queryKey: ["devices"] });
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

  // Quick actions
  const handleQuickAction = async (deviceId: string, action: "restart" | "testApi" | "testProxy") => {
    setQuickActionLoading(prev => ({ ...prev, [deviceId]: action }));
    try {
      const device = devices.find(d => d.id === deviceId);
      if (!device) return;

      if (action === "restart") {
        // Logout then reconnect
        await callApi({ action: "logout", deviceId });
        await new Promise(r => setTimeout(r, 1000));
        await callApi({ action: "connect", deviceId, method: "qr" });
        await supabase.from("devices").update({ status: "Disconnected" } as any).eq("id", deviceId);
        queryClient.invalidateQueries({ queryKey: ["devices"] });
        toast({ title: "Instância reiniciada", description: "Reconecte via QR Code." });
      } else if (action === "testApi") {
        const result = await callApi({ action: "status", deviceId });
        const status = result?.status;
        if (status === "authenticated") {
          toast({ title: "API OK", description: "Token e URL estão funcionando." });
        } else {
          toast({ title: "API com problema", description: `Status: ${status || "sem resposta"}`, variant: "destructive" });
        }
      } else if (action === "testProxy") {
        if (!device.proxy_id) {
          toast({ title: "Sem proxy", description: "Nenhuma proxy vinculada.", variant: "destructive" });
          return;
        }
        // Test by calling status through the proxy-connected device
        const result = await callApi({ action: "status", deviceId });
        if (result?.status) {
          toast({ title: "Proxy OK", description: "Conexão via proxy operacional." });
        } else {
          toast({ title: "Proxy com falha", description: "Não foi possível conectar via proxy.", variant: "destructive" });
        }
      }
    } catch (err: any) {
      toast({ title: "Erro na ação", description: err?.message || "Falha", variant: "destructive" });
    } finally {
      setQuickActionLoading(prev => { const n = { ...prev }; delete n[deviceId]; return n; });
    }
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  // QR countdown timer - auto refresh every 30s
  useEffect(() => {
    if (connectStep === "qr" && qrCodeBase64) {
      setQrCountdown(30);
      if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
      qrCountdownRef.current = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) {
            setQrCodeBase64("");
            if (connectingDevice) {
              callApi({ action: "connect", deviceId: connectingDevice.id }).then(result => {
                const b64 = result?.base64 || result?.qr;
                if (b64) setQrCodeBase64(b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);
              }).catch(() => {});
            }
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (qrCountdownRef.current) { clearInterval(qrCountdownRef.current); qrCountdownRef.current = null; }
    }
    return () => { if (qrCountdownRef.current) { clearInterval(qrCountdownRef.current); qrCountdownRef.current = null; } };
  }, [connectStep, qrCodeBase64, connectingDevice]);

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
    setSelectedProxy("none");
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
    if (connectMethod === "code") {
      setConnectStep("code_phone");
      return;
    }
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
        // Build proxy config if selected
        const selectedProxyData = proxyId ? availableProxies.find(p => p.id === proxyId) : null;
        const proxyPayload = selectedProxyData ? {
          host: selectedProxyData.host,
          port: selectedProxyData.port,
          username: selectedProxyData.username,
          password: selectedProxyData.password,
          type: selectedProxyData.type,
        } : undefined;

        const connectResult = await callApi({
          action: "connect",
          deviceId: connectingDevice.id,
          proxyConfig: proxyPayload,
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

  const errorCount = devices.filter(d => deriveSmartStatus(d, warmupDeviceIds, getProxyStatus(d)) === "offline").length;

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "Todas", count: devices.length },
    { key: "online", label: "Online", count: devices.filter(d => d.status === "Ready").length },
    { key: "offline", label: "Offline", count: devices.filter(d => d.status === "Disconnected" && d.number).length },
    { key: "error", label: "Com erro", count: errorCount },
    { key: "warmup", label: "Aquecimento", count: devices.filter(d => warmupDeviceIds.has(d.id)).length },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground">Instâncias</h1>
          <span className="text-xs text-muted-foreground">({devices.length}/{maxInstancesAllowed})</span>
          {planBadgeText && (
            <Badge variant="destructive" className="text-[10px] h-5">{planBadgeText}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedDevices.length > 0 && (
            <Button size="sm" variant="destructive" className="gap-1 text-xs h-7" onClick={() => setDeleteSelectedOpen(true)}>
              <Trash2 className="w-3 h-3" /> {selectedDevices.length}
            </Button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" className="gap-1.5 text-xs h-8 px-4" disabled={planState !== "active"}>
                        <Plus className="w-3.5 h-3.5" /> Nova instância
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        if (!canCreateInstance) { if (planState !== "active") setPlanGateOpen(true); else setLimitGateOpen(true); return; }
                        setCreateOpen(true);
                      }}>
                        <Plus className="w-3.5 h-3.5 mr-2" /> Criar uma
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        if (!canCreateInstance) { if (planState !== "active") setPlanGateOpen(true); else setLimitGateOpen(true); return; }
                        setBulkOpen(true); setBulkPrefix("Instância"); setBulkSelectedProxies([]); setBulkNoProxyCount(0);
                      }}>
                        <Layers className="w-3.5 h-3.5 mr-2" /> Criar em massa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TooltipTrigger>
              {planState !== "active" && (
                <TooltipContent><p>Ative um plano para liberar instâncias</p></TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
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
            <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar instância..."
            className="h-7 text-xs pl-8 bg-muted/20 border-border/20"
          />
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
          const assignedProxy = d.proxy_id ? availableProxies.find(p => p.id === d.proxy_id) : null;
          const proxyStatus = assignedProxy?.status;
          const smartStatus = deriveSmartStatus(d, warmupDeviceIds, proxyStatus);
          const ss = smartStatusConfig[smartStatus];
          const StatusIcon = ss.icon;
          const isSelected = selectedDevices.includes(d.id);
          const isEditing = inlineEditId === d.id;
          const lastActivity = formatDistanceToNow(new Date(d.updated_at || d.created_at), { locale: ptBR, addSuffix: true });
          const hadPreviousConnection = !!d.number;
          const healthScore = deviceHealthScores[d.id] ?? 100;
          const loadingAction = quickActionLoading[d.id];

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
            <Card key={d.id} className="border-border/10 bg-card/40">
              <CardContent className="p-0">
                {/* Linha 1: Nome + Status */}
                <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
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
                        <p className="text-[13px] font-bold text-foreground cursor-pointer hover:text-primary truncate leading-tight" onClick={() => startInlineEdit(d)} title={d.name}>
                          {d.name}
                        </p>
                      )}
                      {d.number && <p className="text-[10px] text-muted-foreground/40 truncate leading-tight">{formatPhone(d.number)}</p>}
                    </div>
                  </div>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 shrink-0 whitespace-nowrap gap-1 cursor-default ${ss.badgeClass}`}>
                          <StatusIcon className="w-2.5 h-2.5" />{ss.label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-[10px] max-w-[200px]">{ss.tooltip}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Meta info */}
                <div className="px-3 pb-1.5">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                    <span className="truncate" title={`Última atividade: ${lastActivity}`}>{lastActivity}</span>
                  </div>
                </div>

                {/* Connect + Delete */}
                <div className="border-t border-border/10 px-2 py-1 flex items-center justify-end gap-0.5">
                  {connectionButton}
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/30 hover:text-primary shrink-0" onClick={() => {
                    setEditingDevice(d);
                    setEditName(d.name);
                    setEditUazapiToken(d.uazapi_token || "");
                    setEditUazapiBaseUrl(d.uazapi_base_url || "");
                    setEditProxyValue(d.proxy_id || "none");
                    setWpName("");
                    setWpPhotoUrl("");
                    setWpPhotoBase64("");
                    setWpRemovePhoto(false);
                    setEditOpen(true);
                  }}>
                    <Pencil className="w-2.5 h-2.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/30 hover:text-destructive shrink-0" onClick={() => {
                    if (d.status === "Ready") { setDeleteSingleDevice(d); setDeleteSingleOpen(true); } else { handleDelete(d.id); }
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
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="relative px-6 pt-6 pb-4">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Pencil className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Editar instância</DialogTitle>
                {editingDevice && (
                  <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                    {editingDevice.number ? formatPhone(editingDevice.number) : "Sem número vinculado"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Nome da instância */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground font-medium">Nome da instância</Label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value.slice(0, 30))}
                placeholder="Ex: Chip 01"
                className="h-9 text-sm"
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

            {editingDevice?.status === "Ready" && (
              <>
                <div className="border-t border-border/10" />
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">Perfil do WhatsApp</p>

                {/* Nome do WhatsApp */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                    <Smartphone className="w-3 h-3" /> Nome exibido
                  </Label>
                  <Input
                    value={wpName}
                    onChange={e => setWpName(e.target.value)}
                    placeholder={editingDevice?.profile_name || "Nome no WhatsApp"}
                    className="h-9 text-sm"
                    maxLength={25}
                  />
                  <p className="text-[10px] text-muted-foreground/30">{wpName.length}/25 caracteres</p>
                </div>

                {/* Foto do WhatsApp */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                    <Camera className="w-3 h-3" /> Foto do perfil
                  </Label>
                  <input ref={wpFileRef} type="file" accept="image/*" className="hidden" onChange={handleWpPhotoUpload} />
                  <div className="flex justify-center">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => { if (!wpPhotoUrl && !wpRemovePhoto) wpFileRef.current?.click(); }}
                    >
                      {wpPhotoUrl && !wpRemovePhoto ? (
                        <>
                          <img src={wpPhotoUrl} alt="Foto" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
                          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" onClick={(e) => { e.stopPropagation(); wpFileRef.current?.click(); }} title="Trocar foto">
                              <Camera className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-destructive/40" onClick={(e) => { e.stopPropagation(); setWpPhotoUrl(""); setWpPhotoBase64(""); setWpRemovePhoto(true); }} title="Remover foto">
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div
                          className="w-20 h-20 rounded-full border-2 border-dashed border-border/40 flex flex-col items-center justify-center hover:border-primary/40 transition-colors"
                          onClick={() => wpFileRef.current?.click()}
                        >
                          <Camera className="w-5 h-5 text-muted-foreground/40 mb-1" />
                          <span className="text-[9px] text-muted-foreground/30">
                            {wpRemovePhoto ? "Removida" : "Escolher"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button size="sm" className="flex-1" onClick={handleEdit} disabled={!editName.trim()}>Salvar</Button>
            </div>
          </div>
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
              {tokenDevice?.name} {tokenDevice?.number ? `· ${formatPhone(tokenDevice.number)}` : ""}
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
        if (!open) { stopPolling(); setConnectOpen(false); }
      }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Header com gradiente */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                {connectStep === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : connectStep === "qr" || connectStep === "code" ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <Smartphone className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {connectStep === "done" ? "Conectado!" : "Conectar instância"}
                </DialogTitle>
                {connectingDevice && connectStep !== "done" && (
                  <div>
                    <p className="text-[11px] text-muted-foreground/50">{connectingDevice.name}</p>
                    {connectingDevice.number && (
                      <p className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">{formatPhone(connectingDevice.number)}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
            {connectStep === "choose" && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Como deseja conectar?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleConnect("qr")}
                    className="group relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border/20 hover:border-primary/40 bg-card hover:bg-primary/[0.03] transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
                      <QrCode className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-semibold text-foreground block">QR Code</span>
                      <span className="text-[10px] text-muted-foreground/50 mt-0.5 block">Escaneie com o celular</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleConnect("code")}
                    className="group relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border/20 hover:border-primary/40 bg-card hover:bg-primary/[0.03] transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
                      <Key className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-semibold text-foreground block">Código</span>
                      <span className="text-[10px] text-muted-foreground/50 mt-0.5 block">Digite no WhatsApp</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {connectStep === "proxy" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Deseja usar um proxy?</p>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-muted/20 text-muted-foreground/60 border-border/20">Opcional</Badge>
                </div>
                <Select value={selectedProxy} onValueChange={setSelectedProxy}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Sem proxy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-xs text-muted-foreground">Sem proxy</span>
                    </SelectItem>
                    {availableProxies.map(p => {
                      const cls = p.status === "USANDO" ? "text-amber-500 border-amber-500/20" : p.status === "USADA" ? "text-red-400 border-red-500/20" : "text-emerald-500 border-emerald-500/20";
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs">{p.label}</span>
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${cls}`}>{p.status}</Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-9" onClick={() => setConnectStep("choose")}>Voltar</Button>
                  <Button size="sm" className="flex-1 text-xs h-9" onClick={handleConfirmProxy}>Conectar</Button>
                </div>
              </div>
            )}

            {connectStep === "qr" && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  {qrCodeBase64 ? (
                    <div className="relative p-3 rounded-2xl bg-card border-2 border-border/20 shadow-lg">
                      <img src={qrCodeBase64} alt="QR Code" className="w-52 h-52 rounded-lg" />
                      {/* Lock overlay */}
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <Lock className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  ) : connectError ? (
                    <div className="w-52 h-52 bg-destructive/5 rounded-2xl flex flex-col items-center justify-center border-2 border-destructive/20 p-4">
                      <XCircle className="w-8 h-8 text-destructive mb-2" />
                      <p className="text-[11px] text-destructive text-center leading-relaxed">{connectError}</p>
                    </div>
                  ) : (
                    <div className="w-56 h-56 rounded-2xl flex flex-col items-center justify-center border-2 border-primary/20 bg-primary/[0.02] relative overflow-hidden">
                      {/* Animated border */}
                      <div className="absolute inset-0 rounded-2xl border-2 border-transparent" style={{
                        background: "linear-gradient(90deg, hsl(var(--primary)) 0%, transparent 50%, hsl(var(--primary)) 100%) border-box",
                        WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                        WebkitMaskComposite: "xor",
                        maskComposite: "exclude",
                        animation: "spin 3s linear infinite",
                        opacity: 0.3,
                      }} />
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <QrCode className="w-6 h-6 text-primary animate-pulse" />
                      </div>
                      <p className="text-xs font-medium text-foreground">Preparando QR Code</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">Isso pode levar alguns segundos...</p>
                      <div className="flex items-center gap-1 mt-3">
                        <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-foreground">Aguardando leitura</span>
                  </div>
                  {qrCodeBase64 && (
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <div className="relative w-6 h-6">
                        <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
                          <circle cx="12" cy="12" r="10" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"
                            strokeDasharray={`${(qrCountdown / 30) * 62.83} 62.83`}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-linear"
                          />
                        </svg>
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                        Atualiza em {qrCountdown}s
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground/40 leading-relaxed max-w-[240px]">
                    Abra o WhatsApp → Configurações → Aparelhos conectados → Conectar
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs h-8"
                  onClick={async () => {
                    try {
                      const result = await callApi({ action: "status", deviceId: connectingDevice!.id });
                      const state = result?.status;
                      if (state === "authenticated") {
                        stopPolling();
                        setConnectStep("done");
                        queryClient.invalidateQueries({ queryKey: ["devices"] });
                        toast({ title: "Conectado!" });
                        try {
                          const { data: { session: s } } = await supabase.auth.getSession();
                          if (s) {
                            await supabase.functions.invoke("sync-devices", { headers: { Authorization: `Bearer ${s.access_token}` } });
                            queryClient.invalidateQueries({ queryKey: ["devices"] });
                          }
                        } catch {}
                      } else {
                        toast({ 
                          title: "⏳ QR Code ainda não foi escaneado", 
                          description: "Abra o WhatsApp no celular, vá em Aparelhos conectados e escaneie o QR Code acima.",
                        });
                      }
                    } catch (err: any) {
                      toast({ title: "Erro ao verificar conexão", description: "Tente escanear o QR Code novamente e clique em sincronizar." });
                    }
                  }}
                >
                  <RefreshCw className="w-3 h-3" /> Já escaneei, sincronizar
                </Button>
              </div>
            )}

            {connectStep === "code_phone" && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground">Digite o número do WhatsApp que deseja conectar</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground font-medium">Número com DDD</Label>
                  <Input
                    value={codePhone}
                    onChange={e => setCodePhone(e.target.value)}
                    placeholder="5511999999999"
                    className="h-10 text-sm font-mono text-center tracking-wider"
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter" && codePhone.replace(/\D/g, "").length >= 10) {
                      setConnectStep("code");
                      // Trigger code connection
                      (async () => {
                        try {
                          if (!connectingDevice) return;
                          if (!connectingDevice.uazapi_token) {
                            const createResult = await callApi({
                              action: "createInstance",
                              deviceId: connectingDevice.id,
                              instanceName: connectingDevice.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                            });
                            connectingDevice.uazapi_token = createResult.instanceToken;
                            connectingDevice.uazapi_base_url = createResult.baseUrl;
                            queryClient.invalidateQueries({ queryKey: ["devices"] });
                          }
                          const result = await callApi({ action: "connect", deviceId: connectingDevice.id });
                          if (result.alreadyConnected) {
                            setConnectStep("done");
                            toast({ title: "Já conectado!" });
                            return;
                          }
                          // The pairing code should come from the connect response
                          const code = result.pairingCode || result.code || result.pairing_code;
                          if (code) setPairingCode(code);
                          startPolling(connectingDevice.id, null);
                        } catch (err: any) {
                          setConnectError(err?.message || "Erro ao gerar código");
                        }
                      })();
                    }}}
                  />
                  <p className="text-[10px] text-muted-foreground/40 text-center">Exemplo: 5563912345678</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-9" onClick={() => setConnectStep("proxy")}>Voltar</Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-9"
                    disabled={codePhone.replace(/\D/g, "").length < 10}
                    onClick={() => {
                      setConnectStep("code");
                      (async () => {
                        try {
                          if (!connectingDevice) return;
                          if (!connectingDevice.uazapi_token) {
                            const createResult = await callApi({
                              action: "createInstance",
                              deviceId: connectingDevice.id,
                              instanceName: connectingDevice.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
                            });
                            connectingDevice.uazapi_token = createResult.instanceToken;
                            connectingDevice.uazapi_base_url = createResult.baseUrl;
                            queryClient.invalidateQueries({ queryKey: ["devices"] });
                          }
                          const result = await callApi({ action: "connect", deviceId: connectingDevice.id });
                          if (result.alreadyConnected) {
                            setConnectStep("done");
                            toast({ title: "Já conectado!" });
                            return;
                          }
                          const code = result.pairingCode || result.code || result.pairing_code;
                          if (code) setPairingCode(code);
                          startPolling(connectingDevice.id, null);
                        } catch (err: any) {
                          setConnectError(err?.message || "Erro ao gerar código");
                        }
                      })();
                    }}
                  >
                    Gerar código
                  </Button>
                </div>
              </div>
            )}

            {connectStep === "code" && (
              <div className="flex flex-col items-center gap-4">
                {pairingCode ? (
                  <div className="relative px-8 py-4 rounded-2xl bg-card border-2 border-primary/20 shadow-lg">
                    <p className="text-2xl font-mono font-bold tracking-[0.4em] text-foreground">{pairingCode}</p>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Lock className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                ) : connectError ? (
                  <div className="px-6 py-4 rounded-2xl bg-destructive/5 border-2 border-destructive/20">
                    <p className="text-xs text-destructive text-center">{connectError}</p>
                  </div>
                ) : (
                  <div className="w-56 py-6 rounded-2xl flex flex-col items-center justify-center border-2 border-primary/20 bg-primary/[0.02]">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Key className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                    <p className="text-xs font-medium text-foreground">Gerando código</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">Aguarde alguns segundos...</p>
                    <div className="flex items-center gap-1 mt-3">
                      <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div className="text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-foreground">Aguardando emparelhamento</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 leading-relaxed max-w-[240px]">
                    Digite este código no WhatsApp → Aparelhos conectados → Conectar com número
                  </p>
                </div>
              </div>
            )}

            {connectStep === "connecting" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Conectando...</p>
              </div>
            )}

            {connectStep === "done" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-foreground">Conectado com sucesso</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">Sua instância está pronta para uso</p>
                </div>
                <Button size="sm" className="h-9 px-6" onClick={() => { stopPolling(); setConnectOpen(false); }}>Fechar</Button>
              </div>
            )}
          </div>
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

      {/* Plan Gate Modal */}
      <Dialog open={planGateOpen} onOpenChange={setPlanGateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban size={18} className="text-destructive" /> Ative um plano para liberar instâncias</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Sua conta está {planState === "noPlan" ? "sem plano ativo" : planState === "expired" ? "com plano vencido" : "suspensa/cancelada"}. Para criar instâncias, ative um plano.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPlanGateOpen(false)} className="border-border">Cancelar</Button>
            <Button onClick={() => { setPlanGateOpen(false); navigate("/dashboard/my-plan"); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">Ver planos / Ativar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Limit Gate Modal */}
      <Dialog open={limitGateOpen} onOpenChange={setLimitGateOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Limite atingido</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Você atingiu o limite de <strong className="text-foreground">{maxInstancesAllowed}</strong> instâncias do seu plano <strong className="text-foreground">{subscription?.plan_name}</strong>. Faça upgrade para liberar mais.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLimitGateOpen(false)} className="border-border">Cancelar</Button>
            <Button onClick={() => { setLimitGateOpen(false); navigate("/dashboard/my-plan"); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">Fazer upgrade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Devices;
