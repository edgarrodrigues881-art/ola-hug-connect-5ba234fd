import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useContacts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Contact[];
    },
    enabled: !!user,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contact: { name: string; phone: string; email?: string; tags?: string[]; notes?: string }) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert({ ...contact, user_id: user!.id, tags: contact.tags || [] })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useCreateContacts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contacts: { name: string; phone: string; tags?: string[] }[]) => {
      const rows = contacts.map(c => ({ ...c, user_id: user!.id, tags: c.tags || [] }));
      const { data, error } = await supabase.from("contacts").insert(rows).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useDeleteContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("contacts").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });
}
