import { useState, useMemo } from "react";
import { useAdminDashboard, type AdminUser } from "@/hooks/useAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Users, ScrollText, Loader2, Bell, Copy, ChevronRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AdminOverview from "./AdminOverview";
import AdminClientsTable from "./AdminClientsTable";
import AdminClientDetail from "./AdminClientDetail";
import AdminLogs from "./AdminLogs";

const SUPORTE_NUMERO = "(11) 99999-9999";

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

// Pendências categories
const PENDENCIA_CATEGORIES = [
  { label: "⚠️ Vencendo em 3 dias", filter: (d: number) => d === 3 || d === 2 || d === 1, color: "bg-yellow-900/30 border-yellow-700/50" },
  { label: "🔴 Vence hoje", filter: (d: number) => d === 0, color: "bg-red-900/30 border-red-700/50" },
  { label: "❌ Vencido 1 dia", filter: (d: number) => d === -1, color: "bg-red-900/30 border-red-700/50" },
  { label: "⚠️ Vencido 7 dias", filter: (d: number) => d <= -2 && d >= -7, color: "bg-red-900/40 border-red-700/50" },
  { label: "🗑️ Vencido 30 dias", filter: (d: number) => d <= -8 && d >= -30, color: "bg-zinc-800 border-red-800/50" },
  { label: "💀 Vencido +30 dias", filter: (d: number) => d < -30, color: "bg-zinc-800 border-zinc-700" },
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
    <div className="space-y-6">
      {PENDENCIA_CATEGORIES.map(cat => {
        const items = users.filter(u => {
          const d = getDaysLeft(u.plan_expires_at);
          return d !== null && cat.filter(d);
        });
        if (items.length === 0) return null;
        return (
          <div key={cat.label} className={`border rounded-xl p-4 ${cat.color}`}>
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">{cat.label} ({items.length})</h3>
            <div className="space-y-2">
              {items.map(u => {
                const days = getDaysLeft(u.plan_expires_at)!;
                return (
                  <div key={u.id} className="flex items-center gap-3 bg-zinc-900/50 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-200 font-medium truncate">{u.full_name || u.email}</p>
                      <p className="text-[10px] text-zinc-500">{u.phone || "—"} • {u.plan_name || "Sem plano"} • {u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString("pt-BR") : "—"}</p>
                    </div>
                    <span className={`text-[10px] font-medium ${days <= 0 ? "text-red-400" : "text-yellow-400"}`}>
                      {days <= 0 ? `${Math.abs(days)}d vencido` : `${days}d`}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => copyMsg(u, days)} className="text-zinc-400 hover:text-zinc-200 h-7 px-2 text-[10px]">
                      {copiedId === u.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onSelectClient(u)} className="text-purple-400 hover:text-purple-300 h-7 px-2 text-[10px]">
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
        <p className="text-center text-zinc-500 py-8">Nenhuma pendência no momento ✅</p>
      )}
    </div>
  );
};

const BackOfficeDashboard = () => {
  const { data, isLoading, error } = useAdminDashboard();
  const [selectedClient, setSelectedClient] = useState<AdminUser | null>(null);

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>;
  if (error) return <div className="text-center py-20 text-red-400">Erro: {(error as Error).message}</div>;

  if (selectedClient) return <AdminClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} />;

  const pendingCount = (data?.users || []).filter(u => {
    const d = getDaysLeft(u.plan_expires_at);
    return d !== null && d <= 3;
  }).length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-2">
            <LayoutDashboard size={16} /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="clients" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-2">
            <Users size={16} /> Clientes
          </TabsTrigger>
          <TabsTrigger value="pendencias" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-2">
            <Bell size={16} /> Pendências
            {pendingCount > 0 && <Badge className="bg-red-600 text-white text-[10px] ml-1 px-1.5">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-2">
            <ScrollText size={16} /> Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><AdminOverview data={data!} /></TabsContent>
        <TabsContent value="clients"><AdminClientsTable users={data?.users || []} onSelectClient={setSelectedClient} /></TabsContent>
        <TabsContent value="pendencias"><PendenciasTab users={data?.users || []} onSelectClient={setSelectedClient} /></TabsContent>
        <TabsContent value="logs"><AdminLogs /></TabsContent>
      </Tabs>
    </div>
  );
};

export default BackOfficeDashboard;
