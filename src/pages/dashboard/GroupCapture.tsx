import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UsersRound, Plus, Trash2, Link2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
    mutationFn: async () => {
      const { error } = await supabase.from("warmup_groups" as any).insert({
        user_id: user!.id,
        name: name.trim(),
        link: link.trim(),
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
    addMutation.mutate();
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Grupos de Aquecimento</h1>
        <p className="text-sm text-muted-foreground">Cadastre links de grupos do WhatsApp para aquecimento</p>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Adicionar Grupo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do grupo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Link do grupo (https://chat.whatsapp.com/...)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="flex-[2]"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={addMutation.isPending} className="gap-1.5 shrink-0">
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Grupos Cadastrados ({groups.length})</h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <Card className="border-border/50 bg-card/80">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Nenhum grupo cadastrado ainda. Adicione o primeiro acima.
            </CardContent>
          </Card>
        ) : (
          groups.map((g: any) => (
            <Card key={g.id} className="border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <UsersRound className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{g.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                      <Link2 className="w-3 h-3 shrink-0" />
                      {g.link}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => deleteMutation.mutate(g.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default GroupCapture;
