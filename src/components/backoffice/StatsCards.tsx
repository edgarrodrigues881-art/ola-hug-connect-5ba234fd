import { Users, Wifi } from "lucide-react";

interface Props {
  totalClients: number;
  totalConnected: number;
}

const Card = ({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) => (
  <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5 flex items-start gap-4">
    <div className="p-2.5 rounded-lg bg-purple-600/20 text-purple-400">
      <Icon size={22} />
    </div>
    <div className="flex-1">
      <p className="text-xs text-zinc-400 uppercase tracking-wide">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  </div>
);

const StatsCards = ({ totalClients, totalConnected }: Props) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <Card icon={Users} label="Clientes ativos">
      <p className="text-2xl font-bold">{totalClients}</p>
    </Card>
    <Card icon={Wifi} label="Instâncias conectadas">
      <p className="text-2xl font-bold">{totalConnected}</p>
    </Card>
  </div>
);

export default StatsCards;
