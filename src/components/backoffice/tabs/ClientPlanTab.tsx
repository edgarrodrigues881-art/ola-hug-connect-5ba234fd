import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
      onSuccess: () => toast({ title: "Assinatura suspensa" }),
      onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-primary" />
          <h3 className="text-base font-bold text-foreground">Plano & Assinatura</h3>
        </div>
        <div className="text-sm text-muted-foreground">
          {isExpired && <span className="text-destructive font-medium flex items-center gap-1"><AlertTriangle size={14} /> Vencida</span>}
          {isExpiring && <span className="text-yellow-500 font-medium">Vence em {daysLeft}d</span>}
          {daysLeft !== null && !isExpired && !isExpiring && <span>{daysLeft} dias restantes</span>}
        </div>
      </div>

      {sub && (
        <div className="bg-muted/50 rounded-md p-4 border border-border">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div><p className="text-[11px] text-muted-foreground uppercase font-medium">Plano</p><p className="text-foreground font-medium mt-0.5">{sub.plan_name}</p></div>
            <div><p className="text-[11px] text-muted-foreground uppercase font-medium">Valor</p><p className="text-foreground font-medium mt-0.5">R$ {Number(sub.plan_price).toFixed(2)}</p></div>
            <div><p className="text-[11px] text-muted-foreground uppercase font-medium">Instâncias</p><p className="text-foreground font-medium mt-0.5">{sub.max_instances}</p></div>
            <div><p className="text-[11px] text-muted-foreground uppercase font-medium">Início</p><p className="text-foreground font-medium mt-0.5">{sub.started_at ? new Date(sub.started_at).toLocaleDateString("pt-BR") : "—"}</p></div>
            <div><p className="text-[11px] text-muted-foreground uppercase font-medium">Vencimento</p><p className={`font-medium mt-0.5 ${isExpired ? "text-destructive" : isExpiring ? "text-yellow-500" : "text-foreground"}`}>{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-BR") : "—"}</p></div>
          </div>
        </div>
      )}

      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-semibold text-foreground mb-4">Alterar Plano</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground text-xs">Plano</Label>
            <select value={planName} onChange={e => { setPlanName(e.target.value); setStartedAt(new Date().toISOString().split("T")[0]); }}
              className="mt-1 w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-sm">
              {Object.keys(PLANS).map(p => <option key={p} value={p}>{p} — R$ {PLANS[p].price.toFixed(2)} ({PLANS[p].max_instances} inst.)</option>)}
            </select>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Valor (R$)</Label>
            <Input value={`R$ ${planConfig.price.toFixed(2)}`} disabled className="bg-muted/50 border-border text-muted-foreground mt-1 h-9" />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Máx. Instâncias</Label>
            <Input value={planConfig.max_instances} disabled className="bg-muted/50 border-border text-muted-foreground mt-1 h-9" />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Data de Início</Label>
            <Input type="date" value={startedAt} onChange={e => setStartedAt(e.target.value)} className="bg-card border-border text-foreground mt-1 h-9" />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Data de Vencimento (início + 30 dias)</Label>
            <Input value={new Date(expiresAt).toLocaleDateString("pt-BR")} disabled className="bg-muted/50 border-border text-muted-foreground mt-1 h-9" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
          Salvar Plano
        </Button>
        {sub && (
          <Button onClick={handleRenew} disabled={isPending} variant="outline" className="border-border text-muted-foreground hover:text-foreground">
            <RefreshCw size={14} className="mr-2" /> Renovar +30 dias
          </Button>
        )}
        {sub && !isExpired && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-destructive/30 text-destructive hover:text-destructive/80" disabled={isPending}>
                <PauseCircle size={14} className="mr-2" /> Suspender Assinatura
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Suspender assinatura?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">Isso forçará o vencimento imediato e bloqueará criação de instâncias.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleSuspend} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Suspender</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};

export default ClientPlanTab;
