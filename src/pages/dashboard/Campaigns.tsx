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
  CheckCircle2, XCircle, Copy, Eraser, Sparkles, Loader2, Check,
  ArrowRight, Lock, Timer, TrendingUp
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

// Auto-detect message type based on content
function detectMessageType(mediaUrl: string, hasButtons: boolean): string {
  if (mediaUrl && hasButtons) return "imagem-botao";
  if (mediaUrl) return "texto-imagem";
  if (hasButtons) return "texto-botao";
  return "texto";
}

// ─── Surface Card wrapper for layered dark theme ───
const SurfaceCard = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-2xl border border-border/50 bg-card shadow-sm",
      "dark:border-[hsl(220_10%_16%)] dark:bg-[hsl(220_13%_9%)] dark:shadow-lg dark:shadow-black/30",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

// ─── Section label ───
const SectionLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h3 className={cn("text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70", className)}>
    {children}
  </h3>
);

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
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaFileName, setMediaFileName] = useState("");
  const [previewMode, setPreviewMode] = useState<"sent" | "received">("sent");
  const [buttonAddedFlash, setButtonAddedFlash] = useState(false);

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

  // Auto-save draft
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
    setCampaignName(""); setMessage(""); setMediaUrl(""); setMediaFileName(""); setContacts([]);
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
  const hasButtons = quickReplyButtons.length > 0 || ctaButtons.length > 0;
  const computedMessageType = detectMessageType(mediaUrl, hasButtons);

  // Paginated contacts
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
    if (minDelay < 5) return { label: "Alto", color: "text-red-400", bg: "bg-red-500/10", borderColor: "border-red-500/20", percent: 90 };
    if (minDelay < 10) return { label: "Médio", color: "text-amber-400", bg: "bg-amber-500/10", borderColor: "border-amber-500/20", percent: 55 };
    return { label: "Baixo", color: "text-emerald-400", bg: "bg-emerald-500/10", borderColor: "border-emerald-500/20", percent: 20 };
  };
  const risk = getRiskLevel();

  // Estimated send time calculation
  const estimatedTime = useMemo(() => {
    const count = validContacts.length;
    if (count === 0) return null;
    const avgDelay = (minDelay + maxDelay) / 2;
    const avgPauseEvery = (pauseEveryMin + pauseEveryMax) / 2;
    const avgPauseDuration = (pauseDurationMin + pauseDurationMax) / 2;
    const numPauses = Math.floor(count / avgPauseEvery);
    const totalSeconds = (count * avgDelay) + (numPauses * avgPauseDuration);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `~${hours}h ${minutes}min`;
    return `~${minutes}min`;
  }, [validContacts.length, minDelay, maxDelay, pauseEveryMin, pauseEveryMax, pauseDurationMin, pauseDurationMax]);

  // Detected variables
  const detectedVars = useMemo(() => {
    const matches = message.match(/{{[^}]+}}/g);
    return matches ? [...new Set(matches)] : [];
  }, [message]);

  // Step completion status
  const getStepStatus = (num: number): "done" | "configured" | "incomplete" | "pending" => {
    if (step > num) {
      // Check if actually configured
      if (num === 1) return (message.trim() || mediaUrl) ? "done" : "incomplete";
      if (num === 2) return validContacts.length > 0 ? "done" : "incomplete";
      if (num === 3) return selectedDevices.length > 0 ? "done" : "incomplete";
      return "done";
    }
    if (step === num) return "configured";
    // Future steps
    if (num === 1) return (message.trim() || mediaUrl) ? "configured" : "pending";
    if (num === 2) return validContacts.length > 0 ? "configured" : "pending";
    if (num === 3) return selectedDevices.length > 0 ? "configured" : "pending";
    return "pending";
  };

  const statusLabels: Record<string, { text: string; color: string }> = {
    done: { text: "Completo", color: "text-emerald-400" },
    configured: { text: "Em edição", color: "text-primary" },
    incomplete: { text: "Incompleto", color: "text-amber-400" },
    pending: { text: "Pendente", color: "text-muted-foreground/40" },
  };

  // Handlers
  const handleSendCampaign = () => {
    if (!campaignName.trim()) { toast({ title: "Nome obrigatório", description: "Informe o nome da campanha.", variant: "destructive" }); return; }
    if (selectedDevices.length === 0) { toast({ title: "Instância obrigatória", description: "Selecione pelo menos uma instância.", variant: "destructive" }); return; }
    if (validContacts.length === 0) { toast({ title: "Sem contatos", description: "Adicione pelo menos um contato.", variant: "destructive" }); return; }
    if (!message.trim()) { toast({ title: "Mensagem vazia", description: "Escreva a mensagem.", variant: "destructive" }); return; }
    createCampaign.mutate({
      name: campaignName, message_type: computedMessageType, message_content: message,
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
        setCampaignName(""); setMessage(""); setMediaUrl(""); setMediaFileName(""); setContacts([]); setQuickReplyButtons([]); setCTAButtons([]); setStep(1); localStorage.removeItem(DRAFT_KEY);
      },
      onError: (err: any) => { toast({ title: "Erro ao criar campanha", description: err.message, variant: "destructive" }); },
    });
  };

  const triggerButtonFlash = () => {
    setButtonAddedFlash(true);
    setTimeout(() => setButtonAddedFlash(false), 600);
  };

  const addQuickReply = () => { if (quickReplyButtons.length < 3) { setQuickReplyButtons([...quickReplyButtons, { id: Date.now(), text: "" }]); triggerButtonFlash(); } };
  const addCTAButton = (type: "url" | "phone") => { if (ctaButtons.length < 2) { setCTAButtons([...ctaButtons, { id: Date.now(), type, text: "", value: "" }]); triggerButtonFlash(); } };
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

        if (numCol === -1) {
          for (let ci = 0; ci < (rows[hasHeader ? 1 : 0]?.length || 0); ci++) {
            const sample = String(rows[hasHeader ? 1 : 0]?.[ci] ?? "").replace(/\D/g, "");
            if (sample.length >= 8) { numCol = ci; break; }
          }
        }

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

        if (nameCol === -1) nameCol = numCol === 0 ? 1 : 0;

        setImportProgress(80);

        const imported: Contact[] = [];
        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const rawNum = String(row[numCol] ?? "").trim().replace(/\D/g, "");
          if (rawNum.length < 8) continue;
          const nome = String(row[nameCol] ?? "").trim();

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
    { num: 1, label: "Conteúdo", desc: "Mensagem & Mídia", icon: MessageSquare },
    { num: 2, label: "Público", desc: "Contatos & Destino", icon: Users },
    { num: 3, label: "Parâmetros", desc: "Controle de Envio", icon: Settings2 },
    { num: 4, label: "Lançamento", desc: "Revisão & Envio", icon: Send },
  ];

  // ─── WhatsApp Preview Component ───
  const WhatsAppPreview = () => {
    const hasContent = message || mediaUrl;
    const hasAnyButtons = quickReplyButtons.length > 0 || ctaButtons.length > 0;
    const bubbleMaxW = "max-w-[70%] sm:max-w-[75%]";
    const isSent = previewMode === "sent";

    return (
      <div className="rounded-[20px] overflow-hidden border-2 border-[hsl(210_10%_18%)] shadow-2xl shadow-black/40">
        {/* ── WhatsApp Header ── */}
        <div className="bg-[#202C33] px-4 py-3 flex items-center gap-3 border-b border-[#313D45]">
          <div className="w-9 h-9 rounded-full bg-[#6B7B8D]/30 flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-[#AEBAC1]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#E9EDEF] text-[14px] font-medium leading-tight">Destinatário</p>
            <p className="text-[#8696A0] text-[11px]">online</p>
          </div>
          {/* Sent/Received toggle */}
          <div className="flex items-center gap-0.5 bg-[#111B21] rounded-lg p-0.5">
            <button
              onClick={() => setPreviewMode("sent")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors duration-100",
                isSent ? "bg-[#005C4B] text-[#E9EDEF]" : "text-[#8696A0] hover:text-[#E9EDEF]"
              )}
            >
              Enviada
            </button>
            <button
              onClick={() => setPreviewMode("received")}
              className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors duration-100",
                !isSent ? "bg-[#202C33] text-[#E9EDEF] border border-[#313D45]" : "text-[#8696A0] hover:text-[#E9EDEF]"
              )}
            >
              Recebida
            </button>
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div
          className="p-4 min-h-[340px] flex flex-col justify-end"
          style={{
            backgroundColor: "#0B141A",
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M50 50v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm-30 0v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm30-30v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm-30 0v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          {/* ── Message Group ── */}
          <div
            className={cn("flex flex-col gap-[6px]", isSent ? "items-end" : "items-start")}
          >
            {/* ── Bubble ── */}
            <div className={cn(bubbleMaxW, "flex flex-col")}>
              {/* Media */}
              {mediaUrl && (
                <div className="rounded-t-[12px] overflow-hidden">
                  <img src={mediaUrl} alt="media" className="w-full max-h-52 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
              {/* Text bubble */}
              <div
                className={cn(
                  "px-[14px] py-[10px] shadow-md relative",
                  mediaUrl ? "rounded-b-[12px]" : "rounded-[12px]",
                  isSent ? "bg-[#005C4B]" : "bg-[#202C33]",
                )}
              >
                <p className="text-[14px] text-[#E9EDEF] whitespace-pre-wrap leading-[1.65] break-words">
                  {hasContent ? message : (
                    <span className="italic text-[#8696A0]/70">Sua mensagem aparecerá aqui…</span>
                  )}
                </p>
                {/* Meta */}
                <div className="flex items-center justify-end gap-1 mt-[4px]">
                  <span className="text-[11px] text-[#8696A0]/65 leading-none">12:00</span>
                  {isSent && <span className="text-[11px] text-[#53BDEB]/70 leading-none">✓✓</span>}
                </div>
              </div>
            </div>

            {/* ── Buttons Container: SEPARATE ── */}
              {hasAnyButtons && (
                <div className={cn(bubbleMaxW, "flex flex-col gap-[5px] w-full")}>
                  {quickReplyButtons.map((btn) => (
                    <button
                      key={btn.id}
                      className={cn(
                        "w-full rounded-[10px] px-3 py-[10px] text-center border shadow-sm",
                        "bg-[#1F2C34] hover:bg-[#26353E] active:bg-[#2A3942] border-[#313D45]/60 transition-colors duration-100",
                        buttonAddedFlash && "ring-1 ring-[#00A5F4]/30"
                      )}
                    >
                      <span className="text-[14px] text-[#00A5F4] font-medium">{btn.text || "Botão"}</span>
                    </button>
                  ))}
                  {ctaButtons.map((btn) => (
                    <button
                      key={btn.id}
                      className={cn(
                        "w-full rounded-[10px] px-3 py-[10px] flex items-center justify-center gap-2 border shadow-sm",
                        "bg-[#1F2C34] hover:bg-[#26353E] active:bg-[#2A3942] border-[#313D45]/60 transition-colors duration-100",
                        buttonAddedFlash && "ring-1 ring-[#00A5F4]/30"
                      )}
                    >
                      {btn.type === "url" ? <Link className="w-[14px] h-[14px] text-[#00A5F4]" /> : <Phone className="w-[14px] h-[14px] text-[#00A5F4]" />}
                      <span className="text-[14px] text-[#00A5F4] font-medium">{btn.text || "Botão"}</span>
                    </button>
                  ))}
                </div>
              )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full pb-16 max-w-6xl mx-auto">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight leading-tight">
            Configuração de Campanha
          </h1>
          <p className="text-sm text-muted-foreground/60 mt-1.5">Controle total sobre sua entrega e performance.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs gap-1.5 h-9 border-border/40 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:border-destructive/30 transition-colors duration-100"
          onClick={clearAllForm}
        >
          <Eraser className="w-3.5 h-3.5" /> Limpar tudo
        </Button>
      </div>

      {/* ═══ Stepper ═══ */}
      <div className="mb-12">
        <SurfaceCard className="p-2">
          <div className="flex items-stretch relative">
            {steps.map((s, i) => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              const Icon = s.icon;
              const status = getStepStatus(s.num);
              const statusInfo = statusLabels[status];
              return (
                <button
                  key={s.num}
                  onClick={() => setStep(s.num)}
                  className={cn(
                    "flex-1 flex items-center gap-3 px-4 py-4 rounded-xl relative group",
                    isActive && "bg-primary/8 dark:bg-primary/10",
                    !isActive && "hover:bg-muted/40 dark:hover:bg-muted/15",
                  )}
                >
                  {/* Step indicator */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                      isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/40",
                      isDone && "bg-emerald-500/15 text-emerald-400",
                      !isActive && !isDone && "bg-muted/40 dark:bg-muted/20 text-muted-foreground/40",
                    )}
                  >
                    {isDone ? <Check className="w-4.5 h-4.5" strokeWidth={3} /> : <Icon className="w-4.5 h-4.5" />}
                  </div>
                  {/* Labels */}
                  <div className="text-left min-w-0 hidden sm:block">
                    <p className={cn(
                      "text-[13px] font-semibold leading-tight transition-colors",
                      isActive ? "text-foreground" : isDone ? "text-foreground/60" : "text-muted-foreground/40"
                    )}>{s.label}</p>
                    <p className={cn(
                      "text-[11px] leading-tight mt-0.5 transition-colors",
                      isActive ? "text-muted-foreground/70" : "text-muted-foreground/30"
                    )}>{s.desc}</p>
                    {/* Micro status */}
                    <p className={cn("text-[9px] font-semibold uppercase tracking-wider mt-1", statusInfo.color)}>
                      {statusInfo.text}
                    </p>
                  </div>
                  {/* Connector */}
                  {i < steps.length - 1 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-8 bg-border/20 dark:bg-border/10" />
                  )}
                </button>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="mx-3 mt-1.5 mb-2.5">
            <div className="h-[3px] rounded-full bg-muted/20 dark:bg-muted/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
                  width: `${((step - 1) / (steps.length - 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* ═══ Step Content ═══ */}
      <div>
        {/* ===== STEP 1: Message ===== */}
        {step === 1 && (
          <div className="space-y-8">
            {/* Template + Campaign Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <SurfaceCard className="p-5 space-y-3">
                <SectionLabel>Modelo Base</SectionLabel>
                <Select value={selectedTemplate} onValueChange={(val) => {
                  setSelectedTemplate(val);
                  if (val !== "nova") {
                    const tmpl = savedTemplates.find(t => t.id === val);
                    if (tmpl) {
                      setMessage(tmpl.content);
                      if (tmpl.media_url) setMediaUrl(tmpl.media_url); else setMediaUrl("");
                      if (tmpl.buttons && Array.isArray(tmpl.buttons)) {
                        setQuickReplyButtons(tmpl.buttons.filter((b: any) => b.type === "reply").map((b: any, i: number) => ({ id: Date.now() + i, text: b.text || "" })));
                        setCTAButtons(tmpl.buttons.filter((b: any) => b.type === "url" || b.type === "phone").map((b: any, i: number) => ({ id: Date.now() + 100 + i, type: b.type, text: b.text || "", value: b.value || "" })));
                      } else { setQuickReplyButtons([]); setCTAButtons([]); }
                    }
                  } else { setMessage(""); setMediaUrl(""); setQuickReplyButtons([]); setCTAButtons([]); }
                }}>
                  <SelectTrigger className="h-11 text-sm font-medium bg-background/50 dark:bg-muted/20 border-border/30 hover:border-primary/40 transition-colors">
                    <SelectValue placeholder="Campanha Padrão" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    <SelectItem value="nova">Campanha Padrão</SelectItem>
                    {savedTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SurfaceCard>

              <SurfaceCard className="p-5 space-y-3">
                <SectionLabel>Mídia</SectionLabel>
                {!mediaUrl ? (
                  <>
                    <input type="file" ref={mediaFileRef} accept="image/*,video/*,audio/*,.pdf,.doc,.docx" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 20 * 1024 * 1024) { toast({ title: "Arquivo muito grande", description: "Máximo 20MB.", variant: "destructive" }); return; }
                        setMediaUploading(true);
                        try {
                          const ext = file.name.split(".").pop() || "bin";
                          const path = `campaigns/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                          const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
                          if (uploadError) throw uploadError;
                          const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
                          setMediaUrl(urlData.publicUrl);
                          setMediaFileName(file.name);
                          toast({ title: "Mídia enviada!" });
                        } catch (err: any) { toast({ title: "Erro no upload", description: err.message, variant: "destructive" }); }
                        finally { setMediaUploading(false); if (mediaFileRef.current) mediaFileRef.current.value = ""; }
                      }}
                    />
                    <button
                      onClick={() => mediaFileRef.current?.click()}
                      disabled={mediaUploading}
                      className="w-full py-6 rounded-xl border-2 border-dashed border-border/30 dark:border-border/15 hover:border-primary/40 bg-muted/5 dark:bg-muted/3 flex flex-col items-center justify-center gap-2 transition-colors duration-100 hover:bg-primary/5 group"
                    >
                      {mediaUploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <ImageIcon className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />}
                      <span className="text-[11px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">{mediaUploading ? "Enviando..." : "Imagem, vídeo ou documento"}</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/15 dark:bg-muted/8 border border-border/15">
                    <img src={mediaUrl} alt="preview" className="w-14 h-14 rounded-lg object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{mediaFileName || "Mídia"}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">Anexado</p>
                    </div>
                    <button onClick={() => { setMediaUrl(""); setMediaFileName(""); }} className="text-muted-foreground/30 hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </SurfaceCard>
            </div>

            {/* Editor + Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Editor column */}
              <div className="lg:col-span-3 space-y-6">
                {/* Message editor */}
                <SurfaceCard className="p-5 space-y-4">
                  <SectionLabel>Mensagem</SectionLabel>
                  
                  {/* Toolbar */}
                  <div className="flex items-center gap-0.5 flex-wrap p-1.5 rounded-xl bg-muted/15 dark:bg-muted/8 border border-border/10">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium rounded-lg">
                          <FileText className="w-3.5 h-3.5" /> Variável
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

                    <div className="h-5 w-px bg-border/20 mx-0.5" />
                    {[
                      { icon: Bold, label: "Negrito", wrap: ["*", "*"] },
                      { icon: Italic, label: "Itálico", wrap: ["_", "_"] },
                      { icon: Strikethrough, label: "Tachado", wrap: ["~", "~"] },
                      { icon: Code, label: "Código", wrap: ["```", "```"] },
                    ].map(({ icon: Icon, label, wrap }) => (
                      <Button key={label} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-foreground hover:bg-background/60 rounded-lg transition-colors" title={label}
                        onClick={() => wrapSelectedText(wrap[0], wrap[1])}>
                        <Icon className="w-3.5 h-3.5" />
                      </Button>
                    ))}
                    <div className="h-5 w-px bg-border/20 mx-0.5" />

                    <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-foreground hover:bg-background/60 rounded-lg" title="Emoji">
                          <Smile className="w-3.5 h-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-2 bg-popover border-border z-50" align="start">
                        <div className="flex items-center gap-0.5 mb-2 border-b border-border/20 pb-1.5">
                          {Object.keys(commonEmojis).map(cat => (
                            <button key={cat} onClick={() => setEmojiCategory(cat)}
                              className={cn("px-2 py-1 rounded text-[10px] transition-colors",
                                emojiCategory === cat ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
                              )}>{cat}</button>
                          ))}
                        </div>
                        <div className="grid grid-cols-8 gap-0.5">
                          {(commonEmojis[emojiCategory as keyof typeof commonEmojis] || []).map(emoji => (
                            <button key={emoji} className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent transition-colors text-base"
                              onClick={() => { insertAtCursor(emoji); setShowEmojiPicker(false); }}>{emoji}</button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Olá, {{nome}}.\n\nEscreva sua mensagem aqui..."
                    rows={10}
                    className="text-sm leading-[1.8] bg-muted/8 dark:bg-muted/4 border-border/15 resize-none focus-visible:ring-1 focus-visible:ring-primary/30 px-4 py-3 text-foreground/90 placeholder:text-muted-foreground/30 rounded-xl"
                  />

                  {/* Detected variables */}
                  {detectedVars.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground/50 font-medium">Variáveis:</span>
                      {detectedVars.map(v => (
                        <span key={v} className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 dark:bg-primary/15 text-primary text-[10px] font-mono font-medium border border-primary/20">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </SurfaceCard>

                {/* ── Botões Interativos ── */}
                <SurfaceCard className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Botões Interativos</SectionLabel>
                    {(quickReplyButtons.length > 0 || ctaButtons.length > 0) && (
                      <Badge variant="secondary" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20">
                        {quickReplyButtons.length + ctaButtons.length} ativo(s)
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    {quickReplyButtons.map(btn => (
                      <div
                        key={btn.id}
                        className="rounded-xl border border-border/30 dark:border-border/15 bg-muted/15 dark:bg-muted/8 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                              <MousePointerClick className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="text-[11px] font-semibold text-foreground/70">Resposta Rápida</span>
                          </div>
                          <button className="text-muted-foreground/30 hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10" onClick={() => removeQuickReply(btn.id)}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <Input value={btn.text} onChange={(e) => updateQuickReply(btn.id, e.target.value)} placeholder="Texto exibido no botão" 
                          className="h-10 text-sm bg-background/50 dark:bg-background/20 border-border/15 font-medium" maxLength={20} />
                      </div>
                    ))}

                    {ctaButtons.map(btn => (
                      <div
                        key={btn.id}
                        className="rounded-xl border border-border/30 dark:border-border/15 bg-muted/15 dark:bg-muted/8 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                              {btn.type === "url" ? <Link className="w-3.5 h-3.5 text-primary" /> : <Phone className="w-3.5 h-3.5 text-primary" />}
                            </div>
                            <span className="text-[11px] font-semibold text-foreground/70">{btn.type === "url" ? "Link (URL)" : "Ligar (Telefone)"}</span>
                          </div>
                          <button className="text-muted-foreground/30 hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10" onClick={() => removeCTAButton(btn.id)}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input value={btn.text} onChange={(e) => updateCTAButton(btn.id, "text", e.target.value)} placeholder="Texto exibido" 
                            className="h-10 text-sm bg-background/50 dark:bg-background/20 border-border/15 font-medium" maxLength={20} />
                          <Input value={btn.value} onChange={(e) => updateCTAButton(btn.id, "value", e.target.value)} placeholder={btn.type === "url" ? "https://..." : "+5511999999999"} 
                            className="h-10 text-sm bg-background/50 dark:bg-background/20 border-border/15 font-mono" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full h-11 gap-2 border-dashed border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors duration-100 text-xs font-medium">
                        <Plus className="w-4 h-4" /> Adicionar Botão
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-1.5 bg-popover border-border z-50" align="center">
                      <button className="w-full text-left px-3 py-2.5 text-xs rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5" onClick={addQuickReply}>
                        <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">Resposta Rápida</p>
                          <p className="text-[10px] text-muted-foreground">Botão de resposta simples</p>
                        </div>
                      </button>
                      <button className="w-full text-left px-3 py-2.5 text-xs rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5" onClick={() => addCTAButton("url")}>
                        <Link className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">Link (URL)</p>
                          <p className="text-[10px] text-muted-foreground">Abre um link no navegador</p>
                        </div>
                      </button>
                      <button className="w-full text-left px-3 py-2.5 text-xs rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5" onClick={() => addCTAButton("phone")}>
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">Ligar (Telefone)</p>
                          <p className="text-[10px] text-muted-foreground">Inicia uma ligação</p>
                        </div>
                      </button>
                    </PopoverContent>
                  </Popover>
                </SurfaceCard>
              </div>

              {/* Preview column */}
              <div className="lg:col-span-2 space-y-4">
                <SectionLabel className="px-1">Preview WhatsApp</SectionLabel>
                <div className="sticky top-4">
                  <WhatsAppPreview />
                  {/* Deliverability tip */}
                  <div className="mt-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/6 border border-amber-500/12">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400/80 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-amber-400/70 leading-relaxed">Evite repetições excessivas e links suspeitos para melhorar a entregabilidade.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Primary action */}
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} className="gap-2.5 h-12 px-10 text-sm font-bold tracking-wide shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow duration-100">
                CONTINUAR <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP 2: Contacts ===== */}
        {step === 2 && (
          <div className="space-y-8">
            {/* Metrics - enhanced hierarchy */}
            <div className="grid grid-cols-3 gap-5">
              {[
                { label: "Contatos Carregados", value: validContacts.length, icon: Users, color: "text-primary", bgIcon: "bg-primary/10", isMain: true },
                { label: "Números Inválidos", value: invalidContacts.length, icon: XCircle, color: invalidContacts.length > 0 ? "text-amber-400" : "text-muted-foreground/40", bgIcon: invalidContacts.length > 0 ? "bg-amber-500/10" : "bg-muted/20", isMain: false },
                { label: "Duplicados", value: duplicateCount, icon: Copy, color: duplicateCount > 0 ? "text-amber-400" : "text-muted-foreground/40", bgIcon: duplicateCount > 0 ? "bg-amber-500/10" : "bg-muted/20", isMain: false },
              ].map(m => (
                <SurfaceCard key={m.label} className={cn("p-5", m.isMain && "ring-1 ring-primary/15")}>
                  <div className="flex items-center gap-3.5">
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", m.bgIcon)}>
                      <m.icon className={cn("w-5 h-5", m.color)} />
                    </div>
                    <div>
                      <p className={cn("text-2xl font-bold tabular-nums leading-none", m.color)}>{m.value}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1.5 font-medium uppercase tracking-wider">{m.label}</p>
                    </div>
                  </div>
                </SurfaceCard>
              ))}
            </div>

            {/* Import area */}
            <SurfaceCard className="p-6 space-y-5">
              <SectionLabel>Importar Contatos</SectionLabel>
              <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
              
              {validContacts.length === 0 ? (
                /* Enhanced empty state */
                <div className="py-12 flex flex-col items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/8 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-center max-w-sm">
                    <p className="text-base font-semibold text-foreground">Importe sua lista de contatos</p>
                    <p className="text-sm text-muted-foreground/60 mt-2 leading-relaxed">Arraste uma planilha ou use os botões abaixo. Detectamos automaticamente colunas de nome e número.</p>
                  </div>
                  <Button 
                    onClick={() => fileRef.current?.click()} 
                    className="gap-2.5 h-12 px-8 text-sm font-bold shadow-lg shadow-primary/25"
                  >
                    <Upload className="w-4 h-4" /> Importar Planilha
                  </Button>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="text-xs h-9 border-border/30 gap-1.5 hover:bg-primary/5 hover:border-primary/30" onClick={() => setImportFromContacts(true)}>
                      <Users className="w-3.5 h-3.5" /> Base de Contatos
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-9 border-border/30 gap-1.5 hover:bg-primary/5 hover:border-primary/30" onClick={addContact}>
                      <Plus className="w-3.5 h-3.5" /> Manual
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-9 border-border/30 gap-1.5 hover:bg-primary/5 hover:border-primary/30" onClick={handleDownloadSample}>
                      <Download className="w-3.5 h-3.5" /> Modelo
                    </Button>
                  </div>
                </div>
              ) : (
                /* Existing contacts loaded - compact import area */
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full py-6 rounded-xl border-2 border-dashed border-border/30 dark:border-border/15 hover:border-primary/40 bg-muted/5 dark:bg-muted/3 flex flex-col items-center justify-center gap-2.5 transition-colors duration-100 hover:bg-primary/5 group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 dark:bg-primary/8 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors">Arraste ou clique para importar</p>
                      <p className="text-[11px] text-muted-foreground/40 mt-1">.xlsx, .xls, .csv — Detecção inteligente</p>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-9 border-border/30 gap-1.5 hover:bg-primary/5 hover:border-primary/30" onClick={() => setImportFromContacts(true)}>
                      <Users className="w-3.5 h-3.5" /> Base de Contatos
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-9 border-border/30 gap-1.5 hover:bg-primary/5 hover:border-primary/30" onClick={addContact}>
                      <Plus className="w-3.5 h-3.5" /> Adicionar Manual
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-9 border-border/30 gap-1.5 hover:bg-primary/5 hover:border-primary/30" onClick={handleDownloadSample}>
                      <Download className="w-3.5 h-3.5" /> Modelo
                    </Button>
                    {contacts.length > 0 && (
                      <Popover open={showContactTools} onOpenChange={setShowContactTools}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-xs h-9 text-muted-foreground gap-1.5 ml-auto">
                            <Settings2 className="w-3.5 h-3.5" /> Ferramentas
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1 bg-popover border-border z-50" align="end">
                          <button className="w-full text-left px-2.5 py-2 text-xs rounded hover:bg-accent transition-colors flex items-center gap-2" onClick={() => { removeDuplicates(); setShowContactTools(false); }}>
                            <Copy className="w-3.5 h-3.5" /> Remover duplicados
                          </button>
                          <button className="w-full text-left px-2.5 py-2 text-xs rounded hover:bg-accent transition-colors flex items-center gap-2" onClick={() => { removeInvalid(); setShowContactTools(false); }}>
                            <XCircle className="w-3.5 h-3.5" /> Limpar inválidos
                          </button>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </>
              )}
            </SurfaceCard>

            {/* ── Import from saved contacts dialog ── */}
            <Dialog open={importFromContacts} onOpenChange={setImportFromContacts}>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Importar da Base</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {allTags.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Filtrar por tags</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {allTags.map(tag => (
                          <button key={tag} onClick={() => setSelectedContactTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                            className={cn("px-2.5 py-1 rounded-full text-[11px] border transition-colors",
                              selectedContactTags.includes(tag)
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-muted/30 text-muted-foreground border-border/30 hover:border-primary/20"
                            )}>{tag}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{savedContacts.length} contatos disponíveis</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setImportFromContacts(false)} size="sm">Cancelar</Button>
                  <Button onClick={handleImportFromDB} size="sm" className="font-semibold">Importar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Contact table */}
            {showContactTable && contacts.length > 0 && (
              <SurfaceCard className="p-0 overflow-hidden">
                <div className="overflow-auto max-h-96 rounded-xl">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-card dark:bg-[hsl(220_13%_10%)] z-10">
                      <tr className="border-b border-border/15">
                        <th className="text-left px-3 py-3 text-muted-foreground/60 font-semibold w-8">#</th>
                        <th className="text-left px-3 py-3 text-muted-foreground/60 font-semibold">Nome</th>
                        <th className="text-left px-3 py-3 text-muted-foreground/60 font-semibold">Número</th>
                        <th className="text-left px-3 py-3 text-muted-foreground/60 font-semibold w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedContacts.map((c, i) => (
                        <tr key={c.id} className="border-b border-border/8 hover:bg-muted/8">
                          <td className="px-3 py-2 text-muted-foreground/30 tabular-nums">{contactPage * CONTACTS_PER_PAGE + i + 1}</td>
                          <td className="px-3 py-2">
                            <Input value={c.nome} onChange={(e) => updateContact(c.id, "nome", e.target.value)} className="h-7 text-[11px] bg-transparent border-none p-0" placeholder="Nome" />
                          </td>
                          <td className="px-3 py-2">
                            <Input value={c.numero} onChange={(e) => updateContact(c.id, "numero", e.target.value)} className="h-7 text-[11px] bg-transparent border-none p-0 font-mono" placeholder="Número" />
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={() => removeContact(c.id)} className="text-muted-foreground/20 hover:text-destructive transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/10 bg-muted/5">
                    <span className="text-[10px] text-muted-foreground/40">{contacts.length} contatos</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" disabled={contactPage === 0} onClick={() => setContactPage(p => p - 1)} className="h-7 text-[10px]">Anterior</Button>
                      <span className="text-[10px] text-muted-foreground/50 px-2 flex items-center">{contactPage + 1}/{totalPages}</span>
                      <Button variant="ghost" size="sm" disabled={contactPage >= totalPages - 1} onClick={() => setContactPage(p => p + 1)} className="h-7 text-[10px]">Próximo</Button>
                    </div>
                  </div>
                )}
              </SurfaceCard>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-sm text-muted-foreground h-10 px-4">← Voltar</Button>
              <Button onClick={() => setStep(3)} className="gap-2 h-12 px-8 text-sm font-bold tracking-wide shadow-lg shadow-primary/25">
                CONTINUAR <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP 3: Configuration ===== */}
        {step === 3 && (
          <div className="space-y-8">
            {/* Instance Selection */}
            <SurfaceCard className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <SectionLabel className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> Instância de Envio
                </SectionLabel>
                {selectedDevices.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    {selectedDevices.length} selecionada(s)
                  </Badge>
                )}
              </div>

              {devices.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted/20 dark:bg-muted/10 flex items-center justify-center">
                    <WifiOff className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhuma instância conectada</p>
                  <Button variant="outline" size="sm" className="text-xs h-9 border-border/30">Conectar agora</Button>
                </div>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-11 w-full justify-between text-sm bg-muted/15 dark:bg-muted/8 border-border/25 hover:border-primary/40 font-normal">
                      <span className="truncate">
                        {selectedDevices.length === 0 ? "Selecionar instância(s)" : selectedDevices.length === devices.length ? "Todas selecionadas" : selectedDevicesData.map(d => d.name).join(", ")}
                      </span>
                      <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2 space-y-1" align="start">
                    <button onClick={() => { if (selectedDevices.length === devices.length) setSelectedDevices([]); else setSelectedDevices(devices.map(d => d.id)); }}
                      className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-accent", selectedDevices.length === devices.length && "bg-accent")}>
                      <Checkbox checked={selectedDevices.length === devices.length} className="h-4 w-4" />
                      <span className="font-medium">Selecionar todas</span>
                      <Badge variant="secondary" className="text-[9px] h-4 ml-auto">{devices.length}</Badge>
                    </button>
                    <div className="h-px bg-border/20 my-1" />
                    {devices.map(d => {
                      const s = getDeviceStatus(d.status);
                      const isSelected = selectedDevices.includes(d.id);
                      return (
                        <button key={d.id} onClick={() => setSelectedDevices(prev => isSelected ? prev.filter(id => id !== d.id) : [...prev, d.id])}
                          className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-accent", isSelected && "bg-accent/60")}>
                          <Checkbox checked={isSelected} className="h-4 w-4" />
                          <div className={cn("w-2 h-2 rounded-full shrink-0", d.status === "Ready" ? "bg-emerald-400" : d.status === "QR" ? "bg-amber-400" : "bg-red-400")} />
                          <span className="truncate">{d.name}</span>
                          <span className={cn("text-[10px] ml-auto shrink-0", s.color)}>{s.label}</span>
                        </button>
                      );
                    })}
                  </PopoverContent>
                </Popover>
              )}

              {/* Instance card */}
              {selectedDeviceData && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/15 dark:bg-muted/8 border border-border/10">
                  {selectedDeviceData.profile_picture ? (
                    <img src={selectedDeviceData.profile_picture} alt={selectedDeviceData.name} className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{selectedDeviceData.number || selectedDeviceData.name}</p>
                    <p className="text-[11px] text-muted-foreground/60">{selectedDeviceData.name}</p>
                  </div>
                  {(() => {
                    const s = getDeviceStatus(selectedDeviceData.status);
                    const StatusIcon = s.icon;
                    return (
                      <div className="flex items-center gap-1.5 text-xs shrink-0">
                        <StatusIcon className={cn("w-3.5 h-3.5", s.color)} />
                        <span className={s.color}>{s.label}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </SurfaceCard>

            {/* Send Control Cards - improved typography */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Delay */}
              <SurfaceCard className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Clock className="w-4.5 h-4.5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">Intervalo</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">Entre cada mensagem</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Slider value={[minDelay, maxDelay]} min={1} max={60} step={1}
                    onValueChange={([a, b]) => { setMinDelay(a); setMaxDelay(b); }} className="py-1" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Mín (s)</label>
                      <Input type="number" value={minDelay} onChange={(e) => { const v = Number(e.target.value); setMinDelay(v); if (v > maxDelay) setMaxDelay(v); }} className="h-9 text-xs bg-muted/15 dark:bg-muted/8 border-border/15 tabular-nums" min={1} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Máx (s)</label>
                      <Input type="number" value={maxDelay} onChange={(e) => { const v = Math.max(Number(e.target.value), minDelay); setMaxDelay(v); }} className="h-9 text-xs bg-muted/15 dark:bg-muted/8 border-border/15 tabular-nums" min={minDelay} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 tabular-nums">{minDelay}s – {maxDelay}s a cada envio</p>
                </div>
              </SurfaceCard>

              {/* Pause every X */}
              <SurfaceCard className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Zap className="w-4.5 h-4.5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">Pausa</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">A cada X mensagens</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Slider value={[pauseEveryMin, pauseEveryMax]} min={1} max={50} step={1}
                    onValueChange={([a, b]) => { setPauseEveryMin(a); setPauseEveryMax(b); }} className="py-1" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Mín</label>
                      <Input type="number" value={pauseEveryMin} onChange={(e) => { const v = Number(e.target.value); setPauseEveryMin(v); if (v > pauseEveryMax) setPauseEveryMax(v); }} className="h-9 text-xs bg-muted/15 dark:bg-muted/8 border-border/15 tabular-nums" min={1} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Máx</label>
                      <Input type="number" value={pauseEveryMax} onChange={(e) => { const v = Math.max(Number(e.target.value), pauseEveryMin); setPauseEveryMax(v); }} className="h-9 text-xs bg-muted/15 dark:bg-muted/8 border-border/15 tabular-nums" min={pauseEveryMin} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 tabular-nums">A cada {pauseEveryMin}–{pauseEveryMax} msgs</p>
                </div>
              </SurfaceCard>

              {/* Pause duration */}
              <SurfaceCard className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Activity className="w-4.5 h-4.5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">Duração</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">Tempo da pausa</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <Slider value={[pauseDurationMin, pauseDurationMax]} min={1} max={300} step={5}
                    onValueChange={([a, b]) => { setPauseDurationMin(a); setPauseDurationMax(b); }} className="py-1" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Mín (s)</label>
                      <Input type="number" value={pauseDurationMin} onChange={(e) => { const v = Number(e.target.value); setPauseDurationMin(v); if (v > pauseDurationMax) setPauseDurationMax(v); }} className="h-9 text-xs bg-muted/15 dark:bg-muted/8 border-border/15 tabular-nums" min={1} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Máx (s)</label>
                      <Input type="number" value={pauseDurationMax} onChange={(e) => { const v = Math.max(Number(e.target.value), pauseDurationMin); setPauseDurationMax(v); }} className="h-9 text-xs bg-muted/15 dark:bg-muted/8 border-border/15 tabular-nums" min={pauseDurationMin} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 tabular-nums">{pauseDurationMin}s – {pauseDurationMax}s de pausa</p>
                </div>
              </SurfaceCard>
            </div>

            {/* Risk indicator - visual bar */}
            <SurfaceCard className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", risk.bg)}>
                    <Shield className={cn("w-4.5 h-4.5", risk.color)} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">Nível de Risco</p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {risk.label === "Baixo" ? "Configuração segura para envio em massa." : risk.label === "Médio" ? "Intervalos curtos podem gerar bloqueios." : "Alto risco de bloqueio. Aumente os intervalos."}
                    </p>
                  </div>
                </div>
                <span className={cn("text-lg font-bold", risk.color)}>{risk.label}</span>
              </div>
              {/* Visual risk bar */}
              <div className="relative h-3 rounded-full overflow-hidden bg-muted/15 dark:bg-muted/8">
                <div className="absolute inset-0 flex">
                  <div className="flex-1 bg-emerald-500/20" />
                  <div className="flex-1 bg-amber-500/20" />
                  <div className="flex-1 bg-red-500/20" />
                </div>
                <div
                  className="absolute top-0 h-full w-2 rounded-full shadow-lg"
                  style={{
                    background: risk.label === "Baixo" ? "#34D399" : risk.label === "Médio" ? "#FBBF24" : "#F87171",
                    boxShadow: `0 0 8px ${risk.label === "Baixo" ? "#34D39960" : risk.label === "Médio" ? "#FBBF2460" : "#F8717160"}`,
                    left: `${risk.percent}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] uppercase tracking-wider font-semibold">
                <span className="text-emerald-400/60">Seguro</span>
                <span className="text-amber-400/60">Moderado</span>
                <span className="text-red-400/60">Arriscado</span>
              </div>

              {/* Estimated send time */}
              {estimatedTime && (
                <div className="flex items-center gap-2.5 pt-2 border-t border-border/10">
                  <Timer className="w-4 h-4 text-muted-foreground/40" />
                  <div>
                    <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">Tempo estimado de envio</p>
                    <p className="text-sm font-bold text-foreground tabular-nums">{estimatedTime} <span className="text-muted-foreground/50 font-normal text-[11px]">para {validContacts.length} contatos</span></p>
                  </div>
                </div>
              )}
            </SurfaceCard>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-sm text-muted-foreground h-10 px-4">← Voltar</Button>
              <Button onClick={() => setStep(4)} className="gap-2 h-12 px-8 text-sm font-bold tracking-wide shadow-lg shadow-primary/25">
                CONTINUAR <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ===== STEP 4: Review & Launch ===== */}
        {step === 4 && (
          <div className="space-y-8">
            {/* Campaign name */}
            <SurfaceCard className="p-6 space-y-3">
              <SectionLabel>Nome da Campanha</SectionLabel>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Ex: Black Friday 2025" 
                className="h-13 text-base font-semibold bg-muted/15 dark:bg-muted/8 border-border/15 focus-visible:ring-primary/30 px-4" />
            </SurfaceCard>

            {/* Schedule */}
            <SurfaceCard className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">Agendar envio</p>
                    <p className="text-[11px] text-muted-foreground/50">Definir data e hora de início</p>
                  </div>
                </div>
                <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
              </div>
              {scheduleEnabled && (
                <div className="mt-4 pl-[52px]">
                  <Input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="h-10 text-sm bg-muted/15 dark:bg-muted/8 border-border/15 max-w-xs" />
                </div>
              )}
            </SurfaceCard>

            {/* Review panel */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Technical summary - improved organization */}
              <SurfaceCard className="lg:col-span-3 p-6 space-y-6">
                <div className="flex items-center gap-2.5">
                  <Eye className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Resumo Técnico</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Instância(s)", value: selectedDevicesData.length > 0 ? selectedDevicesData.map(d => d.name).join(", ") : "—", icon: Smartphone },
                    { label: "Contatos", value: String(validContacts.length), icon: Users },
                    { label: "Intervalo", value: `${minDelay}s – ${maxDelay}s`, icon: Clock },
                    { label: "Pausa", value: `${pauseEveryMin}–${pauseEveryMax} msgs`, icon: Zap },
                    { label: "Duração Pausa", value: `${pauseDurationMin}s – ${pauseDurationMax}s`, icon: Activity },
                    { label: "Risco", value: risk.label, icon: Shield, valueClass: risk.color },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/10 dark:bg-muted/5 border border-border/8">
                      <div className="w-8 h-8 rounded-lg bg-muted/20 dark:bg-muted/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="w-3.5 h-3.5 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/40 font-semibold">{item.label}</p>
                        <p className={cn("text-[13px] font-bold text-foreground mt-0.5 leading-tight", (item as any).valueClass)}>{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Estimated time in review */}
                {estimatedTime && (
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/10">
                    <Timer className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/40 font-semibold">Tempo estimado</p>
                      <p className="text-[13px] font-bold text-foreground">{estimatedTime}</p>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {(!campaignName || selectedDevices.length === 0 || validContacts.length === 0 || !message) && (
                  <div className="flex items-center gap-3 text-sm text-destructive bg-destructive/5 border border-destructive/10 rounded-xl px-4 py-3">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-[12px]">
                      {!campaignName && "Nome ausente. "}
                      {selectedDevices.length === 0 && "Sem instância. "}
                      {validContacts.length === 0 && "Sem contatos. "}
                      {!message && "Mensagem vazia."}
                    </span>
                  </div>
                )}
              </SurfaceCard>

              {/* Message preview */}
              <div className="lg:col-span-2 space-y-3">
                <SectionLabel className="px-1">Preview</SectionLabel>
                <WhatsAppPreview />
              </div>
            </div>

            {/* Action buttons - dominant launch */}
            <div className="flex flex-col items-center gap-4 pt-6">
              <div className="flex items-center w-full justify-between">
                <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="text-sm text-muted-foreground h-10 px-4">← Voltar</Button>
                <div>
                  <Button
                    className="gap-3 h-16 px-16 text-base font-bold tracking-[0.1em] uppercase shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-shadow duration-100 relative overflow-hidden"
                    onClick={handleSendCampaign}
                    disabled={createCampaign.isPending || startCampaign.isPending || !campaignName || selectedDevices.length === 0 || validContacts.length === 0 || !message}
                  >
                    <Send className="w-5 h-5" />
                    {startCampaign.isPending ? "ENVIANDO..." : createCampaign.isPending ? "SALVANDO..." : "INICIAR CAMPANHA"}
                  </Button>
                </div>
              </div>
              {/* Security text */}
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground/40">
                <Lock className="w-3 h-3" />
                <span>Seus dados estão seguros. O envio pode ser cancelado a qualquer momento.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Import Progress Bar */}
      {importProgress !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <SurfaceCard className="w-80 p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <Upload className="w-4 h-4 animate-pulse text-primary" />
              Processando arquivo...
            </div>
            <Progress value={importProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center tabular-nums">{importProgress}%</p>
          </SurfaceCard>
        </div>
      )}

      {/* Import Preview Dialog */}
      <Dialog open={!!previewContacts} onOpenChange={(open) => !open && setPreviewContacts(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Preview da Importação</DialogTitle>
          </DialogHeader>
          {previewContacts && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total", value: previewContacts.length },
                  { label: "Válidos", value: previewContacts.filter(c => /^\d{10,15}$/.test(c.numero)).length },
                  { label: "Únicos", value: new Set(previewContacts.map(c => c.numero)).size },
                ].map(s => (
                  <SurfaceCard key={s.label} className="p-4 text-center">
                    <p className="text-xl font-bold text-foreground tabular-nums">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                  </SurfaceCard>
                ))}
              </div>

              <div className="flex-1 overflow-auto rounded-xl border border-border/15 bg-muted/8 dark:bg-muted/4">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-card dark:bg-[hsl(220_13%_10%)] z-10">
                    <tr className="border-b border-border/15">
                      <th className="text-left px-3 py-2.5 text-muted-foreground font-semibold w-8">#</th>
                      <th className="text-left px-3 py-2.5 text-muted-foreground font-semibold">Nome</th>
                      <th className="text-left px-3 py-2.5 text-muted-foreground font-semibold">Número</th>
                      <th className="text-left px-3 py-2.5 text-muted-foreground font-semibold">Var 1</th>
                      <th className="text-left px-3 py-2.5 text-muted-foreground font-semibold">Var 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewContacts.slice(0, 10).map((c, i) => (
                      <tr key={c.id} className="border-b border-border/8">
                        <td className="px-3 py-2 text-muted-foreground/40 tabular-nums">{i + 1}</td>
                        <td className="px-3 py-2 text-foreground">{c.nome || "—"}</td>
                        <td className="px-3 py-2 font-mono text-foreground">{c.numero}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.var1 || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.var2 || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewContacts.length > 10 && (
                  <p className="text-[11px] text-muted-foreground text-center py-3">
                    ...e mais {previewContacts.length - 10} contatos
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewContacts(null)} className="h-10">Cancelar</Button>
                <Button onClick={confirmPreviewImport} className="h-10 px-6 font-semibold gap-1.5">
                  <Check className="w-4 h-4" /> Confirmar Importação
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Campaigns;
