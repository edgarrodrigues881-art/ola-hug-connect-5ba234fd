import { useBackOfficeStore } from "@/hooks/useBackOfficeStore";
import StatsCards from "./StatsCards";
import PlansSection from "./PlansSection";
import ClientsSection from "./ClientsSection";

const BackOfficeDashboard = () => {
  const store = useBackOfficeStore();

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <StatsCards
        totalClients={store.totalClients}
        totalConnected={store.totalConnected}
        credits={store.credits}
        setCredits={store.setCredits}
      />
      <PlansSection
        plans={store.plans}
        addPlan={store.addPlan}
        updatePlan={store.updatePlan}
        deletePlan={store.deletePlan}
      />
      <ClientsSection
        clients={store.clients}
        plans={store.plans}
        addClient={store.addClient}
        deleteClient={store.deleteClient}
        updateInstance={store.updateInstance}
      />
    </div>
  );
};

export default BackOfficeDashboard;
