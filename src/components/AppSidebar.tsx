import {
  LayoutDashboard,
  Smartphone,
  Send,
  Megaphone,
  FileText,
  BarChart3,
  Flame,
  MessageSquareText,
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

const operationsItems = [
  { title: "Enviar Mensagem", url: "/dashboard/campaigns", icon: Send },
  { title: "Aquecimento", url: "/dashboard/warmup", icon: Flame },
  { title: "Conexões", url: "/dashboard/devices", icon: Smartphone },
  { title: "Proxy", url: "/dashboard/proxy", icon: Shield },
  { title: "Grupos", url: "/dashboard/groups", icon: UsersRound },
];

const analysisItems = [
  { title: "Relatório", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Relatório WhatsApp", url: "/dashboard/reports/whatsapp", icon: MessageSquareText },
  { title: "Campanhas", url: "/dashboard/campaign-list", icon: Megaphone },
  { title: "Modelos", url: "/dashboard/templates", icon: FileText },
];

const systemItems = [
  { title: "Orientação", url: "/dashboard/custom-module", icon: Box },
  { title: "Meu Plano", url: "/dashboard/my-plan", icon: CreditCard },
];

const groups = [
  { label: "Operações", items: operationsItems },
  { label: "Análise", items: analysisItems },
  { label: "Sistema", items: systemItems },
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

      {/* Painel link */}
      <div className={`px-3 pt-3 pb-0 ${collapsed ? 'px-2' : ''}`}>
        <NavLink
          to="/dashboard"
          end
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-[13px] ${
            isActive("/dashboard")
              ? 'bg-sidebar-accent text-foreground font-medium'
              : 'text-muted-foreground/70 hover:text-foreground hover:bg-sidebar-accent/40'
          }`}
          activeClassName=""
        >
          <LayoutDashboard className={`w-4 h-4 shrink-0 ${isActive("/dashboard") ? 'text-primary' : ''}`} strokeWidth={1.5} />
          {!collapsed && <span>Painel</span>}
        </NavLink>
      </div>

      <SidebarContent className="py-1">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/40 px-5 mb-0.5 select-none">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-px px-2">
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  const isPrimary = 'primary' in item && item.primary;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          className={`sidebar-nav-item flex items-center gap-3 px-3 py-1.5 rounded-md text-[13px] relative
                            ${active
                              ? 'bg-sidebar-accent text-foreground font-medium'
                              : isPrimary
                                ? 'text-primary/80 hover:text-primary hover:bg-primary/5'
                                : 'text-muted-foreground/70 hover:text-foreground hover:bg-sidebar-accent/40'
                            }`}
                          activeClassName=""
                        >
                          {active && !collapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
                          )}
                          <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-primary' : isPrimary ? '' : ''}`} strokeWidth={1.5} />
                          {!collapsed && <span className="truncate">{item.title}</span>}
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
            <button className={`flex items-center gap-3 w-full rounded-md hover:bg-sidebar-accent/40 ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2'}`}>
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
