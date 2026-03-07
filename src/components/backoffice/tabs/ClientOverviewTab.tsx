import type { AdminUser } from "@/hooks/useAdmin";
import { User, CreditCard, Server, Clock, AlertTriangle, KeyRound, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAction } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props { client: AdminUser; detail: any; }

const planColors: Record<string, string> = { Start: "text-zinc-400", Pro: "text-teal-400", Scale: "text-purple-400", Elite: "text-amber-500" };

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
    <div className="space-y-4">
      {/* Alerts */}
      {isExpired && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2.5 text-sm text-destructive">
          <AlertTriangle size={16} /> Assinatura vencida — instâncias bloqueadas para criação
        </div>
      )}
      {isExpiring && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-600/30 rounded-lg px-4 py-2.5 text-sm text-yellow-500">
          <Clock size={16} /> Assinatura vence em {daysLeft} dia{daysLeft !== 1 ? "s" : ""}
        </div>
      )}

      {/* Info cards — structured text, no badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2"><User size={14} className="text-primary" /><span className="text-[11px] text-muted-foreground uppercase font-medium">Conta</span></div>
          <p className="text-foreground font-medium text-sm">{client.full_name || "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">{client.email}</p>
          <p className="text-xs text-muted-foreground">{client.phone || "Sem telefone"}</p>
          <p className="text-xs text-muted-foreground mt-1">Cadastro: {new Date(client.created_at).toLocaleDateString("pt-BR")}</p>
          <p className="text-xs text-muted-foreground">Último login: {client.last_sign_in_at ? new Date(client.last_sign_in_at).toLocaleString("pt-BR") : "Nunca"}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2"><CreditCard size={14} className="text-teal-500" /><span className="text-[11px] text-muted-foreground uppercase font-medium">Plano</span></div>
          <p className={`font-medium text-sm ${planColors[sub?.plan_name] || "text-foreground"}`}>{sub?.plan_name || "Sem plano"}</p>
          <p className="text-xs text-muted-foreground mt-1">R$ {sub ? Number(sub.plan_price).toFixed(2) : "0.00"}/mês</p>
          <p className="text-xs text-muted-foreground">Máx: {maxInst} instâncias</p>
          <p className={`text-xs font-medium mt-2 ${isExpired ? "text-destructive" : isExpiring ? "text-yellow-500" : sub ? "text-green-500" : "text-muted-foreground"}`}>
            {isExpired ? "Vencida" : isExpiring ? `Vencendo (${daysLeft}d)` : sub ? "Ativa" : "Sem plano"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2"><Server size={14} className="text-green-500" /><span className="text-[11px] text-muted-foreground uppercase font-medium">Instâncias</span></div>
          <p className="text-xl font-bold text-foreground">{devices.length}<span className="text-muted-foreground text-base">/{maxInst}</span></p>
          <p className="text-xs text-muted-foreground mt-1">{devices.filter((d: any) => d.status === "Connected").length} conectadas</p>
          {devices.length >= maxInst && maxInst > 0 && <p className="text-xs text-destructive mt-1">Limite atingido</p>}
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2"><Clock size={14} className="text-yellow-500" /><span className="text-[11px] text-muted-foreground uppercase font-medium">Vencimento</span></div>
          <p className={`text-lg font-bold ${isExpired ? "text-destructive" : isExpiring ? "text-yellow-500" : "text-foreground"}`}>
            {daysLeft !== null ? (isExpired ? "Vencido" : `${daysLeft} dias`) : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-BR") : "—"}</p>
        </div>
      </div>

      {/* Security actions */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Ações Rápidas</h4>
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-border text-muted-foreground text-xs" disabled={isPending}>
                <KeyRound size={14} className="mr-1.5" /> Resetar Senha
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader><AlertDialogTitle>Resetar senha?</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Link será gerado para {client.email}.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel><AlertDialogAction onClick={resetPassword} className="bg-primary text-primary-foreground">Confirmar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-border text-muted-foreground text-xs" disabled={isPending}>
                <LogOut size={14} className="mr-1.5" /> Forçar Logout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader><AlertDialogTitle>Forçar logout?</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Todas sessões de {client.full_name || client.email} serão encerradas.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel><AlertDialogAction onClick={forceLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {client.status === "active" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-destructive/30 text-destructive text-xs" disabled={isPending}>
                  <ShieldAlert size={14} className="mr-1.5" /> Suspender
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader><AlertDialogTitle>Suspender conta?</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Usuário será bloqueado.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => toggleStatus("suspended")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Suspender</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="outline" size="sm" className="border-green-600/30 text-green-500 text-xs" onClick={() => toggleStatus("active")} disabled={isPending}>
              <ShieldCheck size={14} className="mr-1.5" /> Reativar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientOverviewTab;
