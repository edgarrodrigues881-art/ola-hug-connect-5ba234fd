import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Plus, Trash2, Loader2, Pencil } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  client: AdminUser;
  detail: any;
}

const METHODS = ["PIX", "Cartão", "Boleto", "Transferência", "Outro"];

// Format number to BRL display: 10000 → "10.000,00"
function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Parse BRL string back to number: "10.000,00" → 10000
function parseBRL(s: string): number {
  const clean = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

// Mask input as user types: raw digits → formatted BRL
function maskCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return fmtBRL(cents / 100);
}

const emptyForm = () => ({
  amount: "",
  method: "PIX",
  notes: "",
  paid_at: new Date().toISOString().split("T")[0],
  discount: "",
  fee: "",
});

const ClientPaymentsTab = ({ client }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: adminAction, isPending: actionPending } = useAdminAction();

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
  const [editPayment, setEditPayment] = useState<any>(null);
  const [form, setForm] = useState(emptyForm());

  const openAdd = () => { setForm(emptyForm()); setShowAdd(true); };

  const openEdit = (p: any) => {
    setForm({
      amount: Number(p.amount) > 0 ? fmtBRL(Number(p.amount)) : "",
      method: p.method,
      notes: p.notes || "",
      paid_at: p.paid_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      discount: Number(p.discount) > 0 ? fmtBRL(Number(p.discount)) : "",
      fee: Number(p.fee) > 0 ? fmtBRL(Number(p.fee)) : "",
    });
    setEditPayment(p);
  };

  const buildBody = () => ({
    amount: parseBRL(form.amount),
    method: form.method,
    notes: form.notes,
    paid_at: new Date(form.paid_at).toISOString(),
    discount: parseBRL(form.discount),
    fee: parseBRL(form.fee),
  });

  const addPayment = () => {
    if (!form.amount || parseBRL(form.amount) <= 0) return;
    adminAction(
      { action: "add-payment", body: { target_user_id: client.id, ...buildBody() } },
      {
        onSuccess: () => {
          toast({ title: "Pagamento registrado" });
          setShowAdd(false);
          setForm(emptyForm());
          queryClient.invalidateQueries({ queryKey: ["admin-payments", client.id] });
          queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const saveEdit = () => {
    if (!form.amount || parseBRL(form.amount) <= 0) return;
    adminAction(
      { action: "update-payment", body: { payment_id: editPayment.id, target_user_id: client.id, ...buildBody() } },
      {
        onSuccess: () => {
          toast({ title: "Pagamento atualizado" });
          setEditPayment(null);
          queryClient.invalidateQueries({ queryKey: ["admin-payments", client.id] });
          queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
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
          queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const totalDiscount = payments.reduce((s: number, p: any) => s + Number(p.discount || 0), 0);
  const totalFees = payments.reduce((s: number, p: any) => s + Number(p.fee || 0), 0);
  const ticketMedio = payments.length > 0 ? totalPaid / payments.length : 0;

  const PaymentFormFields = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-muted-foreground text-xs">Valor Recebido (R$)</Label>
          <Input type="text" inputMode="numeric" value={form.amount}
            onChange={e => setForm({ ...form, amount: maskCurrency(e.target.value) })}
            className="bg-card border-border text-foreground mt-1" placeholder="0,00" />
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Método</Label>
          <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}
            className="mt-1 w-full h-10 rounded-md border border-border bg-card text-foreground px-3 text-sm">
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-muted-foreground text-xs">Desconto (R$)</Label>
          <Input type="text" inputMode="numeric" value={form.discount}
            onChange={e => setForm({ ...form, discount: maskCurrency(e.target.value) })}
            className="bg-card border-border text-foreground mt-1" placeholder="0,00" />
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Taxa / Custo (R$)</Label>
          <Input type="text" inputMode="numeric" value={form.fee}
            onChange={e => setForm({ ...form, fee: maskCurrency(e.target.value) })}
            className="bg-card border-border text-foreground mt-1" placeholder="0,00" />
        </div>
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">Data do Pagamento</Label>
        <Input type="date" value={form.paid_at}
          onChange={e => setForm({ ...form, paid_at: e.target.value })}
          className="bg-card border-border text-foreground mt-1" />
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">Observação</Label>
        <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
          className="bg-card border-border text-foreground mt-1" rows={2}
          placeholder="Ex: Pagamento referente ao mês de março" />
      </div>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={20} className="text-green-500" />
          <h3 className="text-lg font-semibold text-foreground">Histórico Financeiro</h3>
        </div>
        <Button size="sm" onClick={openAdd} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus size={14} className="mr-1" /> Registrar Pagamento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground">Total Recebido</p>
          <p className="text-xl font-bold text-green-500 mt-1">R$ {totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground">Descontos</p>
          <p className="text-xl font-bold text-orange-500 mt-1">R$ {totalDiscount.toFixed(2)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground">Taxas / Custos</p>
          <p className="text-xl font-bold text-destructive mt-1">R$ {totalFees.toFixed(2)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground">Ticket Médio</p>
          <p className="text-xl font-bold text-foreground mt-1">R$ {ticketMedio.toFixed(2)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3">Data</th>
              <th className="text-left px-4 py-3">Valor</th>
              <th className="text-left px-4 py-3">Desconto</th>
              <th className="text-left px-4 py-3">Taxa</th>
              <th className="text-left px-4 py-3">Método</th>
              <th className="text-left px-4 py-3">Obs</th>
              <th className="text-right px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum pagamento registrado</td></tr>
            ) : payments.map((p: any) => (
              <tr key={p.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-foreground text-xs">{new Date(p.paid_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-green-500 font-medium">R$ {Number(p.amount).toFixed(2)}</td>
                <td className="px-4 py-3 text-orange-500 text-xs">{Number(p.discount || 0) > 0 ? `R$ ${Number(p.discount).toFixed(2)}` : "—"}</td>
                <td className="px-4 py-3 text-destructive text-xs">{Number(p.fee || 0) > 0 ? `R$ ${Number(p.fee).toFixed(2)}` : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.method}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs max-w-[150px] truncate">{p.notes || "—"}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="text-muted-foreground hover:text-foreground h-8 w-8">
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deletePayment(p.id)} className="text-destructive hover:text-destructive/80 h-8 w-8">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <PaymentFormFields />
          <DialogFooter>
            <Button onClick={addPayment} disabled={actionPending} className="bg-green-600 hover:bg-green-700 text-white">
              {actionPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editPayment} onOpenChange={(open) => { if (!open) setEditPayment(null); }}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader><DialogTitle>Editar Pagamento</DialogTitle></DialogHeader>
          <PaymentFormFields />
          <DialogFooter>
            <Button onClick={saveEdit} disabled={actionPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {actionPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientPaymentsTab;
