import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface WarmupSession {
  id: string;
  user_id: string;
  device_id: string;
  status: "running" | "paused" | "completed";
  messages_per_day: number;
  daily_increment: number;
  max_messages_per_day: number;
  current_day: number;
  total_days: number;
  messages_sent_today: number;
  messages_sent_total: number;
  min_delay_seconds: number;
  max_delay_seconds: number;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export function useWarmupSessions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["warmup_sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warmup_sessions" as any)
        .select("id, user_id, device_id, status, messages_per_day, daily_increment, max_messages_per_day, current_day, total_days, messages_sent_today, messages_sent_total, min_delay_seconds, max_delay_seconds, start_time, end_time, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as WarmupSession[];
    },
    enabled: !!user,
  });
}

export function useCreateWarmup() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (session: {
      device_id: string;
      messages_per_day?: number;
      daily_increment?: number;
      max_messages_per_day?: number;
      total_days?: number;
      min_delay_seconds?: number;
      max_delay_seconds?: number;
      start_time?: string;
      end_time?: string;
      quality_profile?: string;
    }) => {
      const { data, error } = await supabase
        .from("warmup_sessions" as any)
        .insert({
          ...session,
          user_id: user!.id,
        })
        .select("id, device_id, status, messages_per_day, daily_increment, max_messages_per_day, current_day, total_days, messages_sent_today, messages_sent_total, min_delay_seconds, max_delay_seconds, start_time, end_time, quality_profile, safety_state, created_at, updated_at")
        .single();
      if (error) throw error;
      return data as unknown as WarmupSession;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warmup_sessions"] }),
  });
}

export function useUpdateWarmup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WarmupSession>) => {
      const { error } = await supabase
        .from("warmup_sessions" as any)
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warmup_sessions"] }),
  });
}

export function useDeleteWarmup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("warmup_sessions" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warmup_sessions"] }),
  });
}
