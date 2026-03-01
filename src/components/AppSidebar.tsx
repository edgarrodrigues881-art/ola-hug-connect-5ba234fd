import {
  LayoutDashboard,
  Smartphone,
  Send,
  Megaphone,
  FileText,
  Flame,
  Shield,
  UsersRound,
  LogOut,
  Settings,
  ChevronUp,
  CreditCard,
  Box,
  Activity,
  ScrollText,
  Radio,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { useSidebarStats } from "@/hooks/useSidebarStats";
import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuGroups = [
  {
    label: "📊 VISÃO GERAL",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "🚀 OPERAÇÕES",
    items: [
      { title: "Enviar Mensagem", url: "/dashboard/campaigns", icon: Send },
      { title: "Aquecimento", url: "/dashboard/warmup", icon: Flame },
      { title: "Campanhas", url: "/dashboard/campaign-list", icon: Megaphone, badgeKey: "activeCampaigns" as const },
      { title: "Grupos", url: "/dashboard/groups", icon: UsersRound },
      { title: "Proxy", url: "/dashboard/proxy", icon: Shield },
    ],
  },
  {
    label: "📡 MONITORAMENTO",
    items: [
      { title: "Centro de Monitoramento", url: "/dashboard/reports/whatsapp", icon: Radio, exact: true },
      { title: "Relatórios", url: "/dashboard/reports", icon: Activity, exact: true },
      { title: "Logs", url: "/dashboard/notifications", icon: ScrollText },
    ],
  },
  {
    label: "⚙ CONFIGURAÇÕES",
    items: [
      { title: "Conexões", url: "/dashboard/devices", icon: Smartphone },
      { title: "Modelos", url: "/dashboard/templates", icon: FileText },
      { title: "Meu Plano", url: "/dashboard/my-plan", icon: CreditCard },
      { title: "Orientação", url: "/dashboard/custom-module", icon: Box },
    ],
  },
];

type BadgeKey = "activeCampaigns" | "unreadNotifications";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: stats } = useSidebarStats();

  const [profileData, setProfileData] = useState<{ company: string | null; avatar_url: string | null; full_name: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("company, avatar_url, full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfileData(data);
      });

    const channel = supabase
      .channel('profile-sidebar')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
        const d = payload.new as any;
        setProfileData({ company: d.company, avatar_url: d.avatar_url, full_name: d.full_name });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const displayName = profileData?.company || profileData?.full_name || user?.email?.split("@")[0] || "Usuário";
  const avatarUrl = profileData?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const isActive = (url: string, exact?: boolean) => {
    if (url === "/dashboard") return location.pathname === "/dashboard";
    if (exact) return location.pathname === url;
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  const getBadgeValue = (key?: BadgeKey): number => {
    if (!key || !stats) return 0;
    return stats[key] || 0;
  };

  return (
    <Sidebar collapsible="icon" className="sidebar-premium">
      {/* Header / Brand */}
      <div className={`flex items-center border-b border-sidebar-border ${collapsed ? 'justify-center py-4 px-0' : 'gap-3 px-5 py-5'}`}>
        <img src={logo} alt="Logo" className="w-8 min-w-[32px] h-8 min-h-[32px] rounded-lg shrink-0 object-cover" />
        {!collapsed && (
          <span className="text-[15px] font-bold tracking-tight text-sidebar-foreground truncate">
            DG Contingência
          </span>
        )}
      </div>

      <SidebarContent className="py-2">
        {menuGroups.map((group, gi) => (
          <SidebarGroup key={group.label} className={`py-1 ${gi > 0 ? 'mt-1' : ''}`}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50 px-5 mb-1 select-none">
                {group.label}
              </SidebarGroupLabel>
            )}
            {collapsed && gi > 0 && (
              <div className="mx-3 mb-1 border-t border-sidebar-border" />
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const active = isActive(item.url, (item as any).exact);
                  const badgeVal = getBadgeValue((item as any).badgeKey);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          className={`sidebar-nav-item flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] relative transition-colors
                            ${active
                              ? 'bg-primary/10 text-foreground font-semibold border border-primary/20'
                              : 'text-muted-foreground/70 hover:text-foreground hover:bg-sidebar-accent/50'
                            }`}
                          activeClassName=""
                        >
                          {active && !collapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.4)]" />
                          )}
                          <item.icon
                            className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-primary' : ''}`}
                            strokeWidth={active ? 2 : 1.5}
                          />
                          {!collapsed && (
                            <span className="truncate flex-1">{item.title}</span>
                          )}
                          {!collapsed && badgeVal > 0 && (
                            <span className="ml-auto text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                              {badgeVal}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer profile */}
      <div className="mt-auto border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex items-center gap-3 w-full rounded-lg hover:bg-sidebar-accent/50 ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2'}`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-8 min-w-[32px] h-8 min-h-[32px] rounded-full shrink-0 object-cover ring-1 ring-border" />
              ) : (
                <div className="w-8 min-w-[32px] h-8 min-h-[32px] rounded-full shrink-0 bg-primary/10 ring-1 ring-border flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-primary">{initials}</span>
                </div>
              )}
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[13px] font-medium text-sidebar-foreground truncate leading-tight">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground/50 truncate leading-tight">Gerenciar conta</p>
                  </div>
                  <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="gap-2 cursor-pointer">
              <Settings className="w-4 h-4" strokeWidth={1.5} />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Sidebar>
  );
}
