import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search, Info, CheckCircle2, AlertTriangle, XCircle, CheckCheck, Trash2, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.png";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { useAutoSyncDevices } from "@/hooks/useAutoSyncDevices";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const typeIcons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const typeColors = {
  success: "text-emerald-400",
  warning: "text-yellow-400",
  error: "text-destructive",
  info: "text-teal-400",
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { resolvedTheme, setTheme } = useTheme();

  // Global auto-sync of device statuses every 1s across all dashboard pages
  useAutoSyncDevices(15000);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <header className="h-14 border-b border-border/50 bg-card flex items-center px-4 shrink-0 gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <img src={logo} alt="DG Contingência Pro" className="w-7 h-7 rounded-md sm:hidden" />

            {/* Search bar */}
            <div className="flex-1 flex justify-center">
              <div className={`relative ${searchOpen ? "w-full max-w-md" : "w-full max-w-xs"}`}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Buscar..."
                  className="pl-9 h-9 bg-muted/40 border-border/40 focus:bg-muted/60 text-sm rounded-lg"
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setSearchOpen(false)}
                />
              </div>
            </div>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <Sun className="w-[18px] h-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-[18px] h-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Alternar tema</span>
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground shrink-0">
                  <Bell className="w-[18px] h-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 text-[10px] font-bold bg-sidebar-primary text-sidebar-primary-foreground rounded-full flex items-center justify-center ring-2 ring-card">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-popover border-border max-h-[400px] overflow-y-auto">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <DropdownMenuLabel className="text-xs font-medium text-foreground p-0">Notificações</DropdownMenuLabel>
                  {unreadCount > 0 && (
                    <button
                      onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <DropdownMenuSeparator />

                {loading ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">Carregando...</div>
                ) : notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">Nenhuma notificação</div>
                ) : (
                  notifications.map((n) => {
                    const Icon = typeIcons[n.type] || Info;
                    const color = typeColors[n.type] || "text-muted-foreground";
                    return (
                      <DropdownMenuItem
                        key={n.id}
                        className={`flex items-start gap-3 py-3 cursor-pointer ${!n.read ? "bg-muted/30" : ""}`}
                        onClick={() => { if (!n.read) markAsRead(n.id); }}
                      >
                        <Icon className={`w-4 h-4 ${color} mt-0.5 shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm truncate ${!n.read ? "font-medium text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                            {!n.read && <span className="w-1.5 h-1.5 bg-sidebar-primary rounded-full shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    );
                  })
                )}
                {notifications.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="flex items-center justify-center gap-1.5 text-xs text-destructive cursor-pointer"
                      onClick={(e) => { e.preventDefault(); clearAll(); }}
                    >
                      <Trash2 className="w-3 h-3" />
                      Limpar todas
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-center text-xs text-primary justify-center cursor-pointer"
                  onClick={() => navigate("/dashboard/notifications")}
                >
                  Ver todas as notificações
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-5 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
