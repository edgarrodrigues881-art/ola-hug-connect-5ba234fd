import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Wifi, WifiOff, Loader2, Server, AlertTriangle, Ban } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [showCreate, setShowCreate] = useState(false);
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

  let blockReason = "";
  if (isBlocked) blockReason = `Cliente ${client.status === "suspended" ? "suspenso" : "cancelado"} — criação bloqueada`;
  else if (isExpired) blockReason = "Assinatura vencida — criação bloqueada";
  else if (atLimit) blockReason = `Limite atingido (${devices.length}/${maxInstances})`;

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
          onClick={() => setShowCreate(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          disabled={isPending || !canCreate}
        >
          {!canCreate ? <Ban size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
          Criar Instância
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
    </div>
  );
};

export default ClientDevicesTab;
