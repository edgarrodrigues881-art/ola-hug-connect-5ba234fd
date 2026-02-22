import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-data?action=dashboard");
      if (error) throw error;
      return data as {
        users: Array<{
          id: string;
          email: string;
          full_name: string | null;
          company: string | null;
          phone: string | null;
          avatar_url: string | null;
          roles: string[];
          devices_count: number;
          campaigns_count: number;
          created_at: string;
          last_sign_in_at: string | null;
        }>;
        stats: {
          total_users: number;
          total_devices: number;
          active_devices: number;
          total_campaigns: number;
          total_contacts: number;
        };
      };
    },
  });
}

export function useSetUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetUserId, role, remove }: { targetUserId: string; role: string; remove?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("admin-data?action=set-role", {
        body: { target_user_id: targetUserId, role, remove: !!remove },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
  });
}
