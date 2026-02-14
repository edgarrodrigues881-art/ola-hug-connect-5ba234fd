import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Devices from "./pages/dashboard/Devices";
import Campaigns from "./pages/dashboard/Campaigns";
import Welcome from "./pages/dashboard/Welcome";
import Contacts from "./pages/dashboard/Contacts";
import Reports from "./pages/dashboard/Reports";
import AutoReply from "./pages/dashboard/AutoReply";
import Unsubscribe from "./pages/dashboard/Unsubscribe";
import NumberFilter from "./pages/dashboard/NumberFilter";
import GroupCapture from "./pages/dashboard/GroupCapture";
import Inbox from "./pages/dashboard/Inbox";
import Integrations from "./pages/dashboard/Integrations";
import SettingsPage from "./pages/dashboard/Settings";
import Context from "./pages/dashboard/Context";
import Templates from "./pages/dashboard/Templates";
import CRM from "./pages/dashboard/CRM";
import Warmup from "./pages/dashboard/Warmup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Routes>
                      <Route index element={<DashboardHome />} />
                      <Route path="devices" element={<Devices />} />
                      <Route path="campaigns" element={<Campaigns />} />
                      <Route path="welcome" element={<Welcome />} />
                      <Route path="auto-reply" element={<AutoReply />} />
                      <Route path="templates" element={<Templates />} />
                      <Route path="contacts" element={<Contacts />} />
                      <Route path="unsubscribe" element={<Unsubscribe />} />
                      <Route path="number-filter" element={<NumberFilter />} />
                      <Route path="group-capture" element={<GroupCapture />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="inbox" element={<Inbox />} />
                      <Route path="integrations" element={<Integrations />} />
                      <Route path="crm" element={<CRM />} />
                      <Route path="warmup" element={<Warmup />} />
                      <Route path="context" element={<Context />} />
                      <Route path="settings" element={<SettingsPage />} />
                    </Routes>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
