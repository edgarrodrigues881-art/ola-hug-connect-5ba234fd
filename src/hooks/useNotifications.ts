import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

// Clean notification chime using Web Audio API
const playChime = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Two-tone chime: C6 → E6
    const frequencies = [1047, 1319];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  } catch {
    // Audio not available
  }
};

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const audioUnlockedRef = useRef(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const toastedIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  // Unlock AudioContext on first user gesture
  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current) return;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctx.resume().then(() => ctx.close()).catch(() => {});
      audioUnlockedRef.current = true;
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const showToastForNotif = useCallback((n: Notification) => {
    playChime();
    const variantMap: Record<string, "default" | "destructive"> = {
      error: "destructive",
      warning: "destructive",
    };
    const iconMap: Record<string, string> = {
      success: "✅",
      warning: "⚠️",
      error: "❌",
      info: "ℹ️",
    };
    const icon = iconMap[n.type] || "🔔";
    toast({
      title: `${icon} ${n.title}`,
      description: n.message,
      variant: variantMap[n.type] || "default",
      duration: 3000,
    });
  }, []);

  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch notifications + show toast for NEW ones (deduplicated)
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, read, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      // Show toast for truly new notifications (not yet toasted)
      if (initialLoadDoneRef.current) {
        for (const n of data) {
          if (!toastedIdsRef.current.has(n.id)) {
            toastedIdsRef.current.add(n.id);
            showToastForNotif(n as Notification);
          }
        }
      }
      // Mark all initial IDs as already toasted on first load
      if (!initialLoadDoneRef.current) {
        toastedIdsRef.current = new Set(data.map((n) => n.id));
      }
      knownIdsRef.current = new Set(data.map((n) => n.id));
      initialLoadDoneRef.current = true;

      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
    setLoading(false);
  }, [user, showToastForNotif]);
  // Mark single as read
  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [user]);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
    setUnreadCount(0);
  }, [user]);

  // Initial fetch + light polling as safety net (realtime handles instant delivery)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s — realtime is the primary channel
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          if (!toastedIdsRef.current.has(newNotif.id)) {
            toastedIdsRef.current.add(newNotif.id);
            knownIdsRef.current.add(newNotif.id);
            setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
            setUnreadCount((c) => c + 1);
            showToastForNotif(newNotif);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, clearAll };
}
