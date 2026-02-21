import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import { useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <header className="h-14 border-b border-border/50 bg-card/80 backdrop-blur-sm flex items-center px-4 shrink-0 gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <img src={logo} alt="DG Contingência Pro" className="w-7 h-7 rounded-md sm:hidden" />

            {/* Search bar */}
            <div className="flex-1 flex justify-center">
              <div className={`relative transition-all duration-300 ${searchOpen ? "w-full max-w-md" : "w-full max-w-xs"}`}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Buscar..."
                  className="pl-9 h-9 bg-muted/40 border-border/40 focus:bg-muted/60 text-sm rounded-lg"
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setSearchOpen(false)}
                />
              </div>
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground shrink-0">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sidebar-primary rounded-full ring-2 ring-card" />
            </Button>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
