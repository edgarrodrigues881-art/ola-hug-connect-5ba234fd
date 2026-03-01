import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, CreditCard } from "lucide-react";

interface Props {
  client: AdminUser;
  detail: any;
}

const ClientPlanTab = ({ client, detail }: Props) => {
  const sub = detail?.subscription;
  const [form, setForm] = useState({
    plan_name: sub?.plan_name || client.plan_name || "Start",
    plan_price: sub?.plan_price || client.plan_price || 0,
    max_instances: sub?.max_instances || client.max_instances || 10,
    expires_at: sub?.expires_at ? sub.expires_at.split("T")[0] : "",
    started_at: sub?.started_at ? sub.started_at.split("T")[0] : new Date().toISOString().split("T")[0],
  });
  const { mutate, isPending } = useAdminAction();
  const { toast } = useToast();

  const handleSave = () => {
    mutate(
      {
        action: "update-subscription",
        body: {
          target_user_id: client.id,
          ...form,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          started_at: form.started_at ? new Date(form.started_at).toISOString() : null,
        },
      },
      {
        onSuccess: () => toast({ title: "Plano atualizado com sucesso" }),
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <CreditCard size={20} className="text-purple-400" />
        <h3 className="text-lg font-semibold text-zinc-200">Plano & Assinatura</h3>
      </div>

      {/* Current plan summary */}
      {sub && (
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-zinc-400">Plano Atual</p>
              <p className="text-zinc-200 font-medium mt-1">{sub.plan_name}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Valor</p>
              <p className="text-zinc-200 font-medium mt-1">R$ {Number(sub.plan_price).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Máx. Instâncias</p>
              <p className="text-zinc-200 font-medium mt-1">{sub.max_instances}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Vencimento</p>
              <p className="text-zinc-200 font-medium mt-1">
                {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-BR") : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-zinc-700 pt-4">
        <h4 className="text-sm font-medium text-zinc-300 mb-4">Alterar Plano Manualmente</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-zinc-400 text-xs">Nome do Plano</Label>
            <Input value={form.plan_name} onChange={e => setForm({...form, plan_name: e.target.value})} className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Valor (R$)</Label>
            <Input type="number" step="0.01" value={form.plan_price} onChange={e => setForm({...form, plan_price: Number(e.target.value)})} className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Máx. Instâncias</Label>
            <Input type="number" value={form.max_instances} onChange={e => setForm({...form, max_instances: Number(e.target.value)})} className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Data de Início</Label>
            <Input type="date" value={form.started_at} onChange={e => setForm({...form, started_at: e.target.value})} className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Data de Vencimento</Label>
            <Input type="date" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
        Salvar Plano
      </Button>
    </div>
  );
};

export default ClientPlanTab;
