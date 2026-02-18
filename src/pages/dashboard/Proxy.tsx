import { useNavigate } from "react-router-dom";
import {
  Shield, Plus, Trash2, ToggleLeft, ToggleRight, Upload, Download, Info, X,
  ChevronDown, ChevronUp, AlertTriangle, Globe, Wifi, WifiOff, Clock, Pencil, Loader2, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface ProxyEntry {
  id: string;
  host: string;
  port: string;
  username: string;
  password: string;
  type: "HTTP" | "SOCKS5";
  active: boolean;
  status: "untested" | "testing" | "online" | "offline";
  detectedIp: string;
  country: string;
  latency: number | null;
  lastChecked: string;
}

const PROXY_DISCLAIMER_KEY = "proxy-disclaimer-accepted";

const countries = ["🇧🇷 Brasil", "🇺🇸 EUA", "🇩🇪 Alemanha", "🇬🇧 Reino Unido", "🇵🇹 Portugal", "🇦🇷 Argentina", "🇨🇱 Chile"];

const simulateTest = (proxy: ProxyEntry): Promise<Partial<ProxyEntry>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const online = Math.random() > 0.2;
      resolve({
        status: online ? "online" : "offline",
        detectedIp: online ? `${Math.floor(100 + Math.random() * 155)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` : "",
        country: online ? countries[Math.floor(Math.random() * countries.length)] : "",
        latency: online ? Math.floor(30 + Math.random() * 200) : null,
        lastChecked: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      });
    }, 1500 + Math.random() * 1000);
  });
};

const Proxy = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ host: "", port: "", username: "", password: "" });
  const [proxyType, setProxyType] = useState<"HTTP" | "SOCKS5">("HTTP");
  const [pasteInput, setPasteInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [howToOpen, setHowToOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, { status: string; detectedIp: string; country: string; latency: number | null; lastChecked: string }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch proxies from database
  const { data: dbProxies = [], isLoading } = useQuery({
    queryKey: ["proxies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proxies" as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!session,
  });

  // Map DB rows to ProxyEntry with local test results
  const proxies: ProxyEntry[] = dbProxies.map((p: any) => ({
    id: p.id,
    host: p.host,
    port: p.port,
    username: p.username,
    password: p.password,
    type: p.type as "HTTP" | "SOCKS5",
    active: p.active,
    status: testingIds.has(p.id) ? "testing" : (testResults[p.id]?.status as any) || "untested",
    detectedIp: testResults[p.id]?.detectedIp || "",
    country: testResults[p.id]?.country || "",
    latency: testResults[p.id]?.latency ?? null,
    lastChecked: testResults[p.id]?.lastChecked || "",
  }));

  const addMutation = useMutation({
    mutationFn: async (proxy: { host: string; port: string; username: string; password: string; type: string }) => {
      const { error } = await supabase.from("proxies" as any).insert({ ...proxy, user_id: session?.user.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["proxies"] }); toast.success("Proxy adicionada!"); },
    onError: () => toast.error("Erro ao adicionar proxy"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proxies" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["proxies"] }); toast.success("Proxy removida"); },
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("proxies" as any).delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["proxies"] }); setSelectedIds(new Set()); toast.success("Proxies removidas"); },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("proxies" as any).update({ active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proxies"] }),
  });

  useEffect(() => {
    const accepted = localStorage.getItem(PROXY_DISCLAIMER_KEY);
    if (!accepted) {
      setDisclaimerOpen(true);
    }
  }, []);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem(PROXY_DISCLAIMER_KEY, "true");
    setDisclaimerOpen(false);
    setDisclaimerChecked(false);
  };

  // Auto-parse paste input
  const handlePasteInput = (value: string) => {
    setPasteInput(value);
    const parts = value.trim();
    if (!parts) return;

    let host = "", port = "", username = "", password = "";
    if (parts.includes("@")) {
      const [cred, hp] = parts.split("@");
      const credParts = cred.split(":");
      username = credParts[0] || "";
      password = credParts[1] || "";
      const hpParts = hp?.split(":") || [];
      host = hpParts[0] || "";
      port = hpParts[1] || "";
    } else {
      const p = parts.split(":");
      host = p[0] || "";
      port = p[1] || "";
      username = p[2] || "";
      password = p[3] || "";
    }

    if (host && port) {
      setForm({ host, port, username, password });
      setPasteInput("");
    }
  };

  const handleAdd = () => {
    if (!form.host || !form.port || !form.username || !form.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    addMutation.mutate({ host: form.host, port: form.port, username: form.username, password: form.password, type: proxyType });
    setForm({ host: "", port: "", username: "", password: "" });
  };

  const handleTestProxy = async (id: string) => {
    setTestingIds((prev) => new Set(prev).add(id));
    const proxy = proxies.find((p) => p.id === id);
    if (!proxy) return;
    const result = await simulateTest(proxy);
    setTestingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setTestResults((prev) => ({ ...prev, [id]: { status: result.status || "offline", detectedIp: result.detectedIp || "", country: result.country || "", latency: result.latency ?? null, lastChecked: result.lastChecked || "" } }));
    toast.success(result.status === "online" ? "Proxy online!" : "Proxy offline");
  };

  const handleTestAll = async () => {
    toast.info("Testando todas as proxies...");
    for (const proxy of proxies) {
      setTestingIds((prev) => new Set(prev).add(proxy.id));
      const result = await simulateTest(proxy);
      setTestingIds((prev) => { const n = new Set(prev); n.delete(proxy.id); return n; });
      setTestResults((prev) => ({ ...prev, [proxy.id]: { status: result.status || "offline", detectedIp: result.detectedIp || "", country: result.country || "", latency: result.latency ?? null, lastChecked: result.lastChecked || "" } }));
    }
    toast.success("Teste concluído!");
  };

  const toggleProxy = (id: string) => {
    const proxy = proxies.find((p) => p.id === id);
    if (proxy) toggleMutation.mutate({ id, active: !proxy.active });
  };

  const removeProxy = (id: string) => {
    deleteMutation.mutate(id);
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    setSelectedIds(selectedIds.size === proxies.length ? new Set() : new Set(proxies.map((p) => p.id)));
  };

  const removeSelected = () => {
    deleteMultipleMutation.mutate(Array.from(selectedIds));
  };

  const clearAll = () => {
    deleteMultipleMutation.mutate(proxies.map((p) => p.id));
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const imported: ProxyEntry[] = [];
      for (const line of lines) {
        let host = "", port = "", username = "", password = "";
        if (line.includes("@")) {
          const [cred, hp] = line.split("@");
          const c = cred.split(":");
          username = c[0] || ""; password = c[1] || "";
          const h = hp?.split(":") || [];
          host = h[0] || ""; port = h[1] || "";
        } else {
          const p = line.split(":");
          host = p[0] || ""; port = p[1] || ""; username = p[2] || ""; password = p[3] || "";
        }
        if (host && port && username && password) {
          imported.push({ host, port, username, password, type: proxyType } as any);
        }
      }
      if (imported.length > 0) {
        const insertData = imported.map((p) => ({ ...p, user_id: session?.user.id }));
        supabase.from("proxies" as any).insert(insertData as any).then(({ error }) => {
          if (error) { toast.error("Erro ao importar"); return; }
          queryClient.invalidateQueries({ queryKey: ["proxies"] });
          toast.success(`${imported.length} proxy(s) importada(s)!`);
        });
      } else {
        toast.error("Nenhuma proxy válida encontrada");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = () => {
    if (proxies.length === 0) { toast.error("Nenhuma proxy para exportar"); return; }
    const content = proxies.map((p) => `${p.username}:${p.password}@${p.host}:${p.port}`).join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "proxies.txt"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Proxies exportadas!");
  };

  const onlineCount = proxies.filter((p) => p.status === "online").length;
  const offlineCount = proxies.filter((p) => p.status === "offline").length;
  const activeCount = proxies.filter((p) => p.active).length;

  const statusBadge = (status: ProxyEntry["status"]) => {
    switch (status) {
      case "online": return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1"><Wifi className="w-2.5 h-2.5" />Online</Badge>;
      case "offline": return <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 gap-1"><WifiOff className="w-2.5 h-2.5" />Offline</Badge>;
      case "testing": return <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-500 border-yellow-500/30 gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" />Testando</Badge>;
      default: return <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">Não testada</Badge>;
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Disclaimer Dialog */}
      <Dialog open={disclaimerOpen} onOpenChange={(open) => { if (!open) navigate("/dashboard"); }}>
        <DialogContent className="sm:max-w-lg backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-foreground text-lg">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              Diretrizes para uso de Proxy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="p-3 rounded-lg bg-yellow-500/8 border border-yellow-500/20 space-y-1.5">
              <p className="text-sm font-medium text-yellow-500/90">Requisitos mínimos de qualidade da proxy</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Proxies gratuitas, compartilhadas ou de baixa reputação podem comprometer a estabilidade da instância e elevar o risco de restrições operacionais.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary/[0.04] border border-primary/15 space-y-1.5">
              <p className="text-sm font-medium text-primary/80">Boas práticas de configuração</p>
              <ul className="text-xs text-muted-foreground leading-relaxed space-y-1 list-none">
                <li>• Proxies <strong className="text-foreground">residenciais ou móveis dedicadas</strong>, fornecidas por provedores confiáveis.</li>
                <li>• Evite proxies de datacenter compartilhadas ou pools rotativos agressivos.</li>
                <li>• Utilize uma proxy dedicada por instância para evitar cruzamento de dados.</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5">
              <p className="text-sm font-medium text-foreground/80">Termo de responsabilidade</p>
              <ul className="text-xs text-muted-foreground leading-relaxed space-y-1 list-none">
                <li>• O <strong className="text-foreground">DG Contingência</strong> não se responsabiliza por restrições ou bloqueios decorrentes do uso inadequado de proxies.</li>
                <li>• A escolha, configuração e qualidade da proxy são de responsabilidade exclusiva do usuário.</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <div className="flex items-start gap-2">
              <Checkbox id="disclaimer-check" checked={disclaimerChecked} onCheckedChange={(v) => setDisclaimerChecked(!!v)} className="mt-0.5" />
              <label htmlFor="disclaimer-check" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                Declaro estar ciente das diretrizes e assumir total responsabilidade pela proxy utilizada.
              </label>
            </div>
            <Button onClick={handleAcceptDisclaimer} className="w-full transition-colors" disabled={!disclaimerChecked}>
              Confirmar ciência e continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Proxy
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie proxies dedicadas para proteger instâncias e reduzir riscos operacionais.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setHowToOpen(!howToOpen)}>
          <Info className="w-3.5 h-3.5" />
          Como usar
          {howToOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {howToOpen && (
        <Card className="border-primary/15 bg-primary/[0.03]">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-medium text-foreground">Formato aceito para importação e auto-preenchimento:</p>
            <div className="bg-muted/50 rounded-md p-2.5 border border-border font-mono text-xs text-foreground space-y-0.5">
              <p>host:porta:usuario:senha</p>
              <p>usuario:senha@host:porta</p>
            </div>
            <p className="text-xs text-muted-foreground">Cole no campo "Auto-preenchimento" e os dados serão separados automaticamente.</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total", value: proxies.length, icon: Shield, color: "text-primary" },
          { label: "Ativas", value: activeCount, icon: Wifi, color: "text-emerald-500" },
          { label: "Online", value: onlineCount, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Offline", value: offlineCount, icon: XCircle, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={fileInputRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleImport} />
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-3.5 h-3.5" /> Importar
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" /> Exportar
        </Button>
        {proxies.length > 0 && (
          <>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleTestAll}>
              <Wifi className="w-3.5 h-3.5" /> Testar todas
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={removeSelected} disabled={selectedIds.size === 0}>
              <Trash2 className="w-3.5 h-3.5" /> Remover ({selectedIds.size})
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={clearAll}>
              <X className="w-3.5 h-3.5" /> Limpar tudo
            </Button>
          </>
        )}
      </div>

      {/* Add form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Adicionar Proxy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-parse */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Auto-preenchimento (cole host:porta:user:senha)</Label>
            <Input
              placeholder="192.168.0.1:8080:user:senha ou user:senha@host:porta"
              value={pasteInput}
              onChange={(e) => handlePasteInput(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          {/* Type selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tipo de proxy</Label>
            <div className="flex gap-2">
              {(["HTTP", "SOCKS5"] as const).map((t) => (
                <Button
                  key={t}
                  variant={proxyType === t ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setProxyType(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Endereço (Host)</Label>
              <Input placeholder="192.168.0.1" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Porta</Label>
              <Input placeholder="8080" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Usuário de autenticação</Label>
              <Input placeholder="user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Senha de autenticação</Label>
              <Input type="text" placeholder="senha" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-9 text-sm" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAdd} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Adicionar Proxy
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Proxy Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Proxies configuradas ({proxies.length})</CardTitle>
            {proxies.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>
                {selectedIds.size === proxies.length ? "Desmarcar" : "Selecionar tudo"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {proxies.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <Shield className="w-8 h-8 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhuma proxy configurada</p>
              <p className="text-xs text-muted-foreground/60">Adicione manualmente ou importe um arquivo .txt</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="text-xs">Endereço</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">IP externo</TableHead>
                    <TableHead className="text-xs">País</TableHead>
                    <TableHead className="text-xs">Latência</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Verificado</TableHead>
                    <TableHead className="text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proxies.map((proxy) => (
                    <TableRow key={proxy.id} className={selectedIds.has(proxy.id) ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox checked={selectedIds.has(proxy.id)} onCheckedChange={() => toggleSelect(proxy.id)} />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs font-medium text-foreground font-mono">{proxy.host}:{proxy.port}</p>
                          <p className="text-[10px] text-muted-foreground">{proxy.username}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{proxy.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground">{proxy.detectedIp || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs">{proxy.country || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-mono ${proxy.latency && proxy.latency < 100 ? "text-emerald-500" : proxy.latency ? "text-yellow-500" : "text-muted-foreground"}`}>
                          {proxy.latency ? `${proxy.latency}ms` : "—"}
                        </span>
                      </TableCell>
                      <TableCell>{statusBadge(proxy.status)}</TableCell>
                      <TableCell>
                        <span className="text-[10px] text-muted-foreground">{proxy.lastChecked || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTestProxy(proxy.id)} disabled={proxy.status === "testing"}>
                            {proxy.status === "testing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleProxy(proxy.id)}>
                            {proxy.active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => removeProxy(proxy.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Proxy;
