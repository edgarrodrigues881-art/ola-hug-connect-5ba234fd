import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Wifi, WifiOff, Search, Users, CheckCircle2, Loader2, Smartphone,
  RefreshCw, Radio, Megaphone, BarChart3, Bell, Settings, Send,
  AlertTriangle, Save,
} from "lucide-react";

type Group = { id: string; name: string; participantsCount?: number | null };
type ReportType = "connection" | "campaigns" | "warmup";

const ALERT_CATEGORIES: Array<{
  key: ReportType;
  label: string;
  icon: typeof Radio;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  examples: string[];
}> = [
  {
    key: "connection",
    label: "Notificações de Conexão",
    icon: Radio,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/8",
    borderColor: "border-emerald-500/20",
    description: "Alertas de conexão serão enviados para este grupo.",
    examples: ["Instância desconectou", "Instância reconectou", "Oscilação detectada"],
  },
  {
    key: "campaigns",
    label: "Notificações de Campanha",
    icon: Megaphone,
    color: "text-blue-400",
    bgColor: "bg-blue-500/8",
    borderColor: "border-blue-500/20",
    description: "Eventos de campanha serão enviados para este grupo.",
    examples: ["Campanha iniciou", "Campanha pausou", "Campanha finalizou"],
  },
  {
    key: "warmup",
    label: "Notificações Operacionais",
    icon: BarChart3,
    color: "text-orange-400",
    bgColor: "bg-orange-500/8",
    borderColor: "border-orange-500/20",
    description: "Relatórios e eventos operacionais serão enviados para este grupo.",
    examples: ["Relatório diário", "Erro detectado", "Ciclo concluído"],
  },
];

const ReportWhatsApp = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingType, setTestingType] = useState<ReportType | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  const [toggles, setToggles] = useState<Record<ReportType, boolean>>({
    connection: false, campaigns: false, warmup: false,
  });
  const [selectedGroups, setSelectedGroups] = useState<Record<ReportType, string>>({
    connection: "", campaigns: "", warmup: "",
  });
  // Store group names for saving
  const [groupNames, setGroupNames] = useState<Record<ReportType, string>>({
    connection: "", campaigns: "", warmup: "",
  });

  // Group picker dialog
  const [pickerOpen, setPickerOpen] = useState<ReportType | null>(null);
  const [groupSearch, setGroupSearch] = useState("");

  const { data: devices = [] } = useQuery({
    queryKey: ["report-devices", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("devices")
        .select("id, name, number, status, updated_at")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const isConnected = selectedDevice
    ? ["Connected", "Ready", "authenticated"].includes(selectedDevice.status)
    : false;

  const invoke = useCallback(
    async (action: string, body: Record<string, unknown> = {}) => {
      const { data, error } = await supabase.functions.invoke("report-wa", { body: { action, ...body } });
      if (error) throw new Error(error.message || "Erro na requisição");
      return data;
    },
    []
  );

  // Load saved config
  useEffect(() => {
    if (!user || configLoaded) return;
    (async () => {
      try {
        const data = await invoke("status");
        if (data.config) {
          if (data.config.device_id) setSelectedDeviceId(data.config.device_id);
          setToggles({
            connection: data.config.toggle_instances ?? false,
            campaigns: data.config.toggle_campaigns ?? false,
            warmup: data.config.toggle_warmup ?? false,
          });
          const fallback = data.config.group_id || "";
          const fallbackName = data.config.group_name || "";
          setSelectedGroups({
            connection: data.config.connection_group_id || fallback,
            campaigns: data.config.campaigns_group_id || fallback,
            warmup: data.config.warmup_group_id || fallback,
          });
          setGroupNames({
            connection: data.config.connection_group_name || fallbackName,
            campaigns: data.config.campaigns_group_name || fallbackName,
            warmup: data.config.warmup_group_name || fallbackName,
          });
        }
        setConfigLoaded(true);
      } catch { setConfigLoaded(true); }
    })();
  }, [user, invoke, configLoaded]);

  // Load groups when device changes
  const handleSyncGroups = async () => {
    if (!selectedDeviceId) return;
    setGroupsLoading(true);
    try {
      const data = await invoke("groups", { instanceId: selectedDeviceId });
      setGroups(data.groups || []);
      setLastSync(new Date());
      if ((data.groups || []).length === 0) {
        toast({ title: "Nenhum grupo encontrado nesta instância" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao carregar grupos", description: err.message, variant: "destructive" });
    } finally {
      setGroupsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDeviceId && isConnected) handleSyncGroups();
  }, [selectedDeviceId]);

  // Validation
  const hasValidationError = ALERT_CATEGORIES.some(
    (cat) => toggles[cat.key] && !selectedGroups[cat.key]
  );

  // Save
  const handleSave = async () => {
    if (hasValidationError) {
      toast({ title: "Selecione um grupo para cada tipo de alerta ativo", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Save per-type groups
      for (const cat of ALERT_CATEGORIES) {
        if (selectedGroups[cat.key]) {
          await invoke("config", {
            instanceId: selectedDeviceId,
            reportType: cat.key,
            perTypeGroup: { id: selectedGroups[cat.key], name: groupNames[cat.key] },
            frequency: "24h",
            toggleCampaigns: toggles.campaigns,
            toggleWarmup: toggles.warmup,
            toggleInstances: toggles.connection,
            alertDisconnect: true,
            alertCampaignEnd: true,
            alertHighFailures: false,
          });
        }
      }
      toast({ title: "✅ Configurações salvas com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Test
  const handleTest = async (type: ReportType) => {
    if (!selectedGroups[type]) {
      toast({ title: "Selecione um grupo primeiro", variant: "destructive" });
      return;
    }
    setTestingType(type);
    try {
      await invoke("test", { reportType: type, groupId: selectedGroups[type], groupName: groupNames[type] });
      toast({ title: "✅ Mensagem de teste enviada!" });
    } catch (err: any) {
      toast({ title: "Erro no teste", description: err.message, variant: "destructive" });
    } finally {
      setTestingType(null);
    }
  };

  const selectGroupForType = (type: ReportType, group: Group) => {
    setSelectedGroups((prev) => ({ ...prev, [type]: group.id }));
    setGroupNames((prev) => ({ ...prev, [type]: group.name }));
    setPickerOpen(null);
    setGroupSearch("");
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-28">
      {/* ═══ TÍTULO ═══ */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Configurador de Notificações
          </h1>
          <p className="text-sm text-muted-foreground">
            Selecione uma instância e configure os grupos de destino para cada tipo de notificação.
          </p>
        </div>
      </div>

      {/* ═══ 1. SELEÇÃO DE INSTÂNCIA ═══ */}
      <Card className="border border-border/40 bg-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Instância
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedDeviceId} onValueChange={(v) => { setSelectedDeviceId(v); setGroups([]); }}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar instância" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        ["Connected", "Ready", "authenticated"].includes(d.status) ? "bg-emerald-400" : "bg-red-400"
                      }`} />
                      {d.name} {d.number ? `(${d.number})` : ""}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs shrink-0"
              onClick={handleSyncGroups}
              disabled={!selectedDeviceId || groupsLoading}
            >
              {groupsLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RefreshCw className="w-3.5 h-3.5" />
              }
              Sincronizar grupos
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Os grupos abaixo serão carregados desta instância.
          </p>
        </CardContent>
      </Card>

      {/* Se não houver instância, mostrar orientação */}
      {!selectedDeviceId ? (
        <Card className="border border-border/30 bg-card">
          <CardContent className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto">
              <Smartphone className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Selecione uma instância acima para configurar as notificações.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Os grupos e opções de configuração aparecerão automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ═══ 2. STATUS DA INTEGRAÇÃO ═══ */}
          <div className="flex items-center gap-3 px-1">
            <Badge className={`text-xs px-3 py-1.5 gap-2 border ${
              isConnected
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>
              {isConnected
                ? <><Wifi className="w-3.5 h-3.5" /> Conectada</>
                : <><WifiOff className="w-3.5 h-3.5" /> Desconectada</>
              }
            </Badge>
            {lastSync && (
              <span className="text-xs text-muted-foreground">
                Última sincronização: {lastSync.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {groups.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                {groups.length} grupo{groups.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* ═══ 3. CONFIGURAÇÃO DOS 3 TIPOS ═══ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tipos de Notificação
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {ALERT_CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                const isActive = toggles[cat.key];
                const currentGroupId = selectedGroups[cat.key];
                const currentGroupName = groupNames[cat.key];
                const needsGroup = isActive && !currentGroupId;

                return (
                  <Card key={cat.key} className={`border transition-all ${
                    isActive ? cat.borderColor : "border-border/30 opacity-60"
                  } bg-card`}>
                    <CardContent className="p-6 space-y-4">
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl ${cat.bgColor} flex items-center justify-center shrink-0`}>
                            <CatIcon className={`w-5 h-5 ${cat.color}`} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-foreground">{cat.label}</h3>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{cat.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={(v) => setToggles((prev) => ({ ...prev, [cat.key]: v }))}
                        />
                      </div>

                      {isActive && (
                        <>
                          {/* Group selector */}
                          <div className="space-y-2">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                              Grupo de destino
                            </p>

                            {groups.length === 0 ? (
                              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-center space-y-2">
                                <p className="text-xs text-muted-foreground">
                                  Nenhum grupo carregado. Sincronize os grupos da instância.
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5 text-xs"
                                  onClick={handleSyncGroups}
                                  disabled={groupsLoading}
                                >
                                  {groupsLoading
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <RefreshCw className="w-3.5 h-3.5" />
                                  }
                                  Sincronizar
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                className={`w-full justify-between h-11 text-sm ${
                                  needsGroup ? "border-red-500/30 text-red-400" : ""
                                }`}
                                onClick={() => { setPickerOpen(cat.key); setGroupSearch(""); }}
                              >
                                <span className="truncate">
                                  {currentGroupName || "Selecione um grupo da instância"}
                                </span>
                                <Users className="w-4 h-4 shrink-0 text-muted-foreground" />
                              </Button>
                            )}

                            {needsGroup && groups.length > 0 && (
                              <p className="text-[10px] text-red-400">⚠ Selecione um grupo para salvar.</p>
                            )}
                          </div>

                          {/* Examples */}
                          <div className="flex flex-wrap gap-1.5">
                            {cat.examples.map((ex) => (
                              <Badge key={ex} variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground border-border/30">
                                {ex}
                              </Badge>
                            ))}
                          </div>
                        </>
                      )}

                      {!isActive && (
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                          <p className="text-[10px] text-amber-400 font-medium">⚠ Desativado</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Esses eventos não serão enviados para o WhatsApp.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ═══ 4. AÇÕES FINAIS (footer fixo) ═══ */}
      {selectedDeviceId && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="text-xs text-muted-foreground hidden sm:block">
              {hasValidationError
                ? <span className="text-red-400">⚠ Tipos ativos sem grupo selecionado</span>
                : <span className="text-emerald-400">✓ Configuração válida</span>
              }
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {ALERT_CATEGORIES.filter((c) => toggles[c.key] && selectedGroups[c.key]).map((cat) => (
                <Button
                  key={cat.key}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleTest(cat.key)}
                  disabled={testingType === cat.key}
                >
                  {testingType === cat.key
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Send className="w-3.5 h-3.5" />
                  }
                  Testar {cat.label.split(" ").pop()}
                </Button>
              ))}
              <Button
                className="gap-2"
                onClick={handleSave}
                disabled={saving || hasValidationError}
              >
                {saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Save className="w-4 h-4" />
                }
                Salvar configurações
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Selecionar grupo ── */}
      <Dialog open={!!pickerOpen} onOpenChange={(v) => !v && setPickerOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Selecionar grupo
            </DialogTitle>
            <DialogDescription>
              {pickerOpen && `Escolha o grupo de destino para ${ALERT_CATEGORIES.find((c) => c.key === pickerOpen)?.label || ""}`}
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar grupo..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
              autoFocus
            />
          </div>

          <p className="text-[10px] text-muted-foreground/60 font-mono">
            Instância: {selectedDevice?.name || "—"} • {filteredGroups.length} grupo{filteredGroups.length !== 1 ? "s" : ""}
          </p>

          <div className="space-y-1 max-h-[320px] overflow-y-auto">
            {filteredGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum grupo encontrado.</p>
            ) : (
              filteredGroups.map((g) => {
                const isCurrentlySelected = pickerOpen && selectedGroups[pickerOpen] === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => pickerOpen && selectGroupForType(pickerOpen, g)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between ${
                      isCurrentlySelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/20 border border-transparent"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{g.name}</p>
                      {g.participantsCount != null && (
                        <p className="text-[11px] text-muted-foreground">{g.participantsCount} membros</p>
                      )}
                    </div>
                    {isCurrentlySelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportWhatsApp;
