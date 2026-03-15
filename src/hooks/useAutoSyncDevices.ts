import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Global mute flag: when set, realtime + auto-sync skip invalidation
let mutedUntil = 0;
// Global flag: pause keepAlive while user is in connection flow
let keepAlivePaused = false;
// Track recently deleted device IDs to filter from query results
const recentlyDeletedIds = new Set<string>();

export function muteAutoSync(ms = 3000) {
  mutedUntil = Date.now() + ms;
}

export function trackDeletedDevice(id: string) {
  recentlyDeletedIds.add(id);
  setTimeout(() => recentlyDeletedIds.delete(id), 60000);
}

export function getRecentlyDeletedIds(): Set<string> {
  return recentlyDeletedIds;
}

export function pauseKeepAlive() {
  keepAlivePaused = true;
}

export function resumeKeepAlive() {
  keepAlivePaused = false;
}

/**
 * Auto-syncs device statuses.
 * - Scales to 1000+ instances by using longer intervals and smart debouncing.
 * - Pauses sync when tab is hidden.
 * - Keep-alive pings only connected devices in small batches.
 */
export function useAutoSyncDevices(intervalMs = 15_000) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const syncingRef = useRef(false);

  // ── Periodic sync ──
  useEffect(() => {
    if (!session?.access_token) return;

    const doSync = async () => {
      if (syncingRef.current || document.hidden) return;
      if (Date.now() < mutedUntil) return;
      syncingRef.current = true;
      try {
        await supabase.functions.invoke("sync-devices");
        if (Date.now() >= mutedUntil) {
          queryClient.invalidateQueries({ queryKey: ["devices"] });
        }
      } catch {
        // silent
      } finally {
        syncingRef.current = false;
      }
    };

    // Delay initial sync by 3s to not block page load
    const initialTimeout = setTimeout(doSync, 3000);
    const interval = setInterval(doSync, intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [session?.access_token, intervalMs, queryClient]);

  // Keep-alive removed: sync-devices already handles status checks for all devices
  // This eliminates ~24 concurrent Edge Function calls that were overwhelming the runtime

  // ── Realtime subscription (debounced 1s for high volume) ──
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
          if (Date.now() < mutedUntil) return;
          if (debounceTimer) clearTimeout(debounceTimer);
          // 1s debounce (up from 500ms) to batch rapid changes from bulk sync
          debounceTimer = setTimeout(() => {
            if (Date.now() >= mutedUntil) {
              queryClient.invalidateQueries({ queryKey: ["devices"] });
            }
          }, 1000);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, queryClient]);
}
