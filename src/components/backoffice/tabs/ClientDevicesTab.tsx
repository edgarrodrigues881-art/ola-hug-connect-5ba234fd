import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Wifi, WifiOff, Loader2, Server, AlertTriangle, Ban, ArrowUpCircle, Lock } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
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
const PLAN_ORDER = ["Start", "Pro", "Scale", "Elite"];

interface Props { client: AdminUser; detail: any; }

const statusTextColor: Record<string, string> = {
  Connected: "text-green-500", Disconnected: "text-muted-foreground", connecting: "text-yellow-500", Blocked: "text-destructive",
};
const statusLabel: Record<string, string> = {
  Connected: "Conectada", Disconnected: "Desconectada", connecting: "Conectando", Blocked: "Bloqueada",
};

const ClientDevicesTab = ({ client, detail }: Props) => {
  const devices = detail?.devices || [];
  const subscription = detail?.subscription;
  const maxInstances = subscription?.max_instances ?? 0;
  const currentPlan = subscription?.plan_name || "Sem plano";
  const hasActivePlan = !!subscription && currentPlan !== "Sem plano";
  const [showCreate, setShowCreate] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showNoPlan, setShowNoPlan] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("principal");
  const { mutate, isPending } = useAdminAction();
  const { toast } = useToast();

  const atLimit = devices.length >= maxInstances;
  const isExpired = subscription?.expires_at ? new Date(subscription.expires_at).getTime() < Date.now() : false;
  const isBlocked = client.status === "suspended" || client.status === "cancelled";
  const noPlan = !hasActivePlan || isExpired;
  const canCreate = !atLimit && !noPlan && !isBlocked;

  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan);
  const nextPlan = currentPlanIndex >= 0 && currentPlanIndex < PLAN_ORDER.length - 1 ? PLAN_ORDER[currentPlanIndex + 1] : null;
  const nextPlanConfig = nextPlan ? PLANS[nextPlan] : null;

  let blockReason = "";
  if (isBlocked) blockReason = `Cliente ${client.status === "suspended" ? "suspenso" : "cancelado"} — bloqueado`;
  else if (noPlan) blockReason = !hasActivePlan ? "Sem plano ativo — criação bloqueada" : "Assinatura vencida — criação bloqueada";
  else if (atLimit) blockReason = `Limite do plano atingido (${devices.length}/${maxInstances})`;

  const handleCreateClick = () => {
    if (noPlan || isBlocked) { setShowNoPlan(true); return; }
    if (atLimit && nextPlan) { setShowUpgrade(true); return; }
    if (canCreate) setShowCreate(true);
  };

  const createDevice = () => {
    if (!newName.trim()) return;
    mutate(
      { action: "create-device", body: { target_user_id: client.id, name: newName.trim(), login_type: newType } },
      {
        onSuccess: () => { toast({ title: "Instância criada" }); setNewName(""); setNewType("principal"); setShowCreate(false); },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const deleteDevice = (id: string, name: string) => {
    mutate(
      { action: "delete-device", body: { target_user_id: client.id, device_id: id, device_name: name } },
      { onSuccess: () => toast({ title: "Instância removida" }), onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }) }
    );
  };

  const upgradePlan = () => {
    if (!nextPlan || !nextPlanConfig) return;
    const now = new Date();
    mutate({
      action: "update-subscription",
      body: {
        target_user_id: client.id, plan_name: nextPlan, plan_price: nextPlanConfig.price,
        max_instances: nextPlanConfig.max_instances, started_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 30 * 86400000).toISOString(),
      },
    }, {
      onSuccess: () => { toast({ title: `Migrado para ${nextPlan}` }); setShowUpgrade(false); },
      onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-primary" />
          <h3 className="text-base font-bold text-foreground">Instâncias</h3>
          <span className="text-sm text-muted-foreground">({devices.length}/{maxInstances})</span>
        </div>
        <Button size="sm" onClick={handleCreateClick} className="bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={isPending || isBlocked}>
          {(isBlocked || noPlan) ? <Ban size={14} className="mr-1" /> : atLimit ? <ArrowUpCircle size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
          {noPlan ? "Sem plano" : atLimit && !isBlocked ? "Upgrade" : "Criar Instância"}
        </Button>
      </div>

      {!canCreate && blockReason && (
        <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-md px-4 py-2.5 text-sm text-destructive">
          <AlertTriangle size={16} className="shrink-0" /> {blockReason}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-wider">
              <th className="text-left px-4 py-2.5">Nome</th>
              <th className="text-left px-4 py-2.5">Tipo</th>
              <th className="text-left px-4 py-2.5">Número</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Criada em</th>
              <th className="text-right px-4 py-2.5">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {devices.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma instância</td></tr>
            ) : devices.map((d: any) => (
              <tr key={d.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 text-foreground font-medium">{d.name}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {d.login_type === "contingencia" ? "Contingência" : "Principal"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{d.number || "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-medium flex items-center gap-1 ${statusTextColor[d.status] || "text-muted-foreground"}`}>
                    {d.status === "Connected" ? <Wifi size={12} /> : d.status === "Blocked" ? <Lock size={12} /> : <WifiOff size={12} />}
                    {statusLabel[d.status] || d.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-2.5 text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive h-8 w-8"><Trash2 size={14} /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader><AlertDialogTitle>Remover "{d.name}"?</AlertDialogTitle><AlertDialogDescription className="text-muted-foreground">Ação permanente.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteDevice(d.id, d.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Criar Instância</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-muted-foreground text-xs">Nome</Label>
              <Input placeholder="Nome da instância" value={newName} onChange={e => setNewName(e.target.value)} className="bg-muted/30 border-border mt-1" />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Tipo</Label>
              <select value={newType} onChange={e => setNewType(e.target.value)} className="mt-1 w-full h-9 rounded-md border border-border bg-card text-foreground px-3 text-sm">
                <option value="principal">Principal</option>
                <option value="contingencia">Contingência</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createDevice} disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade dialog */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowUpCircle size={18} className="text-primary" />Limite Atingido</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Limite do plano <strong className="text-foreground">{currentPlan}</strong> ({maxInstances} inst.).
              {nextPlan && nextPlanConfig && <span className="block mt-2">Migrar para <strong className="text-primary">{nextPlan}</strong> ({nextPlanConfig.max_instances} inst., R$ {nextPlanConfig.price.toFixed(2)}/mês)?</span>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowUpgrade(false)} className="border-border text-muted-foreground">Cancelar</Button>
            {nextPlan && <Button onClick={upgradePlan} disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground"><ArrowUpCircle size={14} className="mr-2" />Migrar para {nextPlan}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No Plan dialog */}
      <Dialog open={showNoPlan} onOpenChange={setShowNoPlan}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban size={18} className="text-destructive" /> Ative um plano para liberar instâncias</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              {isBlocked
                ? "Esta conta está suspensa/cancelada. Reative antes de criar instâncias."
                : !hasActivePlan
                  ? "Esta conta está sem plano ativo. Atribua um plano na aba Plano para liberar instâncias."
                  : "A assinatura está vencida. Registre um pagamento para reativar."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoPlan(false)} className="border-border">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDevicesTab;
