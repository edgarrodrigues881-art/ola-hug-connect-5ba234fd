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
      .on("postgres_changes", { event: "*", schema: "public", table: "warmup_cycles", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      // Paginated fetch for audit logs to avoid 1000 row limit
      async function fetchAllAuditLogs() {
        const PAGE_SIZE = 1000;
        let allLogs: any[] = [];
        let from = 0;
        while (true) {
          const { data } = await supabase
            .from("warmup_audit_logs")
            .select("device_id, level, event_type, created_at")
            .eq("user_id", user!.id)
            .gte("created_at", sevenDaysAgo)
            .range(from, from + PAGE_SIZE - 1);
          const batch = data || [];
          allLogs = allLogs.concat(batch);
          if (batch.length < PAGE_SIZE) break;
          from += PAGE_SIZE;
        }
        return allLogs;
      }

      const [devicesRes, cyclesRes, auditLogs, proxiesRes] = await Promise.all([
        supabase.from("devices").select("id, name, number, status, proxy_id, profile_picture").eq("user_id", user!.id).neq("login_type", "report_wa"),
        supabase.from("warmup_cycles").select("id, device_id, is_running, phase, day_index, days_total, daily_interaction_budget_used, daily_interaction_budget_target, updated_at").eq("user_id", user!.id),
        fetchAllAuditLogs(),
        supabase.from("proxies").select("id, host"),
      ]);

      const devices = devicesRes.data || [];
      const cycles = cyclesRes.data || [];
      const proxies = proxiesRes.data || [];

      const proxyMap: Record<string, string> = {};
      proxies.forEach((p) => { proxyMap[p.id] = p.host; });

      // Only count logs from non-report_wa devices
      const validDeviceIds = new Set(devices.map((d) => d.id));

      const interactionEvents = new Set([
        "autosave_interaction", "community_interaction", "group_interaction",
        "group_msg_sent", "autosave_msg_sent", "community_msg_sent",
      ]);

      let totalSent = 0;
      let totalFailed = 0;

      const allDayLogs: { date: string; sent: boolean }[] = [];

      // Filter audit logs to only include devices from the instances panel
      auditLogs.forEach((l) => {
        if (!validDeviceIds.has(l.device_id)) return; // skip report_wa devices
        if (interactionEvents.has(l.event_type)) {
          const isSent = l.level === "info";
          const isFailed = l.level === "error";
          if (isSent) totalSent++;
          if (isFailed) totalFailed++;
          allDayLogs.push({ date: new Date(l.created_at).toDateString(), sent: isSent });
        }
      });

      const totalMessages = totalSent + totalFailed;

      // Build chips — prefer warmup_cycles over warmup_sessions
      const chips: ChipInfo[] = devices.map((d) => {
        const cycle = cycles.find((c) => c.device_id === d.id && c.is_running);
        const activeCycle = cycle || cycles.find((c) => c.device_id === d.id && c.phase === "paused");

        return {
          id: d.id,
          name: d.name,
          number: d.number,
          status: d.status,
          connected: d.status === "Ready",
          volumeToday: activeCycle?.daily_interaction_budget_used || 0,
          lastActivity: activeCycle?.updated_at || null,
          proxyHost: d.proxy_id ? (proxyMap[d.proxy_id] || "Configurado") : null,
          warmupStatus: activeCycle ? (activeCycle.is_running ? "running" : "paused") : null,
          warmupDay: activeCycle?.day_index || null,
          warmupTotal: activeCycle?.days_total || null,
          profilePicture: d.profile_picture,
        };
      });

      const chipsOnline = chips.filter((c) => c.connected).length;
      const chipsActive = chips.filter((c) => c.warmupStatus === "running" || c.volumeToday > 0).length;
      const chipsInactive = chips.filter((c) => !c.connected && !c.warmupStatus).length;

      const runningCycles = cycles.filter((c) => c.is_running);
      const totalDailyVolume = runningCycles.reduce((a, c) => a + (c.daily_interaction_budget_used || 0), 0);
      const avgMessagesPerDay = runningCycles.length > 0 ? Math.round(totalDailyVolume / runningCycles.length) : 0;

      const avgDeliveryRate = totalMessages > 0 ? Math.round((totalSent / totalMessages) * 100) : 100;
      const avgFailRate = totalMessages > 0 ? Math.round((totalFailed / totalMessages) * 100) : 0;

      // Warmup evolution — week Monday to Sunday
      const now = new Date();
      const todayDow = now.getDay(); // 0=Sun, 1=Mon, ...
      // Calculate Monday of this week
      const mondayOffset = todayDow === 0 ? -6 : 1 - todayDow;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const warmupEvolution: WarmupEvolutionPoint[] = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dayStr = d.toDateString();
        const dayLabel = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

        const dayItems = allDayLogs.filter((l) => l.date === dayStr);
        const sent = dayItems.filter((l) => l.sent).length;
        const total = dayItems.length;

        return { label: dayLabel, volume: total, entregas: sent, crescimento: 0 };
      });

      for (let i = 1; i < warmupEvolution.length; i++) {
        const prev = warmupEvolution[i - 1].volume;
        const curr = warmupEvolution[i].volume;
        const raw = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? 100 : 0);
        warmupEvolution[i].crescimento = Math.max(-100, Math.min(raw, 500));
      }

      const firstDayVol = warmupEvolution[0]?.volume || 0;
      const lastDayVol = warmupEvolution[6]?.volume || 0;
      const growthLast7Days = firstDayVol > 0 ? Math.round(((lastDayVol - firstDayVol) / firstDayVol) * 100) : 0;
      // Volume médio diário = total de interações de hoje ÷ chips ativos (com warmup rodando)
      const activeChipCount = runningCycles.length || 1;
      const avgDailyVolume = Math.round(totalDailyVolume / activeChipCount);

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
    refetchInterval: 15000,
    staleTime: 10000,
  });
}
