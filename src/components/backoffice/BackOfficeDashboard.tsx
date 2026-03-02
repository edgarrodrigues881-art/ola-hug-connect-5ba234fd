import { useState, useMemo } from "react";
import { useAdminDashboard, type AdminUser } from "@/hooks/useAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Users, ScrollText, Loader2, Bell, Copy, ChevronRight, Check, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AdminOverview from "./AdminOverview";
import AdminClientsTable from "./AdminClientsTable";
import AdminClientDetail from "./AdminClientDetail";
import AdminLogs from "./AdminLogs";
import CostsTab from "./CostsTab";

const SUPORTE_NUMERO = "(11) 99999-9999";

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

const PENDENCIA_CATEGORIES = [
  { label: "Vencendo em 3 dias", filter: (d: number) => d >= 1 && d <= 3, color: "bg-yellow-500/10 border-yellow-600/30" },
  { label: "Vence hoje", filter: (d: number) => d === 0, color: "bg-destructive/10 border-destructive/30" },
  { label: "Vencido 1 dia", filter: (d: number) => d === -1, color: "bg-destructive/10 border-destructive/30" },
  { label: "Vencido 2-7 dias", filter: (d: number) => d <= -2 && d >= -7, color: "bg-destructive/15 border-destructive/30" },
  { label: "Vencido 8-30 dias", filter: (d: number) => d <= -8 && d >= -30, color: "bg-muted border-border" },
  { label: "Vencido +30 dias", filter: (d: number) => d < -30, color: "bg-muted border-border" },
];

const PendenciasTab = ({ users, onSelectClient }: { users: AdminUser[]; onSelectClient: (u: AdminUser) => void }) => {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const buildMessage = (u: AdminUser, days: number) => {
    const nome = u.full_name || u.email;
    const plano = u.plan_name || "Sem plano";
    const venc = u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString("pt-BR") : "—";
    if (days > 0) return `Olá ${nome}! Seu plano ${plano} vence em ${days} dia(s) (${venc}). Renove para não perder acesso. Suporte: ${SUPORTE_NUMERO}`;
    if (days === 0) return `${nome}, seu plano ${plano} vence HOJE (${venc})! Renove agora → ${SUPORTE_NUMERO}`;
    return `${nome}, seu plano ${plano} está vencido desde ${venc} (${Math.abs(days)} dias). Suas instâncias estão bloqueadas. Suporte: ${SUPORTE_NUMERO}`;
  };

  const copyMsg = (u: AdminUser, days: number) => {
    navigator.clipboard.writeText(buildMessage(u, days));
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Mensagem copiada!" });
  };

  return (
    <div className="space-y-5">
      {PENDENCIA_CATEGORIES.map(cat => {
        const items = users.filter(u => {
          const d = getDaysLeft(u.plan_expires_at);
          return d !== null && cat.filter(d);
        });
        if (items.length === 0) return null;
        return (
          <div key={cat.label} className={`border rounded-lg p-4 ${cat.color}`}>
            <h3 className="text-sm font-semibold text-foreground mb-3">{cat.label} ({items.length})</h3>
            <div className="space-y-1.5">
              {items.map(u => {
                const days = getDaysLeft(u.plan_expires_at)!;
                return (
                  <div key={u.id} className="flex items-center gap-3 bg-card/50 rounded-md px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground font-medium truncate">{u.full_name || u.email}</p>
                      <p className="text-[10px] text-muted-foreground">{u.phone || "—"} · {u.plan_name || "Sem plano"} · {u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString("pt-BR") : "—"}</p>
                    </div>
                    <span className={`text-[11px] font-medium ${days <= 0 ? "text-destructive" : "text-yellow-500"}`}>
                      {days <= 0 ? `${Math.abs(days)}d vencido` : `${days}d`}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => copyMsg(u, days)} className="text-muted-foreground hover:text-foreground h-7 px-2 text-[10px]">
                      {copiedId === u.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onSelectClient(u)} className="text-primary hover:text-primary/80 h-7 px-2 text-[10px]">
                      Gerenciar <ChevronRight size={10} className="ml-0.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {PENDENCIA_CATEGORIES.every(cat => users.filter(u => { const d = getDaysLeft(u.plan_expires_at); return d !== null && cat.filter(d); }).length === 0) && (
        <p className="text-center text-muted-foreground py-8">Nenhuma pendência no momento</p>
      )}
    </div>
  );
};

const BackOfficeDashboard = () => {
  const { data, isLoading, error, refetch } = useAdminDashboard();
  const [selectedClient, setSelectedClient] = useState<AdminUser | null>(null);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (error) return <div className="text-center py-20 text-destructive">Erro: {(error as Error).message}</div>;

  if (selectedClient) return <AdminClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} />;

  const pendingCount = (data?.users || []).filter(u => {
    const d = getDaysLeft(u.plan_expires_at);
    return d !== null && d <= 3;
  }).length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <LayoutDashboard size={16} /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="clients" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Users size={16} /> Clientes
          </TabsTrigger>
          <TabsTrigger value="pendencias" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Bell size={16} /> Pendências
            {pendingCount > 0 && <span className="ml-1 text-[10px] font-bold text-destructive">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <ScrollText size={16} /> Auditoria
          </TabsTrigger>
          <TabsTrigger value="costs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Wallet size={16} /> Custos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{data ? <AdminOverview data={data} /> : null}</TabsContent>
        <TabsContent value="clients"><AdminClientsTable users={data?.users || []} cycles={data?.cycles || []} adminLogs={data?.admin_logs || []} onSelectClient={setSelectedClient} /></TabsContent>
        <TabsContent value="pendencias"><PendenciasTab users={data?.users || []} onSelectClient={setSelectedClient} /></TabsContent>
        <TabsContent value="logs"><AdminLogs /></TabsContent>
        <TabsContent value="costs"><CostsTab costs={((data as any)?.costs || []) as any[]} onRefresh={() => refetch()} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default BackOfficeDashboard;
