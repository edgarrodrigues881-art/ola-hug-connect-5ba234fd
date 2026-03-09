import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, Wifi, WifiOff, QrCode, Send, Flame, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Plan, Client, Instance } from "@/hooks/useBackOfficeStore";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Props {
  clients: Client[];
  plans: Plan[];
  addClient: (c: { name: string; email: string; whatsapp: string; planId: string }) => void;
  deleteClient: (id: string) => void;
  toggleClientActive: (id: string) => void;
  updateInstance: (clientId: string, instanceId: string, data: Partial<Instance>) => void;
}

const EVOLUTION_BASE = "http://localhost:3000";

const ClientsSection = ({ clients, plans, addClient, deleteClient, toggleClientActive, updateInstance }: Props) => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", planId: "" });
  const [qrModal, setQrModal] = useState<{ url: string; name: string } | null>(null);
  const [warmupModal, setWarmupModal] = useState<{ clientId: string; instanceId: string; name: string } | null>(null);
  const [bulkModal, setBulkModal] = useState<{ clientId: string; instanceId: string; name: string } | null>(null);
  const [warmupForm, setWarmupForm] = useState({ messages: 10, interval: 5, contacts: "" });
  const [connecting, setConnecting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAdd = () => {
    if (!form.name || !form.planId) return;
    addClient(form);
    toast({ title: "Cliente criado com instâncias" });
    setForm({ name: "", email: "", whatsapp: "", planId: "" });
    setOpen(false);
  };

  const toggleExpand = (id: string) => setExpanded(expanded === id ? null : id);

  const connectInstance = async (clientId: string, inst: Instance) => {
    setConnecting(inst.id);
    updateInstance(clientId, inst.id, { status: "CONECTANDO" });
    try {
      await fetch(`${EVOLUTION_BASE}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName: inst.name, token: "evolution_token_fixo" }),
      });

      // Poll for QR
      const pollQr = async (attempts = 0): Promise<string | null> => {
        if (attempts > 30) return null;
        try {
          const res = await fetch(`${EVOLUTION_BASE}/instance/qr/${inst.name}`);
          const data = await res.json();
          if (data.base64 || data.qrcode) return data.base64 || data.qrcode;
        } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 2000));
        return pollQr(attempts + 1);
      };

      const qr = await pollQr();
      if (qr) {
        setQrModal({ url: qr, name: inst.name });
        updateInstance(clientId, inst.id, { qrCodeUrl: qr });

        // Poll for connected status
        const pollState = async () => {
          for (let i = 0; i < 60; i++) {
            try {
              const res = await fetch(`${EVOLUTION_BASE}/instance/state/${inst.name}`);
              const data = await res.json();
              if (data.state === "open" || data.state === "CONNECTED" || data.status === "CONNECTED") {
                updateInstance(clientId, inst.id, { status: "CONECTADA" });
                setQrModal(null);
                toast({ title: `${inst.name} conectada!` });
                return;
              }
            } catch { /* ignore */ }
            await new Promise((r) => setTimeout(r, 2000));
          }
        };
        pollState();
      } else {
        toast({ title: "Não foi possível obter QR", variant: "destructive" });
        updateInstance(clientId, inst.id, { status: "PAUSADA" });
      }
    } catch {
      toast({ title: "Erro ao conectar (servidor offline?)", variant: "destructive" });
      updateInstance(clientId, inst.id, { status: "PAUSADA" });
    }
    setConnecting(null);
  };

  const disconnectInstance = async (clientId: string, inst: Instance) => {
    try {
      await fetch(`${EVOLUTION_BASE}/instance/${inst.name}`, { method: "DELETE" });
      updateInstance(clientId, inst.id, { status: "PAUSADA", qrCodeUrl: "" });
      toast({ title: `${inst.name} desligada` });
    } catch {
      toast({ title: "Erro ao desligar", variant: "destructive" });
    }
  };

  const startWarmup = async () => {
    if (!warmupModal) return;
    try {
      await fetch(`${EVOLUTION_BASE}/warm-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName: warmupModal.name,
          messages: warmupForm.messages,
          interval: warmupForm.interval,
          contacts: warmupForm.contacts.split("\n").filter(Boolean),
        }),
      });
      toast({ title: "Aquecimento iniciado" });
      setWarmupModal(null);
    } catch {
      toast({ title: "Erro ao iniciar aquecimento", variant: "destructive" });
    }
  };

  const handleBulkSend = async (file: File | null) => {
    if (!file || !bulkModal) return;
    const text = await file.text();
    try {
      await fetch(`${EVOLUTION_BASE}/bulk-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName: bulkModal.name, csv: text }),
      });
      toast({ title: "Disparo enviado" });
      setBulkModal(null);
    } catch {
      toast({ title: "Erro no disparo", variant: "destructive" });
    }
  };

  const statusBadge = (s: Instance["status"]) => {
    const colors = { PAUSADA: "bg-zinc-600", CONECTANDO: "bg-yellow-600", CONECTADA: "bg-green-600" };
    return <Badge className={`${colors[s]} text-white text-[10px] px-2`}>{s}</Badge>;
  };

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? "—";

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-zinc-200">Clientes & Instâncias</h2>
        <Button size="sm" onClick={() => setOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
          <Plus size={14} className="mr-1" /> Novo Cliente
        </Button>
      </div>

      {clients.length === 0 && (
        <div className="space-y-2">
          <Skeleton className="h-12 bg-zinc-800" />
          <Skeleton className="h-12 bg-zinc-800" />
          <p className="text-center text-zinc-500 text-sm mt-2">Nenhum cliente cadastrado</p>
        </div>
      )}

      <div className="space-y-2">
        {clients.map((c) => (
          <div key={c.id} className={`border border-zinc-700 rounded-xl overflow-hidden ${c.active === false ? 'opacity-50' : ''}`}>
            {/* Client row */}
            <div
              className="flex items-center gap-3 px-4 py-3 bg-zinc-800 cursor-pointer hover:bg-zinc-800/80"
              onClick={() => toggleExpand(c.id)}
            >
              {expanded === c.id ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
              <span className="font-medium flex-1">{c.name}</span>
              {c.active === false && <Badge className="bg-red-600/80 text-white text-[10px] px-2">Inativo</Badge>}
              <span className="text-xs text-zinc-400">{c.email}</span>
              <span className="text-xs text-zinc-500 ml-2">{planName(c.planId)}</span>
              <span className="text-xs text-zinc-500 ml-2">Exp: {new Date(c.expiresAt).toLocaleDateString("pt-BR")}</span>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toggleClientActive(c.id); }} className={`h-7 w-7 ml-1 ${c.active === false ? 'text-green-400 hover:text-green-300' : 'text-yellow-400 hover:text-yellow-300'}`} title={c.active === false ? 'Ativar' : 'Desativar'}>
                {c.active === false ? <UserCheck size={14} /> : <UserX size={14} />}
              </Button>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteClient(c.id); }} className="text-red-400 hover:text-red-300 h-7 w-7 ml-1">
                <Trash2 size={14} />
              </Button>
            </div>

            {/* Instances */}
            {expanded === c.id && (
              <div className="bg-zinc-900 divide-y divide-zinc-800">
                {c.instances.map((inst) => (
                  <div key={inst.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                    <span className="flex-1 font-mono text-xs text-zinc-300">{inst.name}</span>
                    {statusBadge(inst.status)}
                    {inst.status === "PAUSADA" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={connecting === inst.id}
                        onClick={() => connectInstance(c.id, inst)}
                        className="h-7 text-xs border-zinc-600 text-zinc-300"
                      >
                        <Wifi size={12} className="mr-1" /> Ligar
                      </Button>
                    )}
                    {inst.status === "CONECTADA" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => disconnectInstance(c.id, inst)} className="h-7 text-xs border-zinc-600 text-zinc-300">
                          <WifiOff size={12} className="mr-1" /> Desligar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setWarmupModal({ clientId: c.id, instanceId: inst.id, name: inst.name }); setWarmupForm({ messages: 10, interval: 5, contacts: "" }); }} className="h-7 text-xs border-zinc-600 text-orange-300">
                          <Flame size={12} className="mr-1" /> Aquecer
                        </Button>
                      </>
                    )}
                    {inst.qrCodeUrl && inst.status === "CONECTANDO" && (
                      <Button size="sm" variant="ghost" onClick={() => setQrModal({ url: inst.qrCodeUrl, name: inst.name })} className="h-7 text-xs text-zinc-400">
                        <QrCode size={12} className="mr-1" /> QR
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Client Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
          <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
            <Input placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
            <Input placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
            <Select value={form.planId} onValueChange={(v) => setForm({ ...form, planId: v })}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-zinc-100">{p.name} — R$ {p.price.toFixed(2)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700 text-white">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      <Dialog open={!!qrModal} onOpenChange={() => setQrModal(null)}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100 max-w-xs">
          <DialogHeader><DialogTitle>QR Code — {qrModal?.name}</DialogTitle></DialogHeader>
          {qrModal?.url && <img src={qrModal.url} alt="QR Code" className="w-full rounded-lg" />}
          <p className="text-xs text-zinc-400 text-center">Escaneie com o WhatsApp</p>
        </DialogContent>
      </Dialog>

      {/* Warmup Modal */}
      <Dialog open={!!warmupModal} onOpenChange={() => setWarmupModal(null)}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
          <DialogHeader><DialogTitle>Aquecimento — {warmupModal?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="number" placeholder="Nº mensagens" value={warmupForm.messages} onChange={(e) => setWarmupForm({ ...warmupForm, messages: Number(e.target.value) })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
            <Input type="number" placeholder="Intervalo (s)" value={warmupForm.interval} onChange={(e) => setWarmupForm({ ...warmupForm, interval: Number(e.target.value) })} className="bg-zinc-900 border-zinc-700 text-zinc-100" />
            <Textarea placeholder="Contatos (um por linha)" value={warmupForm.contacts} onChange={(e) => setWarmupForm({ ...warmupForm, contacts: e.target.value })} className="bg-zinc-900 border-zinc-700 text-zinc-100" rows={5} />
          </div>
          <DialogFooter>
            <Button onClick={startWarmup} className="bg-orange-600 hover:bg-orange-700 text-white">Iniciar Aquecimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </section>
  );
};

export default ClientsSection;
