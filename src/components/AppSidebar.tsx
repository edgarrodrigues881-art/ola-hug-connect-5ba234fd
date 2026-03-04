import {
  LayoutDashboard,
  Smartphone,
  Send,
  Megaphone,
  FileText,
  Flame,
  Shield,
  UsersRound,
  Radio,
  LogOut,
  Settings,
  CreditCard,
  Box,
  Activity,
  ScrollText,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { useSidebarStats } from "@/hooks/useSidebarStats";
import logo from "@/assets/logo.png";
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

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, exact: true },
  { title: "Conexões", url: "/dashboard/devices", icon: Smartphone },
  { title: "Enviar Mensagem", url: "/dashboard/campaigns", icon: Send },
  { title: "Campanhas", url: "/dashboard/campaign-list", icon: Megaphone, badgeKey: "activeCampaigns" as const },
  { title: "Modelos", url: "/dashboard/templates", icon: FileText },
  { title: "Proxy", url: "/dashboard/proxy", icon: Shield },
  { title: "Aquecimento", url: "/dashboard/warmup", icon: Flame },
  { title: "Grupos", url: "/dashboard/groups", icon: UsersRound },
  { title: "Relatório", url: "/dashboard/reports", icon: Activity, exact: true },
  { title: "Logs", url: "/dashboard/notifications", icon: ScrollText },
  { title: "Central de Alertas", url: "/dashboard/reports/whatsapp", icon: Radio, exact: true },
];

const accountItems = [
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
  { title: "Meu Plano", url: "/dashboard/my-plan", icon: CreditCard },
  { title: "Ajuda", url: "/dashboard/custom-module", icon: Box },
];

type BadgeKey = "activeCampaigns" | "unreadNotifications";

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
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

  const renderItem = (item: typeof mainItems[0]) => {
    const active = isActive(item.url, (item as any).exact);
    const badgeVal = getBadgeValue((item as any).badgeKey);
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild tooltip={item.title}>
          <NavLink
            to={item.url}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150
              ${active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            activeClassName=""
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
            {!collapsed && <span className="truncate flex-1">{item.title}</span>}
            {!collapsed && badgeVal > 0 && (
              <span className={`ml-auto text-[11px] font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center ${
                active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-primary text-primary-foreground'
              }`}>
                {badgeVal}
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon">
      {/* Header / Profile */}
      <div className={`border-b border-border/50 ${collapsed ? 'py-4 px-2 flex justify-center' : 'px-4 py-4'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-full shrink-0 object-cover ring-2 ring-border" />
          ) : (
            <div className="w-9 h-9 rounded-full shrink-0 bg-primary/10 ring-2 ring-border flex items-center justify-center">
              <span className="text-[11px] font-bold text-primary">{initials}</span>
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight">Pro Plan</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="py-2 flex-1">
        {/* Main nav */}
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {mainItems.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account section */}
        <SidebarGroup className="mt-auto pt-2">
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.1em] px-4 mb-1 text-muted-foreground/60">
              Conta
            </SidebarGroupLabel>
          )}
          {collapsed && <div className="mx-3 mb-2 border-t border-border/50" />}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {accountItems.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: Hide/Show + Logout */}
      <div className="border-t border-border/50 p-2 space-y-0.5">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-destructive hover:bg-destructive/10 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
          {!collapsed && <span>Sair</span>}
        </button>
        <button
          onClick={toggleSidebar}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors ${collapsed ? 'justify-center' : ''}`}
        >
          {collapsed ? (
            <ChevronsRight className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
          ) : (
            <>
              <ChevronsLeft className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
              <span>Esconder</span>
            </>
          )}
        </button>
      </div>
    </Sidebar>
  );
}
