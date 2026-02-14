import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const InfoTip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
    </TooltipTrigger>
    <TooltipContent><p className="text-xs max-w-48">{text}</p></TooltipContent>
  </Tooltip>
);

const Context = () => {
  const [delayEnabled, setDelayEnabled] = useState(true);
  const [delayMin, setDelayMin] = useState("20");
  const [delayMax, setDelayMax] = useState("45");

  const [suspensionEnabled, setSuspensionEnabled] = useState(true);
  const [suspensionMessages, setSuspensionMessages] = useState("5");
  const [suspensionMin, setSuspensionMin] = useState("50");
  const [suspensionMax, setSuspensionMax] = useState("70");

  const [switchAccount, setSwitchAccount] = useState("5");

  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [welcomeDuration, setWelcomeDuration] = useState("1");

  const [unsubEnabled, setUnsubEnabled] = useState(false);
  const [unsubKeyword, setUnsubKeyword] = useState("STOP");

  const [rejectCalls, setRejectCalls] = useState(false);

  const [parallelMessages, setParallelMessages] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [autoReply, setAutoReply] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [mediaFirst, setMediaFirst] = useState(false);

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contexto</h1>
        <p className="text-sm text-muted-foreground">Configurações gerais de envio e automação</p>
      </div>

      <Tabs defaultValue="enviando" className="w-full">
        <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-4 h-auto p-0">
          <TabsTrigger value="enviando" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm">
            Enviando mensagem
          </TabsTrigger>
          <TabsTrigger value="whatshook" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm">
            WhatsHook
          </TabsTrigger>
          <TabsTrigger value="pais" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm">
            País e idioma
          </TabsTrigger>
          <TabsTrigger value="armazenar" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2 text-sm">
            Armazenar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enviando" className="mt-6 space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Atraso entre mensagens */}
            <Card className="glass-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Atraso entre mensagens</span>
                    <InfoTip text="Define o intervalo entre cada mensagem enviada para evitar bloqueios" />
                  </div>
                  <Switch checked={delayEnabled} onCheckedChange={setDelayEnabled} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-destructive">*Mínimo</Label>
                    <div className="flex items-center gap-2">
                      <Input value={delayMin} onChange={e => setDelayMin(e.target.value)} className="h-9 text-sm" type="number" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Segundos</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-destructive">*Máximo</Label>
                    <div className="flex items-center gap-2">
                      <Input value={delayMax} onChange={e => setDelayMax(e.target.value)} className="h-9 text-sm" type="number" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Segundos</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Modo de suspensão */}
            <Card className="glass-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Modo de suspensão</span>
                    <InfoTip text="Pausa o envio após X mensagens e aguarda um tempo antes de continuar" />
                  </div>
                  <Switch checked={suspensionEnabled} onCheckedChange={setSuspensionEnabled} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-destructive">*Mensagens posteriores</Label>
                    <div className="flex items-center gap-2">
                      <Input value={suspensionMessages} onChange={e => setSuspensionMessages(e.target.value)} className="h-9 text-sm" type="number" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Mensagens</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-destructive">*Mínimo</Label>
                    <div className="flex items-center gap-2">
                      <Input value={suspensionMin} onChange={e => setSuspensionMin(e.target.value)} className="h-9 text-sm" type="number" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Segundos</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-destructive">*Máximo</Label>
                    <div className="flex items-center gap-2">
                      <Input value={suspensionMax} onChange={e => setSuspensionMax(e.target.value)} className="h-9 text-sm" type="number" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Segundos</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Trocar de conta */}
            <Card className="glass-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Trocar de conta</span>
                  <InfoTip text="Alterna entre instâncias após X mensagens" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-destructive">*Depois</Label>
                  <div className="flex items-center gap-2">
                    <Input value={switchAccount} onChange={e => setSwitchAccount(e.target.value)} className="h-9 text-sm" type="number" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Mensagens</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mensagem de boas-vindas */}
            <Card className="glass-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Mensagem de boas-vindas</span>
                    <InfoTip text="Envia uma mensagem automática para novos contatos" />
                  </div>
                  <Switch checked={welcomeEnabled} onCheckedChange={setWelcomeEnabled} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-destructive">*Duração</Label>
                  <div className="flex items-center gap-2">
                    <Input value={welcomeDuration} onChange={e => setWelcomeDuration(e.target.value)} className="h-9 text-sm" type="number" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Dias</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Configuração */}
            <Card className="glass-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Configuração</span>
                  <InfoTip text="Opções gerais de envio de mensagens" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={parallelMessages} onCheckedChange={(v) => setParallelMessages(!!v)} />
                    <span className="text-xs text-foreground">Enviar mensagens paralelas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={showNotification} onCheckedChange={(v) => setShowNotification(!!v)} />
                    <span className="text-xs text-foreground">Mostrar notificação</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={autoReply} onCheckedChange={(v) => setAutoReply(!!v)} />
                    <span className="text-xs text-foreground">Resposta automática</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={autoRead} onCheckedChange={(v) => setAutoRead(!!v)} />
                    <span className="text-xs text-foreground">Leitura automática de mensagens</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={mediaFirst} onCheckedChange={(v) => setMediaFirst(!!v)} />
                    <span className="text-xs text-foreground">Enviar mídia antes da mensagem de texto</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cancelar inscrição */}
            <Card className="glass-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Cancelar inscrição</span>
                    <InfoTip text="Adiciona automaticamente à lista negra quando a palavra-chave é recebida" />
                  </div>
                  <Switch checked={unsubEnabled} onCheckedChange={setUnsubEnabled} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-destructive">*Palavra-chave</Label>
                    <Input value={unsubKeyword} onChange={e => setUnsubKeyword(e.target.value)} placeholder="STOP" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Modelo</Label>
                    <Select>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="t1">Template 1</SelectItem>
                        <SelectItem value="t2">Template 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rejeitar chamadas */}
            <Card className="glass-card">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Rejeitar chamadas automaticamente</span>
                    <InfoTip text="Rejeita chamadas recebidas e envia uma mensagem automática" />
                  </div>
                  <Switch checked={rejectCalls} onCheckedChange={setRejectCalls} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Modelo</Label>
                  <Select>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="t1">Template 1</SelectItem>
                      <SelectItem value="t2">Template 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button className="bg-primary hover:bg-primary/90">Salvar</Button>
        </TabsContent>

        <TabsContent value="whatshook" className="mt-6">
          <Card className="glass-card">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-medium text-foreground">Configurações de WhatsHook</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">URL do Webhook</Label>
                  <Input placeholder="https://seu-webhook.com/endpoint" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Token de autenticação</Label>
                  <Input placeholder="Token secreto" className="h-9 text-sm" type="password" />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox />
                  <span className="text-xs text-foreground">Enviar notificações de status</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox />
                  <span className="text-xs text-foreground">Enviar mensagens recebidas</span>
                </div>
              </div>
              <Button className="bg-primary hover:bg-primary/90">Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pais" className="mt-6">
          <Card className="glass-card">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-medium text-foreground">País e idioma</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">País padrão</Label>
                  <Select>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Brasil" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="br">Brasil</SelectItem>
                      <SelectItem value="pt">Portugal</SelectItem>
                      <SelectItem value="us">Estados Unidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Idioma</Label>
                  <Select>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Português" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Código do país (DDI)</Label>
                  <Input defaultValue="+55" className="h-9 text-sm" />
                </div>
              </div>
              <Button className="bg-primary hover:bg-primary/90">Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="armazenar" className="mt-6">
          <Card className="glass-card">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-sm font-medium text-foreground">Armazenamento</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox defaultChecked />
                  <span className="text-xs text-foreground">Armazenar mensagens enviadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox defaultChecked />
                  <span className="text-xs text-foreground">Armazenar mensagens recebidas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox />
                  <span className="text-xs text-foreground">Armazenar mídias</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Período de retenção</Label>
                  <Select>
                    <SelectTrigger className="h-9"><SelectValue placeholder="30 dias" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                      <SelectItem value="365">1 ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="bg-primary hover:bg-primary/90">Salvar</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Context;
