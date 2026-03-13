import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Smartphone,
  Wifi,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Signal,
  Shield,
  Ban,
  RotateCcw,
  Layers,
  Gauge,
  TrendingUp,
  Search,
  Zap,
  HeartPulse,
  CircleDot,
} from "lucide-react";

const CustomModule = () => {
  const [checklist, setChecklist] = useState({
    formatted: false,
    whatsapp: false,
    structure: false,
    intensity: false,
    noMix: false,
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Guia de Aquecimento</h1>
        <p className="text-sm text-muted-foreground">
          Orientações completas para preparar o aparelho, configurar a rede e conduzir o aquecimento de forma segura e organizada.
        </p>
      </div>

      {/* Indicador de estado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusIndicator color="emerald" label="Conta Estável" description="Pode escalar o volume com segurança" />
        <StatusIndicator color="amber" label="Conta Sensível" description="Exige progressão lenta e monitoramento" />
        <StatusIndicator color="red" label="Conta Crítica" description="Risco elevado — estabilize antes de prosseguir" />
      </div>

      <Accordion type="multiple" className="space-y-4">
        {/* ───── 0. Antes de QR Code — Chip novo ───── */}
        <AccordionItem value="before-qr" className="border-0">
          <Card className="border-border/60 bg-card overflow-hidden rounded-xl shadow-sm">
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3 [&>svg]:text-amber-500">
              <span className="flex items-center gap-3 text-base font-semibold text-foreground">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                Antes do QR Code — Chip novo
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  Com as atualizações recentes do WhatsApp, conectar o QR Code sem nenhum uso manual prévio pode gerar
                  restrições logo nos primeiros dias de aquecimento.
                </p>
                <p>
                  <strong className="text-foreground font-medium">Ação necessária:</strong> Antes de escanear o QR Code, 
                  envie de <strong className="text-foreground font-medium">1 a 3 mensagens manualmente</strong> pelo 
                  aparelho. Isso cria um histórico mínimo de uso real.
                </p>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2.5">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400">
                    Esse passo simples reduz consideravelmente o risco de bloqueio nos primeiros dias.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* ───── 1. Preparação do Aparelho ───── */}
        <AccordionItem value="prep" className="border-0">
            <Card className="border-border/60 bg-card overflow-hidden rounded-xl shadow-sm">
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3 [&>svg]:text-emerald-500">
              <span className="flex items-center gap-3 text-base font-semibold text-foreground">
                <Smartphone className="w-5 h-5 text-emerald-500 shrink-0" />
                Preparação do Aparelho
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Passo 1 */}
                <StepCard step={1} title="Formatação do aparelho" icon={<RotateCcw className="w-4 h-4 text-emerald-500" />}>
                  <p className="text-sm text-muted-foreground mb-2">Formate o celular obrigatoriamente se:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Já foi usado para disparos em massa</li>
                    <li>Já sofreu bloqueio ou restrição</li>
                    <li>Teve mais de um número operando</li>
                    <li>Teve algum app modificado instalado</li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-3 mb-1">O que a formatação elimina:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Resíduos de sessões anteriores</li>
                    <li>Tokens e credenciais antigas</li>
                    <li>Cache acumulado de aplicativos</li>
                    <li>Configurações que podem conflitar</li>
                  </ul>
                  <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400">Sempre faça o reset completo de fábrica. Formatação parcial não é suficiente.</p>
                  </div>
                </StepCard>

                {/* Passo 2 */}
                <StepCard step={2} title="Instalação mínima" icon={<Shield className="w-4 h-4 text-emerald-500" />}>
                  <p className="text-sm text-muted-foreground mb-2">Siga esta ordem:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Faça login com uma conta Google</li>
                    <li>Instale somente o WhatsApp oficial da Play Store</li>
                    <li>Confirme que a versão é a oficial (não modded)</li>
                    <li>Remova a conta Google após a instalação, se fizer parte da sua estratégia</li>
                    <li>Não instale outros apps de mensagens ou automação</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    Quanto menos aplicativos no aparelho, menor o risco de associação cruzada.
                  </p>
                </StepCard>

                {/* Passo 3 */}
                <StepCard step={3} title="Tipo de conexão" icon={<Signal className="w-4 h-4 text-emerald-500" />}>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong className="text-foreground">Sem histórico negativo:</strong> Wi-Fi pode ser usado na instalação.</p>
                    <p><strong className="text-foreground">Com histórico de bloqueio:</strong> Use dados móveis (4G) desde o início.</p>
                    <p><strong className="text-foreground">Após a configuração:</strong> Mantenha o aparelho preferencialmente no 4G.</p>
                    <p className="text-xs italic mt-2">Evite alternar entre Wi-Fi e 4G com frequência — isso pode levantar suspeitas.</p>
                  </div>
                </StepCard>

                {/* Passo 4 */}
                <StepCard step={4} title="Organização dos aparelhos" icon={<Layers className="w-4 h-4 text-emerald-500" />}>
                  <p className="text-sm text-muted-foreground mb-2">Práticas a evitar:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Rodar 3 ou mais WhatsApps no mesmo celular</li>
                    <li>Misturar conta saudável com conta restrita</li>
                    <li>Usar o aparelho principal para contingência</li>
                  </ul>
                  <div className="mt-3 rounded-md border border-border/30 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Regra prática:</strong> Quanto menos números por aparelho, melhor. Uma conta restrita pode comprometer as demais por efeito cascata.
                    </p>
                  </div>
                </StepCard>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* ───── 2. Estrutura e Rede ───── */}
        <AccordionItem value="network" className="border-0">
            <Card className="border-border/60 bg-card overflow-hidden rounded-xl shadow-sm">
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3 [&>svg]:text-emerald-500">
              <span className="flex items-center gap-3 text-base font-semibold text-foreground">
                <Wifi className="w-5 h-5 text-emerald-500 shrink-0" />
                Estrutura e Rede
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A saúde da conta não depende só do comportamento de envio — <strong className="text-foreground">depende também da infraestrutura.</strong>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <CheckItem label="IP fixo e estável" />
                  <CheckItem label="Proxy residencial ativo" />
                  <CheckItem label="Proxy fora de data center" />
                  <CheckItem label="Conexão instável ou oscilando" invert />
                  <CheckItem label="IP com histórico de spam" invert />
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Uma infraestrutura mal configurada invalida qualquer processo de aquecimento.
                </p>

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                  <p className="text-sm font-medium text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Em caso de bloqueio temporário
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Ative o modo avião por alguns minutos</li>
                    <li>Reative os dados móveis para forçar a renovação do IP</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    Se o bloqueio persistir: <strong className="text-foreground">não force novos envios</strong>. Revise toda a estrutura antes de tentar novamente.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* ───── 3. Modelagem do Aquecimento ───── */}
        <AccordionItem value="warmup" className="border-0">
            <Card className="border-border/60 bg-card overflow-hidden rounded-xl shadow-sm">
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3 [&>svg]:text-emerald-500">
              <span className="flex items-center gap-3 text-base font-semibold text-foreground">
                <Activity className="w-5 h-5 text-emerald-500 shrink-0" />
                Modelagem do Aquecimento
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">A intensidade do aquecimento deve considerar:</p>
                <div className="grid grid-cols-3 gap-3 text-sm text-muted-foreground">
                  <div className="rounded-md border border-border/30 bg-muted/30 p-3 text-center">
                    <p className="text-foreground font-medium">Idade do número</p>
                  </div>
                  <div className="rounded-md border border-border/30 bg-muted/30 p-3 text-center">
                    <p className="text-foreground font-medium">Histórico do chip</p>
                  </div>
                  <div className="rounded-md border border-border/30 bg-muted/30 p-3 text-center">
                    <p className="text-foreground font-medium">Estado atual</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <IntensityCard label="Suave" icon={<HeartPulse className="w-4 h-4" />} color="emerald" description="Ideal para contas novas ou sensíveis. Baixa frequência com progressão lenta." />
                  <IntensityCard label="Moderado" icon={<Gauge className="w-4 h-4" />} color="amber" description="Para contas estáveis. Volume controlado com crescimento gradual." />
                  <IntensityCard label="Intenso" icon={<Zap className="w-4 h-4" />} color="red" description="Somente para contas maduras com histórico comprovadamente limpo." />
                </div>

                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-amber-400">Não existe aquecimento eficaz em 24 horas.</strong> Aquecer é um processo de maturação — tentar acelerar gera restrições.
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex gap-3">
                  <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    A progressão gradual é o que garante estabilidade a longo prazo. Só aumente a intensidade quando a conta estiver comprovadamente estável.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* ───── 4. Diagnóstico e Estado Crítico ───── */}
        <AccordionItem value="diagnostic" className="border-0">
          <Card className="border-border/60 bg-card overflow-hidden rounded-xl shadow-sm">
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3 [&>svg]:text-emerald-500">
              <span className="flex items-center gap-3 text-base font-semibold text-foreground">
                <AlertTriangle className="w-5 h-5 text-emerald-500 shrink-0" />
                Diagnóstico e Estado Crítico
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-4">
                {/* Alerta amarelo */}
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                  <p className="text-sm font-medium text-amber-400 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    A conta não consegue enviar nem 1 mensagem?
                  </p>
                  <p className="text-xs text-muted-foreground">Isso geralmente indica:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Infraestrutura comprometida</li>
                    <li>IP ou proxy com reputação negativa</li>
                    <li>Compartilhamento com contas já restritas</li>
                    <li>Histórico acumulado de infrações</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">Antes de tentar qualquer envio, verifique:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                    <MiniCheck label="IP e reputação" />
                    <MiniCheck label="Proxy e tipo" />
                    <MiniCheck label="Estado do aparelho" />
                    <MiniCheck label="Isolamento de contas" />
                  </div>
                </div>

                {/* Alerta vermelho */}
                <div className="rounded-lg border-2 border-red-500/40 bg-red-500/5 p-4 space-y-3">
                  <p className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <Ban className="w-4 h-4" />
                    Conta em estado crítico
                  </p>
                  <p className="text-xs text-red-300/70">Não force envios. Aplique os seguintes ajustes:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Reduza a intensidade ao mínimo possível</li>
                    <li>Aumente os intervalos entre mensagens</li>
                    <li>Elimine qualquer pico de volume</li>
                    <li>Suspenda envios manuais paralelos</li>
                  </ul>
                  <div className="mt-2 rounded-md border border-red-500/20 bg-red-500/10 p-3">
                    <p className="text-xs text-red-300 font-medium">
                      Objetivo nesta fase: <strong>estabilizar, não escalar.</strong>
                    </p>
                    <p className="text-xs text-red-300/60 mt-1">
                      Forçar envios em número crítico quase sempre resulta em bloqueio permanente.
                    </p>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* ───── Checklist ───── */}
      <Card className="border-border/60 bg-card rounded-xl shadow-sm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Checklist antes de iniciar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { key: "formatted" as const, label: "Aparelho formatado com reset de fábrica" },
              { key: "whatsapp" as const, label: "WhatsApp oficial instalado e verificado" },
              { key: "structure" as const, label: "Infraestrutura de rede validada (IP/Proxy)" },
              { key: "intensity" as const, label: "Intensidade ajustada ao estado da conta" },
              { key: "noMix" as const, label: "Contas restritas isoladas de contas saudáveis" },
            ]).map((item) => (
              <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                <Checkbox
                  checked={checklist[item.key]}
                  onCheckedChange={(v) => setChecklist((prev) => ({ ...prev, [item.key]: !!v }))}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className={`text-sm transition-colors ${checklist[item.key] ? "text-primary line-through" : "text-muted-foreground group-hover:text-foreground"}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ─── Sub-components ─── */

function StepCard({ step, title, icon, children }: { step: number; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/50 dark:bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold">{step}</span>
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function IntensityCard({ label, icon, color, description }: { label: string; icon: React.ReactNode; color: "emerald" | "amber" | "red"; description: string }) {
  const styles = {
    emerald: "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    amber: "border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400",
    red: "border-red-500/40 bg-red-500/10 dark:bg-red-500/5 text-red-600 dark:text-red-400",
  };
  return (
    <div className={`rounded-lg border p-4 space-y-2 ${styles[color]}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function StatusIndicator({ color, label, description }: { color: "emerald" | "amber" | "red"; label: string; description: string }) {
  const styles = {
    emerald: "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/5",
    amber: "border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/5",
    red: "border-red-500/40 bg-red-500/10 dark:bg-red-500/5",
  };
  const dotStyles = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  const textStyles = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${styles[color]}`}>
      <span className={`w-3 h-3 rounded-full ${dotStyles[color]} shrink-0`} />
      <div>
        <p className={`text-sm font-semibold ${textStyles[color]}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function CheckItem({ label, invert }: { label: string; invert?: boolean }) {
  return (
    <div className={`rounded-md border p-2.5 text-xs flex items-center gap-2 ${invert ? "border-red-500/30 bg-red-500/10 dark:bg-red-500/5 text-red-600 dark:text-red-300" : "border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-300"}`}>
      <CircleDot className="w-3 h-3 shrink-0" />
      {label}
    </div>
  );
}

function MiniCheck({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-border/30 bg-muted/30 p-2 text-xs text-muted-foreground flex items-center gap-1.5">
      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
      {label}
    </div>
  );
}

export default CustomModule;
