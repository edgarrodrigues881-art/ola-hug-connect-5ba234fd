import { useState, useCallback, lazy, Suspense, memo, useMemo, useEffect } from "react";
import { useAdminDashboard, type AdminUser } from "@/hooks/useAdmin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, Bell, ScrollText, Wallet, Database,
  Flame, ListTodo, Server, Heart, Loader2, LogOut,
  ChevronRight, Menu, X, BookOpen, MessageCircle, Clock,
  AlertTriangle, XCircle, Skull, Check, Mail, Plug, Sparkles, Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Lazy load all tab components
const AdminOverview = lazy(() => import("./AdminOverview"));
const AdminClientsTable = lazy(() => import("./AdminClientsTable"));
const AdminClientDetail = lazy(() => import("./AdminClientDetail"));
const AdminLogs = lazy(() => import("./AdminLogs"));
const CostsTab = lazy(() => import("./CostsTab"));
const AdminGroupsPool = lazy(() => import("./AdminGroupsPool"));
const AdminWarmupCycles = lazy(() => import("./AdminWarmupCycles"));
const AdminWarmupJobs = lazy(() => import("./AdminWarmupJobs"));
const AdminInfra = lazy(() => import("./AdminInfra"));
const AdminCommunityWarmer = lazy(() => import("./AdminCommunityWarmer"));
const AdminWarmupRoadmap = lazy(() => import("./AdminWarmupRoadmap"));
const AdminMessages = lazy(() => import("./AdminMessages"));
const AdminConexao = lazy(() => import("./AdminConexao"));
const AdminTokensGlobal = lazy(() => import("./AdminTokensGlobal"));
const MessageGeneratorPreview = lazy(() => import("@/components/warmup/MessageGeneratorPreview").then(m => ({ default: m.MessageGeneratorPreview })));

const MESSAGE_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  WELCOME: { label: "Boas-vindas", icon: Mail, color: "text-emerald-500" },
  DUE_3_DAYS: { label: "Faltam 3 dias", icon: Clock, color: "text-yellow-500" },
  DUE_TODAY: { label: "Vence hoje", icon: AlertTriangle, color: "text-orange-500" },
  OVERDUE_1: { label: "Vencido 1 dia", icon: XCircle, color: "text-destructive" },
  OVERDUE_7: { label: "Vencido 7 dias", icon: XCircle, color: "text-destructive" },
  OVERDUE_30: { label: "Vencido 30 dias", icon: Skull, color: "text-destructive" },
};

function getDaysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

const NAV_ITEMS = [
  { id: "overview", label: "Visão Geral", shortLabel: "Home", icon: LayoutDashboard, group: "principal", badge: false },
  { id: "clients", label: "Clientes", shortLabel: "Clientes", icon: Users, group: "principal", badge: false },
  { id: "messages", label: "Relatório WhatsApp", shortLabel: "Relatório", icon: MessageCircle, group: "principal", badge: false },
  { id: "pendencias", label: "Pendências", shortLabel: "Alertas", icon: Bell, group: "principal", badge: true },
  { id: "conexao", label: "Conexão", shortLabel: "Conexão", icon: Plug, group: "principal", badge: false },
  { id: "logs", label: "Auditoria", shortLabel: "Logs", icon: ScrollText, group: "gestao", badge: false },
  { id: "costs", label: "Custos", shortLabel: "Custos", icon: Wallet, group: "gestao", badge: false },
  { id: "groups-pool", label: "Grupo De Aquecimento", shortLabel: "Grupos", icon: Database, group: "operacao", badge: false },
  { id: "warmup-cycles", label: "Ciclos", shortLabel: "Ciclos", icon: Flame, group: "operacao", badge: false },
  { id: "warmup-jobs", label: "Jobs", shortLabel: "Jobs", icon: ListTodo, group: "operacao", badge: false },
  { id: "infra", label: "Infraestrutura", shortLabel: "Infra", icon: Server, group: "sistema", badge: false },
  { id: "tokens-global", label: "Tokens Globais", shortLabel: "Tokens", icon: Key, group: "sistema", badge: false },
  { id: "community", label: "Comunidade", shortLabel: "Social", icon: Heart, group: "sistema", badge: false },
  { id: "warmup-roadmap", label: "Roteiro de Aquecimento", shortLabel: "Roteiro", icon: BookOpen, group: "operacao", badge: false },
  { id: "msg-generator", label: "Gerador de Mensagens", shortLabel: "Gerador", icon: Sparkles, group: "operacao", badge: false },
] as const;

const GROUP_LABELS: Record<string, string> = {
  principal: "Principal",
  gestao: "Gestão",
  operacao: "Operação",
  sistema: "Sistema",
};

const GROUPS = [...new Set(NAV_ITEMS.map(i => i.group))];

const PendenciasTab = memo(() => {
  const { data: queueItems = [], isLoading } = useQuery({
    queryKey: ["message-queue-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_queue" as any)
        .select("id, user_id, client_name, client_email, client_phone, plan_name, expires_at, message_type, status, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 30000,
  });

  // Group by message_type
  const grouped = useMemo(() => {
    if (queueItems.length === 0) return [];
    const groups: Record<string, any[]> = {};
    for (const item of queueItems) {
      const type = item.message_type as string;
      if (!groups[type]) groups[type] = [];
      groups[type].push(item);
    }
    return Object.entries(groups).sort(([a], [b]) => {
      const order = ["WELCOME", "DUE_3_DAYS", "DUE_TODAY", "OVERDUE_1", "OVERDUE_7", "OVERDUE_30"];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [queueItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (queueItems.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
          <Check size={20} className="text-primary" />
        </div>
        <p className="text-muted-foreground text-sm">Nenhuma mensagem pendente na fila</p>
        <p className="text-muted-foreground/60 text-xs mt-1">As mensagens são geradas automaticamente pelo sistema</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
          {queueItems.length} pendente{queueItems.length !== 1 ? "s" : ""}
        </Badge>
        <span className="text-[10px] text-muted-foreground">Atualiza automaticamente a cada 30s</span>
      </div>

      {grouped.map(([type, items]) => {
        const config = MESSAGE_TYPE_CONFIG[type] || { label: type, icon: Mail, color: "text-muted-foreground" };
        const Icon = config.icon;
        return (
          <div key={type} className="border border-border rounded-xl p-4 bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Icon size={16} className={config.color} />
              <h3 className="text-sm font-semibold text-foreground">{config.label}</h3>
              <Badge variant="outline" className="text-[10px] ml-auto">{items.length}</Badge>
            </div>
            <div className="space-y-2">
              {items.map((item: any) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-muted/20 rounded-lg px-3 py-2.5 border border-border/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">{item.client_name || item.client_email}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-muted-foreground">{item.client_email}</span>
                      {item.client_phone && (
                        <>
                          <span className="text-[11px] text-muted-foreground/40">·</span>
                          <span className="text-[11px] text-muted-foreground">{item.client_phone}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className="text-[11px] text-muted-foreground">{item.plan_name || "—"}</span>
                    {item.expires_at && (
                      <>
                        <span className="text-[11px] text-muted-foreground/40">·</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(item.expires_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        </span>
                      </>
                    )}
                    <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-500 bg-amber-500/5 ml-1">
                      <Clock size={8} className="mr-0.5" /> Aguardando
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});
PendenciasTab.displayName = "PendenciasTab";

const TabLoader = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-5 h-5 animate-spin text-primary" />
  </div>
);

const BackOfficeDashboard = ({ onLogout }: { onLogout: () => void }) => {
  const { data, isLoading, error, refetch } = useAdminDashboard();
  const [selectedClient, setSelectedClient] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSelectClient = useCallback((u: AdminUser) => {
    setSelectedClient(u);
    window.history.pushState({ backofficeClient: true }, "");
  }, []);
  const handleBack = useCallback(() => setSelectedClient(null), []);

  // Handle browser back button for client detail
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (selectedClient) {
        setSelectedClient(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [selectedClient]);

  const { data: pendingQueueCount = 0 } = useQuery({
    queryKey: ["message-queue-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("message_queue" as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) return 0;
      return count || 0;
    },
    refetchInterval: 30000,
  });
  const pendingCount = pendingQueueCount;

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
        <Suspense fallback={<TabLoader />}>
          <AdminClientDetail client={selectedClient} onBack={() => { setSelectedClient(null); }} />
        </Suspense>
      </div>
    );
  }

  const renderContent = () => {
    const content = (() => {
      switch (activeTab) {
        case "overview": return data ? <AdminOverview data={data} /> : null;
        case "clients": return <AdminClientsTable users={data?.users || []} onSelectClient={handleSelectClient} />;
        case "pendencias": return <PendenciasTab />;
        case "messages": return <AdminMessages />;
        case "conexao": return <AdminConexao />;
        case "logs": return <AdminLogs />;
        case "costs": return <CostsTab costs={((data as any)?.costs || []) as any[]} onRefresh={() => refetch()} />;
        case "groups-pool": return <AdminGroupsPool />;
        case "warmup-cycles": return <AdminWarmupCycles />;
        case "warmup-jobs": return <AdminWarmupJobs />;
        case "infra": return <AdminInfra />;
        case "tokens-global": return <AdminTokensGlobal />;
        case "community": return <AdminCommunityWarmer />;
        case "warmup-roadmap": return <AdminWarmupRoadmap />;
        case "msg-generator": return <MessageGeneratorPreview />;
        default: return null;
      }
    })();
    return <Suspense fallback={<TabLoader />}>{content}</Suspense>;
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
          {GROUPS.map(group => (
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
