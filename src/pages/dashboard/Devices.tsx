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
  profile_picture: string | null;
  profile_name: string | null;
  created_at: string;
  updated_at: string;
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
  // Always: +CC DD XXXXX-XXXX (dash before last 4 digits)
  if (digits.length === 13) return `+${digits.slice(0,2)} ${digits.slice(2,4)} ${digits.slice(4,9)}-${digits.slice(9)}`;
  if (digits.length === 12) return `+${digits.slice(0,2)} ${digits.slice(2,4)} ${digits.slice(4,8)}-${digits.slice(8)}`;
  if (digits.length === 14) return `+${digits.slice(0,2)} ${digits.slice(2,4)} ${digits.slice(4,10)}-${digits.slice(10)}`;
  if (digits.length === 11) return `+55 ${digits.slice(0,2)} ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `+55 ${digits.slice(0,2)} ${digits.slice(2,6)}-${digits.slice(6)}`;
  // Fallback: add country code and format with dash before last 4
  if (digits.length >= 8) {
    const last4 = digits.slice(-4);
    const rest = digits.slice(0, -4);
    return `+${rest}-${last4}`;
  }
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
  const [connectStep, setConnectStep] = useState<"choose" | "proxy" | "qr" | "code_phone" | "code" | "connecting" | "done">("proxy");
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
      const [devicesRes, tokensRes] = await Promise.all([
        supabase
          .from("devices")
          .select("id, name, number, status, login_type, proxy_id, profile_picture, profile_name, created_at, updated_at, instance_type")
          .neq("login_type", "report_wa")
          .order("created_at", { ascending: true })
          .order("id", { ascending: true }),
        supabase
          .from("user_api_tokens")
          .select("device_id")
          .not("device_id", "is", null)
          .eq("status", "in_use"),
      ]);
      if (devicesRes.error) throw devicesRes.error;
      const configuredDeviceIds = new Set(
        (tokensRes.data || []).map((t: any) => t.device_id)
      );
      return (devicesRes.data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        number: d.number || "",
        status: d.status as "Ready" | "Disconnected" | "Loading",
        login_type: d.login_type,
        proxy_id: d.proxy_id,
        profile_picture: d.profile_picture || null,
        profile_name: d.profile_name || null,
        created_at: d.created_at,
        updated_at: d.updated_at,
        has_api_config: configuredDeviceIds.has(d.id),
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
        .select("plan_name, plan_price, max_instances, expires_at")
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
        .gte("created_at", sevenDaysAgo.toISOString())
        .limit(1000);
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
        .gte("created_at", sevenDaysAgo.toISOString())
        .limit(1000);
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
      if (!d.has_api_config) score -= 30;
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
        .select("id, host, port, username, password, type, status, display_id, active")
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
    mutationFn: async (device: { name: string; login_type: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-devices", {
        body: { action: "create", name: device.name, login_type: device.login_type },
      });
      if (error) {
        let realMsg = data?.error || "";
        if (!realMsg && error.message) {
          const jsonMatch = error.message.match(/\{"error"\s*:\s*"([^"]+)"\}/);
          realMsg = jsonMatch?.[1] || error.message;
        }
        throw new Error(realMsg || "Erro ao criar instância");
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      // Optimistic: add the new device to cache immediately
      if (data?.device) {
        queryClient.setQueryData(["devices"], (old: Device[] | undefined) => {
          if (!old) return old;
          return [...old, {
            id: data.device.id,
            name: data.device.name,
            number: data.device.number || "",
            status: data.device.status || "Disconnected",
            login_type: data.device.login_type || "qr",
            proxy_id: data.device.proxy_id || null,
            profile_picture: null,
            profile_name: null,
            created_at: data.device.created_at || new Date().toISOString(),
            updated_at: data.device.updated_at || new Date().toISOString(),
            has_api_config: false,
          } as Device];
        });
      }
      // Background refresh for accurate data
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });
      toast({ title: "Instância criada" });
    },
    onError: (err: any) => {
      const msg = err?.message || "";
      if (msg.includes("device_limit") || msg.includes("Limite")) {
        toast({ title: `Seu plano permite apenas ${maxInstancesAllowed} instâncias`, variant: "destructive" });
      } else {
        toast({ title: "Erro ao criar instância", description: msg, variant: "destructive" });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("manage-devices", {
        body: { action: "delete", deviceId: id },
      });
      if (error) throw new Error(error.message || "Erro ao excluir instância");
      if (data?.error) throw new Error(data.error);
      return { id };
    },
    onMutate: async (id: string) => {
      // Optimistic: remove from cache immediately
      await queryClient.cancelQueries({ queryKey: ["devices"] });
      const previous = queryClient.getQueryData<Device[]>(["devices"]);
      queryClient.setQueryData(["devices"], (old: Device[] | undefined) =>
        old ? old.filter(d => d.id !== id) : old
      );
      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sidebar-stats"] });
      toast({ title: "Instância removida" });
    },
    onError: (err: any, _id, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(["devices"], context.previous);
      }
      console.error("Delete error:", err);
      toast({ title: "Erro ao apagar instância", description: err?.message || "Erro desconhecido", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
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
    createMutation.mutate({ name: instanceName, login_type: loginType });
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
    if (planState !== "active") {
      setPlanGateOpen(true);
      return;
    }
    const remaining = maxInstancesAllowed - devices.length;
    if (totalCount > remaining) {
      toast({ 
        title: `Seu plano permite apenas ${maxInstancesAllowed} instância${maxInstancesAllowed !== 1 ? "s" : ""}`, 
        description: remaining > 0 
          ? `Você já possui ${devices.length} instância${devices.length !== 1 ? "s" : ""}. Só é possível criar mais ${remaining}.`
          : `Você já atingiu o limite de ${maxInstancesAllowed} instância${maxInstancesAllowed !== 1 ? "s" : ""} do seu plano.`,
        variant: "destructive" 
      });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("manage-devices", {
        body: {
          action: "bulk-create",
          prefix: bulkPrefix,
          proxyIds: bulkSelectedProxies,
          noProxyCount: bulkNoProxyCount,
          startIndex: devices.length + 1,
        },
      });
      if (error) throw new Error(error.message || "Erro ao criar instâncias");
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: `${totalCount} instância${totalCount !== 1 ? "s" : ""} criada${totalCount !== 1 ? "s" : ""}` });
      setBulkOpen(false);
    } catch (err: any) {
      const msg = err?.message || "";
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      if (msg.includes("Limite") || msg.includes("LIMIT")) {
        toast({ title: "Limite de instâncias atingido", description: msg, variant: "destructive" });
      } else {
        toast({ title: "Erro ao criar instâncias", description: msg, variant: "destructive" });
      }
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
    setEditProxyValue(device.proxy_id || "none");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingDevice || !editName.trim()) return;
    const newProxyId = editProxyValue === "none" ? null : editProxyValue;
    updateMutation.mutate({
      id: editingDevice.id,
      updates: {
        name: editName,
        proxy_id: newProxyId,
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
      if (promises.length > 0) {
        const results = await Promise.all(promises);
        console.log("Profile update results:", results);
        const anyFailed = results.some(r => r?.success === false);
        if (anyFailed) {
          toast({ title: "Aviso", description: "Alguns endpoints de perfil não responderam. Verifique se o chip está conectado.", variant: "destructive" });
        }
      }
    } catch (err: any) {
      console.error("Profile update error:", err);
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

  // Token management is handled server-side only

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
      // Upload to Supabase Storage and get public URL
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `profile-pictures/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("media").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      console.log("Photo uploaded, public URL:", publicUrl);
      setWpPhotoBase64(publicUrl); // Store URL instead of base64
      setWpPhotoUrl(URL.createObjectURL(file));
      setWpRemovePhoto(false);
      toast({ title: "Foto carregada" });
    } catch (err: any) {
      console.error("Photo upload error:", err);
      toast({ title: "Erro ao enviar foto", description: err?.message, variant: "destructive" });
    } finally {
      setWpUploading(false);
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
      updates: { status: "Disconnected", number: "", proxy_id: null, profile_picture: null, profile_name: null },
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
    // When edge function returns non-2xx, supabase puts generic error in response.error
    // but the real error message is in response.data
    if (response.error) {
      const realError = response.data?.error || response.error?.message || "Erro na Edge Function";
      const code = response.data?.code;
      return { error: realError, code };
    }
    return response.data;
  };

  // Quick actions
  const handleQuickAction = async (deviceId: string, action: "restart" | "testApi" | "testProxy") => {
    setQuickActionLoading(prev => ({ ...prev, [deviceId]: action }));
    try {
      const device = devices.find(d => d.id === deviceId);
      if (!device) return;

      if (action === "restart") {
        // Disconnect WhatsApp session (keeps token/instance intact)
        await callApi({ action: "logout", deviceId });
        await supabase.from("devices").update({ status: "Disconnected" } as any).eq("id", deviceId);
        queryClient.invalidateQueries({ queryKey: ["devices"] });
        toast({ title: "Instância desconectada", description: "Reconecte via QR Code para reutilizar a mesma instância." });
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
            // DON'T clear qrCodeBase64 — keep old QR visible while fetching new one
            if (connectingDevice) {
              callApi({ action: "refreshQr", deviceId: connectingDevice.id }).then(result => {
                if (result?.alreadyConnected) {
                  setConnectStep("done");
                  queryClient.invalidateQueries({ queryKey: ["devices"] });
                  return;
                }
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
        // Check for duplicate phone error
        if (result?.error && result?.code === "DUPLICATE_PHONE") {
          clearInterval(interval);
          setPollingInterval(null);
          setConnectError(result.error);
          setQrCodeBase64("");
          queryClient.invalidateQueries({ queryKey: ["devices"] });
          return;
        }
        const apiStatus = result?.status;
        // Status polling check
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
      } catch (err: any) {
        console.error("Polling error:", err);
      }
    }, 3000);
    setPollingInterval(interval);
  };

  // Connect
  const openConnect = async (device: Device) => {
    if (planState !== "active") {
      setPlanGateOpen(true);
      return;
    }
    setConnectingDevice(device);
    setConnectStep("proxy");
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
    } else if (selectedProxy === "none" && connectingDevice.proxy_id) {
      // User explicitly chose "sem proxy" — clear old proxy from device
      await supabase.from("devices").update({ proxy_id: null } as any).eq("id", connectingDevice.id);
      // Release old proxy back to USADA
      await supabase.from("proxies").update({ status: "USADA" } as any).eq("id", connectingDevice.proxy_id);
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
    }

    setConnectError("");
    if (connectMethod === "code") {
      setConnectStep("code_phone");
      return;
    }
    setConnectStep(connectMethod);

    try {
      // Build proxy config: use newly selected proxy; do NOT fallback to old proxy when user chose "none"
      const selectedProxyData = proxyId ? availableProxies.find(p => p.id === proxyId) : null;
      const proxyPayload = selectedProxyData ? {
        host: selectedProxyData.host,
        port: selectedProxyData.port,
        username: selectedProxyData.username,
        password: selectedProxyData.password,
        type: selectedProxyData.type,
      } : undefined;

      // Single connect call — edge function handles everything
      const connectResult = await callApi({
        action: "connect",
        deviceId: connectingDevice.id,
        proxyConfig: proxyPayload,
        proxyId: proxyId || undefined,
      });

      // Check for any error returned by the edge function
      if (connectResult?.error) {
        setConnectError(connectResult.error);
        if (connectResult?.code === "PROXY_FAILED" || connectResult?.code === "DUPLICATE_PHONE") {
          setConnectStep("proxy");
        }
        queryClient.invalidateQueries({ queryKey: ["devices"] });
        toast({ title: "Erro de conexão", description: connectResult.error, variant: "destructive" });
        return;
      }

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
      } else {
        throw new Error("QR Code não retornado. Tente novamente.");
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
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-foreground truncate">Instâncias</h1>
          <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">({devices.length}/{maxInstancesAllowed})</span>
          {planBadgeText && (
            <Badge variant="destructive" className="text-[9px] sm:text-[10px] h-4 sm:h-5 shrink-0">{planBadgeText}</Badge>
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
                const total = result.devices?.length || 0;
                const found = result.devices?.filter((d: any) => d.found).length || 0;
                queryClient.invalidateQueries({ queryKey: ["devices"] });
                queryClient.invalidateQueries({ queryKey: ["proxies"] });
                toast({ 
                  title: "✅ Sincronização concluída", 
                  description: `${found} de ${total} instância${total !== 1 ? "s" : ""} ${found !== 1 ? "encontradas" : "encontrada"} online.` 
                });
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
            <Card key={d.id} className="rounded-2xl border border-border/40 bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-5 pt-6 space-y-4">
                {/* Header: Avatar + Name + Badge */}
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {d.profile_picture ? (
                      <img 
                        src={d.profile_picture} 
                        alt={d.name} 
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/40 shadow-sm" 
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                          const fallback = img.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-12 h-12 rounded-full items-center justify-center text-lg font-bold shadow-sm ${smartStatus === 'online' ? 'bg-emerald-500 text-white ring-2 ring-emerald-500/40' : 'bg-muted text-muted-foreground ring-2 ring-border'}`}
                      style={{ display: d.profile_picture ? 'none' : 'flex' }}
                    >
                      {d.name.charAt(0).toUpperCase()}
                    </div>
                    {smartStatus === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
                    )}
                  </div>
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
                        className="text-base font-bold text-foreground bg-transparent border-b-2 border-primary outline-none w-full"
                      />
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-bold text-foreground cursor-pointer hover:text-primary truncate" onClick={() => startInlineEdit(d)} title={d.name}>
                          {d.name}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">ID: {devices.indexOf(d) + 1}</p>
                  </div>
                </div>

                {/* Status + Phone */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-4 h-4 ${smartStatus === 'online' ? 'text-emerald-500' : 'text-red-500'}`} />
                    <span className={`text-sm font-semibold ${smartStatus === 'online' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {ss.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Smartphone className="w-4 h-4 shrink-0" />
                    <span>{d.number ? formatPhone(d.number) : "Número não definido"}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {d.status === "Ready" ? (
                    <Button variant="outline" size="sm" className="h-9 gap-2 text-sm rounded-lg text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive font-medium" onClick={() => openLogout(d)}>
                      <Power className="w-4 h-4" /> Desconectar
                    </Button>
                  ) : hadPreviousConnection ? (
                    <>
                      <Button variant="outline" size="sm" className="h-9 gap-2 text-sm rounded-lg font-medium" onClick={() => openConnect(d)}>
                        <RefreshCw className="w-4 h-4" /> Tentar novamente
                      </Button>
                      <Button size="sm" className="h-9 gap-2 text-sm rounded-lg font-medium bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => openConnect(d)}>
                        <QrCode className="w-4 h-4" /> Novo QR Code
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" className="h-9 gap-2 text-sm rounded-lg font-medium bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => openConnect(d)}>
                      <QrCode className="w-4 h-4" /> Novo QR Code
                    </Button>
                  )}
                </div>

                {/* Edit + Delete */}
                <div className="flex items-center gap-5 pt-1">
                  <button
                    className="flex items-center gap-1.5 text-sm text-primary dark:text-primary hover:text-primary/80 dark:hover:text-primary/80 transition-colors font-medium"
                    onClick={() => {
                      setEditingDevice(d);
                      setEditName(d.name);
                      setEditProxyValue(d.proxy_id || "none");
                      setWpName("");
                      setWpPhotoUrl("");
                      setWpPhotoBase64("");
                      setWpRemovePhoto(false);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" /> Editar
                  </button>
                  <button
                    className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors font-medium"
                    onClick={() => {
                      if (d.status === "Ready") { setDeleteSingleDevice(d); setDeleteSingleOpen(true); } else { handleDelete(d.id); }
                    }}
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
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
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <div className="relative px-6 pt-6 pb-4 border-b border-border/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Nova instância</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Crie uma nova conexão WhatsApp</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Nome da instância</Label>
              <Input
                value={instanceName}
                onChange={e => setInstanceName(e.target.value)}
                placeholder="Ex: Chip 01"
                className="h-11 text-sm rounded-xl"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button className="flex-1 h-11 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleCreate} disabled={!instanceName.trim()}>Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Header com avatar do device */}
          <div className="relative px-6 pt-6 pb-4 border-b border-border/20">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-4">
              {editingDevice?.profile_picture ? (
                <img src={editingDevice.profile_picture} alt="" className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/20 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Pencil className="w-5 h-5 text-emerald-400" />
                </div>
              )}
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold truncate">Editar instância</DialogTitle>
                {editingDevice && (
                  <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                    {editingDevice.profile_name || editingDevice.name}
                    {editingDevice.number ? ` · ${formatPhone(editingDevice.number)}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Nome da instância */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Nome da instância</Label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value.slice(0, 30))}
                placeholder="Ex: Chip 01"
                className="h-11 text-sm rounded-xl bg-muted/20 border-border/30 focus:border-emerald-500/40 transition-colors"
                maxLength={30}
              />
              <div className="flex items-center justify-between">
                <div>
                  {editName.trim() && devices.some(d => d.name.toLowerCase() === editName.trim().toLowerCase() && d.id !== editingDevice?.id) && (
                    <span className="text-[11px] text-amber-500 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Nome já em uso
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground/40 tabular-nums">{editName.length}/30</span>
              </div>
            </div>

            {editingDevice?.status === "Ready" && (
              <div className="space-y-4 rounded-xl border border-border/15 bg-muted/[0.04] p-4">
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] font-semibold">Perfil do WhatsApp</p>

                {/* Nome do WhatsApp */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400/60" /> Nome exibido
                  </Label>
                  <Input
                    value={wpName}
                    onChange={e => setWpName(e.target.value)}
                    placeholder={editingDevice?.profile_name || "Nome no WhatsApp"}
                    className="h-11 text-sm rounded-xl bg-background/50 border-border/30 focus:border-emerald-500/40 transition-colors"
                    maxLength={25}
                  />
                  <p className="text-[11px] text-muted-foreground/40 tabular-nums">{wpName.length}/25 caracteres</p>
                </div>

                {/* Foto do WhatsApp */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400/60" /> Foto do perfil
                  </Label>
                  <input ref={wpFileRef} type="file" accept="image/*" className="hidden" onChange={handleWpPhotoUpload} />
                  <div className="flex justify-center py-1">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => { if (!wpPhotoUrl && !wpRemovePhoto) wpFileRef.current?.click(); }}
                    >
                      {wpPhotoUrl && !wpRemovePhoto ? (
                        <>
                          <img src={wpPhotoUrl} alt="Foto" className="w-20 h-20 rounded-full object-cover ring-[3px] ring-emerald-500/20 shadow-lg" />
                          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); wpFileRef.current?.click(); }} title="Trocar foto">
                              <Camera className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-destructive/40" onClick={(e) => { e.stopPropagation(); setWpPhotoUrl(""); setWpPhotoBase64(""); setWpRemovePhoto(true); }} title="Remover foto">
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div
                          className="w-20 h-20 rounded-full border-2 border-dashed border-border/30 flex flex-col items-center justify-center hover:border-primary/30 transition-colors"
                          onClick={() => wpFileRef.current?.click()}
                        >
                          <Camera className="w-5 h-5 text-muted-foreground/30 mb-0.5" />
                          <span className="text-[9px] text-muted-foreground/30">
                            {wpRemovePhoto ? "Removida" : "Escolher"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold border-border/30" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button className="flex-1 h-11 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" onClick={handleEdit} disabled={!editName.trim()}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Token management is handled automatically via admin panel */}

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
        if (!open) { stopPolling(); setConnectStep("proxy"); setConnectOpen(false); }
      }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 border-b border-border/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${connectStep === "done" ? "bg-emerald-500/15" : "bg-primary/10"}`}>
                {connectStep === "done" ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : connectStep === "qr" || connectStep === "code" ? (
                  <QrCode className="w-6 h-6 text-primary" />
                ) : (
                  <Smartphone className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {connectStep === "done" ? "Conectado com sucesso!" : connectStep === "qr" ? "Escaneie o QR Code" : connectStep === "code" ? "Código de pareamento" : "Conectar WhatsApp"}
                </DialogTitle>
                {connectingDevice && connectStep !== "done" && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {connectingDevice.name}{connectingDevice.number ? ` · ${formatPhone(connectingDevice.number)}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 pt-5">
            {connectStep === "choose" && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">Conecte seu WhatsApp escaneando o QR Code:</p>
                <div className="flex justify-center">
                  <button
                    onClick={() => handleConnect("qr")}
                    className="group relative flex flex-col items-center gap-4 p-8 rounded-2xl border-2 border-border/30 hover:border-primary/50 bg-card hover:bg-primary/[0.04] transition-all duration-200 w-full max-w-[220px]"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <QrCode className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-bold text-foreground block">Conectar via QR Code</span>
                      <span className="text-xs text-muted-foreground mt-1 block">Escaneie com o celular</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {connectStep === "proxy" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Deseja usar um proxy?</p>
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/20 text-muted-foreground/60 border-border/20">Opcional</Badge>
                </div>
                <Select value={selectedProxy} onValueChange={setSelectedProxy}>
                  <SelectTrigger className="h-11 text-sm rounded-xl">
                    <SelectValue placeholder="Sem proxy" />
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" className="max-h-[250px]">
                    <SelectItem value="none">
                      <span className="text-sm text-muted-foreground">Sem proxy</span>
                    </SelectItem>
                    {availableProxies.map(p => {
                      const cls = p.status === "USANDO" ? "text-amber-500 border-amber-500/20 bg-amber-500/10" : p.status === "USADA" ? "text-red-400 border-red-500/20 bg-red-500/10" : "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{p.label}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-semibold ${cls}`}>{p.status}</Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-3 pt-1">
                  <Button variant="outline" className="flex-1 h-11 rounded-xl font-semibold" onClick={() => { stopPolling(); setConnectStep("proxy"); setConnectOpen(false); }}>Cancelar</Button>
                  <Button className="flex-1 h-11 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleConfirmProxy}>Conectar</Button>
                </div>
              </div>
            )}

            {connectStep === "qr" && (
              <div className="flex flex-col items-center gap-5">
                {/* QR Code display */}
                <div className="relative w-[272px] h-[272px]">
                  {/* Loading state */}
                  <div
                    className={`absolute inset-0 w-64 h-64 m-auto rounded-2xl flex flex-col items-center justify-center border border-primary/20 bg-gradient-to-b from-primary/[0.03] to-transparent overflow-hidden transition-all duration-500 ease-out ${
                      !qrCodeBase64 && !connectError ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    }`}
                  >
                    <div
                      className="absolute left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent rounded-full"
                      style={{ animation: "scanLine 2.5s ease-in-out infinite" }}
                    />
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4" style={{ animation: "qrPulse 2s ease-in-out infinite" }}>
                      <QrCode className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">Gerando QR Code...</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">Aguarde alguns segundos</p>
                  </div>

                  {/* Error state */}
                  <div
                    className={`absolute inset-0 w-64 h-64 m-auto bg-destructive/5 rounded-2xl flex flex-col items-center justify-center border-2 border-destructive/20 p-6 transition-all duration-500 ease-out ${
                      connectError ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    }`}
                  >
                    <XCircle className="w-10 h-10 text-destructive mb-3" />
                    <p className="text-sm text-destructive text-center leading-relaxed">{connectError}</p>
                  </div>

                  {/* QR Code */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
                      qrCodeBase64 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    }`}
                  >
                    <div className="relative p-4 rounded-2xl bg-white dark:bg-white shadow-lg">
                      <img src={qrCodeBase64} alt="QR Code" className="w-64 h-64 rounded-lg transition-opacity duration-300" />
                      {/* Countdown overlay */}
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-card border border-border/30 rounded-full px-3 py-1 shadow-sm">
                        <svg className="w-4 h-4 -rotate-90" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
                          <circle cx="12" cy="12" r="10" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"
                            strokeDasharray={`${(qrCountdown / 30) * 62.83} 62.83`}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-linear"
                          />
                        </svg>
                        <span className="text-[11px] text-muted-foreground font-medium tabular-nums">{qrCountdown}s</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="w-full bg-muted/30 rounded-xl p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-foreground mb-2">Como conectar:</p>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-muted-foreground">Abra o <span className="font-medium text-foreground">WhatsApp</span> no celular</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-muted-foreground">Toque em <span className="font-medium text-foreground">Configurações → Aparelhos conectados</span></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-muted-foreground">Toque em <span className="font-medium text-foreground">Conectar um aparelho</span> e escaneie o código</p>
                  </div>
                </div>

                {/* Sync button */}
                <Button
                  variant="outline"
                  className="gap-2 h-9 text-sm w-full"
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
                          description: "Escaneie o QR Code acima e aguarde a conexão.",
                        });
                      }
                    } catch (err: any) {
                      toast({ title: "Erro ao verificar", description: "Tente novamente." });
                    }
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Já escaneei, sincronizar
                </Button>
              </div>
            )}

            {connectStep === "code_phone" && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">Digite o número do WhatsApp que deseja conectar</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-medium">Número com DDD e código do país</Label>
                  <Input
                    value={codePhone}
                    onChange={e => setCodePhone(e.target.value)}
                    placeholder="5511999999999"
                    className="h-12 text-lg font-mono text-center tracking-wider"
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter" && codePhone.replace(/\D/g, "").length >= 10) {
                      setConnectStep("code");
                      (async () => {
                        try {
                          if (!connectingDevice) return;
                          if (!connectingDevice.has_api_config) {
                            toast({ title: "Sem token configurado", description: "Solicite ao administrador a atribuição de um token.", variant: "destructive" });
                            return;
                          }
                          const pairingProxyData = connectingDevice.proxy_id ? availableProxies.find(p => p.id === connectingDevice.proxy_id) : null;
                          const pairingProxyPayload = pairingProxyData ? { host: pairingProxyData.host, port: pairingProxyData.port, username: pairingProxyData.username, password: pairingProxyData.password, type: pairingProxyData.type } : undefined;
                          const result = await callApi({ action: "requestPairingCode", deviceId: connectingDevice.id, phoneNumber: codePhone.replace(/\D/g, ""), proxyConfig: pairingProxyPayload, proxyId: connectingDevice.proxy_id || undefined });
                          if (result?.error && result?.code === "PROXY_FAILED") {
                            setConnectError(result.error);
                            setConnectStep("proxy");
                            queryClient.invalidateQueries({ queryKey: ["proxies"] });
                            toast({ title: "Proxy inválida", description: result.error, variant: "destructive" });
                            return;
                          }
                          if (result.alreadyConnected) {
                            setConnectStep("done");
                            toast({ title: "Já conectado!" });
                            return;
                          }
                          if (result.suggestQr) {
                            toast({ title: "Código não suportado", description: "Use o QR Code para conectar.", variant: "destructive" });
                            setConnectStep("qr");
                            if (result.qrCode) setQrCodeBase64(result.qrCode);
                            startPolling(connectingDevice.id, null);
                            return;
                          }
                          const code = result.pairingCode || result.code || result.pairing_code;
                          if (code) setPairingCode(code);
                          else {
                            toast({ title: "Código não disponível", description: "Conecte via QR Code.", variant: "destructive" });
                            setConnectStep("qr");
                            startPolling(connectingDevice.id, null);
                          }
                          startPolling(connectingDevice.id, null);
                        } catch (err: any) {
                          toast({ title: "Código não disponível", description: "Conecte via QR Code.", variant: "destructive" });
                          setConnectStep("qr");
                          if (connectingDevice) startPolling(connectingDevice.id, null);
                        }
                      })();
                    }}}
                  />
                  <p className="text-[11px] text-muted-foreground/50 text-center">Exemplo: 5563912345678</p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-10" onClick={() => setConnectStep("proxy")}>Voltar</Button>
                  <Button
                    className="flex-1 h-10"
                    disabled={codePhone.replace(/\D/g, "").length < 10}
                    onClick={() => {
                      setConnectStep("code");
                      (async () => {
                        try {
                          if (!connectingDevice) return;
                          if (!connectingDevice.has_api_config) {
                            toast({ title: "Sem token configurado", description: "Solicite ao administrador a atribuição de um token.", variant: "destructive" });
                            return;
                          }
                          const pairingProxyData2 = connectingDevice.proxy_id ? availableProxies.find(p => p.id === connectingDevice.proxy_id) : null;
                          const pairingProxyPayload2 = pairingProxyData2 ? { host: pairingProxyData2.host, port: pairingProxyData2.port, username: pairingProxyData2.username, password: pairingProxyData2.password, type: pairingProxyData2.type } : undefined;
                          const result = await callApi({ action: "requestPairingCode", deviceId: connectingDevice.id, phoneNumber: codePhone.replace(/\D/g, ""), proxyConfig: pairingProxyPayload2, proxyId: connectingDevice.proxy_id || undefined });
                          if (result?.error && result?.code === "PROXY_FAILED") {
                            setConnectError(result.error);
                            setConnectStep("proxy");
                            queryClient.invalidateQueries({ queryKey: ["proxies"] });
                            toast({ title: "Proxy inválida", description: result.error, variant: "destructive" });
                            return;
                          }
                          if (result.alreadyConnected) {
                            setConnectStep("done");
                            toast({ title: "Já conectado!" });
                            return;
                          }
                          if (result.suggestQr) {
                            toast({ title: "Código não suportado", description: "Use o QR Code para conectar.", variant: "destructive" });
                            setConnectStep("qr");
                            if (result.qrCode) setQrCodeBase64(result.qrCode);
                            startPolling(connectingDevice.id, null);
                            return;
                          }
                          const code = result.pairingCode || result.code || result.pairing_code;
                          if (code) setPairingCode(code);
                          else {
                            toast({ title: "Código não disponível", description: "Conecte via QR Code.", variant: "destructive" });
                            setConnectStep("qr");
                            startPolling(connectingDevice.id, null);
                          }
                          startPolling(connectingDevice.id, null);
                        } catch (err: any) {
                          toast({ title: "Código não disponível", description: "Conecte via QR Code.", variant: "destructive" });
                          setConnectStep("qr");
                          if (connectingDevice) startPolling(connectingDevice.id, null);
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
              <div className="flex flex-col items-center gap-5">
                {pairingCode ? (
                  <div className="relative px-10 py-6 rounded-2xl bg-card border-2 border-primary/20 shadow-lg">
                    <p className="text-3xl font-mono font-bold tracking-[0.5em] text-foreground">{pairingCode}</p>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Lock className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                ) : connectError ? (
                  <div className="px-8 py-5 rounded-2xl bg-destructive/5 border-2 border-destructive/20">
                    <p className="text-sm text-destructive text-center">{connectError}</p>
                  </div>
                ) : (
                  <div className="w-64 py-8 rounded-2xl flex flex-col items-center justify-center border-2 border-border/20 bg-muted/10">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Key className="w-7 h-7 text-primary animate-pulse" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Gerando código...</p>
                    <div className="flex items-center gap-1.5 mt-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
                <div className="w-full bg-muted/30 rounded-xl p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-foreground mb-2">Como conectar:</p>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-muted-foreground">Abra o <span className="font-medium text-foreground">WhatsApp</span> no celular</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-muted-foreground">Vá em <span className="font-medium text-foreground">Aparelhos conectados → Conectar com número</span></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-muted-foreground">Digite o código acima</p>
                  </div>
                </div>
              </div>
            )}

            {connectStep === "connecting" && (
              <div className="flex flex-col items-center gap-4 py-10">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-sm font-medium text-muted-foreground">Conectando...</p>
              </div>
            )}

            {connectStep === "done" && (
              <div className="flex flex-col items-center gap-5 py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">Conectado com sucesso!</p>
                  <p className="text-sm text-muted-foreground mt-1">Sua instância está pronta para uso</p>
                </div>
                <Button className="h-10 px-8" onClick={() => { stopPolling(); setConnectStep("proxy"); setConnectOpen(false); }}>Fechar</Button>
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
                  max={Math.max(0, maxInstancesAllowed - devices.length - bulkSelectedProxies.length)}
                  value={bulkNoProxyCount || ""}
                  placeholder="0"
                  onChange={e => {
                    const remaining = Math.max(0, maxInstancesAllowed - devices.length - bulkSelectedProxies.length);
                    setBulkNoProxyCount(Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0)));
                  }}
                  className="h-7 w-16 text-xs"
                />
                <span className="text-[10px] text-muted-foreground/50">extra sem proxy</span>
              </div>
              <p className="text-[10px] text-muted-foreground/40">
                Disponível: {Math.max(0, maxInstancesAllowed - devices.length)} de {maxInstancesAllowed} ({devices.length} em uso)
              </p>
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
            <DialogTitle className="flex items-center gap-2"><Ban size={18} className="text-destructive" /> Funcionalidade bloqueada</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Sua conta está {planState === "noPlan" ? "sem plano ativo" : planState === "expired" ? "com plano vencido" : "suspensa/cancelada"}. Ative ou renove seu plano para liberar todas as funcionalidades (criar instâncias, conectar, disparar campanhas, aquecimento, etc).
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
