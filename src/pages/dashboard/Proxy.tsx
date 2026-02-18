import { Shield, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
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
    toast.success("Proxy removido");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Proxy
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure proxies para proteger seus chips e evitar bloqueios.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar Proxy</CardTitle>
          <CardDescription>Insira os dados do proxy (HTTP/SOCKS5)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Host</Label>
              <Input
                placeholder="192.168.0.1"
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Porta</Label>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proxies Configurados</CardTitle>
          <CardDescription>{proxies.length} proxy(s) cadastrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {proxies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum proxy configurado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {proxies.map((proxy) => (
                <div
                  key={proxy.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center gap-3">
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
