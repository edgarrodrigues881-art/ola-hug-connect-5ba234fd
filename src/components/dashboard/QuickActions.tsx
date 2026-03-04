import { useNavigate } from "react-router-dom";
import { Plus, UserPlus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { label: "Nova Campanha", icon: Plus, path: "/dashboard/campaigns", color: "text-emerald-400" },
  { label: "Adicionar Contato", icon: UserPlus, path: "/dashboard/contacts", color: "text-violet-400" },
  { label: "Conectar Chip", icon: Smartphone, path: "/dashboard/devices", color: "text-blue-400" },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button
          key={a.label}
          variant="outline"
          size="sm"
          onClick={() => navigate(a.path)}
          className="border-border/50 bg-card/50 hover:bg-muted/50 gap-2"
        >
          <a.icon className={`w-4 h-4 ${a.color}`} />
          {a.label}
        </Button>
      ))}
    </div>
  );
}
