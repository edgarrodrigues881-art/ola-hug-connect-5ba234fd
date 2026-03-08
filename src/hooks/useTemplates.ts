import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Template {
  id: string;
  name: string;
  content: string;
  type: string;
  media_url: string | null;
  buttons: any[];
  created_at: string;
  updated_at: string;
}

export function useTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("id, name, content, type, media_url, buttons, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
    enabled: !!user,
    staleTime: 120_000,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: { name: string; content: string; type: string; media_url?: string; buttons?: any[] }) => {
      const { data, error } = await supabase
        .from("templates")
        .insert({ ...template, user_id: user!.id, buttons: template.buttons || [] })
        .select("id, name, content, type, media_url, buttons, created_at, updated_at")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Template> & { id: string }) => {
      const { data, error } = await supabase
        .from("templates")
        .update(updates)
        .eq("id", id)
        .select("id, name, content, type, media_url, buttons, created_at, updated_at")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });
}
