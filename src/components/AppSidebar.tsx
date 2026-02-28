import {
  LayoutDashboard,
  Smartphone,
  Send,
  Megaphone,
  FileText,
  BarChart3,
  Flame,
  Shield,
  UsersRound,
  Box,
  LogOut,
  Settings,
  ChevronUp,
  CreditCard,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
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

const mainItems = [
  { title: "Painel", url: "/dashboard", icon: LayoutDashboard },
  { title: "Conexões", url: "/dashboard/devices", icon: Smartphone },
  { title: "Campanha", url: "/dashboard/campaign-list", icon: Megaphone },
  { title: "Modelos", url: "/dashboard/templates", icon: FileText },
];

const warmupItems = [
  { title: "Aquecimento Automático", url: "/dashboard/warmup", icon: Flame },
  { title: "Proxy", url: "/dashboard/proxy", icon: Shield },
  { title: "Grupos", url: "/dashboard/groups", icon: UsersRound },
  { title: "Relatório", url: "/dashboard/reports", icon: BarChart3 },
];

const analyticsItems = [
  { title: "Orientação", url: "/dashboard/custom-module", icon: Box },
  { title: "Meu Plano", url: "/dashboard/my-plan", icon: CreditCard },
];

const groups = [
  { label: "Principal", items: mainItems },
  { label: "Aquecimento", items: warmupItems },
  { label: "Análise", items: analyticsItems },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

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

  const isActive = (url: string) => {
    if (url === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(url);
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

      {/* CTA: Enviar Mensagem — separated at top */}
      <div className={`px-3 pt-4 pb-1 ${collapsed ? 'px-2' : ''}`}>
        <NavLink
          to="/dashboard/campaigns"
          className="sidebar-cta-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary font-medium transition-colors duration-100 hover:bg-primary/10"
          activeClassName="sidebar-cta-active bg-primary/10"
        >
          <Send className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span className="text-[13px]">Enviar Mensagem</span>}
        </NavLink>
      </div>

      <SidebarContent className="py-1">
        {groups.map((group, idx) => (
          <SidebarGroup key={group.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50 px-5 mb-1">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          className={`sidebar-nav-item flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-100
                            ${active
                              ? 'sidebar-nav-active bg-sidebar-accent text-foreground font-medium'
                              : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
                            }`}
                          activeClassName=""
                        >
                          {/* Active indicator bar */}
                          {active && !collapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                          )}
                          <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors duration-100 ${active ? 'text-primary' : ''}`} />
                          {!collapsed && <span className="text-[13px] truncate">{item.title}</span>}
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
            <button className={`sidebar-profile-card flex items-center gap-3 w-full rounded-lg transition-colors duration-100 hover:bg-sidebar-accent/60 ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2'}`}>
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
                    <p className="text-[11px] text-muted-foreground truncate leading-tight">Gerenciar conta</p>
                  </div>
                  <ChevronUp className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="gap-2 cursor-pointer">
              <Settings className="w-4 h-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Sidebar>
  );
}
