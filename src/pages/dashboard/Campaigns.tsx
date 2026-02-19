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
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Plus, Upload, Download, Eye, Send, Trash2, Bold, Italic, Strikethrough,
  Smile, Image, Code, FileText, AlertTriangle, Link, MousePointerClick,
  X, Users, MessageSquare, Smartphone, ChevronRight, ChevronDown,
  Phone, Type, ImageIcon, Flame, Shield, ShieldAlert, Activity,
  Zap, Clock, Hash, Wifi, WifiOff, RefreshCw, Settings2, Calendar,
  CheckCircle2, XCircle, Copy
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
  var4: string;
  var5: string;
  var6: string;
  var7: string;
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
  { value: "texto", label: "Texto", description: "Mensagem de texto simples", icon: Type },
  { value: "texto-imagem", label: "Texto + Imagem", description: "Texto com imagem anexa", icon: ImageIcon },
  { value: "texto-botao", label: "Texto + Botão", description: "Texto com botões interativos", icon: MousePointerClick },
  { value: "imagem-botao", label: "Imagem + Botão", description: "Imagem com botões interativos", icon: Image },
];

const Campaigns = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const createCampaign = useCreateCampaign();
  const startCampaign = useStartCampaign();
  const { data: savedTemplates = [] } = useTemplates();
  const { data: savedContacts = [] } = useContacts();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!session,
  });

  // State
  const [step, setStep] = useState(1);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messageType, setMessageType] = useState("texto");
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [quickReplyButtons, setQuickReplyButtons] = useState<QuickReplyButton[]>([]);
  const [ctaButtons, setCTAButtons] = useState<CTAButton[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("nova");
  const [importFromContacts, setImportFromContacts] = useState(false);
  const [selectedContactTags, setSelectedContactTags] = useState<string[]>([]);
  const [showInstancePicker, setShowInstancePicker] = useState(false);
  const [showContactTools, setShowContactTools] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [showContactTable, setShowContactTable] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");

  // Send control
  const [messageLimit, setMessageLimit] = useState(100);
  const [minDelay, setMinDelay] = useState(8);
  const [maxDelay, setMaxDelay] = useState(25);
  const [pauseEveryMin, setPauseEveryMin] = useState(10);
  const [pauseEveryMax, setPauseEveryMax] = useState(20);
  const [pauseDurationMin, setPauseDurationMin] = useState(30);
  const [pauseDurationMax, setPauseDurationMax] = useState(120);

  const allTags = Array.from(new Set(savedContacts.flatMap(c => c.tags || [])));
  const selectedDevicesData = devices.filter(d => selectedDevices.includes(d.id));
  const selectedDeviceData = selectedDevicesData[0];
  const validContacts = contacts.filter(c => c.numero.trim());
  const invalidContacts = contacts.filter(c => c.numero.trim() && !/^\d{10,15}$/.test(c.numero.replace(/\D/g, "")));
  const duplicateCount = contacts.length - new Set(contacts.map(c => c.numero.trim()).filter(Boolean)).size;
  const showButtons = messageType === "texto-botao" || messageType === "imagem-botao";

  const getRiskLevel = () => {
    if (minDelay < 5) return { label: "Alto", color: "text-red-400", bg: "bg-red-500/10" };
    if (minDelay < 10) return { label: "Médio", color: "text-amber-400", bg: "bg-amber-500/10" };
    return { label: "Baixo", color: "text-emerald-400", bg: "bg-emerald-500/10" };
  };
  const risk = getRiskLevel();

  // Handlers
  const handleSendCampaign = () => {
    if (!campaignName.trim()) { toast({ title: "Nome obrigatório", description: "Informe o nome da campanha.", variant: "destructive" }); return; }
    if (selectedDevices.length === 0) { toast({ title: "Instância obrigatória", description: "Selecione pelo menos uma instância.", variant: "destructive" }); return; }
    if (validContacts.length === 0) { toast({ title: "Sem contatos", description: "Adicione pelo menos um contato.", variant: "destructive" }); return; }
    if (!message.trim()) { toast({ title: "Mensagem vazia", description: "Escreva a mensagem.", variant: "destructive" }); return; }
    createCampaign.mutate({
      name: campaignName, message_type: messageType, message_content: message,
      buttons: [...quickReplyButtons.map(b => ({ type: "reply", text: b.text })), ...ctaButtons.map(b => ({ type: b.type, text: b.text, value: b.value }))],
      contacts: validContacts.map(c => ({ phone: c.numero, name: c.nome || undefined })),
    }, {
      onSuccess: (newCampaign) => {
        toast({ title: "Campanha criada!", description: `${validContacts.length} contatos. Iniciando envio...` });
        startCampaign.mutate({ campaignId: newCampaign.id, deviceId: selectedDevices[0] }, {
          onSuccess: (result) => { toast({ title: "Envio concluído!", description: `Enviados: ${result?.sent || 0} | Falhas: ${result?.failed || 0}` }); },
          onError: (err: any) => { toast({ title: "Erro no envio", description: err.message, variant: "destructive" }); },
        });
        setCampaignName(""); setMessage(""); setContacts([]); setQuickReplyButtons([]); setCTAButtons([]); setStep(1);
      },
      onError: (err: any) => { toast({ title: "Erro ao criar campanha", description: err.message, variant: "destructive" }); },
    });
  };

  const addQuickReply = () => { if (quickReplyButtons.length < 3) setQuickReplyButtons([...quickReplyButtons, { id: Date.now(), text: "" }]); };
  const addCTAButton = (type: "url" | "phone") => { if (ctaButtons.length < 2) setCTAButtons([...ctaButtons, { id: Date.now(), type, text: "", value: "" }]); };
  const removeQuickReply = (id: number) => setQuickReplyButtons(quickReplyButtons.filter(b => b.id !== id));
  const removeCTAButton = (id: number) => setCTAButtons(ctaButtons.filter(b => b.id !== id));
  const updateQuickReply = (id: number, text: string) => setQuickReplyButtons(quickReplyButtons.map(b => b.id === id ? { ...b, text } : b));
  const updateCTAButton = (id: number, field: "text" | "value", val: string) => setCTAButtons(ctaButtons.map(b => b.id === id ? { ...b, [field]: val } : b));

  const addContact = () => { setContacts([...contacts, { id: Date.now(), nome: "", numero: "", var1: "", var2: "", var3: "", var4: "", var5: "", var6: "", var7: "" }]); setShowContactTable(true); };
  const updateContact = (id: number, field: keyof Contact, value: string) => setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeContact = (id: number) => setContacts(contacts.filter(c => c.id !== id));

  const removeDuplicates = () => {
    const seen = new Set<string>();
    const unique = contacts.filter(c => {
      const num = c.numero.trim();
      if (!num || seen.has(num)) return false;
      seen.add(num);
      return true;
    });
    setContacts(unique);
    toast({ title: "Duplicados removidos" });
  };

  const removeInvalid = () => {
    setContacts(contacts.filter(c => !c.numero.trim() || /^\d{10,15}$/.test(c.numero.replace(/\D/g, ""))));
    toast({ title: "Inválidos removidos" });
  };

  const handleImportFromDB = () => {
    let filtered = savedContacts;
    if (selectedContactTags.length > 0) filtered = filtered.filter(c => c.tags?.some(t => selectedContactTags.includes(t)));
    const imported: Contact[] = filtered.map((c, i) => ({ id: Date.now() + i, nome: c.name, numero: c.phone, var1: "", var2: "", var3: "", var4: "", var5: "", var6: "", var7: "" }));
    if (imported.length === 0) { toast({ title: "Nenhum contato encontrado", variant: "destructive" }); return; }
    setContacts(imported);
    setImportFromContacts(false);
    setShowContactTable(true);
    toast({ title: `${imported.length} contatos importados` });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        
        if (rows.length < 2) {
          toast({ title: "Arquivo vazio", description: "O arquivo não contém dados.", variant: "destructive" });
          return;
        }

        const imported: Contact[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const nome = String(row[0] ?? "").trim();
          const numero = String(row[1] ?? "").trim();
          if (!numero) continue;
          imported.push({
            id: Date.now() + i,
            nome,
            numero,
            var1: String(row[2] ?? ""),
            var2: String(row[3] ?? ""),
            var3: String(row[4] ?? ""),
            var4: String(row[5] ?? ""),
            var5: String(row[6] ?? ""),
            var6: String(row[7] ?? ""),
            var7: String(row[8] ?? ""),
          });
        }
        if (imported.length > 0) {
          setContacts(imported);
          setShowContactTable(true);
          toast({ title: `${imported.length} contatos importados` });
        } else {
          toast({ title: "Nenhum contato encontrado", description: "Verifique se o número está na segunda coluna.", variant: "destructive" });
        }
      } catch (err) {
        console.error("Import error:", err);
        toast({ title: "Erro ao ler arquivo", description: "Formato não suportado.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDownloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([["Nome", "Número", "Variável 1", "Variável 2", "Variável 3", "Variável 4", "Variável 5", "Variável 6", "Variável 7"], ["João Silva", "5511999999999", "valor1", "valor2", "valor3", "valor4", "valor5", "valor6", "valor7"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");
    XLSX.writeFile(wb, "modelo-contatos.xlsx");
  };

  const getDeviceStatus = (status: string) => {
    if (status === "Ready") return { label: "Online", icon: Wifi, color: "text-emerald-400" };
    if (status === "QR") return { label: "QR Pendente", icon: RefreshCw, color: "text-amber-400" };
    return { label: "Offline", icon: WifiOff, color: "text-red-400" };
  };

  const steps = [
    { num: 1, label: "Configuração", icon: Settings2 },
    { num: 2, label: "Contatos", icon: Users },
    { num: 3, label: "Mensagem", icon: MessageSquare },
    { num: 4, label: "Enviar", icon: Send },
  ];

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Enviar Mensagem</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Configure e envie com controle total</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          const Icon = s.icon;
          return (
            <div key={s.num} className="flex items-center flex-1">
              <button
                onClick={() => setStep(s.num)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-all",
                  isActive && "bg-primary/8 text-primary",
                  isDone && "text-foreground/80",
                  !isActive && !isDone && "text-muted-foreground",
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 transition-all",
                  isActive && "bg-primary text-primary-foreground",
                  isDone && "bg-emerald-500/20 text-emerald-400",
                  !isActive && !isDone && "bg-muted text-muted-foreground",
                )}>
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span className="hidden sm:inline font-medium">{s.label}</span>
              </button>
              {i < steps.length - 1 && <div className="w-6 h-px bg-border/40 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* ===== STEP 1: Configuration ===== */}
      {step === 1 && (
        <div className="space-y-6">
          {/* 3-column: Template, Instance, Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Template */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Modelo</Label>
              <Select value={selectedTemplate} onValueChange={(val) => {
                setSelectedTemplate(val);
                if (val !== "nova") {
                  const tmpl = savedTemplates.find(t => t.id === val);
                  if (tmpl) {
                    setMessage(tmpl.content);
                    const typeMap: Record<string, string> = { text: "texto", "text-image": "texto-imagem", "text-button": "texto-botao", "image-button": "imagem-botao" };
                    setMessageType(typeMap[tmpl.type] || tmpl.type);
                    if (tmpl.buttons && Array.isArray(tmpl.buttons)) {
                      setQuickReplyButtons(tmpl.buttons.filter((b: any) => b.type === "reply").map((b: any, i: number) => ({ id: Date.now() + i, text: b.text || "" })));
                      setCTAButtons(tmpl.buttons.filter((b: any) => b.type === "url" || b.type === "phone").map((b: any, i: number) => ({ id: Date.now() + 100 + i, type: b.type, text: b.text || "", value: b.value || "" })));
                    } else { setQuickReplyButtons([]); setCTAButtons([]); }
                  }
                } else { setMessage(""); setMessageType("texto"); setQuickReplyButtons([]); setCTAButtons([]); }
              }}>
                <SelectTrigger className="h-9 text-xs bg-card/60 border-border/40">
                  <SelectValue placeholder="Nova mensagem" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="nova">Nova mensagem</SelectItem>
                  {savedTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Instance (Multi-select) */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Instância{selectedDevices.length > 1 ? `s (${selectedDevices.length})` : ""}</Label>
              {devices.length === 0 ? (
                <div className="h-9 rounded-md border border-dashed border-border/40 bg-card/30 flex items-center justify-center gap-1.5 px-2">
                  <WifiOff className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Nenhuma conectada</span>
                </div>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-9 w-full justify-between text-xs bg-card/60 border-border/40 font-normal">
                      <span className="truncate">
                        {selectedDevices.length === 0 ? "Selecionar" : selectedDevices.length === devices.length ? "Todas selecionadas" : selectedDevicesData.map(d => d.name).join(", ")}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 space-y-1" align="start">
                    {/* Select All */}
                    <button
                      onClick={() => {
                        if (selectedDevices.length === devices.length) setSelectedDevices([]);
                        else setSelectedDevices(devices.map(d => d.id));
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-accent",
                        selectedDevices.length === devices.length && "bg-accent"
                      )}
                    >
                      <Checkbox checked={selectedDevices.length === devices.length} className="h-3.5 w-3.5" />
                      <span className="font-medium">Selecionar todas</span>
                      <Badge variant="secondary" className="text-[9px] h-4 ml-auto">{devices.length}</Badge>
                    </button>
                    <div className="h-px bg-border/30 my-1" />
                    {devices.map(d => {
                      const s = getDeviceStatus(d.status);
                      const isSelected = selectedDevices.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          onClick={() => {
                            setSelectedDevices(prev =>
                              isSelected ? prev.filter(id => id !== d.id) : [...prev, d.id]
                            );
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-accent",
                            isSelected && "bg-accent/60"
                          )}
                        >
                          <Checkbox checked={isSelected} className="h-3.5 w-3.5" />
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", d.status === "Ready" ? "bg-emerald-400" : d.status === "QR" ? "bg-amber-400" : "bg-red-400")} />
                          <span className="truncate">{d.name}</span>
                          <span className={cn("text-[10px] ml-auto shrink-0", s.color)}>{s.label}</span>
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Message Type */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Tipo</Label>
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger className="h-9 text-xs bg-card/60 border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {messageTypes.map(mt => {
                    const Icon = mt.icon;
                    return (
                      <SelectItem key={mt.value} value={mt.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <div>
                            <span className="text-xs">{mt.label}</span>
                            <span className="text-[10px] text-muted-foreground ml-1.5">{mt.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Instance card (when selected) */}
          {selectedDeviceData && (
            <div className="rounded-lg border border-border/30 bg-card/40 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedDeviceData.profile_picture ? (
                    <img src={selectedDeviceData.profile_picture} alt={selectedDeviceData.name} className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center">
                      <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-foreground">{selectedDeviceData.number || selectedDeviceData.name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedDeviceData.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const s = getDeviceStatus(selectedDeviceData.status);
                    const StatusIcon = s.icon;
                    return (
                      <div className="flex items-center gap-1 text-[10px]">
                        <StatusIcon className={cn("w-3 h-3", s.color)} />
                        <span className={s.color}>{s.label}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* No instance warning */}
          {devices.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/40 bg-card/20 p-8 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
                <WifiOff className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Nenhuma instância conectada</p>
              <Button variant="outline" size="sm" className="text-xs h-8 border-border/40">
                Conectar agora
              </Button>
            </div>
          )}

          {/* Send Control */}
          <div className="space-y-3">
            <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Controle de Envio</Label>
            <div className="rounded-lg border border-border/30 bg-card/40 p-4 space-y-5">

              {/* Delay between messages */}
              <div className="space-y-2">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Clock className="w-3 h-3" /> Intervalo entre mensagens</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">De (segundos)</label>
                    <Input type="number" value={minDelay} onChange={(e) => { const v = Number(e.target.value); setMinDelay(v); if (v > maxDelay) setMaxDelay(v); }} className="h-8 text-xs bg-background/50 border-border/30" min={1} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Até (segundos)</label>
                    <Input type="number" value={maxDelay} onChange={(e) => { const v = Math.max(Number(e.target.value), minDelay); setMaxDelay(v); }} className="h-8 text-xs bg-background/50 border-border/30" min={minDelay} />
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground/60">Intervalo aleatório entre {minDelay}s e {maxDelay}s a cada envio</p>
              </div>

              <div className="h-px bg-border/20" />

              {/* Pause every X messages */}
              <div className="space-y-2">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Zap className="w-3 h-3" /> Pausa a cada X mensagens</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">A cada (mín.)</label>
                    <Input type="number" value={pauseEveryMin} onChange={(e) => { const v = Number(e.target.value); setPauseEveryMin(v); if (v > pauseEveryMax) setPauseEveryMax(v); }} className="h-8 text-xs bg-background/50 border-border/30" min={1} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">A cada (máx.)</label>
                    <Input type="number" value={pauseEveryMax} onChange={(e) => { const v = Math.max(Number(e.target.value), pauseEveryMin); setPauseEveryMax(v); }} className="h-8 text-xs bg-background/50 border-border/30" min={pauseEveryMin} />
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground/60">Pausa aleatória entre cada {pauseEveryMin} a {pauseEveryMax} mensagens enviadas</p>
              </div>

              <div className="h-px bg-border/20" />

              {/* Pause duration */}
              <div className="space-y-2">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Activity className="w-3 h-3" /> Duração da pausa</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">De (segundos)</label>
                    <Input type="number" value={pauseDurationMin} onChange={(e) => { const v = Number(e.target.value); setPauseDurationMin(v); if (v > pauseDurationMax) setPauseDurationMax(v); }} className="h-8 text-xs bg-background/50 border-border/30" min={1} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Até (segundos)</label>
                    <Input type="number" value={pauseDurationMax} onChange={(e) => { const v = Math.max(Number(e.target.value), pauseDurationMin); setPauseDurationMax(v); }} className="h-8 text-xs bg-background/50 border-border/30" min={pauseDurationMin} />
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground/60">Pausa de {pauseDurationMin}s a {pauseDurationMax}s quando atingir o limite</p>
              </div>

            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} className="gap-1.5 h-9 px-5 text-xs font-medium">
              Continuar <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ===== STEP 2: Contacts ===== */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Summary card */}
          <div className="rounded-lg border border-border/30 bg-card/40 p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-semibold text-foreground">{validContacts.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Carregados</p>
              </div>
              <div>
                <p className={cn("text-xl font-semibold", invalidContacts.length > 0 ? "text-amber-400" : "text-foreground")}>{invalidContacts.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Inválidos</p>
              </div>
              <div>
                <p className={cn("text-xl font-semibold", duplicateCount > 0 ? "text-amber-400" : "text-foreground")}>{duplicateCount}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Duplicados</p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
            <Button variant="outline" size="sm" className="text-xs h-8 border-border/40 gap-1.5" onClick={() => fileRef.current?.click()}>
              <Upload className="w-3 h-3" /> Importar
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8 border-border/40 gap-1.5" onClick={() => setImportFromContacts(true)}>
              <Users className="w-3 h-3" /> Criar lista
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8 border-border/40 gap-1.5" onClick={addContact}>
              <Plus className="w-3 h-3" /> Adicionar
            </Button>

            {/* Tools menu */}
            {contacts.length > 0 && (
              <Popover open={showContactTools} onOpenChange={setShowContactTools}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground gap-1">
                    <Settings2 className="w-3 h-3" /> Ferramentas
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1 bg-popover border-border z-50" align="start">
                  <button className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent transition-colors flex items-center gap-2" onClick={() => { removeDuplicates(); setShowContactTools(false); }}>
                    <Copy className="w-3 h-3" /> Remover duplicados
                  </button>
                  <button className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent transition-colors flex items-center gap-2" onClick={() => { removeInvalid(); setShowContactTools(false); }}>
                    <XCircle className="w-3 h-3" /> Limpar inválidos
                  </button>
                  <button className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent transition-colors flex items-center gap-2" onClick={handleDownloadSample}>
                    <Download className="w-3 h-3" /> Baixar modelo
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Manual phone input */}
          <div className="rounded-lg border border-border/30 bg-card/40 p-3">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mb-2"><Phone className="w-3 h-3" /> Adicionar número manualmente</span>
            <div className="flex items-center gap-2">
              <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Nome (opcional)" className="h-8 text-xs bg-background/50 border-border/30 flex-1" />
              <Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="5511999999999" className="h-8 text-xs bg-background/50 border-border/30 flex-1 font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualPhone.trim()) {
                    setContacts(prev => [...prev, { id: Date.now(), nome: manualName.trim(), numero: manualPhone.trim(), var1: "", var2: "", var3: "", var4: "", var5: "", var6: "", var7: "" }]);
                    setManualPhone(""); setManualName(""); setShowContactTable(true);
                  }
                }}
              />
              <Button size="sm" className="h-8 text-xs gap-1 shrink-0" disabled={!manualPhone.trim()}
                onClick={() => {
                  setContacts(prev => [...prev, { id: Date.now(), nome: manualName.trim(), numero: manualPhone.trim(), var1: "", var2: "", var3: "", var4: "", var5: "", var6: "", var7: "" }]);
                  setManualPhone(""); setManualName(""); setShowContactTable(true);
                }}
              >
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
          </div>



          {/* Import from contacts modal */}
          {importFromContacts && (
            <div className="rounded-lg border border-border/30 bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">Importar da lista de contatos</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setImportFromContacts(false)}><X className="w-3 h-3" /></Button>
              </div>
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map(tag => (
                    <button key={tag} onClick={() => setSelectedContactTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                      className={cn("px-2.5 py-1 rounded-full text-[10px] border transition-all",
                        selectedContactTags.includes(tag) ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/20 border-border/40 text-muted-foreground"
                      )}>{tag}</button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {selectedContactTags.length > 0 ? `${savedContacts.filter(c => c.tags?.some(t => selectedContactTags.includes(t))).length} contatos` : `${savedContacts.length} contatos`}
                </span>
                <Button size="sm" className="text-xs h-7" onClick={handleImportFromDB}>Importar</Button>
              </div>
            </div>
          )}

          {/* Contact table - compact, shown after data */}
          {contacts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button onClick={() => setShowContactTable(!showContactTable)} className="text-[11px] text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
                  <ChevronDown className={cn("w-3 h-3 transition-transform", !showContactTable && "-rotate-90")} />
                  {showContactTable ? "Ocultar lista" : "Mostrar lista"}
                </button>
                <span className="text-[10px] text-muted-foreground">{contacts.length} linha(s)</span>
              </div>

              {showContactTable && (
                <div className="max-h-[320px] overflow-auto rounded-lg border border-border/20 bg-card/20">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-card/90 backdrop-blur-sm z-10">
                      <tr className="border-b border-border/20">
                        <th className="text-left px-2 py-1.5 text-muted-foreground font-medium w-8">SN</th>
                        <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Nome</th>
                        <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Número</th>
                        {[1,2,3,4,5,6,7].map(n => (
                          <th key={n} className="text-left px-2 py-1.5 text-muted-foreground font-medium">Var {n}</th>
                        ))}
                        <th className="text-center px-2 py-1.5 text-muted-foreground font-medium w-16">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact, idx) => (
                        <tr key={contact.id} className="border-b border-border/10 hover:bg-muted/10 group">
                          <td className="px-2 py-1 text-muted-foreground/50">{idx + 1}</td>
                          <td className="px-1 py-1">
                            <Input value={contact.nome} onChange={(e) => updateContact(contact.id, "nome", e.target.value)} placeholder="Entre aqui" className="h-6 text-[11px] bg-transparent border-border/20 min-w-[80px]" />
                          </td>
                          <td className="px-1 py-1">
                            <Input value={contact.numero} onChange={(e) => updateContact(contact.id, "numero", e.target.value)} placeholder="Entre aqui" className="h-6 text-[11px] font-mono bg-transparent border-border/20 min-w-[100px]" />
                          </td>
                          {(["var1","var2","var3","var4","var5","var6","var7"] as const).map(varKey => (
                            <td key={varKey} className="px-1 py-1">
                              <Input value={contact[varKey]} onChange={(e) => updateContact(contact.id, varKey, e.target.value)} placeholder="Entre aqui" className="h-6 text-[11px] bg-transparent border-border/20 min-w-[70px]" />
                            </td>
                          ))}
                          <td className="px-2 py-1 text-center">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/40 hover:text-destructive" onClick={() => removeContact(contact.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {contacts.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/30 p-8 flex flex-col items-center gap-2 text-center">
              <Users className="w-5 h-5 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Nenhum contato adicionado</p>
              <p className="text-[10px] text-muted-foreground/60">Importe uma planilha ou adicione manualmente</p>
            </div>
          )}

          {invalidContacts.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/5 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>{invalidContacts.length} número(s) possivelmente inválido(s)</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs text-muted-foreground">Voltar</Button>
            <Button onClick={() => setStep(3)} className="gap-1.5 h-9 px-5 text-xs font-medium">
              Continuar <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ===== STEP 3: Message ===== */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border/30 bg-card/40 p-4 space-y-4">
            {/* Toolbar - simplified */}
            <div className="flex items-center gap-1 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 border-border/40">
                    <FileText className="w-3 h-3" /> Inserir variável
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1.5 bg-popover border-border z-50" align="start">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 px-2 py-1">Contato</p>
                  {[{ label: "Nome", tag: "{{nome}}" }, { label: "Número", tag: "{{numero}}" }].map(v => (
                    <button key={v.tag} className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent transition-colors flex items-center justify-between"
                      onClick={() => setMessage(prev => prev + v.tag)}>
                      <span>{v.label}</span>
                      <code className="text-[9px] text-muted-foreground">{v.tag}</code>
                    </button>
                  ))}
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 px-2 py-1 mt-1">Personalizadas</p>
                  {["Variável 1", "Variável 2", "Variável 3", "Variável 4", "Variável 5", "Variável 6", "Variável 7"].map((v, i) => (
                    <button key={v} className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent transition-colors flex items-center justify-between"
                      onClick={() => setMessage(prev => prev + `{{var${i + 1}}}`)}>
                      <span>{v}</span>
                      <code className="text-[9px] text-muted-foreground">{`{{var${i + 1}}}`}</code>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              <div className="h-4 w-px bg-border/30 mx-1" />
              {[
                { icon: Bold, label: "Negrito", wrap: ["*", "*"] },
                { icon: Italic, label: "Itálico", wrap: ["_", "_"] },
                { icon: Strikethrough, label: "Tachado", wrap: ["~", "~"] },
                { icon: Code, label: "Código", wrap: ["```", "```"] },
              ].map(({ icon: Icon, label, wrap }) => (
                <Button key={label} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title={label}
                  onClick={() => setMessage(prev => prev + wrap[0] + wrap[1])}>
                  <Icon className="w-3 h-3" />
                </Button>
              ))}
              <div className="h-4 w-px bg-border/30 mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Smile className="w-3 h-3" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"><Image className="w-3 h-3" /></Button>
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem aqui..."
              rows={8}
              className="text-sm leading-relaxed bg-background/30 border-border/20 resize-none focus:border-primary/30"
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{message.length} caracteres</span>
            </div>
          </div>

          {/* Buttons section */}
          {showButtons && (
            <div className="rounded-lg border border-border/30 bg-card/40 p-4 space-y-4">
              <span className="text-xs font-medium text-foreground">Botões Interativos</span>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><MousePointerClick className="w-3 h-3" /> Resposta Rápida <span className="text-[9px]">{quickReplyButtons.length}/3</span></span>
                  <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={addQuickReply} disabled={quickReplyButtons.length >= 3}><Plus className="w-3 h-3 mr-1" /> Adicionar</Button>
                </div>
                {quickReplyButtons.map(btn => (
                  <div key={btn.id} className="flex items-center gap-2">
                    <Input value={btn.text} onChange={(e) => updateQuickReply(btn.id, e.target.value)} placeholder="Texto do botão" className="h-7 text-xs flex-1 bg-background/30 border-border/20" maxLength={20} />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeQuickReply(btn.id)}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
              <div className="border-t border-border/20" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Link className="w-3 h-3" /> Link / Ligação <span className="text-[9px]">{ctaButtons.length}/2</span></span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => addCTAButton("url")} disabled={ctaButtons.length >= 2}><Link className="w-3 h-3 mr-1" /> URL</Button>
                    <Button variant="ghost" size="sm" className="text-[10px] h-6" onClick={() => addCTAButton("phone")} disabled={ctaButtons.length >= 2}><Phone className="w-3 h-3 mr-1" /> Tel</Button>
                  </div>
                </div>
                {ctaButtons.map(btn => (
                  <div key={btn.id} className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[9px] h-5">{btn.type === "url" ? "URL" : "TEL"}</Badge>
                    <Input value={btn.text} onChange={(e) => updateCTAButton(btn.id, "text", e.target.value)} placeholder="Texto" className="h-7 text-xs w-24 bg-background/30 border-border/20" maxLength={20} />
                    <Input value={btn.value} onChange={(e) => updateCTAButton(btn.id, "value", e.target.value)} placeholder={btn.type === "url" ? "https://..." : "+55..."} className="h-7 text-xs flex-1 bg-background/30 border-border/20" />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeCTAButton(btn.id)}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-xs text-muted-foreground">Voltar</Button>
            <Button onClick={() => setStep(4)} className="gap-1.5 h-9 px-5 text-xs font-medium">
              Continuar <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ===== STEP 4: Final Config + Review ===== */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Campaign name */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Nome da campanha</Label>
            <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Ex: Black Friday 2025" className="h-9 text-sm bg-card/60 border-border/40" />
          </div>

          {/* Schedule toggle */}
          <div className="rounded-lg border border-border/30 bg-card/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Agendar envio</span>
              <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
            </div>
            {scheduleEnabled && (
              <div className="mt-3">
                <Input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="h-8 text-xs bg-background/50 border-border/30" />
              </div>
            )}
          </div>

          {/* Review summary */}
          <div className="rounded-lg border border-border/30 bg-card/40 p-5 space-y-4">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-muted-foreground" /> Revisão</span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4">
              {[
                { label: "Instância(s)", value: selectedDevicesData.length > 0 ? selectedDevicesData.map(d => d.name).join(", ") : "—" },
                { label: "Contatos", value: String(validContacts.length) },
                { label: "Intervalo", value: `${minDelay}s – ${maxDelay}s` },
                { label: "Pausa", value: `A cada ${pauseEveryMin}–${pauseEveryMax} msgs · ${pauseDurationMin}s–${pauseDurationMax}s` },
                { label: "Risco", value: risk.label, className: risk.color },
              ].map(item => (
                <div key={item.label} className="space-y-0.5">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">{item.label}</p>
                  <p className={cn("text-sm font-medium text-foreground", (item as any).className)}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Message preview */}
            <div className="space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60">Mensagem</p>
              <div className="p-3 rounded-md bg-background/30 max-h-28 overflow-y-auto">
                <p className="text-xs text-foreground/70 whitespace-pre-wrap leading-relaxed">
                  {message || <span className="text-muted-foreground/50 italic">Vazia</span>}
                </p>
              </div>
            </div>

            {/* Warnings */}
            {(!campaignName || selectedDevices.length === 0 || validContacts.length === 0 || !message) && (
              <div className="flex items-center gap-2 text-[11px] text-destructive bg-destructive/5 rounded-md px-3 py-2">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>
                  {!campaignName && "Nome ausente. "}
                  {selectedDevices.length === 0 && "Sem instância. "}
                  {validContacts.length === 0 && "Sem contatos. "}
                  {!message && "Mensagem vazia."}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="text-xs text-muted-foreground">Voltar</Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs h-9 border-border/40 gap-1.5" onClick={() => setStep(3)}>
                <Eye className="w-3 h-3" /> Pré-visualizar
              </Button>
              <Button
                className="gap-2 h-9 px-6 text-xs font-medium"
                onClick={handleSendCampaign}
                disabled={createCampaign.isPending || startCampaign.isPending || !campaignName || selectedDevices.length === 0 || validContacts.length === 0 || !message}
              >
                <Send className="w-3.5 h-3.5" />
                {startCampaign.isPending ? "Enviando..." : createCampaign.isPending ? "Salvando..." : "Enviar agora"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
