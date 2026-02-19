import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Megaphone, Search, Trash2, Eye, Play, Pause, RefreshCw } from "lucide-react";
import { useCampaigns, useDeleteCampaign, useStartCampaign } from "@/hooks/useCampaigns";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  scheduled: { label: "Agendada", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  running: { label: "Enviando", className: "bg-primary/15 text-primary border-primary/30" },
  completed: { label: "Concluída", className: "bg-success/15 text-success border-success/30" },
  failed: { label: "Falhou", className: "bg-destructive/15 text-destructive border-destructive/30" },
  paused: { label: "Pausada", className: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30" },
};

const CampaignList = () => {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const startCampaign = useStartCampaign();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    deleteCampaign.mutate(id, {
      onSuccess: () => toast({ title: "Campanha excluída" }),
      onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
    });
  };

  const handleStart = (id: string) => {
    startCampaign.mutate({ campaignId: id }, {
      onSuccess: (result) => {
        toast({ title: "Envio iniciado!", description: `Enviados: ${result?.sent || 0} | Falhas: ${result?.failed || 0}` });
      },
      onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanhas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe todas as suas campanhas</p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-xs bg-primary hover:bg-primary/90"
          onClick={() => navigate("/dashboard/campaigns")}
        >
          <Megaphone className="w-3.5 h-3.5" /> Nova Campanha
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar campanha..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-center">Contatos</TableHead>
                  <TableHead className="text-xs text-center">Enviadas</TableHead>
                  <TableHead className="text-xs text-center">Entregues</TableHead>
                  <TableHead className="text-xs text-center">Falhas</TableHead>
                  <TableHead className="text-xs">Criada em</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                      Nenhuma campanha encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => {
                    const cfg = statusConfig[c.status] || statusConfig.pending;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-sm font-medium text-foreground">{c.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-center text-muted-foreground">{c.total_contacts}</TableCell>
                        <TableCell className="text-sm text-center text-muted-foreground">{c.sent_count}</TableCell>
                        <TableCell className="text-sm text-center text-muted-foreground">{c.delivered_count}</TableCell>
                        <TableCell className="text-sm text-center">
                          <span className={c.failed_count > 0 ? "text-destructive" : "text-muted-foreground"}>
                            {c.failed_count}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(c.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(c.status === "pending" || c.status === "scheduled") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-success hover:text-success"
                                onClick={() => handleStart(c.id)}
                                title="Iniciar envio"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(c.id)}
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignList;
