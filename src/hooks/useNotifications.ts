import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// Short notification chime as base64 WAV
const NOTIFICATION_SOUND_URI =
  "data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToFAAB/fwAAAAB/fwAA" +
  "f38AAAAAAH9/AAB/fwAAAAB/fwAAAAAAAH9/AAAAAH9/AAB/fwAAAAB/fwAAAAAAAH9/AAB/" +
  "fwAAAAAAAH9/AAAAAH9/AAAAAAAAAABbdpKdqqiZhmxSQDtBUGuMqb3DuaSSd1xKQEBLX3iR" +
  "q77FuqOUeV9MQkFNYnqTrb/Eu6SVe2BNRD9OYnqTrb/DuqSSd15MQEFNY3uUrsDFu6SW" +
  "fGFOQ0BNYnqTrb/EuqOUeV9MQkFNY3uUrsDFu6SWfGFOQ0BNYnqTrb/EuqOUeV9MQUFN" +
  "Y3uUrsDFu6SWfGFOQ0FOY3uUrsC/tJ2IbVRFPz9KXHOLpLe9tqCMdF1MQj5IWnGIorW8" +
  "tp+LclpJQD1GV26GnrK5tJ2Kb1ZGPz5IW3GIorW8tp+Lc1tKQD5HWG+Gn7O6tZ6LcVhI" +
  "QD5IV2+HoLO6tZ6LcllJQD5HWG+HoLO5tJ6Kb1dHPz5IV2+GoLO6tZ6LcllJQD5HWG+H" +
  "oLO5tJ2Kb1dHPz5IV2+GoLO6tZ+McllJQD1HWG+Hn7O5tJ2Kb1ZHPz5IV2+GoLO6tZ6L" +
  "cllJQD5HWG+HoLO5tJ2Kb1dHPz5IV2+GoLO6tZ6LcllJQD5HWG+HoLO5tJ2Kb1dHPz5I" +
  "V2+GoLO6tZ6LcllJQD5HWG+HoLO5s52Kb1dHPz5IV2+GoLK5tJ2Kb1dHPz5IV2+GoLK5" +
  "tJ2KblZGPj1HVm6Fn7K5s5yJbVVFPj1GVm2Fn7K4s5yJbVVFPj1GVWyEnrG4spuIbFRE" +
  "PTxFVGyDnbC3sZqHa1NDPDtEU2uCnK+2sJmGaVFCOzpDUWl/mq20r5eFaFBBOjlBUGd9" +
  "mKuyr5WDZk4/ODhAT2V7lqmwrZOBZEw+NzdATGN5lKeurgAA";

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);

  // Initialize audio element and unlock on first user interaction
  useEffect(() => {
    const audio = new Audio(NOTIFICATION_SOUND_URI);
    audio.preload = "auto";
    audio.volume = 0.5;
    audioRef.current = audio;

    const unlock = () => {
      if (audioUnlockedRef.current) return;
      const clone = audioRef.current;
      if (clone) {
        clone.play().then(() => {
          clone.pause();
          clone.currentTime = 0;
          audioUnlockedRef.current = true;
        }).catch(() => {});
      }
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch existing notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
    setLoading(false);
  }, [user]);

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

  useEffect(() => {
    fetchNotifications();
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
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          setUnreadCount((c) => c + 1);
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, clearAll };
}
