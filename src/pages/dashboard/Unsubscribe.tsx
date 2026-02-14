import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Ban, Search, Trash2, Plus, Shield, Users } from "lucide-react";

interface BlockedContact {
  id: string;
  phone: string;
  name: string;
  reason: string;
  blockedAt: string;
}

const initialBlocked: BlockedContact[] = [
  { id: "1", phone: "+5511999991111", name: "Carlos Lima", reason: "Respondeu SAIR", blockedAt: "2026-02-13" },
  { id: "2", phone: "+5521988882222", name: "Ana Martins", reason: "Respondeu SAIR", blockedAt: "2026-02-12" },
  { id: "3", phone: "+5531977773333", name: "Desconhecido", reason: "Adicionado manualmente", blockedAt: "2026-02-10" },
  { id: "4", phone: "+5511966664444", name: "Roberto Dias", reason: "Respondeu PARAR", blockedAt: "2026-02-08" },
];

const Unsubscribe = () => {
  const { toast } = useToast();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [search, setSearch] = useState("");
  const [autoBlock, setAutoBlock] = useState(true);
  const [newPhone, setNewPhone] = useState("");

  const filtered = blocked.filter(
    (b) => b.phone.includes(search) || b.name.toLowerCase().includes(search.toLowerCase())
  );

  const addManual = () => {
    if (!newPhone.trim()) return;
    setBlocked((prev) => [
      { id: crypto.randomUUID(), phone: newPhone, name: "Adicionado manualmente", reason: "Adicionado manualmente", blockedAt: new Date().toISOString().split("T")[0] },
      ...prev,
    ]);
    setNewPhone("");
    toast({ title: "Número bloqueado" });
  };

  const remove = (id: string) => {
    setBlocked((prev) => prev.filter((b) => b.id !== id));
    toast({ title: "Número desbloqueado" });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cancelar Inscrição</h1>
        <p className="text-sm text-muted-foreground">Gerencie a lista negra de contatos</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="glass-card"><CardContent className="p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Ban className="w-4 h-4 text-primary" /></div><div><p className="text-lg font-bold text-foreground">{blocked.length}</p><p className="text-[11px] text-muted-foreground">Bloqueados</p></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Shield className="w-4 h-4 text-primary" /></div><div><p className="text-lg font-bold text-foreground">{autoBlock ? "Ativo" : "Inativo"}</p><p className="text-[11px] text-muted-foreground">Auto-bloqueio</p></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div><div><p className="text-lg font-bold text-foreground">{blocked.filter((b) => b.reason.includes("SAIR")).length}</p><p className="text-[11px] text-muted-foreground">Via "SAIR"</p></div></CardContent></Card>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Bloqueio automático</p>
              <p className="text-xs text-muted-foreground">Bloquear contatos que respondem "SAIR" ou "PARAR"</p>
            </div>
            <Switch checked={autoBlock} onCheckedChange={setAutoBlock} />
          </div>
          <div className="flex gap-2">
            <Input placeholder="Adicionar número manualmente" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addManual()} />
            <Button onClick={addManual} className="gap-1.5 shrink-0"><Plus className="w-4 h-4" /> Bloquear</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar número..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-2">
            {filtered.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{b.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{b.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{b.reason}</Badge>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">{b.blockedAt}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(b.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum contato bloqueado</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
