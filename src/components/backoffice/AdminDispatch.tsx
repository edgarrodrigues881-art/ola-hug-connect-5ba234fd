import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Send, Loader2, CheckCircle2, Users, Filter, Search,
  FileText, ChevronRight, Smartphone, AlertTriangle, Eye,
  Upload, FileSpreadsheet, ArrowRight, Trash2, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminDashboard, type AdminUser } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

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

type ImportColumnMapping = "nome" | "numero" | "ignorar";
const IMPORT_MAPPING_OPTIONS: { value: ImportColumnMapping; label: string }[] = [
  { value: "ignorar", label: "Ignorar" },
  { value: "nome", label: "Nome" },
  { value: "numero", label: "Número" },
];

interface RawImport {
  headers: string[];
  rows: any[][];
  columnMappings: ImportColumnMapping[];
}

interface ImportedContact {
  id: string;
  name: string;
  phone: string;
}

type AudienceSource = "clients" | "imported";

export default function AdminDispatch() {
  const queryClient = useQueryClient();
  const { data: dashData } = useAdminDashboard();
  const users = dashData?.users || [];

  const [step, setStep] = useState<"audience" | "message" | "review" | "done">("audience");
  const [audienceSource, setAudienceSource] = useState<AudienceSource>("clients");
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [search, setSearch] = useState("");
  const [templateId, setTemplateId] = useState<string>("custom");
  const [customMessage, setCustomMessage] = useState("");
  const [connectionPurpose, setConnectionPurpose] = useState("dispatch");
  const [dispatching, setDispatching] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number } | null>(null);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImport, setRawImport] = useState<RawImport | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importedContacts, setImportedContacts] = useState<ImportedContact[]>([]);
  const [importSelectedIds, setImportSelectedIds] = useState<Set<string>>(new Set());
  const [importSelectAll, setImportSelectAll] = useState(true);
  const [importSearch, setImportSearch] = useState("");

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

  // === Client audience logic ===
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
    if (audienceSource === "imported") {
      if (importSelectAll) return new Set(filteredImported.map(c => c.id));
      return importSelectedIds;
    }
    if (selectAll) return new Set(audienceUsers.map(u => u.id));
    return selectedIds;
  }, [audienceSource, selectAll, selectedIds, audienceUsers, importSelectAll, importSelectedIds]);

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

  // === Import logic ===
  const filteredImported = useMemo(() => {
    const q = importSearch.toLowerCase();
    if (!q) return importedContacts;
    return importedContacts.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [importedContacts, importSearch]);

  const toggleImportContact = (id: string) => {
    setImportSelectAll(false);
    setImportSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleImportAll = () => {
    if (importSelectAll) {
      setImportSelectAll(false);
      setImportSelectedIds(new Set());
    } else {
      setImportSelectAll(true);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    const ext = file.name.split(".").pop()?.toLowerCase();

    const processRows = (rawRows: any[][]) => {
      if (rawRows.length < 2) { setImportLoading(false); toast.error("Arquivo vazio ou sem dados"); return; }
      const headers = rawRows[0].map((h: any) => String(h || "").trim());
      const dataRows = rawRows.slice(1).filter(r => r.some((c: any) => c != null && String(c).trim()));
      const mappings: ImportColumnMapping[] = headers.map((h) => {
        const lower = h.toLowerCase();
        if (lower.includes("nome") || lower.includes("name")) return "nome";
        if (lower.includes("numero") || lower.includes("phone") || lower.includes("telefone") || lower.includes("number") || lower.includes("celular") || lower.includes("whatsapp")) return "numero";
        return "ignorar";
      });
      setRawImport({ headers, rows: dataRows, columnMappings: mappings });
      setImportLoading(false);
    };

    if (ext === "xlsx" || ext === "xls") {
      import("xlsx").then(XLSX => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const wb = XLSX.read(ev.target?.result, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          processRows(XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]);
        };
        reader.readAsArrayBuffer(file);
      });
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter(Boolean);
        processRows(lines.map(l => l.split(/[,;]/)));
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  const updateImportMapping = (colIndex: number, value: ImportColumnMapping) => {
    if (!rawImport) return;
    const newMappings = [...rawImport.columnMappings];
    if (value !== "ignorar") {
      newMappings.forEach((m, i) => { if (i !== colIndex && m === value) newMappings[i] = "ignorar"; });
    }
    newMappings[colIndex] = value;
    setRawImport({ ...rawImport, columnMappings: newMappings });
  };

  const confirmImportMapping = () => {
    if (!rawImport) return;
    const { rows, columnMappings } = rawImport;
    const numIdx = columnMappings.indexOf("numero");
    const nameIdx = columnMappings.indexOf("nome");

    if (numIdx < 0) { toast.error("Mapeie a coluna de número"); return; }

    const contacts: ImportedContact[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const rawPhone = String(row[numIdx] || "").trim();
      if (!rawPhone) continue;
      const phone = rawPhone.replace(/\D/g, "");
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      contacts.push({
        id: `imp_${phone}`,
        name: nameIdx >= 0 ? String(row[nameIdx] || "Sem nome").trim() : "Sem nome",
        phone,
      });
    }

    setImportedContacts(contacts);
    setImportSelectAll(true);
    setImportSelectedIds(new Set());
    setRawImport(null);
    setAudienceSource("imported");
    toast.success(`${contacts.length} contatos importados`);
  };

  // === Shared logic ===
  const selectedTemplate = templates.find((t: any) => t.id === templateId);
  const messageContent = templateId === "custom" ? customMessage : selectedTemplate?.content || "";

  const handleDispatch = useCallback(async () => {
    if (!messageContent.trim()) { toast.error("Selecione ou escreva uma mensagem"); return; }
    if (effectiveSelected.size === 0) { toast.error("Selecione pelo menos um destinatário"); return; }

    setDispatching(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      let targets: any[];
      if (audienceSource === "imported") {
        targets = importedContacts
          .filter(c => effectiveSelected.has(c.id))
          .map(c => ({
            phone: c.phone,
            name: c.name,
          }));
      } else {
        targets = audienceUsers
          .filter(u => effectiveSelected.has(u.id))
          .map(u => ({
            user_id: u.id, phone: u.phone, name: u.full_name || u.email,
            email: u.email, plan_name: u.plan_name,
          }));
      }

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
      toast.success(`Disparo enviado para ${data.enqueued || targets.length} destinatários`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDispatching(false);
    }
  }, [messageContent, effectiveSelected, audienceUsers, importedContacts, audienceSource, connectionPurpose]);

  const resetAll = () => {
    setStep("audience");
    setResult(null);
    setCustomMessage("");
    setTemplateId("custom");
    setSelectedIds(new Set());
    setSelectAll(true);
    setSearch("");
    setAudienceFilter("all");
    setImportedContacts([]);
    setImportSelectAll(true);
    setImportSelectedIds(new Set());
    setImportSearch("");
    setAudienceSource("clients");
  };

  const dispatchConnection = connections.find((c: any) => c.purpose === connectionPurpose);

  const audienceLabel = audienceSource === "imported"
    ? `Lista importada (${importedContacts.length})`
    : AUDIENCE_OPTIONS.find(o => o.value === audienceFilter)?.label || "Clientes";

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
          {/* Source toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted/20 rounded-lg border border-border/40 w-fit">
            <button
              onClick={() => setAudienceSource("clients")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                audienceSource === "clients"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/30"
              }`}
            >
              <Users size={12} /> Clientes
            </button>
            <button
              onClick={() => setAudienceSource("imported")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                audienceSource === "imported"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/30"
              }`}
            >
              <FileSpreadsheet size={12} /> Lista importada
              {importedContacts.length > 0 && (
                <span className="text-[10px] bg-primary-foreground/20 px-1.5 rounded-full">{importedContacts.length}</span>
              )}
            </button>
          </div>

          {/* Clients source */}
          {audienceSource === "clients" && (
            <>
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
            </>
          )}

          {/* Imported source */}
          {audienceSource === "imported" && (
            <>
              {importedContacts.length === 0 ? (
                <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Upload size={24} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Importar lista de contatos</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Envie um arquivo CSV ou XLSX com nome e número de telefone
                    </p>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportFile} />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importLoading}
                    className="gap-2"
                  >
                    {importLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                    {importLoading ? "Processando..." : "Selecionar arquivo"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex-1 max-w-xs">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                      <Input
                        placeholder="Buscar na lista..."
                        value={importSearch}
                        onChange={e => setImportSearch(e.target.value)}
                        className="pl-9 h-9 bg-card/50 border-border/60 text-sm"
                      />
                    </div>

                    <button
                      onClick={toggleImportAll}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                        importSelectAll ? "bg-primary/15 text-primary border-primary/40" : "bg-card border-border/60 text-muted-foreground"
                      }`}
                    >
                      <Users size={12} />
                      {importSelectAll ? `Todos (${filteredImported.length})` : `${effectiveSelected.size} selecionados`}
                    </button>

                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportFile} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={importLoading}
                      className="gap-1.5 text-xs"
                    >
                      <FileSpreadsheet size={12} />
                      Reimportar
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setImportedContacts([]); setImportSelectAll(true); setImportSelectedIds(new Set()); }}
                      className="gap-1.5 text-xs text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={12} />
                      Limpar
                    </Button>
                  </div>

                  <ScrollArea className="h-[320px] border border-border/50 rounded-xl bg-card/30">
                    <div className="divide-y divide-border/30">
                      {filteredImported.map(c => {
                        const isChecked = importSelectAll || importSelectedIds.has(c.id);
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/10 transition-colors cursor-pointer"
                            onClick={() => toggleImportContact(c.id)}
                          >
                            <Checkbox checked={isChecked} className="shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground/50">
                              {formatPhone(c.phone)}
                            </span>
                            <Badge variant="outline" className="text-[9px] shrink-0 text-blue-400 border-blue-400/30">
                              Importado
                            </Badge>
                          </div>
                        );
                      })}
                      {filteredImported.length === 0 && (
                        <div className="text-center py-12 text-sm text-muted-foreground/50">
                          Nenhum contato encontrado
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </>
          )}

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
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border/50 bg-card/60">
                <Smartphone size={14} className="text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{dispatchConnection?.label || "Disparos manuais"}</span>
                {dispatchConnection?.device_id ? (
                  <Badge variant="outline" className="ml-auto text-[9px] text-emerald-400 border-emerald-400/30">Conectado</Badge>
                ) : (
                  <span className="ml-auto text-[10px] text-red-400">(sem dispositivo)</span>
                )}
              </div>
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
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-bold mb-1">Destinatários</p>
                <p className="text-lg font-bold text-foreground">{effectiveSelected.size}</p>
                <p className="text-[11px] text-muted-foreground">{audienceLabel}</p>
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

      {/* Import Mapping Dialog */}
      <Dialog open={!!rawImport} onOpenChange={(open) => { if (!open) setRawImport(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Mapear colunas do arquivo</DialogTitle></DialogHeader>
          {rawImport && (
            <div className="space-y-4">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{rawImport.rows.length} linhas</span>
                <span>{rawImport.headers.length} colunas</span>
                <span className={rawImport.columnMappings.filter(m => m !== "ignorar").length > 0 ? "text-primary font-medium" : ""}>
                  {rawImport.columnMappings.filter(m => m !== "ignorar").length} mapeadas
                </span>
              </div>

              <div className="space-y-2">
                {rawImport.headers.map((header, i) => {
                  const mapping = rawImport.columnMappings[i];
                  const sample = rawImport.rows.slice(0, 3).map(r => String(r[i] || "")).filter(Boolean).join(", ");
                  const mappingColors: Record<string, string> = {
                    nome: "ring-emerald-500/30 bg-emerald-500/5",
                    numero: "ring-blue-500/30 bg-blue-500/5",
                  };
                  return (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-border/30 bg-muted/10">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{header || `Coluna ${i + 1}`}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{sample || "—"}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                      <Select value={mapping} onValueChange={(v) => updateImportMapping(i, v as ImportColumnMapping)}>
                        <SelectTrigger className={cn("w-[150px] h-9 text-xs", mapping !== "ignorar" && (mappingColors[mapping] || "ring-primary/30 bg-primary/5"))}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {IMPORT_MAPPING_OPTIONS.map(opt => {
                            const taken = opt.value !== "ignorar" && rawImport.columnMappings.some((m, idx) => idx !== i && m === opt.value);
                            return <SelectItem key={opt.value} value={opt.value} disabled={taken} className={taken ? "opacity-30" : ""}>{opt.label}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRawImport(null)}>Cancelar</Button>
            <Button onClick={confirmImportMapping} disabled={!rawImport?.columnMappings.includes("numero")}>
              Importar {rawImport ? rawImport.rows.length : 0} contatos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
