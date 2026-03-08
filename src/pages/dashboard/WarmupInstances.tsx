import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useWarmupCycles } from "@/hooks/useWarmupV2";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Smartphone, Plus, Flame, ChevronRight, Wifi, WifiOff, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Wifi }> = {
  Connected: { label: "Conectado", color: "text-emerald-400", icon: Wifi },
  Ready: { label: "Conectado", color: "text-emerald-400", icon: Wifi },
  authenticated: { label: "Conectado", color: "text-emerald-400", icon: Wifi },
  Disconnected: { label: "Desconectado", color: "text-muted-foreground", icon: WifiOff },
  disconnected: { label: "Desconectado", color: "text-muted-foreground", icon: WifiOff },
  error: { label: "Erro", color: "text-destructive", icon: AlertTriangle },
};

const phaseLabels: Record<string, string> = {
  pre_24h: "Primeiras 24h",
  groups_only: "Grupos",
  autosave_enabled: "Auto Save",
  community_enabled: "Comunidade",
  completed: "Concluído",
  paused: "Pausado",
  error: "Erro",
};

const WarmupInstances = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // Only show non-report_wa devices
  const filteredDevices = devices.filter(d => d.login_type !== "report_wa");

  const getDeviceCycle = (deviceId: string) =>
    cycles.find(c => c.device_id === deviceId && !["completed", "error"].includes(c.phase));

  const isConnected = (status: string) =>
    ["Connected", "Ready", "authenticated"].includes(status);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            Aquecimento V2
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecione uma instância para iniciar ou acompanhar o aquecimento automático
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => navigate("/dashboard/devices")}>
          <Plus className="w-3.5 h-3.5" /> Nova Instância
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Instâncias", value: filteredDevices.length, color: "text-foreground" },
          { label: "Conectadas", value: filteredDevices.filter(d => isConnected(d.status)).length, color: "text-emerald-400" },
          { label: "Aquecendo", value: cycles.filter(c => c.is_running && c.phase !== "completed").length, color: "text-primary" },
          { label: "Concluídos", value: cycles.filter(c => c.phase === "completed").length, color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <p className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Device list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDevices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Smartphone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma instância encontrada</p>
            <Button size="sm" className="mt-3" onClick={() => navigate("/dashboard/devices")}>
              Conectar Instância
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredDevices.map(device => {
            const cycle = getDeviceCycle(device.id);
            const st = statusConfig[device.status] || statusConfig.Disconnected;
            const connected = isConnected(device.status);
            const StatusIcon = st.icon;

            return (
              <Card
                key={device.id}
                className="cursor-pointer hover:border-primary/20 transition-colors"
                onClick={() => navigate(`/dashboard/warmup-v2/${device.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {device.profile_picture ? (
                        <img src={device.profile_picture} className="w-10 h-10 rounded-full object-cover ring-1 ring-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center ring-1 ring-border">
                          <Smartphone className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                        connected ? "bg-emerald-400" : "bg-muted-foreground/40"
                      )} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{device.name}</p>
                        <Badge variant="outline" className={cn("text-[9px] h-5 shrink-0", st.color)}>
                          <StatusIcon className="w-2.5 h-2.5 mr-1" />
                          {st.label}
                        </Badge>
                      </div>
                      {device.number && (
                        <p className="text-[11px] font-mono text-muted-foreground/60 mt-0.5">{device.number}</p>
                      )}
                    </div>

                    {/* Warmup status */}
                    <div className="hidden sm:flex items-center gap-3 shrink-0">
                      {cycle ? (
                        <div className="text-right">
                          <div className="flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-medium text-foreground">
                              Dia {cycle.day_index}/{cycle.days_total}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[9px] h-4 mt-1">
                            {phaseLabels[cycle.phase] || cycle.phase}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          {connected ? "Pronto para aquecer" : "Conecte primeiro"}
                        </span>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                  </div>

                  {/* Mobile warmup info */}
                  {cycle && (
                    <div className="sm:hidden mt-2 flex items-center gap-2">
                      <Flame className="w-3 h-3 text-primary" />
                      <span className="text-[11px] font-medium">Dia {cycle.day_index}/{cycle.days_total}</span>
                      <Badge variant="outline" className="text-[9px] h-4">
                        {phaseLabels[cycle.phase] || cycle.phase}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WarmupInstances;
