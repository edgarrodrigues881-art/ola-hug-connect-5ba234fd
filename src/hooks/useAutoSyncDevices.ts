import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Global mute flag: when set, realtime + auto-sync skip invalidation
let mutedUntil = 0;

export function muteAutoSync(ms = 3000) {
  mutedUntil = Date.now() + ms;
}

/**
 * Auto-syncs device statuses by calling sync-devices edge function periodically.
 * Also sends keep-alive pings to connected instances to prevent session timeout.
 * Pauses when the browser tab is hidden.
 * @param intervalMs - sync interval in milliseconds (default 60s)
 */
export function useAutoSyncDevices(intervalMs = 60000) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!session?.access_token) return;

    const doSync = async () => {
      if (syncingRef.current || document.hidden) return;
      if (Date.now() < mutedUntil) return; // skip while muted
      syncingRef.current = true;
      try {
        await supabase.functions.invoke("sync-devices");
        if (Date.now() >= mutedUntil) {
          queryClient.invalidateQueries({ queryKey: ["devices"] });
        }
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

  // Keep-alive: ping connected devices every 5 minutes to prevent session timeout
  useEffect(() => {
    if (!session?.access_token) return;

    const doKeepAlive = async () => {
      if (document.hidden) return;
      try {
        const { data: connectedDevices } = await supabase
          .from("devices")
          .select("id")
          .eq("status", "Ready")
          .neq("login_type", "report_wa");
        
        if (!connectedDevices?.length) return;

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

    const keepAliveInterval = setInterval(doKeepAlive, 5 * 60 * 1000);
    const initialTimeout = setTimeout(doKeepAlive, 2 * 60 * 1000);

    return () => {
      clearInterval(keepAliveInterval);
      clearTimeout(initialTimeout);
    };
  }, [session?.access_token]);

  // Realtime subscription for instant DB change propagation (debounced)
  useEffect(() => {
    if (!session?.user?.id) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
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
          if (Date.now() < mutedUntil) return; // skip while muted
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            if (Date.now() >= mutedUntil) {
              queryClient.invalidateQueries({ queryKey: ["devices"] });
            }
          }, 500);
        }
      )
      .subscribe();
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, queryClient]);
}
