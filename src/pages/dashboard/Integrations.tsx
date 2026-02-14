import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plug, Webhook, Code, Globe, Copy, Check } from "lucide-react";

const Integrations = () => {
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState("https://meucrm.com/webhook/dg");
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const apiKey = "dg_live_sk_a1b2c3d4e5f6g7h8i9j0";

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast({ title: "Chave copiada" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
        <p className="text-sm text-muted-foreground">Configure webhooks, API e CRM externo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Webhook */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-primary" />
              <CardTitle className="text-sm">Webhook</CardTitle>
              <Badge variant="outline" className={`text-[10px] ml-auto ${webhookEnabled ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground"}`}>
                {webhookEnabled ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Receba notificações em tempo real sobre mensagens enviadas, recebidas e status de entrega.</p>
            <div className="space-y-2">
              <Label className="text-xs">URL do Webhook</Label>
              <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ativar webhook</span>
              <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
            </div>
            <Button size="sm" className="w-full">Salvar Configuração</Button>
          </CardContent>
        </Card>

        {/* API */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-primary" />
              <CardTitle className="text-sm">API</CardTitle>
              <Badge variant="outline" className="text-[10px] ml-auto bg-success/15 text-success border-success/30">Disponível</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">Use nossa API REST para enviar mensagens, gerenciar contatos e acessar relatórios programaticamente.</p>
            <div className="space-y-2">
              <Label className="text-xs">Chave da API</Label>
              <div className="flex gap-2">
                <Input value={apiKey} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={copyKey} className="shrink-0">
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full gap-1.5"><Code className="w-3.5 h-3.5" /> Ver Documentação</Button>
          </CardContent>
        </Card>

        {/* CRM */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              <CardTitle className="text-sm">CRM Externo</CardTitle>
              <Badge variant="outline" className="text-[10px] ml-auto">Em breve</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Integre diretamente com seu CRM favorito para sincronizar contatos e automatizar fluxos de trabalho. Suporte a HubSpot, Pipedrive e RD Station em breve.</p>
            <div className="flex gap-3 mt-4">
              {["HubSpot", "Pipedrive", "RD Station"].map((crm) => (
                <Card key={crm} className="flex-1 border-dashed">
                  <CardContent className="p-4 text-center">
                    <Globe className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs font-medium text-muted-foreground">{crm}</p>
                    <p className="text-[10px] text-muted-foreground/60">Em breve</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Integrations;
