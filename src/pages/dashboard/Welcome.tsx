import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HandMetal, Save, Bold, Italic, Strikethrough, Smile, List, Code, Image, ChevronDown } from "lucide-react";

const Welcome = () => {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [delay, setDelay] = useState("5");
  const [delayUnit, setDelayUnit] = useState("segundos");

  const variables = [
    { label: "Nome", tag: "{{nome}}" },
    { label: "Número", tag: "{{numero}}" },
    { label: "Variável 1", tag: "{{var1}}" },
    { label: "Variável 2", tag: "{{var2}}" },
    { label: "Variável 3", tag: "{{var3}}" },
    { label: "Variável 4", tag: "{{var4}}" },
    { label: "Variável 5", tag: "{{var5}}" },
    { label: "Variável 6", tag: "{{var6}}" },
    { label: "Variável 7", tag: "{{var7}}" },
    { label: "Variável 8", tag: "{{var8}}" },
    { label: "Variável 9", tag: "{{var9}}" },
    { label: "Variável 10", tag: "{{var10}}" },
    { label: "Texto aleatório", tag: "{{texto_aleatorio}}" },
    { label: "Número aleatório", tag: "{{numero_aleatorio}}" },
  ];

  const insertVariable = (tag: string) => {
    setMessage((prev) => prev + tag);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HandMetal className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mensagem de Boas-vindas</h1>
            <p className="text-muted-foreground">Configure mensagens automáticas para novos contatos</p>
          </div>
        </div>
        <Button className="gap-2">
          <Save className="w-4 h-4" />
          Salvar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Ativar Mensagem de Boas-vindas</CardTitle>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <p className="text-sm text-muted-foreground">
            Quando ativado, novos contatos receberão automaticamente uma mensagem de boas-vindas.
          </p>
        </CardHeader>
      </Card>

      <Card className={!enabled ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="text-lg">Configurações de Delay</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <Label>Tempo de espera antes de enviar</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={delay}
                  onChange={(e) => setDelay(e.target.value)}
                  className="w-24"
                  min="1"
                />
                <Select value={delayUnit} onValueChange={setDelayUnit}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="segundos">Segundos</SelectItem>
                    <SelectItem value="minutos">Minutos</SelectItem>
                    <SelectItem value="horas">Horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={!enabled ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="text-lg">Mensagem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-1 flex-wrap border-b border-border pb-2">
            <Button variant="ghost" size="icon" className="h-8 w-8"><Bold className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Italic className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Strikethrough className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Code className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><List className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Smile className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Image className="w-4 h-4" /></Button>

            <div className="ml-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 border-primary text-primary">
                    Usar coluna
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="end">
                  <div className="flex flex-col">
                    {variables.map((v) => (
                      <Button
                        key={v.tag}
                        variant="ghost"
                        size="sm"
                        className="justify-start text-sm"
                        onClick={() => insertVariable(v.tag)}
                      >
                        {v.label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Textarea
            placeholder="Digite sua mensagem de boas-vindas aqui..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
          />

          {message && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Pré-visualização:</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Welcome;
