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
      // Use count queries instead of fetching all rows
      const [
        onlineRes,
        disconnectedRes,
        warmupsRes,
        campaignsRes,
        notificationsRes,
      ] = await Promise.all([
        supabase
          .from("devices")
          .select("id", { count: "exact", head: true })
          .neq("login_type", "report_wa")
          .in("status", ["Ready", "Connected", "authenticated"]),
        supabase
          .from("devices")
          .select("id", { count: "exact", head: true })
          .neq("login_type", "report_wa")
          .in("status", ["Disconnected", "disconnected"]),
        supabase
          .from("warmup_sessions")
          .select("id", { count: "exact", head: true })
          .eq("status", "running"),
        supabase
          .from("campaigns")
          .select("id", { count: "exact", head: true })
          .in("status", ["processing", "pending", "scheduled", "running"]),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("read", false),
      ]);

      return {
        onlineInstances: onlineRes.count || 0,
        activeWarmupCycles: warmupsRes.count || 0,
        criticalAlerts: disconnectedRes.count || 0,
        activeCampaigns: campaignsRes.count || 0,
        unreadNotifications: notificationsRes.count || 0,
      };
    },
    enabled: !!user,
    refetchInterval: 30000, // 30s instead of 15s — sidebar stats are not critical
  });
}
