import { Badge } from "@/components/ui/badge";
import { ScrollText } from "lucide-react";

interface Props {
  detail: any;
}

const actionLabels: Record<string, string> = {
  "update-client": "Atualização de dados",
  "update-subscription": "Alteração de plano",
  "reset-password": "Reset de senha",
  "force-logout": "Logout forçado",
  "toggle-status": "Alteração de status",
  "set-role": "Alteração de role",
  "create-device": "Criação de instância",
  "delete-device": "Remoção de instância",
  "add-payment": "Pagamento registrado",
  "delete-payment": "Pagamento removido",
  "send-message": "Mensagem enviada",
};

const actionColors: Record<string, string> = {
  "update-client": "bg-teal-600/50 text-teal-200",
  "update-subscription": "bg-purple-600/50 text-purple-200",
  "reset-password": "bg-yellow-600/50 text-yellow-200",
  "force-logout": "bg-red-600/50 text-red-200",
  "toggle-status": "bg-orange-600/50 text-orange-200",
  "set-role": "bg-pink-600/50 text-pink-200",
  "create-device": "bg-green-600/50 text-green-200",
  "delete-device": "bg-red-600/50 text-red-200",
  "add-payment": "bg-green-600/50 text-green-200",
  "delete-payment": "bg-red-600/50 text-red-200",
  "send-message": "bg-cyan-600/50 text-cyan-200",
};

const ClientLogsTab = ({ detail }: Props) => {
  const logs = detail?.admin_logs || [];

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <ScrollText size={20} className="text-purple-400" />
        <h3 className="text-lg font-semibold text-zinc-200">Histórico de Ações</h3>
      </div>

      {logs.length === 0 ? (
        <p className="text-zinc-500 text-sm text-center py-8">Nenhuma ação registrada para este cliente</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => (
            <div key={log.id} className="flex items-center gap-3 bg-zinc-900 rounded-lg px-4 py-3">
              <Badge className={`text-[10px] px-2 shrink-0 ${actionColors[log.action] || "bg-zinc-600 text-zinc-200"}`}>
                {actionLabels[log.action] || log.action}
              </Badge>
              <span className="text-sm text-zinc-300 flex-1">{log.details}</span>
              <span className="text-xs text-zinc-500 shrink-0">
                {new Date(log.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientLogsTab;
