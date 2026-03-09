import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, MessageCircle, Clock, AlertTriangle, XCircle, Skull,
  Loader2, Check, Mail, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MESSAGE_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  WELCOME: { label: "Boas-vindas", icon: Mail, color: "text-emerald-500" },
  DUE_3_DAYS: { label: "Faltam 3 dias", icon: Clock, color: "text-yellow-500" },
  DUE_TODAY: { label: "Vence hoje", icon: AlertTriangle, color: "text-orange-500" },
  OVERDUE_1: { label: "Vencido 1 dia", icon: XCircle, color: "text-destructive" },
  OVERDUE_7: { label: "Vencido 7 dias", icon: XCircle, color: "text-destructive" },
  OVERDUE_30: { label: "Vencido 30 dias", icon: Skull, color: "text-destructive" },
  // Legacy types
  "boas-vindas": { label: "Boas-vindas", icon: Mail, color: "text-emerald-500" },
  "faltam-3-dias": { label: "Faltam 3 dias", icon: Clock, color: "text-yellow-500" },
  "vence-hoje": { label: "Vence hoje", icon: AlertTriangle, color: "text-orange-500" },
  "vencido-1-dia": { label: "Vencido 1 dia", icon: XCircle, color: "text-destructive" },
  "vencido-7-dias": { label: "Vencido 7 dias", icon: XCircle, color: "text-destructive" },
  "vencido-30-dias": { label: "Vencido 30 dias", icon: Skull, color: "text-destructive" },
};

const AdminMessages = () => {
  const [search, setSearch] = useState("");

  const { data: history = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["message-queue-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_queue" as any)
        .select("id, user_id, client_name, client_email, client_phone, plan_name, expires_at, message_type, status, created_at, sent_at, error_message")
        .in("status", ["sent", "failed"])
        .order("sent_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 60000,
  });

  const filtered = useMemo(() => {
    if (!search) return history;
    const q = search.toLowerCase();
    return history.filter((m: any) =>
      m.client_name?.toLowerCase().includes(q) ||
      m.client_email?.toLowerCase().includes(q) ||
      m.client_phone?.includes(q) ||
      m.plan_name?.toLowerCase().includes(q)
    );
  }, [history, search]);

  const sentCount = history.filter((m: any) => m.status === "sent").length;
  const failedCount = history.filter((m: any) => m.status === "failed").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageCircle size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Histórico de Mensagens</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Mensagens processadas automaticamente pelo sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            {search ? "Nenhum resultado encontrado" : "Nenhuma mensagem processada ainda"}
          </p>
          <p className="text-muted-foreground/60 text-xs">As mensagens são enviadas automaticamente pelo sistema</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-320px)]">
          <div className="space-y-2">
            {filtered.map((m: any) => {
              const config = MESSAGE_TYPE_CONFIG[m.message_type] || { label: m.message_type, icon: Mail, color: "text-muted-foreground" };
              const Icon = config.icon;
              const isSent = m.status === "sent";
              return (
                <div key={m.id} className="bg-card border border-border rounded-xl px-4 py-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    {/* Client info */}
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

                    {/* Status + date */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {config.label}
                      </Badge>
                      {isSent ? (
                        <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
                          <Check size={8} className="mr-0.5" /> Enviada
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] border-destructive/30 text-destructive bg-destructive/5" title={m.error_message || ""}>
                          <XCircle size={8} className="mr-0.5" /> Falha
                        </Badge>
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

                  {/* Error message */}
                  {!isSent && m.error_message && (
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
