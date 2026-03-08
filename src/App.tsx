import { lazy, Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";

// Lazy-loaded pages
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BackOffice = lazy(() => import("./pages/BackOffice"));
const DashboardLayout = lazy(() => import("./components/DashboardLayout"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const Devices = lazy(() => import("./pages/dashboard/Devices"));
const Campaigns = lazy(() => import("./pages/dashboard/Campaigns"));
const CampaignList = lazy(() => import("./pages/dashboard/CampaignList"));
const Contacts = lazy(() => import("./pages/dashboard/Contacts"));
const Reports = lazy(() => import("./pages/dashboard/Reports"));
const Templates = lazy(() => import("./pages/dashboard/Templates"));
const Warmup = lazy(() => import("./pages/dashboard/Warmup"));
const Proxy = lazy(() => import("./pages/dashboard/Proxy"));
const Notifications = lazy(() => import("./pages/dashboard/Notifications"));
const SettingsPage = lazy(() => import("./pages/dashboard/Settings"));
const CustomModule = lazy(() => import("./pages/dashboard/CustomModule"));
const Groups = lazy(() => import("./pages/dashboard/GroupCapture"));
const MyPlan = lazy(() => import("./pages/dashboard/MyPlan"));
const CampaignDetail = lazy(() => import("./pages/dashboard/CampaignDetail"));
const ReportWhatsApp = lazy(() => import("./pages/dashboard/ReportWhatsApp"));
const WarmupInstances = lazy(() => import("./pages/dashboard/WarmupInstances"));
const WarmupInstanceDetail = lazy(() => import("./pages/dashboard/WarmupInstanceDetail"));
const WelcomeSplash = lazy(() => import("./pages/WelcomeSplash"));

// Pause polling when tab is hidden
focusManager.setEventListener((handleFocus) => {
  const onVisibilityChange = () => handleFocus(document.visibilityState === "visible");
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => document.removeEventListener("visibilitychange", onVisibilityChange);
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,              // 60s — reduce refetches
      gcTime: 1000 * 60 * 10,           // 10 min
      refetchOnWindowFocus: false,
      retry: 1,
      refetchIntervalInBackground: false, // pause polling when tab hidden
    },
  },
});

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Suspense fallback={<PageFallback />}>
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
                          <Route path="reports/whatsapp" element={<ReportWhatsApp />} />
                          <Route path="custom-module" element={<CustomModule />} />
                          <Route path="notifications" element={<Notifications />} />
                          <Route path="settings" element={<SettingsPage />} />
                          <Route path="my-plan" element={<MyPlan />} />
                          <Route path="warmup-v2" element={<WarmupInstances />} />
                          <Route path="warmup-v2/:deviceId" element={<WarmupInstanceDetail />} />
                          <Route path="autosave" element={<AutoSave />} />
                        </Routes>
                      </Suspense>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/backoffice" element={<BackOffice />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
