import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface WarmupLog {
  id: string;
  session_id: string;
  user_id: string;
  device_id: string;
  group_jid: string | null;
  group_name: string | null;
  message_content: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export function useWarmupLogs(sessionId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["warmup_logs", user?.id, sessionId],
    queryFn: async () => {
      let query = supabase
        .from("warmup_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (sessionId) {
        query = query.eq("session_id", sessionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as WarmupLog[];
    },
    enabled: !!user,
  });
}

export function useWarmupDailyStats(sessionId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["warmup_daily_stats", user?.id, sessionId],
    queryFn: async () => {
      let query = supabase
        .from("warmup_logs" as any)
        .select("created_at, status")
        .eq("status", "sent")
        .order("created_at", { ascending: true });

      if (sessionId) {
        query = query.eq("session_id", sessionId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by day
      const byDay: Record<string, number> = {};
      (data as any[])?.forEach((log) => {
        const day = new Date(log.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        byDay[day] = (byDay[day] || 0) + 1;
      });

      return Object.entries(byDay).map(([day, count]) => ({ day, msgs: count }));
    },
    enabled: !!user,
  });
}
