import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Wifi, WifiOff, RefreshCw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface DeviceStatus {
  id: string;
  name: string;
  number: string | null;
  status: string;
  profile_name: string | null;
  updated_at: string;
}

export default function MonitoringCenter() {
  const { user } = useAuth();

  const { data: devices = [], refetch, isLoading } = useQuery({
    queryKey: ["monitoring-devices", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("devices")
        .select("id, name, number, status, profile_name, updated_at")
        .eq("user_id", user.id)
        .order("name");
      if (error) throw error;
      return data as DeviceStatus[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const online = devices.filter((d) => d.status === "connected").length;
  const offline = devices.filter((d) => d.status !== "connected").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Centro de Monitoramento</h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe o status das suas instâncias em tempo real
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{devices.length}</p>
              <p className="text-xs text-muted-foreground">Total de Instâncias</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Wifi className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{online}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-2 rounded-lg bg-destructive/10">
              <WifiOff className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{offline}</p>
              <p className="text-xs text-muted-foreground">Offline</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Status das Instâncias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma instância encontrada.
            </p>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => {
                const isOnline = device.status === "connected";
                return (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-destructive"}`} />
                      <div>
                        <p className="text-sm font-medium">{device.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {device.profile_name || device.number || "Sem número"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isOnline ? "default" : "destructive"} className="text-xs">
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
