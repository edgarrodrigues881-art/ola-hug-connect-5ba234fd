import { useState } from "react";
import { Save, ToggleLeft, ToggleRight, Tags, MessageSquare, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const AutoSaveNumber = () => {
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [saveIncoming, setSaveIncoming] = useState(true);
  const [saveOutgoing, setSaveOutgoing] = useState(false);
  const [saveFromGroups, setSaveFromGroups] = useState(false);
  const [defaultTag, setDefaultTag] = useState("");
  const [tags, setTags] = useState<string[]>(["auto-salvo"]);

  const addTag = () => {
    if (defaultTag.trim() && !tags.includes(defaultTag.trim())) {
      setTags([...tags, defaultTag.trim()]);
      setDefaultTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = () => {
    toast.success("Configurações de Auto Save salvas!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Save className="w-6 h-6 text-primary" />
          Número Auto Save
        </h1>
        <p className="text-muted-foreground mt-1">
          Salve automaticamente os números que interagem com seus chips.
        </p>
      </div>

      {/* Status card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Ativar Auto Save</span>
            <div className="flex items-center gap-2">
              {autoSaveEnabled ? (
                <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">Ativo</Badge>
              ) : (
                <Badge variant="secondary">Inativo</Badge>
              )}
              <Switch checked={autoSaveEnabled} onCheckedChange={setAutoSaveEnabled} />
            </div>
          </CardTitle>
          <CardDescription>
            Quando ativado, números que enviam mensagens serão salvos automaticamente na sua lista de contatos.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurações</CardTitle>
          <CardDescription>Defina quais números devem ser salvos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Mensagens recebidas</p>
                <p className="text-xs text-muted-foreground">Salvar números que enviarem mensagens para você</p>
              </div>
            </div>
            <Switch checked={saveIncoming} onCheckedChange={setSaveIncoming} />
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Mensagens enviadas</p>
                <p className="text-xs text-muted-foreground">Salvar números para quem você enviou mensagens</p>
              </div>
            </div>
            <Switch checked={saveOutgoing} onCheckedChange={setSaveOutgoing} />
          </div>

          <div className="border-t border-border" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Save className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Números de grupos</p>
                <p className="text-xs text-muted-foreground">Salvar números de participantes de grupos</p>
              </div>
            </div>
            <Switch checked={saveFromGroups} onCheckedChange={setSaveFromGroups} />
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tags className="w-4 h-4 text-primary" />
            Tags padrão
          </CardTitle>
          <CardDescription>Tags que serão adicionadas automaticamente aos contatos salvos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={defaultTag}
              onChange={(e) => setDefaultTag(e.target.value)}
              placeholder="Nova tag..."
              className="max-w-xs"
              onKeyDown={(e) => e.key === "Enter" && addTag()}
            />
            <Button variant="outline" size="sm" onClick={addTag}>
              Adicionar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => removeTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
            {tags.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma tag definida.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estatísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-2xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground mt-1">Salvos hoje</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-2xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground mt-1">Salvos esta semana</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30 border border-border">
              <p className="text-2xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground mt-1">Total salvo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Salvar configurações
        </Button>
      </div>
    </div>
  );
};

export default AutoSaveNumber;
