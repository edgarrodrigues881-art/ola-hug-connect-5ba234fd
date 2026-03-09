import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Pause, Play, XCircle, CheckCircle2, Clock, AlertTriangle,
  Search, Timer, Hash, Zap, RefreshCw, RotateCcw,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  pending:    { label: "Pendente",   dotClass: "bg-yellow-400",    badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  scheduled:  { label: "Agendada",   dotClass: "bg-sky-400",       badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  running:    { label: "Enviando",   dotClass: "bg-primary animate-pulse", badgeClass: "bg-primary/10 text-primary border-primary/20" },
  processing: { label: "Enviando",   dotClass: "bg-primary animate-pulse", badgeClass: "bg-primary/10 text-primary border-primary/20" },
  paused:     { label: "Pausada",    dotClass: "bg-yellow-400",    badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  completed:  { label: "Concluída",  dotClass: "bg-primary",       badgeClass: "bg-primary/10 text-primary border-primary/20" },
  canceled:   { label: "Cancelada",  dotClass: "bg-muted-foreground", badgeClass: "bg-muted/50 text-muted-foreground border-border" },
  failed:     { label: "Falhou",     dotClass: "bg-destructive",   badgeClass: "bg-destructive/10 text-destructive border-destructive/20" },
};

const contactStatusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  sent:      { label: "Enviada",  icon: CheckCircle2,  className: "text-primary" },
  delivered: { label: "Entregue", icon: CheckCircle2,  className: "text-primary" },
  failed:    { label: "Falhou",   icon: XCircle,       className: "text-destructive" },
  pending:   { label: "Pendente", icon: Clock,         className: "text-yellow-400" },
  error:     { label: "Erro",     icon: AlertTriangle, className: "text-destructive" },
};

function translateError(msg: string | null): string | null {
  if (!msg) return null;
  if (msg.includes("not on Whats") || msg.includes("not registered") || msg.includes("not_exists")) return "Número inválido";
  if (/disconnected|not connected|qr code|logout|unauthorized|not authenticated/i.test(msg)) return "WhatsApp desconectado";
  return msg;
}

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [countdown, setCountdown] = useState("");

  const { data: campaign, isLoading: campLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status, message_type, message_content, media_url, buttons, device_id, device_ids, total_contacts, sent_count, delivered_count, failed_count, min_delay_seconds, max_delay_seconds, pause_every_min, pause_every_max, pause_duration_min, pause_duration_max, messages_per_instance, scheduled_at, started_at, completed_at, created_at, updated_at")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && ["running", "processing"].includes(status)) return 3000;
      if (status && ["paused", "queued", "scheduled"].includes(status)) return 15000;
      return false;
    },
  });

  useEffect(() => {
    if (!campaign?.scheduled_at || !["scheduled", "pending"].includes(campaign.status)) {
      setCountdown("");
      return;
    }
    const update = () => {
      const diff = new Date(campaign.scheduled_at!).getTime() - Date.now();
      if (diff <= 0) { setCountdown("Iniciando..."); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [campaign?.scheduled_at, campaign?.status]);

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["campaign-contacts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select("id, campaign_id, phone, name, status, sent_at, error_message, created_at")
        .eq("campaign_id", id!)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!user,
    refetchInterval: () => {
      if (campaign && ["running", "processing"].includes(campaign.status)) return 5000;
      return false;
    },
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("id, name, number, status").eq("user_id", user!.id).neq("login_type", "report_wa");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!id) return;
    const campaignChannel = supabase
      .channel(`campaign-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns', filter: `id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_contacts', filter: `campaign_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["campaign-contacts", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(campaignChannel); };
  }, [id, queryClient]);

  const [minDelay, setMinDelay] = useState(8);
  const [maxDelay, setMaxDelay] = useState(25);
  const [pauseEveryMin, setPauseEveryMin] = useState(10);
  const [pauseEveryMax, setPauseEveryMax] = useState(20);
  const [pauseDurationMin, setPauseDurationMin] = useState(30);
  const [pauseDurationMax, setPauseDurationMax] = useState(120);
  const [delayDirty, setDelayDirty] = useState(false);

  useEffect(() => {
    if (!campaign) return;
    setMinDelay(campaign.min_delay_seconds ?? 8);
    setMaxDelay(campaign.max_delay_seconds ?? 25);
    setPauseEveryMin(campaign.pause_every_min ?? 10);
    setPauseEveryMax(campaign.pause_every_max ?? 20);
    setPauseDurationMin(campaign.pause_duration_min ?? 30);
    setPauseDurationMax(campaign.pause_duration_max ?? 120);
  }, [campaign]);

  const saveDelayConfig = useCallback(async () => {
    if (!id) return;
    await supabase.from("campaigns").update({
      min_delay_seconds: minDelay,
      max_delay_seconds: maxDelay,
      pause_every_min: pauseEveryMin,
      pause_every_max: pauseEveryMax,
      pause_duration_min: pauseDurationMin,
      pause_duration_max: pauseDurationMax,
    }).eq("id", id);
    setDelayDirty(false);
    toast({ title: "Configuração salva" });
  }, [id, minDelay, maxDelay, pauseEveryMin, pauseEveryMax, pauseDurationMin, pauseDurationMax, toast]);

  const [logSearch, setLogSearch] = useState("");
  const [logFilter, setLogFilter] = useState("all");

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchSearch = (c.phone || "").includes(logSearch) || (c.name || "").toLowerCase().includes(logSearch.toLowerCase());
      const matchFilter = logFilter === "all"
        || (logFilter === "sent" && (c.status === "sent" || c.status === "delivered"))
        || (logFilter === "failed" && (c.status === "failed" || c.status === "error"))
        || (logFilter === "pending" && c.status === "pending");
      return matchSearch && matchFilter;
    });
  }, [contacts, logSearch, logFilter]);

  const stats = useMemo(() => ({
    total: contacts.length,
    sent: contacts.filter(c => c.status === "sent" || c.status === "delivered").length,
    failed: contacts.filter(c => c.status === "failed" || c.status === "error").length,
    pending: contacts.filter(c => c.status === "pending").length,
  }), [contacts]);

  useEffect(() => {
    if (!campaign || !id || !user) return;
    if (!["running", "processing"].includes(campaign.status)) return;
    if (stats.pending === 0) return;
    const hasDisconnectFailure = contacts.some(c =>
      c.status === "failed" && c.error_message && /disconnected|desconectado/i.test(c.error_message)
    );
    if (hasDisconnectFailure && stats.pending > 0) {
      supabase.functions.invoke("process-campaign", {
        body: { action: "cancel", campaignId: id },
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["campaign", id] });
        queryClient.invalidateQueries({ queryKey: ["campaign-contacts", id] });
        toast({ title: "Campanha finalizada", description: "Dispositivo desconectado." });
      });
    }
  }, [campaign?.status, stats.pending, contacts, id, user, queryClient, toast]);

  const progress = campaign ? Math.round(((campaign.sent_count || 0) + (campaign.failed_count || 0)) / Math.max(campaign.total_contacts || 1, 1) * 100) : 0;

  const handleAction = async (action: "pause" | "resume" | "cancel" | "start") => {
    if (!id) return;
    try {
      const { data, error } = await supabase.functions.invoke("process-campaign", {
        body: { action, campaignId: id },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      const labels = { pause: "Campanha pausada", resume: "Campanha retomada", cancel: "Campanha cancelada", start: "Campanha iniciada" };
      toast({ title: labels[action] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const remainingTime = useMemo(() => {
    if (!campaign || !["running", "processing"].includes(campaign.status)) return null;
    const remaining = stats.pending;
    if (remaining === 0) return null;
    const avgDelay = (minDelay + maxDelay) / 2;
    const totalSeconds = remaining * avgDelay;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `≈ ${hours}h ${minutes}min restantes`;
    return `≈ ${minutes}min restantes`;
  }, [campaign, stats.pending, minDelay, maxDelay]);

  const isActive = campaign && ["running", "processing"].includes(campaign.status);
  const isPaused = campaign?.status === "paused";
  const isScheduled = campaign && ["scheduled", "pending"].includes(campaign.status);
  const isFinished = campaign && ["completed", "canceled", "failed"].includes(campaign.status);

  const handleResendFailed = () => {
    const failedContacts = contacts.filter(c => c.status === "failed" || c.status === "error" || c.status === "pending");
    if (failedContacts.length === 0) {
      toast({ title: "Sem contatos para reenviar", variant: "destructive" });
      return;
    }
    const resendData = {
      contacts: failedContacts.map((c, i) => ({
        id: i + 1, nome: c.name || "", numero: c.phone,
        var1: "", var2: "", var3: "", var4: "", var5: "",
        var6: "", var7: "", var8: "", var9: "", var10: "",
      })),
      message: campaign?.message_content || "",
      mediaUrl: campaign?.media_url || "",
      buttons: campaign?.buttons || [],
      campaignName: `${campaign?.name} (Reenvio)`,
    };
    sessionStorage.setItem("resend_campaign_data", JSON.stringify(resendData));
    navigate("/dashboard/campaigns");
  };

  if (campLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Campanha não encontrada.
        <Button variant="link" onClick={() => navigate("/dashboard/campaign-list")}>Voltar</Button>
      </div>
    );
  }

  const cfg = statusConfig[campaign.status] || statusConfig.pending;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back */}
      <button
        onClick={() => navigate("/dashboard/campaign-list")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Campanhas
      </button>

      {/* ── Header Card ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-foreground">{campaign.name}</h1>
              <Badge variant="outline" className={cn("text-[10px] font-semibold gap-1.5 px-2 py-0.5", cfg.badgeClass)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dotClass)} />
                {cfg.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{stats.sent}/{stats.total}</span>
              <span>enviadas</span>
              <span className="text-border">·</span>
              {stats.failed > 0 && <span className="text-destructive font-medium">{stats.failed} falhas</span>}
              {stats.failed > 0 && <span className="text-border">·</span>}
              <span>{stats.pending} pendentes</span>
            </div>
            {countdown && isScheduled && (
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3.5 h-3.5 text-primary animate-pulse" />
                <span className="text-xs font-mono font-bold text-primary">{countdown}</span>
                <span className="text-[10px] text-muted-foreground">para iniciar</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isScheduled && (
              <>
                <Button size="sm" className="gap-1.5 h-8 text-xs rounded-lg" onClick={() => handleAction("start")}>
                  <Play className="w-3.5 h-3.5" /> Iniciar agora
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-xs rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleAction("cancel")}>
                  <XCircle className="w-3.5 h-3.5" /> Cancelar
                </Button>
              </>
            )}
            {isActive && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs rounded-lg border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" onClick={() => handleAction("pause")}>
                  <Pause className="w-3.5 h-3.5" /> Pausar
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-xs rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleAction("cancel")}>
                  <XCircle className="w-3.5 h-3.5" /> Cancelar
                </Button>
              </>
            )}
            {isPaused && (
              <>
                <Button size="sm" className="gap-1.5 h-8 text-xs rounded-lg" onClick={() => handleAction("resume")}>
                  <Play className="w-3.5 h-3.5" /> Retomar
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-xs rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleAction("cancel")}>
                  <XCircle className="w-3.5 h-3.5" /> Cancelar
                </Button>
              </>
            )}
            {isFinished && stats.failed + stats.pending > 0 && (
              <Button size="sm" className="gap-1.5 h-8 text-xs rounded-lg" onClick={handleResendFailed}>
                <RotateCcw className="w-3.5 h-3.5" /> Reenviar falhas ({stats.failed + stats.pending})
              </Button>
            )}
            {isFinished && (
              <span className="text-[10px] text-muted-foreground/60 font-medium tracking-wide uppercase">Finalizada</span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progress} className="h-1.5" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium">{progress}% concluído</span>
            {remainingTime && <span className="text-[10px] text-primary font-medium">{remainingTime}</span>}
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["campaign", id] });
                queryClient.invalidateQueries({ queryKey: ["campaign-contacts", id] });
                toast({ title: "Sincronizado" });
              }}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Sincronizar
            </button>
          </div>
        </div>
      </div>

      {/* ── Delay Config ────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Configuração de envio</h2>
          {delayDirty && (
            <Button size="sm" onClick={saveDelayConfig} className="h-7 text-[10px] rounded-lg gap-1">
              <CheckCircle2 className="w-3 h-3" /> Salvar
            </Button>
          )}
        </div>

        <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-3 transition-opacity", isActive && "opacity-30 pointer-events-none select-none")}>
          {/* Card helper */}
          {[
            {
              icon: Timer, title: "Intervalo entre mensagens", hint: "Tempo entre cada envio",
              fields: [
                { label: "MIN (S)", value: minDelay, set: setMinDelay, blur: () => { const v = minDelay || 1; setMinDelay(v); if (v > maxDelay) setMaxDelay(v); } },
                { label: "MAX (S)", value: maxDelay, set: setMaxDelay, blur: () => { const v = maxDelay || 1; setMaxDelay(v); if (v < minDelay) setMaxDelay(minDelay); } },
              ],
            },
            {
              icon: Hash, title: "Pausa a cada X mensagens", hint: "Quantidade antes de pausar",
              fields: [
                { label: "MIN", value: pauseEveryMin, set: setPauseEveryMin, blur: () => { const v = pauseEveryMin || 1; setPauseEveryMin(v); if (v > pauseEveryMax) setPauseEveryMax(v); } },
                { label: "MAX", value: pauseEveryMax, set: setPauseEveryMax, blur: () => { const v = pauseEveryMax || 1; setPauseEveryMax(v); if (v < pauseEveryMin) setPauseEveryMax(pauseEveryMin); } },
              ],
            },
            {
              icon: Zap, title: "Duração da pausa", hint: "Tempo de pausa",
              fields: [
                { label: "MIN (S)", value: pauseDurationMin, set: setPauseDurationMin, blur: () => { const v = pauseDurationMin || 1; setPauseDurationMin(v); if (v > pauseDurationMax) setPauseDurationMax(v); } },
                { label: "MAX (S)", value: pauseDurationMax, set: setPauseDurationMax, blur: () => { const v = pauseDurationMax || 1; setPauseDurationMax(v); if (v < pauseDurationMin) setPauseDurationMax(pauseDurationMin); } },
              ],
            },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border border-border/30 bg-card/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <card.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">{card.title}</span>
              </div>
              <div className="flex gap-2">
                {card.fields.map(f => (
                  <div key={f.label} className="flex-1 space-y-1">
                    <label className="text-[9px] text-muted-foreground/70 uppercase tracking-widest font-medium">{f.label}</label>
                    <Input
                      type="number"
                      min={1}
                      value={f.value || ""}
                      disabled={!!isActive}
                      onChange={e => { f.set(Number(e.target.value)); setDelayDirty(true); }}
                      onBlur={f.blur}
                      className="h-8 text-sm font-medium bg-background/50"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/50">{card.hint}</p>
            </div>
          ))}
        </div>

        {isActive && (
          <p className="text-[10px] text-muted-foreground/40 italic">Pause a campanha para editar.</p>
        )}
      </div>

      {/* ── Logs ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider">Logs de envio</h2>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "all", label: "Todos", count: stats.total },
            { key: "sent", label: "Enviadas", count: stats.sent },
            { key: "failed", label: "Falhas", count: stats.failed },
            { key: "pending", label: "Pendentes", count: stats.pending },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setLogFilter(f.key)}
              className={cn(
                "px-3 py-1 rounded-lg text-[11px] font-medium border transition-all duration-150",
                logFilter === f.key
                  ? "border-primary/40 bg-primary/10 text-primary shadow-sm shadow-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {f.label} ({f.count})
            </button>
          ))}

          <div className="relative flex-1 min-w-[160px] ml-auto max-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Buscar..."
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              className="pl-8 h-7 text-xs bg-background/50 border-border/30"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border/30 bg-card/50 overflow-hidden">
          <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/20 hover:bg-transparent">
                  <TableHead className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Contato</TableHead>
                  <TableHead className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Número</TableHead>
                  <TableHead className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest text-center">Status</TableHead>
                  <TableHead className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Horário</TableHead>
                  <TableHead className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contactsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-12">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.slice(0, 200).map(c => {
                    const ccfg = contactStatusConfig[c.status] || contactStatusConfig.pending;
                    const Icon = ccfg.icon;
                    return (
                      <TableRow key={c.id} className="border-border/10 hover:bg-muted/20 transition-colors">
                        <TableCell className="text-xs font-medium text-foreground py-3">{c.name || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono tracking-tight">{c.phone}</TableCell>
                        <TableCell className="text-center py-3">
                          <div className={cn("inline-flex items-center gap-1.5", ccfg.className)}>
                            <Icon className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-medium">{ccfg.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground py-3">
                          {c.sent_at ? format(new Date(c.sent_at), "dd/MM HH:mm:ss") : "—"}
                        </TableCell>
                        <TableCell className="text-[11px] max-w-[200px] py-3">
                          {c.error_message ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-destructive/80 truncate block cursor-help">{translateError(c.error_message)}</span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-sm">
                                <p className="text-xs">{translateError(c.error_message)}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {filteredContacts.length > 200 && (
            <div className="px-4 py-2 text-[10px] text-muted-foreground/50 border-t border-border/20">
              Mostrando 200 de {filteredContacts.length} registros
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
