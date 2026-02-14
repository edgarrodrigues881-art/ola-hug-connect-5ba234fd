import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Filter, Trash2, Download, Upload, Hash, Phone, Copy } from "lucide-react";

const NumberFilter = () => {
  const { toast } = useToast();
  const [numbers, setNumbers] = useState("");
  const [dddFilter, setDddFilter] = useState("all");
  const [results, setResults] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, fixed: 0, duplicates: 0, filtered: 0, result: 0 });

  const processNumbers = () => {
    const raw = numbers.split(/[\n,;]+/).map((n) => n.trim().replace(/\D/g, "")).filter(Boolean);
    const total = raw.length;

    // Remove fixed (landline) numbers - Brazilian mobile numbers have 9 digits after DDD
    const mobile = raw.filter((n) => {
      const digits = n.replace(/^55/, "");
      return digits.length >= 10 && digits.charAt(2) === "9";
    });
    const fixed = total - mobile.length;

    // Format
    const formatted = mobile.map((n) => {
      if (!n.startsWith("55") && n.length <= 11) return "55" + n;
      return n;
    });

    // Remove duplicates
    const unique = [...new Set(formatted)];
    const duplicates = formatted.length - unique.length;

    // Filter by DDD
    const final = dddFilter === "all" ? unique : unique.filter((n) => n.substring(2, 4) === dddFilter);
    const filteredOut = unique.length - final.length;

    setResults(final);
    setStats({ total, fixed, duplicates, filtered: filteredOut, result: final.length });
    toast({ title: "Filtro aplicado", description: `${final.length} números válidos encontrados.` });
  };

  const exportResults = () => {
    const csv = results.map((n) => "+" + n).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "numeros_filtrados.csv";
    a.click();
    toast({ title: "Exportado com sucesso" });
  };

  const ddds = ["11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "22", "24", "27", "28", "31", "32", "33", "34", "35", "37", "38", "41", "42", "43", "44", "45", "46", "47", "48", "49", "51", "53", "54", "55", "61", "62", "63", "64", "65", "66", "67", "68", "69", "71", "73", "74", "75", "77", "79", "81", "82", "83", "84", "85", "86", "87", "88", "89", "91", "92", "93", "94", "95", "96", "97", "98", "99"];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Filtro Numérico</h1>
        <p className="text-sm text-muted-foreground">Filtre, formate e limpe sua lista de números</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Entrada de Números</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea placeholder="Cole seus números aqui (um por linha ou separados por vírgula)..." rows={10} value={numbers} onChange={(e) => setNumbers(e.target.value)} className="font-mono text-xs" />
            <div className="flex gap-2">
              <Select value={dddFilter} onValueChange={setDddFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Filtrar DDD" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos DDDs</SelectItem>
                  {ddds.map((d) => <SelectItem key={d} value={d}>DDD {d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={processNumbers} className="gap-1.5 flex-1"><Filter className="w-4 h-4" /> Filtrar</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {stats.total > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total inseridos", value: stats.total, icon: Hash },
                { label: "Fixos removidos", value: stats.fixed, icon: Phone },
                { label: "Duplicados", value: stats.duplicates, icon: Copy },
                { label: "Resultado final", value: stats.result, icon: Filter },
              ].map((s) => (
                <Card key={s.label} className="glass-card">
                  <CardContent className="p-3 flex items-center gap-2">
                    <s.icon className="w-4 h-4 text-primary" />
                    <div><p className="text-base font-bold text-foreground">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Resultado ({results.length})</CardTitle>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={exportResults}><Download className="w-3.5 h-3.5" /> Exportar</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-1 font-mono text-xs">
                  {results.slice(0, 50).map((n, i) => (
                    <div key={i} className="p-1.5 rounded bg-muted/30 text-muted-foreground">+{n}</div>
                  ))}
                  {results.length > 50 && <p className="text-center text-muted-foreground text-[11px] py-2">... e mais {results.length - 50} números</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default NumberFilter;
