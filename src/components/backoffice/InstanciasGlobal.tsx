import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, QrCode, WifiOff, Server, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { Client, Plan, Instance } from "@/hooks/useBackOfficeStore";

interface Props {
  clients: Client[];
  plans: Plan[];
  updateInstance: (clientId: string, instanceId: string, data: Partial<Instance>) => void;
}

const EVOLUTION_BASE = "http://localhost:3000";

interface FlatInstance {
  clientId: string;
  clientName: string;
  instance: Instance;
}

const statusOrder: Record<string, number> = {
  CONECTADA: 0,
  CONECTANDO: 1,
  PAUSADA: 2,
};

const statusLabel: Record<string, string> = {
  CONECTADA: "Conectada",
  CONECTANDO: "Conectando",
  PAUSADA: "Desconectada",
};

const statusColor: Record<string, string> = {
  CONECTADA: "bg-green-600",
  CONECTANDO: "bg-yellow-600",
  PAUSADA: "bg-zinc-600",
};

type FilterStatus = "ALL" | "CONECTADA" | "PAUSADA" | "CONECTANDO";

const diffDays = (dateStr: string): number => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const InstanciasGlobal: React.FC<Props> = React.memo(({ clients, plans, updateInstance }) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState<{ url: string; name: string } | null>(null);
  const { toast } = useToast();

  // Compute total slots from plans of active clients
  const slotsTotais = useMemo(() => {
    return clients.reduce((sum, c) => {
      const plan = plans.find((p) => p.id === c.planId);
      return sum + (plan?.instances ?? 0);
    }, 0);
  }, [clients, plans]);

  // Flatten all instances
  const allInstances = useMemo<FlatInstance[]>(() => {
    return clients.flatMap((c) =>
      c.instances.map((inst) => ({
        clientId: c.id,
        clientName: c.name,
        instance: inst,
      }))
    );
  }, [clients]);

  const slotsOcupados = allInstances.length;
  const slotsLivres = slotsTotais - slotsOcupados;

  // Filtered + sorted list
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allInstances
      .filter((f) => {
        if (filter !== "ALL" && f.instance.status !== filter) return false;
        if (q && !f.instance.name.toLowerCase().includes(q) && !f.clientName.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (statusOrder[a.instance.status] ?? 9) - (statusOrder[b.instance.status] ?? 9));
  }, [allInstances, search, filter]);

  // Initial loading skeleton
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Polling: every 10s refresh status of visible instances
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(async () => {
      const visible = filtered.slice(0, 50); // limit polling
      await Promise.allSettled(
        visible.map(async (f) => {
          try {
            const res = await fetch(`${EVOLUTION_BASE}/instance/state/${f.instance.name}`);
            if (!res.ok) return;
            const data = await res.json();
            let newStatus: Instance["status"] = "PAUSADA";
            if (data.state === "open" || data.state === "CONNECTED" || data.status === "CONNECTED") {
              newStatus = "CONECTADA";
            } else if (data.state === "connecting" || data.status === "CONNECTING") {
              newStatus = "CONECTANDO";
            }
            if (newStatus !== f.instance.status) {
              updateInstance(f.clientId, f.instance.id, { status: newStatus });
            }
          } catch {
            // server offline, ignore
          }
        })
      );
    }, 10000);
    return () => clearInterval(interval);
  }, [filtered, loading, updateInstance]);

  const handleViewQr = useCallback(async (inst: Instance) => {
    try {
      const res = await fetch(`${EVOLUTION_BASE}/instance/qr/${inst.name}`);
      const data = await res.json();
      const url = data.base64 || data.qrcode || "";
      if (url) {
        setQrModal({ url, name: inst.name });
      } else {
        toast({ title: "QR não disponível", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao buscar QR", variant: "destructive" });
    }
  }, [toast]);

  const handleDisconnect = useCallback(async (clientId: string, inst: Instance) => {
    try {
      await fetch(`${EVOLUTION_BASE}/instance/${inst.name}`, { method: "DELETE" });
      updateInstance(clientId, inst.id, { status: "PAUSADA", qrCodeUrl: "" });
      toast({ title: `${inst.name} desligada` });
    } catch {
      toast({ title: "Erro ao desligar", variant: "destructive" });
    }
  }, [updateInstance, toast]);

  const filters: { label: string; value: FilterStatus }[] = [
    { label: "Todos", value: "ALL" },
    { label: "Conectadas", value: "CONECTADA" },
    { label: "Desconectadas", value: "PAUSADA" },
    { label: "Conectando", value: "CONECTANDO" },
  ];

  if (loading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-8 w-64 bg-zinc-800" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20 bg-zinc-800" />
          <Skeleton className="h-20 bg-zinc-800" />
          <Skeleton className="h-20 bg-zinc-800" />
        </div>
        <Skeleton className="h-10 bg-zinc-800" />
        <Skeleton className="h-48 bg-zinc-800" />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-200">Todas as Instâncias do Site</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400"><Server size={20} /></div>
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Total de Instâncias</p>
            <p className="text-2xl font-bold">{slotsOcupados}</p>
          </div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-600/20 text-green-400"><Server size={20} /></div>
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Slots Ocupados</p>
            <p className="text-2xl font-bold">{slotsOcupados} / {slotsTotais}</p>
          </div>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400"><Server size={20} /></div>
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wide">Slots Livres</p>
            <p className="text-2xl font-bold">{slotsLivres}</p>
          </div>
        </div>
      </div>

      {/* Warning banner */}
      {slotsLivres >= 0 && slotsLivres < 10 && (
        <div className="flex items-center gap-2 bg-yellow-900/40 border border-yellow-700/50 text-yellow-300 rounded-lg px-4 py-2.5 text-sm">
          <AlertTriangle size={16} />
          Restam apenas {slotsLivres} slots — considere adquirir mais instâncias.
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Buscar por instância ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100"
          />
        </div>
        <div className="flex gap-1.5">
          {filters.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? "default" : "outline"}
              onClick={() => setFilter(f.value)}
              className={
                filter === f.value
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
              }
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border border-zinc-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Cliente</th>
                <th className="text-left px-4 py-3">Nome da Instância</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Criada em</th>
                <th className="text-left px-4 py-3">Dias Ativa</th>
                <th className="text-left px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-zinc-500">
                    Nenhuma instância encontrada
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.instance.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 text-zinc-300">{f.clientName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-200">{f.instance.name}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${statusColor[f.instance.status]} text-white text-[10px] px-2`}>
                        {statusLabel[f.instance.status] ?? f.instance.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {new Date(f.instance.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {diffDays(f.instance.createdAt)}d
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewQr(f.instance)}
                          className="h-7 text-xs border-zinc-600 text-zinc-300"
                        >
                          <QrCode size={12} className="mr-1" /> Ver QR
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDisconnect(f.clientId, f.instance)}
                          className="h-7 text-xs border-zinc-600 text-red-400 hover:text-red-300"
                        >
                          <WifiOff size={12} className="mr-1" /> Desligar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Modal */}
      <Dialog open={!!qrModal} onOpenChange={() => setQrModal(null)}>
        <DialogContent className="bg-zinc-800 border-zinc-700 text-zinc-100 max-w-xs">
          <DialogHeader>
            <DialogTitle>QR Code — {qrModal?.name}</DialogTitle>
          </DialogHeader>
          {qrModal?.url && <img src={qrModal.url} alt="QR Code" className="w-full rounded-lg" />}
          <p className="text-xs text-zinc-400 text-center">Escaneie com o WhatsApp</p>
        </DialogContent>
      </Dialog>
    </section>
  );
});

InstanciasGlobal.displayName = "InstanciasGlobal";

export default InstanciasGlobal;
