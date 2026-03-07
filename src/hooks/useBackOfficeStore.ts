import { useState, useCallback } from "react";

// Safari < 15.4 fallback for crypto.randomUUID
const safeUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback using crypto.getRandomValues (supported since Safari 11)
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: string) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
  );
};
export interface Plan {
  id: string;
  name: string;
  price: number;
  instances: number;
  days: number;
}

export interface Instance {
  id: string;
  name: string;
  status: "PAUSADA" | "CONECTANDO" | "CONECTADA";
  qrCodeUrl: string;
  createdAt: string;
  expiresAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  planId: string;
  createdAt: string;
  expiresAt: string;
  active: boolean;
  instances: Instance[];
}

const PLANS_KEY = "bo_plans";
const CLIENTS_KEY = "bo_clients";
const CREDITS_KEY = "bo_credits";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useBackOfficeStore() {
  const [plans, setPlansState] = useState<Plan[]>(() => load(PLANS_KEY, []));
  const [clients, setClientsState] = useState<Client[]>(() => load(CLIENTS_KEY, []));
  const [credits, setCreditsState] = useState<number>(() => load(CREDITS_KEY, 1000));

  const setPlans = useCallback((p: Plan[] | ((prev: Plan[]) => Plan[])) => {
    setPlansState((prev) => {
      const next = typeof p === "function" ? p(prev) : p;
      save(PLANS_KEY, next);
      return next;
    });
  }, []);

  const setClients = useCallback((c: Client[] | ((prev: Client[]) => Client[])) => {
    setClientsState((prev) => {
      const next = typeof c === "function" ? c(prev) : c;
      save(CLIENTS_KEY, next);
      return next;
    });
  }, []);

  const setCredits = useCallback((v: number) => {
    setCreditsState(v);
    save(CREDITS_KEY, v);
  }, []);

  const addPlan = useCallback((plan: Omit<Plan, "id">) => {
    setPlans((prev) => [...prev, { ...plan, id: crypto.randomUUID() }]);
  }, [setPlans]);

  const updatePlan = useCallback((id: string, data: Partial<Plan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, [setPlans]);

  const deletePlan = useCallback((id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }, [setPlans]);

  const addClient = useCallback((client: { name: string; email: string; whatsapp: string; planId: string }) => {
    const plan = plans.find((p) => p.id === client.planId);
    if (!plan) return;
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + plan.days);
    const clientId = crypto.randomUUID();
    const instances: Instance[] = Array.from({ length: plan.instances }, (_, i) => ({
      id: crypto.randomUUID(),
      name: `${client.name}-${i + 1}`,
      status: "PAUSADA",
      qrCodeUrl: "",
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    }));
    setClients((prev) => [
      ...prev,
      {
        id: clientId,
        ...client,
        active: true,
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        instances,
      },
    ]);
  }, [plans, setClients]);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, [setClients]);

  const toggleClientActive = useCallback((id: string) => {
    setClients((prev) => prev.map((c) => c.id === id ? { ...c, active: !c.active } : c));
  }, [setClients]);

  const updateInstance = useCallback((clientId: string, instanceId: string, data: Partial<Instance>) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, instances: c.instances.map((inst) => (inst.id === instanceId ? { ...inst, ...data } : inst)) }
          : c
      )
    );
  }, [setClients]);

  const totalClients = clients.filter((c) => c.active !== false).length;
  const totalConnected = clients.filter((c) => c.active !== false).reduce((sum, c) => sum + c.instances.filter((i) => i.status === "CONECTADA").length, 0);

  return {
    plans, addPlan, updatePlan, deletePlan,
    clients, addClient, deleteClient, toggleClientActive, updateInstance,
    credits, setCredits,
    totalClients, totalConnected,
  };
}
