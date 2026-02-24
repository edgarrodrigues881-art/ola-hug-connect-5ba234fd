import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UsersRound, Plus, Trash2, Link2, Loader2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dgLogo from "@/assets/dg-contingencia.jpeg";

const SUGGESTED_GROUPS = [
  { name: "DG CONTINGÊNCIA #01", link: "https://chat.whatsapp.com/I1gvz1bfEhrEIM9iMFsCik?mode=gi_t" },
  { name: "DG CONTINGÊNCIA #02", link: "https://chat.whatsapp.com/BZNGH9zeFxF5UOj2pD2Wbk?mode=gi_t" },
  { name: "DG CONTINGÊNCIA #03", link: "https://chat.whatsapp.com/JnIfueI6qZsFgWuoYimS85?mode=gi_t" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copy}>
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </Button>
  );
}

const GroupCapture = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [link, setLink] = useState("");

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["warmup-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warmup_groups" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (params: { name: string; link: string }) => {
      const { error } = await supabase.from("warmup_groups" as any).insert({
        user_id: user!.id,
        name: params.name,
        link: params.link,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warmup-groups"] });
      setName("");
      setLink("");
      toast({ title: "Grupo adicionado", description: "Grupo salvo com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível salvar o grupo.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warmup_groups" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warmup-groups"] });
      toast({ title: "Grupo removido" });
    },
  });

  const handleAdd = () => {
    if (!name.trim() || !link.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    addMutation.mutate({ name: name.trim(), link: link.trim() });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Grupos de Aquecimento</h1>
        <p className="text-sm text-muted-foreground">Links dos grupos do WhatsApp para aquecimento</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Grupos de Aquecimento</h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Grupos sugeridos (não cadastrados ainda) */}
            {SUGGESTED_GROUPS.filter(sg => !groups.some((g: any) => g.link === sg.link)).map((sg) => (
              <Card key={sg.link} className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <img src={dgLogo} alt={sg.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{sg.name}</p>
                        <CopyButton text={sg.link} />
                      </div>
                      <div className="flex items-center gap-1.5 bg-muted/30 rounded-md px-2.5 py-1.5 border border-border/30">
                        <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground break-all select-all">{sg.link}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Grupos cadastrados */}
            {groups.map((g: any) => (
              <Card key={g.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {g.name?.includes("DG CONTINGÊNCIA") ? (
                      <img src={dgLogo} alt={g.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <UsersRound className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{g.name}</p>
                        <CopyButton text={g.link} />
                      </div>
                      <div className="flex items-center gap-1.5 bg-muted/30 rounded-md px-2.5 py-1.5 border border-border/30">
                        <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground break-all select-all">{g.link}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {groups.length === 0 && SUGGESTED_GROUPS.length === 0 && (
              <Card className="border-border/50 bg-card/80">
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  Nenhum grupo cadastrado ainda. Adicione o primeiro acima.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GroupCapture;
