import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Wifi, WifiOff, Loader2, Server, AlertTriangle, Ban, ArrowUpCircle } from "lucide-react";
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

interface Props {
  client: AdminUser;
  detail: any;
}

const statusColors: Record<string, string> = {
  Connected: "bg-green-600",
  Disconnected: "bg-zinc-600",
  connecting: "bg-yellow-600",
};

const ClientDevicesTab = ({ client, detail }: Props) => {
  const devices = detail?.devices || [];
  const subscription = detail?.subscription;
  const maxInstances = subscription?.max_instances ?? client.max_instances ?? 10;
  const currentPlan = subscription?.plan_name || client.plan_name || "Start";
  const [showCreate, setShowCreate] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [newName, setNewName] = useState("");
  const { mutate, isPending } = useAdminAction();
  const { toast } = useToast();

  // Check limits
  const atLimit = devices.length >= maxInstances;
  const isExpired = subscription?.expires_at
    ? new Date(subscription.expires_at).getTime() < Date.now()
    : false;
  const isBlocked = client.status === "suspended" || client.status === "cancelled";
  const canCreate = !atLimit && !isExpired && !isBlocked;

  // Next plan for upgrade suggestion
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan);
  const nextPlan = currentPlanIndex >= 0 && currentPlanIndex < PLAN_ORDER.length - 1 
    ? PLAN_ORDER[currentPlanIndex + 1] 
    : null;
  const nextPlanConfig = nextPlan ? PLANS[nextPlan] : null;

  let blockReason = "";
  if (isBlocked) blockReason = `Cliente ${client.status === "suspended" ? "suspenso" : "cancelado"} — criação bloqueada`;
  else if (isExpired) blockReason = "Assinatura vencida — criação bloqueada";
  else if (atLimit) blockReason = `Limite atingido (${devices.length}/${maxInstances})`;

  const handleCreateClick = () => {
    if (atLimit && !isExpired && !isBlocked && nextPlan) {
      setShowUpgrade(true);
    } else {
      setShowCreate(true);
    }
  };

  const createDevice = () => {
    if (!newName.trim()) return;
    mutate(
      { action: "create-device", body: { target_user_id: client.id, name: newName.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Instância criada" });
          setNewName("");
          setShowCreate(false);
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const deleteDevice = (deviceId: string, deviceName: string) => {
    mutate(
      { action: "delete-device", body: { target_user_id: client.id, device_id: deviceId, device_name: deviceName } },
      {
        onSuccess: () => toast({ title: "Instância removida" }),
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const upgradePlan = () => {
    if (!nextPlan || !nextPlanConfig) return;
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 86400000);
    mutate(
      {
        action: "update-subscription",
        body: {
          target_user_id: client.id,
          plan_name: nextPlan,
          plan_price: nextPlanConfig.price,
          max_instances: nextPlanConfig.max_instances,
          started_at: now.toISOString(),
          expires_at: expires.toISOString(),
        },
      },
      {
        onSuccess: () => {
          toast({ title: `Plano migrado para ${nextPlan}` });
          setShowUpgrade(false);
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server size={20} className="text-purple-400" />
          <h3 className="text-lg font-semibold text-zinc-200">Instâncias</h3>
          <span className="text-sm text-zinc-400">({devices.length} de {maxInstances} liberadas)</span>
        </div>
        <Button
          size="sm"
          onClick={handleCreateClick}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          disabled={isPending || isBlocked || isExpired}
        >
          {(isBlocked || isExpired) ? <Ban size={14} className="mr-1" /> : atLimit ? <ArrowUpCircle size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
          {atLimit && !isBlocked && !isExpired ? "Upgrade" : "Criar Instância"}
        </Button>
      </div>

      {/* Block warning */}
      {!canCreate && blockReason && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-800/50 rounded-lg px-4 py-3 text-sm text-red-300">
          <AlertTriangle size={16} className="shrink-0" />
          {blockReason}
        </div>
      )}

      {/* Devices table */}
      <div className="border border-zinc-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3">Número</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Criada em</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {devices.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-zinc-500">Nenhuma instância</td></tr>
            ) : devices.map((d: any) => (
              <tr key={d.id} className="hover:bg-zinc-800/50">
                <td className="px-4 py-3 text-zinc-200 font-medium">{d.name}</td>
                <td className="px-4 py-3 text-zinc-400">{d.number || "—"}</td>
                <td className="px-4 py-3">
                  <Badge className={`${statusColors[d.status] || "bg-zinc-600"} text-white text-[10px] px-2`}>
                    {d.status === "Connected" ? <><Wifi size={10} className="mr-1" /> Conectada</> : <><WifiOff size={10} className="mr-1" /> Desconectada</>}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-zinc-400 text-xs">{new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 h-8 w-8">
                        <Trash2 size={14} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover instância?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          A instância "{d.name}" será permanentemente removida.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-zinc-600 text-zinc-300">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteDevice(d.id, d.name)} className="bg-red-600 hover:bg-red-700">Remover</AlertDialogAction>
                      </AlertDialogFooter>
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
        <DialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
          <DialogHeader><DialogTitle>Criar Instância Manual</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Nome da instância"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-zinc-100"
            />
          </div>
          <DialogFooter>
            <Button onClick={createDevice} disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade dialog */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle size={20} className="text-purple-400" />
              Limite de Instâncias Atingido
            </DialogTitle>
            <DialogDescription className="text-zinc-400 pt-2">
              O cliente atingiu o limite do plano <strong className="text-zinc-200">{currentPlan}</strong> ({maxInstances} instâncias).
              {nextPlan && nextPlanConfig && (
                <span className="block mt-2">
                  Deseja migrar para o plano <strong className="text-purple-400">{nextPlan}</strong> ({nextPlanConfig.max_instances} instâncias, R$ {nextPlanConfig.price.toFixed(2)}/mês)?
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {nextPlan && nextPlanConfig && (
            <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Plano atual:</span>
                <span className="text-zinc-200">{currentPlan} — {maxInstances} instâncias</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Novo plano:</span>
                <span className="text-purple-400 font-medium">{nextPlan} — {nextPlanConfig.max_instances} instâncias</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Novo valor:</span>
                <span className="text-zinc-200">R$ {nextPlanConfig.price.toFixed(2)}/mês</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowUpgrade(false)} className="border-zinc-600 text-zinc-300">
              Cancelar
            </Button>
            {nextPlan && (
              <Button onClick={upgradePlan} disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpCircle size={14} className="mr-2" />}
                Migrar para {nextPlan}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDevicesTab;
