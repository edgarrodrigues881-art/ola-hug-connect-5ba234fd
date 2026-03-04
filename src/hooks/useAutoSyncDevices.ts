import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Auto-syncs device statuses by calling sync-devices edge function periodically.
 * Also sets up realtime subscription for instant DB updates.
 * @param intervalMs - sync interval in milliseconds (default 30s)
 */
export function useAutoSyncDevices(intervalMs = 15000) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!session?.access_token) return;

    const doSync = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        await supabase.functions.invoke("sync-devices");
        queryClient.invalidateQueries({ queryKey: ["devices"] });
      } catch {
        // silent fail
      } finally {
        syncingRef.current = false;
      }
    };

    // Initial sync on mount
    doSync();

    // Periodic sync
    const interval = setInterval(doSync, intervalMs);
    return () => clearInterval(interval);
  }, [session?.access_token, intervalMs, queryClient]);

  // Realtime subscription for instant DB change propagation
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel("devices-autosync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "devices",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["devices"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, queryClient]);
}
