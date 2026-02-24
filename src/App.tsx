import { lazy, Suspense } from "react";
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
import Plans from "./pages/Plans";
import NotFound from "./pages/NotFound";
const BackOffice = lazy(() => import("./pages/BackOffice"));
import DashboardLayout from "./components/DashboardLayout";

// Lazy-loaded dashboard pages
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const Devices = lazy(() => import("./pages/dashboard/Devices"));
const Campaigns = lazy(() => import("./pages/dashboard/Campaigns"));
const CampaignList = lazy(() => import("./pages/dashboard/CampaignList"));

const CRM = lazy(() => import("./pages/dashboard/CRM"));
const Contacts = lazy(() => import("./pages/dashboard/Contacts"));
const Reports = lazy(() => import("./pages/dashboard/Reports"));
const Templates = lazy(() => import("./pages/dashboard/Templates"));
const Warmup = lazy(() => import("./pages/dashboard/Warmup"));
const Proxy = lazy(() => import("./pages/dashboard/Proxy"));
const AutoSaveNumber = lazy(() => import("./pages/dashboard/AutoSaveNumber"));
const Notifications = lazy(() => import("./pages/dashboard/Notifications"));
const SettingsPage = lazy(() => import("./pages/dashboard/Settings"));
const CustomModule = lazy(() => import("./pages/dashboard/CustomModule"));
const Groups = lazy(() => import("./pages/dashboard/GroupCapture"));


const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center h-48">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

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
            <Route path="/planos" element={<Plans />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route index element={<DashboardHome />} />
                        <Route path="devices" element={<Devices />} />
                        <Route path="campaigns" element={<Campaigns />} />
                        <Route path="campaign-list" element={<CampaignList />} />
                        
                        <Route path="crm" element={<CRM />} />
                        <Route path="templates" element={<Templates />} />
                        <Route path="contacts" element={<Contacts />} />
                        <Route path="auto-save" element={<AutoSaveNumber />} />
                        <Route path="warmup" element={<Warmup />} />
                        <Route path="proxy" element={<Proxy />} />
                        <Route path="groups" element={<Groups />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="custom-module" element={<CustomModule />} />
                        <Route path="notifications" element={<Notifications />} />
                        <Route path="settings" element={<SettingsPage />} />
                        
                      </Routes>
                    </Suspense>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/backoffice" element={<Suspense fallback={<PageLoader />}><BackOffice /></Suspense>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
