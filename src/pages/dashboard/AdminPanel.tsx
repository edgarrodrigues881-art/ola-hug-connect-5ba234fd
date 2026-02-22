import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAdminDashboard, useSetUserRole } from "@/hooks/useAdmin";
import {
  Users, Smartphone, Megaphone, Contact, Shield, ShieldOff,
  BarChart3, Crown, UserCheck, UserX
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AdminPanel = () => {
  const { data, isLoading, error } = useAdminDashboard();
  const setRole = useSetUserRole();
  const { toast } = useToast();

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="glass-card p-8 text-center">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">Acesso Negado</h2>
          <p className="text-sm text-muted-foreground">Você não tem permissão para acessar o painel admin.</p>
        </Card>
      </div>
    );
  }

  const handleRoleToggle = async (userId: string, role: string, hasRole: boolean) => {
    try {
      await setRole.mutateAsync({ targetUserId: userId, role, remove: hasRole });
      toast({
        title: hasRole ? "Role removida" : "Role adicionada",
        description: `${role} ${hasRole ? "removida" : "adicionada"} com sucesso.`,
      });
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar a role.", variant: "destructive" });
    }
  };

  const stats = data?.stats;
  const users = data?.users || [];

  const statCards = [
    { label: "Usuários", value: stats?.total_users || 0, icon: Users, color: "text-blue-500" },
    { label: "Dispositivos", value: stats?.total_devices || 0, icon: Smartphone, color: "text-green-500" },
    { label: "Dispositivos Ativos", value: stats?.active_devices || 0, icon: Smartphone, color: "text-emerald-500" },
    { label: "Campanhas", value: stats?.total_campaigns || 0, icon: Megaphone, color: "text-purple-500" },
    { label: "Contatos", value: stats?.total_contacts || 0, icon: Contact, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <Crown className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
          <p className="text-sm text-muted-foreground">Gerencie usuários, dispositivos e plataforma</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`w-8 h-8 ${stat.color} shrink-0`} />
              <div>
                {isLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                )}
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-1.5 text-xs">
            <Smartphone className="w-3.5 h-3.5" /> Dispositivos
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Todos os Usuários ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Usuário</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Roles</TableHead>
                        <TableHead className="text-xs text-center">Chips</TableHead>
                        <TableHead className="text-xs text-center">Campanhas</TableHead>
                        <TableHead className="text-xs">Último Login</TableHead>
                        <TableHead className="text-xs">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => {
                        const isAdmin = u.roles.includes("admin");
                        return (
                          <TableRow key={u.id}>
                            <TableCell className="text-sm font-medium">
                              <div className="flex items-center gap-2">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                                    <span className="text-[10px] font-semibold text-primary">
                                      {(u.full_name || u.email || "U").slice(0, 2).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                {u.full_name || "Sem nome"}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {u.roles.length === 0 && <Badge variant="outline" className="text-[10px]">user</Badge>}
                                {u.roles.map((r) => (
                                  <Badge
                                    key={r}
                                    variant={r === "admin" ? "default" : "secondary"}
                                    className="text-[10px]"
                                  >
                                    {r}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-sm">{u.devices_count}</TableCell>
                            <TableCell className="text-center text-sm">{u.campaigns_count}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {u.last_sign_in_at
                                ? format(new Date(u.last_sign_in_at), "dd/MM/yy HH:mm", { locale: ptBR })
                                : "Nunca"}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={isAdmin ? "destructive" : "outline"}
                                className="h-7 text-xs gap-1"
                                onClick={() => handleRoleToggle(u.id, "admin", isAdmin)}
                                disabled={setRole.isPending}
                              >
                                {isAdmin ? <ShieldOff className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                                {isAdmin ? "Remover Admin" : "Tornar Admin"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Todos os Dispositivos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nome</TableHead>
                        <TableHead className="text-xs">Número</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Dono</TableHead>
                        <TableHead className="text-xs">Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.flatMap((u) =>
                        Array.from({ length: u.devices_count }, (_, i) => (
                          <TableRow key={`${u.id}-${i}`}>
                            <TableCell className="text-sm">—</TableCell>
                            <TableCell className="text-xs text-muted-foreground">—</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">—</Badge></TableCell>
                            <TableCell className="text-xs">{u.full_name || u.email}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">—</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Total: {stats?.total_devices || 0} dispositivos ({stats?.active_devices || 0} ativos)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resumo da Plataforma</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statCards.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                      <span className="text-sm text-foreground">{stat.label}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {isLoading ? "..." : stat.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top Usuários por Dispositivos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {users
                  .sort((a, b) => b.devices_count - a.devices_count)
                  .slice(0, 5)
                  .map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm text-foreground">{u.full_name || u.email}</span>
                      <Badge variant="secondary" className="text-[10px]">{u.devices_count} chips</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
