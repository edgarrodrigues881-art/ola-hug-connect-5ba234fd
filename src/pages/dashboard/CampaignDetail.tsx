import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, Pause, Play, XCircle, CheckCircle2, Clock, AlertTriangle,
  Search, Timer, Hash, Zap, RefreshCw,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
  scheduled: { label: "Agendada", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  running: { label: "Enviando", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  processing: { label: "Enviando", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  paused: { label: "Pausada", color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
  completed: { label: "Concluída", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  canceled: { label: "Cancelada", color: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30" },
  failed: { label: "Falhou", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

const contactStatusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  sent: { label: "Enviada", icon: CheckCircle2, className: "text-emerald-400" },
  delivered: { label: "Entregue", icon: CheckCircle2, className: "text-emerald-400" },
  failed: { label: "Falhou", icon: XCircle, className: "text-destructive" },
  pending: { label: "Pendente", icon: Clock, className: "text-yellow-500" },
  error: { label: "Erro", icon: AlertTriangle, className: "text-destructive" },
};

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [countdown, setCountdown] = useState("");
  // Campaign data
  const { data: campaign, isLoading: campLoading } = useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Countdown for scheduled campaigns
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

  // Campaign contacts
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["campaign-contacts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select("*")
        .eq("campaign_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && !!user,
  });

  // Realtime subscription for auto-updates
  useEffect(() => {
    if (!id) return;

    const campaignChannel = supabase
      .channel(`campaign-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaigns',
        filter: `id=eq.${id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["campaign", id] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaign_contacts',
        filter: `campaign_id=eq.${id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["campaign-contacts", id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(campaignChannel); };
  }, [id, queryClient]);

  // Delay config state (local edits)
  const [minDelay, setMinDelay] = useState(8);
  const [maxDelay, setMaxDelay] = useState(25);
  const [pauseEveryMin, setPauseEveryMin] = useState(10);
  const [pauseEveryMax, setPauseEveryMax] = useState(20);
  const [pauseDurationMin, setPauseDurationMin] = useState(30);
  const [pauseDurationMax, setPauseDurationMax] = useState(120);
  const [delayDirty, setDelayDirty] = useState(false);

  // Sync from campaign data
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
    toast({ title: "Configuração salva", description: "Alterações aplicadas nos próximos envios." });
  }, [id, minDelay, maxDelay, pauseEveryMin, pauseEveryMax, pauseDurationMin, pauseDurationMax, toast]);

  // Contact log filters
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

  const progress = campaign ? Math.round(((campaign.sent_count || 0) + (campaign.failed_count || 0)) / Math.max(campaign.total_contacts || 1, 1) * 100) : 0;

  // Actions
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

  // Estimated time
  const estimatedTime = useMemo(() => {
    if (!campaign) return null;
    const count = campaign.total_contacts || 0;
    if (count === 0) return null;
    const avgDelay = (minDelay + maxDelay) / 2;
    const totalSeconds = count * avgDelay;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const days = Math.floor(hours / 24);
    const rh = hours % 24;
    if (days > 0) return `≈ ${days}d ${rh}h ${minutes}min`;
    if (hours > 0) return `≈ ${hours}h ${minutes}min`;
    return `≈ ${minutes}min`;
  }, [campaign, minDelay, maxDelay]);

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

  if (campLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
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
    <div className="space-y-6 max-w-6xl">
      {/* Back */}
      <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground -ml-2" onClick={() => navigate("/dashboard/campaign-list")}>
        <ArrowLeft className="w-4 h-4" /> Campanhas
      </Button>

      {/* BLOCO 1 — Header */}
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">{campaign.name}</h1>
              <Badge variant="outline" className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.sent} / {stats.total} enviadas · {stats.failed} falhas · {stats.pending} pendentes
            </p>
            {countdown && isScheduled && (
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-mono font-bold text-primary">{countdown}</span>
                <span className="text-xs text-muted-foreground">para iniciar</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {isScheduled && (
              <>
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction("start")}>
                  <Play className="w-3.5 h-3.5" /> Iniciar agora
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleAction("cancel")}>
                  <XCircle className="w-3.5 h-3.5" /> Cancelar
                </Button>
              </>
            )}
            {isActive && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10" onClick={() => handleAction("pause")}>
                  <Pause className="w-3.5 h-3.5" /> Pausar
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleAction("cancel")}>
                  <XCircle className="w-3.5 h-3.5" /> Cancelar
                </Button>
              </>
            )}
            {isPaused && (
              <>
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction("resume")}>
                  <Play className="w-3.5 h-3.5" /> Retomar
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleAction("cancel")}>
                  <XCircle className="w-3.5 h-3.5" /> Cancelar
                </Button>
              </>
            )}
            {isFinished && (
              <span className="text-xs text-muted-foreground">Finalizada</span>
            )}
          </div>
        </div>

        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress}% concluído</span>
          {remainingTime && <span className="text-primary">{remainingTime}</span>}
          <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Atualizado agora</span>
        </div>
      </div>

      {/* BLOCO 2 — Delay Config */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Configuração de envio</h2>
          {delayDirty && (
            <Button size="sm" onClick={saveDelayConfig} className="gap-1.5 text-xs">
              Salvar alterações
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Intervalo */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Timer className="w-4 h-4 text-primary" /> Intervalo entre mensagens
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Min (s)</label>
                <Input
                  type="number" min={1} value={minDelay || ""}
                  onChange={e => { setMinDelay(Number(e.target.value)); setDelayDirty(true); }}
                  onBlur={() => { const v = minDelay || 1; setMinDelay(v); if (v > maxDelay) setMaxDelay(v); }}
                  className="h-9 mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Max (s)</label>
                <Input
                  type="number" min={1} value={maxDelay || ""}
                  onChange={e => { setMaxDelay(Number(e.target.value)); setDelayDirty(true); }}
                  onBlur={() => { const v = maxDelay || 1; setMaxDelay(v); if (v < minDelay) setMaxDelay(minDelay); }}
                  className="h-9 mt-1"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Tempo entre cada envio</p>
          </div>

          {/* Pausa a cada */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Hash className="w-4 h-4 text-primary" /> Pausa a cada X mensagens
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Min</label>
                <Input
                  type="number" min={1} value={pauseEveryMin || ""}
                  onChange={e => { setPauseEveryMin(Number(e.target.value)); setDelayDirty(true); }}
                  onBlur={() => { const v = pauseEveryMin || 1; setPauseEveryMin(v); if (v > pauseEveryMax) setPauseEveryMax(v); }}
                  className="h-9 mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Max</label>
                <Input
                  type="number" min={1} value={pauseEveryMax || ""}
                  onChange={e => { setPauseEveryMax(Number(e.target.value)); setDelayDirty(true); }}
                  onBlur={() => { const v = pauseEveryMax || 1; setPauseEveryMax(v); if (v < pauseEveryMin) setPauseEveryMax(pauseEveryMin); }}
                  className="h-9 mt-1"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Quantidade antes de pausar</p>
          </div>

          {/* Duração da pausa */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Zap className="w-4 h-4 text-primary" /> Duração da pausa
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Min (s)</label>
                <Input
                  type="number" min={1} value={pauseDurationMin || ""}
                  onChange={e => { setPauseDurationMin(Number(e.target.value)); setDelayDirty(true); }}
                  onBlur={() => { const v = pauseDurationMin || 1; setPauseDurationMin(v); if (v > pauseDurationMax) setPauseDurationMax(v); }}
                  className="h-9 mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Max (s)</label>
                <Input
                  type="number" min={1} value={pauseDurationMax || ""}
                  onChange={e => { setPauseDurationMax(Number(e.target.value)); setDelayDirty(true); }}
                  onBlur={() => { const v = pauseDurationMax || 1; setPauseDurationMax(v); if (v < pauseDurationMin) setPauseDurationMax(pauseDurationMin); }}
                  className="h-9 mt-1"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Tempo de pausa</p>
          </div>
        </div>

        {/* Estimated time */}
        {estimatedTime && (
          <div className="rounded-xl border border-border/50 bg-card p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Tempo estimado total: <span className="text-primary">{estimatedTime}</span></p>
              {(isActive || isPaused) && remainingTime && (
                <p className="text-xs text-muted-foreground">{remainingTime}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BLOCO 3 — Logs */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Logs de envio</h2>

        {/* Quick filters */}
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                logFilter === f.key
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/30 text-muted-foreground hover:bg-muted/30"
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}

          <div className="relative flex-1 min-w-[180px] ml-auto max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
        </div>

        {/* Logs table */}
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Contato</TableHead>
                  <TableHead className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Número</TableHead>
                  <TableHead className="text-[10px] font-semibold text-muted-foreground/70 uppercase text-center">Status</TableHead>
                  <TableHead className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Horário</TableHead>
                  <TableHead className="text-[10px] font-semibold text-muted-foreground/70 uppercase">Erro</TableHead>
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
                    <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.slice(0, 200).map(c => {
                    const cfg = contactStatusConfig[c.status] || contactStatusConfig.pending;
                    const Icon = cfg.icon;
                    return (
                      <TableRow key={c.id} className="border-border/20">
                        <TableCell className="text-sm text-foreground">{c.name || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{c.phone}</TableCell>
                        <TableCell className="text-center">
                          <div className={`inline-flex items-center gap-1 ${cfg.className}`}>
                            <Icon className="w-3.5 h-3.5" />
                            <span className="text-xs">{cfg.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.sent_at ? format(new Date(c.sent_at), "dd/MM HH:mm:ss") : "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px]">
                          {c.error_message ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-destructive truncate block cursor-help">{c.error_message}</span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-sm">
                                <p className="text-xs">{c.error_message}</p>
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
            <div className="px-4 py-2 text-xs text-muted-foreground border-t border-border/30">
              Mostrando 200 de {filteredContacts.length} registros
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
