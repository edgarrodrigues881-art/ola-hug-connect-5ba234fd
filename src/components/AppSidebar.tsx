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
  User,
  ChevronUp,
  CreditCard,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  { title: "Enviar Mensagem", url: "/dashboard/campaigns", icon: Send },
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

  return (
    <Sidebar collapsible="icon">
      <div className={`flex items-center border-b border-sidebar-border ${collapsed ? 'justify-center py-4 px-0' : 'gap-2.5 px-4 py-4'}`}>
        <img src={logo} alt="Logo" className="w-8 min-w-[32px] h-8 min-h-[32px] rounded-lg shrink-0 object-cover" />
        {!collapsed && (
          <span className="text-sm font-bold text-sidebar-foreground truncate">
            DG Contingência Pro
          </span>
        )}
      </div>

      <SidebarContent className="py-2">
        {groups.map((group, idx) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-medium tracking-wide text-sidebar-primary/80 px-4 mb-1">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                        activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                      >
                        <item.icon className="w-[18px] h-[18px] shrink-0" />
                        {!collapsed && <span className="text-[13px] truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
            {idx < groups.length - 1 && (
              <div className="mx-4 mt-2 border-b border-sidebar-border/50" />
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      <div className="mt-auto border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex items-center gap-3 w-full rounded-lg hover:bg-sidebar-accent/60 transition-colors ${collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'}`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-8 min-w-[32px] h-8 min-h-[32px] rounded-full shrink-0 object-cover" />
              ) : (
                <div className="w-8 min-w-[32px] h-8 min-h-[32px] rounded-full shrink-0 bg-primary/15 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">{initials}</span>
                </div>
              )}
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
                  </div>
                  <ChevronUp className="w-4 h-4 text-sidebar-foreground/50 shrink-0" />
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
