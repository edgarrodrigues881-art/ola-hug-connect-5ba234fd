import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  useDeviceCycle,
  useInstanceGroups, useAutosaveContacts, useCommunityMembership,
  useWarmupAuditLogs, useWarmupPlans, useToggleCommunity, useToggleAutosave,
  type WarmupCycle,
} from "@/hooks/useWarmupV2";
import { useWarmupEngine } from "@/hooks/useWarmupEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Flame, Play, Pause, Square,
  Clock, Users, MessageSquare, Shield, Globe, ScrollText,
  AlertTriangle, CheckCircle2, Zap, Timer, Loader2,
  CalendarDays, Target, UserPlus, Send, RotateCcw,
  FastForward, SkipForward, ChevronDown, ImageIcon,
} from "lucide-react";

const EVENT_TYPE_LABELS: Record<string, string> = {
  cycle_started: "Ciclo iniciado",
  cycle_paused: "Ciclo pausado",
  cycle_resumed: "Ciclo retomado",
  cycle_stopped: "Ciclo encerrado",
  group_joined: "Entrou no grupo",
  group_msg_sent: "Msg em grupo",
  group_interaction: "Interação grupo",
  autosave_interaction: "Auto Save",
  community_interaction: "Comunidade",
  daily_reset: "Reset diário",
  phase_transition: "Mudança de fase",
  health_check: "Verificação",
  enable_autosave: "Ativou Auto Save",
  enable_community: "Ativou Comunidade",
  join_group: "Entrada em grupo",
  error: "Erro",
};
function translateEventType(type: string) {
  return EVENT_TYPE_LABELS[type] || type.replace(/_/g, " ");
}
import { formatDistanceToNow, differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

/* ── phase config ── */
const phaseConfig: Record<string, { label: string; color: string; icon: typeof Clock; step: number }> = {
  pre_24h:            { label: "Primeiras 24h",  color: "text-amber-400",           icon: Timer,        step: 1 },
  groups_only:        { label: "Grupos",          color: "text-teal-400",            icon: Users,        step: 2 },
  autosave_enabled:   { label: "Auto Save",       color: "text-emerald-400",         icon: MessageSquare, step: 3 },
  community_enabled:  { label: "Comunidade",      color: "text-purple-400",          icon: Globe,        step: 4 },
  community_light:    { label: "Comunidade Light", color: "text-purple-400",          icon: Globe,        step: 4 },
  completed:          { label: "Concluído",        color: "text-muted-foreground",    icon: CheckCircle2, step: 5 },
  paused:             { label: "Pausado",          color: "text-amber-400",           icon: Pause,        step: 0 },
  error:              { label: "Erro",             color: "text-destructive",         icon: AlertTriangle, step: 0 },
};

const phaseSteps = ["pre_24h", "groups_only", "autosave_enabled", "community_enabled", "completed"] as const;

/* ── Helper: autosave / community start day based on chip_state ── */
function getAutosaveStartDay(chipState: string): number {
  // Estável (new/recovered) = dia 5, Banido (unstable) = dia 7
  const groupsEnd = chipState === "unstable" ? 6 : 4;
  return groupsEnd + 1;
}
function getCommunityStartDay(chipState: string): number {
  const groupsEnd = chipState === "unstable" ? 6 : 4;
  return groupsEnd + 2;
}

/* ── component ── */
const WarmupInstanceDetail = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: device } = useQuery({
    queryKey: ["device-detail-warmup", deviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("id, name, number, status, login_type, proxy_id, profile_picture, profile_name, created_at, updated_at, instance_type")
        .eq("id", deviceId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!deviceId,
  });

  const { data: cycle, isLoading: cycleLoading } = useDeviceCycle(deviceId!);
  const engine = useWarmupEngine();
  const toggleCommunity = useToggleCommunity();
  const toggleAutosave = useToggleAutosave();

  const { data: instanceGroups = [] } = useInstanceGroups(deviceId!);
  const { data: autosaveContacts = [] } = useAutosaveContacts();
  const { data: community } = useCommunityMembership(deviceId!);
  const { data: auditLogs = [] } = useWarmupAuditLogs(cycle?.id);
  const { data: plans = [] } = useWarmupPlans();

  // Fetch scheduled jobs for this cycle
  const { data: scheduledJobs = [] } = useQuery({
    queryKey: ["warmup_jobs_scheduled", cycle?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warmup_jobs")
        .select("id, job_type, status, run_at, payload")
        .eq("cycle_id", cycle!.id)
        .order("run_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!cycle?.id,
    refetchInterval: 30_000,
  });

  // statusToday removed — UAZAPI v2 does not support status posting

  // Group audit logs by warmup day
  const cycleStartedAt = cycle?.started_at ? new Date(cycle.started_at) : null;
  const dayGroups = useMemo(() => {
    if (!cycleStartedAt || auditLogs.length === 0) return [];
    const groups: Record<number, typeof auditLogs> = {};
    auditLogs.forEach(log => {
      const dayIdx = differenceInCalendarDays(new Date(log.created_at), cycleStartedAt) + 1;
      const day = Math.max(1, dayIdx);
      if (!groups[day]) groups[day] = [];
      groups[day].push(log);
    });
    return Object.entries(groups)
      .map(([day, logs]) => ({ day: Number(day), logs }))
      .sort((a, b) => b.day - a.day);
  }, [auditLogs, cycleStartedAt?.getTime()]);

  const [chipState, setChipState] = useState<"new" | "recovered" | "unstable">("new");
  const [daysTotal, setDaysTotal] = useState("7");
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showShortDaysWarning, setShowShortDaysWarning] = useState(false);
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false);
  const [showAccelerateConfirm, setShowAccelerateConfirm] = useState(false);
  const [accelerating, setAccelerating] = useState(false);
  const [advancingPhase, setAdvancingPhase] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  // Auto-enable community when community day is reached
  useEffect(() => {
    if (!cycle || !deviceId || !user) return;
    const communityDay = getCommunityStartDay(cycle.chip_state || "new");
    if (cycle.day_index >= communityDay && community === null) {
      // No membership record yet — auto-enable
      toggleCommunity.mutate({ deviceId, cycleId: cycle.id, enable: true });
    }
  }, [cycle?.day_index, cycle?.chip_state, community, deviceId, user]);

  /* accelerate: phase-aware — recalculate pending jobs from NOW keeping delays */
  const handleAccelerate = async () => {
    if (!cycle?.id) return;
    setAccelerating(true);
    try {
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const phase = cycle.phase;

      // Determine which job types to accelerate based on current phase
      const targetTypes = phase === "pre_24h"
        ? ["join_group"] as const
        : ["group_interaction", "autosave_interaction", "community_interaction", "enable_autosave", "enable_community", "health_check", "post_status"] as const;

      // 1) Fetch pending jobs of the correct type for this phase
      const { data: pendingJobs, error: fetchErr } = await supabase
        .from("warmup_jobs")
        .select("id, job_type, run_at, payload")
        .eq("cycle_id", cycle.id)
        .eq("status", "pending")
        .in("job_type", targetTypes)
        .order("run_at", { ascending: true });
      if (fetchErr) throw fetchErr;

      let forcedCount = 0;
      let forcedSystemJobType: string | null = null;

      if (pendingJobs && pendingJobs.length > 0) {
        let jobsToAccelerate = pendingJobs;

        // For pre_24h: filter out join_group jobs for groups already joined
        if (phase === "pre_24h") {
          const joinedGroupIds = new Set(
            instanceGroups
              .filter((g) => g.join_status === "joined")
              .map((g) => g.group_id)
          );
          // Also consider groups recognized via live chats
          for (const g of instanceGroups) {
            if (g.join_status !== "joined") {
              const poolName = g.warmup_groups_pool?.name;
              const normalizedName = poolName ? normalizeGroupName(poolName) : "";
              const liveMatch = normalizedName && liveDeviceGroups.some(
                (lg) => normalizeGroupName(lg.name) === normalizedName
              );
              if (liveMatch || (g.group_jid && liveDeviceGroups.some((lg) => lg.id === g.group_jid))) {
                joinedGroupIds.add(g.group_id);
              }
            }
          }

          const alreadyJoinedJobIds: string[] = [];
          const remainingJobs: typeof pendingJobs = [];

          for (const job of jobsToAccelerate) {
            const groupId = (job.payload as any)?.group_id;
            if (groupId && joinedGroupIds.has(groupId)) {
              alreadyJoinedJobIds.push(job.id);
            } else {
              remainingJobs.push(job);
            }
          }

          // Cancel jobs for groups already joined
          if (alreadyJoinedJobIds.length > 0) {
            await supabase
              .from("warmup_jobs")
              .update({ status: "cancelled", last_error: "Grupo já ingressado — cancelado na aceleração" })
              .in("id", alreadyJoinedJobIds);
          }

          jobsToAccelerate = remainingJobs;
        }

        if (jobsToAccelerate.length > 0) {
          // Recalculate: shift timeline so first job starts NOW, keep relative delays
          const originalFirstMs = new Date(jobsToAccelerate[0].run_at).getTime();
          const shift = nowMs - originalFirstMs;

          for (const job of jobsToAccelerate) {
            const newMs = new Date(job.run_at).getTime() + shift;
            const { error: updateErr } = await supabase
              .from("warmup_jobs")
              .update({ run_at: new Date(newMs).toISOString() })
              .eq("id", job.id)
              .eq("status", "pending");
            if (updateErr) throw updateErr;
          }
        }

        forcedCount = jobsToAccelerate.length;
      } else {
        // 2) No target jobs — try system jobs (phase_transition, daily_reset)
        const { data: systemJobs, error: sysErr } = await supabase
          .from("warmup_jobs")
          .select("id, job_type, run_at")
          .eq("cycle_id", cycle.id)
          .eq("status", "pending")
          .in("job_type", ["phase_transition", "daily_reset"])
          .order("run_at", { ascending: true })
          .limit(5);
        if (sysErr) throw sysErr;

        let nextJob = systemJobs?.find(j => j.job_type === "phase_transition")
          || systemJobs?.[0]
          || null;

        // Self-heal for pre_24h: revive stuck transition/reset jobs
        if (!nextJob && phase === "pre_24h") {
          const { data: stuckJobs, error: stuckErr } = await supabase
            .from("warmup_jobs")
            .select("id, job_type, status")
            .eq("cycle_id", cycle.id)
            .in("job_type", ["phase_transition", "daily_reset"])
            .order("updated_at", { ascending: false })
            .limit(5);
          if (stuckErr) throw stuckErr;

          const recoverableJob = stuckJobs?.find(j => j.job_type === "phase_transition")
            || stuckJobs?.find(j => j.job_type === "daily_reset")
            || null;

          if (recoverableJob) {
            const { data: revived, error: reviveErr } = await supabase
              .from("warmup_jobs")
              .update({ status: "pending", run_at: nowIso, attempts: 0, last_error: null })
              .eq("id", recoverableJob.id)
              .neq("status", "running")
              .select("id, job_type")
              .maybeSingle();
            if (reviveErr) throw reviveErr;
            if (revived) {
              nextJob = { ...revived, run_at: nowIso };
              forcedCount = 1;
              forcedSystemJobType = revived.job_type || null;
            }
          }
        }

        if (!nextJob) {
          toast({ title: "Nenhum job pendente", description: "Não há tarefas pendentes para forçar neste ciclo." });
          return;
        }

        if (forcedCount === 0) {
          const { data: updated, error: updateErr } = await supabase
            .from("warmup_jobs")
            .update({ run_at: nowIso })
            .eq("id", nextJob.id)
            .eq("status", "pending")
            .select("id");
          if (updateErr) throw updateErr;
          forcedCount = updated?.length || 0;
          forcedSystemJobType = nextJob.job_type || null;

          if (forcedCount === 0) {
            toast({ title: "Nenhum job pendente", description: "Não foi possível forçar o próximo job." });
            return;
          }
        }
      }

      // Trigger warmup-tick immediately
      try {
        await supabase.functions.invoke("warmup-tick", { body: {} });
      } catch (_e) {}

      await queryClient.invalidateQueries({ queryKey: ["warmup_jobs_scheduled", cycle.id] });

      const desc = phase === "pre_24h"
        ? `${forcedCount} entrada(s) em grupo recalculadas a partir de agora.`
        : forcedSystemJobType
          ? `Próximo job (${forcedSystemJobType}) forçado para agora.`
          : `${forcedCount} tarefa(s) recalculadas mantendo o cronograma.`;

      toast({ title: "⚡ Recalculado!", description: desc });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setAccelerating(false);
    }
  };

  /* advance day: skip current day's jobs, move to next day (or complete if last day) */
  const handleAdvancePhase = async () => {
    if (!deviceId || !cycle) return;
    setAdvancingPhase(true);
    try {
      // Always read latest cycle from DB to avoid stale UI/cache
      const { data: latestCycle, error: latestErr } = await supabase
        .from("warmup_cycles")
        .select("id, phase, day_index, days_total, chip_state")
        .eq("id", cycle.id)
        .single();
      if (latestErr) throw latestErr;

      // If already completed, nothing to do
      if (latestCycle.phase === "completed") {
        toast({ title: "Ciclo já concluído", description: "Este ciclo já foi finalizado." });
        return;
      }

      const newDayIndex = (latestCycle.day_index || 1) + 1;
      const isLastDay = newDayIndex > (latestCycle.days_total || 30);
      const finalDayIndex = isLastDay ? latestCycle.days_total : newDayIndex;
      
      // Phase progression matching engine logic:
      // Day 1 = pre_24h, Days 2-4(new/recovered) or 2-7(unstable) = groups_only,
      // Next day = autosave_enabled, Then = community_enabled
      const chip = latestCycle.chip_state || "new";
      const groupsEndDay = chip === "unstable" ? 7 : 4;
      const getPhaseForDay = (day: number) => {
        if (day <= 1) return "pre_24h";
        if (day <= groupsEndDay) return "groups_only";
        if (day === groupsEndDay + 1) return "autosave_enabled";
        return "community_enabled";
      };
      const nextPhase = isLastDay ? "completed" : getPhaseForDay(finalDayIndex);

      // 1) Cancel ALL pending jobs (including daily_reset, phase_transition)
      // This prevents the old daily_reset from firing and advancing the day again
      await supabase
        .from("warmup_jobs")
        .update({ status: "cancelled", last_error: "Dia pulado manualmente" })
        .eq("cycle_id", cycle.id)
        .eq("status", "pending");

      // 2) Persist new day + phase
      const { error } = await supabase
        .from("warmup_cycles")
        .update({
          phase: nextPhase,
          previous_phase: latestCycle.phase,
          day_index: finalDayIndex,
          daily_interaction_budget_used: 0,
          daily_unique_recipients_used: 0,
          is_running: !isLastDay,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cycle.id);
      if (error) throw error;

      // 3) Schedule jobs for new day + new daily_reset for tomorrow
      if (!isLastDay) {
        // Schedule interaction jobs for today's remaining window (7-19 BRT)
        const { error: fnErr } = await supabase.functions.invoke("warmup-engine", {
          body: {
            action: "schedule_day",
            device_id: deviceId,
            cycle_id: cycle.id,
            day_index: finalDayIndex,
            phase: nextPhase,
            chip_state: latestCycle.chip_state || "new",
          },
        });
        if (fnErr) console.warn("schedule_day invoke error:", fnErr);

        // Schedule new daily_reset for tomorrow at 00:05 BRT (03:05 UTC)
        const tomorrow = new Date();
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        tomorrow.setUTCHours(3, 5, 0, 0);
        await supabase.from("warmup_jobs").insert({
          user_id: user!.id,
          device_id: deviceId,
          cycle_id: cycle.id,
          job_type: "daily_reset",
          payload: {},
          run_at: tomorrow.toISOString(),
          status: "pending",
        });
      }

      // 4) Audit log
      await supabase.from("warmup_audit_logs").insert({
        user_id: user!.id,
        device_id: deviceId,
        cycle_id: cycle.id,
        event_type: "manual_day_advance",
        level: "info",
        message: isLastDay
          ? `Ciclo concluído manualmente no dia ${latestCycle.day_index}`
          : `Dia pulado: ${latestCycle.day_index} → ${finalDayIndex} (fase: ${nextPhase})`,
        meta: { from_day: latestCycle.day_index, to_day: finalDayIndex, phase: nextPhase },
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["warmup_cycle_device", deviceId] }),
        queryClient.invalidateQueries({ queryKey: ["warmup_cycles"] }),
        queryClient.invalidateQueries({ queryKey: ["warmup_jobs_scheduled", cycle.id] }),
        queryClient.invalidateQueries({ queryKey: ["warmup_audit_logs", cycle.id] }),
      ]);

      toast({
        title: isLastDay ? "✅ Ciclo concluído!" : "🚀 Dia pulado!",
        description: isLastDay
          ? "O aquecimento foi finalizado."
          : `Avançou para dia ${finalDayIndex}/${latestCycle.days_total}`,
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setAdvancingPhase(false);
    }
  };

  /* countdown */
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!cycle || cycle.phase !== "pre_24h") return;
    const tick = () => {
      const end = new Date(cycle.first_24h_ends_at).getTime();
      const start = end - 24 * 3600000;
      const now = Date.now();
      const elapsed = now - start;
      if (elapsed >= 24 * 3600000) { setCountdown("24:00:00"); return; }
      if (elapsed < 0) { setCountdown("00:00:00"); return; }
      const h = Math.floor(elapsed / 3600000);
      const m = Math.floor((elapsed % 3600000) / 60000);
      const s = Math.floor((elapsed % 60000) / 1000);
      setCountdown(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [cycle]);

  const isConnected = device && ["Connected", "Ready", "authenticated"].includes(device.status);

  const normalizeGroupName = (value?: string | null) =>
    (value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const normalizeInviteLink = (value?: string | null) =>
    (value || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^chat\.whatsapp\.com\//, "")
      .split("?")[0]
      .replace(/\/$/, "");

  const { data: liveDeviceGroups = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["warmup_live_groups", deviceId],
    queryFn: async () => {
      if (!deviceId) return [];
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        if (!token) return [];

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whapi-chats?action=list_chats&device_id=${deviceId}&count=200`,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
        if (!res.ok) return [];

        const json = await res.json();
        const chats = Array.isArray(json?.chats) ? json.chats : [];
        const dedup = new Map<string, { id: string; name: string }>();

        for (const c of chats) {
          const id = c.id || c.jid || c.chatId || c.JID || "";
          const name = c.name || c.subject || c.title || c.id || "Grupo sem nome";
          if (!id || !String(id).includes("@g.us")) continue;
          if (!dedup.has(id)) dedup.set(id, { id, name });
        }

        return Array.from(dedup.values());
      } catch {
        return [];
      }
    },
    enabled: !!user && !!deviceId && !!isConnected,
    refetchInterval: 120000,
    staleTime: 30000,
  });

  const { data: joinEvidence = [] } = useQuery<{ group_name: string | null; group_link: string | null }[]>({
    queryKey: ["warmup_group_join_evidence", deviceId],
    queryFn: async () => {
      if (!deviceId) return [];
      const { data, error } = await supabase
        .from("group_join_logs")
        .select("group_name, group_link")
        .eq("device_id", deviceId)
        .in("result", ["success", "already_member"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return [];
      return data || [];
    },
    enabled: !!user && !!deviceId,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const { data: poolGroups = [] } = useQuery<{ id: string; name: string; external_group_ref: string | null }[]>({
    queryKey: ["warmup_pool_groups_for_counter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warmup_groups_pool")
        .select("id, name, external_group_ref")
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Backfill: se a instância não tem vínculo local com grupos, cria vínculos do pool para destravar contagem
  useEffect(() => {
    if (!user?.id || !deviceId || !cycle?.id || poolGroups.length === 0) return;

    const existingGroupIds = new Set(instanceGroups.map((g) => g.group_id));
    const missingPoolGroups = poolGroups.filter((g) => !existingGroupIds.has(g.id));
    if (missingPoolGroups.length === 0) return;

    const seedMissingGroups = async () => {
      const { error } = await supabase
        .from("warmup_instance_groups")
        .upsert(
          missingPoolGroups.map((g) => ({
            user_id: user.id,
            device_id: deviceId,
            cycle_id: cycle.id,
            group_id: g.id,
            join_status: "pending" as const,
          })),
          { onConflict: "device_id,group_id", ignoreDuplicates: true }
        );

      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["warmup_instance_groups", deviceId] });
      }
    };

    void seedMissingGroups();
  }, [user?.id, deviceId, cycle?.id, poolGroups, instanceGroups, queryClient]);

  // Auto-reconhece grupos já ingressados e sincroniza status local
  useEffect(() => {
    if (!deviceId || instanceGroups.length === 0) return;

    const liveJids = new Set(liveDeviceGroups.map((g) => g.id));
    const liveNameToJid = new Map<string, string>();
    for (const g of liveDeviceGroups) {
      const normalized = normalizeGroupName(g.name);
      if (normalized && !liveNameToJid.has(normalized)) liveNameToJid.set(normalized, g.id);
    }

    const evidenceNames = new Set(
      joinEvidence
        .map((item) => normalizeGroupName(item.group_name))
        .filter(Boolean)
    );
    const evidenceLinks = new Set(
      joinEvidence
        .map((item) => normalizeInviteLink(item.group_link))
        .filter(Boolean)
    );

    const toPromote = instanceGroups
      .filter((g) => g.join_status !== "joined")
      .map((g) => {
        const poolName = g.warmup_groups_pool?.name;
        const poolLink = g.warmup_groups_pool?.external_group_ref;

        const byJid = g.group_jid && liveJids.has(g.group_jid) ? g.group_jid : null;
        const byName = poolName ? liveNameToJid.get(normalizeGroupName(poolName)) || null : null;
        const byEvidenceName = poolName ? evidenceNames.has(normalizeGroupName(poolName)) : false;
        const byEvidenceLink = poolLink ? evidenceLinks.has(normalizeInviteLink(poolLink)) : false;

        const matchedJid = byJid || byName;
        const hasEvidence = byEvidenceName || byEvidenceLink;

        if (!matchedJid && !hasEvidence) return null;
        return { id: g.id, matchedJid };
      })
      .filter((g): g is { id: string; matchedJid: string | null } => !!g);

    if (toPromote.length === 0) return;

    const syncRecognizedGroups = async () => {
      const now = new Date().toISOString();
      await Promise.all(
        toPromote.map((row) => {
          const payload: Record<string, string | null> = {
            join_status: "joined",
            joined_at: now,
            last_error: null,
          };
          if (row.matchedJid) payload.group_jid = row.matchedJid;

          return supabase
            .from("warmup_instance_groups")
            .update(payload)
            .eq("id", row.id)
            .neq("join_status", "joined");
        })
      );
      queryClient.invalidateQueries({ queryKey: ["warmup_instance_groups", deviceId] });
    };

    void syncRecognizedGroups();
  }, [deviceId, instanceGroups, liveDeviceGroups, joinEvidence, queryClient]);

  /* handlers */
  const handleStartWarmup = () => {
    if (!deviceId) return;
    const plan = plans.find(p => p.days_total === Number(daysTotal));
    engine.mutate(
      { action: "start", device_id: deviceId, chip_state: chipState, days_total: Number(daysTotal), plan_id: plan?.id },
      {
        onSuccess: () => toast({ title: "🔥 Aquecimento iniciado!", description: "Seu chip está sendo aquecido. Acompanhe o progresso aqui." }),
        onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handlePause = () => {
    if (!deviceId) return;
    engine.mutate({ action: "pause", device_id: deviceId }, { onSuccess: () => toast({ title: "Aquecimento pausado" }) });
  };

  const handleResume = () => {
    if (!deviceId) return;
    engine.mutate({ action: "resume", device_id: deviceId }, { onSuccess: () => toast({ title: "Aquecimento retomado" }) });
  };

  const handleFinish = () => {
    if (!deviceId) return;
    engine.mutate(
      { action: "stop", device_id: deviceId },
      { onSuccess: () => { setShowFinishConfirm(false); toast({ title: "✅ Ciclo encerrado", description: "O aquecimento foi finalizado com sucesso." }); } }
    );
  };

  if (!device) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Count real joined groups: DB joined + grupos detectados ao vivo + evidência de join logs
  const byGroupId = new Map<string, {
    group_id: string;
    join_status: string;
    group_jid?: string | null;
    warmup_groups_pool?: { name: string; external_group_ref?: string | null } | null;
  }>();

  for (const g of instanceGroups) {
    byGroupId.set(g.group_id, {
      group_id: g.group_id,
      join_status: g.join_status,
      group_jid: g.group_jid,
      warmup_groups_pool: g.warmup_groups_pool,
    });
  }

  for (const g of poolGroups) {
    if (!byGroupId.has(g.id)) {
      byGroupId.set(g.id, {
        group_id: g.id,
        join_status: "pending",
        group_jid: null,
        warmup_groups_pool: {
          name: g.name,
          external_group_ref: g.external_group_ref,
        },
      });
    }
  }

  const counterGroups = Array.from(byGroupId.values());

  const trackedGroupIds = new Set(counterGroups.map(g => g.group_id));
  const liveGroupJids = new Set(liveDeviceGroups.map(g => g.id));
  const liveGroupNames = new Set(liveDeviceGroups.map(g => normalizeGroupName(g.name)));
  const evidenceGroupNames = new Set(joinEvidence.map(g => normalizeGroupName(g.group_name)).filter(Boolean));
  const evidenceGroupLinks = new Set(joinEvidence.map(g => normalizeInviteLink(g.group_link)).filter(Boolean));

  const recognizedGroupIds = new Set(
    counterGroups
      .filter((g) => {
        if (g.join_status === "joined") return true;
        if (g.group_jid && liveGroupJids.has(g.group_jid)) return true;

        const groupName = g.warmup_groups_pool?.name;
        if (groupName) {
          const normalizedName = normalizeGroupName(groupName);
          if (liveGroupNames.has(normalizedName) || evidenceGroupNames.has(normalizedName)) return true;

          // Fuzzy: check if any live group name contains the pool name or vice versa (substring match)
          for (const liveName of liveGroupNames) {
            if (liveName && normalizedName && liveName.length >= 4 && normalizedName.length >= 4) {
              if (liveName.includes(normalizedName) || normalizedName.includes(liveName)) return true;
            }
          }
        }

        const groupLink = g.warmup_groups_pool?.external_group_ref;
        if (groupLink && evidenceGroupLinks.has(normalizeInviteLink(groupLink))) return true;

        return false;
      })
      .map((g) => g.group_id)
  );

  const totalTrackedGroups = trackedGroupIds.size > 0 ? trackedGroupIds.size : 8;
  const joinedGroups = Math.min(recognizedGroupIds.size, totalTrackedGroups);
  const pendingGroups = Math.max(0, totalTrackedGroups - joinedGroups);
  const activeContacts = autosaveContacts.filter(c => c.is_active).length;
  const pc = cycle ? phaseConfig[cycle.phase] || phaseConfig.pre_24h : null;
  const isTerminalCycle = cycle ? ["completed", "error"].includes(cycle.phase) : false;

  return (
    <div className="w-full space-y-6 pb-8">

      {/* ═══════════ HERO HEADER ═══════════ */}
      <div className="relative rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-xl overflow-hidden shadow-[0_0_40px_-12px_hsl(var(--primary)/0.15)]">
        {/* ambient glow */}
        <div className={cn(
          "absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[120px] opacity-25 pointer-events-none",
          isConnected ? "bg-primary" : "bg-muted-foreground"
        )} />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full blur-[80px] opacity-10 pointer-events-none bg-primary" />

        <div className="relative z-10">
          {/* top bar */}
          <div className="flex items-center justify-between px-6 pt-5">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30" onClick={() => navigate("/dashboard/warmup-v2")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-extrabold uppercase tracking-[0.15em] px-4 py-1.5 gap-2 rounded-full border backdrop-blur-sm",
                isConnected
                  ? "text-primary border-primary/30 bg-primary/10 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.3)]"
                  : "text-muted-foreground border-border bg-muted/10"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full inline-block", isConnected ? "bg-primary animate-pulse shadow-[0_0_6px_hsl(var(--primary)/0.6)]" : "bg-muted-foreground")} />
              {isConnected ? "CONECTADO" : "DESCONECTADO"}
            </Badge>
          </div>

          {/* instance identity */}
          <div className="px-6 pt-5 pb-6 flex items-center gap-5">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ring-2 ring-offset-2 ring-offset-transparent",
              isConnected ? "bg-primary/12 ring-primary/40 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.3)]" : "bg-muted/20 ring-border/20"
            )}>
              {device.profile_picture ? (
                <img src={device.profile_picture} className="w-16 h-16 rounded-2xl object-cover" alt="" />
              ) : (
                <Flame className={cn("w-7 h-7", isConnected ? "text-primary" : "text-muted-foreground")} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold text-foreground truncate leading-tight tracking-tight">
                {device.profile_name || device.name}
              </h1>
              {device.number && (
                <p className="text-sm font-mono text-muted-foreground/60 mt-1">{device.number}</p>
              )}
              {cycle && pc && (
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={cn("text-xs font-bold", pc.color)}>{pc.label}</span>
                  <span className="text-muted-foreground/20">•</span>
                  <span className="text-xs text-muted-foreground font-medium">Dia {cycle.day_index}/{cycle.days_total}</span>
                </div>
              )}
            </div>
          </div>

          {/* action row */}
          {cycle && !isTerminalCycle && (
            <div className="px-6 pb-6 space-y-2.5">
              {cycle.is_running ? (
                <Button
                  className="w-full gap-2 h-11 rounded-xl bg-primary/12 text-primary border border-primary/25 hover:bg-primary/20 font-bold backdrop-blur-sm shadow-[0_0_15px_-4px_hsl(var(--primary)/0.2)]"
                  variant="ghost"
                  onClick={handlePause}
                >
                  <Pause className="w-4 h-4" /> Pausar aquecimento
                </Button>
              ) : cycle.phase === "paused" ? (
                <Button
                  className="w-full gap-2 h-11 rounded-xl bg-primary/12 text-primary border border-primary/25 hover:bg-primary/20 font-bold backdrop-blur-sm"
                  variant="ghost"
                  onClick={handleResume}
                >
                  <Play className="w-4 h-4" /> Retomar aquecimento
                </Button>
              ) : null}

              {/* Accelerate buttons */}
              {cycle.is_running && (
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    variant="outline"
                    className="gap-1.5 h-10 rounded-xl text-xs border-amber-500/25 text-amber-400 hover:bg-amber-500/12 hover:text-amber-300 font-bold backdrop-blur-sm shadow-[0_0_12px_-4px_hsl(38_92%_50%/0.15)]"
                    onClick={() => setShowAccelerateConfirm(true)}
                    disabled={accelerating || (cycle.phase !== "pre_24h" && scheduledJobs.filter(j => j.status === "pending").length === 0)}
                  >
                    {accelerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FastForward className="w-3.5 h-3.5" />}
                    Executar Agora
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5 h-10 rounded-xl text-xs border-purple-500/25 text-purple-400 hover:bg-purple-500/12 hover:text-purple-300 font-bold backdrop-blur-sm shadow-[0_0_12px_-4px_hsl(270_60%_50%/0.15)]"
                    onClick={() => setShowAdvanceConfirm(true)}
                    disabled={advancingPhase || cycle.phase === "completed"}
                  >
                    {advancingPhase ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SkipForward className="w-3.5 h-3.5" />}
                    Pular Dia
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ WIZARD (no cycle) ═══════════ */}
      {(!cycle || isTerminalCycle) && !cycleLoading && (
        <div className="space-y-6">
          {/* chip state selector */}
          <div className="space-y-3">
            <p className="text-xs font-extrabold text-foreground uppercase tracking-[0.15em]">Estado do chip</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: "new" as const, label: "Chip Novo", desc: "Progressão conservadora", emoji: "🟢" },
                { value: "recovered" as const, label: "Chip Recuperado", desc: "Extra cauteloso, já sofreu ban", emoji: "🔴" },
                { value: "unstable" as const, label: "Chip Fraco", desc: "Sofre restrição facilmente", emoji: "🟡" },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setChipState(opt.value)}
                  className={cn(
                    "text-left p-4 rounded-2xl border-2 transition-all duration-200 backdrop-blur-xl",
                    chipState === opt.value
                      ? "border-primary bg-primary/8 shadow-[0_0_30px_-6px_hsl(var(--primary)/0.3)]"
                      : "border-border/30 hover:border-primary/25 bg-card/50 hover:bg-card/70"
                  )}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <p className="text-sm font-extrabold text-foreground mt-2">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-tight font-medium">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* duration */}
          <div className="space-y-2">
            <p className="text-xs font-extrabold text-foreground uppercase tracking-[0.15em]">Duração do ciclo</p>
            <Select value={daysTotal} onValueChange={setDaysTotal}>
              <SelectTrigger className="rounded-xl h-11 bg-card/50 backdrop-blur-xl border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[7, 14, 21, 30].map(d => (
                  <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* protections */}
          <div className="rounded-2xl border border-primary/15 bg-card/50 backdrop-blur-xl p-6 space-y-3 shadow-[0_0_20px_-8px_hsl(var(--primary)/0.1)]">
            <p className="text-xs font-extrabold text-foreground flex items-center gap-2.5">
              <Shield className="w-4.5 h-4.5 text-primary" />
              Proteções automáticas
            </p>
            <ul className="grid gap-2 list-disc list-inside">
              {[
                "Limites diários automáticos",
                "Delays aleatórios entre ações",
                "Evolução progressiva de fases",
                "Proteção contínua do chip",
              ].map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed font-medium">{item}</li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <Button
            className="w-full gap-2.5 h-13 rounded-xl text-sm font-black bg-amber-600 hover:bg-amber-700 text-white shadow-[0_8px_30px_-6px_hsl(38_92%_50%/0.4)] transition-all hover:shadow-[0_8px_40px_-4px_hsl(38_92%_50%/0.5)]"
            onClick={() => {
              if (Number(daysTotal) <= 7) {
                setShowShortDaysWarning(true);
              } else {
                handleStartWarmup();
              }
            }}
            disabled={!isConnected || engine.isPending}
          >
            {engine.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Flame className="w-5 h-5" />
            )}
            {isTerminalCycle ? "Começar Novo Aquecimento" : "Começar Aquecimento"}
          </Button>
          {!isConnected && (
            <p className="text-xs text-amber-400 text-center -mt-2 font-semibold">⚠ Conecte a instância primeiro para iniciar</p>
          )}
        </div>
      )}

      {/* Short days warning dialog */}
      <Dialog open={showShortDaysWarning} onOpenChange={setShowShortDaysWarning}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Duração curta
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p><strong className="text-foreground">7 dias não é o ideal para aquecimento.</strong></p>
            <p>Recomendamos no mínimo <strong className="text-foreground">14 dias</strong> para que o chip passe por todas as fases de forma segura e eficiente.</p>
            <p className="text-xs text-muted-foreground/60">Com apenas 7 dias, o chip pode não atingir maturidade suficiente para envios em massa.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setShowShortDaysWarning(false); setDaysTotal("14"); }}>
              Alterar para 14 dias
            </Button>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { setShowShortDaysWarning(false); handleStartWarmup(); }}>
              Iniciar com {daysTotal} dias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ ACTIVE CYCLE ═══════════ */}
      {cycle && !isTerminalCycle && (
        <div className="space-y-5">

          {/* Phase stepper + day progress */}
          <div className="rounded-2xl border border-primary/15 bg-card/50 backdrop-blur-xl p-6 space-y-5 shadow-[0_0_30px_-10px_hsl(var(--primary)/0.1)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {pc && <pc.icon className={cn("w-5 h-5", pc.color)} />}
                <span className={cn("text-base font-extrabold tracking-tight", pc?.color)}>{pc?.label}</span>
              </div>
              <span className="text-xs font-mono font-bold text-foreground bg-muted/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border/20">
                Dia {cycle.day_index}/{cycle.days_total}
              </span>
            </div>

            {/* phase stepper */}
            <div className="flex items-center gap-1.5">
              {phaseSteps.map((p) => {
                const isActive = cycle.phase === p;
                const isPast = (phaseConfig[cycle.phase]?.step || 0) > (phaseConfig[p]?.step || 0);
                return (
                  <div key={p} className="flex-1 group relative">
                    <div className={cn(
                      "h-2.5 rounded-full transition-all",
                      isActive ? "bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]" : isPast ? "bg-primary/30" : "bg-muted/25 dark:bg-muted/15"
                    )} />
                    <span className={cn(
                      "absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-bold whitespace-nowrap transition-opacity",
                      isActive ? cn("opacity-100", pc?.color) : "opacity-0 group-hover:opacity-70 text-muted-foreground"
                    )}>
                      {phaseConfig[p]?.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4">
              <Progress value={(cycle.day_index / cycle.days_total) * 100} className="h-2" />
              <p className="text-[10px] text-muted-foreground font-semibold mt-1.5 text-right">
                {Math.round((cycle.day_index / cycle.days_total) * 100)}% concluído
              </p>
            </div>
          </div>

          {/* Countdown (pre_24h only) */}
          {cycle.phase === "pre_24h" && (
            <div className="relative rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/8 to-amber-500/2 backdrop-blur-xl p-8 flex flex-col items-center text-center overflow-hidden shadow-[0_0_30px_-8px_hsl(38_92%_50%/0.15)]">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-[80px] opacity-20 pointer-events-none bg-amber-500" />
              <div className="relative w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center mb-4 shadow-[0_0_20px_-4px_hsl(38_92%_50%/0.3)]">
                <Timer className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Tempo decorrido</p>
              <p className="text-5xl font-black text-foreground font-mono tabular-nums mt-2 tracking-tight">{countdown}</p>
              <p className="text-xs text-muted-foreground/70 mt-4 max-w-sm leading-relaxed">
                Entrada gradual nos grupos em andamento. Os primeiros grupos serão ingressados em 4-6 horas.
              </p>
            </div>
          )}

          {/* ── Plano do Dia — O que vai acontecer hoje ── */}
          <div className="rounded-2xl border border-border/15 bg-card/50 backdrop-blur-xl overflow-hidden shadow-[0_4px_24px_-8px_hsl(var(--foreground)/0.06)]">
            <div className="px-6 py-5 border-b border-border/10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/12 flex items-center justify-center shadow-[0_0_12px_-2px_hsl(var(--primary)/0.2)]">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-base font-extrabold text-foreground tracking-tight">Plano do Dia {cycle.day_index}</span>
                <p className="text-[11px] text-muted-foreground font-medium">O que está programado para hoje</p>
              </div>
              <Badge className="text-[10px] h-6 rounded-lg font-extrabold bg-primary/12 text-primary border border-primary/20 hover:bg-primary/12 shadow-[0_0_8px_-2px_hsl(var(--primary)/0.2)]">
                {pc?.label}
              </Badge>
            </div>

            {/* Phase explanation */}
            <div className="px-6 py-5 border-b border-border/8">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {cycle.phase === "pre_24h" && (
                  <>
                    🛡️ <strong className="text-foreground font-bold">Fase de proteção inicial.</strong> Nenhuma mensagem será enviada. Após 4-6 horas, o chip começará a entrar nos 8 grupos oficiais do sistema com intervalos de 5 a 30 minutos entre cada entrada, simulando comportamento natural.
                  </>
                )}
                {(cycle.phase === "groups_only" || cycle.phase === "autosave_enabled" || cycle.phase === "community_enabled" || (cycle.phase as string) === "community_light") && (
                  <>
                    💬 <strong className="text-foreground font-bold">Fase de interação em grupos.</strong> O sistema enviará mensagens nos grupos que já ingressou e fará postagens de status, simulando participação natural com textos variados e delays aleatórios.
                  </>
                )}
                {cycle.phase === "completed" && (
                  <>
                    ✅ <strong className="text-foreground font-bold">Aquecimento concluído!</strong> O chip está pronto para uso em campanhas.
                  </>
                )}
                {cycle.phase === "paused" && (
                  <>
                    ⏸️ <strong className="text-foreground font-bold">Aquecimento pausado.</strong> {cycle.last_error || "Retome quando quiser continuar o processo."}
                  </>
                )}
              </p>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-3 divide-x divide-border/8">
              <div className="px-4 py-5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-bold mb-1.5">Msgs Hoje</p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {cycle.daily_interaction_budget_used}
                  <span className="text-sm text-muted-foreground/35 font-semibold">/{cycle.daily_interaction_budget_target}</span>
                </p>
                <p className="text-[9px] text-muted-foreground/50 mt-1 font-medium">Enviadas / limite</p>
              </div>
              <div className="px-4 py-5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-bold mb-1.5">Destinos</p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {cycle.daily_unique_recipients_used}
                  <span className="text-sm text-muted-foreground/35 font-semibold">/{cycle.daily_unique_recipients_cap}</span>
                </p>
                <p className="text-[9px] text-muted-foreground/50 mt-1 font-medium">Pessoas contactadas</p>
              </div>
              <div className="px-4 py-5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-bold mb-1.5">Grupos</p>
                <p className="text-2xl font-black tabular-nums text-foreground">
                  {joinedGroups}
                  <span className="text-sm text-muted-foreground/35 font-semibold">/{totalTrackedGroups}</span>
                </p>
                {pendingGroups > 0 ? (
                  <p className="text-[9px] text-amber-400 font-bold mt-1">{pendingGroups} aguardando</p>
                ) : (
                  <p className="text-[9px] text-muted-foreground/50 mt-1 font-medium">Ingressados</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Auto Save Toggle ── */}
          {(() => {
            const autosaveDay = getAutosaveStartDay(cycle.chip_state || "new");
            const isUnlockedAS = cycle.day_index >= autosaveDay;
            const isAutosavePhase = ["autosave_enabled", "community_enabled", "community_light"].includes(cycle.phase);
            const autosaveActive = isUnlockedAS && isAutosavePhase;

            return (
              <div className={cn(
                "rounded-2xl border bg-card/50 backdrop-blur-xl overflow-hidden transition-all shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.04)]",
                isUnlockedAS ? "border-emerald-500/25 shadow-[0_0_25px_-8px_hsl(142_71%_45%/0.12)]" : "border-border/15 opacity-50"
              )}>
                <div className="px-6 py-5 flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isUnlockedAS ? "bg-emerald-500/12 shadow-[0_0_12px_-2px_hsl(142_71%_45%/0.2)]" : "bg-muted/20"
                  )}>
                    <MessageSquare className={cn("w-5 h-5", isUnlockedAS ? "text-emerald-400" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-sm font-extrabold", isUnlockedAS ? "text-foreground" : "text-muted-foreground")}>
                      Auto Save
                    </span>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {isUnlockedAS
                        ? autosaveActive
                          ? "Ativo — salvando contatos automaticamente"
                          : "Desativado"
                        : `🔒 Disponível a partir do Dia ${autosaveDay}`
                      }
                    </p>
                  </div>
                  <Switch
                    checked={autosaveActive}
                    disabled={!isUnlockedAS}
                    onCheckedChange={(checked) => {
                      toggleAutosave.mutate({
                        deviceId: deviceId!,
                        cycleId: cycle.id,
                        enable: checked,
                      });
                    }}
                  />
                </div>
                {!isUnlockedAS && (
                  <div className="px-6 pb-4">
                    <div className="flex items-center gap-2">
                      <Progress value={(cycle.day_index / autosaveDay) * 100} className="h-2 flex-1" />
                      <span className="text-[10px] text-muted-foreground font-mono font-bold">
                        Dia {cycle.day_index}/{autosaveDay}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Comunitário Toggle ── */}
          {(() => {
            const communityDay = getCommunityStartDay(cycle.chip_state || "new");
            const isUnlocked = cycle.day_index >= communityDay;
            const isCommunityPhase = ["community_enabled", "community_light"].includes(cycle.phase);
            const isEnabled = community?.is_enabled ?? false;

            // Auto-enable community on the first render of community day if not yet toggled
            const shouldAutoEnable = isUnlocked && !community && !isCommunityPhase;

            return (
              <div className={cn(
                "rounded-2xl border bg-card/50 backdrop-blur-xl overflow-hidden transition-all shadow-[0_4px_20px_-8px_hsl(var(--foreground)/0.04)]",
                isUnlocked ? "border-purple-500/25 shadow-[0_0_25px_-8px_hsl(270_60%_50%/0.12)]" : "border-border/15 opacity-50"
              )}>
                <div className="px-6 py-5 flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isUnlocked ? "bg-purple-500/12 shadow-[0_0_12px_-2px_hsl(270_60%_50%/0.2)]" : "bg-muted/20"
                  )}>
                    <Globe className={cn("w-5 h-5", isUnlocked ? "text-purple-400" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-sm font-extrabold", isUnlocked ? "text-foreground" : "text-muted-foreground")}>
                      Comunitário
                    </span>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {isUnlocked
                        ? isEnabled || isCommunityPhase
                          ? "Ativo — trocando mensagens com outros chips do sistema"
                          : "Desativado — este chip não participa do comunitário"
                        : `🔒 Disponível a partir do Dia ${communityDay}`
                      }
                    </p>
                  </div>
                  <Switch
                    checked={isEnabled || isCommunityPhase || shouldAutoEnable}
                    disabled={!isUnlocked || toggleCommunity.isPending}
                    onCheckedChange={(checked) => {
                      toggleCommunity.mutate({
                        deviceId: deviceId!,
                        cycleId: cycle.id,
                        enable: checked,
                      });
                    }}
                  />
                </div>
                {!isUnlocked && (
                  <div className="px-6 pb-4">
                    <div className="flex items-center gap-2">
                      <Progress value={(cycle.day_index / communityDay) * 100} className="h-2 flex-1" />
                      <span className="text-[10px] text-muted-foreground font-mono font-bold">
                        Dia {cycle.day_index}/{communityDay}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {(() => {
            // Use São Paulo timezone day buckets to avoid client timezone drift
            const nowUtc = new Date();
            const toBrtDayKey = (date: Date) =>
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "America/Sao_Paulo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(date);
            const formatBrtTime = (date: Date) =>
              new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).format(date);

            const actionableTypes = new Set([
              "join_group",
              "group_interaction",
              "autosave_interaction",
              "community_interaction",
            ]);

            const sortedJobs = [...scheduledJobs]
              .filter((j) => j.status !== "cancelled")
              .sort((a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime());

            const todayKey = toBrtDayKey(nowUtc);
            const todayJobs = sortedJobs.filter((j) => toBrtDayKey(new Date(j.run_at)) === todayKey);
            const futureJobs = sortedJobs.filter((j) => new Date(j.run_at) >= nowUtc);

            // If there is no job for "today" in BRT, show the next planned day
            let displayJobs = todayJobs;
            if (displayJobs.length === 0) {
              const nextPlannedJob = futureJobs.find((j) => actionableTypes.has(j.job_type)) ?? futureJobs[0];
              if (nextPlannedJob) {
                const nextDayKey = toBrtDayKey(new Date(nextPlannedJob.run_at));
                displayJobs = sortedJobs.filter((j) => toBrtDayKey(new Date(j.run_at)) === nextDayKey);
              }
            }

            const jobTypeLabels: Record<string, { label: string; icon: typeof Target; color: string }> = {
              join_group: { label: "Entrar no grupo", icon: UserPlus, color: "text-teal-400" },
              group_interaction: { label: "Mensagem em grupo", icon: Send, color: "text-primary" },
              autosave_interaction: { label: "Mensagem privada", icon: MessageSquare, color: "text-emerald-400" },
              community_interaction: { label: "Interação comunitária", icon: Globe, color: "text-purple-400" },
              post_status: { label: "Status (desativado)", icon: ImageIcon, color: "text-muted-foreground" },
              phase_transition: { label: "Avançar fase", icon: Zap, color: "text-amber-400" },
              daily_reset: { label: "Reset diário", icon: RotateCcw, color: "text-muted-foreground" },
              health_check: { label: "Verificação de saúde", icon: Shield, color: "text-emerald-400" },
              enable_autosave: { label: "Ativar Auto Save", icon: Zap, color: "text-emerald-400" },
              enable_community: { label: "Ativar Comunidade", icon: Globe, color: "text-purple-400" },
            };

            const statusIcon = (status: string) => {
              if (status === "succeeded") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
              if (status === "running") return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
              if (status === "failed") return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
              if (status === "cancelled") return <Square className="w-3.5 h-3.5 text-muted-foreground/40" />;
              return <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />;
            };

            if (displayJobs.length === 0 && futureJobs.length === 0) return null;

            // Summarize displayed jobs by type
            const typeSummary: Record<string, { total: number; done: number; failed: number; next: Date | null }> = {};
            for (const job of displayJobs) {
              const key = job.job_type;
              if (!typeSummary[key]) typeSummary[key] = { total: 0, done: 0, failed: 0, next: null };
              if (job.status === "succeeded") {
                typeSummary[key].total++;
                typeSummary[key].done++;
              } else if (job.status === "failed") {
                typeSummary[key].total++;
                typeSummary[key].failed++;
              } else if (job.status === "pending") {
                const runAt = new Date(job.run_at);
                typeSummary[key].total++;
                if (!typeSummary[key].next || runAt < typeSummary[key].next!) {
                  typeSummary[key].next = runAt;
                }
              } else if (job.status === "running") {
                typeSummary[key].total++;
              }
            }

            // Cap group_interaction total to the daily budget target for consistency with "Msgs Hoje"
            if (cycle && typeSummary["group_interaction"]) {
              const budget = cycle.daily_interaction_budget_target;
              if (typeSummary["group_interaction"].total > budget) {
                typeSummary["group_interaction"].total = budget;
              }
            }

            const doneToday = cycle?.daily_interaction_budget_used ?? displayJobs.filter((j) => j.status === "succeeded").length;
            const failedToday = displayJobs.filter((j) => j.status === "failed").length;
            const totalDisplay = cycle?.daily_interaction_budget_target || Math.max(
              displayJobs.filter((j) => actionableTypes.has(j.job_type)).length,
              displayJobs.length,
            );
            // Prioritize actionable jobs (phase_transition > interaction) over daily_reset for display
            const pendingJobs = displayJobs.filter((j) => j.status === "pending");
            const nextPendingJob =
              pendingJobs.find((j) => j.job_type === "phase_transition") ||
              pendingJobs.find((j) => actionableTypes.has(j.job_type) && new Date(j.run_at) >= nowUtc) ||
              pendingJobs.find((j) => j.job_type !== "daily_reset" && new Date(j.run_at) >= nowUtc) ||
              pendingJobs.find((j) => new Date(j.run_at) >= nowUtc) ||
              pendingJobs[0] ||
              null;

            const isPre24h = cycle?.phase === "pre_24h";

            return (
              <>
              {/* ── Progresso do Dia (compact) ── */}
              <div className="rounded-2xl border border-teal-500/15 bg-card/50 backdrop-blur-xl overflow-hidden shadow-[0_0_25px_-8px_hsl(172_66%_50%/0.1)]">
                <div className="px-6 py-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/12 flex items-center justify-center shadow-[0_0_12px_-2px_hsl(172_66%_50%/0.2)]">
                    <Target className="w-5 h-5 text-teal-400" />
                  </div>
                  <div className="flex-1">
                    <span className="text-base font-extrabold text-foreground tracking-tight">
                      {isPre24h ? "Fase de Proteção (24h)" : "Progresso do Dia"}
                    </span>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {isPre24h
                        ? "⏳ Aguardando período de proteção inicial"
                        : `✅ ${doneToday} concluídas · ⏳ ${Math.max(0, totalDisplay - doneToday - failedToday)} restantes${failedToday > 0 ? ` · ❌ ${failedToday} falhas` : ""}`
                      }
                    </p>
                  </div>
                  {nextPendingJob && (
                    <div className="text-right bg-muted/30 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/15">
                      <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                        {isPre24h ? "Transição" : "Próxima"}
                      </p>
                      <p className="text-sm font-black text-foreground font-mono">{formatBrtTime(new Date(nextPendingJob.run_at))}</p>
                    </div>
                  )}
                </div>
                {!isPre24h && (
                <div className="px-6 pb-5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-black text-foreground">{doneToday + failedToday}/{totalDisplay}</span>
                    <div className="flex-1 h-2.5 bg-muted/25 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all shadow-[0_0_8px_hsl(142_71%_45%/0.4)]" style={{ width: `${totalDisplay > 0 ? ((doneToday + failedToday) / totalDisplay) * 100 : 0}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold">{totalDisplay > 0 ? Math.round(((doneToday + failedToday) / totalDisplay) * 100) : 0}%</span>
                  </div>
                </div>
                )}
              </div>

              {/* ── Timeline Completa: Atividades Feitas + Agendadas ── */}
              <div className="rounded-2xl border border-border/15 bg-card/50 backdrop-blur-xl overflow-hidden shadow-[0_4px_24px_-8px_hsl(var(--foreground)/0.06)]">
                <div className="px-6 py-5 border-b border-border/10 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/12 flex items-center justify-center shadow-[0_0_12px_-2px_hsl(38_92%_50%/0.2)]">
                    <ScrollText className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <span className="text-base font-extrabold text-foreground tracking-tight">Histórico de Atividades</span>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      Ações realizadas e próximas tarefas agendadas
                    </p>
                  </div>
                </div>

                {(() => {
                  // Build unified timeline from audit logs (past) + scheduled jobs (future)
                  type GroupScheduleItem = { index: number; name: string; time: string; status: "pending" | "done" | "failed" };
                  type TimelineItem = {
                    id: string;
                    time: Date;
                    type: "done" | "running" | "pending" | "failed";
                    label: string;
                    detail?: string;
                    detailGroups?: GroupScheduleItem[];
                    icon: string;
                    color: string;
                  };

                  const items: TimelineItem[] = [];

                  const formatBrtHour = (date: Date) => new Intl.DateTimeFormat("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  }).format(date);

                  const formatOffsetFromStart = (date: Date) => {
                    if (!cycleStartedAt) return "após a janela de 4-6h";
                    const diffMinutes = Math.max(0, Math.round((date.getTime() - cycleStartedAt.getTime()) / 60000));
                    const hours = Math.floor(diffMinutes / 60);
                    const minutes = diffMinutes % 60;
                    if (hours > 0 && minutes > 0) return `após ${hours}h ${minutes}min`;
                    if (hours > 0) return `após ${hours}h`;
                    return `após ${minutes}min`;
                  };

                  const joinGroupJobs = (() => {
                    const allJoinJobs = (scheduledJobs || []).filter((job) => job.job_type === "join_group");
                    const statusWeight = (status: string) => {
                      if (status === "succeeded") return 4;
                      if (status === "running") return 3;
                      if (status === "pending") return 2;
                      if (status === "failed") return 1;
                      return 0; // cancelled
                    };

                    const byGroup = new Map<string, typeof allJoinJobs[number]>();

                    for (const job of allJoinJobs) {
                      const payload = (job.payload && typeof job.payload === "object")
                        ? (job.payload as { group_id?: string; group_name?: string })
                        : {};
                      const key = payload.group_id || payload.group_name || job.id;
                      const prev = byGroup.get(key);

                      if (!prev) {
                        byGroup.set(key, job);
                        continue;
                      }

                      const currWeight = statusWeight(job.status);
                      const prevWeight = statusWeight(prev.status);
                      const currRunAt = new Date(job.run_at).getTime();
                      const prevRunAt = new Date(prev.run_at).getTime();

                      if (currWeight > prevWeight || (currWeight === prevWeight && currRunAt > prevRunAt)) {
                        byGroup.set(key, job);
                      }
                    }

                    return Array.from(byGroup.values())
                      .filter((job) => job.status !== "cancelled")
                      .sort((a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime());
                  })();

                  const buildGroupScheduleItems = (): GroupScheduleItem[] => {
                    if (joinGroupJobs.length > 0) {
                      return joinGroupJobs.map((job, index) => {
                        const payload = (job.payload || {}) as { group_name?: string };
                        return {
                          index: index + 1,
                          name: payload.group_name || `Grupo ${index + 1}`,
                          time: formatBrtHour(new Date(job.run_at)),
                          status: job.status === "succeeded" ? "done" as const
                            : job.status === "failed" ? "failed" as const
                            : "pending" as const,
                        };
                      });
                    }
                    return [];
                  };

                  const groupScheduleItems = buildGroupScheduleItems();

                  // Past items from audit logs (only current + past warmup days)
                  for (const log of auditLogs) {
                    // Filter out logs from future warmup days
                    if (cycleStartedAt) {
                      const logTime = new Date(log.created_at);
                      const toBrtDateStr = (d: Date) => new Intl.DateTimeFormat("en-CA", {
                        timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
                      }).format(d);
                      const startBrt = toBrtDateStr(cycleStartedAt);
                      const logBrt = toBrtDateStr(logTime);
                      const sp = startBrt.split("-").map(Number);
                      const lp = logBrt.split("-").map(Number);
                      const diffMs = new Date(lp[0], lp[1]-1, lp[2]).getTime() - new Date(sp[0], sp[1]-1, sp[2]).getTime();
                      const logWarmupDay = Math.max(1, Math.round(diffMs / 86400000) + 1);
                      if (logWarmupDay > (cycle?.day_index ?? 1)) continue;
                    }

                    const iconMap: Record<string, string> = {
                      cycle_started: "🚀", cycle_paused: "⏸️", cycle_resumed: "▶️",
                      group_joined: "✅", group_msg_sent: "💬", autosave_msg_sent: "📱",
                      community_msg_sent: "🌐", daily_reset: "🔄", phase_changed: "⚡",
                      auto_paused_disconnected: "⚠️", autosave_enabled: "📱",
                      community_enabled: "🌐", health_check: "🩺",
                      group_no_jid: "⚠️", autosave_no_contacts: "⚠️",
                      community_no_peers: "⚠️", community_peer_offline: "⚠️",
                      manual_day_advance: "⏭️", daily_reset_deferred: "⏳",
                    };
                    const colorMap: Record<string, string> = {
                      info: "text-emerald-400", warn: "text-amber-400", error: "text-destructive",
                    };

                    const isCycleStarted = log.event_type === "cycle_started";

                    items.push({
                      id: `log-${log.id}`,
                      time: new Date(log.created_at),
                      type: log.level === "error" ? "failed" : "done",
                      label: translateEventType(log.event_type),
                      detail: isCycleStarted
                        ? "Entre 4 e 6 horas começa a entrar nos grupos."
                        : (log.message.length > 80 ? log.message.substring(0, 77) + "..." : log.message),
                      detailGroups: isCycleStarted && groupScheduleItems.length > 0 ? groupScheduleItems : undefined,
                      icon: iconMap[log.event_type] || "📋",
                      color: colorMap[log.level] || "text-muted-foreground",
                    });
                  }

                  // Future items from scheduled jobs
                  const jobIconMap: Record<string, string> = {
                    join_group: "📥", group_interaction: "💬", autosave_interaction: "📱",
                    community_interaction: "🌐", phase_transition: "⚡", daily_reset: "🔄",
                    enable_autosave: "📱", enable_community: "🌐", health_check: "🩺",
                    post_status: "📸",
                  };
                  const jobLabelMap: Record<string, string> = {
                    join_group: "Entrar no grupo", group_interaction: "Msg em grupo",
                    autosave_interaction: "Auto Save", community_interaction: "Comunitário",
                    phase_transition: "Avançar fase", daily_reset: "Reset diário",
                    enable_autosave: "Ativar Auto Save", enable_community: "Ativar Comunidade",
                    health_check: "Verificação", post_status: "Status",
                  };

                  // Only show jobs for current day or past days (not future days)
                  const currentDayIdx = cycle?.day_index ?? 1;
                  const toBrtDate = (d: Date) => new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
                  }).format(d);
                  const cycleStartBrt = cycleStartedAt ? toBrtDate(cycleStartedAt) : null;

                  const getWarmupDayBrt = (d: Date) => {
                    if (!cycleStartBrt || !cycleStartedAt) return 1;

                    // Day 1 is the full first 24h window, even if it crosses midnight in BRT.
                    if (cycle?.first_24h_ends_at) {
                      const first24hEnds = new Date(cycle.first_24h_ends_at);
                      if (d.getTime() <= first24hEnds.getTime()) {
                        return 1;
                      }
                    }

                    // After the first 24h, use BRT calendar day buckets.
                    const dBrt = toBrtDate(d);
                    const startParts = cycleStartBrt.split("-").map(Number);
                    const dParts = dBrt.split("-").map(Number);
                    const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
                    const curDate = new Date(dParts[0], dParts[1] - 1, dParts[2]);
                    const diffDays = Math.round((curDate.getTime() - startDate.getTime()) / 86400000);
                    return Math.max(1, diffDays + 1);
                  };

                  for (const job of scheduledJobs) {
                    // Skip join_group jobs — already shown in "Ciclo iniciado" detail
                    if (job.job_type === "join_group") continue;
                    if (job.status === "cancelled") continue;
                    if (job.status === "succeeded") continue;

                    // Skip jobs scheduled for future warmup days
                    const jobWarmupDay = getWarmupDayBrt(new Date(job.run_at));
                    if (jobWarmupDay > currentDayIdx) continue;

                    const groupName = job.payload && typeof job.payload === "object" && "group_name" in (job.payload as any)
                      ? (job.payload as any).group_name : null;

                    items.push({
                      id: `job-${job.id}`,
                      time: new Date(job.run_at),
                      type: job.status === "running" ? "running"
                        : job.status === "failed" ? "failed"
                        : "pending",
                      label: jobLabelMap[job.job_type] || job.job_type,
                      detail: groupName ? `Grupo: ${groupName}` : undefined,
                      icon: jobIconMap[job.job_type] || "⏳",
                      color: job.status === "failed" ? "text-destructive"
                        : job.status === "running" ? "text-primary"
                        : "text-muted-foreground",
                    });
                  }

                  // Sort items by time ascending
                  items.sort((a, b) => a.time.getTime() - b.time.getTime());

                  // Group items by warmup day number, respecting manual day advances
                  // First, build a timeline of day advances from audit logs
                  const dayAdvances: { time: Date; toDay: number }[] = [];
                  for (const log of auditLogs) {
                    if (log.event_type === "manual_day_advance" || log.event_type === "daily_reset") {
                      const meta = log.meta as any;
                      if (meta?.to_day) {
                        dayAdvances.push({ time: new Date(log.created_at), toDay: meta.to_day });
                      }
                    }
                  }
                  dayAdvances.sort((a, b) => a.time.getTime() - b.time.getTime());

                  const getItemWarmupDay = (itemTime: Date): number => {
                    // Check if this item falls after a day advance on the same calendar day
                    let assignedDay = getWarmupDayBrt(itemTime);
                    for (const adv of dayAdvances) {
                      if (itemTime >= adv.time) {
                        assignedDay = Math.max(assignedDay, adv.toDay);
                      }
                    }
                    return assignedDay;
                  };

                  const dayItemsMap: Record<number, TimelineItem[]> = {};
                  for (const item of items) {
                    const warmupDay = getItemWarmupDay(item.time);
                    if (!dayItemsMap[warmupDay]) dayItemsMap[warmupDay] = [];
                    dayItemsMap[warmupDay].push(item);
                  }

                  const totalDays = cycle?.days_total ?? 7;
                  const currentWarmupDay = cycle?.day_index ?? 1;

                  const formatTime = (d: Date) => new Intl.DateTimeFormat("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    hour: "2-digit", minute: "2-digit", hour12: false,
                  }).format(d);

                  // Phase descriptions for each day
                  const chipState = cycle?.chip_state || "new";
                  const groupsEndDay = chipState === "unstable" ? 6 : 4;
                  const getDayPhaseLabel = (day: number) => {
                    if (day === 1) return "Proteção + entrada nos grupos";
                    if (day <= groupsEndDay) return "Mensagens em grupos";
                    if (day === groupsEndDay + 1) return "Auto Save ativado";
                    return "Comunidade + Auto Save";
                  };

                  const getDayStatus = (day: number) => {
                    if (day > currentWarmupDay) return "agendado";
                    if (day === currentWarmupDay) return "ativo";
                    // Check if skipped
                    const dayItems = dayItemsMap[day] || [];
                    const wasSkipped = dayItems.some(
                      i => i.label.includes("pulado") || i.label.includes("manual_day_advance")
                    );
                    return wasSkipped ? "pulado" : "concluído";
                  };

                  return (
                    <div className="max-h-[500px] overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
                      {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                        const dayItems = dayItemsMap[day] || [];
                        const isExpanded = expandedDays.has(day);
                        const status = getDayStatus(day);
                        const doneCount = dayItems.filter(i => i.type === "done").length;
                        const pendingCount = dayItems.filter(i => i.type === "pending").length;
                        const failedCount = dayItems.filter(i => i.type === "failed").length;
                        const isFuture = status === "agendado";
                        const isActive = status === "ativo";

                        const statusBadge = status === "concluído"
                          ? <Badge className="text-[10px] h-5 px-2 bg-emerald-500/12 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/12 font-bold">concluído</Badge>
                          : status === "pulado"
                          ? <Badge className="text-[10px] h-5 px-2 bg-amber-500/12 text-amber-400 border border-amber-500/20 hover:bg-amber-500/12 font-bold">pulado</Badge>
                          : status === "ativo"
                          ? <Badge className="text-[10px] h-5 px-2 bg-primary/12 text-primary border border-primary/20 hover:bg-primary/12 font-bold shadow-[0_0_8px_-2px_hsl(var(--primary)/0.3)]">em andamento</Badge>
                          : null;

                        return (
                          <div key={day} className={cn("border-b border-border/8 last:border-0", isFuture && "opacity-35")}>
                            <button
                              onClick={() => {
                                setExpandedDays(prev => {
                                  const next = new Set(prev);
                                  if (next.has(day)) next.delete(day); else next.add(day);
                                  return next;
                                });
                              }}
                              className={cn(
                                "w-full px-6 py-4 flex items-center gap-3 hover:bg-muted/15 transition-all",
                                isActive && "bg-primary/5 border-l-2 border-l-primary"
                              )}
                            >
                              <ChevronDown className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                                isExpanded && "rotate-180"
                              )} />
                              <div className="flex-1 text-left min-w-0">
                                <span className={cn("text-sm font-extrabold", isActive ? "text-primary" : isFuture ? "text-muted-foreground" : "text-foreground")}>
                                  Dia {day}
                                </span>
                                <span className="text-[11px] text-muted-foreground/50 ml-2.5 font-medium">{getDayPhaseLabel(day)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {statusBadge}
                                {doneCount > 0 && (
                                  <Badge className="text-[10px] h-5 px-2 bg-emerald-500/12 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/12 font-bold">
                                    ✅ {doneCount}
                                  </Badge>
                                )}
                                {pendingCount > 0 && (
                                  <Badge className="text-[10px] h-5 px-2 bg-primary/12 text-primary border border-primary/20 hover:bg-primary/12 font-bold">
                                    ⏳ {pendingCount}
                                  </Badge>
                                )}
                                {failedCount > 0 && (
                                  <Badge className="text-[10px] h-5 px-2 bg-destructive/12 text-destructive border border-destructive/20 hover:bg-destructive/12 font-bold">
                                    ❌ {failedCount}
                                  </Badge>
                                )}
                              </div>
                            </button>

                            {isExpanded && dayItems.length > 0 && (
                              <div className="px-6 pb-4 space-y-1">
                                {dayItems.map((item) => (
                                  <div key={item.id} className="flex items-start gap-3 py-2 px-3 rounded-xl hover:bg-muted/10 transition-colors">
                                    <span className="text-xs mt-0.5 shrink-0">{item.icon}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className={cn("text-[11px] font-semibold", item.color)}>
                                          {item.label}
                                        </span>
                                        {item.type === "pending" && (
                                          <Badge className="text-[8px] h-3.5 px-1 bg-muted/30 text-muted-foreground border-0 hover:bg-muted/30">
                                            agendado
                                          </Badge>
                                        )}
                                        {item.type === "running" && (
                                          <Loader2 className="w-3 h-3 text-primary animate-spin" />
                                        )}
                                      </div>
                                      {item.detail && !item.detailGroups && (
                                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{item.detail}</p>
                                      )}
                                      {item.detail && item.detailGroups && (
                                        <p className="text-[10px] text-muted-foreground/70 mt-1">{item.detail}</p>
                                      )}
                                      {item.detailGroups && item.detailGroups.length > 0 && (
                                        <div className="mt-2 grid gap-1">
                                          {item.detailGroups.map((g) => (
                                            <div
                                              key={g.index}
                                              className={cn(
                                                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border",
                                                g.status === "done"
                                                  ? "bg-emerald-500/5 border-emerald-500/15"
                                                  : g.status === "failed"
                                                  ? "bg-destructive/5 border-destructive/15"
                                                  : "bg-muted/20 border-border/15"
                                              )}
                                            >
                                              <span className="text-[10px]">
                                                {g.status === "done" ? "✅" : g.status === "failed" ? "❌" : "📥"}
                                              </span>
                                              <span className={cn(
                                                "text-[10px] font-medium flex-1 truncate",
                                                g.status === "done" ? "text-emerald-400" : g.status === "failed" ? "text-destructive" : "text-foreground/80"
                                              )}>
                                                {g.name}
                                              </span>
                                              <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
                                                {g.time}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0 mt-0.5">
                                      {formatTime(item.time)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {isExpanded && dayItems.length === 0 && (
                              <div className="px-5 pb-3">
                                <p className="text-[10px] text-muted-foreground/50 italic">
                                  {isFuture ? getDayPhaseLabel(day) : "Sem atividades registradas"}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              </>
            );
          })()}


          {/* ── Erro do ciclo ── */}
          {cycle.last_error && (
            <div className="rounded-xl border border-destructive/15 bg-gradient-to-r from-destructive/5 to-transparent p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">Último erro</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{cycle.last_error}</p>
              </div>
            </div>
          )}

          {/* ── Encerrar ciclo ── */}
          {cycle.phase !== "completed" && (
            <div className="flex justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs rounded-lg h-9 px-4 font-medium border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setShowFinishConfirm(true)}
              >
                Encerrar Ciclo
              </Button>
            </div>
          )}

          {/* Confirm dialog */}
          <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Encerrar ciclo?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Essa ação <strong className="text-foreground">não pode ser revertida</strong>.</p>
                <p>Todo o progresso será perdido.</p>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowFinishConfirm(false)}>Cancelar</Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleFinish}
                  disabled={engine.isPending}
                >
                  {engine.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Encerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Confirm advance day dialog */}
          <Dialog open={showAdvanceConfirm} onOpenChange={setShowAdvanceConfirm}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Pular dia?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Avançar o dia manualmente <strong className="text-foreground">cancela as tarefas pendentes do dia atual</strong> e agenda novas para o próximo dia.</p>
                <p>O aquecimento gradual existe para proteger seu número contra restrições e banimentos do WhatsApp.</p>
                {cycle && (
                  <p className="text-xs bg-muted/30 rounded-lg p-2.5 border border-border/30">
                    <span className="font-semibold text-foreground">Dia {cycle.day_index}</span>
                    <span className="mx-1.5">→</span>
                    <span className="font-semibold text-foreground">
                      {cycle.day_index + 1 > cycle.days_total ? "Concluído" : `Dia ${cycle.day_index + 1}`}
                    </span>
                    <span className="text-muted-foreground/60 ml-1">/ {cycle.days_total}</span>
                  </p>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAdvanceConfirm(false)}>Cancelar</Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                  onClick={() => { setShowAdvanceConfirm(false); handleAdvancePhase(); }}
                  disabled={advancingPhase}
                >
                  {advancingPhase && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <SkipForward className="w-3.5 h-3.5" />
                  Confirmar avanço
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Confirm accelerate dialog */}
          <Dialog open={showAccelerateConfirm} onOpenChange={setShowAccelerateConfirm}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-foreground">
                  <Zap className="w-5 h-5 text-amber-400" />
                  Executar agora?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>O <strong className="text-foreground">primeiro job será executado imediatamente</strong>. Os demais manterão o espaçamento original entre si, apenas antecipados a partir de agora.</p>
                <p>Isso preserva o padrão natural de delays e protege seu chip.</p>
                <p className="text-xs bg-muted/30 rounded-lg p-2.5 border border-border/30">
                  <strong className="text-foreground">{(() => {
                    const targetTypes = cycle?.phase === "pre_24h"
                      ? ["join_group"]
                      : ["group_interaction", "autosave_interaction", "community_interaction", "enable_autosave", "enable_community", "health_check", "post_status"];
                    return scheduledJobs.filter(j => j.status === "pending" && targetTypes.includes(j.job_type)).length;
                  })()}</strong> tarefa(s) pendente(s) serão aceleradas.
                </p>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAccelerateConfirm(false)}>Cancelar</Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                  onClick={() => { setShowAccelerateConfirm(false); handleAccelerate(); }}
                  disabled={accelerating}
                >
                  {accelerating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <FastForward className="w-3.5 h-3.5" />
                  Confirmar execução
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      )}
    </div>
  );
};

export default WarmupInstanceDetail;
