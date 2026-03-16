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

      // Query audit logs directly by user_id so counts persist even if devices disconnect/are removed
      const { count } = await supabase
        .from("warmup_audit_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
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
    refetchInterval: 15000,
    staleTime: 10000,
  });
}
