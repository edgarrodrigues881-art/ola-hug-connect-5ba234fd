import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Plus, Upload, Download, Eye, Send, Trash2, Bold, Italic, Strikethrough,
  Smile, Image, Code, FileText, AlertTriangle, Link, MousePointerClick,
  X, Users, MessageSquare, Smartphone, ChevronRight, ChevronDown,
  Phone, Type, ImageIcon, Flame, Shield, ShieldAlert, Activity,
  Zap, Clock, Hash, Wifi, WifiOff, RefreshCw, Settings2, Calendar,
  CheckCircle2, XCircle, Copy, Eraser
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaFileRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");

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

  // Draft persistence key
  const DRAFT_KEY = "campaign_draft";

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
  const [previewContacts, setPreviewContacts] = useState<Contact[] | null>(null);
  const [contactPage, setContactPage] = useState(0);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const CONTACTS_PER_PAGE = 50;
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Send control
  const [messageLimit, setMessageLimit] = useState(100);
  const [minDelay, setMinDelay] = useState(8);
  const [maxDelay, setMaxDelay] = useState(25);
  const [pauseEveryMin, setPauseEveryMin] = useState(10);
  const [pauseEveryMax, setPauseEveryMax] = useState(20);
  const [pauseDurationMin, setPauseDurationMin] = useState(30);
  const [pauseDurationMax, setPauseDurationMax] = useState(120);

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.campaignName) setCampaignName(draft.campaignName);
        if (draft.message) setMessage(draft.message);
        if (draft.messageType) setMessageType(draft.messageType);
        if (draft.mediaUrl) setMediaUrl(draft.mediaUrl);
        if (draft.contacts?.length) { setContacts(draft.contacts); setShowContactTable(true); }
        if (draft.quickReplyButtons?.length) setQuickReplyButtons(draft.quickReplyButtons);
        if (draft.ctaButtons?.length) setCTAButtons(draft.ctaButtons);
        if (draft.selectedDevices?.length) setSelectedDevices(draft.selectedDevices);
        if (draft.minDelay) setMinDelay(draft.minDelay);
        if (draft.maxDelay) setMaxDelay(draft.maxDelay);
        if (draft.scheduleEnabled) setScheduleEnabled(draft.scheduleEnabled);
        if (draft.scheduleDate) setScheduleDate(draft.scheduleDate);
      }
    } catch { /* ignore corrupt data */ }
    setDraftLoaded(true);
  }, []);

  // Auto-save draft to localStorage whenever form changes
  useEffect(() => {
    if (!draftLoaded) return;
    const draft = {
      campaignName, message, messageType, mediaUrl, contacts,
      quickReplyButtons, ctaButtons, selectedDevices,
      minDelay, maxDelay, scheduleEnabled, scheduleDate,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draftLoaded, campaignName, message, messageType, mediaUrl, contacts, quickReplyButtons, ctaButtons, selectedDevices, minDelay, maxDelay, scheduleEnabled, scheduleDate]);

  const clearAllForm = () => {
    setCampaignName(""); setMessage(""); setMediaUrl(""); setContacts([]);
    setQuickReplyButtons([]); setCTAButtons([]); setSelectedDevices([]);
    setMessageType("texto"); setStep(1); setSelectedTemplate("nova");
    setScheduleEnabled(false); setScheduleDate(""); setShowContactTable(false);
    localStorage.removeItem(DRAFT_KEY);
    toast({ title: "Formulário limpo", description: "Todos os campos foram resetados." });
  };

  const allTags = Array.from(new Set(savedContacts.flatMap(c => c.tags || [])));
  const selectedDevicesData = devices.filter(d => selectedDevices.includes(d.id));
  const selectedDeviceData = selectedDevicesData[0];
  const validContacts = useMemo(() => contacts.filter(c => c.numero.trim()), [contacts]);
  const invalidContacts = useMemo(() => contacts.filter(c => c.numero.trim() && !/^\d{10,15}$/.test(c.numero.replace(/\D/g, ""))), [contacts]);
  const duplicateCount = useMemo(() => contacts.length - new Set(contacts.map(c => c.numero.trim()).filter(Boolean)).size, [contacts]);
  const showButtons = messageType === "texto-botao" || messageType === "imagem-botao";

  // Paginated contacts for table performance
  const totalPages = Math.ceil(contacts.length / CONTACTS_PER_PAGE);
  const paginatedContacts = useMemo(() =>
    contacts.slice(contactPage * CONTACTS_PER_PAGE, (contactPage + 1) * CONTACTS_PER_PAGE),
    [contacts, contactPage, CONTACTS_PER_PAGE]
  );

  const confirmPreviewImport = useCallback(() => {
    if (previewContacts) {
      setContacts(previewContacts);
      setShowContactTable(true);
      setContactPage(0);
      toast({ title: `${previewContacts.length} contatos importados` });
      setPreviewContacts(null);
    }
  }, [previewContacts, toast]);

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
      media_url: mediaUrl || undefined,
      buttons: [...quickReplyButtons.map(b => ({ type: "reply", text: b.text })), ...ctaButtons.map(b => ({ type: b.type, text: b.text, value: b.value }))],
      contacts: validContacts.map(c => ({ phone: c.numero, name: c.nome || undefined })),
    }, {
      onSuccess: (newCampaign) => {
        toast({ title: "Campanha criada!", description: `${validContacts.length} contatos. Iniciando envio...` });
        startCampaign.mutate({ campaignId: newCampaign.id, deviceId: selectedDevices[0] }, {
          onSuccess: (result) => { toast({ title: "Envio concluído!", description: `Enviados: ${result?.sent || 0} | Falhas: ${result?.failed || 0}` }); },
          onError: (err: any) => { toast({ title: "Erro no envio", description: err.message, variant: "destructive" }); },
        });
        setCampaignName(""); setMessage(""); setMediaUrl(""); setContacts([]); setQuickReplyButtons([]); setCTAButtons([]); setStep(1); localStorage.removeItem(DRAFT_KEY);
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

  const wrapSelectedText = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) { setMessage(prev => prev + before + after); return; }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = message.substring(start, end);
    const newText = message.substring(0, start) + before + selected + after + message.substring(end);
    setMessage(newText);
    // Restore cursor position after state update
    setTimeout(() => {
      textarea.focus();
      if (selected.length > 0) {
        textarea.setSelectionRange(start + before.length, end + before.length);
      } else {
        textarea.setSelectionRange(start + before.length, start + before.length);
      }
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) { setMessage(prev => prev + text); return; }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = message.substring(0, start) + text + message.substring(end);
    setMessage(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const commonEmojis = {
    "Mais usados": ["😀", "😂", "🤣", "😊", "😍", "🥰", "😎", "🤩", "😘", "🤗", "😁", "😉", "🥺", "😢", "😤", "🤔"],
    "Gestos": ["👍", "👋", "🙏", "💪", "🤝", "👏", "✌️", "🤞", "👊", "🫶", "☝️", "👆", "👇", "👉", "👈", "🫡"],
    "Negócios": ["✅", "⭐", "💰", "🚀", "📱", "💬", "📢", "🎯", "⚡", "🏆", "💎", "📞", "✨", "🛒", "🎁", "📊"],
    "Símbolos": ["❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "🔥", "💥", "⚠️", "🔔", "🎉", "🎊", "💯", "🆕"],
  };

  const [emojiCategory, setEmojiCategory] = useState<string>("Mais usados");

  const showMediaInput = messageType === "texto-imagem" || messageType === "imagem-botao";

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
    setImportProgress(0);
    const reader = new FileReader();
    reader.onprogress = (evt) => {
      if (evt.lengthComputable) {
        setImportProgress(Math.round((evt.loaded / evt.total) * 40));
      }
    };
    reader.onload = (evt) => {
      try {
        setImportProgress(45);
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        setImportProgress(60);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (rows.length < 1) {
          setImportProgress(null);
          toast({ title: "Arquivo vazio", description: "O arquivo não contém dados.", variant: "destructive" });
          return;
        }

        setImportProgress(70);

        // Smart column detection
        const normalize = (s: string) =>
          String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\s]+/g, " ").trim();

        const findCol = (headers: string[], names: string[]): number => {
          const nh = headers.map(h => normalize(String(h)));
          const nn = names.map(normalize);
          for (const n of nn) { const i = nh.indexOf(n); if (i !== -1) return i; }
          for (const n of nn) { const i = nh.findIndex(h => h.startsWith(n)); if (i !== -1) return i; }
          for (const n of nn) { const i = nh.findIndex(h => h.includes(n)); if (i !== -1) return i; }
          return -1;
        };

        // Check if first row looks like a header
        const firstRow = rows[0] || [];
        const hasHeader = firstRow.some((c: any) => {
          const s = normalize(String(c));
          return ["nome", "name", "numero", "number", "telefone", "phone", "contato", "contact", "whatsapp", "celular", "var"].some(k => s.includes(k));
        });

        let nameCol = -1;
        let numCol = -1;
        let startRow = 0;

        if (hasHeader) {
          const headers = firstRow.map((c: any) => String(c));
          nameCol = findCol(headers, ["nome", "name", "contato", "contact", "cliente", "customer"]);
          numCol = findCol(headers, ["numero", "number", "telefone", "phone", "whatsapp", "celular", "fone", "tel"]);
          startRow = 1;
        }

        // Fallback: detect by content — find first column with phone-like numbers
        if (numCol === -1) {
          for (let ci = 0; ci < (rows[hasHeader ? 1 : 0]?.length || 0); ci++) {
            const sample = String(rows[hasHeader ? 1 : 0]?.[ci] ?? "").replace(/\D/g, "");
            if (sample.length >= 8) { numCol = ci; break; }
          }
        }

        // If still no number column, try every column across first rows
        if (numCol === -1) {
          for (let ri = 0; ri < Math.min(5, rows.length); ri++) {
            const row = rows[ri];
            if (!row) continue;
            for (let ci = 0; ci < row.length; ci++) {
              const val = String(row[ci] ?? "").replace(/\D/g, "");
              if (val.length >= 8) { numCol = ci; startRow = hasHeader ? 1 : 0; break; }
            }
            if (numCol !== -1) break;
          }
        }

        if (numCol === -1) {
          setImportProgress(null);
          toast({ title: "Coluna de número não encontrada", description: "Certifique-se que a planilha tem uma coluna com números de telefone.", variant: "destructive" });
          return;
        }

        // Name column defaults to the one before number, or first non-number column
        if (nameCol === -1) nameCol = numCol === 0 ? 1 : 0;

        setImportProgress(80);

        const imported: Contact[] = [];
        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const rawNum = String(row[numCol] ?? "").trim().replace(/\D/g, "");
          if (rawNum.length < 8) continue;
          const nome = String(row[nameCol] ?? "").trim();

          // Map remaining columns to vars, skipping name and number cols
          const otherCols = [];
          for (let c = 0; c < row.length; c++) {
            if (c !== nameCol && c !== numCol) otherCols.push(String(row[c] ?? ""));
          }

          imported.push({
            id: Date.now() + i,
            nome,
            numero: rawNum,
            var1: otherCols[0] ?? "",
            var2: otherCols[1] ?? "",
            var3: otherCols[2] ?? "",
            var4: otherCols[3] ?? "",
            var5: otherCols[4] ?? "",
            var6: otherCols[5] ?? "",
            var7: otherCols[6] ?? "",
          });
        }
        setImportProgress(100);
        setTimeout(() => {
          setImportProgress(null);
          if (imported.length > 0) {
            setPreviewContacts(imported);
          } else {
            toast({ title: "Nenhum contato encontrado", description: "Nenhum número válido (8+ dígitos) foi encontrado.", variant: "destructive" });
          }
        }, 400);
      } catch (err) {
        console.error("Import error:", err);
        setImportProgress(null);
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
    { num: 1, label: "Mensagem", icon: MessageSquare },
    { num: 2, label: "Contatos", icon: Users },
    { num: 3, label: "Configuração", icon: Settings2 },
    { num: 4, label: "Enviar", icon: Send },
  ];

  return (
    <div className="space-y-8 w-full pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Enviar Mensagem</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Configure e envie com controle total</p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1.5 h-8" onClick={clearAllForm}>
          <Eraser className="w-3 h-3" /> Limpar tudo
        </Button>
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

      {/* ===== STEP 1: Message ===== */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Template selector */}
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
                  if (tmpl.media_url) setMediaUrl(tmpl.media_url);
                  if (tmpl.buttons && Array.isArray(tmpl.buttons)) {
                    setQuickReplyButtons(tmpl.buttons.filter((b: any) => b.type === "reply").map((b: any, i: number) => ({ id: Date.now() + i, text: b.text || "" })));
                    setCTAButtons(tmpl.buttons.filter((b: any) => b.type === "url" || b.type === "phone").map((b: any, i: number) => ({ id: Date.now() + 100 + i, type: b.type, text: b.text || "", value: b.value || "" })));
                  } else { setQuickReplyButtons([]); setCTAButtons([]); }
                }
              } else { setMessage(""); setMessageType("texto"); setMediaUrl(""); setQuickReplyButtons([]); setCTAButtons([]); }
            }}>
              <SelectTrigger className="h-9 text-xs bg-card/60 border-border/40 max-w-xs">
                <SelectValue placeholder="Nova mensagem" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                <SelectItem value="nova">Nova mensagem</SelectItem>
                {savedTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Message Type Cards */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Tipo de Mensagem</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {messageTypes.map(mt => {
                const Icon = mt.icon;
                const isActive = messageType === mt.value;
                return (
                  <button
                    key={mt.value}
                    onClick={() => setMessageType(mt.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all",
                      isActive
                        ? "border-primary/50 bg-primary/8 text-primary"
                        : "border-border/30 bg-card/30 text-muted-foreground hover:bg-card/60 hover:border-border/50"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-[11px] font-medium leading-tight">{mt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Media URL Input - visible when image types selected */}
          {showMediaInput && (
            <div className="rounded-lg border border-border/30 bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5" /> URL da Mídia
                </span>
                {mediaUrl && (
                  <Button variant="ghost" size="sm" className="text-[10px] h-6 text-destructive" onClick={() => setMediaUrl("")}>
                    <X className="w-3 h-3 mr-1" /> Remover
                  </Button>
                )}
              </div>
              <Input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                className="h-9 text-xs bg-background/50 border-border/30"
              />
              {mediaUrl && (
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg border border-border/30 overflow-hidden bg-muted/20 flex items-center justify-center shrink-0">
                    <img
                      src={mediaUrl}
                      alt="preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = 'none';
                        el.parentElement!.innerHTML = '<span class="text-[9px] text-muted-foreground">Sem preview</span>';
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground break-all line-clamp-2">{mediaUrl}</span>
                </div>
              )}
              {!mediaUrl && (
                <p className="text-[9px] text-muted-foreground/60">Cole a URL de uma imagem, vídeo ou documento para enviar junto com a mensagem</p>
              )}
            </div>
          )}

          {/* Message editor */}
          <div className="rounded-lg border border-border/30 bg-card/40 p-4 space-y-4">
            {/* Toolbar */}
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
                      onClick={() => insertAtCursor(v.tag)}>
                      <span>{v.label}</span>
                      <code className="text-[9px] text-muted-foreground">{v.tag}</code>
                    </button>
                  ))}
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 px-2 py-1 mt-1">Personalizadas</p>
                  {["Variável 1", "Variável 2", "Variável 3", "Variável 4", "Variável 5", "Variável 6", "Variável 7"].map((v, i) => (
                    <button key={v} className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent transition-colors flex items-center justify-between"
                      onClick={() => insertAtCursor(`{{var${i + 1}}}`)}>
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
                  onClick={() => wrapSelectedText(wrap[0], wrap[1])}>
                  <Icon className="w-3 h-3" />
                </Button>
              ))}
              <div className="h-4 w-px bg-border/30 mx-1" />

              {/* Emoji Picker */}
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Emoji">
                    <Smile className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-2 bg-popover border-border z-50" align="start">
                  {/* Category tabs */}
                  <div className="flex items-center gap-0.5 mb-2 border-b border-border/20 pb-1.5">
                    {Object.keys(commonEmojis).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setEmojiCategory(cat)}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] transition-colors",
                          emojiCategory === cat ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-8 gap-0.5">
                    {(commonEmojis[emojiCategory as keyof typeof commonEmojis] || []).map(emoji => (
                      <button
                        key={emoji}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent transition-colors text-base"
                        onClick={() => { insertAtCursor(emoji); setShowEmojiPicker(false); }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Textarea
              ref={textareaRef}
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

          {/* Buttons section - always available */}
          <div className="space-y-3">
            {/* Added buttons list */}
            {(quickReplyButtons.length > 0 || ctaButtons.length > 0) && (
              <div className="rounded-lg border border-border/30 bg-card/40 p-3 space-y-2">
                {quickReplyButtons.map(btn => (
                  <div key={btn.id} className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[9px] h-5 shrink-0">Resposta</Badge>
                    <Input value={btn.text} onChange={(e) => updateQuickReply(btn.id, e.target.value)} placeholder="Texto do botão" className="h-7 text-xs flex-1 bg-background/30 border-border/20" maxLength={20} />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeQuickReply(btn.id)}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
                {ctaButtons.map(btn => (
                  <div key={btn.id} className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-[9px] h-5 shrink-0">{btn.type === "url" ? "URL" : "Ligar"}</Badge>
                    <Input value={btn.text} onChange={(e) => updateCTAButton(btn.id, "text", e.target.value)} placeholder="Texto" className="h-7 text-xs w-24 bg-background/30 border-border/20" maxLength={20} />
                    <Input value={btn.value} onChange={(e) => updateCTAButton(btn.id, "value", e.target.value)} placeholder={btn.type === "url" ? "https://..." : "+5511999999999"} className="h-7 text-xs flex-1 bg-background/30 border-border/20" />
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeCTAButton(btn.id)}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add button trigger */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 border-border/40 border-dashed w-full justify-center">
                  <Plus className="w-3.5 h-3.5" /> Adicionar Botão
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1.5 bg-popover border-border z-50" align="center">
                <button
                  className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-accent transition-colors flex items-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none"
                  onClick={addQuickReply}
                >
                  <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Resposta Rápida</p>
                    <p className="text-[10px] text-muted-foreground">{quickReplyButtons.length} adicionados · Botão de resposta simples</p>
                  </div>
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-accent transition-colors flex items-center gap-2.5"
                  onClick={() => addCTAButton("url")}
                >
                  <Link className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Link (URL)</p>
                    <p className="text-[10px] text-muted-foreground">{ctaButtons.filter(b => b.type === "url").length} adicionados · Abre um link no navegador</p>
                  </div>
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-accent transition-colors flex items-center gap-2.5"
                  onClick={() => addCTAButton("phone")}
                >
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Ligar (Telefone)</p>
                    <p className="text-[10px] text-muted-foreground">{ctaButtons.filter(b => b.type === "phone").length} adicionados · Inicia uma ligação</p>
                  </div>
                </button>
              </PopoverContent>
            </Popover>
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
                <div>
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
                        {paginatedContacts.map((contact, idx) => (
                          <tr key={contact.id} className="border-b border-border/10 hover:bg-muted/10 group">
                            <td className="px-2 py-1 text-muted-foreground/50">{contactPage * CONTACTS_PER_PAGE + idx + 1}</td>
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
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-2 px-1">
                      <span className="text-[10px] text-muted-foreground">
                        {contactPage * CONTACTS_PER_PAGE + 1}-{Math.min((contactPage + 1) * CONTACTS_PER_PAGE, contacts.length)} de {contacts.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" disabled={contactPage === 0} onClick={() => setContactPage(p => p - 1)}>Anterior</Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" disabled={contactPage >= totalPages - 1} onClick={() => setContactPage(p => p + 1)}>Próximo</Button>
                      </div>
                    </div>
                  )}
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

      {/* ===== STEP 3: Configuration (Instance + Delay) ===== */}
      {step === 3 && (
        <div className="space-y-6">
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

      {/* Import Progress Bar */}
      {importProgress !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-80 rounded-xl border border-border/40 bg-card p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Upload className="w-4 h-4 animate-pulse text-primary" />
              Processando arquivo...
            </div>
            <Progress value={importProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{importProgress}%</p>
          </div>
        </div>
      )}

      {/* Import Preview Dialog */}
      <Dialog open={!!previewContacts} onOpenChange={(open) => !open && setPreviewContacts(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Preview da Importação</DialogTitle>
          </DialogHeader>
          {previewContacts && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/30 bg-card/40 p-3 text-center">
                  <p className="text-lg font-semibold text-foreground">{previewContacts.length}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-card/40 p-3 text-center">
                  <p className="text-lg font-semibold text-foreground">{previewContacts.filter(c => /^\d{10,15}$/.test(c.numero)).length}</p>
                  <p className="text-[10px] text-muted-foreground">Válidos</p>
                </div>
                <div className="rounded-lg border border-border/30 bg-card/40 p-3 text-center">
                  <p className="text-lg font-semibold text-foreground">{new Set(previewContacts.map(c => c.numero)).size}</p>
                  <p className="text-[10px] text-muted-foreground">Únicos</p>
                </div>
              </div>

              {/* Sample rows */}
              <div className="flex-1 overflow-auto rounded-lg border border-border/20 bg-card/20">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-card/90 backdrop-blur-sm z-10">
                    <tr className="border-b border-border/20">
                      <th className="text-left px-2 py-1.5 text-muted-foreground font-medium w-8">#</th>
                      <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Nome</th>
                      <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Número</th>
                      <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Var 1</th>
                      <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Var 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewContacts.slice(0, 10).map((c, i) => (
                      <tr key={c.id} className="border-b border-border/10">
                        <td className="px-2 py-1 text-muted-foreground/50">{i + 1}</td>
                        <td className="px-2 py-1 text-foreground">{c.nome || "—"}</td>
                        <td className="px-2 py-1 font-mono text-foreground">{c.numero}</td>
                        <td className="px-2 py-1 text-muted-foreground">{c.var1 || "—"}</td>
                        <td className="px-2 py-1 text-muted-foreground">{c.var2 || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewContacts.length > 10 && (
                  <p className="text-[10px] text-muted-foreground text-center py-2">
                    ...e mais {previewContacts.length - 10} contatos
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setPreviewContacts(null)}>Cancelar</Button>
            <Button size="sm" className="text-xs gap-1.5" onClick={confirmPreviewImport}>
              <CheckCircle2 className="w-3 h-3" /> Confirmar importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Campaigns;
