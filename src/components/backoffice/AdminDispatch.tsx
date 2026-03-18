import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Send, Loader2, CheckCircle2, Users, Filter, Search,
  FileText, ChevronRight, Smartphone, AlertTriangle, Eye
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminDashboard, type AdminUser } from "@/hooks/useAdmin";

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55"))
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)} ${digits.slice(9)}`;
  if (digits.length === 11)
    return `+55 ${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return phone;
}

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

type AudienceFilter = "all" | "active" | "expired" | "expiring" | "trial" | "pro" | "scale" | "elite" | "start";

const AUDIENCE_OPTIONS: { value: AudienceFilter; label: string; color: string }[] = [
  { value: "all", label: "Todos os clientes", color: "text-foreground" },
  { value: "active", label: "Ativos", color: "text-emerald-400" },
  { value: "expired", label: "Vencidos", color: "text-red-400" },
  { value: "expiring", label: "Vencendo (≤3d)", color: "text-yellow-400" },
  { value: "trial", label: "Plano Trial", color: "text-zinc-400" },
  { value: "start", label: "Plano Start", color: "text-zinc-400" },
  { value: "pro", label: "Plano Pro", color: "text-teal-400" },
  { value: "scale", label: "Plano Scale", color: "text-purple-400" },
  { value: "elite", label: "Plano Elite", color: "text-amber-400" },
];

export default function AdminDispatch() {
  const queryClient = useQueryClient();
  const { data: dashData } = useAdminDashboard();
  const users = dashData?.users || [];

  const [step, setStep] = useState<"audience" | "message" | "review" | "done">("audience");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [search, setSearch] = useState("");
  const [templateId, setTemplateId] = useState<string>("custom");
  const [customMessage, setCustomMessage] = useState("");
  const [connectionPurpose, setConnectionPurpose] = useState("dispatch");
  const [dispatching, setDispatching] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  // Load templates
  const { data: templates = [] } = useQuery({
    queryKey: ["admin-dispatch-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_dispatch_templates" as any)
        .select("*")
        .eq("is_active", true)
        .order("name");
      return (data || []) as any[];
    },
  });

  // Load connection purposes
  const { data: connections = [] } = useQuery({
    queryKey: ["admin-connection-purposes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_connection_purposes" as any)
        .select("*")
        .order("purpose");
      return (data || []) as any[];
    },
  });

  // Filter audience
  const audienceUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      const d = getDaysLeft(u.plan_expires_at);
      switch (audienceFilter) {
        case "active": if (u.status !== "active") return false; break;
        case "expired": if (d === null || d > 0) return false; break;
        case "expiring": if (d === null || d <= 0 || d > 3) return false; break;
        case "trial": if (u.plan_name !== "Trial") return false; break;
        case "start": if (u.plan_name !== "Start") return false; break;
        case "pro": if (u.plan_name !== "Pro") return false; break;
        case "scale": if (u.plan_name !== "Scale") return false; break;
        case "elite": if (u.plan_name !== "Elite") return false; break;
      }
      if (q && !u.full_name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, audienceFilter, search]);

  const effectiveSelected = useMemo(() => {
    if (selectAll) return new Set(audienceUsers.map(u => u.id));
    return selectedIds;
  }, [selectAll, selectedIds, audienceUsers]);

  const toggleUser = (id: string) => {
    setSelectAll(false);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllManual = () => {
    if (selectAll) {
      setSelectAll(false);
      setSelectedIds(new Set());
    } else {
      setSelectAll(true);
    }
  };

  const selectedTemplate = templates.find((t: any) => t.id === templateId);
  const messageContent = templateId === "custom" ? customMessage : selectedTemplate?.content || "";

  const handleDispatch = useCallback(async () => {
    if (!messageContent.trim()) { toast.error("Selecione ou escreva uma mensagem"); return; }
    if (effectiveSelected.size === 0) { toast.error("Selecione pelo menos um cliente"); return; }

    setDispatching(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const targets = audienceUsers
        .filter(u => effectiveSelected.has(u.id))
        .map(u => ({
          user_id: u.id, phone: u.phone, name: u.full_name || u.email,
          email: u.email, plan_name: u.plan_name,
        }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data?action=bulk-dispatch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            targets,
            message_content: messageContent,
            connection_purpose: connectionPurpose,
          }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao disparar");
      setResult({ ok: data.enqueued || targets.length, fail: data.failed || 0 });
      setStep("done");
      toast.success(`Disparo enviado para ${data.enqueued || targets.length} clientes`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDispatching(false);
    }
  }, [messageContent, effectiveSelected, audienceUsers, connectionPurpose]);

  const resetAll = () => {
    setStep("audience");
    setResult(null);
    setCustomMessage("");
    setTemplateId("custom");
    setSelectedIds(new Set());
    setSelectAll(true);
    setSearch("");
    setAudienceFilter("all");
  };

  const dispatchConnection = connections.find((c: any) => c.purpose === connectionPurpose);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Send size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Enviar Mensagem</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecione clientes, escreva a mensagem e envie
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 p-1 bg-muted/20 rounded-xl border border-border/40 w-fit">
        {(["audience", "message", "review"] as const).map((s, i) => {
          const labels = ["1. Clientes", "2. Mensagem", "3. Enviar"];
          const icons = [Users, FileText, Send];
          const Icon = icons[i];
          const isActive = step === s;
          const isDone = ["audience", "message", "review", "done"].indexOf(step) > i;
          return (
            <button
              key={s}
              onClick={() => { if (isDone || isActive) setStep(s as any); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isDone
                    ? "text-emerald-400 hover:bg-muted/30"
                    : "text-muted-foreground hover:bg-muted/30"
              }`}
            >
              {isDone && !isActive ? <CheckCircle2 size={13} /> : <Icon size={13} />}
              {labels[i]}
            </button>
          );
        })}
      </div>

      {/* Step: Audience */}
      {step === "audience" && (
        <div className="space-y-4">
          {/* Filter dropdown + Search */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={audienceFilter} onValueChange={(v) => setAudienceFilter(v as AudienceFilter)}>
              <SelectTrigger className="h-9 w-56 bg-card/50 border-border/60 text-sm">
                <Filter size={14} className="mr-2 text-muted-foreground/50" />
                <SelectValue placeholder="Filtrar clientes" />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map(opt => {
                  const count = users.filter(u => {
                    const d = getDaysLeft(u.plan_expires_at);
                    switch (opt.value) {
                      case "all": return true;
                      case "active": return u.status === "active";
                      case "expired": return d !== null && d <= 0;
                      case "expiring": return d !== null && d > 0 && d <= 3;
                      case "trial": return u.plan_name === "Trial";
                      case "start": return u.plan_name === "Start";
                      case "pro": return u.plan_name === "Pro";
                      case "scale": return u.plan_name === "Scale";
                      case "elite": return u.plan_name === "Elite";
                      default: return true;
                    }
                  }).length;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center justify-between gap-3 w-full">
                        {opt.label}
                        <span className="text-[10px] font-mono text-muted-foreground/50">{count}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 bg-card/50 border-border/60 text-sm"
              />
            </div>

            <button
              onClick={toggleAllManual}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                selectAll ? "bg-primary/15 text-primary border-primary/40" : "bg-card border-border/60 text-muted-foreground"
              }`}
            >
              <Users size={12} />
              {selectAll ? `Todos (${audienceUsers.length})` : `${effectiveSelected.size} selecionados`}
            </button>
          </div>

          {/* User list */}
          <ScrollArea className="h-[320px] border border-border/50 rounded-xl bg-card/30">
            <div className="divide-y divide-border/30">
              {audienceUsers.map(u => {
                const d = getDaysLeft(u.plan_expires_at);
                const isChecked = selectAll || selectedIds.has(u.id);
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/10 transition-colors cursor-pointer"
                    onClick={() => toggleUser(u.id)}
                  >
                    <Checkbox checked={isChecked} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.full_name || "—"}</p>
                      <p className="text-[11px] text-muted-foreground/60 truncate">{u.email}</p>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground/50 hidden sm:block">
                      {formatPhone(u.phone)}
                    </span>
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      {u.plan_name || "—"}
                    </Badge>
                    {d !== null && d <= 0 && (
                      <span className="text-[9px] text-red-400 font-bold shrink-0">Vencido</span>
                    )}
                  </div>
                );
              })}
              {audienceUsers.length === 0 && (
                <div className="text-center py-12 text-sm text-muted-foreground/50">
                  Nenhum cliente neste filtro
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep("message")}
              disabled={effectiveSelected.size === 0}
              className="gap-2"
            >
              Próximo: Mensagem <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Message */}
      {step === "message" && (
        <div className="space-y-4">
          <div className="bg-card/60 border border-border/50 rounded-xl p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Modelo de mensagem</label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione um modelo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">
                    <span className="flex items-center gap-2">✏️ Mensagem personalizada</span>
                  </SelectItem>
                  {templates.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        <FileText size={12} /> {t.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {templateId === "custom" ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Mensagem *</label>
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  rows={6}
                  className="resize-none text-sm"
                />
                <p className="text-[10px] text-muted-foreground/50">
                  Variáveis: {"{{nome}}"}, {"{{email}}"}, {"{{plano}}"}, {"{{telefone}}"}, {"{{vencimento}}"}
                </p>
              </div>
            ) : selectedTemplate ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Preview do modelo</label>
                <div className="bg-muted/30 border border-border/40 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap text-foreground">{selectedTemplate.content}</p>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Conexão para envio</label>
              <Select value={connectionPurpose} onValueChange={setConnectionPurpose}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((c: any) => (
                    <SelectItem key={c.purpose} value={c.purpose}>
                      <span className="flex items-center gap-2">
                        <Smartphone size={12} /> {c.label}
                        {!c.device_id && <span className="text-[10px] text-red-400">(sem dispositivo)</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dispatchConnection && !dispatchConnection.device_id && (
                <p className="text-[10px] text-yellow-400 flex items-center gap-1">
                  <AlertTriangle size={10} /> Configure um dispositivo na aba Conexões
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("audience")}>Voltar</Button>
            <Button
              onClick={() => setStep("review")}
              disabled={!messageContent.trim()}
              className="gap-2"
            >
              Próximo: Enviar <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Review */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="bg-card/60 border border-border/50 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Eye size={16} className="text-primary" /> Resumo do Envio</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/20 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-bold mb-1">Clientes</p>
                <p className="text-lg font-bold text-foreground">{effectiveSelected.size}</p>
                <p className="text-[11px] text-muted-foreground">{AUDIENCE_OPTIONS.find(o => o.value === audienceFilter)?.label}</p>
              </div>
              <div className="bg-muted/20 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-bold mb-1">Conexão</p>
                <p className="text-sm font-semibold text-foreground">{dispatchConnection?.label || "—"}</p>
                <p className="text-[11px] text-muted-foreground">{dispatchConnection?.device_id ? "Configurada ✓" : "Sem dispositivo ⚠"}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-bold mb-2">Mensagem</p>
              <div className="bg-muted/30 border border-border/40 rounded-lg p-4 max-h-40 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap text-foreground">{messageContent}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("message")}>Voltar</Button>
            <Button
              onClick={handleDispatch}
              disabled={dispatching}
              className="gap-2"
            >
              {dispatching ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {dispatching ? "Enviando..." : `Disparar para ${effectiveSelected.size}`}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && result && (
        <div className="text-center py-12 space-y-4">
          <CheckCircle2 size={48} className="mx-auto text-emerald-400" />
          <div>
            <p className="text-xl font-bold text-foreground">{result.ok} mensagen{result.ok !== 1 ? "s" : ""} enfileirada{result.ok !== 1 ? "s" : ""}</p>
            {result.fail > 0 && <p className="text-sm text-red-400 mt-1">{result.fail} falha{result.fail !== 1 ? "s" : ""}</p>}
          </div>
          <Button onClick={resetAll} className="gap-2">
            <Send size={14} /> Novo Disparo
          </Button>
        </div>
      )}
    </div>
  );
}
