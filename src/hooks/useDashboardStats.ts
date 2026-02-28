import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface ChipHealth {
  id: string;
  name: string;
  number: string | null;
  status: string;
  score: number;
  classification: "healthy" | "warning" | "risk";
  daysActive: number;
  messagesPerDay: number;
  messagesSentToday: number;
  messagesSentTotal: number;
  warmupDay: number | null;
  warmupTotal: number | null;
  warmupStatus: string | null;
  safetyState: string | null;
  dailyIncrement: number;
  maxMessagesPerDay: number;
  failCount: number;
  proxyId: string | null;
  profilePicture: string | null;
}

export interface SmartAlert {
  id: string;
  type: "danger" | "warning" | "success";
  chipName: string;
  chipNumber: string | null;
  message: string;
}

export interface WarmupEvolutionPoint {
  label: string;
  mensagens: number;
  falhas: number;
  crescimento: number;
}

export interface DashboardStats {
  chipsOnline: number;
  chipsWarming: number;
  chipsAtRisk: number;
  avgMessagesPerDay: number;
  systemScore: number;
  deliveryRate: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  chips: ChipHealth[];
  alerts: SmartAlert[];
  warmupEvolution: WarmupEvolutionPoint[];
}

function calculateChipScore(
  device: any,
  warmup: any | null,
  failCount: number
): number {
  let score = 50;

  // Connection stability
  if (device.status === "Ready") score += 20;
  else if (device.status === "Disconnected") score -= 25;

  // Days active
  const daysActive = Math.floor((Date.now() - new Date(device.created_at).getTime()) / 86400000);
  if (daysActive > 14) score += 10;
  else if (daysActive > 7) score += 5;

  // Warmup health
  if (warmup) {
    const progress = warmup.total_days > 0 ? warmup.current_day / warmup.total_days : 0;
    score += Math.round(progress * 15);

    if (warmup.safety_state === "normal") score += 5;
    else if (warmup.safety_state === "caution") score -= 5;
    else if (warmup.safety_state === "danger") score -= 15;

    // Delivery rate from warmup
    const total = warmup.messages_sent_total || 0;
    if (total > 0) {
      const rate = (total - failCount) / total;
      if (rate > 0.96) score += 10;
      else if (rate > 0.92) score += 5;
      else if (rate < 0.8) score -= 15;
    }
  }

  // Proxy bonus
  if (device.proxy_id) score += 5;

  // Failure penalty
  if (failCount > 20) score -= 10;
  else if (failCount > 10) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function classifyScore(score: number): "healthy" | "warning" | "risk" {
  if (score >= 75) return "healthy";
  if (score >= 50) return "warning";
  return "risk";
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

      const [devicesRes, warmupsRes, logsRes, campaignsRes] = await Promise.all([
        supabase.from("devices").select("*"),
        supabase.from("warmup_sessions").select("*"),
        supabase.from("warmup_logs").select("device_id, status, created_at").gte("created_at", sevenDaysAgo),
        supabase.from("campaigns").select("sent_count, delivered_count, failed_count"),
      ]);

      const devices = devicesRes.data || [];
      const warmups = warmupsRes.data || [];
      const logs = logsRes.data || [];
      const campaigns = campaignsRes.data || [];

      // Fail counts per device from warmup_logs
      const failsByDevice: Record<string, number> = {};
      const logsByDevice: Record<string, any[]> = {};
      logs.forEach((l) => {
        if (!logsByDevice[l.device_id]) logsByDevice[l.device_id] = [];
        logsByDevice[l.device_id].push(l);
        if (l.status === "error" || l.status === "failed") {
          failsByDevice[l.device_id] = (failsByDevice[l.device_id] || 0) + 1;
        }
      });

      // Build chips
      const chips: ChipHealth[] = devices.map((d) => {
        const warmup = warmups.find((w) => w.device_id === d.id && (w.status === "running" || w.status === "paused"));
        const daysActive = Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000);
        const failCount = failsByDevice[d.id] || 0;
        const score = calculateChipScore(d, warmup, failCount);

        return {
          id: d.id,
          name: d.name,
          number: d.number,
          status: d.status,
          score,
          classification: classifyScore(score),
          daysActive,
          messagesPerDay: warmup?.messages_per_day || 0,
          messagesSentToday: warmup?.messages_sent_today || 0,
          messagesSentTotal: warmup?.messages_sent_total || 0,
          warmupDay: warmup?.current_day || null,
          warmupTotal: warmup?.total_days || null,
          warmupStatus: warmup?.status || null,
          safetyState: warmup?.safety_state || null,
          dailyIncrement: warmup?.daily_increment || 0,
          maxMessagesPerDay: warmup?.max_messages_per_day || 0,
          failCount,
          proxyId: d.proxy_id,
          profilePicture: d.profile_picture,
        };
      });

      const chipsOnline = chips.filter((c) => c.status === "Ready").length;
      const chipsWarming = chips.filter((c) => c.warmupStatus === "running").length;
      const chipsAtRisk = chips.filter((c) => c.classification === "risk").length;

      const totalWarmupMsgs = chips.reduce((a, c) => a + c.messagesPerDay, 0);
      const avgMessagesPerDay = chips.length > 0 ? Math.round(totalWarmupMsgs / chips.length) : 0;
      const systemScore = chips.length > 0 ? Math.round(chips.reduce((a, c) => a + c.score, 0) / chips.length) : 0;

      // Campaign delivery
      const totalSent = campaigns.reduce((a, c) => a + (c.sent_count || 0), 0);
      const totalDelivered = campaigns.reduce((a, c) => a + (c.delivered_count || 0), 0);
      const totalFailed = campaigns.reduce((a, c) => a + (c.failed_count || 0), 0);
      const deliveryRate = totalSent > 0 ? Math.round(((totalSent - totalFailed) / totalSent) * 100) : 100;

      // Alerts
      const alerts: SmartAlert[] = [];
      chips.forEach((c) => {
        if (c.failCount > 5) {
          alerts.push({
            id: `fail-${c.id}`,
            type: "danger",
            chipName: c.name,
            chipNumber: c.number,
            message: `${c.failCount} falhas nos últimos 7 dias. Revise o chip.`,
          });
        }
        if (c.warmupStatus === "running" && c.messagesSentToday === 0 && c.warmupDay && c.warmupDay > 1) {
          alerts.push({
            id: `idle-${c.id}`,
            type: "warning",
            chipName: c.name,
            chipNumber: c.number,
            message: "Chip parado hoje. Verifique a conexão.",
          });
        }
        if (c.classification === "healthy" && c.warmupStatus === "running" && c.messagesPerDay < c.maxMessagesPerDay * 0.7) {
          alerts.push({
            id: `grow-${c.id}`,
            type: "success",
            chipName: c.name,
            chipNumber: c.number,
            message: "Apto a aumentar volume de envio.",
          });
        }
      });

      // Warmup evolution - last 7 days from logs
      const now = new Date();
      const warmupEvolution: WarmupEvolutionPoint[] = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const dayStr = d.toDateString();
        const dayLabel = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

        const dayLogs = logs.filter((l) => new Date(l.created_at).toDateString() === dayStr);
        const sent = dayLogs.filter((l) => l.status === "sent").length;
        const failed = dayLogs.filter((l) => l.status === "error" || l.status === "failed").length;

        return {
          label: dayLabel,
          mensagens: sent + failed,
          falhas: failed,
          crescimento: 0,
        };
      });

      // Calculate growth %
      for (let i = 1; i < warmupEvolution.length; i++) {
        const prev = warmupEvolution[i - 1].mensagens;
        const curr = warmupEvolution[i].mensagens;
        warmupEvolution[i].crescimento = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
      }

      return {
        chipsOnline,
        chipsWarming,
        chipsAtRisk,
        avgMessagesPerDay,
        systemScore,
        deliveryRate,
        totalSent,
        totalDelivered,
        totalFailed,
        chips,
        alerts,
        warmupEvolution,
      };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}
