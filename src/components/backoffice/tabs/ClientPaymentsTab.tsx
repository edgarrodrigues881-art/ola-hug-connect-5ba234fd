import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Plus, Trash2, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  client: AdminUser;
  detail: any;
}

const ClientPaymentsTab = ({ client }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: adminAction, isPending: actionPending } = useAdminAction();

  // Fetch payments
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin-payments", client.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-data?action=list-payments", {
        body: { target_user_id: client.id },
      });
      if (error) throw error;
      return data?.payments || [];
    },
  });

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    method: "PIX",
    notes: "",
    paid_at: new Date().toISOString().split("T")[0],
  });

  const addPayment = () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    adminAction(
      {
        action: "add-payment",
        body: {
          target_user_id: client.id,
          amount: Number(form.amount),
          method: form.method,
          notes: form.notes,
          paid_at: new Date(form.paid_at).toISOString(),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Pagamento registrado" });
          setShowAdd(false);
          setForm({ amount: "", method: "PIX", notes: "", paid_at: new Date().toISOString().split("T")[0] });
          queryClient.invalidateQueries({ queryKey: ["admin-payments", client.id] });
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const deletePayment = (paymentId: string) => {
    adminAction(
      { action: "delete-payment", body: { payment_id: paymentId, target_user_id: client.id } },
      {
        onSuccess: () => {
          toast({ title: "Pagamento removido" });
          queryClient.invalidateQueries({ queryKey: ["admin-payments", client.id] });
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  // Stats
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const ticketMedio = payments.length > 0 ? totalPaid / payments.length : 0;

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={20} className="text-green-400" />
          <h3 className="text-lg font-semibold text-zinc-200">Histórico Financeiro</h3>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus size={14} className="mr-1" /> Registrar Pagamento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
          <p className="text-xs text-zinc-400">Total Pago</p>
          <p className="text-xl font-bold text-green-400 mt-1">R$ {totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
          <p className="text-xs text-zinc-400">Ticket Médio</p>
          <p className="text-xl font-bold text-zinc-200 mt-1">R$ {ticketMedio.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
          <p className="text-xs text-zinc-400">Pagamentos</p>
          <p className="text-xl font-bold text-zinc-200 mt-1">{payments.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="border border-zinc-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Data</th>
              <th className="text-left px-4 py-3">Valor</th>
              <th className="text-left px-4 py-3">Método</th>
              <th className="text-left px-4 py-3">Observação</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-400" /></td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-zinc-500">Nenhum pagamento registrado</td></tr>
            ) : payments.map((p: any) => (
              <tr key={p.id} className="hover:bg-zinc-800/50">
                <td className="px-4 py-3 text-zinc-300 text-xs">{new Date(p.paid_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-green-400 font-medium">R$ {Number(p.amount).toFixed(2)}</td>
                <td className="px-4 py-3 text-zinc-400">{p.method}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs max-w-[200px] truncate">{p.notes || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => deletePayment(p.id)} className="text-red-400 hover:text-red-300 h-8 w-8">
                    <Trash2 size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add payment dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-zinc-400 text-xs">Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1"
                placeholder="149.90"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Método</Label>
              <select
                value={form.method}
                onChange={e => setForm({ ...form, method: e.target.value })}
                className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 px-3 text-sm"
              >
                <option value="PIX">PIX</option>
                <option value="Cartão">Cartão</option>
                <option value="Boleto">Boleto</option>
                <option value="Transferência">Transferência</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Data do Pagamento</Label>
              <Input
                type="date"
                value={form.paid_at}
                onChange={e => setForm({ ...form, paid_at: e.target.value })}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1"
              />
            </div>
            <div>
              <Label className="text-zinc-400 text-xs">Observação</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1"
                rows={2}
                placeholder="Ex: Pagamento referente ao mês de março"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addPayment} disabled={actionPending} className="bg-green-600 hover:bg-green-700 text-white">
              {actionPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPaymentsTab;
