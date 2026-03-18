import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Plug, RefreshCw, Loader2, CheckCircle2, Smartphone, QrCode, XCircle,
  LogOut, Key, Send, Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WhatsAppGroup {
  id: string;
  name: string;
  participants?: number;
}

export default function AdminConexao() {
  const queryClient = useQueryClient();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(30);
  const [qrConnected, setQrConnected] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [connectMethod, setConnectMethod] = useState<"qr" | "code">("qr");
  const [connectStep, setConnectStep] = useState<"choose" | "active">("choose");
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [sendingTest, setSendingTest] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const qrCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get community_settings for wa_report_device_id and wa_report_group_id
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-conexao-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_settings")
        .select("key, value")
        .in("key", ["wa_report_device_id", "wa_report_group_id", "wa_report_group_name"]);
      const map: Record<string, string> = {};
      for (const r of data || []) map[r.key] = r.value;
      return map;
    },
  });

  const deviceId = settings?.wa_report_device_id || null;
  const groupId = settings?.wa_report_group_id || null;
  const groupName = settings?.wa_report_group_name || null;

  // Get device info
  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: ["admin-conexao-device", deviceId],
    queryFn: async () => {
      if (!deviceId) return null;
      const { data } = await supabase
        .from("devices")
        .select("id, name, number, status, profile_name, profile_picture, uazapi_token, uazapi_base_url")
        .eq("id", deviceId)
        .maybeSingle();
      return data;
    },
    enabled: !!deviceId,
  });

  const isConnected = device?.status === "Connected" || device?.status === "Ready" || device?.status === "authenticated";
  const hasCredentials = !!(device?.uazapi_token && device?.uazapi_base_url);

  // ─── QR Connect ───
  const openConnectDialog = () => {
    setQrDialogOpen(true);
    setConnectStep("choose");
    setConnectMethod("qr");
    setQrCodeBase64("");
    setQrConnected(false);
    setConnectError("");
    setPairingCode("");
    setPairingPhone("");
  };

  const startQrConnect = async () => {
    if (!deviceId || !device) return;
    setQrLoading(true);
    setQrCodeBase64("");
    setQrConnected(false);
    setConnectError("");

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "connect", deviceId }),
        }
      );
      const result = await res.json();

      if (result.base64 || result.qr) {
        setQrCodeBase64(result.base64 || result.qr);
        startCountdownAndPoll(deviceId);
      } else if (result.pairing_code) {
        setPairingCode(result.pairing_code);
        setConnectMethod("code");
      } else {
        setConnectError(result.error || "Erro ao gerar QR Code");
      }
    } catch (e) {
      setConnectError("Erro de conexão");
    } finally {
      setQrLoading(false);
    }
  };

  const startCountdownAndPoll = (devId: string) => {
    if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
    if (pollRef.current) clearInterval(pollRef.current);

    let countdown = 30;
    setQrCountdown(30);

    qrCountdownRef.current = setInterval(() => {
      countdown--;
      setQrCountdown(countdown);
      if (countdown <= 0 && qrCountdownRef.current) clearInterval(qrCountdownRef.current);
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-connect`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ action: "status", deviceId: devId }),
          }
        );
        const result = await res.json();

        if (result.status === "authenticated") {
          setQrConnected(true);
          if (pollRef.current) clearInterval(pollRef.current);
          if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
          queryClient.invalidateQueries({ queryKey: ["admin-conexao-device"] });
          toast.success("Dispositivo conectado!");
        } else if (result.base64 || result.qr) {
          // Update QR code if a new one was returned
          setQrCodeBase64(result.base64 || result.qr);
        }
      } catch (_e) {
        // Silently ignore polling errors
      }
    }, 3000);
  };

  // ─── Pairing Code ───
  const requestPairingCode = async () => {
    if (!deviceId || !pairingPhone) return;
    setPairingLoading(true);
    setPairingCode("");
    setConnectError("");

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "requestPairingCode", deviceId, phoneNumber: pairingPhone.replace(/\D/g, "") }),
        }
      );
      const result = await res.json();

      if (result.pairingCode || result.pairing_code) {
        setPairingCode(result.pairingCode || result.pairing_code);
        startCountdownAndPoll(deviceId);
      } else {
        setConnectError(result.error || "Erro ao gerar código");
      }
    } catch (e) {
      setConnectError("Erro de conexão");
    } finally {
      setPairingLoading(false);
    }
  };

  // ─── Disconnect ───
  const handleDisconnect = async () => {
    if (!deviceId) return;
    setDisconnecting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "logout", deviceId }),
        }
      );

      queryClient.invalidateQueries({ queryKey: ["admin-conexao-device"] });
      toast.success("Dispositivo desconectado");
    } catch (e) {
      toast.error("Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  };

  // ─── Load Groups ───
  const loadGroups = async () => {
    if (!deviceId) return;
    setLoadingGroups(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-connect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "listGroups", deviceId }),
        }
      );
      const data = await res.json();
      const raw = Array.isArray(data?.groups) ? data.groups : Array.isArray(data) ? data : [];
      const list = raw.map((g: any) => ({
        id: g.id || g.jid,
        name: g.name || g.subject || "Sem nome",
        participants: g.participants?.length || g.size || 0,
      }));
      setGroups(list);
    } catch (e) {
      toast.error("Erro ao carregar grupos");
    } finally {
      setLoadingGroups(false);
    }
  };

  // ─── Select Group ───
  const upsertSetting = async (key: string, value: string) => {
    const { data: existing } = await supabase
      .from("community_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();
    if (existing) {
      await supabase.from("community_settings").update({ value }).eq("key", key);
    } else {
      await supabase.from("community_settings").insert({ key, value });
    }
  };

  const selectGroup = async (group: WhatsAppGroup) => {
    try {
      await Promise.all([
        upsertSetting("wa_report_group_id", group.id),
        upsertSetting("wa_report_group_name", group.name),
      ]);
      queryClient.invalidateQueries({ queryKey: ["admin-conexao-settings"] });
      toast.success(`Grupo "${group.name}" selecionado`);
      setGroups([]);
    } catch (e) {
      toast.error("Erro ao salvar grupo");
    }
  };

  // ─── Send Test ───
  const sendTest = async () => {
    if (!deviceId || !groupId) return;
    setSendingTest(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const groupNumber = groupId.replace(/@g\.us$/, "");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-connect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: "sendText",
            deviceId,
            number: groupNumber,
            text: "✅ Teste de conexão — DG Contingência PRO\n\nSe você recebeu esta mensagem, a conexão está funcionando.",
          }),
        }
      );
      const result = await res.json();
      if (result.success) toast.success("Mensagem de teste enviada!");
      else toast.error(result.error || "Falha ao enviar teste");
    } catch (e) {
      toast.error("Erro de conexão");
    } finally {
      setSendingTest(false);
    }
  };


  useEffect(() => {
    return () => {
      if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (settingsLoading || deviceLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!deviceId) {
    return (
      <div className="text-center py-16">
        <Plug size={40} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhum dispositivo de envio configurado.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Configure <code className="bg-muted px-1 rounded">wa_report_device_id</code> em community_settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Device Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {device?.profile_picture ? (
              <img src={device.profile_picture} alt="" className="w-12 h-12 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Smartphone size={22} className="text-muted-foreground" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-foreground">{device?.name || "Dispositivo"}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {device?.profile_name || device?.number || "Sem número"}
              </p>
              <Badge
                variant="outline"
                className={`mt-1 text-[10px] ${
                  isConnected
                    ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                    : "border-destructive/30 text-destructive bg-destructive/5"
                }`}
              >
                {isConnected ? (
                  <><CheckCircle2 size={10} className="mr-1" /> Conectado</>
                ) : (
                  <><XCircle size={10} className="mr-1" /> Desconectado</>
                )}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {isConnected && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                {disconnecting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <LogOut size={14} className="mr-1" />}
                Desconectar
              </Button>
            )}
            {!isConnected && (
              <Button size="sm" onClick={openConnectDialog} className="text-xs">
                <QrCode size={14} className="mr-1" />
                Reconectar
              </Button>
            )}
          </div>
        </div>
      </div>



      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Users size={16} className="text-primary" /> Grupo de Relatórios
        </h4>

        {groupId ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-medium text-foreground">{groupName || "Grupo de Relatórios"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">As mensagens automáticas e relatórios serão enviados para este grupo.</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={sendTest}
                disabled={sendingTest || !isConnected}
                className="text-xs"
              >
                {sendingTest ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Send size={14} className="mr-1" />}
                Enviar Teste
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={loadGroups}
                disabled={loadingGroups || !isConnected}
                className="text-xs"
              >
                {loadingGroups ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
                Trocar Grupo
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">Nenhum grupo selecionado</p>
            <Button size="sm" onClick={loadGroups} disabled={loadingGroups || !isConnected} className="text-xs">
              {loadingGroups ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Users size={14} className="mr-1" />}
              Selecionar Grupo
            </Button>
          </div>
        )}

        {/* Group List */}
        {groups.length > 0 && (
          <div className="mt-4 border rounded-lg border-border max-h-[280px] overflow-y-auto">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => selectGroup(g)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors border-b border-border last:border-0 text-left"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{g.name}</p>
                  <p className="text-[11px] text-muted-foreground">{g.participants || 0} participantes</p>
                </div>
                <CheckCircle2 size={14} className={`shrink-0 ${groupId === g.id ? "text-primary" : "text-transparent"}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {connectStep === "choose" ? "Como deseja conectar?" : connectMethod === "qr" ? "Escaneie o QR Code" : "Código de pareamento"}
            </DialogTitle>
          </DialogHeader>

          {connectStep === "choose" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Escolha o método de conexão:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setConnectMethod("qr"); setConnectStep("active"); startQrConnect(); }}
                  className="group flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 border-border/30 hover:border-primary/50 bg-card hover:bg-primary/[0.04] transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <QrCode className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-foreground block">QR Code</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">Escaneie com o celular</span>
                  </div>
                </button>
                <button
                  onClick={() => { setConnectMethod("code"); setConnectStep("active"); }}
                  className="group flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 border-border/30 hover:border-primary/50 bg-card hover:bg-primary/[0.04] transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Key className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-bold text-foreground block">Código</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">Digite um código numérico</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => { setConnectStep("choose"); setConnectError(""); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
              >
                ← Voltar
              </button>

              {connectMethod === "qr" ? (
                <div className="flex flex-col items-center gap-3">
                  {qrConnected ? (
                    <>
                      <CheckCircle2 size={48} className="text-emerald-500" />
                      <p className="text-sm font-medium text-emerald-500">Conectado com sucesso!</p>
                    </>
                  ) : qrCodeBase64 ? (
                    <>
                      <img src={qrCodeBase64.startsWith("data:") ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`} alt="QR Code" className="w-56 h-56 rounded-lg" />
                      <p className="text-xs text-muted-foreground">Expira em {qrCountdown}s</p>
                    </>
                  ) : qrLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : connectError ? (
                    <p className="text-sm text-destructive">{connectError}</p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  {pairingCode ? (
                    <div className="text-center">
                      <p className="text-2xl font-mono font-bold tracking-[0.3em] text-foreground">{pairingCode}</p>
                      <p className="text-xs text-muted-foreground mt-2">Digite este código no WhatsApp</p>
                    </div>
                  ) : (
                    <>
                      <Input
                        placeholder="5562999999999"
                        value={pairingPhone}
                        onChange={(e) => setPairingPhone(e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        size="sm"
                        className="w-full text-xs"
                        onClick={requestPairingCode}
                        disabled={pairingLoading || !pairingPhone}
                      >
                        {pairingLoading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Key size={14} className="mr-1" />}
                        Gerar Código
                      </Button>
                    </>
                  )}
                  {connectError && <p className="text-xs text-destructive text-center">{connectError}</p>}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
