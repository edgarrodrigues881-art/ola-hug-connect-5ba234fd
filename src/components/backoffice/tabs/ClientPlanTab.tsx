import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, CreditCard, RefreshCw, AlertTriangle, PauseCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PLANS: Record<string, { price: number; max_instances: number }> = {
  Start: { price: 149.9, max_instances: 10 },
  Pro: { price: 349.9, max_instances: 30 },
  Scale: { price: 549.9, max_instances: 50 },
  Elite: { price: 899.9, max_instances: 100 },
};

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

interface Props { client: AdminUser; detail: any; }

const ClientPlanTab = ({ client, detail }: Props) => {
  const sub = detail?.subscription;
  const [planName, setPlanName] = useState<string>(sub?.plan_name || client.plan_name || "Start");
  const [startedAt, setStartedAt] = useState<string>(
    sub?.started_at ? sub.started_at.split("T")[0] : new Date().toISOString().split("T")[0]
  );

  const planConfig = PLANS[planName] || PLANS.Start;
  const expiresAt = useMemo(() => addDays(startedAt, 30), [startedAt]);
  const { mutate, isPending } = useAdminAction();
  const { toast } = useToast();

  const daysLeft = sub?.expires_at ? Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000) : null;
  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isExpiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 3;

  const handleSave = () => {
    mutate({
      action: "update-subscription",
      body: {
        target_user_id: client.id,
        plan_name: planName,
        plan_price: planConfig.price,
        max_instances: planConfig.max_instances,
        started_at: new Date(startedAt).toISOString(),
        expires_at: new Date(expiresAt).toISOString(),
      },
    }, {
      onSuccess: () => toast({ title: "Plano atualizado" }),
      onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  const handleRenew = () => {
    const currentExpiry = sub?.expires_at ? sub.expires_at.split("T")[0] : expiresAt;
    const newExpiry = addDays(currentExpiry, 30);
    mutate({
      action: "update-subscription",
      body: {
        target_user_id: client.id,
        plan_name: planName,
        plan_price: planConfig.price,
        max_instances: planConfig.max_instances,
        started_at: new Date(currentExpiry).toISOString(),
        expires_at: new Date(newExpiry).toISOString(),
      },
    }, {
      onSuccess: () => { toast({ title: "Renovado +30 dias" }); setStartedAt(currentExpiry); },
      onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  const handleSuspend = () => {
    // Set expires_at to now (force expire)
    mutate({
      action: "update-subscription",
      body: {
        target_user_id: client.id,
        plan_name: sub?.plan_name || planName,
        plan_price: sub?.plan_price || planConfig.price,
        max_instances: sub?.max_instances || planConfig.max_instances,
        started_at: sub?.started_at || new Date(startedAt).toISOString(),
        expires_at: new Date().toISOString(),
      },
    }, {
      onSuccess: () => toast({ title: "Assinatura suspensa (vencida forçadamente)" }),
      onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={20} className="text-purple-400" />
          <h3 className="text-lg font-semibold text-zinc-200">Plano & Assinatura</h3>
          {isExpired && <Badge className="bg-red-600 text-white text-[10px]"><AlertTriangle size={10} className="mr-1" /> Vencida</Badge>}
          {isExpiring && <Badge className="bg-yellow-600 text-white text-[10px]">Vence em {daysLeft}d</Badge>}
        </div>
        {daysLeft !== null && !isExpired && (
          <span className="text-sm font-medium text-zinc-300">{daysLeft} dias restantes</span>
        )}
      </div>

      {sub && (
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div><p className="text-xs text-zinc-400">Plano</p><p className="text-zinc-200 font-medium mt-1">{sub.plan_name}</p></div>
            <div><p className="text-xs text-zinc-400">Valor</p><p className="text-zinc-200 font-medium mt-1">R$ {Number(sub.plan_price).toFixed(2)}</p></div>
            <div><p className="text-xs text-zinc-400">Instâncias</p><p className="text-zinc-200 font-medium mt-1">{sub.max_instances}</p></div>
            <div><p className="text-xs text-zinc-400">Início</p><p className="text-zinc-200 font-medium mt-1">{sub.started_at ? new Date(sub.started_at).toLocaleDateString("pt-BR") : "—"}</p></div>
            <div><p className="text-xs text-zinc-400">Vencimento</p><p className={`font-medium mt-1 ${isExpired ? "text-red-400" : isExpiring ? "text-yellow-400" : "text-zinc-200"}`}>{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-BR") : "—"}</p></div>
          </div>
        </div>
      )}

      <div className="border-t border-zinc-700 pt-4">
        <h4 className="text-sm font-medium text-zinc-300 mb-4">Alterar Plano</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-400 text-xs">Plano</Label>
            <select value={planName} onChange={e => { setPlanName(e.target.value); setStartedAt(new Date().toISOString().split("T")[0]); }}
              className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 px-3 text-sm">
              {Object.keys(PLANS).map(p => <option key={p} value={p}>{p} — R$ {PLANS[p].price.toFixed(2)} ({PLANS[p].max_instances} inst.)</option>)}
            </select>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Valor (R$)</Label>
            <Input value={`R$ ${planConfig.price.toFixed(2)}`} disabled className="bg-zinc-900/50 border-zinc-700 text-zinc-500 mt-1" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Máx. Instâncias</Label>
            <Input value={planConfig.max_instances} disabled className="bg-zinc-900/50 border-zinc-700 text-zinc-500 mt-1" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Data de Início</Label>
            <Input type="date" value={startedAt} onChange={e => setStartedAt(e.target.value)} className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Data de Vencimento (início + 30 dias)</Label>
            <Input value={new Date(expiresAt).toLocaleDateString("pt-BR")} disabled className="bg-zinc-900/50 border-zinc-700 text-zinc-500 mt-1" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
          Salvar Plano
        </Button>
        {sub && (
          <Button onClick={handleRenew} disabled={isPending} variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-700">
            <RefreshCw size={14} className="mr-2" /> Renovar +30 dias
          </Button>
        )}
        {sub && !isExpired && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-red-600/50 text-red-400 hover:text-red-300" disabled={isPending}>
                <PauseCircle size={14} className="mr-2" /> Suspender Assinatura
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
              <AlertDialogHeader>
                <AlertDialogTitle>Suspender assinatura?</AlertDialogTitle>
                <AlertDialogDescription className="text-zinc-400">Isso forçará o vencimento imediato e bloqueará criação de instâncias.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-zinc-600 text-zinc-300">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleSuspend} className="bg-red-600 hover:bg-red-700">Suspender</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};

export default ClientPlanTab;
