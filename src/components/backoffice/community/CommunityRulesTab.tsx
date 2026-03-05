import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";

const CommunityRulesTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["community-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-data?action=community-settings-get");
      if (error) throw error;
      return data?.settings || [];
    },
  });

  useEffect(() => {
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((s: any) => { map[s.key] = s.value; });
      setLocal(map);
    }
  }, [data]);

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase.functions.invoke("admin-data?action=community-settings-update", {
        body: { key, value },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-settings"] });
      toast({ title: "Configuração salva!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleSave = (key: string) => {
    updateSetting.mutate({ key, value: local[key] });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Fase mínima para entrar no pool</Label>
        <div className="flex gap-2">
          <Select value={local.min_phase_required_for_pool || "autosave_enabled"} onValueChange={v => setLocal(prev => ({ ...prev, min_phase_required_for_pool: v }))}>
            <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pre_24h">pre_24h</SelectItem>
              <SelectItem value="groups_only">groups_only</SelectItem>
              <SelectItem value="autosave_enabled">autosave_enabled</SelectItem>
              <SelectItem value="community_enabled">community_enabled</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => handleSave("min_phase_required_for_pool")} disabled={updateSetting.isPending}>
            <Save size={14} />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Instâncias precisam estar nessa fase ou acima para serem elegíveis ao pool.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Máx. pares ativos por instância</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            max={10}
            value={local.max_active_pairs_per_instance || "1"}
            onChange={e => setLocal(prev => ({ ...prev, max_active_pairs_per_instance: e.target.value }))}
            className="bg-card border-border w-24"
          />
          <Button size="sm" onClick={() => handleSave("max_active_pairs_per_instance")} disabled={updateSetting.isPending}>
            <Save size={14} />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Política de rotação (evitar últimos N pares)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            max={50}
            value={local.rotation_policy_last_n || "3"}
            onChange={e => setLocal(prev => ({ ...prev, rotation_policy_last_n: e.target.value }))}
            className="bg-card border-border w-24"
          />
          <Button size="sm" onClick={() => handleSave("rotation_policy_last_n")} disabled={updateSetting.isPending}>
            <Save size={14} />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Evita repetir o mesmo par nas últimas N execuções.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Mostrar status "Comunidade" para clientes</Label>
        <div className="flex items-center gap-3">
          <Switch
            checked={local.show_community_to_users === "true"}
            onCheckedChange={v => {
              setLocal(prev => ({ ...prev, show_community_to_users: v ? "true" : "false" }));
              updateSetting.mutate({ key: "show_community_to_users", value: v ? "true" : "false" });
            }}
          />
          <span className="text-xs text-muted-foreground">{local.show_community_to_users === "true" ? "Visível" : "Oculto"}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">Se ativo, clientes veem "Comunidade: Ativa/Desativada" em suas instâncias.</p>
      </div>
    </div>
  );
};

export default CommunityRulesTab;
