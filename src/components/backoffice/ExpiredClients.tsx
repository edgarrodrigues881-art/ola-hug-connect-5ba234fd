import { useMemo } from "react";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Client, Plan } from "@/hooks/useBackOfficeStore";

interface Props {
  clients: Client[];
  plans: Plan[];
}

const ExpiredClients = ({ clients, plans }: Props) => {
  const expired = useMemo(() => {
    const now = new Date();
    return clients.filter((c) => new Date(c.expiresAt) < now);
  }, [clients]);

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "—";

  const daysExpired = (expiresAt: string) => {
    const diff = Date.now() - new Date(expiresAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const sendWhatsApp = (client: Client) => {
    const phone = client.whatsapp.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${client.name}! Notamos que seu plano *${planName(client.planId)}* expirou. Gostaria de renovar? Estamos à disposição para ajudar! 🚀`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  if (expired.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={18} className="text-yellow-400" />
        <h2 className="text-lg font-semibold text-zinc-200">
          Planos Expirados ({expired.length})
        </h2>
      </div>

      <div className="space-y-2">
        {expired.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-100 truncate">{c.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-400">{c.whatsapp}</span>
                <span className="text-xs text-zinc-500">•</span>
                <span className="text-xs text-zinc-500">{planName(c.planId)}</span>
              </div>
            </div>
            <Badge className="bg-red-600/80 text-white text-[10px] px-2 shrink-0">
              Expirado há {daysExpired(c.expiresAt)}d
            </Badge>
            <Button
              size="sm"
              onClick={() => sendWhatsApp(c)}
              className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs shrink-0"
            >
              <MessageCircle size={14} className="mr-1" /> Mensagem
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExpiredClients;
