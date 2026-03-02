import { Users, Wifi } from "lucide-react";

interface Props {
  totalClients: number;
  totalConnected: number;
}

const Card = ({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3">
    <div className="p-2 rounded-md bg-primary/15 text-primary">
      <Icon size={20} />
    </div>
    <div className="flex-1">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  </div>
);

const StatsCards = ({ totalClients, totalConnected }: Props) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <Card icon={Users} label="Clientes ativos">
      <p className="text-xl font-bold text-foreground">{totalClients}</p>
    </Card>
    <Card icon={Wifi} label="Instâncias conectadas">
      <p className="text-xl font-bold text-foreground">{totalConnected}</p>
    </Card>
  </div>
);

export default StatsCards;
