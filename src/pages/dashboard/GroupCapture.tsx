import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { UsersRound, Download, Search, Filter, Link2 } from "lucide-react";

interface CapturedGroup {
  id: string;
  name: string;
  link: string;
  participants: number;
  capturedAt: string;
}

const GroupCapture = () => {
  const { toast } = useToast();
  const [groupLink, setGroupLink] = useState("");
  const [dddFilter, setDddFilter] = useState("all");
  const [groups, setGroups] = useState<CapturedGroup[]>([
    { id: "1", name: "Grupo Vendas 2026", link: "https://chat.whatsapp.com/abc123", participants: 187, capturedAt: "2026-02-12" },
    { id: "2", name: "Leads Orgânicos", link: "https://chat.whatsapp.com/def456", participants: 342, capturedAt: "2026-02-10" },
  ]);

  const capture = () => {
    if (!groupLink.trim()) return;
    const newGroup: CapturedGroup = {
      id: crypto.randomUUID(),
      name: "Grupo capturado",
      link: groupLink,
      participants: Math.floor(Math.random() * 200) + 50,
      capturedAt: new Date().toISOString().split("T")[0],
    };
    setGroups((prev) => [newGroup, ...prev]);
    setGroupLink("");
    toast({ title: "Grupo capturado", description: `${newGroup.participants} participantes extraídos.` });
  };

  const exportGroup = (group: CapturedGroup) => {
    const fakeNumbers = Array.from({ length: group.participants }, (_, i) => `+5511${900000000 + i}`);
    const csv = fakeNumbers.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `grupo_${group.name.replace(/\s/g, "_")}.csv`;
    a.click();
    toast({ title: "Lista exportada", description: `${group.participants} números exportados.` });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Capturador de Grupo</h1>
        <p className="text-sm text-muted-foreground">Extraia participantes de grupos do WhatsApp</p>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Capturar Novo Grupo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Cole o link do grupo (https://chat.whatsapp.com/...)" value={groupLink} onChange={(e) => setGroupLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && capture()} className="flex-1" />
            <Select value={dddFilter} onValueChange={setDddFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="DDD" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos DDDs</SelectItem>
                <SelectItem value="11">DDD 11</SelectItem>
                <SelectItem value="21">DDD 21</SelectItem>
                <SelectItem value="31">DDD 31</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={capture} className="gap-1.5 shrink-0"><UsersRound className="w-4 h-4" /> Capturar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Grupos Capturados</h2>
        {groups.map((g) => (
          <Card key={g.id} className="glass-card card-glow">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><UsersRound className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{g.name}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> {g.link.substring(0, 35)}...</span>
                    <span>{g.capturedAt}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">{g.participants} contatos</Badge>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => exportGroup(g)}><Download className="w-3.5 h-3.5" /> Exportar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GroupCapture;
