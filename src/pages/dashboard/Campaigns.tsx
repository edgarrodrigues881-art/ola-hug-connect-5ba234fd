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
  Zap, Clock, Hash, ArrowUpRight, Wifi, WifiOff, RefreshCw
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
  { value: "texto", label: "Texto", icon: Type },
  { value: "texto-midia", label: "Texto + Mídia", icon: ImageIcon },
  { value: "botoes", label: "Botões", icon: MousePointerClick },
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
  const [contacts, setContacts] = useState<Contact[]>([
    { id: 1, nome: "", numero: "", var1: "", var2: "", var3: "" },
  ]);
  const [messageType, setMessageType] = useState("texto");
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [quickReplyButtons, setQuickReplyButtons] = useState<QuickReplyButton[]>([]);
  const [ctaButtons, setCTAButtons] = useState<CTAButton[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("nova");
  const [importFromContacts, setImportFromContacts] = useState(false);
  const [selectedContactTags, setSelectedContactTags] = useState<string[]>([]);
  const [showInstancePicker, setShowInstancePicker] = useState(false);

  // Send control
  const [messageLimit, setMessageLimit] = useState(100);
  const [minDelay, setMinDelay] = useState(15);
  const [maxDelay, setMaxDelay] = useState(45);
  const [randomDelay, setRandomDelay] = useState(true);
  const [dynamicPersonalization, setDynamicPersonalization] = useState(false);

  // Warmup
  const [warmupMode, setWarmupMode] = useState(false);
  const [dailyEscalation, setDailyEscalation] = useState(5);
  const [progressiveVolume, setProgressiveVolume] = useState(20);

  // Security
  const [securityExpanded, setSecurityExpanded] = useState(false);
  const [stopOnBlockRate, setStopOnBlockRate] = useState(true);
  const [blockRateThreshold, setBlockRateThreshold] = useState(5);
  const [stopOnConsecutiveErrors, setStopOnConsecutiveErrors] = useState(true);
  const [consecutiveErrorsThreshold, setConsecutiveErrorsThreshold] = useState(3);

  const allTags = Array.from(new Set(savedContacts.flatMap(c => c.tags || [])));
  const selectedDeviceData = devices.find(d => d.id === selectedDevice);
  const validContacts = contacts.filter(c => c.numero.trim());
  const invalidContacts = contacts.filter(c => c.numero.trim() && !/^\d{10,15}$/.test(c.numero.replace(/\D/g, "")));
  const showButtons = messageType === "botoes";

  // Risk estimation
  const getRiskLevel = () => {
    if (warmupMode) return { label: "Baixo", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
    if (messageLimit > 200 || minDelay < 10) return { label: "Alto", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" };
    if (messageLimit > 100 || minDelay < 15) return { label: "Médio", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
    return { label: "Baixo", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
  };

  const risk = getRiskLevel();

  // Handlers
  const handleSendCampaign = () => {
    if (!campaignName.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe o nome da campanha.", variant: "destructive" });
      return;
    }
    if (!selectedDevice) {
      toast({ title: "Instância obrigatória", description: "Selecione uma instância.", variant: "destructive" });
      return;
    }
    if (validContacts.length === 0) {
      toast({ title: "Sem contatos", description: "Adicione pelo menos um contato.", variant: "destructive" });
      return;
    }
    if (!message.trim()) {
      toast({ title: "Mensagem vazia", description: "Escreva a mensagem.", variant: "destructive" });
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

  const addQuickReply = () => { if (quickReplyButtons.length < 3) setQuickReplyButtons([...quickReplyButtons, { id: Date.now(), text: "" }]); };
  const addCTAButton = (type: "url" | "phone") => { if (ctaButtons.length < 2) setCTAButtons([...ctaButtons, { id: Date.now(), type, text: "", value: "" }]); };
  const removeQuickReply = (id: number) => setQuickReplyButtons(quickReplyButtons.filter(b => b.id !== id));
  const removeCTAButton = (id: number) => setCTAButtons(ctaButtons.filter(b => b.id !== id));
  const updateQuickReply = (id: number, text: string) => setQuickReplyButtons(quickReplyButtons.map(b => b.id === id ? { ...b, text } : b));
  const updateCTAButton = (id: number, field: "text" | "value", val: string) => setCTAButtons(ctaButtons.map(b => b.id === id ? { ...b, [field]: val } : b));

  const addContact = () => setContacts([...contacts, { id: Date.now(), nome: "", numero: "", var1: "", var2: "", var3: "" }]);
  const updateContact = (id: number, field: keyof Contact, value: string) => setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeContact = (id: number) => { if (contacts.length > 1) setContacts(contacts.filter(c => c.id !== id)); };

  const handleImportFromDB = () => {
    let filtered = savedContacts;
    if (selectedContactTags.length > 0) filtered = filtered.filter(c => c.tags?.some(t => selectedContactTags.includes(t)));
    const imported: Contact[] = filtered.map((c, i) => ({ id: Date.now() + i, nome: c.name, numero: c.phone, var1: "", var2: "", var3: "" }));
    if (imported.length === 0) { toast({ title: "Nenhum contato encontrado", variant: "destructive" }); return; }
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
            imported.push({ id: Date.now() + i, nome: String(row[0] || ""), numero: String(row[1] || ""), var1: String(row[2] || ""), var2: String(row[3] || ""), var3: String(row[4] || "") });
          }
        }
        if (imported.length > 0) { setContacts(imported); toast({ title: `${imported.length} contatos importados` }); }
        else toast({ title: "Nenhum contato encontrado", variant: "destructive" });
      } catch { toast({ title: "Erro ao ler arquivo", variant: "destructive" }); }
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDownloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([["Nome", "Número", "Variável 1", "Variável 2", "Variável 3"], ["João Silva", "5511999999999", "valor1", "valor2", "valor3"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");
    XLSX.writeFile(wb, "modelo-contatos.xlsx");
  };

  const steps = [
    { num: 1, label: "Configuração" },
    { num: 2, label: "Contatos" },
    { num: 3, label: "Mensagem" },
    { num: 4, label: "Revisão" },
  ];

  // Status helpers
  const getDeviceStatus = (status: string) => {
    if (status === "Ready") return { label: "Online", icon: Wifi, color: "text-emerald-400" };
    if (status === "QR") return { label: "QR Pendente", icon: RefreshCw, color: "text-amber-400" };
    return { label: "Offline", icon: WifiOff, color: "text-red-400" };
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Nova Campanha</h1>
        <p className="text-xs text-muted-foreground">Configure, controle e envie com segurança</p>
      </div>

      {/* Stepper - minimal */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div key={s.num} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => setStep(s.num)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all w-full justify-center",
                  isActive && "bg-primary/10 text-primary",
                  isDone && "bg-muted/60 text-foreground",
                  !isActive && !isDone && "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                  isActive && "bg-primary text-primary-foreground",
                  isDone && "bg-foreground/20 text-foreground",
                  !isActive && !isDone && "bg-muted text-muted-foreground",
                )}>{isDone ? "✓" : s.num}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && <div className="w-4 h-px bg-border shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* ===== STEP 1: Configuration ===== */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Campaign name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome da campanha</Label>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Ex: Promoção Black Friday"
              className="h-9 text-sm bg-card border-border/50"
            />
          </div>

          {/* 1️⃣ Instance Card */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Instância</Label>
            {selectedDeviceData ? (
              <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-foreground/70" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedDeviceData.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{selectedDeviceData.number || "Sem número"}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={() => setShowInstancePicker(true)}>
                    Trocar
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(() => {
                    const s = getDeviceStatus(selectedDeviceData.status);
                    const StatusIcon = s.icon;
                    return (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <StatusIcon className={cn("w-3 h-3", s.color)} />
                        <span className={s.color}>{s.label}</span>
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Activity className="w-3 h-3" />
                    <span>Score: 85</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Hash className="w-3 h-3" />
                    <span>0 enviadas hoje</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Shield className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Risco baixo</span>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowInstancePicker(true)}
                className="w-full rounded-xl border border-dashed border-border/60 bg-card p-6 flex flex-col items-center gap-2 hover:border-primary/30 transition-colors"
              >
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Selecionar instância</span>
              </button>
            )}

            {/* Instance picker modal */}
            {showInstancePicker && (
              <div className="rounded-xl border border-border/50 bg-card p-3 space-y-2">
                {devices.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma instância disponível</p>
                ) : (
                  devices.map(d => {
                    const s = getDeviceStatus(d.status);
                    const StatusIcon = s.icon;
                    return (
                      <button
                        key={d.id}
                        onClick={() => { setSelectedDevice(d.id); setShowInstancePicker(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                          d.id === selectedDevice
                            ? "bg-primary/5 border border-primary/20"
                            : "hover:bg-muted/40 border border-transparent"
                        )}
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                          <Smartphone className="w-3.5 h-3.5 text-foreground/60" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{d.number || "—"}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <StatusIcon className={cn("w-3 h-3", s.color)} />
                          <span className={cn("text-[10px]", s.color)}>{s.label}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 2️⃣ Message Type */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tipo de mensagem</Label>
            <div className="grid grid-cols-3 gap-2">
              {messageTypes.map(mt => {
                const Icon = mt.icon;
                const isSelected = messageType === mt.value;
                return (
                  <button
                    key={mt.value}
                    onClick={() => setMessageType(mt.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                      isSelected
                        ? "bg-primary/5 border-primary/30 text-primary"
                        : "bg-card border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-medium">{mt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic personalization toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Personalização dinâmica</span>
                <span className="text-[10px] text-muted-foreground/60">{"{{nome}}"}</span>
              </div>
              <Switch checked={dynamicPersonalization} onCheckedChange={setDynamicPersonalization} />
            </div>
          </div>

          {/* Template selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Modelo</Label>
            <Select value={selectedTemplate} onValueChange={(val) => {
              setSelectedTemplate(val);
              if (val !== "nova") {
                const tmpl = savedTemplates.find(t => t.id === val);
                if (tmpl) {
                  setMessage(tmpl.content);
                  const typeMap: Record<string, string> = { text: "texto", "text-media": "texto-midia", buttons: "botoes" };
                  setMessageType(typeMap[tmpl.type] || tmpl.type);
                  if (tmpl.buttons && Array.isArray(tmpl.buttons)) {
                    const replyBtns = tmpl.buttons.filter((b: any) => b.type === "reply");
                    const ctaBtns = tmpl.buttons.filter((b: any) => b.type === "url" || b.type === "phone");
                    setQuickReplyButtons(replyBtns.map((b: any, i: number) => ({ id: Date.now() + i, text: b.text || "" })));
                    setCTAButtons(ctaBtns.map((b: any, i: number) => ({ id: Date.now() + 100 + i, type: b.type, text: b.text || "", value: b.value || "" })));
                  } else { setQuickReplyButtons([]); setCTAButtons([]); }
                }
              } else { setMessage(""); setMessageType("texto"); setQuickReplyButtons([]); setCTAButtons([]); }
            }}>
              <SelectTrigger className="h-9 text-sm bg-card border-border/50">
                <SelectValue placeholder="Nova mensagem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nova">Nova mensagem</SelectItem>
                {savedTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3️⃣ Send Control */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Controle de envio</Label>
            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">Limite de mensagens</label>
                  <Input
                    type="number"
                    value={messageLimit}
                    onChange={(e) => setMessageLimit(Number(e.target.value))}
                    className="h-8 text-sm bg-muted/20 border-border/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">Intervalo mín. (s)</label>
                  <Input
                    type="number"
                    value={minDelay}
                    onChange={(e) => setMinDelay(Number(e.target.value))}
                    className="h-8 text-sm bg-muted/20 border-border/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] text-muted-foreground">Intervalo máx. (s)</label>
                  <Input
                    type="number"
                    value={maxDelay}
                    onChange={(e) => setMaxDelay(Number(e.target.value))}
                    className="h-8 text-sm bg-muted/20 border-border/30"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Delay aleatório</span>
                </div>
                <Switch checked={randomDelay} onCheckedChange={setRandomDelay} />
              </div>

              <div className="border-t border-border/30 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className={cn("w-3.5 h-3.5", warmupMode ? "text-amber-400" : "text-muted-foreground")} />
                    <span className={cn("text-xs font-medium", warmupMode ? "text-foreground" : "text-muted-foreground")}>Modo Aquecimento</span>
                  </div>
                  <Switch checked={warmupMode} onCheckedChange={setWarmupMode} />
                </div>

                {warmupMode && (
                  <div className="mt-3 space-y-3 pl-5 border-l-2 border-amber-500/20">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-muted-foreground">Escalonamento diário</label>
                        <span className="text-[11px] text-foreground font-mono">+{dailyEscalation}/dia</span>
                      </div>
                      <Slider
                        value={[dailyEscalation]}
                        onValueChange={([v]) => setDailyEscalation(v)}
                        min={1}
                        max={20}
                        step={1}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-muted-foreground">Volume progressivo inicial</label>
                        <span className="text-[11px] text-foreground font-mono">{progressiveVolume} msgs</span>
                      </div>
                      <Slider
                        value={[progressiveVolume]}
                        onValueChange={([v]) => setProgressiveVolume(v)}
                        min={5}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70">
                      <Flame className="w-3 h-3" />
                      <span>Intervalo humanizado será aplicado automaticamente</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4️⃣ Security - Collapsible */}
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <button
              onClick={() => setSecurityExpanded(!securityExpanded)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Segurança</span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", securityExpanded && "rotate-180")} />
            </button>
            {securityExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-border/30">
                <div className="flex items-center justify-between pt-3">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={stopOnBlockRate} onCheckedChange={(v) => setStopOnBlockRate(!!v)} />
                    <span className="text-xs text-muted-foreground">Parar se taxa de bloqueio &gt;</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={blockRateThreshold}
                      onChange={(e) => setBlockRateThreshold(Number(e.target.value))}
                      className="h-7 w-14 text-xs text-center bg-muted/20 border-border/30"
                      disabled={!stopOnBlockRate}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={stopOnConsecutiveErrors} onCheckedChange={(v) => setStopOnConsecutiveErrors(!!v)} />
                    <span className="text-xs text-muted-foreground">Parar se erros consecutivos &gt;</span>
                  </div>
                  <Input
                    type="number"
                    value={consecutiveErrorsThreshold}
                    onChange={(e) => setConsecutiveErrorsThreshold(Number(e.target.value))}
                    className="h-7 w-14 text-xs text-center bg-muted/20 border-border/30"
                    disabled={!stopOnConsecutiveErrors}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(2)} className="gap-1.5 h-9 px-5 text-sm">
              Continuar <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ===== STEP 2: Contacts ===== */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-foreground/60" />
                <span className="text-sm font-medium text-foreground">{validContacts.length} contatos</span>
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2">
                <Button variant="outline" size="sm" className="text-xs h-8 border-border/50" onClick={handleDownloadSample}>
                  <Download className="w-3 h-3 mr-1.5" /> Modelo
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8 border-border/50" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-3 h-3 mr-1.5" /> Importar
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8 border-border/50" onClick={() => setImportFromContacts(true)}>
                  <Users className="w-3 h-3 mr-1.5" /> Contatos
                </Button>
                <Button size="sm" className="text-xs h-8" onClick={addContact}>
                  <Plus className="w-3 h-3 mr-1.5" /> Adicionar
                </Button>
              </div>
            </div>

            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />

            {importFromContacts && (
              <div className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Importar da lista</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setImportFromContacts(false)}><X className="w-3.5 h-3.5" /></Button>
                </div>
                {allTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {allTags.map(tag => (
                      <button key={tag} onClick={() => setSelectedContactTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                        className={cn("px-2 py-0.5 rounded-full text-[10px] border transition-all",
                          selectedContactTags.includes(tag) ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border/50 text-muted-foreground"
                        )}>{tag}</button>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {selectedContactTags.length > 0
                      ? `${savedContacts.filter(c => c.tags?.some(t => selectedContactTags.includes(t))).length} contatos`
                      : `${savedContacts.length} contatos`}
                  </span>
                  <Button size="sm" className="text-xs h-7" onClick={handleImportFromDB}>Importar</Button>
                </div>
              </div>
            )}

            <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
              {contacts.map((contact, idx) => (
                <div key={contact.id} className="flex flex-col sm:flex-row sm:items-center gap-1.5 p-2 rounded-lg bg-muted/10 border border-border/30 group">
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <span className="text-[10px] text-muted-foreground w-5 text-center shrink-0">{idx + 1}</span>
                    <Input value={contact.nome} onChange={(e) => updateContact(contact.id, "nome", e.target.value)} placeholder="Nome" className="h-7 text-xs flex-1 bg-transparent border-border/30" />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 sm:hidden" onClick={() => removeContact(contact.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <Input value={contact.numero} onChange={(e) => updateContact(contact.id, "numero", e.target.value)} placeholder="5511999999999" className="h-7 text-xs flex-1 font-mono bg-transparent border-border/30" />
                  <Input value={contact.var1} onChange={(e) => updateContact(contact.id, "var1", e.target.value)} placeholder="Var 1" className="h-7 text-xs w-20 hidden lg:block bg-transparent border-border/30" />
                  <Input value={contact.var2} onChange={(e) => updateContact(contact.id, "var2", e.target.value)} placeholder="Var 2" className="h-7 text-xs w-20 hidden lg:block bg-transparent border-border/30" />
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 hidden sm:flex opacity-0 group-hover:opacity-100" onClick={() => removeContact(contact.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {invalidContacts.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{invalidContacts.length} número(s) possivelmente inválido(s)</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs text-muted-foreground">Voltar</Button>
            <Button onClick={() => setStep(3)} className="gap-1.5 h-9 px-5 text-sm">
              Continuar <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ===== STEP 3: Message ===== */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-foreground/60" />
              <span className="text-sm font-medium text-foreground">Mensagem</span>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-0.5 p-1 rounded-lg bg-muted/20 border border-border/30 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
                    <FileText className="w-3 h-3" /> Variável
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1" align="start">
                  {["Nome", "Número", "Variável 1", "Variável 2", "Variável 3"].map(v => (
                    <button key={v} className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent transition-colors"
                      onClick={() => {
                        const tag = v === "Nome" ? "{{nome}}" : v === "Número" ? "{{numero}}" : `{{var${v.split(" ")[1]}}}`;
                        setMessage(prev => prev + tag);
                      }}>{v}</button>
                  ))}
                </PopoverContent>
              </Popover>
              <div className="w-px h-4 bg-border/50 mx-0.5" />
              {[
                { icon: Bold, label: "Negrito", wrap: ["*", "*"] },
                { icon: Italic, label: "Itálico", wrap: ["_", "_"] },
                { icon: Strikethrough, label: "Tachado", wrap: ["~", "~"] },
                { icon: Code, label: "Código", wrap: ["```", "```"] },
              ].map(({ icon: Icon, label, wrap }) => (
                <Button key={label} variant="ghost" size="icon" className="h-7 w-7" title={label}
                  onClick={() => setMessage(prev => prev + wrap[0] + wrap[1])}>
                  <Icon className="w-3 h-3" />
                </Button>
              ))}
              <div className="w-px h-4 bg-border/50 mx-0.5" />
              <Button variant="ghost" size="icon" className="h-7 w-7"><Smile className="w-3 h-3" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Image className="w-3 h-3" /></Button>
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={6}
              className="text-sm leading-relaxed bg-transparent border-border/30 resize-none"
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{message.length} caracteres</span>
            </div>
          </div>

          {/* Buttons section */}
          {showButtons && (
            <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
              <span className="text-sm font-medium text-foreground">Botões Interativos</span>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="w-3.5 h-3.5 text-foreground/60" />
                    <span className="text-xs text-muted-foreground">Resposta Rápida</span>
                    <span className="text-[10px] text-muted-foreground">{quickReplyButtons.length}/3</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={addQuickReply} disabled={quickReplyButtons.length >= 3}>
                    <Plus className="w-3 h-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {quickReplyButtons.map((btn, idx) => (
                  <div key={btn.id} className="flex items-center gap-2">
                    <Input value={btn.text} onChange={(e) => updateQuickReply(btn.id, e.target.value)} placeholder="Texto do botão" className="h-7 text-xs flex-1 bg-transparent border-border/30" maxLength={20} />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeQuickReply(btn.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/30" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link className="w-3.5 h-3.5 text-foreground/60" />
                    <span className="text-xs text-muted-foreground">Link / Ligação</span>
                    <span className="text-[10px] text-muted-foreground">{ctaButtons.length}/2</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => addCTAButton("url")} disabled={ctaButtons.length >= 2}>
                      <Link className="w-3 h-3 mr-1" /> URL
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => addCTAButton("phone")} disabled={ctaButtons.length >= 2}>
                      <Phone className="w-3 h-3 mr-1" /> Tel
                    </Button>
                  </div>
                </div>
                {ctaButtons.map(btn => (
                  <div key={btn.id} className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{btn.type === "url" ? "URL" : "TEL"}</Badge>
                    <Input value={btn.text} onChange={(e) => updateCTAButton(btn.id, "text", e.target.value)} placeholder="Texto" className="h-7 text-xs w-24 bg-transparent border-border/30" maxLength={20} />
                    <Input value={btn.value} onChange={(e) => updateCTAButton(btn.id, "value", e.target.value)} placeholder={btn.type === "url" ? "https://..." : "+55..."} className="h-7 text-xs flex-1 bg-transparent border-border/30" />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeCTAButton(btn.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-xs text-muted-foreground">Voltar</Button>
            <Button onClick={() => setStep(4)} className="gap-1.5 h-9 px-5 text-sm">
              Continuar <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ===== STEP 4: Review ===== */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border/50 bg-card p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-foreground/60" />
              <span className="text-sm font-medium text-foreground">Revisão</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Instância</span>
                <p className="text-sm font-medium text-foreground truncate">{selectedDeviceData?.name || "—"}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Contatos</span>
                <p className="text-sm font-medium text-foreground">{validContacts.length}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Limite</span>
                <p className="text-sm font-medium text-foreground">{messageLimit} msgs</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Intervalo</span>
                <p className="text-sm font-medium text-foreground">{minDelay}s – {maxDelay}s</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Modo</span>
                <p className="text-sm font-medium text-foreground">{warmupMode ? "Aquecimento" : "Normal"}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Risco estimado</span>
                <p className={cn("text-sm font-medium", risk.color)}>{risk.label}</p>
              </div>
            </div>

            {/* Message preview */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Mensagem</span>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/30 max-h-36 overflow-y-auto">
                <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {message || <span className="text-muted-foreground italic">Vazia</span>}
                </p>
              </div>
            </div>

            {/* Warnings */}
            {(!campaignName || !selectedDevice || validContacts.length === 0 || !message) && (
              <div className="flex items-center gap-2 text-[11px] text-destructive bg-destructive/5 border border-destructive/10 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {!campaignName && "Nome ausente. "}
                  {!selectedDevice && "Sem instância. "}
                  {validContacts.length === 0 && "Sem contatos. "}
                  {!message && "Mensagem vazia."}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="text-xs text-muted-foreground">Voltar</Button>
            <Button
              className="gap-2 h-10 px-8 text-sm font-medium"
              onClick={handleSendCampaign}
              disabled={createCampaign.isPending || startCampaign.isPending || !campaignName || !selectedDevice || validContacts.length === 0 || !message}
            >
              <Send className="w-4 h-4" />
              {startCampaign.isPending ? "Enviando..." : createCampaign.isPending ? "Salvando..." : "Iniciar Campanha"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Campaigns;
