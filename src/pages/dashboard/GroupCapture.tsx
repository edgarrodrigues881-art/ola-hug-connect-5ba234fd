import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UsersRound, Plus, Trash2, Link2, Loader2, Copy, Check, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dgLogo from "@/assets/dg-contingencia.jpeg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

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

  const { data: devices = [] } = useQuery({
    queryKey: ["devices-for-join"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("id, name, number, status")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data;
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

  const joinMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("join-group", {
        body: { groupLinks: selectedGroups, deviceIds: selectedDevices },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const results = data?.results || [];
      const successCount = results.filter((r: any) => r.status === "success").length;
      const skippedCount = results.filter((r: any) => r.status === "skipped").length;
      const errorCount = results.filter((r: any) => r.status === "error").length;

      toast({
        title: "Processo concluído",
        description: `${successCount} sucesso, ${skippedCount} pulados, ${errorCount} erros`,
        variant: errorCount > 0 ? "destructive" : "default",
      });
      setJoinModalOpen(false);
      setSelectedGroups([]);
      setSelectedDevices([]);
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao entrar nos grupos.", variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!name.trim() || !link.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    addMutation.mutate({ name: name.trim(), link: link.trim() });
  };

  const toggleGroup = (link: string) => {
    setSelectedGroups((prev) =>
      prev.includes(link) ? prev.filter((l) => l !== link) : [...prev, link]
    );
  };

  const toggleDevice = (id: string) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const allGroupLinks = [
    ...SUGGESTED_GROUPS.map((sg) => sg.link),
    ...groups.map((g: any) => g.link),
  ];
  const allGroupsMap = [
    ...SUGGESTED_GROUPS.map((sg) => ({ name: sg.name, link: sg.link })),
    ...groups.map((g: any) => ({ name: g.name, link: g.link })),
  ];
  // Deduplicate
  const uniqueGroups = allGroupsMap.filter(
    (g, i, arr) => arr.findIndex((x) => x.link === g.link) === i
  );

  const selectAllGroups = () => {
    if (selectedGroups.length === uniqueGroups.length) {
      setSelectedGroups([]);
    } else {
      setSelectedGroups(uniqueGroups.map((g) => g.link));
    }
  };

  const selectAllDevices = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(devices.map((d) => d.id));
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grupos de Aquecimento</h1>
          <p className="text-sm text-muted-foreground">Links dos grupos do WhatsApp para aquecimento</p>
        </div>
        <Button onClick={() => setJoinModalOpen(true)} className="gap-2">
          <LogIn className="w-4 h-4" /> Entrar nos Grupos
        </Button>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Grupos de Aquecimento</h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
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

      {/* Modal de Entrar nos Grupos */}
      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Entrar nos Grupos</DialogTitle>
            <DialogDescription>
              Selecione os grupos e as instâncias que devem entrar automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Seleção de Grupos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Grupos</h3>
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={selectAllGroups}>
                  {selectedGroups.length === uniqueGroups.length ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-md border border-border/50 p-2">
                {uniqueGroups.map((g) => (
                  <label
                    key={g.link}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedGroups.includes(g.link)}
                      onCheckedChange={() => toggleGroup(g.link)}
                    />
                    <span className="text-sm truncate">{g.name}</span>
                  </label>
                ))}
                {uniqueGroups.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum grupo disponível</p>
                )}
              </div>
            </div>

            {/* Seleção de Instâncias */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Instâncias (Dispositivos)</h3>
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={selectAllDevices}>
                  {selectedDevices.length === devices.length ? "Desmarcar todos" : "Selecionar todos"}
                </Button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-md border border-border/50 p-2">
                {devices.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedDevices.includes(d.id)}
                      onCheckedChange={() => toggleDevice(d.id)}
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm truncate">{d.name}</span>
                      {d.number && (
                        <span className="text-xs text-muted-foreground">{d.number}</span>
                      )}
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          d.status === "Connected" ? "bg-emerald-400" : "bg-destructive/60"
                        }`}
                      />
                    </div>
                  </label>
                ))}
                {devices.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhuma instância cadastrada</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => joinMutation.mutate()}
              disabled={selectedGroups.length === 0 || selectedDevices.length === 0 || joinMutation.isPending}
              className="gap-2"
            >
              {joinMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              Entrar ({selectedGroups.length}g × {selectedDevices.length}i)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupCapture;
