import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Key, Copy, Check, Radio, Save, ShieldCheck, ShieldX, ShieldQuestion, RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props { client: AdminUser; detail: any; }

const ClientTokensTab = ({ client, detail }: Props) => {
  const tokens = detail?.api_tokens || [];
  const { mutate, isPending } = useAdminAction();
  const { toast } = useToast();
  const [newTokens, setNewTokens] = useState("");
  const [monitorToken, setMonitorToken] = useState(detail?.profile?.whatsapp_monitor_token || "");
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    setMonitorToken(detail?.profile?.whatsapp_monitor_token || "");
  }, [detail?.profile?.whatsapp_monitor_token]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleAddTokens = () => {
    const lines = newTokens.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast({ title: "Informe ao menos um token", variant: "destructive" });
      return;
    }
    mutate(
      { action: "add-tokens", body: { target_user_id: client.id, tokens: lines } },
      {
        onSuccess: (data: any) => {
          const info = data?.healthy !== undefined
            ? `${data.total} token(s) adicionado(s) — ${data.healthy} válidos, ${data.invalid} inválidos`
            : `${lines.length} token(s) adicionado(s)`;
          toast({ title: info });
          setNewTokens("");
        },
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleValidateAll = () => {
    setValidating(true);
    mutate(
      { action: "validate-tokens", body: { target_user_id: client.id } },
      {
        onSuccess: (data: any) => {
          toast({ title: `${data.total} tokens validados — ${data.healthy} válidos, ${data.invalid} inválidos` });
          setValidating(false);
        },
        onError: (e) => {
          toast({ title: "Erro", description: e.message, variant: "destructive" });
          setValidating(false);
        },
      }
    );
  };

  const handleDelete = (tokenId: string) => {
    mutate(
      { action: "delete-token", body: { token_id: tokenId, target_user_id: client.id } },
      {
        onSuccess: () => toast({ title: "Token removido" }),
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const handleDeleteAll = () => {
    mutate(
      { action: "delete-all-tokens", body: { target_user_id: client.id } },
      {
        onSuccess: (data: any) => toast({ title: `${data?.removed ?? 0} token(s) removido(s)` }),
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const copyToken = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const available = tokens.filter((t: any) => t.status === "available").length;
  const inUse = tokens.filter((t: any) => t.status === "in_use").length;
  const healthyCount = tokens.filter((t: any) => t.healthy === true).length;
  const invalidCount = tokens.filter((t: any) => t.healthy === false).length;

  const handleSaveMonitorToken = () => {
    mutate(
      { action: "update-monitor-token", body: { target_user_id: client.id, whatsapp_monitor_token: monitorToken.trim() } },
      {
        onSuccess: () => toast({ title: monitorToken.trim() ? "Token de monitoramento salvo" : "Token de monitoramento removido" }),
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  const getHealthIcon = (healthy: boolean | null) => {
    if (healthy === true) return <ShieldCheck size={14} className="text-emerald-500" />;
    if (healthy === false) return <ShieldX size={14} className="text-destructive" />;
    return <ShieldQuestion size={14} className="text-muted-foreground/50" />;
  };

  const getHealthBadge = (healthy: boolean | null) => {
    if (healthy === true) return <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 gap-1"><ShieldCheck size={10} />Válido</Badge>;
    if (healthy === false) return <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 gap-1"><ShieldX size={10} />Inválido</Badge>;
    return <Badge variant="outline" className="text-[10px] text-muted-foreground border-border gap-1"><ShieldQuestion size={10} />Não verificado</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* WhatsApp Monitor Token */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Radio size={18} className="text-primary" />
          <h3 className="text-base font-bold text-foreground">Token de Monitoramento WhatsApp</h3>
          {monitorToken.trim() ? (
            <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">Configurado</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">Não configurado</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Token da instância que será usada para enviar notificações e alertas via WhatsApp para este cliente.
        </p>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs text-muted-foreground">Token da instância de monitoramento</Label>
            <Input
              placeholder="Cole o token aqui..."
              value={monitorToken}
              onChange={e => setMonitorToken(e.target.value)}
              className="bg-muted/30 border-border font-mono text-xs"
            />
          </div>
          <Button size="sm" onClick={handleSaveMonitorToken} disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save size={14} className="mr-1" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Instance Tokens */}
      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Key size={18} className="text-primary" />
          <h3 className="text-base font-bold text-foreground">Tokens de Instância</h3>
          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">{available} disponíveis</Badge>
          <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">{inUse} em uso</Badge>
          {invalidCount > 0 && (
            <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">{invalidCount} inválidos</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending || tokens.length === 0}
                className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 size={14} />
                Limpar todos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Remover todos os tokens?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Isso removerá todos os {tokens.length} token(s) deste cliente. Esta ação é permanente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Remover todos
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidateAll}
            disabled={validating || isPending || tokens.length === 0}
            className="gap-1.5 text-xs"
          >
            {validating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Validar todos
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Adicione tokens de instância para este cliente. Tokens são validados automaticamente ao adicionar. Tokens inválidos (401) não serão atribuídos a novas instâncias.
      </p>

      {/* Add tokens area */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Adicionar tokens (um por linha)</Label>
        <Textarea
          placeholder={"token_abc123\ntoken_def456\ntoken_ghi789"}
          value={newTokens}
          onChange={e => setNewTokens(e.target.value)}
          className="bg-muted/30 border-border font-mono text-xs min-h-[80px]"
        />
        <Button size="sm" onClick={handleAddTokens} disabled={isPending || !newTokens.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus size={14} className="mr-1" />}
          Adicionar
        </Button>
      </div>

      {/* Token list */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-[10px] uppercase tracking-wider">
              <th className="text-left px-4 py-2.5">#</th>
              <th className="text-left px-4 py-2.5">Token</th>
              <th className="text-left px-4 py-2.5">Saúde</th>
              <th className="text-left px-4 py-2.5">Status</th>
              <th className="text-left px-4 py-2.5">Instância</th>
              <th className="text-left px-4 py-2.5">Criado em</th>
              <th className="text-right px-4 py-2.5">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tokens.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum token cadastrado</td></tr>
            ) : tokens.map((t: any, idx: number) => (
              <tr key={t.id} className={`hover:bg-muted/30 ${t.healthy === false ? "bg-destructive/[0.03]" : ""}`}>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{idx + 1}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs font-mono text-foreground bg-muted/40 px-2 py-0.5 rounded max-w-[200px] truncate">
                      {t.token}
                    </code>
                    <button onClick={() => copyToken(t.token, t.id)} className="text-muted-foreground hover:text-foreground">
                      {copiedId === t.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  {getHealthBadge(t.healthy)}
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline" className={`text-[10px] ${t.status === "in_use" ? "text-amber-500 border-amber-500/30" : "text-emerald-500 border-emerald-500/30"}`}>
                    {t.status === "in_use" ? "Em uso" : "Disponível"}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {t.device_name || "—"}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive h-8 w-8">
                        <Trash2 size={14} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover token?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">Esta ação é permanente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
};

export default ClientTokensTab;
