import { useNavigate } from "react-router-dom";
import { Shield, Plus, Trash2, ToggleLeft, ToggleRight, Upload, Download, Info, X, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";

interface ProxyEntry {
  id: string;
  host: string;
  port: string;
  username: string;
  password: string;
  active: boolean;
}

const PROXY_DISCLAIMER_KEY = "proxy-disclaimer-accepted";

const Proxy = () => {
  const navigate = useNavigate();
  const [proxies, setProxies] = useState<ProxyEntry[]>([]);
  const [form, setForm] = useState({ host: "", port: "", username: "", password: "" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [howToOpen, setHowToOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.removeItem(PROXY_DISCLAIMER_KEY);
    setDisclaimerOpen(true);
  }, []);

  const [disclaimerChecked, setDisclaimerChecked] = useState(false);

  const handleAcceptDisclaimer = () => {
    localStorage.setItem(PROXY_DISCLAIMER_KEY, "true");
    setDisclaimerOpen(false);
    setDisclaimerChecked(false);
  };

  // Add manual
  const handleAdd = () => {
    if (!form.host || !form.port || !form.username || !form.password) {
      toast.error("Preencha todos os campos: host, porta, usuário e senha");
      return;
    }
    setProxies((prev) => [
      ...prev,
      { ...form, id: crypto.randomUUID(), active: true },
    ]);
    setForm({ host: "", port: "", username: "", password: "" });
    toast.success("Proxy adicionado!");
  };

  const toggleProxy = (id: string) => {
    setProxies((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  const removeProxy = (id: string) => {
    setProxies((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    toast.success("Proxy removido");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === proxies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(proxies.map((p) => p.id)));
    }
  };

  const removeSelected = () => {
    if (selectedIds.size === 0) return;
    setProxies((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    toast.success("Proxies removidos");
  };

  const clearAll = () => {
    setProxies([]);
    setSelectedIds(new Set());
    toast.success("Todas as proxies foram removidas");
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
          const [credentials, hostPort] = line.split("@");
          const credParts = credentials.split(":");
          username = credParts[0] || "";
          password = credParts[1] || "";
          const hpParts = hostPort?.split(":") || [];
          host = hpParts[0] || "";
          port = hpParts[1] || "";
        } else {
          const parts = line.split(":");
          host = parts[0] || "";
          port = parts[1] || "";
          username = parts[2] || "";
          password = parts[3] || "";
        }

        if (host && port) {
          imported.push({ id: crypto.randomUUID(), host, port, username, password, active: true });
        }
      }

      if (imported.length > 0) {
        setProxies((prev) => [...prev, ...imported]);
        toast.success(`${imported.length} proxy(s) importado(s)!`);
      } else {
        toast.error("Nenhuma proxy válida encontrada no arquivo");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExport = () => {
    if (proxies.length === 0) {
      toast.error("Nenhuma proxy para exportar");
      return;
    }
    const content = proxies
      .map((p) => `${p.username}:${p.password}@${p.host}:${p.port}`)
      .join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proxies.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Proxies exportadas!");
  };

  return (
    <div className="space-y-6 animate-fade-up">
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
            {/* Risk block */}
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/25 space-y-1.5">
              <p className="text-sm font-medium text-yellow-600">⚠ Utilize apenas proxies de alta qualidade.</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Proxies gratuitos, compartilhados ou de baixa reputação podem comprometer a estabilidade da instância e aumentar o risco de restrições.
              </p>
            </div>

            {/* Recommendation block */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5">
              <p className="text-sm font-medium text-primary">✔ Recomendação técnica</p>
              <ul className="text-xs text-muted-foreground leading-relaxed space-y-1 list-none">
                <li>• Proxies <strong className="text-foreground">residenciais ou móveis</strong> de fornecedores confiáveis.</li>
                <li>• Evite proxies de datacenter compartilhadas.</li>
                <li>• Sempre utilize uma proxy dedicada por instância para evitar cruzamento de dados.</li>
              </ul>
            </div>

            {/* Responsibility block */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1.5">
              <p className="text-sm font-medium text-foreground">🛡 Responsabilidade</p>
              <ul className="text-xs text-muted-foreground leading-relaxed space-y-1 list-none">
                <li>• O <strong className="text-foreground">DG Contingência</strong> não se responsabiliza por restrições ou bloqueios decorrentes do uso inadequado de proxies.</li>
                <li>• A escolha e configuração da proxy são de responsabilidade exclusiva do usuário.</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex-col gap-3 sm:flex-col">
            <div className="flex items-start gap-2">
              <Checkbox
                id="disclaimer-check"
                checked={disclaimerChecked}
                onCheckedChange={(v) => setDisclaimerChecked(!!v)}
                className="mt-0.5"
              />
              <label htmlFor="disclaimer-check" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                Declaro estar ciente das diretrizes e assumir total responsabilidade pela proxy utilizada.
              </label>
            </div>
            <Button onClick={handleAcceptDisclaimer} className="w-full" disabled={!disclaimerChecked}>
              Aceitar e continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Proxy
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure proxies para proteger seus chips e evitar bloqueios.
          </p>
        </div>
        {/* Collapsible how-to */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setHowToOpen(!howToOpen)}
        >
          <Info className="w-3.5 h-3.5" />
          Como usar
          {howToOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
      </div>

      {/* How-to mini card */}
      {howToOpen && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-foreground">📋 Formato aceito para importação:</p>
            <div className="bg-muted/50 rounded-md p-2.5 border border-border font-mono text-xs text-foreground space-y-0.5">
              <p>host:porta:usuario:senha</p>
              <p>usuario:senha@host:porta</p>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Exemplo:</strong> 192.168.0.1:8080:meuuser:minhasenha
            </p>
            <p className="text-xs text-muted-foreground">
              Tipos suportados: <strong>HTTP, HTTPS, SOCKS4, SOCKS5</strong>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Import / Export / Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv"
          className="hidden"
          onChange={handleImport}
        />
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-3.5 h-3.5" /> Importar arquivo
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" /> Exportar proxies
        </Button>
        {proxies.length > 0 && (
          <>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={removeSelected} disabled={selectedIds.size === 0}>
              <Trash2 className="w-3.5 h-3.5" /> Remover selecionados ({selectedIds.size})
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={clearAll}>
              <X className="w-3.5 h-3.5" /> Limpar tudo
            </Button>
          </>
        )}
      </div>

      {/* Manual Add */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar Proxy Manualmente</CardTitle>
          <CardDescription>Insira os dados do proxy (HTTP/SOCKS5)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-destructive">*Host</Label>
              <Input placeholder="192.168.0.1" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-destructive">*Porta</Label>
              <Input placeholder="8080" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-destructive">*Usuário</Label>
              <Input placeholder="user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-destructive">*Senha</Label>
              <Input type="password" placeholder="••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleAdd} className="mt-4 gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Proxy
          </Button>
        </CardContent>
      </Card>

      {/* Proxy List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Proxies Configurados</CardTitle>
              <CardDescription>{proxies.length} proxy(s) cadastrado(s)</CardDescription>
            </div>
            {proxies.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={selectAll}>
                {selectedIds.size === proxies.length ? "Desmarcar tudo" : "Selecionar tudo"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {proxies.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum proxy configurado ainda.</p>
              <p className="text-xs text-muted-foreground">Adicione manualmente ou importe um arquivo .txt</p>
            </div>
          ) : (
            <div className="space-y-2">
              {proxies.map((proxy, idx) => (
                <div
                  key={proxy.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedIds.has(proxy.id) ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={selectedIds.has(proxy.id)} onCheckedChange={() => toggleSelect(proxy.id)} />
                    <span className="text-xs text-muted-foreground w-6">#{idx + 1}</span>
                    <button onClick={() => toggleProxy(proxy.id)} className="text-muted-foreground hover:text-foreground">
                      {proxy.active ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                    <div>
                      <p className="text-sm font-medium text-foreground">{proxy.host}:{proxy.port}</p>
                      <p className="text-xs text-muted-foreground">Usuário: {proxy.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${proxy.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {proxy.active ? "Ativo" : "Inativo"}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => removeProxy(proxy.id)} className="h-8 w-8 text-destructive/70 hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Proxy;
