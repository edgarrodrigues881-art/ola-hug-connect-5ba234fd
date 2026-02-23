import {
  LayoutDashboard,
  Smartphone,
  Send,
  Megaphone,
  FileText,
  Users,
  BarChart3,
  Flame,
  Shield,
  Save,
  Box,
  LogOut,
  MessageCircle,
  UserCheck,
  Settings,
  User,
  ChevronUp,
} from "lucide-react";
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
  { title: "Dispositivos", url: "/dashboard/devices", icon: Smartphone },
  { title: "Conversas", url: "/dashboard/conversations", icon: MessageCircle },
  { title: "Enviar Mensagem", url: "/dashboard/campaigns", icon: Send },
  { title: "Campanha", url: "/dashboard/campaign-list", icon: Megaphone },
  { title: "Modelos", url: "/dashboard/templates", icon: FileText },
];

const contactItems = [
  { title: "Contatos", url: "/dashboard/contacts", icon: Users },
  { title: "CRM", url: "/dashboard/crm", icon: UserCheck },
  { title: "Número Auto Save", url: "/dashboard/auto-save", icon: Save },
];

const warmupItems = [
  { title: "Aquecimento Automático", url: "/dashboard/warmup", icon: Flame },
  { title: "Proxy", url: "/dashboard/proxy", icon: Shield },
];

const analyticsItems = [
  { title: "Relatório", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Roteiros de Aquecimento", url: "/dashboard/custom-module", icon: Box },
];

const groups = [
  { label: "Principal", items: mainItems },
  { label: "Contatos", items: contactItems },
  { label: "Aquecimento", items: warmupItems },
  { label: "Análise", items: analyticsItems },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { user } = useAuth();

  const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = fullName.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
        <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg shrink-0" />
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
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors"
                        activeClassName="bg-sidebar-primary/20 text-sidebar-primary font-medium"
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

      {/* User profile dropdown */}
      <div className="mt-auto border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-sidebar-accent/60 transition-colors">
              {avatarUrl ? (
                <img src={avatarUrl} alt={fullName} className="w-8 h-8 rounded-full shrink-0 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full shrink-0 bg-primary/15 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">{initials}</span>
                </div>
              )}
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{fullName}</p>
                  </div>
                  <ChevronUp className="w-4 h-4 text-sidebar-foreground/50 shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={() => navigate("/dashboard/settings?tab=profile")} className="gap-2 cursor-pointer">
              <User className="w-4 h-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/dashboard/settings?tab=security")} className="gap-2 cursor-pointer">
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
