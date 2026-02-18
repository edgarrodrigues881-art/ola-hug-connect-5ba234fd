import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRef, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type StatusFilter = "NOVA" | "USANDO" | "USADA" | null;

const PROXY_DISCLAIMER_KEY = "proxy-disclaimer-accepted";

const Proxy = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ host: "", port: "", username: "", password: "" });
  const [pasteInput, setPasteInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stableIdMapRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!localStorage.getItem(PROXY_DISCLAIMER_KEY)) setDisclaimerOpen(true);
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem(PROXY_DISCLAIMER_KEY, "true");
    setDisclaimerOpen(false);
    setDisclaimerChecked(false);
  };

  // Fetch proxies
  const { data: dbProxies = [] } = useQuery({
    queryKey: ["proxies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proxies")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!session,
  });

  // Maintain stable display IDs - never reassign, never remove
  const idMap = stableIdMapRef.current;
  let maxId = 0;
  idMap.forEach((v) => { if (v > maxId) maxId = v; });
  
  // Assign stable IDs to new proxies only
  dbProxies.forEach((p: any) => {
    if (!idMap.has(p.id)) {
      maxId++;
      idMap.set(p.id, maxId);
    }
  });

  const proxiesWithIndex = dbProxies.map((p: any) => ({
    ...p,
    displayId: idMap.get(p.id) ?? 0,
    proxyStatus: p.status || "NOVA",
  }));

  const filtered = statusFilter
    ? proxiesWithIndex.filter((p: any) => p.proxyStatus === statusFilter)
    : proxiesWithIndex;

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (proxies: { host: string; port: string; username: string; password: string }[]) => {
      const insertData = proxies.map((p) => ({ ...p, type: "HTTP", user_id: session?.user.id }));
      const { error } = await supabase.from("proxies").insert(insertData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
      toast.success("Proxy(s) adicionada(s)!");
    },
    onError: () => toast.error("Erro ao adicionar proxy"),
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("proxies").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
      setSelectedIds(new Set());
      toast.success("Proxies removidas");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "NOVA" | "USANDO" | "USADA" }) => {
      const { error } = await supabase.from("proxies").update({ status } as any).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["proxies"] });
      const previous = queryClient.getQueryData(["proxies"]);
      queryClient.setQueryData(["proxies"], (old: any[]) =>
        old?.map((p: any) => (p.id === id ? { ...p, status } : p)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["proxies"], context.previous);
      toast.error("Erro ao atualizar status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["proxies"] });
    },
    onSuccess: () => toast.success("Status atualizado!", { dismissible: true, closeButton: true }),
  });

  // Parse
  const parseLine = (line: string) => {
    const t = line.trim();
    if (!t) return null;
    let host = "", port = "", username = "", password = "";
    if (t.includes("@")) {
      const [cred, hp] = t.split("@");
      const c = cred.split(":");
      username = c[0] || ""; password = c[1] || "";
      const h = hp?.split(":") || [];
      host = h[0] || ""; port = h[1] || "";
    } else {
      const p = t.split(":");
      host = p[0] || ""; port = p[1] || ""; username = p[2] || ""; password = p[3] || "";
    }
    return host && port ? { host, port, username, password } : null;
  };

  const handlePasteInput = (value: string) => {
    setPasteInput(value);
    const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      // Multiple lines pasted - parse all and add
      const parsed = lines.map(parseLine).filter(Boolean) as any[];
      if (parsed.length > 0) {
        addMutation.mutate(parsed);
        setPasteInput("");
        setForm({ host: "", port: "", username: "", password: "" });
        setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
      }
      return;
    }
    const parsed = parseLine(value);
    if (parsed && parsed.host && parsed.port) {
      setForm(parsed);
    }
  };

  const handleAdd = () => {
    if (!form.host || !form.port) {
      toast.error("Preencha pelo menos Host e Porta");
      return;
    }
    addMutation.mutate([{ host: form.host, port: form.port, username: form.username, password: form.password }]);
    setForm({ host: "", port: "", username: "", password: "" });
    setPasteInput("");
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          
          const parsed: any[] = [];
          for (const row of rows) {
            if (!row || !Array.isArray(row) || row.length < 1) continue;
            const vals = row.map((v: any) => String(v ?? "").trim());
            
            // Skip header/empty rows
            const first = vals[0]?.toLowerCase();
            if (!first || first === "host" || first === "ip" || first.includes("proxy") || first === "servidor") continue;
            
            // Try parsing first cell as "host:port:user:pass"
            const fromParse = parseLine(vals[0]);
            if (fromParse) {
              parsed.push(fromParse);
              continue;
            }
            
            // Fallback: Columns: host, port, user, password
            if (vals.length >= 2) {
              const host = vals[0] || "";
              const port = vals[1] || "";
              const username = vals[2] || "";
              const password = vals[3] || "";
              if (host && port) {
                parsed.push({ host, port, username, password });
              }
            }
          }
          
          if (parsed.length > 0) addMutation.mutate(parsed);
          else toast.error("Nenhuma proxy válida encontrada no Excel");
        } catch (err) {
          console.error("Erro ao ler Excel:", err);
          toast.error("Erro ao ler arquivo Excel");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // TXT / CSV
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (!text) return;
        const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
        const parsed = lines.map(parseLine).filter(Boolean) as any[];
        if (parsed.length > 0) addMutation.mutate(parsed);
        else toast.error("Nenhuma proxy válida encontrada");
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    setSelectedIds(
      selectedIds.size === filtered.length ? new Set() : new Set(filtered.map((p: any) => p.id))
    );
  };

  const handleExport = (status: "NOVA" | "USANDO" | "USADA") => {
    const toExport = proxiesWithIndex.filter((p: any) => p.proxyStatus === status);
    if (toExport.length === 0) {
      toast.error(`Nenhuma proxy com status "${status}" para exportar`);
      return;
    }
    const content = toExport.map((p: any) =>
      p.username ? `${p.username}:${p.password}@${p.host}:${p.port}` : `${p.host}:${p.port}`
    ).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `proxies-${status.toLowerCase()}.txt`; a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
    toast.success(`${toExport.length} proxy(s) "${status}" exportada(s)!`);
  };

  const filterChips: StatusFilter[] = ["NOVA", "USANDO", "USADA"];

  const statusBadge = (s: string) => {
    switch (s) {
      case "USANDO":
        return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">USANDO</Badge>;
      case "USADA":
        return <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/30">USADA</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] text-muted-foreground">NOVA</Badge>;
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Disclaimer */}
      <Dialog open={disclaimerOpen} onOpenChange={(open) => { if (!open) navigate("/dashboard"); }}>
        <DialogContent className="sm:max-w-lg backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-foreground text-lg">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
                <span className="text-yellow-500 text-lg">⚠</span>
              </div>
              Diretrizes para uso de Proxy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-1.5">
              <p className="text-sm font-medium text-yellow-500/90">Requisitos mínimos de qualidade</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Proxies gratuitas, compartilhadas ou de baixa reputação podem comprometer a estabilidade da instância.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5">
              <p className="text-sm font-medium text-foreground/80">Termo de responsabilidade</p>
              <ul className="text-xs text-muted-foreground leading-relaxed space-y-1 list-none">
                <li>• Utilize proxies <strong className="text-foreground">residenciais ou móveis dedicadas</strong>.</li>
                <li>• Evite proxies de datacenter compartilhadas.</li>
                <li>• Uma proxy dedicada por instância.</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <div className="flex items-start gap-2">
              <Checkbox id="disclaimer-check" checked={disclaimerChecked} onCheckedChange={(v) => setDisclaimerChecked(!!v)} className="mt-0.5" />
              <label htmlFor="disclaimer-check" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                Declaro estar ciente das diretrizes e assumir total responsabilidade.
              </label>
            </div>
            <Button onClick={handleAcceptDisclaimer} className="w-full" disabled={!disclaimerChecked}>
              Confirmar e continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="text-emerald-500">✓</span> Proxy
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas proxies</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".txt,.csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
            📂 Importar
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setExportMenuOpen(!exportMenuOpen)}>
              📤 Exportar
            </Button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                  {(["NOVA", "USANDO", "USADA"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleExport(s)}
                      className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2">
        {[
          { key: null as StatusFilter, label: "Todas", icon: "📋", activeClass: "bg-indigo-600/15 text-indigo-400 border-indigo-500/40" },
          { key: "NOVA" as StatusFilter, label: "Nova", icon: "🆕", activeClass: "bg-sky-500/15 text-sky-400 border-sky-500/40" },
          { key: "USANDO" as StatusFilter, label: "Usando", icon: "🟢", activeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" },
          { key: "USADA" as StatusFilter, label: "Usada", icon: "🟡", activeClass: "bg-amber-500/15 text-amber-400 border-amber-500/40" },
        ].map((chip) => (
          <button
            key={chip.label}
            onClick={() => setStatusFilter(chip.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              statusFilter === chip.key
                ? chip.activeClass
                : "border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:border-muted-foreground/20"
            }`}
          >
            <span className="text-[11px]">{chip.icon}</span>
            {chip.label}
          </button>
        ))}
      </div>

      {/* Add form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Adicionar Proxy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cole uma ou mais proxies (host:porta:user:senha ou user:senha@host:porta)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="192.168.0.1:8080:user:senha ou user:senha@host:porta"
                value={pasteInput}
                onChange={(e) => handlePasteInput(e.target.value)}
                className="font-mono text-xs flex-1"
              />
              <Button onClick={handleAdd} size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shrink-0">
                ＋ Adicionar
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Host</Label>
              <Input placeholder="192.168.0.1" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Porta</Label>
              <Input placeholder="8080" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Usuário</Label>
              <Input placeholder="user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Senha</Label>
              <Input placeholder="senha" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-9 text-sm" />
            </div>
          </div>
          <Button onClick={handleAdd} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
            ＋ Adicionar
          </Button>
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{selectedIds.size} selecionada(s)</span>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => deleteMultipleMutation.mutate(Array.from(selectedIds))}>
            🗑 Remover
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setClearAllConfirmOpen(true)}>
            ✕ Limpar tudo
          </Button>

          {/* Confirmação de Limpar tudo */}
          <Dialog open={clearAllConfirmOpen} onOpenChange={setClearAllConfirmOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Tem certeza?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Todas as proxies serão removidas permanentemente. Esta ação não pode ser desfeita.</p>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setClearAllConfirmOpen(false)}>Cancelar</Button>
                <Button variant="destructive" size="sm" onClick={() => { deleteMultipleMutation.mutate(filtered.map((p: any) => p.id)); setClearAllConfirmOpen(false); }}>Sim, limpar tudo</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Proxy table */}
      <Card ref={tableRef}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Proxies ({filtered.length})</CardTitle>
            {filtered.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>
                {selectedIds.size === filtered.length ? "Desmarcar" : "Selecionar tudo"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">Nenhuma proxy cadastrada. Importe ou adicione acima.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="text-xs">ID</TableHead>
                      <TableHead className="text-xs">Proxy</TableHead>
                      <TableHead className="text-xs">Usuário</TableHead>
                      <TableHead className="text-xs">Senha</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((proxy: any) => {
                      const isSelected = selectedIds.has(proxy.id);
                      return (
                        <TableRow key={proxy.id} className={isSelected ? "bg-primary/5" : ""}>
                          <TableCell>
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(proxy.id)} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {proxy.displayId}
                          </TableCell>
                          <TableCell>
                            <p className="text-xs font-medium text-foreground font-mono">{proxy.host}:{proxy.port}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-muted-foreground font-mono">{proxy.username || "—"}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-muted-foreground font-mono">{proxy.password || "—"}</p>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={proxy.proxyStatus}
                              onValueChange={(value) => updateStatusMutation.mutate({ id: proxy.id, status: value as any })}
                            >
                              <SelectTrigger className="h-6 w-auto gap-1 rounded-full !border-0 bg-transparent px-0 text-[10px] !shadow-none !ring-0 !ring-offset-0 !outline-none [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-40">
                                {statusBadge(proxy.proxyStatus)}
                              </SelectTrigger>
                              <SelectContent className="min-w-[100px] bg-popover z-50">
                                <SelectItem value="NOVA" className="text-xs">NOVA</SelectItem>
                                <SelectItem value="USANDO" className="text-xs">USANDO</SelectItem>
                                <SelectItem value="USADA" className="text-xs">USADA</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {isSelected && (
                              <button
                                onClick={() => deleteMultipleMutation.mutate([proxy.id])}
                                className="text-destructive hover:text-destructive/80 transition-colors text-sm"
                                title="Remover"
                              >
                                🗑
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Proxy;
