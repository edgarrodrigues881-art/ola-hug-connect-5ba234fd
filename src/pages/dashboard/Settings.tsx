import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { User, Shield, BarChart3, CreditCard, Clock } from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState({ name: "", company: "", phone: "" });

  const saveProfile = () => {
    toast({ title: "Perfil atualizado", description: "Suas informações foram salvas." });
  };

  const logs = [
    { action: "Login realizado", ip: "189.44.xxx.xxx", time: "Hoje, 14:32" },
    { action: "Campanha iniciada", ip: "189.44.xxx.xxx", time: "Hoje, 13:10" },
    { action: "Dispositivo conectado", ip: "189.44.xxx.xxx", time: "Ontem, 18:45" },
    { action: "Senha alterada", ip: "189.44.xxx.xxx", time: "12/02/2026, 09:20" },
    { action: "Login realizado", ip: "200.18.xxx.xxx", time: "11/02/2026, 08:15" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Perfil, plano, segurança e logs</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-4">
          <TabsTrigger value="profile" className="gap-1.5 text-xs"><User className="w-3.5 h-3.5" /> Perfil</TabsTrigger>
          <TabsTrigger value="plan" className="gap-1.5 text-xs"><CreditCard className="w-3.5 h-3.5" /> Plano</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs"><Shield className="w-3.5 h-3.5" /> Segurança</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs"><Clock className="w-3.5 h-3.5" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Informações do Perfil</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Email</Label>
                <Input value={user?.email || ""} disabled className="bg-muted/50" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Nome Completo</Label>
                  <Input placeholder="Seu nome" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Empresa</Label>
                  <Input placeholder="Nome da empresa" value={profile.company} onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Telefone</Label>
                <Input placeholder="+55 11 99999-9999" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <Button onClick={saveProfile}>Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "Básico", price: "R$ 97", devices: 2, messages: "5.000", current: false },
              { name: "Pro", price: "R$ 197", devices: 5, messages: "20.000", current: true },
              { name: "Enterprise", price: "R$ 497", devices: 15, messages: "Ilimitado", current: false },
            ].map((plan) => (
              <Card key={plan.name} className={`glass-card ${plan.current ? "border-primary ring-1 ring-primary/20" : ""}`}>
                <CardContent className="p-5 space-y-4 text-center">
                  {plan.current && <Badge className="bg-primary text-primary-foreground text-[10px]">Plano Atual</Badge>}
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-3xl font-bold text-foreground">{plan.price}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                  <Separator />
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>{plan.devices} dispositivos</p>
                    <p>{plan.messages} mensagens/mês</p>
                    <p>Suporte prioritário</p>
                  </div>
                  <Button variant={plan.current ? "outline" : "default"} className="w-full" disabled={plan.current}>
                    {plan.current ? "Plano Atual" : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Segurança da Conta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Nova Senha</Label>
                <Input type="password" placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Confirmar Nova Senha</Label>
                <Input type="password" placeholder="Repita a senha" />
              </div>
              <Button>Alterar Senha</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="glass-card">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Logs de Atividade</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">{log.action}</p>
                      <p className="text-[11px] text-muted-foreground">IP: {log.ip}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{log.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
