import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWarmupCycles } from "@/hooks/useWarmupV2";
import { useWarmupEngine } from "@/hooks/useWarmupEngine";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Flame, Wifi, WifiOff, AlertTriangle, Loader2,
  Phone, Search, Filter, Pause, Play, Pencil, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const phaseLabels: Record<string, string> = {
  pre_24h: "Primeiras 24h",
  groups_only: "Grupos",
  autosave_enabled: "Auto Save",
  community_enabled: "Comunidade",
  completed: "Concluído",
  paused: "Pausado",
  error: "Erro",
};

const phaseShort: Record<string, string> = {
  pre_24h: "iniciante",
  groups_only: "grupos",
  autosave_enabled: "auto save",
  community_enabled: "comunidade",
  completed: "concluído",
  paused: "pausado",
  error: "erro",
};

const WarmupInstances = () => {
  // Format phone number for display
  const formatPhone = (num: string) => {
    const digits = num.replace(/\D/g, "");
    if (digits.length >= 12 && digits.startsWith("55")) {
      const ddd = digits.slice(2, 4);
      const rest = digits.slice(4);
      const hyphenAt = rest.length - 4;
      return `+55 ${ddd} ${rest.slice(0, hyphenAt)}-${rest.slice(hyphenAt)}`;
    }
    return num;
  };

  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const engine = useWarmupEngine();

  const [showWarning, setShowWarning] = useState(() =>
    localStorage.getItem("warmup_v2_warning_dismissed") !== "true"
  );
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ["devices-warmup-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("id, name, number, status, profile_name, profile_picture, login_type");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: cycles = [], isLoading: cyclesLoading } = useWarmupCycles();
  const isLoading = devicesLoading || cyclesLoading;

  const filteredDevices = devices.filter(d => d.login_type !== "report_wa");

  const getDeviceCycle = (deviceId: string) =>
    cycles.find(c => c.device_id === deviceId && !["completed", "error"].includes(c.phase));

  const isConnected = (status: string) =>
    ["Connected", "Ready", "authenticated"].includes(status);

  const disconnectedCount = filteredDevices.filter(d => !isConnected(d.status)).length;

  const displayed = useMemo(() => {
    return filteredDevices.filter(d => {
      if (search) {
        const q = search.toLowerCase();
        if (!d.name.toLowerCase().includes(q) && !(d.number || "").includes(q)) return false;
      }
      if (statusFilter === "connected" && !isConnected(d.status)) return false;
      if (statusFilter === "disconnected" && isConnected(d.status)) return false;
      if (statusFilter === "warming") {
        const cycle = getDeviceCycle(d.id);
        if (!cycle || !cycle.is_running) return false;
      }
      return true;
    });
  }, [filteredDevices, search, statusFilter, cycles]);

  const handlePause = (deviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    engine.mutate(
      { action: "pause", device_id: deviceId },
      { onSuccess: () => toast({ title: "Aquecimento pausado" }) }
    );
  };

  const handleResume = (deviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    engine.mutate(
      { action: "resume", device_id: deviceId },
      { onSuccess: () => toast({ title: "Aquecimento retomado" }) }
    );
  };

  return (
    <div className="space-y-5">
      {/* Warning popup */}
      <Dialog open={showWarning} onOpenChange={(open) => { if (!open) setShowWarning(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Aviso importante
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong className="text-foreground">Evite colocar números que estão caindo ou sendo restringidos com apenas 1 mensagem no WhatsApp.</strong></p>
            <p>Faça uma limpeza antes de começar. No módulo <strong className="text-foreground">Ajuda</strong> existem orientações.</p>
            <p>O aquecimento é gradual para fortalecer chips saudáveis. Números já restringidos têm chances altas de serem bloqueados novamente.</p>
            <p className="text-xs text-muted-foreground/60">Recomendamos chips novos ou estáveis para melhores resultados.</p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="dontShowAgainV2" checked={dontShowAgain} onCheckedChange={(v) => setDontShowAgain(!!v)} />
            <label htmlFor="dontShowAgainV2" className="text-xs text-muted-foreground cursor-pointer select-none">Não mostrar novamente</label>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              if (dontShowAgain) localStorage.setItem("warmup_v2_warning_dismissed", "true");
              setShowWarning(false);
            }}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            Aquecimento V2
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground tabular-nums">
              Total: <strong className="text-foreground">{filteredDevices.length}</strong>
            </span>
            {disconnectedCount > 0 && (
              <span className="text-xs text-destructive tabular-nums">
                Chips desconectados: <strong>{disconnectedCount}</strong>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3 h-3" /> Filtros
          </Button>
          <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => navigate("/dashboard/devices")}>
            <Plus className="w-3.5 h-3.5" /> Aplicar
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-card/50 border-border/30"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-card/50 border-border/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="connected">Conectados</SelectItem>
              <SelectItem value="disconnected">Desconectados</SelectItem>
              <SelectItem value="warming">Aquecendo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-2xl border border-border/30 bg-card/30 p-12 text-center">
          <Flame className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/60">Nenhuma instância encontrada</p>
          <Button size="sm" className="mt-3" onClick={() => navigate("/dashboard/devices")}>
            Conectar Instância
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayed.map(device => {
            const cycle = getDeviceCycle(device.id);
            const connected = isConnected(device.status);
            const budgetUsed = cycle?.daily_interaction_budget_used ?? 0;
            const budgetTarget = cycle?.daily_interaction_budget_target ?? 0;
            const budgetPct = budgetTarget > 0 ? Math.round((budgetUsed / budgetTarget) * 100) : 0;
            const isWarming = cycle && cycle.is_running && cycle.phase !== "completed";

            return (
              <div
                key={device.id}
                className={cn(
                  "group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-150",
                  "bg-card shadow-sm hover:shadow-lg",
                  connected
                    ? "border-primary/15 hover:border-primary/30 hover:shadow-primary/5"
                    : "border-border/30 hover:border-border/50"
                )}
                onClick={() => navigate(`/dashboard/warmup-v2/${device.id}`)}
              >
                {/* Top accent line */}
                <div className={cn(
                  "h-[2px] w-full",
                  isWarming ? "bg-primary/60" : connected ? "bg-primary/25" : "bg-border/30"
                )} />

                {/* Status pill */}
                <div className="px-4 pt-3.5">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                    connected
                      ? "text-primary bg-primary/8"
                      : "text-muted-foreground bg-muted/30"
                  )}>
                    <span className={cn(
                      "w-[5px] h-[5px] rounded-full shrink-0",
                      connected ? "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]" : "bg-muted-foreground/40"
                    )} />
                    {connected ? "CONECTADO" : "DESCONECTADO"}
                  </div>
                </div>

                {/* Profile */}
                <div className="px-4 pt-3.5 pb-3 flex items-center gap-4">
                  <div className={cn(
                    "w-[52px] h-[52px] rounded-full flex items-center justify-center shrink-0",
                    "ring-[2.5px] ring-offset-2 ring-offset-card",
                    connected ? "ring-primary/40" : "ring-border/30"
                  )}>
                    {device.profile_picture ? (
                      <img src={device.profile_picture} className="w-[52px] h-[52px] rounded-full object-cover" alt="" />
                    ) : (
                      <div className={cn(
                        "w-[52px] h-[52px] rounded-full flex items-center justify-center",
                        connected ? "bg-primary/8" : "bg-muted/30"
                      )}>
                        <Phone className={cn("w-5 h-5", connected ? "text-primary" : "text-muted-foreground/40")} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-foreground truncate leading-tight">
                      {device.profile_name || device.name}
                    </p>
                    {device.number && (
                      <p className="text-[11px] font-mono text-muted-foreground mt-1 tracking-wide">
                        {formatPhone(device.number)}
                      </p>
                    )}
                    {cycle && (
                      <p className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5 text-primary/60" />
                        Dia {cycle.day_index} · {phaseShort[cycle.phase] || cycle.phase} · {cycle.day_index}-{cycle.days_total}d
                      </p>
                    )}
                    {!cycle && connected && (
                      <p className="text-[10px] text-muted-foreground/40 mt-1">Pronto para aquecer</p>
                    )}
                  </div>
                </div>


                {/* Actions */}
                <div className="px-4 pb-4 space-y-2">
                  {!connected ? (
                    <Button
                      size="sm"
                      className="w-full text-[11px] h-9 gap-1.5 rounded-lg font-semibold"
                      onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/devices`); }}
                    >
                      <Wifi className="w-3.5 h-3.5" /> Conectar
                    </Button>
                  ) : cycle && isWarming ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[11px] h-9 gap-1.5 rounded-lg border-primary/20 text-primary hover:bg-primary/8 font-semibold"
                      onClick={(e) => handlePause(device.id, e)}
                    >
                      <Pause className="w-3.5 h-3.5" /> Parar aquecimento
                    </Button>
                  ) : cycle?.phase === "paused" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[11px] h-9 gap-1.5 rounded-lg border-primary/20 text-primary hover:bg-primary/8 font-semibold"
                      onClick={(e) => handleResume(device.id, e)}
                    >
                      <Play className="w-3.5 h-3.5" /> Retomar aquecimento
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[11px] h-9 gap-1.5 rounded-lg font-semibold"
                    onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/warmup-v2/${device.id}`); }}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WarmupInstances;
