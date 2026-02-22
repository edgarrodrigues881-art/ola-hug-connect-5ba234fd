import { useState } from "react";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Plan } from "@/hooks/useBackOfficeStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  plans: Plan[];
  addPlan: (p: Omit<Plan, "id">) => void;
  updatePlan: (id: string, d: Partial<Plan>) => void;
  deletePlan: (id: string) => void;
}

const empty = { name: "", price: 0, instances: 1, days: 30 };

const PlansSection = ({ plans, addPlan, updatePlan, deletePlan }: Props) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(empty);
  const { toast } = useToast();

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: Plan) => { setEditing(p); setForm({ name: p.name, price: p.price, instances: p.instances, days: p.days }); setOpen(true); };

  const handleSave = () => {
    if (!form.name) return;
    if (editing) {
      updatePlan(editing.id, form);
      toast({ title: "Plano atualizado" });
    } else {
      addPlan(form);
      toast({ title: "Plano criado" });
    }
    setOpen(false);
  };

  const copyLink = (plan: Plan) => {
    navigator.clipboard.writeText(`https://checkout.example.com/plan/${plan.id}`);
    toast({ title: "Link copiado!" });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-zinc-200">Planos</h2>
        <Button size="sm" onClick={openNew} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus size={14} className="mr-1" /> Adicionar
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-700">
        <table className="w-full text-sm">
          <thead className="bg-zinc-800 text-zinc-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Preço (R$)</th>
              <th className="px-4 py-3 text-left">Instâncias</th>
              <th className="px-4 py-3 text-left">Dias</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-zinc-500">Nenhum plano cadastrado</td></tr>
            )}
            {plans.map((p) => (
              <tr key={p.id} className="border-t border-zinc-700/50 hover:bg-zinc-800/50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3">{p.price.toFixed(2)}</td>
                <td className="px-4 py-3">{p.instances}</td>
                <td className="px-4 py-3">{p.days}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="text-zinc-400 hover:text-zinc-100 h-8 w-8"><Pencil size={14} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deletePlan(p.id)} className="text-red-400 hover:text-red-300 h-8 w-8"><Trash2 size={14} /></Button>
                  <Button variant="ghost" size="icon" onClick={() => copyLink(p)} className="text-zinc-400 hover:text-zinc-100 h-8 w-8"><Copy size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
            <Input type="number" placeholder="Preço" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
            <Input type="number" placeholder="Instâncias" value={form.instances} onChange={(e) => setForm({ ...form, instances: Number(e.target.value) })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
            <Input type="number" placeholder="Dias" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PlansSection;
