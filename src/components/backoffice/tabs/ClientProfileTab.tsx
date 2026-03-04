import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAction, type AdminUser } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, AlertTriangle, Server, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { calculateClientScore, scoreColors } from "@/lib/clientScore";

interface Props {
  client: AdminUser;
  detail: any;
}

const ClientProfileTab = ({ client, detail }: Props) => {
  const profile = detail?.profile || {};
  const [form, setForm] = useState({
    full_name: profile.full_name || client.full_name || "",
    phone: profile.phone || client.phone || "",
    company: profile.company || client.company || "",
    admin_notes: profile.admin_notes || client.admin_notes || "",
    risk_flag: profile.risk_flag ?? client.risk_flag ?? false,
    status: profile.status || client.status || "active",
    instance_override: profile.instance_override ?? client.instance_override ?? 0,
  });
  const [notificacaoLiberada, setNotificacaoLiberada] = useState(profile.notificacao_liberada ?? false);
  const { mutate, isPending } = useAdminAction();
  const { toast } = useToast();

  const planLimit = client.max_instances || 0;
  const totalAllowed = planLimit + (form.instance_override || 0);

  const score = useMemo(() => calculateClientScore({
    risk_flag: form.risk_flag,
    cycles: detail?.cycles || [],
    admin_logs: detail?.admin_logs || [],
  }), [form.risk_flag, detail?.cycles, detail?.admin_logs]);

  const sc = scoreColors[score.level];
  const handleSave = () => {
    mutate(
      { action: "update-client", body: { target_user_id: client.id, ...form } },
      {
        onSuccess: () => toast({ title: "Dados atualizados com sucesso" }),
        onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-5">
      {/* Score Card */}
      <div className={`${sc.bg} border border-border rounded-lg p-4 flex items-center gap-4`}>
        <div className={`w-12 h-12 rounded-full ${sc.bg} flex items-center justify-center`}>
          <span className={`text-lg font-bold ${sc.text}`}>{score.score}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${sc.dot}`} />
            <span className={`text-sm font-semibold ${sc.text}`}>{score.label}</span>
          </div>
          {score.breakdown.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {score.breakdown.map(b => `${b.label} (${b.penalty})`).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 space-y-5">
      <h3 className="text-lg font-semibold text-zinc-200">Dados Pessoais</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-zinc-400 text-xs">Nome Completo</Label>
          <Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs">E-mail</Label>
          <Input value={client.email} disabled className="bg-zinc-900/50 border-zinc-700 text-zinc-500 mt-1" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs">Telefone</Label>
          <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs">Empresa (opcional)</Label>
          <Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1" />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs">Status</Label>
          <select
            value={form.status}
            onChange={e => setForm({...form, status: e.target.value})}
            className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-100 px-3 text-sm"
          >
            <option value="active">Ativo</option>
            <option value="suspended">Suspenso</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Override de Instâncias */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Server size={16} className="text-purple-400" />
          <h4 className="text-sm font-semibold text-zinc-200">Override Manual de Instâncias</h4>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-zinc-500 text-[11px] uppercase tracking-wide">Limite do Plano</Label>
            <p className="text-lg font-bold text-zinc-300 mt-0.5">{planLimit}</p>
          </div>
          <div>
            <Label className="text-zinc-500 text-[11px] uppercase tracking-wide">Override</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.instance_override}
              onChange={e => setForm({...form, instance_override: Math.max(0, parseInt(e.target.value) || 0)})}
              className="bg-zinc-800 border-zinc-600 text-zinc-100 mt-0.5 h-9 w-24"
            />
          </div>
          <div>
            <Label className="text-zinc-500 text-[11px] uppercase tracking-wide">Total Permitido</Label>
            <p className="text-lg font-bold text-purple-400 mt-0.5">{totalAllowed}</p>
          </div>
        </div>
        {form.instance_override > 0 && (
          <p className="text-[11px] text-yellow-500/80">
            ⚠ Override ativo: +{form.instance_override} instâncias extras além do plano
          </p>
        )}
      </div>

      {/* Notification Toggle */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-amber-400" />
          <h4 className="text-sm font-semibold text-zinc-200">Notificação via WhatsApp</h4>
          {notificacaoLiberada ? (
            <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">Liberada</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">Bloqueada</Badge>
          )}
        </div>
        <p className="text-[11px] text-zinc-500">
          Ao liberar, instâncias de notificação deste cliente serão ativadas e um webhook será disparado para o Make.
        </p>
        <div className="flex items-center gap-3">
          <Switch
            checked={notificacaoLiberada}
            onCheckedChange={(v) => {
              setNotificacaoLiberada(v);
              mutate(
                { action: "toggle-notification", body: { target_user_id: client.id, enabled: v } },
                {
                  onSuccess: () => toast({ title: v ? "Notificação liberada" : "Notificação bloqueada" }),
                  onError: (e) => {
                    toast({ title: "Erro", description: e.message, variant: "destructive" });
                    setNotificacaoLiberada(!v);
                  },
                }
              );
            }}
          />
          <Label className="text-zinc-300 text-sm">
            {notificacaoLiberada ? "Notificação liberada para este cliente" : "Notificação bloqueada"}
          </Label>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Switch checked={form.risk_flag} onCheckedChange={v => setForm({...form, risk_flag: v})} />
        <Label className="text-zinc-300 flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-red-400" /> Marcar como cliente de alto risco
        </Label>
      </div>

      <div>
        <Label className="text-zinc-400 text-xs">Observações Internas (só admin)</Label>
        <Textarea
          value={form.admin_notes}
          onChange={e => setForm({...form, admin_notes: e.target.value})}
          className="bg-zinc-900 border-zinc-700 text-zinc-100 mt-1"
          rows={4}
          placeholder="Anotações privadas sobre este cliente..."
        />
      </div>

      <Button onClick={handleSave} disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
        Salvar Alterações
      </Button>
    </div>
    </div>
  );
};

export default ClientProfileTab;
