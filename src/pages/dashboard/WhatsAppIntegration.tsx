import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Smartphone,
  QrCode,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Wifi,
  MessageSquare,
} from "lucide-react";

type ConnectionStatus = "idle" | "creating" | "connecting" | "connected" | "error";

export default function WhatsAppIntegration() {
  const [instanceName, setInstanceName] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [connectionState, setConnectionState] = useState<string | null>(null);

  const callEvolution = useCallback(async (action: string, payload: Record<string, string>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Não autenticado");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-connect`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action, ...payload }),
      }
    );

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Erro na API");
    return json;
  }, []);

  const handleCreateInstance = async () => {
    if (!instanceName.trim()) {
      toast.error("Informe o nome da instância");
      return;
    }
    setStatus("creating");
    setQrCode(null);
    setConnectionState(null);
    try {
      await callEvolution("create", { instanceName: instanceName.trim() });
      toast.success("Instância criada com sucesso!");
      setStatus("idle");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar instância";
      toast.error(msg);
      setStatus("error");
    }
  };

  const handleConnect = async () => {
    if (!instanceName.trim()) {
      toast.error("Informe o nome da instância");
      return;
    }
    setStatus("connecting");
    setQrCode(null);
    try {
      const res = await callEvolution("connect", { instanceName: instanceName.trim() });
      const base64 = res.base64;
      if (base64) {
        setQrCode(base64);
        toast.success("QR Code gerado! Escaneie com o WhatsApp.");
        startPollingStatus();
      } else {
        toast.info("Nenhum QR Code retornado. A instância pode já estar conectada.");
        checkStatus();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao conectar";
      toast.error(msg);
      setStatus("error");
    }
  };

  const checkStatus = async () => {
    try {
      const res = await callEvolution("status", { instanceName: instanceName.trim() });
      const state = res.instance?.state || res.state || null;
      setConnectionState(state);
      if (state === "open") {
        setStatus("connected");
        setQrCode(null);
      }
      return state;
    } catch {
      return null;
    }
  };

  const startPollingStatus = () => {
    let attempts = 0;
    const maxAttempts = 40; // ~2 min
    const interval = setInterval(async () => {
      attempts++;
      const state = await checkStatus();
      if (state === "open" || attempts >= maxAttempts) {
        clearInterval(interval);
        if (state === "open") {
          toast.success("WhatsApp conectado com sucesso!");
        } else if (attempts >= maxAttempts) {
          toast.info("Tempo esgotado. Verifique o status manualmente.");
          setStatus("idle");
        }
      }
    }, 3000);
  };

  const handleSendMessage = async () => {
    if (!instanceName.trim() || !number.trim() || !message.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSending(true);
    try {
      await callEvolution("sendText", {
        instanceName: instanceName.trim(),
        number: number.trim(),
        text: message.trim(),
      });
      toast.success("Mensagem enviada!");
      setMessage("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const statusBadge = () => {
    if (connectionState === "open") return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</Badge>;
    if (connectionState === "close") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Desconectado</Badge>;
    if (status === "connecting") return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Conectando...</Badge>;
    if (status === "creating") return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Criando...</Badge>;
    return <Badge variant="outline">Aguardando</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integração WhatsApp</h1>
        <p className="text-muted-foreground mt-1">Conecte e gerencie suas instâncias WhatsApp via Evolution API</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step 1 & 2: Create + Connect */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="w-5 h-5 text-primary" />
              Instância WhatsApp
            </CardTitle>
            <CardDescription>Crie e conecte uma instância para começar a enviar mensagens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome da instância</label>
              <Input
                placeholder="ex: minha-empresa"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              {statusBadge()}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCreateInstance}
                disabled={status === "creating" || !instanceName.trim()}
                className="flex-1"
              >
                {status === "creating" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Criar Instância
              </Button>
              <Button
                onClick={handleConnect}
                disabled={status === "connecting" || !instanceName.trim()}
                variant="secondary"
                className="flex-1"
              >
                {status === "connecting" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4 mr-2" />
                )}
                Conectar WhatsApp
              </Button>
            </div>

            <Button
              onClick={checkStatus}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!instanceName.trim()}
            >
              <QrCode className="w-4 h-4 mr-2" />
              Verificar Status
            </Button>

            {/* QR Code Area */}
            {qrCode && (
              <>
                <Separator />
                <div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm font-medium text-foreground">Escaneie o QR Code com o WhatsApp</p>
                  <div className="bg-white p-3 rounded-lg">
                    <img
                      src={qrCode}
                      alt="QR Code WhatsApp"
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">O status será atualizado automaticamente</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Send Message */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5 text-primary" />
              Enviar Mensagem
            </CardTitle>
            <CardDescription>Envie uma mensagem de teste para verificar a conexão</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Número (com DDI)</label>
              <Input
                placeholder="ex: 5511999999999"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mensagem</label>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="bg-background resize-none"
              />
            </div>

            <Button
              onClick={handleSendMessage}
              disabled={sending || !instanceName.trim() || !number.trim() || !message.trim()}
              className="w-full"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar Mensagem
            </Button>

            {/* Flow guide */}
            <Separator />
            <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm font-medium text-foreground">Fluxo de uso</p>
              <div className="space-y-2">
                {[
                  { step: 1, label: "Crie a instância com um nome único" },
                  { step: 2, label: "Conecte o WhatsApp escaneando o QR Code" },
                  { step: 3, label: "Aguarde a confirmação de conexão" },
                  { step: 4, label: "Envie uma mensagem de teste" },
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-medium shrink-0">
                      {item.step}
                    </span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
