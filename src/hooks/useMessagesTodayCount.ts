import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Lightweight hook that polls only the warmup message count for today.
 * Filters out report_wa devices to match the instances panel.
 */
export function useMessagesTodayCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["messages-today-count", user?.id],
    queryFn: async (): Promise<number> => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get valid device IDs (non-report_wa)
      const { data: devices } = await supabase
        .from("devices")
        .select("id")
        .eq("user_id", user!.id)
        .neq("login_type", "report_wa");

      const validIds = (devices || []).map((d) => d.id);
      if (validIds.length === 0) return 0;

      const { count } = await supabase
        .from("warmup_audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .in("device_id", validIds)
        .in("event_type", [
          "group_msg_sent",
          "autosave_msg_sent",
          "community_msg_sent",
          "autosave_interaction",
          "community_interaction",
          "group_interaction",
        ])
        .eq("level", "info")
        .gte("created_at", todayStart.toISOString());

      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
    staleTime: 4000,
  });
}
