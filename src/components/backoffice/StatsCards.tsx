import { Users, Wifi, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  totalClients: number;
  totalConnected: number;
  credits: number;
  setCredits: (v: number) => void;
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

const StatsCards = ({ totalClients, totalConnected, credits, setCredits }: Props) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <Card icon={Users} label="Clientes ativos">
      <p className="text-2xl font-bold">{totalClients}</p>
    </Card>
    <Card icon={Wifi} label="Instâncias conectadas">
      <p className="text-2xl font-bold">{totalConnected}</p>
    </Card>
    <Card icon={Zap} label="Créditos de disparo">
      <Input
        type="number"
        value={credits}
        onChange={(e) => setCredits(Number(e.target.value))}
        className="w-32 h-9 bg-zinc-900 border-zinc-700 text-zinc-100 text-lg font-bold"
      />
    </Card>
  </div>
);

export default StatsCards;
