import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, Search, Send, ArrowLeft, User, Smartphone, RefreshCw, Wifi, WifiOff,
} from "lucide-react";

interface WhapiChat {
  id: string;
  name?: string;
  chat_pic?: string;
  last_message_time?: number;
  last_message?: { text?: { body?: string }; type?: string };
  not_spam?: boolean;
  unread_count?: number;
}

interface WhapiMessage {
  id: string;
  from_me: boolean;
  text?: { body?: string };
  timestamp: number;
  type: string;
  from?: string;
  chat_id?: string;
}

interface DeviceInfo {
  id: string;
  name: string;
  number: string | null;
  status: string;
  has_token: boolean;
  profile_picture: string | null;
}

const CRM = () => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [chats, setChats] = useState<WhapiChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<WhapiChat | null>(null);
  const [messages, setMessages] = useState<WhapiMessage[]>([]);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load devices
  useEffect(() => {
    const fetchDevices = async () => {
      const { data } = await supabase.functions.invoke("whapi-chats", {
        body: null,
        method: "GET",
      });
      if (data?.devices) {
        setDevices(data.devices);
        if (data.devices.length === 1) {
          setSelectedDevice(data.devices[0].id);
        }
      }
    };
    fetchDevices();
  }, []);

  // Load chats when device selected
  useEffect(() => {
    if (!selectedDevice) return;
    loadChats();
  }, [selectedDevice]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChats = async () => {
    if (!selectedDevice) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        `whapi-chats?action=list_chats&device_id=${selectedDevice}&count=30`,
        { method: "GET" }
      );
      if (error) throw error;
      setChats(data?.chats || []);
    } catch (err: any) {
      toast({ title: "Erro ao carregar conversas", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chat: WhapiChat) => {
    setSelectedChat(chat);
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        `whapi-chats?action=get_messages&device_id=${selectedDevice}&chat_id=${encodeURIComponent(chat.id)}&count=50`,
        { method: "GET" }
      );
      if (error) throw error;
      setMessages((data?.messages || []).sort((a: WhapiMessage, b: WhapiMessage) => a.timestamp - b.timestamp));
    } catch (err: any) {
      toast({ title: "Erro ao carregar mensagens", description: err.message, variant: "destructive" });
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!reply.trim() || !selectedChat || !selectedDevice) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        `whapi-chats?action=send_message&device_id=${selectedDevice}`,
        {
          method: "POST",
          body: { to: selectedChat.id, message: reply.trim() },
        }
      );
      if (error) throw error;
      setReply("");
      // Reload messages
      await loadMessages(selectedChat);
      toast({ title: "Mensagem enviada" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(ts);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const getChatName = (chat: WhapiChat) => {
    return chat.name || chat.id?.replace("@s.whatsapp.net", "")?.replace("@g.us", "") || "Sem nome";
  };

  const getMessageText = (msg: WhapiMessage) => {
    if (msg.text?.body) return msg.text.body;
    if (msg.type === "image") return "📷 Imagem";
    if (msg.type === "video") return "🎥 Vídeo";
    if (msg.type === "audio" || msg.type === "ptt") return "🎤 Áudio";
    if (msg.type === "document") return "📄 Documento";
    if (msg.type === "sticker") return "🏷️ Sticker";
    if (msg.type === "location") return "📍 Localização";
    if (msg.type === "contact" || msg.type === "vcard") return "👤 Contato";
    return `[${msg.type}]`;
  };

  const getLastMessagePreview = (chat: WhapiChat) => {
    if (chat.last_message?.text?.body) return chat.last_message.text.body;
    if (chat.last_message?.type) {
      const typeMap: Record<string, string> = { image: "📷 Imagem", video: "🎥 Vídeo", audio: "🎤 Áudio", document: "📄 Doc" };
      return typeMap[chat.last_message.type] || chat.last_message.type;
    }
    return "";
  };

  const filteredChats = chats.filter((c) => {
    const name = getChatName(c).toLowerCase();
    return name.includes(search.toLowerCase()) || c.id?.includes(search);
  });

  const initials = (name: string) => name.slice(0, 2).toUpperCase();

  const selectedDeviceInfo = devices.find((d) => d.id === selectedDevice);

  return (
    <div className="space-y-3 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conversas</h1>
          <p className="text-sm text-muted-foreground">Visualize e responda conversas do WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          {devices.length > 1 && (
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="h-9 w-52 text-sm">
                <SelectValue placeholder="Selecionar chip" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>{d.name}</span>
                      {d.number && <span className="text-muted-foreground">({d.number})</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedDevice && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={loadChats} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          )}
        </div>
      </div>

      {/* Device status bar */}
      {selectedDeviceInfo && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {selectedDeviceInfo.status === "Ready" ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-destructive" />
          )}
          <span>
            {selectedDeviceInfo.name}
            {selectedDeviceInfo.number ? ` • ${selectedDeviceInfo.number}` : ""}
            {" • "}
            {selectedDeviceInfo.status === "Ready" ? "Online" : "Offline"}
          </span>
        </div>
      )}

      {/* No device selected */}
      {!selectedDevice && devices.length === 0 && (
        <Card className="glass-card p-12 text-center">
          <Smartphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum dispositivo com token configurado</p>
          <p className="text-xs text-muted-foreground mt-1">Conecte um dispositivo na página de Dispositivos primeiro</p>
        </Card>
      )}

      {!selectedDevice && devices.length > 0 && (
        <Card className="glass-card p-12 text-center">
          <Smartphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Selecione um dispositivo para ver as conversas</p>
        </Card>
      )}

      {/* Chat interface */}
      {selectedDevice && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 h-[calc(100vh-240px)]">
          {/* Chat list */}
          <Card className={`glass-card overflow-hidden lg:col-span-1 ${selectedChat ? "hidden lg:flex lg:flex-col" : "flex flex-col"}`}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar conversa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="space-y-2 p-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-24" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada</p>
                </div>
              ) : (
                filteredChats.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors ${selectedChat?.id === c.id ? "bg-muted/50" : ""}`}
                    onClick={() => loadMessages(c)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {c.chat_pic ? (
                            <img src={c.chat_pic} alt="" className="w-full h-full object-cover rounded-full"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <span className="text-xs font-bold text-primary">{initials(getChatName(c))}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{getChatName(c)}</p>
                          <p className="text-xs text-muted-foreground truncate">{getLastMessagePreview(c)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <span className="text-[10px] text-muted-foreground">{formatDate(c.last_message_time || 0)}</span>
                        {(c.unread_count || 0) > 0 && (
                          <Badge className="h-4 min-w-[16px] px-1 flex items-center justify-center text-[9px] bg-primary">{c.unread_count}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </Card>

          {/* Messages area */}
          <Card className={`glass-card overflow-hidden lg:col-span-2 flex flex-col ${!selectedChat ? "hidden lg:flex" : "flex"}`}>
            {selectedChat ? (
              <>
                <div className="p-3 border-b border-border flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setSelectedChat(null)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {selectedChat.chat_pic ? (
                      <img src={selectedChat.chat_pic} alt="" className="w-full h-full object-cover rounded-full"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="text-xs font-bold text-primary">{initials(getChatName(selectedChat))}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{getChatName(selectedChat)}</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">{selectedChat.id?.replace("@s.whatsapp.net", "")?.replace("@g.us", "")}</p>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  {loadingMessages ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                          <Skeleton className="h-10 w-48 rounded-xl" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.from_me ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${msg.from_me ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                            <p className="break-words whitespace-pre-wrap">{getMessageText(msg)}</p>
                            <p className={`text-[10px] mt-1 ${msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {formatTime(msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                <div className="p-3 border-t border-border flex gap-2">
                  <Textarea
                    placeholder="Digite sua resposta..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    rows={1}
                    className="min-h-[40px] resize-none"
                  />
                  <Button size="icon" className="shrink-0 h-10 w-10" onClick={sendMessage} disabled={sending || !reply.trim()}>
                    <Send className={`w-4 h-4 ${sending ? "animate-pulse" : ""}`} />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Selecione uma conversa para visualizar</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default CRM;
