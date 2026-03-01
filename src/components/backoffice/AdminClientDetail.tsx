import { useState } from "react";
import { ArrowLeft, User, CreditCard, Server, ScrollText, AlertTriangle, Loader2, DollarSign, Clock, MessageSquare, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminUser } from "@/hooks/useAdmin";
import { useClientDetail } from "@/hooks/useAdmin";
import ClientOverviewTab from "./tabs/ClientOverviewTab";
import ClientProfileTab from "./tabs/ClientProfileTab";
import ClientPlanTab from "./tabs/ClientPlanTab";
import ClientDevicesTab from "./tabs/ClientDevicesTab";
import ClientMessagesTab from "./tabs/ClientMessagesTab";
import ClientLogsTab from "./tabs/ClientLogsTab";
import ClientPaymentsTab from "./tabs/ClientPaymentsTab";
import { Badge } from "@/components/ui/badge";

interface Props {
  client: AdminUser;
  onBack: () => void;
}

const statusColors: Record<string, string> = { active: "bg-green-600", suspended: "bg-yellow-600", cancelled: "bg-red-600" };
const planBadgeColors: Record<string, string> = { Start: "bg-zinc-600", Pro: "bg-blue-600", Scale: "bg-purple-600", Elite: "bg-amber-600" };

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

const AdminClientDetail = ({ client, onBack }: Props) => {
  const { data: detail, isLoading } = useClientDetail(client.id);
  const daysLeft = getDaysLeft(client.plan_expires_at);
  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isExpiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 3;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-400 hover:text-zinc-100">
          <ArrowLeft size={18} className="mr-1" /> Voltar
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-zinc-100">{client.full_name || client.email}</h2>
            <Badge className={`${statusColors[client.status] || "bg-zinc-600"} text-white text-xs`}>
              {client.status === "active" ? "Ativo" : client.status === "suspended" ? "Suspenso" : "Cancelado"}
            </Badge>
            {client.plan_name && <Badge className={`${planBadgeColors[client.plan_name] || "bg-zinc-600"} text-white text-xs`}>{client.plan_name}</Badge>}
            {client.risk_flag && <Badge className="bg-red-600/80 text-white text-xs"><AlertTriangle size={12} className="mr-1" /> Risco</Badge>}
            {isExpired && <Badge className="bg-red-700 text-white text-xs">Vencido</Badge>}
            {isExpiring && <Badge className="bg-yellow-600 text-white text-xs"><Clock size={12} className="mr-1" /> {daysLeft}d</Badge>}
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            {client.email} • Cadastro: {new Date(client.created_at).toLocaleDateString("pt-BR")}
            {daysLeft !== null && !isExpired && <span className="ml-2 text-zinc-500">• {daysLeft} dias restantes</span>}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-zinc-800 border border-zinc-700 flex-wrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 text-xs">
              <LayoutDashboard size={14} /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 text-xs">
              <User size={14} /> Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="plan" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 text-xs">
              <CreditCard size={14} /> Plano & Assinatura
            </TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 text-xs">
              <Server size={14} /> Instâncias
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 text-xs">
              <MessageSquare size={14} /> Mensagens
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 text-xs">
              <DollarSign size={14} /> Financeiro
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 text-xs">
              <ScrollText size={14} /> Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><ClientOverviewTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="profile"><ClientProfileTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="plan"><ClientPlanTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="devices"><ClientDevicesTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="messages"><ClientMessagesTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="payments"><ClientPaymentsTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="logs"><ClientLogsTab detail={detail} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminClientDetail;
