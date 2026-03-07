import { useState, useRef, useCallback } from "react";
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

const METHODS = ["PIX", "Cartão"];

const INSTANCE_PLANS = [
  { name: "Start — 10 instâncias", price: 149.90 },
  { name: "Pro — 30 instâncias", price: 349.90 },
  { name: "Scale — 50 instâncias", price: 549.90 },
  { name: "Elite — 100 instâncias", price: 899.90 },
];

const NOTIFICATION_PRICE = 18.90;

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

// CurrencyInput: stores formatted string, cursor always at end
const CurrencyInput = ({ value, onChange, placeholder, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) => {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) { onChange(""); return; }
    const cents = parseInt(digits, 10);
    const formatted = fmtBRL(cents / 100);
    onChange(formatted);
    // Force cursor to end after React re-render
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.selectionStart = ref.current.value.length;
        ref.current.selectionEnd = ref.current.value.length;
      }
    });
  }, [onChange]);

  return (
    <Input ref={ref} type="text" inputMode="numeric" value={value}
      onChange={handleChange} placeholder={placeholder || "0,00"}
      className={className} />
  );
};

const emptyForm = (planPrice = 0) => ({
  amount: "",
  method: "PIX",
  notes: "",
  paid_at: new Date().toISOString().split("T")[0],
  discount: "",
  fee: "",
  plan_value: planPrice > 0 ? fmtBRL(planPrice) : "",
  selected_plan_price: 0,
  include_notification: false,
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

  const openAdd = () => { setForm(emptyForm(client.plan_price)); setShowAdd(true); };

  const openEdit = (p: any) => {
    setForm({
      amount: Number(p.amount) > 0 ? fmtBRL(Number(p.amount)) : "",
      method: p.method,
      notes: p.notes || "",
      paid_at: p.paid_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      discount: Number(p.discount) > 0 ? fmtBRL(Number(p.discount)) : "",
      fee: Number(p.fee) > 0 ? fmtBRL(Number(p.fee)) : "",
      plan_value: client.plan_price > 0 ? fmtBRL(client.plan_price) : "",
      selected_plan_price: 0,
      include_notification: false,
    });
    });
    setEditPayment(p);
  };

  const buildBody = () => {
    const pv = parseBRL(form.plan_value);
    const am = parseBRL(form.amount);
    const feeVal = parseBRL(form.fee);
    const discount = pv > 0 && am > 0 && pv > am ? pv - am : 0;
    return {
      amount: am,
      method: form.method,
      notes: form.notes,
      paid_at: new Date(form.paid_at).toISOString(),
      discount: Math.round(discount * 100) / 100,
      fee: Math.round(feeVal * 100) / 100,
    };
  };

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
  const totalLiquido = totalPaid - totalFees;

  // Auto-calculate discount: plan_value - amount (if plan > amount)
  const autoDiscount = (() => {
    const pv = parseBRL(form.plan_value);
    const am = parseBRL(form.amount);
    if (pv > 0 && am > 0 && pv > am) return fmtBRL(pv - am);
    return "0,00";
  })();

  const fillPlanValue = () => {
    if (form.plan_value) setForm(f => ({ ...f, amount: f.plan_value }));
  };

  const formFields = (
    <div className="space-y-3">
      <div className="space-y-3">
        <div>
          <Label className="text-muted-foreground text-xs">Plano de Instâncias</Label>
          <select
            value={String(form.selected_plan_price || "")}
            onChange={e => {
              const price = Number(e.target.value) || 0;
              const total = price + (form.include_notification ? NOTIFICATION_PRICE : 0);
              setForm(f => ({
                ...f,
                selected_plan_price: price,
                plan_value: total > 0 ? fmtBRL(total) : "",
              }));
            }}
            className="mt-1 w-full h-10 rounded-md border border-border bg-card text-foreground px-3 text-sm"
          >
            <option value="" className="bg-card text-foreground">Selecione um plano</option>
            {INSTANCE_PLANS.map(p => (
              <option key={p.name} value={String(p.price)} className="bg-card text-foreground">
                {p.name} — R$ {fmtBRL(p.price)}
              </option>
            ))}
          </select>
        </div>
        <div
          onClick={() => {
            const newVal = !form.include_notification;
            const total = (form.selected_plan_price || 0) + (newVal ? NOTIFICATION_PRICE : 0);
            setForm(f => ({
              ...f,
              include_notification: newVal,
              plan_value: total > 0 ? fmtBRL(total) : "",
            }));
          }}
          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
            form.include_notification
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-border bg-muted/20 hover:border-muted-foreground/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.include_notification} readOnly
              className="w-4 h-4 rounded border-border accent-emerald-500" />
            <span className="text-sm text-foreground">Relatório via WhatsApp</span>
          </div>
          <span className={`text-xs font-semibold ${form.include_notification ? "text-emerald-500" : "text-muted-foreground"}`}>
            + R$ {fmtBRL(NOTIFICATION_PRICE)}/mês
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-muted-foreground text-xs">Valor do Plano (R$)</Label>
            <Input type="text" readOnly value={form.plan_value || "0,00"}
              className="bg-muted border-border text-foreground font-medium mt-1 cursor-default" />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Valor Recebido (R$)</Label>
            <CurrencyInput value={form.amount}
              onChange={v => setForm(f => ({ ...f, amount: v }))}
              className="bg-card border-border text-foreground mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Valor Recebido (R$)</Label>
          <CurrencyInput value={form.amount}
            onChange={v => setForm(f => ({ ...f, amount: v }))}
            className="bg-card border-border text-foreground mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <Label className="text-muted-foreground text-xs">Desconto (R$)</Label>
          <Input type="text" readOnly value={autoDiscount}
            className="bg-muted border-border text-orange-500 font-medium mt-1 cursor-default" />
          <p className="text-[10px] text-muted-foreground mt-0.5">Plano − Recebido</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Taxa / Custo (R$)</Label>
          <CurrencyInput value={form.fee}
            onChange={v => setForm(f => ({ ...f, fee: v }))}
            className="bg-card border-border text-foreground mt-1" />
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Líquido (R$)</Label>
          <Input type="text" readOnly value={(() => {
            const am = parseBRL(form.amount);
            const fe = parseBRL(form.fee);
            const liq = am - fe;
            return liq > 0 ? fmtBRL(liq) : "0,00";
          })()}
            className="bg-muted border-border text-green-500 font-bold mt-1 cursor-default" />
          <p className="text-[10px] text-muted-foreground mt-0.5">Recebido − Taxa</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Método</Label>
          <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
            className="mt-1 w-full h-10 rounded-md border border-border bg-card text-foreground px-3 text-sm">
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">Data do Pagamento</Label>
        <Input type="date" value={form.paid_at}
          onChange={e => setForm(f => ({ ...f, paid_at: e.target.value }))}
          className="bg-card border-border text-foreground mt-1" />
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">Observação</Label>
        <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
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
          <p className="text-xs text-muted-foreground">Líquido (No Bolso)</p>
          <p className="text-xl font-bold text-green-500 mt-1">R$ {totalLiquido.toFixed(2)}</p>
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
          {formFields}
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
          {formFields}
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
