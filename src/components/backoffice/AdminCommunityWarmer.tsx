import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, GitMerge, Settings, ScrollText } from "lucide-react";
import CommunityPoolTab from "./community/CommunityPoolTab";
import CommunityPairsTab from "./community/CommunityPairsTab";
import CommunityRulesTab from "./community/CommunityRulesTab";
import CommunityAuditTab from "./community/CommunityAuditTab";

const AdminCommunityWarmer = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Aquecedor Comunitário</h2>
        <p className="text-sm text-muted-foreground">Governança do pool de comunidade — somente admin</p>
      </div>

      <Tabs defaultValue="pool" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="pool" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Globe size={14} /> Visão Global
          </TabsTrigger>
          <TabsTrigger value="pairs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <GitMerge size={14} /> Pares
          </TabsTrigger>
          <TabsTrigger value="rules" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Settings size={14} /> Regras
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <ScrollText size={14} /> Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pool"><CommunityPoolTab /></TabsContent>
        <TabsContent value="pairs"><CommunityPairsTab /></TabsContent>
        <TabsContent value="rules"><CommunityRulesTab /></TabsContent>
        <TabsContent value="audit"><CommunityAuditTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCommunityWarmer;
