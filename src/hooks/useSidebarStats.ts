import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface SidebarStats {
  onlineInstances: number;
  activeWarmupCycles: number;
  criticalAlerts: number;
  activeCampaigns: number;
  unreadNotifications: number;
}

export function useSidebarStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sidebar-stats", user?.id],
    queryFn: async (): Promise<SidebarStats> => {
      const [devicesRes, warmupsRes, campaignsRes, notificationsRes] = await Promise.all([
        supabase.from("devices").select("status"),
        supabase.from("warmup_sessions").select("status"),
        supabase.from("campaigns").select("status").in("status", ["processing", "pending", "scheduled"]),
        supabase.from("notifications").select("id").eq("read", false),
      ]);

      const devices = devicesRes.data || [];
      const warmups = warmupsRes.data || [];
      const campaigns = campaignsRes.data || [];
      const notifications = notificationsRes.data || [];

      const onlineInstances = devices.filter(d => d.status === "Ready" || d.status === "Connected" || d.status === "authenticated").length;
      const disconnected = devices.filter(d => d.status === "Disconnected" || d.status === "disconnected").length;
      const activeWarmupCycles = warmups.filter(w => w.status === "running").length;

      return {
        onlineInstances,
        activeWarmupCycles,
        criticalAlerts: disconnected,
        activeCampaigns: campaigns.length,
        unreadNotifications: notifications.length,
      };
    },
    enabled: !!user,
    refetchInterval: 15000,
  });
}
