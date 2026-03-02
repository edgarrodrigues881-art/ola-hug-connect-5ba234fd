import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Phone, Type, ImageIcon, Flame, ShieldAlert, Activity,
  Zap, Clock, Hash, Wifi, WifiOff, RefreshCw, Settings2, Calendar,
  CheckCircle2, XCircle, Copy, Eraser, Sparkles, Loader2, Check,
  ArrowRight, Lock, Timer, TrendingUp, ArrowUp, ArrowDown, Pencil
} from "lucide-react";
import { useCreateCampaign, useStartCampaign } from "@/hooks/useCampaigns";
import { useTemplates } from "@/hooks/useTemplates";
import { useContacts } from "@/hooks/useContacts";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import * as XLSX from "xlsx";
import { useAutoSyncDevices } from "@/hooks/useAutoSyncDevices";


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
  var8: string;
  var9: string;
  var10: string;
}

type ColumnMapping = "nome" | "numero" | "var1" | "var2" | "var3" | "var4" | "var5" | "var6" | "var7" | "var8" | "var9" | "var10" | "ignorar";

interface RawImportData {
  headers: string[];
  rows: any[][];
  hasHeader: boolean;
  columnMappings: ColumnMapping[];
}

interface UnifiedButton {
  id: number;
  type: "reply" | "url" | "phone";
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
  const navigate = useNavigate();
  const { session } = useAuth();
  useAutoSyncDevices(5000);
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

  const queryClient = useQueryClient();

  // Delay profiles
  const { data: delayProfiles = [] } = useQuery({
    queryKey: ["delay_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delay_profiles").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!session,
  });

  const [saveProfileName, setSaveProfileName] = useState("");
  const [showSaveProfile, setShowSaveProfile] = useState(false);

  // Draft persistence key
  const DRAFT_KEY = "campaign_draft";

  // State
  const [step, setStep] = useState(1);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messageType, setMessageType] = useState("texto");
  const [campaignName, setCampaignName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [buttons, setButtons] = useState<UnifiedButton[]>([{ id: Date.now(), type: "reply", text: "", value: "" }]);
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
  const [rawImport, setRawImport] = useState<RawImportData | null>(null);
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
  const [messagesPerInstance, setMessagesPerInstance] = useState(0);
  const [sendMode, setSendMode] = useState<"single" | "rotation" | "parallel">("single");

  // Delay profile mutations (after delay state is declared)
  const saveDelayProfile = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("delay_profiles").insert({
        user_id: session!.user.id,
        name,
        min_delay_seconds: minDelay,
        max_delay_seconds: maxDelay,
        pause_every_min: pauseEveryMin,
        pause_every_max: pauseEveryMax,
        pause_duration_min: pauseDurationMin,
        pause_duration_max: pauseDurationMax,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delay_profiles"] });
      toast({ title: "Perfil salvo!" });
      setSaveProfileName("");
      setShowSaveProfile(false);
    },
  });

  const deleteDelayProfile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("delay_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delay_profiles"] });
      toast({ title: "Perfil excluído" });
    },
  });

  const loadDelayProfile = (profile: any) => {
    setMinDelay(profile.min_delay_seconds);
    setMaxDelay(profile.max_delay_seconds);
    setPauseEveryMin(profile.pause_every_min);
    setPauseEveryMax(profile.pause_every_max);
    setPauseDurationMin(profile.pause_duration_min);
    setPauseDurationMax(profile.pause_duration_max);
    toast({ title: `Perfil "${profile.name}" carregado` });
  };

  useEffect(() => {
    const loadDefaults = async () => {
      try {
        // Fetch last campaign's delay settings
        const { data: lastCampaign } = await supabase
          .from("campaigns")
          .select("min_delay_seconds, max_delay_seconds, pause_every_min, pause_every_max, pause_duration_min, pause_duration_max")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (lastCampaign) {
          setMinDelay(lastCampaign.min_delay_seconds);
          setMaxDelay(lastCampaign.max_delay_seconds);
          setPauseEveryMin(lastCampaign.pause_every_min);
          setPauseEveryMax(lastCampaign.pause_every_max);
          setPauseDurationMin(lastCampaign.pause_duration_min);
          setPauseDurationMax(lastCampaign.pause_duration_max);
        }
      } catch { /* use defaults */ }

      // Then restore draft (draft overrides last campaign values if present)
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft.campaignName) setCampaignName(draft.campaignName);
          if (draft.message) setMessage(draft.message);
          if (draft.messageType) setMessageType(draft.messageType);
          if (draft.mediaUrl) setMediaUrl(draft.mediaUrl);
          if (draft.contacts?.length) { setContacts(draft.contacts); setShowContactTable(true); }
          if (draft.buttons?.length) setButtons(draft.buttons);
          if (draft.selectedDevices?.length) {
            // Filter out devices that no longer exist
            const validIds = draft.selectedDevices.filter((id: string) => devices.some(d => d.id === id));
            if (validIds.length > 0) setSelectedDevices(validIds);
          }
          if (draft.minDelay) setMinDelay(draft.minDelay);
          if (draft.maxDelay) setMaxDelay(draft.maxDelay);
          if (draft.pauseEveryMin) setPauseEveryMin(draft.pauseEveryMin);
          if (draft.pauseEveryMax) setPauseEveryMax(draft.pauseEveryMax);
          if (draft.pauseDurationMin) setPauseDurationMin(draft.pauseDurationMin);
          if (draft.pauseDurationMax) setPauseDurationMax(draft.pauseDurationMax);
          if (draft.scheduleEnabled) setScheduleEnabled(draft.scheduleEnabled);
          if (draft.scheduleDate) setScheduleDate(draft.scheduleDate);
        }
      } catch { /* ignore corrupt data */ }

      // Check for resend data from CampaignDetail
      try {
        const resendRaw = sessionStorage.getItem("resend_campaign_data");
        if (resendRaw) {
          sessionStorage.removeItem("resend_campaign_data");
          const resend = JSON.parse(resendRaw);
          if (resend.contacts?.length) { setContacts(resend.contacts); setShowContactTable(true); }
          if (resend.message) setMessage(resend.message);
          if (resend.mediaUrl) setMediaUrl(resend.mediaUrl);
          if (resend.campaignName) setCampaignName(resend.campaignName);
          if (resend.buttons && Array.isArray(resend.buttons) && resend.buttons.length > 0) {
            setButtons(resend.buttons);
          }
        }
      } catch { /* ignore */ }

      setDraftLoaded(true);
    };
    loadDefaults();
  }, []);

  // Auto-save draft (including all delay params)
  useEffect(() => {
    if (!draftLoaded) return;
    const draft = {
      campaignName, message, messageType, mediaUrl, contacts,
      buttons, selectedDevices, messagesPerInstance, sendMode,
      minDelay, maxDelay, pauseEveryMin, pauseEveryMax, pauseDurationMin, pauseDurationMax,
      scheduleEnabled, scheduleDate,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draftLoaded, campaignName, message, messageType, mediaUrl, contacts, buttons, selectedDevices, messagesPerInstance, sendMode, minDelay, maxDelay, pauseEveryMin, pauseEveryMax, pauseDurationMin, pauseDurationMax, scheduleEnabled, scheduleDate]);

  const clearStep1 = () => {
    setMessage(""); setMediaUrl(""); setMediaFileName("");
    setButtons([{ id: Date.now(), type: "reply", text: "", value: "" }]);
    setSelectedTemplate("nova");
    toast({ title: "Mensagem limpa" });
  };
  const clearStep2 = () => {
    setContacts([]); setShowContactTable(false); setContactPage(0);
    toast({ title: "Contatos limpos" });
  };
  const clearStep3 = () => {
    setSelectedDevices([]); setMinDelay(8); setMaxDelay(25);
    setPauseEveryMin(10); setPauseEveryMax(20); setPauseDurationMin(30); setPauseDurationMax(120);
    setMessagesPerInstance(0); setSendMode("single"); setScheduleEnabled(false); setScheduleDate("");
    toast({ title: "Parâmetros limpos" });
  };
  const clearAllForm = () => {
    setCampaignName(""); clearStep1(); clearStep2(); clearStep3();
    setStep(1);
    localStorage.removeItem(DRAFT_KEY);
    toast({ title: "Formulário limpo", description: "Todos os campos foram resetados." });
  };

  const allTags = Array.from(new Set(savedContacts.flatMap(c => c.tags || [])));
  const selectedDevicesData = devices.filter(d => selectedDevices.includes(d.id));
  const selectedDeviceData = selectedDevicesData[0];
  const validContacts = useMemo(() => contacts.filter(c => c.numero.trim()), [contacts]);
  const invalidContacts = useMemo(() => contacts.filter(c => c.numero.trim() && !/^\d{10,15}$/.test(c.numero.replace(/\D/g, ""))), [contacts]);
  const duplicateCount = useMemo(() => contacts.length - new Set(contacts.map(c => c.numero.trim()).filter(Boolean)).size, [contacts]);
  const hasButtons = buttons.filter(b => b.text.trim()).length > 0;
  const computedMessageType = detectMessageType(mediaUrl, hasButtons);

  // Paginated contacts
  const totalPages = Math.ceil(contacts.length / CONTACTS_PER_PAGE);
  const paginatedContacts = useMemo(() =>
    contacts.slice(contactPage * CONTACTS_PER_PAGE, (contactPage + 1) * CONTACTS_PER_PAGE),
    [contacts, contactPage, CONTACTS_PER_PAGE]
  );



  // Estimated send time calculation
  const estimatedTime = useMemo(() => {
    const count = validContacts.length;
    if (count === 0) return null;
    // Real calculation: backend applies only a random delay between each message (no pauses)
    const avgDelay = (minDelay + maxDelay) / 2;
    const totalSeconds = count * avgDelay;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) return `${days} dias ${remainingHours}h ${minutes}min`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  }, [validContacts.length, minDelay, maxDelay]);

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
    // Validate selected devices still exist
    const validDeviceIds = selectedDevices.filter(id => devices.some(d => d.id === id));
    if (validDeviceIds.length === 0) {
      setSelectedDevices([]);
      toast({ title: "Dispositivo não encontrado", description: "O dispositivo selecionado foi removido. Selecione outro na aba Configurações.", variant: "destructive" });
      return;
    }
    // Check if selected device is online
    const selectedDev = devices.find(d => d.id === validDeviceIds[0]);
    if (selectedDev && selectedDev.status !== "Ready") {
      toast({ title: "Instância offline", description: `"${selectedDev.name}" está desconectada. Reconecte antes de disparar.`, variant: "destructive" });
      return;
    }
    if (validContacts.length === 0) { toast({ title: "Sem contatos", description: "Adicione pelo menos um contato.", variant: "destructive" }); return; }
    if (!message.trim()) { toast({ title: "Mensagem vazia", description: "Escreva a mensagem.", variant: "destructive" }); return; }
    createCampaign.mutate({
      name: campaignName, message_type: computedMessageType, message_content: message,
      media_url: mediaUrl || undefined,
      buttons: buttons.filter(b => b.text.trim()).map(b => ({ type: b.type, text: b.text, value: b.value })),
      contacts: validContacts.map(c => ({ phone: c.numero, name: c.nome || undefined })),
      scheduled_at: scheduleEnabled && scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
      min_delay_seconds: minDelay,
      max_delay_seconds: maxDelay,
      pause_every_min: pauseEveryMin,
      pause_every_max: pauseEveryMax,
      pause_duration_min: pauseDurationMin,
      pause_duration_max: pauseDurationMax,
      device_id: selectedDevices[0],
      device_ids: selectedDevices,
      messages_per_instance: sendMode === "rotation" ? messagesPerInstance : (sendMode === "parallel" ? -1 : 0),
    }, {
      onSuccess: (newCampaign) => {
        if (scheduleEnabled && scheduleDate) {
          toast({
            title: "Campanha agendada!",
            description: `Será iniciada em ${new Date(scheduleDate).toLocaleString("pt-BR")}`,
            action: <ToastAction altText="Ver campanha" onClick={() => navigate(`/dashboard/campaign/${newCampaign.id}`)}>Ver campanha</ToastAction>,
          });
        } else {
          toast({
            title: "Campanha criada!",
            description: `${validContacts.length} contatos. Iniciando envio...`,
            action: <ToastAction altText="Ver campanha" onClick={() => navigate(`/dashboard/campaign/${newCampaign.id}`)}>Ver campanha</ToastAction>,
          });
          startCampaign.mutate({ campaignId: newCampaign.id, deviceId: selectedDevices[0] }, {
            onSuccess: () => {
              navigate(`/dashboard/campaign/${newCampaign.id}`);
            },
            onError: (err: any) => { toast({ title: "Erro no envio", description: err.message, variant: "destructive" }); },
          });
        }
        setCampaignName(""); setMessage(""); setMediaUrl(""); setMediaFileName(""); setContacts([]); setButtons([{ id: Date.now(), type: "reply", text: "", value: "" }]); setStep(1); localStorage.removeItem(DRAFT_KEY);
      },
      onError: (err: any) => {
        let desc = err.message || "Erro desconhecido";
        if (desc.includes("campaigns_device_id_fkey")) {
          desc = "O dispositivo selecionado não existe mais. Selecione outro na aba 'Configurações'.";
          setSelectedDevices([]);
        }
        if (desc.includes("campaigns_template_id_fkey")) {
          desc = "O template selecionado foi removido. Escolha outro na aba 'Mensagem'.";
        }
        toast({ title: "Erro ao criar campanha", description: desc, variant: "destructive" });
      },
    });
  };

  const triggerButtonFlash = () => {
    setButtonAddedFlash(true);
    setTimeout(() => setButtonAddedFlash(false), 600);
  };

  const addButton = (type: "reply" | "url" | "phone") => { if (buttons.length < 10) { setButtons([...buttons, { id: Date.now(), type, text: "", value: "" }]); triggerButtonFlash(); } };
  const removeButton = (id: number) => setButtons(buttons.filter(b => b.id !== id));
  const updateButton = (id: number, field: keyof UnifiedButton, val: string) => setButtons(buttons.map(b => b.id === id ? { ...b, [field]: val } : b));
  const moveButton = (id: number, direction: "up" | "down") => {
    setButtons(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  };

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

  const addContact = () => { setContacts(prev => [{ id: Date.now(), nome: "", numero: "", var1: "", var2: "", var3: "", var4: "", var5: "", var6: "", var7: "", var8: "", var9: "", var10: "" }, ...prev]); setShowContactTable(true); };
  const updateContact = (id: number, field: keyof Contact, value: string) => setContacts(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeContact = (id: number) => setContacts(contacts.filter(c => c.id !== id));

  const removeDuplicates = () => {
    const before = contacts.length;
    const seen = new Set<string>();
    const unique = contacts.filter(c => {
      const num = c.numero.trim();
      if (!num) return true; // keep contacts without number
      if (seen.has(num)) return false;
      seen.add(num);
      return true;
    });
    const removed = before - unique.length;
    setContacts(unique);
    toast({ title: `${removed} duplicado(s) removido(s)`, description: `${unique.length} contatos restantes na lista.` });
  };

  const removeInvalid = () => {
    const before = contacts.length;
    const valid = contacts.filter(c => !c.numero.trim() || /^\d{10,15}$/.test(c.numero.replace(/\D/g, "")));
    const removed = before - valid.length;
    setContacts(valid);
    toast({ title: `${removed} inválido(s) removido(s)`, description: `${valid.length} contatos restantes na lista.` });
  };

  const addPrefixToNumbers = (prefix: string) => {
    let count = 0;
    setContacts(prev => prev.map(c => {
      const num = c.numero.trim();
      if (num && !num.startsWith(prefix)) {
        count++;
        return { ...c, numero: prefix + num };
      }
      return c;
    }));
    toast({ title: `Prefixo "${prefix}" adicionado`, description: `${count} número(s) atualizados.` });
  };

  const handleImportFromDB = () => {
    let filtered = savedContacts;
    if (selectedContactTags.length > 0) filtered = filtered.filter(c => c.tags?.some(t => selectedContactTags.includes(t)));
    const imported: Contact[] = filtered.map((c, i) => ({ id: Date.now() + i, nome: c.name, numero: c.phone, var1: "", var2: "", var3: "", var4: "", var5: "", var6: "", var7: "", var8: "", var9: "", var10: "" }));
    if (imported.length === 0) { toast({ title: "Nenhum contato encontrado", variant: "destructive" }); return; }
    setContacts(prev => [...prev, ...imported]);
    setImportFromContacts(false);
    setShowContactTable(true);
    toast({ title: `${imported.length} contatos adicionados` });
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
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (rows.length < 1) {
          setImportProgress(null);
          toast({ title: "Arquivo vazio", description: "O arquivo não contém dados.", variant: "destructive" });
          return;
        }

        setImportProgress(80);

        const normalize = (s: string) =>
          String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\s]+/g, " ").trim();

        const firstRow = rows[0] || [];
        const hasHeader = firstRow.some((c: any) => {
          const s = normalize(String(c));
          return ["nome", "name", "numero", "number", "telefone", "phone", "contato", "contact", "whatsapp", "celular", "var"].some(k => s.includes(k));
        });

        const colCount = Math.max(...rows.slice(0, 10).map(r => r?.length || 0));
        const headers = hasHeader
          ? firstRow.map((c: any) => String(c).trim() || `Coluna ${firstRow.indexOf(c) + 1}`)
          : Array.from({ length: colCount }, (_, i) => `Coluna ${i + 1}`);

        // All columns start as "ignorar" — user must manually map
        const autoMappings: ColumnMapping[] = headers.map(() => "ignorar" as ColumnMapping);

        setImportProgress(100);
        setTimeout(() => {
          setImportProgress(null);
          setRawImport({
            headers,
            rows: hasHeader ? rows.slice(1) : rows,
            hasHeader,
            columnMappings: autoMappings,
          });
        }, 300);
      } catch (err) {
        console.error("Import error:", err);
        setImportProgress(null);
        toast({ title: "Erro ao ler arquivo", description: "Formato não suportado.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const updateColumnMapping = (colIndex: number, value: ColumnMapping) => {
    if (!rawImport) return;
    const newMappings = [...rawImport.columnMappings];
    // If setting nome or numero, clear any other column with that value
    if (value === "nome" || value === "numero") {
      for (let i = 0; i < newMappings.length; i++) {
        if (newMappings[i] === value) newMappings[i] = "ignorar";
      }
    }
    newMappings[colIndex] = value;
    setRawImport({ ...rawImport, columnMappings: newMappings });
  };

  const confirmMappingImport = () => {
    if (!rawImport) return;
    const { rows, columnMappings } = rawImport;
    const numIdx = columnMappings.indexOf("numero");
    const nameIdx = columnMappings.indexOf("nome");
    const varIndices: Record<string, number> = {};
    columnMappings.forEach((m, i) => {
      if (m.startsWith("var")) varIndices[m] = i;
    });

    const imported: Contact[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const rawNum = numIdx >= 0 ? String(row[numIdx] ?? "").trim().replace(/[\s\-\(\)]/g, "") : "";
      const nome = nameIdx >= 0 ? String(row[nameIdx] ?? "").trim() : "";
      if (!rawNum && !nome) continue;

      imported.push({
        id: Date.now() + i,
        nome,
        numero: rawNum.replace(/\D/g, ""),
        var1: varIndices.var1 !== undefined ? String(row[varIndices.var1] ?? "") : "",
        var2: varIndices.var2 !== undefined ? String(row[varIndices.var2] ?? "") : "",
        var3: varIndices.var3 !== undefined ? String(row[varIndices.var3] ?? "") : "",
        var4: varIndices.var4 !== undefined ? String(row[varIndices.var4] ?? "") : "",
        var5: varIndices.var5 !== undefined ? String(row[varIndices.var5] ?? "") : "",
        var6: varIndices.var6 !== undefined ? String(row[varIndices.var6] ?? "") : "",
        var7: varIndices.var7 !== undefined ? String(row[varIndices.var7] ?? "") : "",
        var8: varIndices.var8 !== undefined ? String(row[varIndices.var8] ?? "") : "",
        var9: varIndices.var9 !== undefined ? String(row[varIndices.var9] ?? "") : "",
        var10: varIndices.var10 !== undefined ? String(row[varIndices.var10] ?? "") : "",
      });
    }

    const totalImported = imported.length;

    if (totalImported === 0) {
      toast({ title: "Nenhum contato encontrado", description: "A planilha parece estar vazia.", variant: "destructive" });
      return;
    }

    // Filter invalid numbers (less than 8 digits)
    const valid = imported.filter(c => {
      const digits = c.numero.replace(/\D/g, "");
      return digits.length >= 8;
    });
    const invalidCount = totalImported - valid.length;

    // Remove duplicates within the batch
    const seenInBatch = new Set<string>();
    const uniqueInBatch: Contact[] = [];
    for (const c of valid) {
      const num = c.numero.trim();
      if (seenInBatch.has(num)) continue;
      seenInBatch.add(num);
      uniqueInBatch.push(c);
    }
    const batchDuplicates = valid.length - uniqueInBatch.length;

    // Remove duplicates already in existing contacts
    const existingNums = new Set(contacts.map(c => c.numero.trim()).filter(Boolean));
    const finalContacts = uniqueInBatch.filter(c => !existingNums.has(c.numero.trim()));
    const existingDuplicates = uniqueInBatch.length - finalContacts.length;

    const totalDuplicates = batchDuplicates + existingDuplicates;

    if (finalContacts.length === 0) {
      toast({ 
        title: "Nenhum contato novo", 
        description: `${totalDuplicates} duplicado(s) ignorado(s). ${invalidCount} inválido(s) descartado(s).`,
        variant: "destructive" 
      });
      setRawImport(null);
      return;
    }

    setContacts(prev => [...prev, ...finalContacts]);
    setShowContactTable(true);
    setContactPage(0);

    const parts: string[] = [];
    if (totalDuplicates > 0) parts.push(`${totalDuplicates} duplicado(s) ignorado(s)`);
    if (invalidCount > 0) parts.push(`${invalidCount} inválido(s) descartado(s)`);

    toast({ 
      title: `${finalContacts.length} contatos adicionados com sucesso`,
      description: parts.length > 0 ? parts.join(". ") + "." : undefined,
    });
    setRawImport(null);
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
    const hasAnyButtons = buttons.filter(b => b.text.trim()).length > 0;
    const bubbleMaxW = "max-w-[70%] sm:max-w-[75%]";
    const isSent = previewMode === "sent";

    return (
      <div className="rounded-[20px] overflow-hidden border-2 border-[hsl(210_10%_18%)] shadow-2xl shadow-black/40 h-full flex flex-col">
        {/* ── WhatsApp Header ── */}
        <div className="bg-[#202C33] px-4 py-3 flex items-center gap-3 border-b border-[#313D45]">
          <div className="w-9 h-9 rounded-full bg-[#6B7B8D]/30 flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-[#AEBAC1]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#E9EDEF] text-[14px] font-medium leading-tight">Destinatário</p>
            <p className="text-[#8696A0] text-[11px]">online</p>
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div
          className="p-4 flex-1 min-h-[340px] flex flex-col justify-end"
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
            <div className={cn(bubbleMaxW, "flex flex-col rounded-[12px] overflow-hidden shadow-md", isSent ? "bg-[#005C4B]" : "bg-[#202C33]")}>
              {/* Media */}
              {mediaUrl && (
                <img src={mediaUrl} alt="media" className="w-full max-h-52 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              {/* Text */}
              <div className="px-[14px] py-[10px]">
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
              {/* Buttons inside the bubble */}
              {hasAnyButtons && (
                <div className="flex flex-col gap-[1px] border-t border-[#313D45]/40">
                  {buttons.filter(b => b.text.trim()).map((btn) => (
                    <button
                      key={btn.id}
                      className={cn(
                        "w-full px-3 py-[10px] flex items-center justify-center gap-2 transition-colors duration-100",
                        isSent ? "hover:bg-[#006B57]" : "hover:bg-[#2A3942]",
                        buttonAddedFlash && "ring-1 ring-[#00A5F4]/30 ring-inset"
                      )}
                    >
                      {btn.type === "url" && <Link className="w-[14px] h-[14px] text-[#00A5F4]" />}
                      {btn.type === "phone" && <Phone className="w-[14px] h-[14px] text-[#00A5F4]" />}
                      <span className="text-[14px] text-[#00A5F4] font-medium">{btn.text || "Botão"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
      </div>

      {/* ═══ Step Content ═══ */}
      <div>
        {/* ===== STEP 1: Message ===== */}
        {step === 1 && (
          <div className="space-y-12">
            {/* Editor + Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Editor column */}
              <div className="lg:col-span-3 space-y-8">
                {/* Message editor */}
                <SurfaceCard className="p-6 space-y-5">
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
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 px-2 py-1 mt-1">Dinâmicas</p>
                        {[
                          { label: "Número Aleatório (4 dígitos)", tag: "{{rand4}}" },
                          { label: "Texto Aleatório (3 letras)", tag: "{{rand3}}" },
                        ].map(v => (
                          <button key={v.tag} className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-accent transition-colors flex items-center justify-between"
                            onClick={() => insertAtCursor(v.tag)}>
                            <span>{v.label}</span>
                            <code className="text-[9px] text-muted-foreground">{v.tag}</code>
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
              </div>

              {/* Preview column */}
              <div className="lg:col-span-2">
                <div className="h-full">
                  <WhatsAppPreview />
                </div>
              </div>
            </div>

            {/* Template + Mídia Row - below editor */}
            <div className="space-y-5">
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
                        setButtons(tmpl.buttons.map((b: any, i: number) => ({ id: Date.now() + i, type: b.type || "reply", text: b.text || "", value: b.value || "" })));
                      } else { setButtons([{ id: Date.now(), type: "reply", text: "", value: "" }]); }
                    }
                  } else { setMessage(""); setMediaUrl(""); setButtons([{ id: Date.now(), type: "reply", text: "", value: "" }]); }
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

              {/* ── Botões Interativos ── */}
              <SurfaceCard className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <SectionLabel>Botões Interativos</SectionLabel>
                  <Badge variant="secondary" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20">
                    {buttons.length}/10
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  {buttons.map((btn, idx) => {
                    const typeLabel = btn.type === "reply" ? "Resposta Rápida" : btn.type === "url" ? "Link (URL)" : "Ligar (Telefone)";
                    const TypeIcon = btn.type === "reply" ? MousePointerClick : btn.type === "url" ? Link : Phone;
                    return (
                      <div key={btn.id} className="rounded-xl border border-border/30 dark:border-border/15 bg-muted/15 dark:bg-muted/8 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                              <TypeIcon className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <span className="text-[11px] font-semibold text-foreground/70">{typeLabel}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button className="text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/30 disabled:opacity-20" disabled={idx === 0} onClick={() => moveButton(btn.id, "up")}><ArrowUp className="w-3.5 h-3.5" /></button>
                            <button className="text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/30 disabled:opacity-20" disabled={idx === buttons.length - 1} onClick={() => moveButton(btn.id, "down")}><ArrowDown className="w-3.5 h-3.5" /></button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="text-muted-foreground/40 hover:text-primary transition-colors p-1 rounded-lg hover:bg-primary/10"><Pencil className="w-3.5 h-3.5" /></button>
                              </PopoverTrigger>
                              <PopoverContent className="w-44 p-1.5 bg-popover border-border z-50" align="end">
                                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/60 px-2 py-1">Alterar tipo</p>
                                {[
                                  { t: "reply" as const, label: "Resposta Rápida", Ic: MousePointerClick },
                                  { t: "url" as const, label: "Link (URL)", Ic: Link },
                                  { t: "phone" as const, label: "Ligar (Telefone)", Ic: Phone },
                                ].map(opt => (
                                  <button key={opt.t} className={cn("w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-accent transition-colors flex items-center gap-2", btn.type === opt.t && "bg-accent")}
                                    onClick={() => updateButton(btn.id, "type", opt.t)}>
                                    <opt.Ic className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="font-medium">{opt.label}</span>
                                  </button>
                                ))}
                              </PopoverContent>
                            </Popover>
                            <button className="text-muted-foreground/30 hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10" onClick={() => removeButton(btn.id)}><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        {btn.type === "reply" ? (
                          <Input value={btn.text} onChange={(e) => updateButton(btn.id, "text", e.target.value)} placeholder="Texto exibido no botão" className="h-10 text-sm bg-background/50 dark:bg-background/20 border-border/15 font-medium" maxLength={20} />
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <Input value={btn.text} onChange={(e) => updateButton(btn.id, "text", e.target.value)} placeholder="Texto exibido" className="h-10 text-sm bg-background/50 dark:bg-background/20 border-border/15 font-medium" maxLength={20} />
                            <Input value={btn.value} onChange={(e) => updateButton(btn.id, "value", e.target.value)} placeholder={btn.type === "url" ? "https://..." : "+5511999999999"} className="h-10 text-sm bg-background/50 dark:bg-background/20 border-border/15 font-mono" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Button variant="outline" size="sm" disabled={buttons.length >= 10}
                  className="w-full h-11 gap-2 border-dashed border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors duration-100 text-xs font-medium"
                  onClick={() => addButton("reply")}>
                  <Plus className="w-4 h-4" /> Adicionar Botão
                </Button>
              </SurfaceCard>
            </div>
          </div>
        )}

        {/* ===== STEP 2: Contacts ===== */}
        {step === 2 && (
          <div className="space-y-8">

            {/* Import area */}
            <SurfaceCard className="p-6 space-y-5">
              <SectionLabel>Importar Contatos</SectionLabel>
              <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
              
              {validContacts.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/8 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-center max-w-sm">
                    <p className="text-base font-semibold text-foreground">Importe sua lista de contatos</p>
                    <p className="text-sm text-muted-foreground/60 mt-2 leading-relaxed">Arraste uma planilha ou use os botões abaixo. Detectamos automaticamente colunas de nome e número.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={() => fileRef.current?.click()} 
                      className="gap-2 h-12 px-6 text-sm font-bold shadow-lg shadow-primary/25 flex-1"
                    >
                      <Upload className="w-4 h-4" /> Importar Planilha
                    </Button>
                    <Button variant="outline" className="h-12 px-6 text-sm font-bold border-border/30 gap-2 hover:bg-primary/5 hover:border-primary/30 flex-1" onClick={() => setImportFromContacts(true)}>
                      <Users className="w-4 h-4" /> Base de Contatos
                    </Button>
                    <Button variant="outline" className="h-12 px-6 text-sm font-bold border-border/30 gap-2 hover:bg-primary/5 hover:border-primary/30 flex-1" onClick={addContact}>
                      <Plus className="w-4 h-4" /> Manual
                    </Button>
                  </div>
                </div>
              ) : (
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
                          <div className="h-px bg-border/30 my-1" />
                          <button className="w-full text-left px-2.5 py-2 text-xs rounded hover:bg-accent transition-colors flex items-center gap-2" onClick={() => { addPrefixToNumbers("55"); setShowContactTools(false); }}>
                            <Phone className="w-3.5 h-3.5" /> Adicionar DDI (55)
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
            {showContactTable && contacts.length > 0 && (() => {
              const varKeys = (["var1","var2","var3","var4","var5","var6","var7","var8","var9","var10"] as const)
                .filter(k => contacts.some(c => c[k]?.trim()));
              return (
              <SurfaceCard className="p-0 overflow-hidden">
                <div className="overflow-auto max-h-96 rounded-xl">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-card dark:bg-[hsl(220_13%_10%)] z-10">
                      <tr className="border-b border-border/15">
                        <th className="text-left px-3 py-3 text-muted-foreground/60 font-semibold w-8">#</th>
                        <th className="text-left px-3 py-3 text-muted-foreground/60 font-semibold">Nome</th>
                        <th className="text-left px-3 py-3 text-muted-foreground/60 font-semibold">Número</th>
                        {varKeys.map(k => (
                          <th key={k} className="text-left px-3 py-3 text-muted-foreground/60 font-semibold">{k.replace("var", "Var ")}</th>
                        ))}
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
                          {varKeys.map(k => (
                            <td key={k} className="px-3 py-2">
                              <Input value={c[k]} onChange={(e) => updateContact(c.id, k, e.target.value)} className="h-7 text-[11px] bg-transparent border-none p-0" placeholder={k.replace("var", "Var ")} />
                            </td>
                          ))}
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
              );
            })()}

            {/* Metrics - below list */}
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

          </div>
        )}

        {/* ===== STEP 3: Configuration ===== */}
        {step === 3 && (
          <div className="space-y-8">
            {/* Navigation - top */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="text-sm text-muted-foreground h-10 px-4">← Voltar</Button>
              <Button onClick={() => setStep(4)} className="gap-2 h-12 px-8 text-sm font-bold tracking-wide shadow-lg shadow-primary/25">
                CONTINUAR <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {/* Instance Selection */}
            <SurfaceCard className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <SectionLabel className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> Instância de Envio
                </SectionLabel>
                {selectedDevices.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 bg-primary/10 text-primary border-primary/20">
                    {selectedDevices.length} selecionada(s)
                  </Badge>
                )}
              </div>

              {devices.length === 0 ? (
                <div className="py-8 flex flex-col items-center gap-3">
                  <WifiOff className="w-8 h-8 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground/50">Nenhuma instância encontrada</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {devices.map(d => {
                    const st = getDeviceStatus(d.status);
                    const isSelected = selectedDevices.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        onClick={() => setSelectedDevices(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id])}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border transition-all duration-100 text-left",
                          isSelected
                            ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                            : "border-border/30 dark:border-border/15 hover:border-primary/20 bg-muted/5 dark:bg-muted/3"
                        )}
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isSelected ? "bg-primary/15" : "bg-muted/20")}>
                          {d.profile_picture ? (
                            <img src={d.profile_picture} alt="" className="w-10 h-10 rounded-xl object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <Smartphone className={cn("w-4.5 h-4.5", isSelected ? "text-primary" : "text-muted-foreground/40")} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-semibold truncate", isSelected ? "text-foreground" : "text-foreground/70")}>{d.name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <st.icon className={cn("w-3 h-3", st.color)} />
                            <span className={cn("text-[10px] font-medium", st.color)}>{st.label}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </SurfaceCard>

            {/* Delay Profiles */}
            <SurfaceCard className="p-5">
              <div className="flex items-center justify-between mb-3">
                <SectionLabel className="flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" /> Perfis de Delay
                </SectionLabel>
                <Button variant="outline" size="sm" className="text-[11px] h-7 gap-1 border-border/30" onClick={() => setShowSaveProfile(!showSaveProfile)}>
                  <Plus className="w-3 h-3" /> Salvar atual
                </Button>
              </div>

              {showSaveProfile && (
                <div className="flex gap-2 mb-3">
                  <Input value={saveProfileName} onChange={(e) => setSaveProfileName(e.target.value)} placeholder="Nome do perfil..." className="h-8 text-xs flex-1 bg-muted/15 dark:bg-muted/8 border-border/15"
                    onKeyDown={(e) => { if (e.key === "Enter" && saveProfileName.trim()) saveDelayProfile.mutate(saveProfileName.trim()); }} />
                  <Button size="sm" className="h-8 text-xs px-3" disabled={!saveProfileName.trim() || saveDelayProfile.isPending} onClick={() => saveDelayProfile.mutate(saveProfileName.trim())}>
                    {saveDelayProfile.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </Button>
                </div>
              )}

              {delayProfiles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {delayProfiles.map((p: any) => (
                    <div key={p.id} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/15 dark:bg-muted/8 border border-border/15 hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => loadDelayProfile(p)}>
                      <span className="text-[11px] font-medium text-foreground">{p.name}</span>
                      <span className="text-[9px] text-muted-foreground/50">{p.min_delay_seconds}–{p.max_delay_seconds}s</span>
                      <button className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); deleteDelayProfile.mutate(p.id); }}>
                        <X className="w-3 h-3 text-muted-foreground/40 hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/40">Nenhum perfil salvo. Configure os valores e salve para reutilizar.</p>
              )}
            </SurfaceCard>

            {/* Send Control Cards */}
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
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Mín (s)</label>
                      <Input type="number" value={minDelay || ""} onChange={(e) => { setMinDelay(Number(e.target.value) || 0); }} onBlur={() => { const v = minDelay || 1; setMinDelay(v); if (v > maxDelay) setMaxDelay(v); }} className="h-9 text-xs bg-muted/15 dark:bg-muted/8 border-border/15 tabular-nums" min={1} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Máx (s)</label>
                      <Input type="number" value={maxDelay || ""} onChange={(e) => { setMaxDelay(Number(e.target.value) || 0); }} onBlur={() => { const v = maxDelay || 1; setMaxDelay(v < minDelay ? minDelay : v); }} className="h-9 text-xs bg-muted/15 dark:bg-muted/8 border-border/15 tabular-nums" min={1} />
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
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Mín</label>
                      <Input type="number" value={pauseEveryMin || ""} onChange={(e) => { setPauseEveryMin(Number(e.target.value) || 0); }} onBlur={() => { const v = pauseEveryMin || 1; setPauseEveryMin(v); if (v > pauseEveryMax) setPauseEveryMax(v); }} className="h-9 text-xs bg-muted/15 dark:bg-muted/8 border-border/15 tabular-nums" min={1} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Máx</label>
                      <Input type="number" value={pauseEveryMax || ""} onChange={(e) => { setPauseEveryMax(Number(e.target.value) || 0); }} onBlur={() => { const v = pauseEveryMax || 1; setPauseEveryMax(v < pauseEveryMin ? pauseEveryMin : v); }} className="h-9 text-xs bg-muted/15 dark:bg-muted/8 border-border/15 tabular-nums" min={1} />
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
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Mín (s)</label>
                      <Input type="number" value={pauseDurationMin || ""} onChange={(e) => { setPauseDurationMin(Number(e.target.value) || 0); }} onBlur={() => { const v = pauseDurationMin || 1; setPauseDurationMin(v); if (v > pauseDurationMax) setPauseDurationMax(v); }} className="h-9 text-xs bg-muted/15 dark:bg-muted/8 border-border/15 tabular-nums" min={1} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground/50 font-medium">Máx (s)</label>
                      <Input type="number" value={pauseDurationMax || ""} onChange={(e) => { setPauseDurationMax(Number(e.target.value) || 0); }} onBlur={() => { const v = pauseDurationMax || 1; setPauseDurationMax(v < pauseDurationMin ? pauseDurationMin : v); }} className="h-9 text-xs bg-muted/15 dark:bg-muted/8 border-border/15 tabular-nums" min={1} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/40 tabular-nums">{pauseDurationMin}s – {pauseDurationMax}s de pausa</p>
                </div>
              </SurfaceCard>
            </div>

            {/* Projeção de Envio */}
            <SurfaceCard className="p-6 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-2">Tempo estimado de envio</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">≈ {estimatedTime || "—"}</p>
            </SurfaceCard>

            {/* Navigation moved to top */}
          </div>
        )}

        {/* ===== STEP 4: Review & Launch ===== */}
        {step === 4 && (
          <div className="space-y-8">
            {/* Navigation + Launch - top */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="text-sm text-muted-foreground h-10 px-4">← Voltar</Button>
              <Button
                className="gap-3 h-14 px-12 text-sm font-bold tracking-[0.1em] uppercase shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-shadow duration-100"
                onClick={handleSendCampaign}
                disabled={createCampaign.isPending || startCampaign.isPending || !campaignName || selectedDevices.length === 0 || validContacts.length === 0 || !message}
              >
                <Send className="w-4.5 h-4.5" />
                {startCampaign.isPending ? "ENVIANDO..." : createCampaign.isPending ? "SALVANDO..." : "INICIAR CAMPANHA"}
              </Button>
            </div>
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
              {/* Technical summary */}
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
                    { label: "Tempo Estimado", value: estimatedTime || "—", icon: Timer },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/10 dark:bg-muted/5 border border-border/8">
                      <div className="w-8 h-8 rounded-lg bg-muted/20 dark:bg-muted/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="w-3.5 h-3.5 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/40 font-semibold">{item.label}</p>
                        <p className="text-[13px] font-bold text-foreground mt-0.5 leading-tight">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

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
                <WhatsAppPreview />
              </div>
            </div>

            {/* Security text */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/40">
              <Lock className="w-3 h-3" />
              <span>Seus dados estão seguros. O envio pode ser cancelado a qualquer momento.</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Stepper ═══ */}
      <div className="mt-10 mb-6">
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
                  <div className="text-left min-w-0 hidden sm:block">
                    <p className={cn(
                      "text-[13px] font-semibold leading-tight transition-colors",
                      isActive ? "text-foreground" : isDone ? "text-foreground/60" : "text-muted-foreground/40"
                    )}>{s.label}</p>
                    <p className={cn(
                      "text-[11px] leading-tight mt-0.5 transition-colors",
                      isActive ? "text-muted-foreground/70" : "text-muted-foreground/30"
                    )}>{s.desc}</p>
                    <p className={cn("text-[9px] font-semibold uppercase tracking-wider mt-1", statusInfo.color)}>
                      {statusInfo.text}
                    </p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-8 bg-border/20 dark:bg-border/10" />
                  )}
                </button>
              );
            })}
          </div>
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
        <div className="flex items-center justify-between mt-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs gap-1.5 h-9 w-[170px] justify-center border-border/40 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:border-destructive/30 transition-colors duration-100"
            onClick={step === 1 ? clearStep1 : step === 2 ? clearStep2 : step === 3 ? clearStep3 : clearAllForm}
          >
            <Eraser className="w-3.5 h-3.5" /> {step === 1 ? "Limpar mensagem" : step === 2 ? "Limpar contatos" : step === 3 ? "Limpar parâmetros" : "Limpar tudo"}
          </Button>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2.5 h-12 px-10 text-sm font-bold tracking-wide">
                ← VOLTAR
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} className="gap-2.5 h-12 px-10 text-sm font-bold tracking-wide shadow-lg shadow-primary/25">
                CONTINUAR <ChevronRight className="w-4 h-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Import Progress Bar */}
      {importProgress !== null && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-80">
          <SurfaceCard className="p-4 space-y-2 shadow-2xl">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium">Importando...</span>
              <span className="text-muted-foreground tabular-nums">{importProgress}%</span>
            </div>
            <Progress value={importProgress} className="h-1.5" />
          </SurfaceCard>
        </div>
      )}

      {/* Column Mapping Dialog */}
      <Dialog open={!!rawImport} onOpenChange={(open) => !open && setRawImport(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Mapeamento de Colunas</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">Selecione o que cada coluna representa. Apenas 1 coluna pode ser "Nome" e 1 "Número".</p>
          </DialogHeader>
          {rawImport && (
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Column mappings */}
              <div className="space-y-2 max-h-[200px] overflow-auto pr-1">
                <SectionLabel>Colunas detectadas</SectionLabel>
                {rawImport.headers.map((header, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-foreground truncate block">{header}</span>
                      <span className="text-[10px] text-muted-foreground/50">
                        Ex: {String(rawImport.rows[0]?.[i] ?? "—").slice(0, 30)}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    <Select value={rawImport.columnMappings[i]} onValueChange={(v) => updateColumnMapping(i, v as ColumnMapping)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nome">Nome</SelectItem>
                        <SelectItem value="numero">Número</SelectItem>
                        <SelectItem value="var1">Variável 1</SelectItem>
                        <SelectItem value="var2">Variável 2</SelectItem>
                        <SelectItem value="var3">Variável 3</SelectItem>
                        <SelectItem value="var4">Variável 4</SelectItem>
                        <SelectItem value="var5">Variável 5</SelectItem>
                        <SelectItem value="var6">Variável 6</SelectItem>
                        <SelectItem value="var7">Variável 7</SelectItem>
                        <SelectItem value="var8">Variável 8</SelectItem>
                        <SelectItem value="var9">Variável 9</SelectItem>
                        <SelectItem value="var10">Variável 10</SelectItem>
                        <SelectItem value="ignorar">Ignorar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total de linhas", value: rawImport.rows.length },
                  { label: "Colunas detectadas", value: rawImport.headers.length },
                  { label: "Colunas mapeadas", value: rawImport.columnMappings.filter(m => m !== "ignorar").length },
                ].map(s => (
                  <SurfaceCard key={s.label} className="p-3 text-center">
                    <p className="text-lg font-bold text-foreground tabular-nums">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </SurfaceCard>
                ))}
              </div>

              {/* Data preview — only mapped columns */}
              {(() => {
                const mappedCols = rawImport.columnMappings
                  .map((m, i) => ({ mapping: m, index: i, header: rawImport.headers[i] }))
                  .filter(c => c.mapping !== "ignorar");
                const labelMap: Record<string, string> = {
                  nome: "Nome", numero: "Número",
                  var1: "Var 1", var2: "Var 2", var3: "Var 3", var4: "Var 4", var5: "Var 5",
                  var6: "Var 6", var7: "Var 7", var8: "Var 8", var9: "Var 9", var10: "Var 10",
                };
                return mappedCols.length > 0 ? (
                  <div className="flex-1 overflow-auto rounded-xl border border-border/15 bg-muted/8 dark:bg-muted/4">
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0 bg-card dark:bg-[hsl(220_13%_10%)] z-10">
                        <tr className="border-b border-border/15">
                          <th className="text-left px-3 py-2.5 text-muted-foreground font-semibold w-8">#</th>
                          {mappedCols.map(col => (
                            <th key={col.index} className={cn(
                              "text-left px-3 py-2.5 font-semibold text-[10px]",
                              col.mapping === "numero" ? "text-primary" :
                              col.mapping === "nome" ? "text-emerald-400" : "text-muted-foreground"
                            )}>
                              <div>{labelMap[col.mapping] || col.mapping}</div>
                              <div className="font-normal text-[9px] opacity-50">{col.header}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawImport.rows.slice(0, 5).map((row, ri) => (
                          <tr key={ri} className="border-b border-border/8">
                            <td className="px-3 py-2 text-muted-foreground/40 tabular-nums">{ri + 1}</td>
                            {mappedCols.map(col => (
                              <td key={col.index} className={cn(
                                "px-3 py-2 text-foreground",
                                col.mapping === "numero" && "font-mono"
                              )}>
                                {String(row[col.index] ?? "—").slice(0, 30)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rawImport.rows.length > 5 && (
                      <p className="text-[11px] text-muted-foreground text-center py-3">
                        ...e mais {rawImport.rows.length - 5} linhas
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/50 py-8">
                    Selecione ao menos uma coluna para ver o preview.
                  </div>
                );
              })()}

              {!rawImport.columnMappings.includes("numero") && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Selecione qual coluna contém o número de telefone para continuar.
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setRawImport(null)} className="h-10">Cancelar</Button>
                <Button 
                  onClick={confirmMappingImport} 
                  className="h-10 px-6 font-semibold gap-1.5"
                  disabled={!rawImport.columnMappings.includes("numero")}
                >
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
