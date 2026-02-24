import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone } from "lucide-react";

interface DeviceInfo {
  id: string;
  name: string;
  number: string | null;
  status: string;
  profile_picture: string | null;
}

interface Props {
  devices: DeviceInfo[];
  loading?: boolean;
}

const statusConfig: Record<string, { dot: string; label: string }> = {
  Ready: { dot: "bg-emerald-400 animate-pulse", label: "Online" },
  Connected: { dot: "bg-emerald-400 animate-pulse", label: "Online" },
  Disconnected: { dot: "bg-destructive", label: "Offline" },
  Banned: { dot: "bg-yellow-500", label: "Banido" },
};

export function DeviceStatusList({ devices, loading }: Props) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          Conexões
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />
          ))
        ) : devices.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum dispositivo</p>
        ) : (
          devices.slice(0, 5).map((d) => {
            const cfg = statusConfig[d.status] || { dot: "bg-muted-foreground", label: d.status };
            return (
              <div
                key={d.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border/20 hover:bg-muted/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                  {d.profile_picture ? (
                    <img src={d.profile_picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {d.number || d.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{d.name}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
