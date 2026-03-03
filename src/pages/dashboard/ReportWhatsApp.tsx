import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Radio, RefreshCw, Settings2, ScrollText, Wifi, WifiOff } from "lucide-react";

export default function ReportWhatsApp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ["report-wa-config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_wa_configs")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["report-wa-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_wa_logs")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["devices-for-report", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("devices")
        .select("id, name, number, status")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const upsertConfig = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (config?.id) {
        const { error } = await supabase
          .from("report_wa_configs")
          .update(updates)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("report_wa_configs")
          .insert({ user_id: user!.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-wa-config"] });
      toast.success("Configuração salva");
    },
    onError: () => toast.error("Erro ao salvar configuração"),
  });

  const handleToggle = (field: string, value: boolean) => {
    upsertConfig.mutate({ [field]: value });
  };

  const handleSelect = (field: string, value: string) => {
    upsertConfig.mutate({ [field]: value });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "ERROR": return "destructive";
      case "WARN": return "secondary";
      default: return "outline";
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="w-6 h-6 text-primary" />
            Central de Alertas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure alertas automáticos via WhatsApp sobre suas operações.
          </p>
        </div>
        <Badge variant={config?.connection_status === "connected" ? "default" : "secondary"} className="gap-1.5">
          {config?.connection_status === "connected" ? (
            <><Wifi className="w-3 h-3" /> Conectado</>
          ) : (
            <><WifiOff className="w-3 h-3" /> Desconectado</>
          )}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Configurações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {config?.device_id && (
              <div className="text-sm text-muted-foreground">
                Dispositivo: <span className="text-foreground font-medium">
                  {devices.find(d => d.id === config.device_id)?.name || "—"}
                </span>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium mb-2 block">Frequência dos relatórios</Label>
              <Select value={config?.frequency || "1h"} onValueChange={(v) => handleSelect("frequency", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30m">A cada 30 min</SelectItem>
                  <SelectItem value="1h">A cada 1 hora</SelectItem>
                  <SelectItem value="3h">A cada 3 horas</SelectItem>
                  <SelectItem value="6h">A cada 6 horas</SelectItem>
                  <SelectItem value="12h">A cada 12 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Módulos</h4>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="toggle_instances" className="text-sm">Instâncias</Label>
                <Switch
                  id="toggle_instances"
                  checked={config?.toggle_instances ?? true}
                  onCheckedChange={(v) => handleToggle("toggle_instances", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="toggle_campaigns" className="text-sm">Campanhas</Label>
                <Switch
                  id="toggle_campaigns"
                  checked={config?.toggle_campaigns ?? true}
                  onCheckedChange={(v) => handleToggle("toggle_campaigns", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="toggle_warmup" className="text-sm">Aquecimento</Label>
                <Switch
                  id="toggle_warmup"
                  checked={config?.toggle_warmup ?? true}
                  onCheckedChange={(v) => handleToggle("toggle_warmup", v)}
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Alertas Instantâneos</h4>

              <div className="flex items-center justify-between">
                <Label htmlFor="alert_disconnect" className="text-sm">Desconexão de chip</Label>
                <Switch
                  id="alert_disconnect"
                  checked={config?.alert_disconnect ?? true}
                  onCheckedChange={(v) => handleToggle("alert_disconnect", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="alert_campaign_end" className="text-sm">Fim de campanha</Label>
                <Switch
                  id="alert_campaign_end"
                  checked={config?.alert_campaign_end ?? true}
                  onCheckedChange={(v) => handleToggle("alert_campaign_end", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="alert_high_failures" className="text-sm">Alta taxa de falhas</Label>
                <Switch
                  id="alert_high_failures"
                  checked={config?.alert_high_failures ?? false}
                  onCheckedChange={(v) => handleToggle("alert_high_failures", v)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="w-4 h-4" />
              Logs de Envio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLogs ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                Nenhum log registrado ainda.
              </p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 text-sm">
                      <Badge variant={getLevelColor(log.level)} className="text-[10px] shrink-0 mt-0.5">
                        {log.level}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground/90 break-words">{log.message}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
