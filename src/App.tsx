import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Devices from "./pages/dashboard/Devices";
import Campaigns from "./pages/dashboard/Campaigns";
import Contacts from "./pages/dashboard/Contacts";
import Reports from "./pages/dashboard/Reports";
import Templates from "./pages/dashboard/Templates";
import Warmup from "./pages/dashboard/Warmup";
import Proxy from "./pages/dashboard/Proxy";
import AutoSaveNumber from "./pages/dashboard/AutoSaveNumber";

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
                      <Route path="templates" element={<Templates />} />
                      <Route path="contacts" element={<Contacts />} />
                      <Route path="auto-save" element={<AutoSaveNumber />} />
                      <Route path="warmup" element={<Warmup />} />
                      <Route path="proxy" element={<Proxy />} />
                      <Route path="reports" element={<Reports />} />
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
