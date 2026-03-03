import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import BackOffice from "./pages/BackOffice";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Devices from "./pages/dashboard/Devices";
import Campaigns from "./pages/dashboard/Campaigns";
import CampaignList from "./pages/dashboard/CampaignList";
import Contacts from "./pages/dashboard/Contacts";
import Reports from "./pages/dashboard/Reports";
import Templates from "./pages/dashboard/Templates";
import Warmup from "./pages/dashboard/Warmup";
import Proxy from "./pages/dashboard/Proxy";

import Notifications from "./pages/dashboard/Notifications";
import SettingsPage from "./pages/dashboard/Settings";
import CustomModule from "./pages/dashboard/CustomModule";
import Groups from "./pages/dashboard/GroupCapture";
import MyPlan from "./pages/dashboard/MyPlan";
import CampaignDetail from "./pages/dashboard/CampaignDetail";
import MonitoringCenter from "./pages/dashboard/MonitoringCenter";
import ReportWhatsApp from "./pages/dashboard/ReportWhatsApp";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 min — show cached data instantly
      gcTime: 1000 * 60 * 10,         // 10 min — keep in memory
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Routes>
                      <Route index element={<DashboardHome />} />
                      <Route path="devices" element={<Devices />} />
                      <Route path="campaigns" element={<Campaigns />} />
                      <Route path="campaign-list" element={<CampaignList />} />
                      <Route path="campaign/:id" element={<CampaignDetail />} />
                      
                      <Route path="templates" element={<Templates />} />
                      <Route path="contacts" element={<Contacts />} />
                      
                      <Route path="warmup" element={<Warmup />} />
                      <Route path="proxy" element={<Proxy />} />
                      <Route path="groups" element={<Groups />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="monitoring" element={<MonitoringCenter />} />
                      <Route path="reports/whatsapp" element={<ReportWhatsApp />} />
                      <Route path="custom-module" element={<CustomModule />} />
                      <Route path="notifications" element={<Notifications />} />
                      <Route path="settings" element={<SettingsPage />} />
                      <Route path="my-plan" element={<MyPlan />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/backoffice" element={<BackOffice />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
