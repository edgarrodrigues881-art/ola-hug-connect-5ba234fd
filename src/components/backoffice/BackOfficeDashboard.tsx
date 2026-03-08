import { useState, useMemo } from "react";
import { useAdminDashboard, type AdminUser } from "@/hooks/useAdmin";
import {
  LayoutDashboard, Users, Bell, ScrollText, Wallet, Database,
  Flame, ListTodo, Server, Heart, Loader2, LogOut,
  Copy, Check, ChevronRight, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AdminOverview from "./AdminOverview";
import AdminClientsTable from "./AdminClientsTable";
import AdminClientDetail from "./AdminClientDetail";
import AdminLogs from "./AdminLogs";
import CostsTab from "./CostsTab";
import AdminGroupsPool from "./AdminGroupsPool";
import AdminWarmupCycles from "./AdminWarmupCycles";
import AdminWarmupJobs from "./AdminWarmupJobs";
import AdminInfra from "./AdminInfra";
import AdminCommunityWarmer from "./AdminCommunityWarmer";

const SUPORTE_NUMERO = "(11) 99999-9999";

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

const NAV_ITEMS = [
  { id: "overview", label: "Visão Geral", shortLabel: "Home", icon: LayoutDashboard, group: "principal", badge: false },
  { id: "clients", label: "Clientes", shortLabel: "Clientes", icon: Users, group: "principal", badge: false },
  { id: "pendencias", label: "Pendências", shortLabel: "Alertas", icon: Bell, group: "principal", badge: true },
  { id: "logs", label: "Auditoria", shortLabel: "Logs", icon: ScrollText, group: "gestao", badge: false },
  { id: "costs", label: "Custos", shortLabel: "Custos", icon: Wallet, group: "gestao", badge: false },
  { id: "groups-pool", label: "Grupo De Aquecimento", shortLabel: "Grupos", icon: Database, group: "operacao", badge: false },
  { id: "warmup-cycles", label: "Ciclos", shortLabel: "Ciclos", icon: Flame, group: "operacao", badge: false },
  { id: "warmup-jobs", label: "Jobs", shortLabel: "Jobs", icon: ListTodo, group: "operacao", badge: false },
  { id: "infra", label: "Infraestrutura", shortLabel: "Infra", icon: Server, group: "sistema", badge: false },
  { id: "community", label: "Comunidade", shortLabel: "Social", icon: Heart, group: "sistema", badge: false },
] as const;

const GROUP_LABELS: Record<string, string> = {
  principal: "Principal",
  gestao: "Gestão",
  operacao: "Operação",
  sistema: "Sistema",
};


const PENDENCIA_CATEGORIES = [
  { label: "Vencendo em 3 dias", filter: (d: number) => d >= 1 && d <= 3, color: "bg-amber-50 border-amber-200" },
  { label: "Vence hoje", filter: (d: number) => d === 0, color: "bg-red-50 border-red-200" },
  { label: "Vencido 1 dia", filter: (d: number) => d === -1, color: "bg-red-50 border-red-200" },
  { label: "Vencido 2-7 dias", filter: (d: number) => d <= -2 && d >= -7, color: "bg-red-50/60 border-red-200" },
  { label: "Vencido 8-30 dias", filter: (d: number) => d <= -8 && d >= -30, color: "bg-gray-50 border-gray-200" },
  { label: "Vencido +30 dias", filter: (d: number) => d < -30, color: "bg-gray-50 border-gray-200" },
];

const PendenciasTab = ({ users, onSelectClient }: { users: AdminUser[]; onSelectClient: (u: AdminUser) => void }) => {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const buildMessage = (u: AdminUser, days: number) => {
    const nome = u.full_name || u.email;
    const plano = u.plan_name || "Sem plano";
    const venc = u.plan_expires_at ? new Date(u.plan_expires_at).toLocaleDateString("pt-BR") : "—";
    if (days > 0) return `Olá ${nome}! Seu plano ${plano} vence em ${days} dia(s) (${venc}). Renove para não perder acesso. Suporte: ${SUPORTE_NUMERO}`;
    if (days === 0) return `${nome}, seu plano ${plano} vence HOJE (${venc})! Renove agora → ${SUPORTE_NUMERO}`;
    return `${nome}, seu plano ${plano} está vencido desde ${venc} (${Math.abs(days)} dias). Suas instâncias estão bloqueadas. Suporte: ${SUPORTE_NUMERO}`;
  };

  const copyMsg = (u: AdminUser, days: number) => {
    navigator.clipboard.writeText(buildMessage(u, days));
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Mensagem copiada!" });
  };

  return (
    <div className="space-y-4">
      {PENDENCIA_CATEGORIES.map(cat => {
        const items = users.filter(u => {
          const d = getDaysLeft(u.plan_expires_at);
          return d !== null && cat.filter(d);
        });
        if (items.length === 0) return null;
        return (
          <div key={cat.label} className={`border rounded-xl p-4 ${cat.color}`}>
            <h3 className="text-sm font-semibold text-foreground mb-3">{cat.label} ({items.length})</h3>
            <div className="space-y-2">
              {items.map(u => {
                const days = getDaysLeft(u.plan_expires_at)!;
                return (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-card/80 rounded-lg px-3 py-2.5 border border-border/60">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.phone || "—"} · {u.plan_name || "Sem plano"}</p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className={`text-xs font-semibold ${days <= 0 ? "text-red-500" : "text-amber-500"}`}>
                        {days <= 0 ? `${Math.abs(days)}d vencido` : `${days}d`}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => copyMsg(u, days)} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                        {copiedId === u.id ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onSelectClient(u)} className="text-primary hover:text-primary/80 h-8 px-2 text-xs font-medium">
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {PENDENCIA_CATEGORIES.every(cat => users.filter(u => { const d = getDaysLeft(u.plan_expires_at); return d !== null && cat.filter(d); }).length === 0) && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
            <Check size={20} className="text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">Nenhuma pendência no momento</p>
        </div>
      )}
    </div>
  );
};

const BackOfficeDashboard = ({ onLogout }: { onLogout: () => void }) => {
  const { data, isLoading, error, refetch } = useAdminDashboard();
  const [selectedClient, setSelectedClient] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  

  const pendingCount = useMemo(() =>
    (data?.users || []).filter(u => {
      const d = getDaysLeft(u.plan_expires_at);
      return d !== null && d <= 3;
    }).length,
  [data?.users]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-32 px-4">
        <p className="text-destructive font-medium">Erro ao carregar dados</p>
        <p className="text-sm text-muted-foreground mt-1">{(error as any)?.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    );
  }

  if (selectedClient) {
    return (
      <div className="min-h-screen bg-background">
        <AdminClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} />
      </div>
    );
  }

  const groups = [...new Set(NAV_ITEMS.map(i => i.group))];
  

  const renderContent = () => {
    switch (activeTab) {
      case "overview": return data ? <AdminOverview data={data} /> : null;
      case "clients": return <AdminClientsTable users={data?.users || []} cycles={data?.cycles || []} adminLogs={data?.admin_logs || []} onSelectClient={setSelectedClient} />;
      case "pendencias": return <PendenciasTab users={data?.users || []} onSelectClient={setSelectedClient} />;
      case "logs": return <AdminLogs />;
      case "costs": return <CostsTab costs={((data as any)?.costs || []) as any[]} onRefresh={() => refetch()} />;
      case "groups-pool": return <AdminGroupsPool />;
      case "warmup-cycles": return <AdminWarmupCycles />;
      case "warmup-jobs": return <AdminWarmupJobs />;
      case "infra": return <AdminInfra />;
      case "community": return <AdminCommunityWarmer />;
      default: return null;
    }
  };

  const currentItem = NAV_ITEMS.find(i => i.id === activeTab);

  return (
    <div className="flex min-h-screen">
      {/* ═══ SIDEBAR (desktop) ═══ */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 lg:z-auto
        w-[240px] h-screen bg-card border-r border-border
        flex-col transition-transform duration-200
        hidden lg:flex
        ${sidebarOpen ? "!flex translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Brand */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-foreground tracking-tight">Painel DG</h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {groups.map(group => (
            <div key={group} className="mb-4">
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] px-3 mb-2">
                {GROUP_LABELS[group]}
              </p>
              <div className="space-y-0.5">
                {NAV_ITEMS.filter(i => i.group === group).map(item => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                        ${isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        }
                      `}
                    >
                      <Icon size={17} className={isActive ? "text-primary" : "text-muted-foreground"} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && pendingCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-150"
          >
            <LogOut size={17} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground p-1">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {currentItem && <currentItem.icon size={18} className="text-muted-foreground shrink-0" />}
            <h2 className="text-base font-semibold text-foreground truncate">{currentItem?.label || "Visão Geral"}</h2>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/60">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Online
          </span>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

    </div>
  );
};

export default BackOfficeDashboard;
