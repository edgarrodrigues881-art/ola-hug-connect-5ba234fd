import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Props {
  client: AdminUser;
  detail: any;
}

const ClientProfileTab = ({ client, detail }: Props) => {
  const profile = detail?.profile || {};
  const [form, setForm] = useState({
    full_name: profile.full_name || client.full_name || "",
    phone: profile.phone || client.phone || "",
    company: profile.company || client.company || "",
    admin_notes: profile.admin_notes || client.admin_notes || "",
    risk_flag: profile.risk_flag ?? client.risk_flag ?? false,
    status: profile.status || client.status || "active",
  });
  const { mutate, isPending } = useAdminAction();
  const { toast } = useToast();

  const handleSave = () => {
    mutate(
      { action: "update-client", body: { target_user_id: client.id, ...form } },
      {
        onSuccess: () => toast({ title: "Dados atualizados com sucesso" }),
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 space-y-5">
      <h3 className="text-lg font-semibold text-zinc-200">Dados Pessoais</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-zinc-400 text-xs">Nome Completo</Label>
          <Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs">E-mail</Label>
          <Input value={client.email} disabled className="bg-zinc-900/50 border-zinc-700 text-zinc-500 mt-1" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs">Telefone</Label>
          <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs">Empresa (opcional)</Label>
          <Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs">Status</Label>
          <select
            value={form.status}
            onChange={e => setForm({...form, status: e.target.value})}
            className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 px-3 text-sm"
          >
            <option value="active">Ativo</option>
            <option value="suspended">Suspenso</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Switch checked={form.risk_flag} onCheckedChange={v => setForm({...form, risk_flag: v})} />
        <Label className="text-zinc-300 flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-red-400" /> Marcar como cliente de alto risco
        </Label>
      </div>

      <div>
        <Label className="text-zinc-400 text-xs">Observações Internas (só admin)</Label>
        <Textarea
          value={form.admin_notes}
          onChange={e => setForm({...form, admin_notes: e.target.value})}
          className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1"
          rows={4}
          placeholder="Anotações privadas sobre este cliente..."
        />
      </div>

      <Button onClick={handleSave} disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
        Salvar Alterações
      </Button>
    </div>
  );
};

export default ClientProfileTab;
