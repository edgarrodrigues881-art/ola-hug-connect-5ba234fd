import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Radio, RefreshCw, Flame, Megaphone, Plug, Loader2, Eye, Smartphone, Users, X, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePlanGate } from "@/hooks/usePlanGate";
import { PlanGateDialog } from "@/components/PlanGateDialog";


interface WhatsAppGroup {
  id: string;
  name: string;
  participants?: number;
}

export default function ReportWhatsApp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isBlocked, planState, canUseReports } = usePlanGate();
  const [planGateOpen, setPlanGateOpen] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);

  const canUseReport = canUseReports;

  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: ["report-wa-config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_wa_configs")
        .select("id, device_id, toggle_campaigns, toggle_warmup, toggle_instances, alert_disconnect, alert_campaign_end, alert_high_failures, group_id, group_name, frequency, connected_phone, connection_status, warmup_group_id, warmup_group_name, campaigns_group_id, campaigns_group_name, connection_group_id, connection_group_name, created_at, updated_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: reportDevice } = useQuery({
    queryKey: ["report-device", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("devices")
        .select("id, name, number, status, login_type")
        .eq("user_id", user!.id)
        .eq("login_type", "report_wa")
        .maybeSingle();
      return data;
    },
    enabled: !!user && canUseReport,
  });

  const isConnected = reportDevice?.status === "Ready";

  const fetchGroups = async (deviceId: string, forceRefresh = false) => {
    setLoadingGroups(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const refreshParam = forceRefresh ? "&refresh=true" : "";
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whapi-chats?action=list_chats&device_id=${deviceId}&count=200${refreshParam}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const chats = json.chats || [];
      const groupChats: WhatsAppGroup[] = chats.map((c: any) => ({
        id: c.id || c.jid || c.chatId || "",
        name: c.name || c.subject || c.title || c.id || "Grupo sem nome",
        participants: c.participants?.length || c.participantsCount || c.size || undefined,
      }));
      setGroups(groupChats);
    } catch (err) {
      console.error("Error fetching groups:", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    if (reportDevice?.id && reportDevice?.status === "Ready") {
      fetchGroups(reportDevice.id);
    }
  }, [reportDevice?.id, reportDevice?.status]);

  const upsertConfig = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (config?.id) {
        const { error } = await supabase.from("report_wa_configs").update(updates).eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("report_wa_configs").insert({ user_id: user!.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-wa-config"] });
      toast.success("Configuração salva");
    },
    onError: () => toast.error("Erro ao salvar configuração"),
  });

  const handleToggle = (field: string, value: boolean) => upsertConfig.mutate({ [field]: value });

  const handleGroupSelect = (field: string, nameField: string, groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    upsertConfig.mutate({ [field]: groupId, [nameField]: group?.name || "" });
  };

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }




  return (
    <div className="space-y-6">
      {/* Plan gate banner */}
      {!canUseReport && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-destructive/20 bg-destructive/5">
          <Ban className="w-4 h-4 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-foreground">Funcionalidade bloqueada</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isBlocked ? "Ative ou renove seu plano para usar notificações via WhatsApp." : "Solicite ao administrador a liberação desta funcionalidade."}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Radio className="w-4 h-4 text-primary" />
          </div>
          Relatório Via WhatsApp
        </h1>
        <p className="text-muted-foreground text-xs mt-1 ml-[42px]">
          Configure notificações automáticas para grupos do WhatsApp.
        </p>
      </div>

      {/* 3 Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AlertCard
          icon={<Flame className="w-4 h-4 text-orange-500" />}
          iconColor="orange"
          title="Aquecimento"
          description="Relatórios após cada ciclo de 24h."
          groups={groups}
          selectedGroupId={config?.warmup_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("warmup_group_id", "warmup_group_name", id)}
          onRefreshGroups={() => reportDevice?.id && fetchGroups(reportDevice.id, true)}
          enabled={config?.toggle_warmup ?? false}
          onToggle={(v) => handleToggle("toggle_warmup", v)}
          loadingGroups={loadingGroups}
          infoItems={[]}
          monitoredEvents={["Ciclo de aquecimento concluído"]}
          previewMessage={`🔥 RELATÓRIO DE AQUECIMENTO (24H)\n\nInstância: ${reportDevice?.name || "{nome_instancia}"}\nNúmero: ${reportDevice?.number || "{numero}"}\n\n📊 Atividades registradas\n\n📨 Mensagens enviadas: {msgs_enviadas}\n📩 Mensagens recebidas: {msgs_recebidas}\n\n🖼 Fotos enviadas: {fotos}\n🎧 Áudios enviados: {audios}\n\n🟢 Status postados: {status}\n👥 Interações em grupos: {grupos_interacoes}\n\n⏱ Última atividade registrada:\n{ultima_atividade}\n\n🔎 Status atual da instância:\n${isConnected ? "🟢 Online" : "🔴 Offline"}\n\nRelatório gerado automaticamente após o ciclo de aquecimento de 24h.`}
        />

        <AlertCard
          icon={<Megaphone className="w-4 h-4 text-sky-500" />}
          iconColor="sky"
          title="Campanhas"
          description="Alertas de eventos de campanha."
          groups={groups}
          selectedGroupId={config?.campaigns_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("campaigns_group_id", "campaigns_group_name", id)}
          onRefreshGroups={() => reportDevice?.id && fetchGroups(reportDevice.id, true)}
          enabled={config?.toggle_campaigns ?? false}
          onToggle={(v) => handleToggle("toggle_campaigns", v)}
          loadingGroups={loadingGroups}
          infoItems={[]}
          monitoredEvents={["Campanha iniciada", "Campanha pausada", "Campanha finalizada", "Falhas detectadas"]}
          previewMessage={`📣 CAMPANHA FINALIZADA\n\nCampanha: {nome_campanha}\n\n📊 Resultado da campanha\n\n👥 Total de contatos: {total}\n\n✅ Mensagens enviadas: {enviadas}\n📬 Mensagens entregues: {entregues}\n\n❌ Falhas registradas: {falhas}\n⏳ Pendentes: {pendentes}\n\n⏱ Tempo total de execução:\n{tempo_execucao}\n\nStatus da campanha: Concluída`}
        />

        <AlertCard
          icon={<Plug className="w-4 h-4 text-emerald-500" />}
          iconColor="emerald"
          title="Conexão"
          description="Alertas de mudança de status."
          groups={groups}
          selectedGroupId={config?.connection_group_id || ""}
          onGroupSelect={(id) => handleGroupSelect("connection_group_id", "connection_group_name", id)}
          onRefreshGroups={() => reportDevice?.id && fetchGroups(reportDevice.id, true)}
          enabled={config?.alert_disconnect ?? false}
          onToggle={(v) => handleToggle("alert_disconnect", v)}
          loadingGroups={loadingGroups}
          infoItems={[]}
          monitoredEvents={["Instância conectada", "Instância desconectada", "QR Code gerado"]}
          previewMessage={`⚠️ ALERTA DE CONEXÃO\n\nInstância: ${reportDevice?.name || "{nome_instancia}"}\nNúmero: ${reportDevice?.number || "{numero}"}\n\n❌ Status: Desconectado\n\n⏱ Horário da ocorrência:\n${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}\n\nA instância perdeu conexão com o WhatsApp.\n\nPara continuar utilizando o sistema,\né necessário realizar a reconexão.`}
        />
      </div>

      <PlanGateDialog open={planGateOpen} onOpenChange={setPlanGateOpen} planState={planState} context="notifications" />
    </div>
  );
}

// ─── Alert Card ───
interface AlertCardProps {
  icon: React.ReactNode;
  iconColor: "orange" | "sky" | "emerald";
  title: string;
  description: string;
  
  groups: WhatsAppGroup[];
  selectedGroupId: string;
  onGroupSelect: (id: string) => void;
  onRefreshGroups?: () => void;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  loadingGroups: boolean;
  infoItems: { icon: React.ReactNode; label: string; value: string }[];
  monitoredEvents: string[];
  previewMessage: string;
}

function AlertCard({
  icon, iconColor, title, description, groups, selectedGroupId,
  onGroupSelect, onRefreshGroups, enabled, onToggle, loadingGroups, infoItems, monitoredEvents, previewMessage,
}: AlertCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [groupSearch, setGroupSearch] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const filteredGroups = groups
    .filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const accentMap = {
    orange: {
      bg: "bg-orange-500/8",
      border: "border-orange-500/15",
      dot: "bg-orange-500",
      text: "text-orange-500",
    },
    sky: {
      bg: "bg-sky-500/8",
      border: "border-sky-500/15",
      dot: "bg-sky-500",
      text: "text-sky-500",
    },
    emerald: {
      bg: "bg-emerald-500/8",
      border: "border-emerald-500/15",
      dot: "bg-emerald-500",
      text: "text-emerald-500",
    },
  }[iconColor];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        whileHover={{ y: -2, boxShadow: enabled ? "0 8px 30px -12px rgba(0,0,0,0.25)" : "0 4px 20px -8px rgba(0,0,0,0.1)" }}
        className={`flex flex-col rounded-2xl border bg-card/30 backdrop-blur-sm overflow-hidden transition-colors duration-200 ${enabled ? accentMap.border : "border-border/10"}`}
      >
        {/* Accent line */}
        <motion.div
          animate={{ scaleX: enabled ? 1 : 0.3, opacity: enabled ? 1 : 0.3 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{ originX: 0 }}
          className={`h-[2px] w-full ${enabled ? accentMap.dot : "bg-muted/15"}`}
        />

        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ scale: enabled ? 1 : 0.9, rotate: enabled ? 0 : -5 }}
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${enabled ? accentMap.bg : "bg-muted/15"}`}
              >
                {icon}
              </motion.div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5 leading-tight">{description}</p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={onToggle} className="mt-0.5" />
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 space-y-4 flex-1 flex flex-col">
          {/* Group selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              Grupo de destino
            </label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button className={`w-full flex items-center justify-between gap-2 h-9 px-3 rounded-xl border text-[12px] transition-all ${
                  selectedGroup 
                    ? "border-border/30 bg-card text-foreground" 
                    : "border-border/15 bg-muted/5 text-muted-foreground/50"
                } hover:border-border/40 hover:bg-card/60`}>
                  <span className="truncate text-left">{selectedGroup ? selectedGroup.name : (loadingGroups ? "Carregando..." : "Selecionar grupo...")}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedGroup && (
                      <span
                        role="button"
                        className="text-muted-foreground/40 hover:text-destructive transition-colors p-0.5"
                        onClick={(e) => { e.stopPropagation(); onGroupSelect(""); }}
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                    <Users className="w-3.5 h-3.5 text-muted-foreground/30" />
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl overflow-hidden" align="start">
                <div className="p-2.5 border-b border-border/15 flex gap-2 bg-card">
                  <Input
                    placeholder="Pesquisar grupo..."
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    className="h-8 text-[11px] flex-1 rounded-lg bg-muted/10 border-border/10"
                    autoFocus
                  />
                  {onRefreshGroups && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg hover:bg-muted/20" onClick={onRefreshGroups} disabled={loadingGroups}>
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingGroups ? "animate-spin" : ""}`} />
                    </Button>
                  )}
                </div>
                <div className="max-h-[220px] overflow-y-auto p-1.5">
                  {filteredGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                      <Users className="w-5 h-5 text-muted-foreground/20" />
                      <p className="text-[11px] text-muted-foreground/40">
                        {loadingGroups ? "Carregando grupos..." : groupSearch ? "Nenhum grupo encontrado" : "Conecte a instância primeiro"}
                      </p>
                    </div>
                  ) : (
                    filteredGroups.map((g) => (
                      <button
                        key={g.id}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all flex items-center justify-between gap-2 ${
                          selectedGroupId === g.id 
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-muted/15 text-foreground/80"
                        }`}
                        onClick={() => { onGroupSelect(g.id); setGroupSearch(""); setPopoverOpen(false); }}
                      >
                        <span className="truncate">{g.name}</span>
                        {g.participants && (
                          <span className="text-muted-foreground/30 flex items-center gap-0.5 shrink-0 text-[10px]">
                            <Users className="w-2.5 h-2.5" />{g.participants}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Monitored events */}
          <div className="space-y-2 mt-auto">
            <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">
              Eventos monitorados
            </label>
            <div className="flex flex-wrap gap-1.5">
              {monitoredEvents.map((evt) => (
                <span key={evt} className="text-[10px] px-2 py-1 rounded-md bg-muted/10 text-muted-foreground/60 border border-border/8">
                  {evt}
                </span>
              ))}
            </div>
          </div>

          {/* Preview button */}
          <button
            className="w-full flex items-center justify-center gap-2 h-8 rounded-xl text-[11px] font-medium text-muted-foreground/60 hover:text-foreground hover:bg-muted/10 transition-all border border-transparent hover:border-border/15"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="w-3.5 h-3.5" />
            Ver mensagem
          </button>
        </div>
      </motion.div>

      {/* WhatsApp-style Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          {/* WhatsApp header */}
          <div className="bg-[#202C33] px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#6B7B8D]/20 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-[#AEBAC1]" />
            </div>
            <div>
              <p className="text-[#E9EDEF] text-[14px] font-medium">Relatório Via WhatsApp</p>
              <p className="text-[#8696A0] text-[11px]">online</p>
            </div>
          </div>
          {/* Chat body */}
          <div className="p-4 min-h-[220px]" style={{ backgroundColor: "#0B141A" }}>
            <div className="bg-[#005C4B] rounded-xl p-3.5 shadow-md max-w-[88%] ml-auto">
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#E9EDEF]">
                {previewMessage}
              </p>
              <div className="flex items-center justify-end gap-1 mt-2">
                <span className="text-[10px] text-[#8696A0]/60">
                  {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-[10px] text-[#53BDEB]/70">✓✓</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
