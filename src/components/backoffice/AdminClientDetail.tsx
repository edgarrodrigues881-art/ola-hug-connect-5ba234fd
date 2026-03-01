import { useState } from "react";
import { ArrowLeft, User, Shield, CreditCard, Server, ScrollText, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminUser } from "@/hooks/useAdmin";
import { useClientDetail } from "@/hooks/useAdmin";
import ClientProfileTab from "./tabs/ClientProfileTab";
import ClientSecurityTab from "./tabs/ClientSecurityTab";
import ClientPlanTab from "./tabs/ClientPlanTab";
import ClientDevicesTab from "./tabs/ClientDevicesTab";
import ClientLogsTab from "./tabs/ClientLogsTab";
import { Badge } from "@/components/ui/badge";

interface Props {
  client: AdminUser;
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  active: "bg-green-600",
  suspended: "bg-yellow-600",
  cancelled: "bg-red-600",
};

const AdminClientDetail = ({ client, onBack }: Props) => {
  const { data: detail, isLoading } = useClientDetail(client.id);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-400 hover:text-zinc-100">
          <ArrowLeft size={18} className="mr-1" /> Voltar
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-zinc-100">{client.full_name || client.email}</h2>
            <Badge className={`${statusColors[client.status] || "bg-zinc-600"} text-white text-xs`}>
              {client.status === "active" ? "Ativo" : client.status === "suspended" ? "Suspenso" : "Cancelado"}
            </Badge>
            {client.risk_flag && (
              <Badge className="bg-red-600/80 text-white text-xs">
                <AlertTriangle size={12} className="mr-1" /> Alto Risco
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-400">{client.email} • Cadastrado em {new Date(client.created_at).toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      ) : (
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="bg-zinc-800 border border-zinc-700 flex-wrap">
            <TabsTrigger value="profile" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 text-xs">
              <User size={14} /> Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 text-xs">
              <Shield size={14} /> Segurança
            </TabsTrigger>
            <TabsTrigger value="plan" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 text-xs">
              <CreditCard size={14} /> Plano
            </TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 text-xs">
              <Server size={14} /> Instâncias
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-1.5 text-xs">
              <ScrollText size={14} /> Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ClientProfileTab client={client} detail={detail} />
          </TabsContent>
          <TabsContent value="security">
            <ClientSecurityTab client={client} />
          </TabsContent>
          <TabsContent value="plan">
            <ClientPlanTab client={client} detail={detail} />
          </TabsContent>
          <TabsContent value="devices">
            <ClientDevicesTab client={client} detail={detail} />
          </TabsContent>
          <TabsContent value="logs">
            <ClientLogsTab detail={detail} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminClientDetail;
