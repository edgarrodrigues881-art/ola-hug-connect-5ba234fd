import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Auto-syncs device statuses by calling sync-devices edge function periodically.
 * Also sends keep-alive pings to connected instances to prevent session timeout.
 * Pauses when the browser tab is hidden.
 * @param intervalMs - sync interval in milliseconds (default 30s)
 */
export function useAutoSyncDevices(intervalMs = 30000) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!session?.access_token) return;

    const doSync = async () => {
      if (syncingRef.current || document.hidden) return;
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

  // Keep-alive: ping connected devices every 10 minutes to prevent UaZapi session timeout
  useEffect(() => {
    if (!session?.access_token) return;

    const doKeepAlive = async () => {
      if (document.hidden) return;
      try {
        // Get connected devices (excluding report_wa devices - they have separate management)
        const { data: connectedDevices } = await supabase
          .from("devices")
          .select("id")
          .eq("status", "Ready")
          .neq("login_type", "report_wa");
        
        if (!connectedDevices?.length) return;

        // Send keepAlive to each connected device (parallel, fire-and-forget)
        await Promise.allSettled(
          connectedDevices.map(d =>
            supabase.functions.invoke("evolution-connect", {
              body: { action: "keepAlive", deviceId: d.id },
            })
          )
        );
      } catch {
        // silent fail
      }
    };

    // Keep-alive every 10 minutes
    const keepAliveInterval = setInterval(doKeepAlive, 10 * 60 * 1000);
    // First keep-alive after 5 minutes
    const initialTimeout = setTimeout(doKeepAlive, 5 * 60 * 1000);

    return () => {
      clearInterval(keepAliveInterval);
      clearTimeout(initialTimeout);
    };
  }, [session?.access_token]);

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
