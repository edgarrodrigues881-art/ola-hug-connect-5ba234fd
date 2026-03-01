import type { AdminUser } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, Server, Clock, AlertTriangle, KeyRound, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAction } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props { client: AdminUser; detail: any; }

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

const ClientOverviewTab = ({ client, detail }: Props) => {
  const sub = detail?.subscription;
  const devices = detail?.devices || [];
  const daysLeft = getDaysLeft(client.plan_expires_at);
  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isExpiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 3;
  const maxInst = sub?.max_instances ?? client.max_instances ?? 0;
  const { mutate, isPending } = useAdminAction();
  const { toast } = useToast();

  const resetPassword = () => {
    mutate(
      { action: "reset-password", body: { target_user_id: client.id, email: client.email } },
      { onSuccess: () => toast({ title: "Link de redefinição gerado" }), onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }) }
    );
  };
  const forceLogout = () => {
    mutate(
      { action: "force-logout", body: { target_user_id: client.id } },
      { onSuccess: () => toast({ title: "Logout forçado com sucesso" }), onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }) }
    );
  };
  const toggleStatus = (s: string) => {
    mutate(
      { action: "toggle-status", body: { target_user_id: client.id, new_status: s } },
      { onSuccess: () => toast({ title: `Status: ${s}` }), onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }) }
    );
  };

  return (
    <div className="space-y-5">
      {/* Alerts */}
      {isExpired && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-sm text-red-300">
          <AlertTriangle size={16} /> Assinatura vencida — instâncias bloqueadas para criação
        </div>
      )}
      {isExpiring && (
        <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-700/50 rounded-xl px-4 py-3 text-sm text-yellow-300">
          <Clock size={16} /> Assinatura vence em {daysLeft} dia{daysLeft !== 1 ? "s" : ""}
        </div>
      )}

      {/* Quick info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><User size={16} className="text-purple-400" /><span className="text-xs text-zinc-400 uppercase">Conta</span></div>
          <p className="text-zinc-200 font-medium">{client.full_name || "—"}</p>
          <p className="text-xs text-zinc-500 mt-1">{client.email}</p>
          <p className="text-xs text-zinc-500">{client.phone || "Sem telefone"}</p>
          <p className="text-xs text-zinc-500 mt-1">Cadastro: {new Date(client.created_at).toLocaleDateString("pt-BR")}</p>
          <p className="text-xs text-zinc-500">Último login: {client.last_sign_in_at ? new Date(client.last_sign_in_at).toLocaleString("pt-BR") : "Nunca"}</p>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><CreditCard size={16} className="text-blue-400" /><span className="text-xs text-zinc-400 uppercase">Plano</span></div>
          <p className="text-zinc-200 font-medium">{sub?.plan_name || "Sem plano"}</p>
          <p className="text-xs text-zinc-500 mt-1">R$ {sub ? Number(sub.plan_price).toFixed(2) : "0.00"}/mês</p>
          <p className="text-xs text-zinc-500">Máx: {maxInst} instâncias</p>
          <div className="mt-2">
            {isExpired ? <Badge className="bg-red-600 text-white text-[10px]">Vencida</Badge>
              : isExpiring ? <Badge className="bg-yellow-600 text-white text-[10px]">Vencendo ({daysLeft}d)</Badge>
              : sub ? <Badge className="bg-green-600 text-white text-[10px]">Ativa</Badge>
              : <Badge className="bg-zinc-600 text-white text-[10px]">Sem plano</Badge>}
          </div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Server size={16} className="text-green-400" /><span className="text-xs text-zinc-400 uppercase">Instâncias</span></div>
          <p className="text-2xl font-bold text-zinc-100">{devices.length}<span className="text-zinc-500 text-lg">/{maxInst}</span></p>
          <p className="text-xs text-zinc-500 mt-1">{devices.filter((d: any) => d.status === "Connected").length} conectadas</p>
          {devices.length >= maxInst && maxInst > 0 && <p className="text-xs text-red-400 mt-1">Limite atingido</p>}
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2"><Clock size={16} className="text-yellow-400" /><span className="text-xs text-zinc-400 uppercase">Vencimento</span></div>
          <p className={`text-lg font-bold ${isExpired ? "text-red-400" : isExpiring ? "text-yellow-400" : "text-zinc-200"}`}>
            {daysLeft !== null ? (isExpired ? "Vencido" : `${daysLeft} dias`) : "—"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-BR") : "—"}</p>
        </div>
      </div>

      {/* Security actions */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">
        <h4 className="text-sm font-medium text-zinc-300 mb-3">Ações Rápidas</h4>
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-zinc-600 text-zinc-300 text-xs" disabled={isPending}>
                <KeyRound size={14} className="mr-1.5" /> Resetar Senha
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
              <AlertDialogHeader><AlertDialogTitle>Resetar senha?</AlertDialogTitle><AlertDialogDescription className="text-zinc-400">Link será gerado para {client.email}.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel className="border-zinc-600 text-zinc-300">Cancelar</AlertDialogCancel><AlertDialogAction onClick={resetPassword} className="bg-purple-600">Confirmar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-zinc-600 text-zinc-300 text-xs" disabled={isPending}>
                <LogOut size={14} className="mr-1.5" /> Forçar Logout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
              <AlertDialogHeader><AlertDialogTitle>Forçar logout?</AlertDialogTitle><AlertDialogDescription className="text-zinc-400">Todas sessões de {client.full_name || client.email} serão encerradas.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel className="border-zinc-600 text-zinc-300">Cancelar</AlertDialogCancel><AlertDialogAction onClick={forceLogout} className="bg-red-600">Confirmar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {client.status === "active" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-yellow-600/50 text-yellow-400 text-xs" disabled={isPending}>
                  <ShieldAlert size={14} className="mr-1.5" /> Suspender
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <AlertDialogHeader><AlertDialogTitle>Suspender conta?</AlertDialogTitle><AlertDialogDescription className="text-zinc-400">Usuário será bloqueado.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel className="border-zinc-600 text-zinc-300">Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => toggleStatus("suspended")} className="bg-yellow-600">Suspender</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="outline" size="sm" className="border-green-600/50 text-green-400 text-xs" onClick={() => toggleStatus("active")} disabled={isPending}>
              <ShieldCheck size={14} className="mr-1.5" /> Reativar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientOverviewTab;
