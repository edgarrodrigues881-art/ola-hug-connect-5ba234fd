import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface WarmupMessage {
  id: string;
  user_id: string;
  content: string;
  category: string;
  created_at: string;
}

export function useWarmupMessages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["warmup_messages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warmup_messages" as any)
        .select("id, content, category, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as WarmupMessage[];
    },
    enabled: !!user,
  });
}

export function useCreateWarmupMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await supabase
        .from("warmup_messages" as any)
        .insert({ content, user_id: user!.id })
        .select("id, content, category, created_at")
        .single();
      if (error) throw error;
      return data as unknown as WarmupMessage;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warmup_messages"] }),
  });
}

export function useDeleteWarmupMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("warmup_messages" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warmup_messages"] }),
  });
}
