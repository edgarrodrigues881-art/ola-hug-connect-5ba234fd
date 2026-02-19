import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Plus, Upload, Download, Eye, Send, Trash2, Bold, Italic, Strikethrough,
  Smile, List, RotateCcw, Image, Code, FileText, AlertTriangle, Link, MousePointerClick,
  X, CalendarIcon, Clock, Users, MessageSquare, Smartphone, ChevronRight, Sparkles,
  Phone, Type, ImageIcon, ListChecks, BarChart3
} from "lucide-react";
import { useCreateCampaign, useStartCampaign } from "@/hooks/useCampaigns";
import { useTemplates } from "@/hooks/useTemplates";
import { useContacts } from "@/hooks/useContacts";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import * as XLSX from "xlsx";

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

const messageTypes = [
  { value: "texto", label: "Texto", icon: Type, desc: "Mensagem de texto simples" },
  { value: "texto-midia", label: "Texto + Mídia", icon: ImageIcon, desc: "Texto com imagem ou vídeo" },
  { value: "botoes", label: "Botões", icon: MousePointerClick, desc: "Mensagem com botões interativos" },
  { value: "botao-midia", label: "Botão + Mídia", icon: MousePointerClick, desc: "Botões com mídia" },
  { value: "lista", label: "Lista", icon: ListChecks, desc: "Menu de opções em lista" },
  { value: "enquete", label: "Enquete", icon: BarChart3, desc: "Pesquisa com opções" },
];

const Campaigns = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const createCampaign = useCreateCampaign();
  const startCampaign = useStartCampaign();
  const { data: savedTemplates = [] } = useTemplates();
  const { data: savedContacts = [] } = useContacts();
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch real devices
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("status", "Ready")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!session,
  });

  const [step, setStep] = useState(1);
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
  const [selectedDevice, setSelectedDevice] = useState("");
  const [quickReplyButtons, setQuickReplyButtons] = useState<QuickReplyButton[]>([]);
  const [ctaButtons, setCTAButtons] = useState<CTAButton[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("nova");
  const [importFromContacts, setImportFromContacts] = useState(false);
  const [selectedContactTags, setSelectedContactTags] = useState<string[]>([]);

  // Get unique tags from saved contacts
  const allTags = Array.from(new Set(savedContacts.flatMap(c => c.tags || [])));

  const handleSendCampaign = () => {
    if (!campaignName.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe o nome da campanha.", variant: "destructive" });
      return;
    }
    if (!selectedDevice) {
      toast({ title: "Instância obrigatória", description: "Selecione uma instância para enviar.", variant: "destructive" });
      return;
    }
    const validContacts = contacts.filter(c => c.numero.trim());
    if (validContacts.length === 0) {
      toast({ title: "Sem contatos", description: "Adicione pelo menos um contato.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Mensagem vazia", description: "Escreva a mensagem antes de enviar.", variant: "destructive" });
      return;
    }

    createCampaign.mutate({
      name: campaignName,
      message_type: messageType,
      message_content: message,
      buttons: [
        ...quickReplyButtons.map(b => ({ type: "reply", text: b.text })),
        ...ctaButtons.map(b => ({ type: b.type, text: b.text, value: b.value })),
      ],
      contacts: validContacts.map(c => ({ phone: c.numero, name: c.nome || undefined })),
    }, {
      onSuccess: (newCampaign) => {
        toast({ title: "Campanha criada!", description: `${validContacts.length} contatos. Iniciando envio...` });
        startCampaign.mutate({ campaignId: newCampaign.id, deviceId: selectedDevice }, {
          onSuccess: (result) => {
            toast({ title: "Envio concluído!", description: `Enviados: ${result?.sent || 0} | Falhas: ${result?.failed || 0}` });
          },
          onError: (err: any) => {
            toast({ title: "Erro no envio", description: err.message, variant: "destructive" });
          },
        });
        // Reset
        setCampaignName("");
        setMessage("");
        setContacts([{ id: 1, nome: "", numero: "", var1: "", var2: "", var3: "" }]);
        setQuickReplyButtons([]);
        setCTAButtons([]);
        setStep(1);
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

  const removeQuickReply = (id: number) => setQuickReplyButtons(quickReplyButtons.filter(b => b.id !== id));
  const removeCTAButton = (id: number) => setCTAButtons(ctaButtons.filter(b => b.id !== id));
  const updateQuickReply = (id: number, text: string) => setQuickReplyButtons(quickReplyButtons.map(b => b.id === id ? { ...b, text } : b));
  const updateCTAButton = (id: number, field: "text" | "value", val: string) => setCTAButtons(ctaButtons.map(b => b.id === id ? { ...b, [field]: val } : b));

  const showButtons = messageType === "botoes" || messageType === "botao-midia";

  const addContact = () => {
    setContacts([...contacts, { id: Date.now(), nome: "", numero: "", var1: "", var2: "", var3: "" }]);
  };

  const updateContact = (id: number, field: keyof Contact, value: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeContact = (id: number) => {
    if (contacts.length > 1) setContacts(contacts.filter(c => c.id !== id));
  };

  const handleImportFromDB = () => {
    let filtered = savedContacts;
    if (selectedContactTags.length > 0) {
      filtered = filtered.filter(c => c.tags?.some(t => selectedContactTags.includes(t)));
    }
    const imported: Contact[] = filtered.map((c, i) => ({
      id: Date.now() + i,
      nome: c.name,
      numero: c.phone,
      var1: "",
      var2: "",
      var3: "",
    }));
    if (imported.length === 0) {
      toast({ title: "Nenhum contato encontrado", variant: "destructive" });
      return;
    }
    setContacts(imported);
    setImportFromContacts(false);
    toast({ title: `${imported.length} contatos importados` });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const imported: Contact[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row && row[1]) {
            imported.push({
              id: Date.now() + i,
              nome: String(row[0] || ""),
              numero: String(row[1] || ""),
              var1: String(row[2] || ""),
              var2: String(row[3] || ""),
              var3: String(row[4] || ""),
            });
          }
        }
        if (imported.length > 0) {
          setContacts(imported);
          toast({ title: `${imported.length} contatos importados do arquivo` });
        } else {
          toast({ title: "Nenhum contato encontrado no arquivo", variant: "destructive" });
        }
      } catch {
        toast({ title: "Erro ao ler arquivo", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDownloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Nome", "Número", "Variável 1", "Variável 2", "Variável 3"],
      ["João Silva", "5511999999999", "valor1", "valor2", "valor3"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");
    XLSX.writeFile(wb, "modelo-contatos.xlsx");
  };

  const validContacts = contacts.filter(c => c.numero.trim());
  const invalidContacts = contacts.filter(c => c.numero.trim() && !/^\d{10,15}$/.test(c.numero.replace(/\D/g, "")));

  const steps = [
    { num: 1, label: "Configuração", icon: Sparkles },
    { num: 2, label: "Contatos", icon: Users },
    { num: 3, label: "Mensagem", icon: MessageSquare },
    { num: 4, label: "Revisar & Enviar", icon: Send },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nova Campanha</h1>
        <p className="text-sm text-muted-foreground">Configure e envie mensagens em massa</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div key={s.num} className="flex items-center gap-2">
              <button
                onClick={() => setStep(s.num)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  isActive && "bg-primary/15 text-primary border border-primary/30",
                  isDone && "bg-primary/5 text-primary/70 border border-primary/20",
                  !isActive && !isDone && "bg-muted/50 text-muted-foreground border border-border hover:bg-muted",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.num}</span>
              </button>
              {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Configuration */}
      {step === 1 && (
        <div className="space-y-5">
          <Card className="glass-card">
            <CardContent className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Nome da campanha <span className="text-destructive">*</span></Label>
                  <Input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ex: Promoção Black Friday"
                    className="h-10 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Instância <span className="text-destructive">*</span></Label>
                  <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Selecionar instância conectada" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.length === 0 ? (
                        <SelectItem value="none" disabled>Nenhuma instância conectada</SelectItem>
                      ) : (
                        devices.map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            <div className="flex items-center gap-2">
                              <Smartphone className="w-3.5 h-3.5 text-primary" />
                              <span>{d.name}</span>
                              {d.number && (
                                <span className="text-muted-foreground text-xs">({d.number})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Modelo de mensagem</Label>
                <Select value={selectedTemplate} onValueChange={(val) => {
                  setSelectedTemplate(val);
                  if (val !== "nova") {
                    const tmpl = savedTemplates.find(t => t.id === val);
                    if (tmpl) {
                      setMessage(tmpl.content);
                      setMessageType(tmpl.type === "text" ? "texto" : tmpl.type);
                    }
                  }
                }}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Nova mensagem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nova">✨ Nova mensagem</SelectItem>
                    {savedTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          {t.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Message type grid */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tipo de mensagem <span className="text-destructive">*</span></Label>
                <div className="flex flex-col gap-2">
                  {messageTypes.map(mt => {
                    const Icon = mt.icon;
                    const isSelected = messageType === mt.value;
                    return (
                      <button
                        key={mt.value}
                        onClick={() => setMessageType(mt.value)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border text-xs transition-all text-left",
                          isSelected
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-medium leading-tight">{mt.label}</span>
                          <span className="text-[10px] opacity-70">{mt.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Schedule */}
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2">
                  <Switch checked={schedule} onCheckedChange={setSchedule} />
                  <Label className="text-xs font-medium cursor-pointer">Agendar envio</Label>
                </div>
                {schedule && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("h-9 text-xs gap-1.5", !scheduleDate && "text-muted-foreground")}>
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {scheduleDate ? format(scheduleDate, "dd/MM/yyyy") : "Data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduleDate}
                          onSelect={setScheduleDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="h-9 w-[110px] text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} className="gap-1.5 bg-primary hover:bg-primary/90">
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Contacts */}
      {step === 2 && (
        <div className="space-y-5">
          <Card className="glass-card">
            <CardContent className="p-5 space-y-4">
              {/* Import options */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Contatos ({validContacts.length})</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownloadSample}>
                    <Download className="w-3.5 h-3.5" /> Modelo Excel
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5" /> Importar arquivo
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setImportFromContacts(true)}>
                    <Users className="w-3.5 h-3.5" /> Da lista de contatos
                  </Button>
                  <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90" onClick={addContact}>
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </Button>
                </div>
              </div>

              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />

              {/* Import from contacts modal */}
              {importFromContacts && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Importar da lista de contatos</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setImportFromContacts(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {allTags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">Filtrar por tags (opcional)</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {allTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => setSelectedContactTags(prev =>
                              prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                            )}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-xs transition-all border",
                              selectedContactTags.includes(tag)
                                ? "bg-primary/15 border-primary/30 text-primary"
                                : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {selectedContactTags.length > 0
                        ? `${savedContacts.filter(c => c.tags?.some(t => selectedContactTags.includes(t))).length} contatos`
                        : `${savedContacts.length} contatos no total`
                      }
                    </span>
                    <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90" onClick={handleImportFromDB}>
                      <Users className="w-3.5 h-3.5" /> Importar
                    </Button>
                  </div>
                </div>
              )}

              {/* Contacts list - compact cards */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {contacts.map((contact, idx) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 border border-border group hover:border-primary/20 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground w-6 text-center shrink-0">{idx + 1}</span>
                    <Input
                      value={contact.nome}
                      onChange={(e) => updateContact(contact.id, "nome", e.target.value)}
                      placeholder="Nome"
                      className="h-8 text-xs flex-1 min-w-[100px]"
                    />
                    <Input
                      value={contact.numero}
                      onChange={(e) => updateContact(contact.id, "numero", e.target.value)}
                      placeholder="Número (ex: 5511999999999)"
                      className="h-8 text-xs flex-1 min-w-[160px] font-mono"
                    />
                    <Input
                      value={contact.var1}
                      onChange={(e) => updateContact(contact.id, "var1", e.target.value)}
                      placeholder="Var 1"
                      className="h-8 text-xs w-20 hidden lg:block"
                    />
                    <Input
                      value={contact.var2}
                      onChange={(e) => updateContact(contact.id, "var2", e.target.value)}
                      placeholder="Var 2"
                      className="h-8 text-xs w-20 hidden lg:block"
                    />
                    <Input
                      value={contact.var3}
                      onChange={(e) => updateContact(contact.id, "var3", e.target.value)}
                      placeholder="Var 3"
                      className="h-8 text-xs w-20 hidden lg:block"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeContact(contact.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Invalid warning */}
              {invalidContacts.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{invalidContacts.length} número(s) pode(m) ser inválido(s). Verifique antes de prosseguir.</span>
                </div>
              )}

              {/* Exclude unsubscribed */}
              <div className="flex items-center gap-2">
                <Checkbox checked={excludeUnsubscribed} onCheckedChange={(v) => setExcludeUnsubscribed(!!v)} />
                <span className="text-xs text-muted-foreground">Excluir cancelamentos de inscrição</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
            <Button onClick={() => setStep(3)} className="gap-1.5 bg-primary hover:bg-primary/90">
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Message */}
      {step === 3 && (
        <div className="space-y-5">
          <Card className="glass-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Mensagem</span>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-1 border border-border rounded-lg p-1.5 bg-muted/20 flex-wrap">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10">
                      <FileText className="w-3.5 h-3.5" /> Variável
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-1" align="start">
                    {["Nome", "Número", "Variável 1", "Variável 2", "Variável 3", "Texto aleatório", "Número aleatório"].map(v => (
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
                <div className="w-px h-5 bg-border mx-1" />
                {[
                  { icon: Bold, label: "Negrito", wrap: ["*", "*"] },
                  { icon: Italic, label: "Itálico", wrap: ["_", "_"] },
                  { icon: Strikethrough, label: "Tachado", wrap: ["~", "~"] },
                  { icon: Code, label: "Código", wrap: ["```", "```"] },
                ].map(({ icon: Icon, label, wrap }) => (
                  <Button
                    key={label}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title={label}
                    onClick={() => setMessage(prev => prev + wrap[0] + wrap[1])}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </Button>
                ))}
                <div className="w-px h-5 bg-border mx-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Emoji">
                  <Smile className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Imagem">
                  <Image className="w-3.5 h-3.5" />
                </Button>
              </div>

              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem aqui...&#10;&#10;Use {{nome}} para personalizar com o nome do contato."
                rows={8}
                className="text-sm leading-relaxed"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{message.length} caracteres</span>
              </div>
            </CardContent>
          </Card>

          {/* Buttons section */}
          {showButtons && (
            <Card className="glass-card">
              <CardContent className="p-5 space-y-4">
                <span className="text-sm font-medium text-foreground">Botões Interativos</span>

                {/* Quick Reply */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MousePointerClick className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">Resposta Rápida</span>
                      <Badge variant="outline" className="text-[10px]">{quickReplyButtons.length}/3</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={addQuickReply} disabled={quickReplyButtons.length >= 3}>
                      <Plus className="w-3 h-3" /> Adicionar
                    </Button>
                  </div>
                  {quickReplyButtons.map((btn, idx) => (
                    <div key={btn.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                      <Input value={btn.text} onChange={(e) => updateQuickReply(btn.id, e.target.value)} placeholder="Texto do botão" className="h-8 text-xs flex-1" maxLength={20} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeQuickReply(btn.id)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border" />

                {/* CTA */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium">Link / Ligação</span>
                      <Badge variant="outline" className="text-[10px]">{ctaButtons.length}/2</Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => addCTAButton("url")} disabled={ctaButtons.length >= 2}>
                        <Link className="w-3 h-3" /> URL
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => addCTAButton("phone")} disabled={ctaButtons.length >= 2}>
                        <Phone className="w-3 h-3" /> Ligação
                      </Button>
                    </div>
                  </div>
                  {ctaButtons.map((btn, idx) => (
                    <div key={btn.id} className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] shrink-0">{btn.type === "url" ? "URL" : "TEL"}</Badge>
                      <Input value={btn.text} onChange={(e) => updateCTAButton(btn.id, "text", e.target.value)} placeholder="Texto" className="h-8 text-xs w-32" maxLength={20} />
                      <Input value={btn.value} onChange={(e) => updateCTAButton(btn.id, "value", e.target.value)} placeholder={btn.type === "url" ? "https://..." : "+55..."} className="h-8 text-xs flex-1" />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeCTAButton(btn.id)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
            <Button onClick={() => setStep(4)} className="gap-1.5 bg-primary hover:bg-primary/90">
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Send */}
      {step === 4 && (
        <div className="space-y-5">
          <Card className="glass-card">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Resumo da Campanha</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Campanha</span>
                  <p className="text-sm font-medium text-foreground truncate">{campaignName || "Sem nome"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Instância</span>
                  <p className="text-sm font-medium text-foreground truncate">
                    {devices.find(d => d.id === selectedDevice)?.name || "Não selecionada"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Contatos</span>
                  <p className="text-sm font-medium text-foreground">{validContacts.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Tipo</span>
                  <p className="text-sm font-medium text-foreground">{messageTypes.find(m => m.value === messageType)?.label}</p>
                </div>
              </div>

              {schedule && scheduleDate && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <CalendarIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-blue-400">
                    Agendado para {format(scheduleDate, "dd/MM/yyyy")} às {scheduleTime}
                  </span>
                </div>
              )}

              {/* Message preview */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Prévia da mensagem</span>
                <div className="p-4 rounded-xl bg-muted/40 border border-border max-h-48 overflow-y-auto">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {message || <span className="text-muted-foreground italic">Nenhuma mensagem</span>}
                  </p>
                </div>
              </div>

              {/* Warnings */}
              {(!campaignName || !selectedDevice || validContacts.length === 0 || !message) && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {!campaignName && "Nome da campanha ausente. "}
                    {!selectedDevice && "Instância não selecionada. "}
                    {validContacts.length === 0 && "Sem contatos. "}
                    {!message && "Mensagem vazia."}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>Voltar</Button>
            <Button
              className="gap-2 bg-primary hover:bg-primary/90 px-6"
              onClick={handleSendCampaign}
              disabled={createCampaign.isPending || startCampaign.isPending || !campaignName || !selectedDevice || validContacts.length === 0 || !message}
            >
              <Send className="w-4 h-4" />
              {startCampaign.isPending ? "Enviando..." : createCampaign.isPending ? "Salvando..." : schedule ? "Agendar envio" : "Enviar agora"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
