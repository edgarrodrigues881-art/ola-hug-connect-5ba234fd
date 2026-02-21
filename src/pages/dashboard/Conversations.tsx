import { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, Search, Send, ArrowLeft, Smartphone, RefreshCw, Wifi, WifiOff,
  Check, CheckCheck, Smile, Paperclip,
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
  status?: string;
}

interface DeviceInfo {
  id: string;
  name: string;
  number: string | null;
  status: string;
  has_token: boolean;
  profile_picture: string | null;
}

const QUICK_REPLIES = [
  "Olá! Tudo bem? 😊",
  "Obrigado pelo contato!",
  "Vou verificar e retorno em breve.",
  "Pode me enviar mais detalhes?",
  "Perfeito, vamos prosseguir!",
];

const Conversations = () => {
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
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      const { data } = await supabase.functions.invoke("whapi-chats", { body: null, method: "GET" });
      if (data?.devices) {
        setDevices(data.devices);
        if (data.devices.length === 1) setSelectedDevice(data.devices[0].id);
      }
    };
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) loadChats();
  }, [selectedDevice]);

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
    setShowQuickReplies(false);
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

  const sendMessage = async (text?: string) => {
    const msg = text || reply.trim();
    if (!msg || !selectedChat || !selectedDevice) return;
    setSending(true);
    setShowQuickReplies(false);
    try {
      const { error } = await supabase.functions.invoke(
        `whapi-chats?action=send_message&device_id=${selectedDevice}`,
        { method: "POST", body: { to: selectedChat.id, message: msg } }
      );
      if (error) throw error;
      setReply("");
      await loadMessages(selectedChat);
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: number) => {
    if (!ts) return "";
    return new Date(ts * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(ts);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const getDateLabel = (ts: number) => {
    const d = new Date(ts * 1000);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Hoje";
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const getChatName = (chat: WhapiChat) =>
    chat.name || chat.id?.replace("@s.whatsapp.net", "")?.replace("@g.us", "") || "Sem nome";

  const getMessageText = (msg: WhapiMessage) => {
    if (msg.text?.body) return msg.text.body;
    const map: Record<string, string> = {
      image: "📷 Imagem", video: "🎥 Vídeo", audio: "🎤 Áudio", ptt: "🎤 Áudio",
      document: "📄 Documento", sticker: "🏷️ Sticker", location: "📍 Localização",
      contact: "👤 Contato", vcard: "👤 Contato",
    };
    return map[msg.type] || `[${msg.type}]`;
  };

  const getLastMessagePreview = (chat: WhapiChat) => {
    if (chat.last_message?.text?.body) return chat.last_message.text.body;
    if (chat.last_message?.type) {
      const map: Record<string, string> = { image: "📷 Imagem", video: "🎥 Vídeo", audio: "🎤 Áudio", document: "📄 Doc" };
      return map[chat.last_message.type] || chat.last_message.type;
    }
    return "";
  };

  const filteredChats = chats.filter((c) => {
    const name = getChatName(c).toLowerCase();
    return name.includes(search.toLowerCase()) || c.id?.includes(search);
  });

  const initials = (name: string) => name.slice(0, 2).toUpperCase();
  const selectedDeviceInfo = devices.find((d) => d.id === selectedDevice);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { label: string; messages: WhapiMessage[] }[] = [];
    let currentDate = "";
    messages.forEach((msg) => {
      const dateKey = new Date(msg.timestamp * 1000).toDateString();
      if (dateKey !== currentDate) {
        currentDate = dateKey;
        groups.push({ label: getDateLabel(msg.timestamp), messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    return groups;
  }, [messages]);

  const StatusChecks = ({ msg }: { msg: WhapiMessage }) => {
    if (!msg.from_me) return null;
    if (msg.status === "read" || msg.status === "played") return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
    if (msg.status === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/50" />;
    return <Check className="w-3.5 h-3.5 text-primary-foreground/50" />;
  };

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
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Device status */}
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
            {" • "}{selectedDeviceInfo.status === "Ready" ? "Online" : "Offline"}
          </span>
        </div>
      )}

      {/* Empty states */}
      {!selectedDevice && (
        <Card className="glass-card p-12 text-center">
          <Smartphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {devices.length === 0
              ? "Nenhum dispositivo com token configurado"
              : "Selecione um dispositivo para ver as conversas"}
          </p>
        </Card>
      )}

      {/* Chat interface */}
      {selectedDevice && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-0 h-[calc(100vh-240px)] border border-border rounded-xl overflow-hidden">
          {/* Chat list */}
          <div className={`bg-card border-r border-border flex flex-col ${selectedChat ? "hidden lg:flex" : "flex"}`}>
            <div className="p-3 border-b border-border bg-muted/30">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar conversa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 bg-background" />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="space-y-0">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border-b border-border/30">
                      <Skeleton className="w-11 h-11 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma conversa</p>
                </div>
              ) : (
                filteredChats.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 border-b border-border/30 cursor-pointer transition-colors ${
                      selectedChat?.id === c.id ? "bg-primary/10" : "hover:bg-muted/40"
                    }`}
                    onClick={() => loadMessages(c)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {c.chat_pic ? (
                          <img src={c.chat_pic} alt="" className="w-full h-full object-cover rounded-full"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <span className="text-xs font-bold text-primary">{initials(getChatName(c))}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground truncate">{getChatName(c)}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatDate(c.last_message_time || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-muted-foreground truncate pr-2">{getLastMessagePreview(c)}</p>
                          {(c.unread_count || 0) > 0 && (
                            <Badge className="h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] bg-primary rounded-full shrink-0">
                              {c.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Messages area */}
          <div className={`flex flex-col bg-card ${!selectedChat ? "hidden lg:flex" : "flex"}`}>
            {selectedChat ? (
              <>
                {/* Chat header */}
                <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden shrink-0" onClick={() => setSelectedChat(null)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                    {selectedChat.chat_pic ? (
                      <img src={selectedChat.chat_pic} alt="" className="w-full h-full object-cover rounded-full"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="text-xs font-bold text-primary">{initials(getChatName(selectedChat))}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{getChatName(selectedChat)}</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {selectedChat.id?.replace("@s.whatsapp.net", "")?.replace("@g.us", "")}
                    </p>
                  </div>
                </div>

                {/* Messages with WhatsApp-style background */}
                <div
                  className="flex-1 overflow-y-auto px-3 sm:px-6 py-4"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                >
                  {loadingMessages ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                          <Skeleton className="h-12 w-52 rounded-xl" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {groupedMessages.map((group, gi) => (
                        <div key={gi}>
                          {/* Date separator */}
                          <div className="flex items-center justify-center my-4">
                            <span className="text-[11px] text-muted-foreground bg-muted/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                              {group.label}
                            </span>
                          </div>
                          {group.messages.map((msg) => (
                            <div key={msg.id} className={`flex mb-1 ${msg.from_me ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`relative max-w-[80%] sm:max-w-[65%] px-3 py-1.5 text-sm shadow-sm ${
                                  msg.from_me
                                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                                    : "bg-card text-foreground border border-border rounded-2xl rounded-bl-md"
                                }`}
                              >
                                <p className="break-words whitespace-pre-wrap leading-relaxed">{getMessageText(msg)}</p>
                                <div className={`flex items-center gap-1 justify-end mt-0.5 ${
                                  msg.from_me ? "text-primary-foreground/60" : "text-muted-foreground"
                                }`}>
                                  <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
                                  <StatusChecks msg={msg} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Quick replies */}
                {showQuickReplies && (
                  <div className="px-3 py-2 border-t border-border bg-muted/30 flex gap-2 overflow-x-auto">
                    {QUICK_REPLIES.map((qr, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(qr)}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input area */}
                <div className="p-3 border-t border-border bg-muted/30 flex items-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground"
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      placeholder="Digite uma mensagem"
                      value={reply}
                      onChange={(e) => {
                        setReply(e.target.value);
                        // Auto-resize
                        e.target.style.height = "auto";
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                      }}
                      rows={1}
                      className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                      style={{ minHeight: "40px", maxHeight: "120px" }}
                    />
                  </div>
                  <Button
                    size="icon"
                    className="shrink-0 h-10 w-10 rounded-full"
                    onClick={() => sendMessage()}
                    disabled={sending || !reply.trim()}
                  >
                    <Send className={`w-4 h-4 ${sending ? "animate-pulse" : ""}`} />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-10 h-10 text-primary/40" />
                  </div>
                  <p className="text-base font-medium text-foreground mb-1">DG Contingência Pro</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Selecione uma conversa à esquerda para visualizar e responder mensagens
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Conversations;
