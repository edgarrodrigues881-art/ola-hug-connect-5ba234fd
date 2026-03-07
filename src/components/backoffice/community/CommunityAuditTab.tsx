import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

const EVENT_TYPES = [
  { value: "all", label: "Todos eventos" },
  { value: "pool_enrolled", label: "Pool enrolled" },
  { value: "pool_removed", label: "Pool removed" },
  { value: "pair_created", label: "Par criado" },
  { value: "pair_closed", label: "Par fechado" },
  { value: "eligibility_changed", label: "Eligibilidade" },
];

const CommunityAuditTab = () => {
  const [eventType, setEventType] = useState("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["community-audit", eventType],
    queryFn: async () => {
      const params = new URLSearchParams({ action: "community-audit-logs" });
      if (eventType !== "all") params.set("event_type", eventType);
      const { data, error } = await supabase.functions.invoke(`admin-data?${params.toString()}`);
      if (error) throw error;
      return data?.logs || [];
    },
  });

  const levelColor = (l: string) => {
    if (l === "error") return "bg-red-500/15 text-red-400 border-red-500/30";
    if (l === "warn") return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    return "bg-teal-500/15 text-teal-400 border-teal-500/30";
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="w-[180px] h-9 bg-card border-border text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9 gap-1">
          <RefreshCw size={14} /> Atualizar
        </Button>
        <span className="text-xs text-muted-foreground">{(data || []).length} registro(s)</span>
      </div>

      <div className="border border-border rounded-lg overflow-auto max-h-[600px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-card/50">
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Nível</TableHead>
              <TableHead className="text-xs">Evento</TableHead>
              <TableHead className="text-xs">Mensagem</TableHead>
              <TableHead className="text-xs">Meta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((log: any) => (
              <TableRow key={log.id} className="text-xs">
                <TableCell className="py-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="py-2">
                  <Badge variant="outline" className={`text-[10px] ${levelColor(log.level)}`}>{log.level}</Badge>
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant="outline" className="text-[10px]">{log.event_type}</Badge>
                </TableCell>
                <TableCell className="py-2 max-w-[300px] truncate">{log.message}</TableCell>
                <TableCell className="py-2 max-w-[200px]">
                  <pre className="text-[10px] text-muted-foreground truncate">{log.meta ? JSON.stringify(log.meta).substring(0, 80) : "—"}</pre>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CommunityAuditTab;
