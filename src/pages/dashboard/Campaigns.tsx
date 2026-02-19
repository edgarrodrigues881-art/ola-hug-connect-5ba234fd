import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Plus, Upload, Download, Eye, Send, Trash2, Bold, Italic, Strikethrough,
  Smile, List, RotateCcw, Image, Code, FileText, AlertTriangle, Link, MousePointerClick, X, CalendarIcon, Clock
} from "lucide-react";
import { useCreateCampaign, useStartCampaign } from "@/hooks/useCampaigns";
import { useTemplates } from "@/hooks/useTemplates";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: number;
  nome: string;
  numero: string;
  var1: string;
  var2: string;
  var3: string;
}

interface QuickReplyButton {
  id: number;
  text: string;
}

interface CTAButton {
  id: number;
  type: "url" | "phone";
  text: string;
  value: string;
}

const Campaigns = () => {
  const { toast } = useToast();
  const createCampaign = useCreateCampaign();
  const startCampaign = useStartCampaign();
  const { data: savedTemplates = [] } = useTemplates();
  const [contacts, setContacts] = useState<Contact[]>([
    { id: 1, nome: "", numero: "", var1: "", var2: "", var3: "" },
  ]);
  const [messageType, setMessageType] = useState("texto");
  const [excludeUnsubscribed, setExcludeUnsubscribed] = useState(true);
  const [schedule, setSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [quickReplyButtons, setQuickReplyButtons] = useState<QuickReplyButton[]>([]);
  const [ctaButtons, setCTAButtons] = useState<CTAButton[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("nova");

  const handleSendCampaign = () => {
    if (!campaignName.trim()) {
      toast({ title: "Erro", description: "Nome da campanha é obrigatório.", variant: "destructive" });
      return;
    }
    const validContacts = contacts.filter(c => c.numero.trim());
    if (validContacts.length === 0) {
      toast({ title: "Erro", description: "Adicione pelo menos um contato.", variant: "destructive" });
      return;
    }
    createCampaign.mutate({
      name: campaignName,
      message_type: messageType,
      message_content: message,
      buttons: [...quickReplyButtons.map(b => ({ type: "reply", text: b.text })), ...ctaButtons.map(b => ({ type: b.type, text: b.text, value: b.value }))],
      contacts: validContacts.map(c => ({ phone: c.numero, name: c.nome || undefined })),
    }, {
      onSuccess: (newCampaign) => {
        toast({ title: "Campanha criada!", description: `${validContacts.length} contatos adicionados. Iniciando envio...` });
        // Automatically start sending
        startCampaign.mutate({ campaignId: newCampaign.id }, {
          onSuccess: (result) => {
            toast({ title: "Envio concluído!", description: `Enviados: ${result?.sent || 0} | Falhas: ${result?.failed || 0}` });
          },
          onError: (err: any) => {
            toast({ title: "Erro no envio", description: err.message, variant: "destructive" });
          },
        });
        setCampaignName("");
        setMessage("");
        setContacts([{ id: 1, nome: "", numero: "", var1: "", var2: "", var3: "" }]);
        setQuickReplyButtons([]);
        setCTAButtons([]);
      },
      onError: (err: any) => {
        toast({ title: "Erro ao criar campanha", description: err.message, variant: "destructive" });
      },
    });
  };

  const addQuickReply = () => {
    if (quickReplyButtons.length < 3) {
      setQuickReplyButtons([...quickReplyButtons, { id: Date.now(), text: "" }]);
    }
  };

  const addCTAButton = (type: "url" | "phone") => {
    if (ctaButtons.length < 2) {
      setCTAButtons([...ctaButtons, { id: Date.now(), type, text: "", value: "" }]);
    }
  };

  const removeQuickReply = (id: number) => {
    setQuickReplyButtons(quickReplyButtons.filter(b => b.id !== id));
  };

  const removeCTAButton = (id: number) => {
    setCTAButtons(ctaButtons.filter(b => b.id !== id));
  };

  const updateQuickReply = (id: number, text: string) => {
    setQuickReplyButtons(quickReplyButtons.map(b => b.id === id ? { ...b, text } : b));
  };

  const updateCTAButton = (id: number, field: "text" | "value", val: string) => {
    setCTAButtons(ctaButtons.map(b => b.id === id ? { ...b, [field]: val } : b));
  };

  const showButtons = messageType === "botoes" || messageType === "botao-midia";

  const addContact = () => {
    setContacts([...contacts, {
      id: contacts.length + 1, nome: "", numero: "", var1: "", var2: "", var3: ""
    }]);
  };

  const updateContact = (id: number, field: keyof Contact, value: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeContact = (id: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Enviar mensagem</h1>
          <p className="text-sm text-muted-foreground">Configure e envie campanhas de disparo</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Baixar amostra
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90">
            <Upload className="w-3.5 h-3.5" /> Importação manual
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90">
            <FileText className="w-3.5 h-3.5" /> Criar lista de contatos
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90">
            <Upload className="w-3.5 h-3.5" /> Importar
          </Button>
        </div>
      </div>

      {/* Selects row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Modelo</Label>
          <Select value={selectedTemplate} onValueChange={(val) => {
            setSelectedTemplate(val);
            if (val !== "nova") {
              const tmpl = savedTemplates.find(t => t.id === val);
              if (tmpl) { setMessage(tmpl.content); setMessageType(tmpl.type === "text" ? "texto" : tmpl.type); }
            }
          }}>
            <SelectTrigger><SelectValue placeholder="Nova mensagem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nova">Nova mensagem</SelectItem>
              {savedTemplates.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-destructive">*Instâncias</Label>
          <Select>
            <SelectTrigger><SelectValue placeholder="Selecionar instância" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="chip1">Chip 01 – Vendas</SelectItem>
              <SelectItem value="chip2">Chip 02 – Suporte</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-destructive">*Tipo de mensagem</Label>
          <Select value={messageType} onValueChange={setMessageType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="texto">Texto</SelectItem>
              <SelectItem value="texto-midia">Texto com mídia</SelectItem>
              <SelectItem value="botoes">Botões</SelectItem>
              <SelectItem value="botao-midia">Botão com mídia</SelectItem>
              <SelectItem value="lista">Lista</SelectItem>
              <SelectItem value="lista-midia">Lista com mídia</SelectItem>
              <SelectItem value="enquete">Mensagem da enquete</SelectItem>
              <SelectItem value="pesquisa-midia">Pesquisa com a mídia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contacts table */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-destructive">*Números de telefone</Label>
              <Button size="sm" onClick={addContact} className="gap-1 text-xs h-7 bg-primary hover:bg-primary/90">
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={excludeUnsubscribed}
                  onCheckedChange={(v) => setExcludeUnsubscribed(!!v)}
                />
                <span className="text-xs text-muted-foreground">Excluir cancelamentos de inscrição</span>
              </div>
              <Button variant="outline" size="sm" className="text-xs h-7">Limpar número inválido</Button>
              <Button variant="outline" size="sm" className="text-xs h-7">Inserir variável</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-xs">SN</TableHead>
                  <TableHead className="text-xs">Nome</TableHead>
                  <TableHead className="text-xs">Número</TableHead>
                  <TableHead className="text-xs">Variável 1</TableHead>
                  <TableHead className="text-xs">Variável 2</TableHead>
                  <TableHead className="text-xs">Variável 3</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact, idx) => (
                  <TableRow key={contact.id}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={contact.nome}
                        onChange={(e) => updateContact(contact.id, "nome", e.target.value)}
                        placeholder="Entre aqui"
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={contact.numero}
                        onChange={(e) => updateContact(contact.id, "numero", e.target.value)}
                        placeholder="Entre aqui"
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={contact.var1}
                        onChange={(e) => updateContact(contact.id, "var1", e.target.value)}
                        placeholder="Entre aqui"
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={contact.var2}
                        onChange={(e) => updateContact(contact.id, "var2", e.target.value)}
                        placeholder="Entre aqui"
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={contact.var3}
                        onChange={(e) => updateContact(contact.id, "var3", e.target.value)}
                        placeholder="Entre aqui"
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeContact(contact.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Warning */}
          <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-500/10 border border-yellow-500/20 rounded-md px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Alguns números são inválidos. As mensagens podem não ser enviadas para esses contatos. Verifique e confirme antes de prosseguir.</span>
          </div>
        </CardContent>
      </Card>

      {/* Message editor */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <Label className="text-xs font-medium text-destructive">*Mensagem</Label>

          {/* Toolbar */}
          <div className="flex items-center gap-1 border border-border rounded-md p-1 bg-muted/30 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-primary text-primary hover:bg-primary/10">
                  <FileText className="w-3.5 h-3.5" /> Usar coluna
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1 bg-popover border border-border shadow-lg z-50" align="start">
                {[
                  "Nome", "Número",
                  "Variável 1", "Variável 2", "Variável 3", "Variável 4", "Variável 5",
                  "Variável 6", "Variável 7", "Variável 8", "Variável 9", "Variável 10",
                  "Texto aleatório", "Número aleatório",
                ].map((v) => (
                  <button
                    key={v}
                    className="w-full text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => {
                      const tag = v === "Nome" ? "{{nome}}" : v === "Número" ? "{{numero}}" : v === "Texto aleatório" ? "{{texto_aleatorio}}" : v === "Número aleatório" ? "{{numero_aleatorio}}" : `{{var${v.split(" ")[1]}}}`;
                      setMessage(prev => prev + tag);
                    }}
                  >
                    {v}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Smile className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Bold className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Italic className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Strikethrough className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Code className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <List className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <span className="text-[10px] font-mono">{"<>"}</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Image className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensagem"
            rows={6}
            className="text-sm"
          />
        </CardContent>
      </Card>

      {/* Buttons section - shown when messageType is botões */}
      {showButtons && (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-4">
            <Label className="text-sm font-medium text-foreground">Botões Interativos</Label>

            {/* Quick Reply Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">Botões de Resposta Rápida</span>
                  <span className="text-xs text-muted-foreground">(máx. 3)</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-7"
                  onClick={addQuickReply}
                  disabled={quickReplyButtons.length >= 3}
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </div>
              {quickReplyButtons.map((btn, idx) => (
                <div key={btn.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                  <Input
                    value={btn.text}
                    onChange={(e) => updateQuickReply(btn.id, e.target.value)}
                    placeholder="Texto do botão (ex: Sim, Quero saber mais)"
                    className="h-8 text-xs flex-1"
                    maxLength={20}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeQuickReply(btn.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {quickReplyButtons.length === 0 && (
                <p className="text-xs text-muted-foreground italic pl-6">Nenhum botão adicionado. Clique em "Adicionar" para criar.</p>
              )}
            </div>

            <div className="border-t border-border" />

            {/* CTA Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">Botões com Link / Ligação (CTA)</span>
                  <span className="text-xs text-muted-foreground">(máx. 2)</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs h-7"
                    onClick={() => addCTAButton("url")}
                    disabled={ctaButtons.length >= 2}
                  >
                    <Link className="w-3 h-3" /> URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs h-7"
                    onClick={() => addCTAButton("phone")}
                    disabled={ctaButtons.length >= 2}
                  >
                    <Send className="w-3 h-3" /> Ligação
                  </Button>
                </div>
              </div>
              {ctaButtons.map((btn, idx) => (
                <div key={btn.id} className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    {btn.type === "url" ? "URL" : "TEL"}
                  </span>
                  <Input
                    value={btn.text}
                    onChange={(e) => updateCTAButton(btn.id, "text", e.target.value)}
                    placeholder="Texto do botão"
                    className="h-8 text-xs w-36"
                    maxLength={20}
                  />
                  <Input
                    value={btn.value}
                    onChange={(e) => updateCTAButton(btn.id, "value", e.target.value)}
                    placeholder={btn.type === "url" ? "https://exemplo.com" : "+5511999999999"}
                    className="h-8 text-xs flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCTAButton(btn.id)}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              {ctaButtons.length === 0 && (
                <p className="text-xs text-muted-foreground italic pl-6">Nenhum botão CTA adicionado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6 flex-wrap">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-destructive">*Nome da campanha</Label>
                <Input
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Nome da campanha"
                  className="w-64 h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Agendar</Label>
                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={schedule} onCheckedChange={setSchedule} />
                  <span className="text-xs text-muted-foreground">{schedule ? "Sim" : "Não"}</span>
                </div>
              </div>
              {schedule && (
                <div className="flex items-center gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[180px] justify-start text-left font-normal h-9 text-sm",
                            !scheduleDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduleDate ? format(scheduleDate, "dd/MM/yyyy") : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduleDate}
                          onSelect={setScheduleDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Horário</Label>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="h-9 w-[120px] text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-1.5 text-sm">
                <Eye className="w-4 h-4" /> Pré-visualização
              </Button>
              <Button className="gap-1.5 text-sm bg-primary hover:bg-primary/90" onClick={handleSendCampaign} disabled={createCampaign.isPending || startCampaign.isPending}>
                <Send className="w-4 h-4" /> {startCampaign.isPending ? "Enviando..." : createCampaign.isPending ? "Salvando..." : schedule ? "Agendar envio" : "Enviar agora"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Campaigns;
