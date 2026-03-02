import { useState } from "react";
import { ArrowLeft, User, CreditCard, Server, ScrollText, Loader2, DollarSign, MessageSquare, LayoutDashboard, Key } from "lucide-react";
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
import ClientTokensTab from "./tabs/ClientTokensTab";

interface Props {
  client: AdminUser;
  onBack: () => void;
}

const planColors: Record<string, string> = { Start: "text-zinc-400", Pro: "text-blue-400", Scale: "text-purple-400", Elite: "text-amber-500" };
const statusLabels: Record<string, string> = { active: "Ativo", suspended: "Suspenso", cancelled: "Cancelado" };
const statusColors: Record<string, string> = { active: "text-green-500", suspended: "text-yellow-500", cancelled: "text-destructive" };

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
        <Button variant="outline" size="sm" onClick={onBack} className="border-border text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} className="mr-1" /> Voltar
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground">{client.full_name || client.email}</h2>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
            <span>{client.email}</span>
            <span>·</span>
            <span>Status: <span className={`font-medium ${statusColors[client.status] || ""}`}>{statusLabels[client.status] || client.status}</span></span>
            {client.plan_name && (
              <>
                <span>·</span>
                <span>Plano: <span className={`font-medium ${planColors[client.plan_name] || ""}`}>{client.plan_name}</span></span>
              </>
            )}
            {daysLeft !== null && (
              <>
                <span>·</span>
                <span>Vence em: <span className={`font-medium ${isExpired ? "text-destructive" : isExpiring ? "text-yellow-500" : ""}`}>
                  {client.plan_expires_at ? new Date(client.plan_expires_at).toLocaleDateString("pt-BR") : "—"}
                  {isExpired ? " (vencido)" : ` (${daysLeft}d)`}
                </span></span>
              </>
            )}
            <span>·</span>
            <span>Cadastro: {new Date(client.created_at).toLocaleDateString("pt-BR")}</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-card border border-border flex-wrap">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs">
              <LayoutDashboard size={14} /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs">
              <User size={14} /> Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="plan" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs">
              <CreditCard size={14} /> Plano & Assinatura
            </TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs">
              <Server size={14} /> Instâncias
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs">
              <MessageSquare size={14} /> Mensagens
            </TabsTrigger>
            <TabsTrigger value="payments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs">
              <DollarSign size={14} /> Financeiro
            </TabsTrigger>
            <TabsTrigger value="tokens" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs">
              <Key size={14} /> Tokens API
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs">
              <ScrollText size={14} /> Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><ClientOverviewTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="profile"><ClientProfileTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="plan"><ClientPlanTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="devices"><ClientDevicesTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="tokens"><ClientTokensTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="messages"><ClientMessagesTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="payments"><ClientPaymentsTab client={client} detail={detail} /></TabsContent>
          <TabsContent value="logs"><ClientLogsTab detail={detail} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminClientDetail;
