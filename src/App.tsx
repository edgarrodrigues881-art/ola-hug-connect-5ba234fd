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
import PlaceholderPage from "./pages/dashboard/PlaceholderPage";
import {
  HandMetal, Bot, FileText, Users, Ban, Filter,
  UsersRound, BarChart3, MessageSquare, Plug, Settings,
} from "lucide-react";

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
                      <Route path="welcome" element={<PlaceholderPage title="Mensagem de Boas-vindas" description="Configure mensagens automáticas para novos contatos" icon={<HandMetal className="w-8 h-8 text-primary" />} />} />
                      <Route path="auto-reply" element={<PlaceholderPage title="Resposta Automática" description="Crie regras de resposta por palavra-chave" icon={<Bot className="w-8 h-8 text-primary" />} />} />
                      <Route path="templates" element={<PlaceholderPage title="Modelos" description="Crie e gerencie templates de mensagem" icon={<FileText className="w-8 h-8 text-primary" />} />} />
                      <Route path="contacts" element={<PlaceholderPage title="Contatos" description="Importe, organize e filtre seus contatos" icon={<Users className="w-8 h-8 text-primary" />} />} />
                      <Route path="unsubscribe" element={<PlaceholderPage title="Cancelar Inscrição" description="Gerencie a lista negra de contatos" icon={<Ban className="w-8 h-8 text-primary" />} />} />
                      <Route path="number-filter" element={<PlaceholderPage title="Filtro Numérico" description="Filtre por DDD, remova fixos e duplicados" icon={<Filter className="w-8 h-8 text-primary" />} />} />
                      <Route path="group-capture" element={<PlaceholderPage title="Capturador de Grupo" description="Extraia participantes de grupos do WhatsApp" icon={<UsersRound className="w-8 h-8 text-primary" />} />} />
                      <Route path="reports" element={<PlaceholderPage title="Relatório" description="Visualize métricas detalhadas de envio" icon={<BarChart3 className="w-8 h-8 text-primary" />} />} />
                      <Route path="inbox" element={<PlaceholderPage title="Mensagens Recebidas" description="Visualize e responda mensagens recebidas" icon={<MessageSquare className="w-8 h-8 text-primary" />} />} />
                      <Route path="integrations" element={<PlaceholderPage title="Integrações" description="Configure webhooks, API e CRM externo" icon={<Plug className="w-8 h-8 text-primary" />} />} />
                      <Route path="settings" element={<PlaceholderPage title="Configurações" description="Perfil, plano, segurança e logs" icon={<Settings className="w-8 h-8 text-primary" />} />} />
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
