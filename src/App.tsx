import { lazy, Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";

// Retry wrapper for dynamic imports (handles chunk load failures after deploys)
function retryImport(importFn: () => Promise<any>, retries = 3, delay = 1000): Promise<any> {
  return importFn().catch((err) => {
    if (retries <= 0) {
      // Force full page reload as last resort for stale chunks
      window.location.reload();
      throw err;
    }
    return new Promise((res) => setTimeout(res, delay)).then(() =>
      retryImport(importFn, retries - 1, delay)
    );
  });
}

function lazyRetry(importFn: () => Promise<any>): ReturnType<typeof lazy> {
  return lazy(() => retryImport(importFn));
}

// Lazy-loaded pages with retry
const Landing = lazyRetry(() => import("./pages/Landing"));
const Auth = lazyRetry(() => import("./pages/Auth"));
const ResetPassword = lazyRetry(() => import("./pages/ResetPassword"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const BackOffice = lazyRetry(() => import("./pages/BackOffice"));
const DashboardLayout = lazyRetry(() => import("./components/DashboardLayout"));
const DashboardHome = lazyRetry(() => import("./pages/dashboard/DashboardHome"));
const Devices = lazyRetry(() => import("./pages/dashboard/Devices"));
const Campaigns = lazyRetry(() => import("./pages/dashboard/Campaigns"));
const CampaignList = lazyRetry(() => import("./pages/dashboard/CampaignList"));
const Contacts = lazyRetry(() => import("./pages/dashboard/Contacts"));
const Reports = lazyRetry(() => import("./pages/dashboard/Reports"));
const Templates = lazyRetry(() => import("./pages/dashboard/Templates"));
const Warmup = lazyRetry(() => import("./pages/dashboard/Warmup"));
const Proxy = lazyRetry(() => import("./pages/dashboard/Proxy"));
const Notifications = lazyRetry(() => import("./pages/dashboard/Notifications"));
const SettingsPage = lazyRetry(() => import("./pages/dashboard/Settings"));
const CustomModule = lazyRetry(() => import("./pages/dashboard/CustomModule"));
const Groups = lazyRetry(() => import("./pages/dashboard/GroupCapture"));
const MyPlan = lazyRetry(() => import("./pages/dashboard/MyPlan"));
const CampaignDetail = lazyRetry(() => import("./pages/dashboard/CampaignDetail"));
const ReportWhatsApp = lazyRetry(() => import("./pages/dashboard/ReportWhatsApp"));
const ReportConnection = lazyRetry(() => import("./pages/dashboard/ReportConnection"));
const WarmupInstances = lazyRetry(() => import("./pages/dashboard/WarmupInstances"));
const WarmupInstanceDetail = lazyRetry(() => import("./pages/dashboard/WarmupInstanceDetail"));
const AutoSave = lazyRetry(() => import("./pages/dashboard/AutoSave"));
const WelcomeSplash = lazyRetry(() => import("./pages/WelcomeSplash"));
const Community = lazyRetry(() => import("./pages/dashboard/Community"));

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
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
      <span className="text-xs text-muted-foreground/60 tracking-widest uppercase font-medium">Carregando</span>
    </div>
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
                          <Route path="reports/connection" element={<ReportConnection />} />
                          <Route path="reports/whatsapp" element={<ReportWhatsApp />} />
                          <Route path="custom-module" element={<CustomModule />} />
                          <Route path="community" element={<Community />} />
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
              <Route path="/welcome" element={<ProtectedRoute><WelcomeSplash /></ProtectedRoute>} />
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
