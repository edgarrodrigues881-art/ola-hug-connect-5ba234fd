import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, CreditCard, RefreshCw, AlertTriangle, PauseCircle, Undo2, CheckCircle2, Clock, MinusCircle, Zap, Radio } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const NOTIFICATION_PRICE = 18.90;

const PLANS: Record<string, { price: number; max_instances: number; defaultDays?: number; reports_whatsapp_enabled?: boolean }> = {
  "Sem plano": { price: 0, max_instances: 0 },
  Trial: { price: 0, max_instances: 3, defaultDays: 3 },
  Start: { price: 149.9, max_instances: 10 },
  Pro: { price: 349.9, max_instances: 30 },
  Scale: { price: 549.9, max_instances: 50, reports_whatsapp_enabled: true },
  Elite: { price: 899.9, max_instances: 100, reports_whatsapp_enabled: true },
};

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function toLocalDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

interface Props { client: AdminUser; detail: any; }

const cycleStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  paid: { label: "Pago", color: "text-green-500", icon: CheckCircle2 },
  partial: { label: "Parcial", color: "text-yellow-500", icon: MinusCircle },
  pending: { label: "Pendente", color: "text-destructive", icon: Clock },
};

const ClientPlanTab = ({ client, detail }: Props) => {
  const sub = detail?.subscription;
  const cycles: any[] = detail?.cycles || [];
  const [planName, setPlanName] = useState<string>(sub?.plan_name || client.plan_name || "Start");
  const [startedAt, setStartedAt] = useState<string>(
    sub?.started_at ? sub.started_at.split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [trialDays, setTrialDays] = useState<number>(3);
  const [manualExpires, setManualExpires] = useState<string>("");
  const [includeNotification, setIncludeNotification] = useState<boolean>(detail?.profile?.notificacao_liberada ?? false);

  const planConfig = PLANS[planName] || PLANS.Start;
  const notificationPrice = isTrial ? 0 : NOTIFICATION_PRICE;
  const totalPrice = planConfig.price + (includeNotification ? notificationPrice : 0);
  const isTrial = planName === "Trial";
  const isNoPlan = planName === "Sem plano";
  const cycleDays = isTrial ? trialDays : 30;
  
  const autoExpiresAt = useMemo(() => isNoPlan ? startedAt : addDays(startedAt, cycleDays), [startedAt, isNoPlan, cycleDays]);
  const expiresAt = manualExpires || autoExpiresAt;
  const { mutate, isPending } = useAdminAction();
  const { toast } = useToast();

  const daysLeft = sub?.expires_at ? Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000) : null;
  const isExpired = daysLeft !== null && daysLeft <= 0;
  const isExpiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 3;

  const [provisioning, setProvisioning] = useState(false);

  // Auto-provision tokens via UAZAPI API
  const handleAutoProvision = (quantity: number) => {
    setProvisioning(true);
    const clientName = client.full_name || client.email || "cliente";
    mutate({
      action: "auto-provision-tokens",
      body: { target_user_id: client.id, quantity, client_name: clientName },
    }, {
      onSuccess: (data: any) => {
        setProvisioning(false);
        if (data.created > 0) {
          toast({ title: `${data.created} token(s) criado(s) automaticamente via UAZAPI`, description: data.errors > 0 ? `${data.errors} erro(s): ${data.error_details?.join(", ")}` : undefined });
        } else if (data.existing >= quantity) {
          toast({ title: `Cliente já possui ${data.existing} token(s) — nenhum novo necessário` });
        } else {
          toast({ title: "Nenhum token criado", description: data.error_details?.join(", "), variant: "destructive" });
        }
      },
      onError: (e) => {
        setProvisioning(false);
        toast({ title: "Erro ao provisionar", description: e.message, variant: "destructive" });
      },
    });
  };

  // Save plan — provisioning happens automatically in update-subscription
  const handleSave = () => {
    if (isNoPlan) {
      mutate({
        action: "remove-subscription",
        body: { target_user_id: client.id },
      }, {
        onSuccess: () => toast({ title: "Plano removido — cliente sem plano" }),
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      });
      return;
    }

    const cycleStart = new Date(startedAt).toISOString();
    const cycleEnd = new Date(expiresAt).toISOString();

    setProvisioning(true);
    mutate({
      action: "update-subscription",
      body: {
        target_user_id: client.id,
        plan_name: planName,
        plan_price: planConfig.price,
        max_instances: planConfig.max_instances,
        started_at: cycleStart,
        expires_at: cycleEnd,
      },
    }, {
      onSuccess: (data: any) => {
        const prov = data?.provision;
        // Create cycle
        mutate({
          action: "create-cycle",
          body: {
            target_user_id: client.id,
            plan_name: planName,
            cycle_amount: planConfig.price,
            cycle_start: cycleStart,
            cycle_end: cycleEnd,
          },
        }, {
          onSuccess: () => {
            // Toggle notification flag
            mutate({
              action: "toggle-notification",
              body: { target_user_id: client.id, enabled: includeNotification },
            }, { onSuccess: () => {}, onError: () => {} });

            // Create/update notification addon subscription
            if (includeNotification) {
              mutate({
                action: "update-subscription",
                body: {
                  target_user_id: client.id,
                  plan_name: "Relatórios WhatsApp",
                  plan_price: NOTIFICATION_PRICE,
                  max_instances: 0,
                  started_at: cycleStart,
                  expires_at: cycleEnd,
                  is_addon: true,
                },
              }, { onSuccess: () => {}, onError: () => {} });
            }

            setProvisioning(false);
            let desc = "Ciclo criado.";
            if (includeNotification) desc += " Relatório via WhatsApp ativado.";
            if (prov?.created > 0) desc += ` ${prov.created} token(s) provisionados.`;
            if (prov?.blocked > 0) desc += ` ${prov.blocked} token(s) bloqueados por downgrade.`;
            if (prov?.unblocked > 0) desc += ` ${prov.unblocked} token(s) desbloqueados.`;
            if (prov?.errors?.length > 0) desc += ` ${prov.errors.length} erro(s).`;
            toast({ title: "Plano atualizado", description: desc });
          },
          onError: (e) => {
            setProvisioning(false);
            toast({ title: "Plano salvo, mas ciclo falhou", description: e.message, variant: "destructive" });
          },
        });
      },
      onError: (e) => {
        setProvisioning(false);
        toast({ title: "Erro", description: e.message, variant: "destructive" });
      },
    });
  };

  // Renew creates a new cycle from current expiry
  const handleRenew = () => {
    const currentExpiry = sub?.expires_at ? sub.expires_at.split("T")[0] : expiresAt;
    const newStart = currentExpiry;
    const newEnd = addDays(currentExpiry, 30);

    mutate({
      action: "create-cycle",
      body: {
        target_user_id: client.id,
        plan_name: sub?.plan_name || planName,
        cycle_amount: sub?.plan_price || planConfig.price,
        cycle_start: new Date(newStart).toISOString(),
        cycle_end: new Date(newEnd).toISOString(),
      },
    }, {
      onSuccess: () => toast({ title: "Ciclo renovado +30 dias" }),
      onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  // Revert last cycle
  const handleRevert = () => {
    mutate({
      action: "revert-cycle",
      body: { target_user_id: client.id },
    }, {
      onSuccess: () => toast({ title: "Último ciclo revertido" }),
      onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  // Update cycle status
  const updateCycleStatus = (cycleId: string, status: string) => {
    mutate({
      action: "update-cycle-status",
      body: { cycle_id: cycleId, status, target_user_id: client.id },
    }, {
      onSuccess: () => toast({ title: `Ciclo marcado como ${cycleStatusConfig[status]?.label || status}` }),
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
    <div className="space-y-5">
      {/* Current subscription info */}
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
              <div><p className="text-[11px] text-muted-foreground uppercase font-medium">Início</p><p className="text-foreground font-medium mt-0.5">{sub.started_at ? toLocalDate(sub.started_at) : "—"}</p></div>
              <div><p className="text-[11px] text-muted-foreground uppercase font-medium">Vencimento</p><p className={`font-medium mt-0.5 ${isExpired ? "text-destructive" : isExpiring ? "text-yellow-500" : "text-foreground"}`}>{sub.expires_at ? toLocalDate(sub.expires_at) : "—"}</p></div>
            </div>
          </div>
        )}

        {/* Change plan form */}
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-foreground mb-4">Alterar Plano</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Plano</Label>
              <select value={planName} onChange={e => { 
                const newPlan = e.target.value;
                setPlanName(newPlan); 
                setStartedAt(new Date().toISOString().split("T")[0]);
              }}
                className="mt-1 w-full h-10 rounded-md border border-border bg-card text-foreground px-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors cursor-pointer">
                <option value="" disabled>Selecione um plano</option>
                {Object.keys(PLANS).map(p => (
                  <option key={p} value={p}>
                    {p === "Sem plano" ? "Sem plano" : `${p} — ${PLANS[p].max_instances} instâncias — R$ ${PLANS[p].price.toFixed(2)}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Valor Total (R$)</Label>
              <div className="mt-1 h-10 rounded-md border border-border bg-muted/50 px-3 flex items-center gap-2 text-sm">
                <span className="text-foreground font-medium">R$ {totalPrice.toFixed(2)}</span>
                {includeNotification && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{isTrial ? "incluso no trial" : `+ R$ ${NOTIFICATION_PRICE.toFixed(2)} notificação`}</span>
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Data de Início</Label>
              <Input type="date" value={startedAt} onChange={e => setStartedAt(e.target.value)} className="bg-card border-border text-foreground mt-1 h-9" />
            </div>
            {isTrial && (
              <div>
                <Label className="text-muted-foreground text-xs">Dias de Trial</Label>
                <Input type="number" min={1} max={90} value={trialDays === 0 ? "" : trialDays} onChange={e => setTrialDays(e.target.value === "" ? 0 : Math.max(1, Math.min(90, Number(e.target.value))))} className="bg-card border-border text-foreground mt-1 h-9" />
              </div>
            )}
            <div>
              <Label className="text-muted-foreground text-xs">Data de Vencimento {manualExpires ? "(manual)" : `(início + ${cycleDays} dias)`}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input 
                  type="date" 
                  value={manualExpires || expiresAt} 
                  onChange={e => setManualExpires(e.target.value)} 
                  className="bg-card border-border text-foreground h-9 flex-1" 
                />
                {manualExpires && (
                  <Button size="sm" variant="ghost" onClick={() => setManualExpires("")} className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0">
                    Auto
                  </Button>
                )}
            </div>
            {/* Relatório via WhatsApp addon inline */}
            <div className="md:col-span-2">
              <div 
                onClick={() => setIncludeNotification(!includeNotification)}
                className={`mt-1 flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  includeNotification 
                    ? "border-emerald-500/50 bg-emerald-500/5" 
                    : "border-border bg-muted/20 hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${includeNotification ? "bg-emerald-500/15" : "bg-muted/50"}`}>
                    <Radio size={16} className={includeNotification ? "text-emerald-500" : "text-muted-foreground"} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Relatório via WhatsApp</p>
                    <p className="text-[11px] text-muted-foreground">Alertas de desconexão, campanhas e aquecimento</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <span className={`text-xs font-semibold ${includeNotification ? "text-emerald-500" : "text-muted-foreground"}`}>
                     {isTrial ? "Grátis no Trial" : `+ R$ ${NOTIFICATION_PRICE.toFixed(2)}/mês`}
                   </span>
                  <Switch checked={includeNotification} onCheckedChange={setIncludeNotification} />
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleSave} disabled={isPending || provisioning} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            {isNoPlan ? "Remover Plano" : isTrial ? `Ativar Trial (${trialDays} dias)` : "Salvar Plano + Criar Ciclo + Tokens"}
          </Button>
          {sub && !isNoPlan && (
            <Button onClick={() => handleAutoProvision(sub?.max_instances || planConfig.max_instances)} disabled={isPending || provisioning} variant="outline" className="border-primary/30 text-primary hover:text-primary/80">
              {provisioning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap size={14} className="mr-2" />}
              Provisionar Tokens
            </Button>
          )}
          {sub && (
            <Button onClick={handleRenew} disabled={isPending} variant="outline" className="border-border text-muted-foreground hover:text-foreground">
              <RefreshCw size={14} className="mr-2" /> Renovar +30 dias
            </Button>
          )}
          {cycles.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground" disabled={isPending}>
                  <Undo2 size={14} className="mr-2" /> Reverter Último Ciclo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Reverter última renovação?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    O ciclo mais recente será excluído e o vencimento será recalculado com base no ciclo anterior.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRevert} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Reverter</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {sub && !isExpired && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive/30 text-destructive hover:text-destructive/80" disabled={isPending}>
                  <PauseCircle size={14} className="mr-2" /> Suspender
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Suspender assinatura?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">Isso forçará o vencimento imediato.</AlertDialogDescription>
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

      {/* Cycle history */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h4 className="text-sm font-semibold text-foreground mb-4">Histórico de Ciclos</h4>
        {cycles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum ciclo registrado</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-wider">
                  <th className="text-left px-3 py-2.5">Plano</th>
                  <th className="text-left px-3 py-2.5">Início</th>
                  <th className="text-left px-3 py-2.5">Fim</th>
                  <th className="text-left px-3 py-2.5">Valor</th>
                  <th className="text-left px-3 py-2.5">Status</th>
                  <th className="text-right px-3 py-2.5">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cycles.map((c: any, idx: number) => {
                  const cfg = cycleStatusConfig[c.status] || cycleStatusConfig.pending;
                  const Icon = cfg.icon;
                  return (
                    <tr key={c.id} className={idx === 0 ? "bg-primary/5" : "hover:bg-muted/30"}>
                      <td className="px-3 py-2.5 text-foreground font-medium">{c.plan_name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{toLocalDate(c.cycle_start)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{toLocalDate(c.cycle_end)}</td>
                      <td className="px-3 py-2.5 text-foreground">R$ {Number(c.cycle_amount).toFixed(2)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs font-medium flex items-center gap-1 ${cfg.color}`}>
                          <Icon size={12} /> {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex gap-1 justify-end">
                          {c.status !== "paid" && (
                            <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-400 text-[10px] h-7 px-2"
                              onClick={() => updateCycleStatus(c.id, "paid")} disabled={isPending}>
                              Pago
                            </Button>
                          )}
                          {c.status !== "partial" && (
                            <Button variant="ghost" size="sm" className="text-yellow-500 hover:text-yellow-400 text-[10px] h-7 px-2"
                              onClick={() => updateCycleStatus(c.id, "partial")} disabled={isPending}>
                              Parcial
                            </Button>
                          )}
                          {c.status !== "pending" && (
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80 text-[10px] h-7 px-2"
                              onClick={() => updateCycleStatus(c.id, "pending")} disabled={isPending}>
                              Pendente
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPlanTab;
