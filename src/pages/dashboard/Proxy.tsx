import { Shield, Plus, Trash2, ToggleLeft, ToggleRight, Upload, Download, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ProxyEntry {
  id: string;
  host: string;
  port: string;
  username: string;
  password: string;
  active: boolean;
}

const Proxy = () => {
  const [proxies, setProxies] = useState<ProxyEntry[]>([]);
  const [form, setForm] = useState({ host: "", port: "", username: "", password: "" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add manual
  const handleAdd = () => {
    if (!form.host || !form.port) {
      toast.error("Preencha pelo menos host e porta");
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

  // Select
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

  // Remove selected
  const removeSelected = () => {
    if (selectedIds.size === 0) return;
    setProxies((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    toast.success("Proxies removidos");
  };

  // Clear all
  const clearAll = () => {
    setProxies([]);
    setSelectedIds(new Set());
    toast.success("Todas as proxies foram removidas");
  };

  // Import file
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
        // Formats: host:port:user:pass  OR  host:port  OR  user:pass@host:port
        let host = "", port = "", username = "", password = "";

        if (line.includes("@")) {
          // user:pass@host:port
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

    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Export
  const handleExport = () => {
    if (proxies.length === 0) {
      toast.error("Nenhuma proxy para exportar");
      return;
    }
    const content = proxies
      .map((p) =>
        p.username
          ? `${p.username}:${p.password}@${p.host}:${p.port}`
          : `${p.host}:${p.port}`
      )
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
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Proxy
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure proxies para proteger seus chips e evitar bloqueios.
        </p>
      </div>

      {/* Warning / Info Box */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">⚠️ Aviso importante sobre proxies</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O <strong>DG Contingência Pro</strong> não se responsabiliza por banimentos causados pelo uso de proxies de má qualidade.
                Utilize sempre proxies residenciais ou móveis de fornecedores confiáveis para garantir a segurança das suas instâncias.
              </p>
            </div>
          </div>
          <div className="border-t border-yellow-500/20 pt-3">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">📋 Formato correto para proxies</p>
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-mono text-foreground">host:porta:usuario:senha</p>
                  <p className="text-xs font-mono text-foreground">usuario:senha@host:porta</p>
                  <p className="text-xs font-mono text-foreground">host:porta</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Exemplo:</strong> 192.168.0.1:8080:meuuser:minhasenha
                </p>
                <p className="text-xs text-muted-foreground">
                  Tipos suportados: <strong>HTTP, HTTPS, SOCKS4, SOCKS5</strong>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import / Export / Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv"
          className="hidden"
          onChange={handleImport}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
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
              <Label>Host *</Label>
              <Input
                placeholder="192.168.0.1"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Porta *</Label>
              <Input
                placeholder="8080"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Usuário (opcional)</Label>
              <Input
                placeholder="user"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Senha (opcional)</Label>
              <Input
                type="password"
                placeholder="••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
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
              <p className="text-sm text-muted-foreground">
                Nenhum proxy configurado ainda.
              </p>
              <p className="text-xs text-muted-foreground">
                Adicione manualmente ou importe um arquivo .txt com suas proxies.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {proxies.map((proxy, idx) => (
                <div
                  key={proxy.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedIds.has(proxy.id)
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedIds.has(proxy.id)}
                      onCheckedChange={() => toggleSelect(proxy.id)}
                    />
                    <span className="text-xs text-muted-foreground w-6">#{idx + 1}</span>
                    <button onClick={() => toggleProxy(proxy.id)} className="text-muted-foreground hover:text-foreground">
                      {proxy.active ? (
                        <ToggleRight className="w-6 h-6 text-primary" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {proxy.host}:{proxy.port}
                      </p>
                      {proxy.username && (
                        <p className="text-xs text-muted-foreground">Usuário: {proxy.username}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        proxy.active
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
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
