import {
  LayoutDashboard,
  Smartphone,
  Send,
  HandMetal,
  Bot,
  FileText,
  Users,
  Ban,
  Filter,
  UsersRound,
  BarChart3,
  MessageSquare,
  Plug,
  Settings,
  Cog,
  Contact,
  Flame,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
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
  { title: "Painel", url: "/dashboard", icon: LayoutDashboard },
  { title: "Dispositivos", url: "/dashboard/devices", icon: Smartphone },
  { title: "Enviar Mensagem", url: "/dashboard/campaigns", icon: Send },
];

const automationItems = [
  { title: "Boas-vindas", url: "/dashboard/welcome", icon: HandMetal },
  { title: "Resposta Automática", url: "/dashboard/auto-reply", icon: Bot },
  { title: "Modelos", url: "/dashboard/templates", icon: FileText },
];

const contactItems = [
  { title: "Contatos", url: "/dashboard/contacts", icon: Users },
  { title: "Cancelar Inscrição", url: "/dashboard/unsubscribe", icon: Ban },
  { title: "Filtro Numérico", url: "/dashboard/number-filter", icon: Filter },
  { title: "Capturador de Grupo", url: "/dashboard/group-capture", icon: UsersRound },
];

const analyticsItems = [
  { title: "Relatório", url: "/dashboard/reports", icon: BarChart3 },
  { title: "Mensagens Recebidas", url: "/dashboard/inbox", icon: MessageSquare },
];

const systemItems = [
  { title: "Integrações", url: "/dashboard/integrations", icon: Plug },
  { title: "Contexto", url: "/dashboard/context", icon: Cog },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

const crmItems = [
  { title: "CRM", url: "/dashboard/crm", icon: Contact },
];

const warmupItems = [
  { title: "Aquecimento", url: "/dashboard/warmup", icon: Flame },
];

const groups = [
  { label: "Principal", items: mainItems },
  { label: "Automação", items: automationItems },
  { label: "CRM", items: crmItems },
  { label: "Aquecimento", items: warmupItems },
  { label: "Contatos", items: contactItems },
  { label: "Análise", items: analyticsItems },
  { label: "Sistema", items: systemItems },
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
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 px-4 mb-1">
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
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span className="text-sm truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* User profile + Logout */}
      <div className="mt-auto border-t border-sidebar-border p-2 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          {avatarUrl ? (
            <img src={avatarUrl} alt={fullName} className="w-8 h-8 rounded-full shrink-0 object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full shrink-0 bg-primary/15 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">{initials}</span>
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{fullName}</p>
              <p className="text-[11px] text-sidebar-foreground/50 truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </button>
      </div>
    </Sidebar>
  );
}
