import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Megaphone, Search, Trash2, Plus,
} from "lucide-react";
import { useCampaigns, useDeleteCampaign, useCreateCampaign } from "@/hooks/useCampaigns";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
  scheduled: { label: "Agendada", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  running: { label: "Enviando", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  processing: { label: "Enviando", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  paused: { label: "Pausada", color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
  completed: { label: "Concluída", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  canceled: { label: "Cancelada", color: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30" },
  failed: { label: "Falhou", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

const CampaignList = () => {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clearAllOpen, setClearAllOpen] = useState(false);

  const filtered = useMemo(() => {
    return campaigns.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [campaigns, search, statusFilter]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCampaign.mutate(id, {
      onSuccess: () => toast({ title: "Campanha excluída" }),
      onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
    });
  };

  const handleClearAll = async () => {
    try {
      for (const c of campaigns) {
        await supabase.from("campaign_contacts").delete().eq("campaign_id", c.id);
        await supabase.from("campaigns").delete().eq("id", c.id);
      }
      setClearAllOpen(false);
      toast({ title: "Todas as campanhas foram excluídas" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const getProgress = (c: any) => {
    const total = c.total_contacts || 0;
    if (total === 0) return 0;
    return Math.round(((c.sent_count || 0) + (c.failed_count || 0)) / total * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanhas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie e acompanhe seus envios</p>
        </div>
        <div className="flex items-center gap-2">
          {campaigns.length > 0 && (
            <Button
              variant="outline"
              size="lg"
              className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setClearAllOpen(true)}
            >
              <Trash2 className="w-4 h-4" /> Limpar todas
            </Button>
          )}
          <Button
            size="lg"
            className="gap-2 bg-primary hover:bg-primary/90 px-6"
            onClick={() => navigate("/dashboard/campaigns")}
          >
            <Plus className="w-4 h-4" /> Nova Campanha
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-10">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="running">Enviando</SelectItem>
            <SelectItem value="paused">Pausada</SelectItem>
            <SelectItem value="completed">Concluída</SelectItem>
            <SelectItem value="canceled">Cancelada</SelectItem>
            <SelectItem value="failed">Falhou</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Nome</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Progresso</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider text-center">Total</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider text-center">Enviadas</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider text-center">Falhas</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider hidden lg:table-cell">Criada em</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-12">
                    <Megaphone className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    Nenhuma campanha encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => {
                  const cfg = statusConfig[c.status] || statusConfig.pending;
                  const progress = getProgress(c);
                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/30 border-border/20"
                      onClick={() => navigate(`/dashboard/campaign/${c.id}`)}
                    >
                      <TableCell className="text-sm font-medium text-foreground">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-semibold ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={progress} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground tabular-nums">{c.total_contacts}</TableCell>
                      <TableCell className="text-sm text-center text-muted-foreground tabular-nums">{c.sent_count}</TableCell>
                      <TableCell className="text-sm text-center tabular-nums">
                        <span className={c.failed_count > 0 ? "text-destructive" : "text-muted-foreground"}>
                          {c.failed_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                        {format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDelete(c.id, e)}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Clear All Confirmation */}
      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todas as campanhas?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente todas as {campaigns.length} campanhas e seus contatos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll} className="bg-destructive hover:bg-destructive/90">
              Excluir todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CampaignList;
