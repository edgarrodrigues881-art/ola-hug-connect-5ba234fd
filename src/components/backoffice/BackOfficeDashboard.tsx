import { useState } from "react";
import { useAdminDashboard, type AdminUser } from "@/hooks/useAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Users, ScrollText, Loader2 } from "lucide-react";
import AdminOverview from "./AdminOverview";
import AdminClientsTable from "./AdminClientsTable";
import AdminClientDetail from "./AdminClientDetail";
import AdminLogs from "./AdminLogs";

const BackOfficeDashboard = () => {
  const { data, isLoading, error } = useAdminDashboard();
  const [selectedClient, setSelectedClient] = useState<AdminUser | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-400">
        Erro ao carregar dados: {(error as Error).message}
      </div>
    );
  }

  if (selectedClient) {
    return (
      <AdminClientDetail
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
      />
    );
  }

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
          <TabsTrigger value="logs" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white gap-2">
            <ScrollText size={16} /> Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AdminOverview data={data!} />
        </TabsContent>

        <TabsContent value="clients">
          <AdminClientsTable
            users={data?.users || []}
            onSelectClient={setSelectedClient}
          />
        </TabsContent>

        <TabsContent value="logs">
          <AdminLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BackOfficeDashboard;
