import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Shuffle, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const CommunityPairsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [actionDialog, setActionDialog] = useState<{ pair_id: string; action: "closed" | "failed" } | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["community-pairs"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-data?action=community-pairs-list");
      if (error) throw error;
      return data?.pairs || [];
    },
  });

  const updatePair = useMutation({
    mutationFn: async ({ pair_id, new_status, reason }: any) => {
      const { error } = await supabase.functions.invoke("admin-data?action=community-pair-update", {
        body: { pair_id, new_status, reason },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-pairs"] });
      setActionDialog(null);
      setReason("");
      toast({ title: "Par atualizado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const generatePairs = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-data?action=community-generate-pairs", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["community-pairs"] });
      toast({ title: `${data?.pairs_created || 0} par(es) gerado(s)`, description: data?.message || "" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const statusColor = (s: string) => {
    if (s === "active") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (s === "closed") return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
    return "bg-red-500/15 text-red-400 border-red-500/30";
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="default" size="sm" onClick={() => generatePairs.mutate()} disabled={generatePairs.isPending} className="gap-1">
          {generatePairs.isPending ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
          Gerar Pares
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
          <RefreshCw size={14} /> Atualizar
        </Button>
        <span className="text-xs text-muted-foreground">{(data || []).length} par(es)</span>
      </div>

      <div className="border border-border rounded-lg overflow-auto max-h-[600px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-card/50">
              <TableHead className="text-xs">Instância A</TableHead>
              <TableHead className="text-xs">Instância B</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Criado</TableHead>
              <TableHead className="text-xs">Fechado</TableHead>
              <TableHead className="text-xs">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((p: any) => (
              <TableRow key={p.id} className="text-xs">
                <TableCell className="py-2">
                  <div className="font-medium">{p.instance_a_name}</div>
                  <div className="text-[10px] text-muted-foreground">{p.instance_a_number} · {p.instance_a_owner}</div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="font-medium">{p.instance_b_name}</div>
                  <div className="text-[10px] text-muted-foreground">{p.instance_b_number} · {p.instance_b_owner}</div>
                </TableCell>
                <TableCell className="py-2">
                  <Badge variant="outline" className={`text-[10px] ${statusColor(p.status)}`}>{p.status}</Badge>
                </TableCell>
                <TableCell className="py-2">{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="py-2">{p.closed_at ? new Date(p.closed_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell className="py-2">
                  {p.status === "active" && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setActionDialog({ pair_id: p.id, action: "closed" })}>
                        <XCircle size={12} className="mr-1" /> Fechar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-destructive" onClick={() => setActionDialog({ pair_id: p.id, action: "failed" })}>
                        <AlertTriangle size={12} className="mr-1" /> Falhou
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{actionDialog?.action === "failed" ? "Marcar como falhou" : "Fechar par"}</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Motivo (opcional)" value={reason} onChange={e => setReason(e.target.value)} className="bg-background border-border" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancelar</Button>
            <Button variant={actionDialog?.action === "failed" ? "destructive" : "default"} onClick={() => {
              if (actionDialog) updatePair.mutate({ pair_id: actionDialog.pair_id, new_status: actionDialog.action, reason });
            }} disabled={updatePair.isPending}>
              {updatePair.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommunityPairsTab;
