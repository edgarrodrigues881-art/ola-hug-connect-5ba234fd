import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Search, Send, ArrowLeft, User } from "lucide-react";

interface Conversation {
  id: string;
  name: string;
  phone: string;
  lastMessage: string;
  time: string;
  unread: number;
  messages: { from: "them" | "me"; text: string; time: string }[];
}

const conversations: Conversation[] = [
  { id: "1", name: "João Silva", phone: "+5511999991234", lastMessage: "Qual o valor do plano?", time: "14:32", unread: 2, messages: [
    { from: "me", text: "Olá João! Tudo bem?", time: "14:20" },
    { from: "them", text: "Tudo ótimo! Recebi a mensagem.", time: "14:25" },
    { from: "them", text: "Qual o valor do plano?", time: "14:32" },
  ]},
  { id: "2", name: "Maria Santos", phone: "+5511988882345", lastMessage: "Obrigada pelo retorno!", time: "13:15", unread: 0, messages: [
    { from: "me", text: "Oi Maria, segue o link do produto.", time: "12:50" },
    { from: "them", text: "Obrigada pelo retorno!", time: "13:15" },
  ]},
  { id: "3", name: "Carlos Oliveira", phone: "+5521977773456", lastMessage: "Vou conferir agora", time: "12:40", unread: 1, messages: [
    { from: "me", text: "Carlos, temos uma promoção especial!", time: "12:30" },
    { from: "them", text: "Vou conferir agora", time: "12:40" },
  ]},
  { id: "4", name: "Ana Costa", phone: "+5531966664567", lastMessage: "Perfeito, pode enviar", time: "11:22", unread: 0, messages: [
    { from: "them", text: "Boa tarde!", time: "11:10" },
    { from: "me", text: "Olá Ana! Posso enviar nosso catálogo?", time: "11:15" },
    { from: "them", text: "Perfeito, pode enviar", time: "11:22" },
  ]},
  { id: "5", name: "Pedro Lima", phone: "+5541955555678", lastMessage: "SAIR", time: "10:05", unread: 0, messages: [
    { from: "me", text: "Pedro, confira nossa oferta!", time: "09:50" },
    { from: "them", text: "SAIR", time: "10:05" },
  ]},
];

const Inbox = () => {
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");

  const filtered = conversations.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  return (
    <div className="space-y-4 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mensagens Recebidas</h1>
        <p className="text-sm text-muted-foreground">Visualize e responda conversas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {/* Conversation list */}
        <Card className="glass-card overflow-hidden lg:col-span-1">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar conversa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
          </div>
          <ScrollArea className="h-[calc(100%-56px)]">
            {filtered.map((c) => (
              <div
                key={c.id}
                className={`p-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors ${selected?.id === c.id ? "bg-muted/50" : ""}`}
                onClick={() => setSelected(c)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.lastMessage}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground">{c.time}</span>
                    {c.unread > 0 && (
                      <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-primary">{c.unread}</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </Card>

        {/* Chat area */}
        <Card className="glass-card overflow-hidden lg:col-span-2 flex flex-col">
          {selected ? (
            <>
              <div className="p-3 border-b border-border flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setSelected(null)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-4 h-4 text-primary" /></div>
                <div>
                  <p className="text-sm font-medium text-foreground">{selected.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{selected.phone}</p>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {selected.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${msg.from === "me" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                        <p>{msg.text}</p>
                        <p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{msg.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-border flex gap-2">
                <Textarea placeholder="Digite sua resposta..." value={reply} onChange={(e) => setReply(e.target.value)} rows={1} className="min-h-[40px] resize-none" />
                <Button size="icon" className="shrink-0 h-10 w-10"><Send className="w-4 h-4" /></Button>
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
    </div>
  );
};

export default Inbox;
