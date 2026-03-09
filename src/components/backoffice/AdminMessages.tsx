import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, MessageCircle, Clock, AlertTriangle, XCircle, Skull,
  Loader2, Check, Mail, RefreshCw, RotateCcw, Filter, Hourglass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MESSAGE_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  WELCOME: { label: "Boas-vindas", icon: Mail, color: "text-emerald-500" },
  DUE_3_DAYS: { label: "Faltam 3 dias", icon: Clock, color: "text-yellow-500" },
  DUE_TODAY: { label: "Vence hoje", icon: AlertTriangle, color: "text-orange-500" },
  OVERDUE_1: { label: "Vencido 1 dia", icon: XCircle, color: "text-destructive" },
  OVERDUE_7: { label: "Vencido 7 dias", icon: XCircle, color: "text-destructive" },
  OVERDUE_30: { label: "Vencido 30 dias", icon: Skull, color: "text-destructive" },
  "boas-vindas": { label: "Boas-vindas", icon: Mail, color: "text-emerald-500" },
  "faltam-3-dias": { label: "Faltam 3 dias", icon: Clock, color: "text-yellow-500" },
  "vence-hoje": { label: "Vence hoje", icon: AlertTriangle, color: "text-orange-500" },
  "vencido-1-dia": { label: "Vencido 1 dia", icon: XCircle, color: "text-destructive" },
  "vencido-7-dias": { label: "Vencido 7 dias", icon: XCircle, color: "text-destructive" },
  "vencido-30-dias": { label: "Vencido 30 dias", icon: Skull, color: "text-destructive" },
};

const STATUS_FILTERS = [
  { value: "all", label: "Todas", icon: Filter },
  { value: "pending", label: "Pendentes", icon: Hourglass },
  { value: "sent", label: "Enviadas", icon: Check },
  { value: "failed", label: "Falhas", icon: XCircle },
] as const;

const TYPE_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "WELCOME", label: "Boas-vindas" },
  { value: "DUE_3_DAYS", label: "3 dias" },
  { value: "DUE_TODAY", label: "Hoje" },
  { value: "OVERDUE_1", label: "1 dia" },
  { value: "OVERDUE_7", label: "7 dias" },
  { value: "OVERDUE_30", label: "30 dias" },
] as const;

const AdminMessages = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [resending, setResending] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: history = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["message-queue-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_queue" as any)
        .select("id, user_id, client_name, client_email, client_phone, plan_name, expires_at, message_type, message_content, status, created_at, sent_at, error_message")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 30000,
  });

  const filtered = useMemo(() => {
    let items = history;
    if (statusFilter !== "all") {
      items = items.filter((m: any) => m.status === statusFilter);
    }
    if (typeFilter !== "all") {
      items = items.filter((m: any) => m.message_type === typeFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((m: any) =>
        m.client_name?.toLowerCase().includes(q) ||
        m.client_email?.toLowerCase().includes(q) ||
        m.client_phone?.includes(q) ||
        m.plan_name?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [history, search, statusFilter, typeFilter]);

  const pendingCount = history.filter((m: any) => m.status === "pending").length;
  const sentCount = history.filter((m: any) => m.status === "sent").length;
  const failedCount = history.filter((m: any) => m.status === "failed").length;

  const resendMessage = async (id: string) => {
    setResending(id);
    try {
      await supabase
        .from("message_queue" as any)
        .update({ status: "pending", error_message: null, sent_at: null, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      toast.success("Mensagem reenfileirada para envio");
      queryClient.invalidateQueries({ queryKey: ["message-queue-all"] });
    } catch (e) {
      toast.error("Erro ao reenviar");
    } finally {
      setResending(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageCircle size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Fila de Mensagens</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Mensagens automáticas do ciclo de vida</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-500 bg-yellow-500/5">
              <Hourglass size={9} className="mr-0.5" /> {pendingCount} pendentes
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
            <Check size={9} className="mr-0.5" /> {sentCount} enviadas
          </Badge>
          {failedCount > 0 && (
            <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive bg-destructive/5">
              <XCircle size={9} className="mr-0.5" /> {failedCount} falhas
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}
            className="text-[11px] h-8 gap-1.5 rounded-lg border-border hover:bg-muted/30">
            {isFetching ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status filter */}
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          {STATUS_FILTERS.map((f) => {
            const Icon = f.icon;
            const isActive = statusFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium rounded-md transition-colors ${
                  isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={11} /> {f.label}
              </button>
            );
          })}
        </div>

        {/* Type filter */}
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1 overflow-x-auto">
          {TYPE_FILTERS.map((f) => {
            const isActive = typeFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-2.5 py-1.5 text-[10px] font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, email, telefone ou plano..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 h-10 bg-card border-border text-sm rounded-xl"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <MessageCircle size={28} className="text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground text-sm">
            {search || statusFilter !== "all" || typeFilter !== "all" ? "Nenhum resultado encontrado" : "Nenhuma mensagem na fila ainda"}
          </p>
          <p className="text-muted-foreground/60 text-xs">As mensagens são inseridas automaticamente pelo cron de vencimentos</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-380px)]">
          <div className="space-y-2">
            {filtered.map((m: any) => {
              const config = MESSAGE_TYPE_CONFIG[m.message_type] || { label: m.message_type, icon: Mail, color: "text-muted-foreground" };
              const Icon = config.icon;
              const isPending = m.status === "pending";
              const isSent = m.status === "sent";
              const isFailed = m.status === "failed";
              return (
                <div key={m.id} className={`bg-card border rounded-xl px-4 py-3.5 ${
                  isPending ? "border-yellow-500/20" : isFailed ? "border-destructive/20" : "border-border"
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className={config.color} />
                        <p className="text-[13px] font-semibold text-foreground truncate">{m.client_name || m.client_email}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">{m.client_email}</span>
                        {m.client_phone && (
                          <>
                            <span className="text-[11px] text-muted-foreground/40">·</span>
                            <span className="text-[11px] text-muted-foreground">{m.client_phone}</span>
                          </>
                        )}
                        <span className="text-[11px] text-muted-foreground/40">·</span>
                        <span className="text-[11px] text-muted-foreground">{m.plan_name || "—"}</span>
                        {m.expires_at && (
                          <>
                            <span className="text-[11px] text-muted-foreground/40">·</span>
                            <span className="text-[11px] text-muted-foreground">
                              Venc: {new Date(m.expires_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {config.label}
                      </Badge>
                      {isPending && (
                        <Badge variant="outline" className="text-[9px] border-yellow-500/30 text-yellow-500 bg-yellow-500/5">
                          <Hourglass size={8} className="mr-0.5" /> Pendente
                        </Badge>
                      )}
                      {isSent && (
                        <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                          <Check size={8} className="mr-0.5" /> Enviada
                        </Badge>
                      )}
                      {isFailed && (
                        <>
                          <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive bg-destructive/5" title={m.error_message || ""}>
                            <XCircle size={8} className="mr-0.5" /> Falha
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resendMessage(m.id)}
                            disabled={resending === m.id}
                            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                            title="Reenviar"
                          >
                            {resending === m.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                          </Button>
                        </>
                      )}
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {(m.sent_at || m.created_at) ? new Date(m.sent_at || m.created_at).toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                          day: "2-digit", month: "2-digit", year: "2-digit",
                          hour: "2-digit", minute: "2-digit"
                        }) : "—"}
                      </span>
                    </div>
                  </div>

                  {isFailed && m.error_message && (
                    <p className="text-[10px] text-destructive/80 mt-1.5 truncate">⚠️ {m.error_message}</p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default AdminMessages;