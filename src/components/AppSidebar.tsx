import {
  LayoutDashboard,
  Smartphone,
  Send,
  BookUser,
  SaveAll,
  Megaphone,
  FileText,
  Flame,
  Shield,
  UsersRound,
  LogOut,
  Settings,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  CreditCard,
  HelpCircle,
  ScrollText,
  Plus,
  FolderOpen,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import { useSidebarStats } from "@/hooks/useSidebarStats";
import { useWarmupFolders } from "@/hooks/useWarmupFolders";
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
import { WarmupFolderDialog } from "@/components/warmup/WarmupFolderDialog";
import { cn } from "@/lib/utils";

const menuGroups = [
  {
    label: "",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Conexões",
    items: [
      { title: "Instâncias", url: "/dashboard/devices", icon: Smartphone },
    ],
  },
  {
    label: "Campanhas",
    items: [
      { title: "Enviar Mensagem", url: "/dashboard/campaigns", icon: Send },
      { title: "Campanhas", url: "/dashboard/campaign-list", icon: Megaphone, badgeKey: "activeCampaigns" as const },
      { title: "Meus Contatos", url: "/dashboard/contacts", icon: BookUser },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { title: "Modelos", url: "/dashboard/templates", icon: FileText },
      { title: "Proxy", url: "/dashboard/proxy", icon: Shield },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { title: "Relatório Via WhatsApp", url: "/dashboard/reports/whatsapp", icon: ScrollText, exact: true },
    ],
  },
];

type BadgeKey = "activeCampaigns" | "unreadNotifications";

const FOLDER_COLORS: Record<string, string> = {
  "#10b981": "text-emerald-400",
  "#f59e0b": "text-amber-400",
  "#ef4444": "text-red-400",
  "#3b82f6": "text-blue-400",
  "#8b5cf6": "text-violet-400",
  "#ec4899": "text-pink-400",
  "#06b6d4": "text-cyan-400",
  "#f97316": "text-orange-400",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: stats } = useSidebarStats();
  const { folders, createFolder, updateFolder, deleteFolder, addDevices, removeDevice } = useWarmupFolders();

  const [profileData, setProfileData] = useState<{ company: string | null; avatar_url: string | null; full_name: string | null } | null>(null);
  const [warmupExpanded, setWarmupExpanded] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string; color: string } | null>(null);

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

  // Auto-expand if on warmup route
  useEffect(() => {
    if (location.pathname.startsWith("/dashboard/warmup") || location.pathname.startsWith("/dashboard/autosave") || location.pathname.startsWith("/dashboard/groups")) {
      setWarmupExpanded(true);
    }
  }, [location.pathname]);

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

  const warmupItems = [
    { title: "Aquecimento", url: "/dashboard/warmup-v2", icon: Flame },
    { title: "Auto Save", url: "/dashboard/autosave", icon: SaveAll },
    { title: "Grupos", url: "/dashboard/groups", icon: UsersRound },
  ];

  const handleSaveFolder = useCallback(async (data: { name: string; color: string; deviceIds: string[] }) => {
    if (editingFolder) {
      await updateFolder.mutateAsync({ id: editingFolder.id, name: data.name, color: data.color });
      // Sync devices: remove old, add new
      const currentFolder = folders.find(f => f.id === editingFolder.id);
      const oldIds = new Set(currentFolder?.device_ids || []);
      const newIds = new Set(data.deviceIds);
      // Remove devices no longer in folder
      for (const did of oldIds) {
        if (!newIds.has(did)) {
          await removeDevice.mutateAsync({ folderId: editingFolder.id, deviceId: did });
        }
      }
      // Add new devices
      const toAdd = data.deviceIds.filter(did => !oldIds.has(did));
      if (toAdd.length > 0) {
        await addDevices.mutateAsync({ folderId: editingFolder.id, deviceIds: toAdd });
      }
    } else {
      const result = await createFolder.mutateAsync({ name: data.name, color: data.color, icon: "folder" });
      if (data.deviceIds.length > 0 && result) {
        await addDevices.mutateAsync({ folderId: (result as any).id, deviceIds: data.deviceIds });
      }
    }
    setEditingFolder(null);
  }, [editingFolder, updateFolder, createFolder, addDevices, removeDevice, folders]);

  const handleDeleteFolder = useCallback(async (id: string) => {
    await deleteFolder.mutateAsync(id);
  }, [deleteFolder]);

  const renderNavItem = (item: { title: string; url: string; icon: any; exact?: boolean; badgeKey?: BadgeKey }, indent = false) => {
    const active = isActive(item.url, item.exact);
    const badgeVal = getBadgeValue(item.badgeKey);
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild tooltip={item.title}>
          <NavLink
            to={item.url}
            className={`sidebar-nav-item flex items-center rounded-[10px] text-[13px] relative
              transition-[background-color,color,opacity] duration-[120ms] ease-out
              ${collapsed ? 'gap-0 px-2.5 py-3 justify-center' : `gap-[11px] ${indent ? 'pl-8' : 'px-3.5'} pr-3.5 py-[10px]`}
              ${active
                ? 'bg-primary/10 text-foreground font-semibold'
                : 'text-muted-foreground font-medium hover:text-foreground hover:bg-muted/40'
              }`}
            activeClassName=""
          >
            {active && !collapsed && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
            )}
            <item.icon
              className={`w-[18px] h-[18px] shrink-0 transition-colors duration-150 ${active ? 'text-primary' : ''}`}
              strokeWidth={active ? 2.2 : 1.5}
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
          <SidebarGroup key={gi} className={`py-0 ${gi > 0 ? 'mt-1' : ''}`}>
            {group.label && !collapsed && (
              <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold mb-0.5">
                {group.label}
              </SidebarGroupLabel>
            )}
            {collapsed && gi > 0 && group.label && (
              <div className="mx-3 my-1.5 border-t border-sidebar-border/50" />
            )}
            <SidebarGroupContent>
              <SidebarMenu className="px-2.5 space-y-[2px]">
                {group.items.map((item) => renderNavItem(item as any))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* ── Aquecimento section with folders ── */}
        <SidebarGroup className="py-0 mt-1">
          {!collapsed && (
            <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold mb-0.5">
              Aquecimento
            </SidebarGroupLabel>
          )}
          {collapsed && (
            <div className="mx-3 my-1.5 border-t border-sidebar-border/50" />
          )}
          <SidebarGroupContent>
            <SidebarMenu className="px-2.5 space-y-[2px]">
              {/* Main warmup item with expand arrow */}
              <SidebarMenuItem>
                <div className="flex items-center">
                  <SidebarMenuButton asChild tooltip="Aquecimento" className="flex-1">
                    <NavLink
                      to="/dashboard/warmup-v2"
                      className={`sidebar-nav-item flex items-center rounded-[10px] text-[13px] relative
                        transition-[background-color,color,opacity] duration-[120ms] ease-out
                        ${collapsed ? 'gap-0 px-2.5 py-3 justify-center' : 'gap-[11px] px-3.5 py-[10px]'}
                        ${isActive("/dashboard/warmup-v2")
                          ? 'bg-primary/10 text-foreground font-semibold'
                          : 'text-muted-foreground font-medium hover:text-foreground hover:bg-muted/40'
                        }`}
                      activeClassName=""
                    >
                      {isActive("/dashboard/warmup-v2") && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                      )}
                      <Flame
                        className={`w-[18px] h-[18px] shrink-0 transition-colors duration-150 ${isActive("/dashboard/warmup-v2") ? 'text-primary' : ''}`}
                        strokeWidth={isActive("/dashboard/warmup-v2") ? 2.2 : 1.5}
                      />
                      {!collapsed && (
                        <span className="truncate flex-1">Aquecimento</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                  {!collapsed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setWarmupExpanded(!warmupExpanded);
                      }}
                      className="p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground/50 hover:text-muted-foreground transition-colors mr-1"
                    >
                      <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-200", warmupExpanded && "rotate-90")} />
                    </button>
                  )}
                </div>
              </SidebarMenuItem>

              {/* Expanded: folders + nova pasta + then Auto Save & Grupos */}
              {warmupExpanded && !collapsed && (
                <>
                  {/* Folders */}
                  {folders.length > 0 && (
                    <div className="mt-0.5">
                      {folders.map((folder) => {
                        const colorClass = FOLDER_COLORS[folder.color] || "text-emerald-400";
                        const folderUrl = `/dashboard/warmup-v2?folder=${folder.id}`;
                        const isActiveFolder = location.search.includes(folder.id);
                        return (
                          <SidebarMenuItem key={folder.id}>
                            <div className="group/folder flex items-center">
                              <SidebarMenuButton asChild tooltip={folder.name}>
                                <NavLink
                                  to={folderUrl}
                                  className={`sidebar-nav-item flex items-center rounded-[10px] text-[12px] relative flex-1
                                    transition-[background-color,color,opacity] duration-[120ms] ease-out
                                    gap-[9px] pl-8 pr-3.5 py-[8px]
                                    ${isActiveFolder
                                      ? 'bg-primary/10 text-foreground font-semibold'
                                      : 'text-muted-foreground font-medium hover:text-foreground hover:bg-muted/40'
                                    }`}
                                  activeClassName=""
                                >
                                  <FolderOpen className={cn("w-[15px] h-[15px] shrink-0", colorClass)} strokeWidth={1.5} />
                                  <span className="truncate flex-1">{folder.name}</span>
                                  {folder.device_ids && folder.device_ids.length > 0 && (
                                    <span className="text-[9px] text-muted-foreground/40 font-mono">{folder.device_ids.length}</span>
                                  )}
                                </NavLink>
                              </SidebarMenuButton>
                              <div className="opacity-0 group-hover/folder:opacity-100 flex items-center gap-0.5 mr-1 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingFolder({ id: folder.id, name: folder.name, color: folder.color });
                                    setFolderDialogOpen(true);
                                  }}
                                  className="p-1 rounded hover:bg-muted/40 text-muted-foreground/40 hover:text-muted-foreground"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFolder(folder.id);
                                  }}
                                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  )}

                  {/* Add folder button */}
                  <SidebarMenuItem>
                    <button
                      onClick={() => {
                        setEditingFolder(null);
                        setFolderDialogOpen(true);
                      }}
                      className="flex items-center gap-[9px] pl-8 pr-3.5 py-[8px] rounded-[10px] text-[11px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/30 transition-colors w-full font-medium"
                    >
                      <Plus className="w-[14px] h-[14px]" strokeWidth={1.5} />
                      <span>Nova pasta</span>
                    </button>
                  </SidebarMenuItem>

                  {/* Auto Save & Grupos below Nova pasta */}
                  <div className="mt-1 pt-1 border-t border-border/10">
                    {renderNavItem({ title: "Auto Save", url: "/dashboard/autosave", icon: SaveAll }, true)}
                    {renderNavItem({ title: "Grupos", url: "/dashboard/groups", icon: UsersRound }, true)}
                  </div>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Suporte section (bottom) ── */}
        <SidebarGroup className="py-0 mt-1">
          {!collapsed && (
            <SidebarGroupLabel className="px-4 text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold mb-0.5">
              Suporte
            </SidebarGroupLabel>
          )}
          {collapsed && (
            <div className="mx-3 my-1.5 border-t border-sidebar-border/50" />
          )}
          <SidebarGroupContent>
            <SidebarMenu className="px-2.5 space-y-[2px]">
              {renderNavItem({ title: "Ajuda", url: "/dashboard/custom-module", icon: HelpCircle })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer profile */}
      <div className="mt-auto border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex items-center gap-3 w-full rounded-[10px] hover:bg-sidebar-accent/30 transition-colors duration-150 ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2'}`}>
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
            <DropdownMenuItem onClick={() => navigate("/dashboard/my-plan")} className="gap-2 cursor-pointer">
              <CreditCard className="w-4 h-4" strokeWidth={1.5} />
              Meu Plano
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/dashboard/notifications")} className="gap-2 cursor-pointer">
              <ScrollText className="w-4 h-4" strokeWidth={1.5} />
              Logs
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <WarmupFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        editingFolder={editingFolder}
        onSave={handleSaveFolder}
        currentDeviceIds={editingFolder ? (folders.find(f => f.id === editingFolder.id)?.device_ids || []) : []}
      />
    </Sidebar>
  );
}
