import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  MessageSquare, Search, Send, ArrowLeft, Smartphone, RefreshCw,
  Check, CheckCheck, Smile, MoreVertical, Phone, Video, Mic, Image, Paperclip, X,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
interface WhapiChat {
  id: string;
  name?: string;
  chat_pic?: string;
  last_message_time?: number;
  last_message?: { text?: { body?: string }; type?: string; from_me?: boolean };
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

// ─── Constants ───────────────────────────────────────────────
const QUICK_REPLIES = [
  "Olá! Tudo bem? 😊",
  "Obrigado pelo contato!",
  "Vou verificar e retorno em breve.",
  "Pode me enviar mais detalhes?",
  "Perfeito, vamos prosseguir! 👍",
];

const AUTO_REFRESH_MS = 15000; // 15s for messages, 30s for chat list

// ─── Component ───────────────────────────────────────────────
const Conversations = () => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
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
  const selectedChatRef = useRef<WhapiChat | null>(null);
  const selectedDeviceRef = useRef("");

  // Keep refs in sync
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  useEffect(() => { selectedDeviceRef.current = selectedDevice; }, [selectedDevice]);

  // ─── Data loading ──────────────────────────────────────────
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

  const loadChats = useCallback(async (silent = false) => {
    const deviceId = selectedDeviceRef.current;
    if (!deviceId) return;
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        `whapi-chats?action=list_chats&device_id=${deviceId}&count=50`,
        { method: "GET" }
      );
      if (error) throw error;
      setChats(data?.chats || []);
    } catch (err: any) {
      if (!silent) toast({ title: "Erro ao carregar conversas", description: err.message, variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  const loadMessages = useCallback(async (chat: WhapiChat, silent = false) => {
    if (!silent) {
      setSelectedChat(chat);
      setLoadingMessages(true);
      setShowQuickReplies(false);
    }
    try {
      const { data, error } = await supabase.functions.invoke(
        `whapi-chats?action=get_messages&device_id=${selectedDeviceRef.current}&chat_id=${encodeURIComponent(chat.id)}&count=50`,
        { method: "GET" }
      );
      if (error) throw error;
      const sorted = (data?.messages || []).sort((a: WhapiMessage, b: WhapiMessage) => a.timestamp - b.timestamp);
      setMessages(sorted);
    } catch (err: any) {
      if (!silent) toast({ title: "Erro ao carregar mensagens", description: err.message, variant: "destructive" });
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }, [toast]);

  // Load chats on device change
  useEffect(() => { if (selectedDevice) loadChats(); }, [selectedDevice, loadChats]);

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ─── Auto-refresh polling ──────────────────────────────────
  useEffect(() => {
    if (!selectedDevice) return;
    const interval = setInterval(() => {
      // Refresh chat list silently
      loadChats(true);
      // Refresh current conversation messages silently
      const currentChat = selectedChatRef.current;
      if (currentChat) loadMessages(currentChat, true);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [selectedDevice, loadChats, loadMessages]);

  // ─── Send message ──────────────────────────────────────────
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
      if (inputRef.current) { inputRef.current.style.height = "40px"; }
      await loadMessages(selectedChat);
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ─── Formatters ────────────────────────────────────────────
  const formatTime = (ts: number) => {
    if (!ts) return "";
    return new Date(ts * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(ts);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const getDateLabel = (ts: number) => {
    const d = new Date(ts * 1000);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "HOJE";
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "ONTEM";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase();
  };

  const getChatName = (chat: WhapiChat) =>
    chat.name || chat.id?.replace("@s.whatsapp.net", "")?.replace("@g.us", "") || "Sem nome";

  const getMessageText = (msg: WhapiMessage) => {
    if (msg.text?.body) return msg.text.body;
    const map: Record<string, string> = {
      image: "📷 Foto", video: "🎥 Vídeo", audio: "🎤 Áudio", ptt: "🎤 Mensagem de voz",
      document: "📄 Documento", sticker: "🏷️ Figurinha", location: "📍 Localização",
      contact: "👤 Contato", vcard: "👤 Contato",
    };
    return map[msg.type] || `[${msg.type}]`;
  };

  const getLastPreview = (chat: WhapiChat) => {
    const prefix = chat.last_message?.from_me ? "Você: " : "";
    if (chat.last_message?.text?.body) return prefix + chat.last_message.text.body;
    if (chat.last_message?.type) {
      const map: Record<string, string> = { image: "📷 Foto", video: "🎥 Vídeo", audio: "🎤 Áudio", document: "📄 Documento", ptt: "🎤 Áudio" };
      return prefix + (map[chat.last_message.type] || chat.last_message.type);
    }
    return "";
  };

  const initials = (name: string) => name.slice(0, 2).toUpperCase();
  const selectedDeviceInfo = devices.find((d) => d.id === selectedDevice);

  const filteredChats = chats.filter((c) => {
    const name = getChatName(c).toLowerCase();
    return name.includes(search.toLowerCase()) || c.id?.includes(search);
  });

  // ─── Grouped messages ─────────────────────────────────────
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

  // ─── Status checks component ──────────────────────────────
  const StatusIcon = ({ status, fromMe }: { status?: string; fromMe: boolean }) => {
    if (!fromMe) return null;
    const cls = "w-[14px] h-[14px] ml-0.5";
    if (status === "read" || status === "played") return <CheckCheck className={`${cls} text-sky-400`} />;
    if (status === "delivered") return <CheckCheck className={`${cls} text-muted-foreground/60`} />;
    return <Check className={`${cls} text-muted-foreground/60`} />;
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] animate-fade-up">
      {/* Top bar — device selector */}
      <div className="flex items-center justify-between px-1 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Conversas</h1>
          {selectedDeviceInfo && (
            <Badge variant="outline" className={`text-[10px] gap-1 ${selectedDeviceInfo.status === "Ready" ? "border-emerald-500/40 text-emerald-600" : "border-destructive/40 text-destructive"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${selectedDeviceInfo.status === "Ready" ? "bg-emerald-500" : "bg-destructive"}`} />
              {selectedDeviceInfo.status === "Ready" ? "Online" : "Offline"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {devices.length > 1 && (
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Selecionar chip" /></SelectTrigger>
              <SelectContent>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="flex items-center gap-1.5"><Smartphone className="w-3 h-3" />{d.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* No device */}
      {!selectedDevice && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Smartphone className="w-16 h-16 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">{devices.length === 0 ? "Nenhum dispositivo configurado" : "Selecione um chip"}</p>
          </div>
        </div>
      )}

      {/* Main chat layout */}
      {selectedDevice && (
        <div className="flex-1 flex border border-border rounded-xl overflow-hidden min-h-0">
          {/* ─── Left panel: chat list ─── */}
          <div className={`w-full lg:w-[380px] lg:min-w-[320px] lg:max-w-[420px] border-r border-border flex flex-col bg-card ${selectedChat ? "hidden lg:flex" : "flex"}`}>
            {/* Search header */}
            <div className="px-3 py-2.5 bg-muted/40 border-b border-border flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar ou começar uma nova conversa"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-8 text-xs bg-background rounded-lg"
                />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => loadChats()} disabled={loading}>
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Chat list */}
            <ScrollArea className="flex-1">
              {loading && chats.length === 0 ? (
                <div>
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-border/20">
                      <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-48" /></div>
                    </div>
                  ))}
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="p-10 text-center"><p className="text-xs text-muted-foreground">Nenhuma conversa</p></div>
              ) : (
                filteredChats.map((c) => {
                  const isActive = selectedChat?.id === c.id;
                  const hasUnread = (c.unread_count || 0) > 0;
                  return (
                    <div
                      key={c.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-border/10 ${isActive ? "bg-primary/8" : "hover:bg-muted/50"}`}
                      onClick={() => loadMessages(c)}
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {c.chat_pic ? (
                          <img src={c.chat_pic} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <span className="text-sm font-semibold text-muted-foreground">{initials(getChatName(c))}</span>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <p className={`text-[13px] truncate ${hasUnread ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                            {getChatName(c)}
                          </p>
                          <span className={`text-[11px] shrink-0 ml-2 ${hasUnread ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                            {formatDate(c.last_message_time || 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className={`text-xs truncate pr-2 ${hasUnread ? "text-foreground/80" : "text-muted-foreground"}`}>
                            {getLastPreview(c)}
                          </p>
                          {hasUnread && (
                            <Badge className="h-[18px] min-w-[18px] px-1 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full shrink-0">
                              {c.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </ScrollArea>
          </div>

          {/* ─── Right panel: messages ─── */}
          <div className={`flex-1 flex flex-col min-w-0 ${!selectedChat ? "hidden lg:flex" : "flex"}`}>
            {selectedChat ? (
              <>
                {/* Chat header bar */}
                <div className="h-[60px] px-3 flex items-center gap-3 bg-muted/40 border-b border-border shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden shrink-0" onClick={() => setSelectedChat(null)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {selectedChat.chat_pic ? (
                      <img src={selectedChat.chat_pic} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">{initials(getChatName(selectedChat))}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{getChatName(selectedChat)}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {selectedChat.id?.replace("@s.whatsapp.net", "")?.replace("@g.us", "")}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => loadMessages(selectedChat)}>
                          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Atualizar mensagens
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedChat(null); setMessages([]); }}>
                          <X className="w-3.5 h-3.5 mr-2" /> Fechar conversa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages area — WhatsApp wallpaper */}
                <div
                  className="flex-1 overflow-y-auto px-4 sm:px-[10%] py-3 min-h-0"
                  style={{
                    backgroundColor: "hsl(var(--muted) / 0.15)",
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.03'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                >
                  {loadingMessages ? (
                    <div className="space-y-3 max-w-2xl mx-auto">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                          <Skeleton className={`h-10 rounded-lg ${i % 2 ? "w-44" : "w-56"}`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="max-w-2xl mx-auto space-y-0.5">
                      {groupedMessages.map((group, gi) => (
                        <div key={gi}>
                          {/* Date separator pill */}
                          <div className="flex justify-center my-3">
                            <span className="text-[11px] text-muted-foreground bg-card/90 backdrop-blur px-3 py-1 rounded-md shadow-sm font-medium tracking-wide">
                              {group.label}
                            </span>
                          </div>
                          {group.messages.map((msg) => (
                            <div key={msg.id} className={`flex mb-[3px] ${msg.from_me ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`relative max-w-[85%] sm:max-w-[65%] pl-3 pr-[50px] py-[6px] text-[13.5px] leading-[19px] shadow-sm ${
                                  msg.from_me
                                    ? "bg-primary/90 text-primary-foreground rounded-lg rounded-tr-none"
                                    : "bg-card text-foreground border border-border/60 rounded-lg rounded-tl-none"
                                }`}
                              >
                                {/* Bubble tail */}
                                <div
                                  className={`absolute top-0 w-2 h-3 ${
                                    msg.from_me
                                      ? "-right-1.5 border-l-[6px] border-l-primary/90 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent"
                                      : "-left-1.5 border-r-[6px] border-r-card border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent"
                                  }`}
                                  style={{ width: 0, height: 0 }}
                                />
                                <p className="break-words whitespace-pre-wrap">{getMessageText(msg)}</p>
                                {/* Timestamp + status — floated right */}
                                <span className={`absolute bottom-[4px] right-[6px] flex items-center gap-0.5 text-[10px] ${
                                  msg.from_me ? "text-primary-foreground/60" : "text-muted-foreground"
                                }`}>
                                  {formatTime(msg.timestamp)}
                                  <StatusIcon status={msg.status} fromMe={msg.from_me} />
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Quick replies strip */}
                {showQuickReplies && (
                  <div className="px-3 py-2 border-t border-border bg-muted/30 flex gap-2 overflow-x-auto scrollbar-hide">
                    {QUICK_REPLIES.map((qr, i) => (
                      <button key={i} onClick={() => sendMessage(qr)}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 whitespace-nowrap">
                        {qr}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input bar — WhatsApp Web style */}
                <div className="px-3 py-2 bg-muted/40 border-t border-border flex items-end gap-2 shrink-0">
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowQuickReplies(!showQuickReplies)}>
                    <Smile className="w-5 h-5" />
                  </Button>
                  <div className="flex-1">
                    <textarea
                      ref={inputRef}
                      placeholder="Digite uma mensagem"
                      value={reply}
                      onChange={(e) => {
                        setReply(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      rows={1}
                      className="w-full resize-none rounded-lg border border-border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                      style={{ minHeight: "38px", maxHeight: "120px" }}
                    />
                  </div>
                  {reply.trim() ? (
                    <Button size="icon" className="shrink-0 h-9 w-9 rounded-full" onClick={() => sendMessage()} disabled={sending}>
                      <Send className={`w-4 h-4 ${sending ? "animate-pulse" : ""}`} />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground">
                      <Mic className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </>
            ) : (
              /* Empty state — WhatsApp Web style */
              <div className="flex-1 flex items-center justify-center bg-muted/10">
                <div className="text-center max-w-md space-y-4">
                  <div className="w-[200px] h-[200px] mx-auto rounded-full bg-primary/5 flex items-center justify-center">
                    <MessageSquare className="w-20 h-20 text-primary/20" />
                  </div>
                  <h2 className="text-2xl font-light text-foreground">DG Contingência Pro</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Envie e receba mensagens pelo WhatsApp.<br />
                    Selecione uma conversa ao lado para começar.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60 pt-4">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                    Auto-refresh ativo a cada 15s
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  </div>
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
