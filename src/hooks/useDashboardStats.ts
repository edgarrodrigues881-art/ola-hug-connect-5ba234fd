import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface ChipInfo {
  id: string;
  name: string;
  number: string | null;
  status: string;
  connected: boolean;
  volumeToday: number;
  lastActivity: string | null;
  proxyHost: string | null;
  warmupStatus: string | null;
  warmupDay: number | null;
  warmupTotal: number | null;
  profilePicture: string | null;
}

export interface WarmupEvolutionPoint {
  label: string;
  volume: number;
  entregas: number;
  crescimento: number;
}

export interface PerformanceMetrics {
  avgDeliveryRate: number;
  avgFailRate: number;
  avgDailyVolume: number;
  growthLast7Days: number;
}

export interface DashboardStats {
  chipsOnline: number;
  chipsActive: number;
  chipsInactive: number;
  avgMessagesPerDay: number;
  avgDeliveryRate: number;
  performance: PerformanceMetrics;
  chips: ChipInfo[];
  warmupEvolution: WarmupEvolutionPoint[];
}

export function useDashboardStats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("dashboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "devices", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats", user.id] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "warmup_sessions", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [devicesRes, warmupsRes, logsRes, proxiesRes] = await Promise.all([
        supabase.from("devices").select("id, name, number, status, login_type, proxy_id, profile_picture, profile_name, created_at, updated_at, instance_type").neq("login_type", "report_wa"),
        supabase.from("warmup_sessions").select("id, device_id, status, messages_sent_today, messages_sent_total, current_day, total_days, last_executed_at, created_at"),
        supabase.from("warmup_logs").select("device_id, status, created_at").gte("created_at", sevenDaysAgo),
        supabase.from("proxies").select("id, host"),
      ]);

      const devices = devicesRes.data || [];
      const warmups = warmupsRes.data || [];
      const logs = logsRes.data || [];
      const proxies = proxiesRes.data || [];

      const proxyMap: Record<string, string> = {};
      proxies.forEach((p) => { proxyMap[p.id] = p.host; });

      // Logs aggregation
      const sentByDevice: Record<string, number> = {};
      const failsByDevice: Record<string, number> = {};
      let totalSent = 0;
      let totalFailed = 0;

      logs.forEach((l) => {
        if (l.status === "sent") {
          sentByDevice[l.device_id] = (sentByDevice[l.device_id] || 0) + 1;
          totalSent++;
        }
        if (l.status === "error" || l.status === "failed") {
          failsByDevice[l.device_id] = (failsByDevice[l.device_id] || 0) + 1;
          totalFailed++;
        }
      });

      const totalMessages = totalSent + totalFailed;

      // Build chips
      const chips: ChipInfo[] = devices.map((d) => {
        const warmup = warmups.find((w) => w.device_id === d.id && (w.status === "running" || w.status === "paused"));
        const lastLog = logs
          .filter((l) => l.device_id === d.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        return {
          id: d.id,
          name: d.name,
          number: d.number,
          status: d.status,
          connected: d.status === "Ready",
          volumeToday: warmup?.messages_sent_today || 0,
          lastActivity: lastLog?.created_at || warmup?.last_executed_at || null,
          proxyHost: d.proxy_id ? (proxyMap[d.proxy_id] || "Configurado") : null,
          warmupStatus: warmup?.status || null,
          warmupDay: warmup?.current_day || null,
          warmupTotal: warmup?.total_days || null,
          profilePicture: d.profile_picture,
        };
      });

      const chipsOnline = chips.filter((c) => c.connected).length;
      const chipsActive = chips.filter((c) => c.warmupStatus === "running" || c.volumeToday > 0).length;
      const chipsInactive = chips.filter((c) => !c.connected && !c.warmupStatus).length;

      const totalDailyVolume = warmups
        .filter((w) => w.status === "running")
        .reduce((a, w) => a + (w.messages_sent_today || 0), 0);
      const activeWarmups = warmups.filter((w) => w.status === "running").length;
      const avgMessagesPerDay = activeWarmups > 0 ? Math.round(totalDailyVolume / activeWarmups) : 0;

      const avgDeliveryRate = totalMessages > 0 ? Math.round((totalSent / totalMessages) * 100) : 100;
      const avgFailRate = totalMessages > 0 ? Math.round((totalFailed / totalMessages) * 100) : 0;

      // Warmup evolution
      const now = new Date();
      const warmupEvolution: WarmupEvolutionPoint[] = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const dayStr = d.toDateString();
        const dayLabel = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

        const dayLogs = logs.filter((l) => new Date(l.created_at).toDateString() === dayStr);
        const sent = dayLogs.filter((l) => l.status === "sent").length;
        const failed = dayLogs.filter((l) => l.status === "error" || l.status === "failed").length;

        return { label: dayLabel, volume: sent + failed, entregas: sent, crescimento: 0 };
      });

      for (let i = 1; i < warmupEvolution.length; i++) {
        const prev = warmupEvolution[i - 1].volume;
        const curr = warmupEvolution[i].volume;
        warmupEvolution[i].crescimento = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
      }

      // Growth last 7 days
      const firstDayVol = warmupEvolution[0]?.volume || 0;
      const lastDayVol = warmupEvolution[6]?.volume || 0;
      const growthLast7Days = firstDayVol > 0 ? Math.round(((lastDayVol - firstDayVol) / firstDayVol) * 100) : 0;

      const avgDailyVolume = Math.round(warmupEvolution.reduce((a, p) => a + p.volume, 0) / 7);

      return {
        chipsOnline,
        chipsActive,
        chipsInactive,
        avgMessagesPerDay,
        avgDeliveryRate,
        performance: {
          avgDeliveryRate,
          avgFailRate,
          avgDailyVolume,
          growthLast7Days,
        },
        chips,
        warmupEvolution,
      };
    },
    // Realtime handles instant updates; polling is just a safety net
    refetchInterval: 60000,
  });
}
