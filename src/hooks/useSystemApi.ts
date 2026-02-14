import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SystemStats {
  contacts: { total: number; tagBreakdown: Record<string, number> };
  templates: { total: number };
  campaigns: {
    total: number;
    draft: number;
    pending: number;
    processing: number;
    completed: number;
    scheduled: number;
    totalSent: number;
    totalFailed: number;
    totalDelivered: number;
    recent: Array<{
      id: string;
      name: string;
      status: string;
      total_contacts: number;
      sent_count: number;
      created_at: string;
    }>;
  };
}

export function useSystemStats() {
  return useQuery({
    queryKey: ["system-stats"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("system-stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data as SystemStats;
    },
    refetchInterval: 30000,
  });
}

export function useProcessCampaign() {
  return {
    start: async (campaignId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("process-campaign", {
        body: { action: "start", campaignId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    status: async (campaignId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("process-campaign", {
        body: { action: "status", campaignId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  };
}

export function useBulkContactActions() {
  return {
    bulkImport: async (contacts: { name: string; phone: string; email?: string; tags?: string[] }[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("manage-contacts", {
        body: { action: "bulk-import", contacts },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    removeDuplicates: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("manage-contacts", {
        body: { action: "remove-duplicates" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    validatePhones: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("manage-contacts", {
        body: { action: "validate-phones" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  };
}
