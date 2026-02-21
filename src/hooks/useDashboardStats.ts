import { useQuery } from "@tanstack/react-query";
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
  warmupDay: number | null;
  warmupTotal: number | null;
  proxyName: string | null;
}

export interface DeviceInfo {
  id: string;
  name: string;
  number: string | null;
  status: string;
  profile_picture: string | null;
}

export interface DashboardStats {
  chipsActive: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  devices: DeviceInfo[];
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    totalContacts: number;
    sentCount: number;
    deliveredCount: number;
    failedCount: number;
    responseRate: number;
    techStatus: "ok" | "warning" | "risk";
    createdAt: string;
  }>;
  activityData: Array<{ label: string; enviadas: number; entregues: number }>;
}

function calculateChipScore(
  device: any,
  warmup: any | null,
  totalSent: number,
  totalFailed: number
): number {
  let score = 50; // base

  // Status bonus
  if (device.status === "Ready") score += 20;
  else if (device.status === "Disconnected") score -= 30;

  // Days active bonus
  const createdAt = new Date(device.created_at);
  const daysActive = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  if (daysActive > 14) score += 10;
  else if (daysActive > 7) score += 5;

  // Warmup progression
  if (warmup) {
    const warmupProgress = warmup.total_days > 0 ? (warmup.current_day / warmup.total_days) : 0;
    score += Math.round(warmupProgress * 15);
  }

  // Delivery rate
  if (totalSent > 0) {
    const deliveryRate = (totalSent - totalFailed) / totalSent;
    if (deliveryRate > 0.95) score += 10;
    else if (deliveryRate > 0.8) score += 5;
    else if (deliveryRate < 0.5) score -= 15;
  }

  // Failure penalty
  if (totalFailed > 20) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function classifyScore(score: number): "healthy" | "warning" | "risk" {
  if (score >= 80) return "healthy";
  if (score >= 50) return "warning";
  return "risk";
}

export function useDashboardStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats", user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch all data in parallel
      const [devicesRes, warmupsRes, campaignsRes, proxiesRes] = await Promise.all([
        supabase.from("devices").select("*"),
        supabase.from("warmup_sessions").select("*"),
        supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("proxies").select("*"),
      ]);

      const devices = devicesRes.data || [];
      const warmups = warmupsRes.data || [];
      const campaigns = campaignsRes.data || [];
      const proxies = proxiesRes.data || [];

      // Build chip health
      const chips: ChipHealth[] = devices.map((d) => {
        const warmup = warmups.find((w) => w.device_id === d.id && w.status === "running");
        const createdAt = new Date(d.created_at);
        const daysActive = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        const score = calculateChipScore(d, warmup, warmup?.messages_sent_total || 0, 0);

        return {
          id: d.id,
          name: d.name,
          number: d.number,
          status: d.status,
          score,
          classification: classifyScore(score),
          daysActive,
          messagesPerDay: warmup?.messages_per_day || 0,
          warmupDay: warmup?.current_day || null,
          warmupTotal: warmup?.total_days || null,
          proxyName: null,
        };
      });

      const chipsActive = chips.filter((c) => c.status === "Ready").length;
      const chipsAtRisk = chips.filter((c) => c.classification === "risk" || c.classification === "warning").length;
      const chipsBanned = chips.filter((c) => c.status === "Banned").length;

      // Delivery stats
      const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
      const totalDelivered = campaigns.reduce((acc, c) => acc + (c.delivered_count || 0), 0);
      const totalFailed = campaigns.reduce((acc, c) => acc + (c.failed_count || 0), 0);
      const deliveryRate = totalSent > 0 ? Math.round(((totalSent - totalFailed) / totalSent) * 100) : 100;

      const avgHealthScore = chips.length > 0
        ? Math.round(chips.reduce((acc, c) => acc + c.score, 0) / chips.length)
        : 0;

      // Simulated hourly data (in real scenario this would come from logs)
      const hours = ["08h", "09h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h"];
      const hourlyData = hours.map((hora) => ({
        hora,
        enviadas: Math.floor(Math.random() * 200 + 20),
        entregues: Math.floor(Math.random() * 180 + 15),
        bloqueios: Math.floor(Math.random() * 10),
      }));

      // Recent campaigns enriched
      const recentCampaigns = campaigns.slice(0, 5).map((c) => {
        const sent = c.sent_count || 0;
        const failed = c.failed_count || 0;
        const delivered = c.delivered_count || 0;
        const failRate = sent > 0 ? failed / sent : 0;
        const techStatus: "ok" | "warning" | "risk" = failRate > 0.3 ? "risk" : failRate > 0.1 ? "warning" : "ok";

        return {
          id: c.id,
          name: c.name,
          status: c.status,
          totalContacts: c.total_contacts || 0,
          sentCount: sent,
          deliveredCount: delivered,
          failedCount: failed,
          responseRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
          techStatus,
          createdAt: c.created_at,
        };
      });

      // Activity data from campaigns (last 7 days)
      const now = new Date();
      const activityData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const dayLabel = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
        const dayCampaigns = campaigns.filter((c) => {
          const cd = new Date(c.created_at);
          return cd.toDateString() === d.toDateString();
        });
        return {
          label: dayLabel,
          enviadas: dayCampaigns.reduce((a, c) => a + (c.sent_count || 0), 0),
          entregues: dayCampaigns.reduce((a, c) => a + (c.delivered_count || 0), 0),
        };
      });

      return {
        chipsActive,
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate,
        devices: devices.map((d) => ({
          id: d.id,
          name: d.name,
          number: d.number,
          status: d.status,
          profile_picture: d.profile_picture,
        })),
        recentCampaigns,
        activityData,
      };
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}
