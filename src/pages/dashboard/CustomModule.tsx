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
  Flame,
  Ban,
  RotateCcw,
  Layers,
  Gauge,
  Clock,
  TrendingUp,
  Search,
  Server,
  Zap,
  HeartPulse,
} from "lucide-react";

const CustomModule = () => {
  const [checklist, setChecklist] = useState({
    formatted: false,
    whatsapp: false,
    structure: false,
    intensity: false,
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Roteiros de Aquecimento</h1>
        <p className="text-sm text-muted-foreground">
          Guia completo para preparar, estruturar e aquecer suas contas com segurança.
        </p>
      </div>

      <Accordion type="multiple" defaultValue={["prep"]} className="space-y-4">
        {/* ───── 1. Preparação do Aparelho ───── */}
        <AccordionItem value="prep" className="border-0">
          <Card className="border-border/40 bg-card overflow-hidden rounded-xl">
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3 [&>svg]:text-emerald-500">
              <span className="flex items-center gap-3 text-base font-semibold text-foreground">
                <Smartphone className="w-5 h-5 text-emerald-500 shrink-0" />
                Preparação do Aparelho
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-6">
                {/* Passo 1 */}
                <StepCard
                  step={1}
                  title="Formatar o celular"
                  icon={<RotateCcw className="w-4 h-4 text-emerald-500" />}
                >
                  <p className="text-sm text-muted-foreground">
                    A formatação remove dados antigos, cookies, caches e possíveis resíduos de uso
                    anterior que podem comprometer a reputação da conta.
                  </p>
                </StepCard>

                {/* Passo 2 */}
                <StepCard
                  step={2}
                  title="Instalar apenas o necessário"
                  icon={<Shield className="w-4 h-4 text-emerald-500" />}
                >
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5">
                    <li>Fazer login na conta Google</li>
                    <li>Baixar o WhatsApp oficial na Play Store</li>
                    <li>Após instalação, remover a conta Google</li>
                    <li>Remover a Play Store se for estratégia operacional</li>
                  </ul>
                </StepCard>

                {/* Passo 3 */}
                <StepCard
                  step={3}
                  title="Tipo de conexão"
                  icon={<Signal className="w-4 h-4 text-emerald-500" />}
                >
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5">
                    <li>Se não houver histórico problemático, pode usar Wi-Fi na instalação</li>
                    <li>Se já houve uso indevido, utilizar 4G</li>
                    <li>Após configuração, priorizar uso em 4G</li>
                  </ul>
                </StepCard>

                {/* Passo 4 */}
                <StepCard
                  step={4}
                  title="Organização de aparelhos"
                  icon={<Layers className="w-4 h-4 text-emerald-500" />}
                >
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5">
                    <li>Evitar múltiplos WhatsApps no mesmo celular</li>
                    <li>Não misturar contas críticas com contas estáveis</li>
                    <li>Evitar cruzamento de dados</li>
                  </ul>
                </StepCard>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* ───── 2. Estrutura e Rede ───── */}
        <AccordionItem value="network" className="border-0">
          <Card className="border-border/40 bg-card overflow-hidden rounded-xl">
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3 [&>svg]:text-emerald-500">
              <span className="flex items-center gap-3 text-base font-semibold text-foreground">
                <Wifi className="w-5 h-5 text-emerald-500 shrink-0" />
                Estrutura e Rede
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-4">
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5">
                  <li>Sempre priorizar conexão estável</li>
                  <li>Usar proxy de qualidade</li>
                  <li>Evitar proxy de data center de baixa qualidade</li>
                  <li>Infraestrutura ruim compromete estabilidade da conta</li>
                </ul>

                {/* Alerta visual */}
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-amber-400">Se houver bloqueio:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Ativar modo avião por alguns minutos</li>
                      <li>Desativar e reativar dados móveis</li>
                    </ul>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* ───── 3. Modelagem do Aquecimento ───── */}
        <AccordionItem value="warmup" className="border-0">
          <Card className="border-border/40 bg-card overflow-hidden rounded-xl">
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3 [&>svg]:text-emerald-500">
              <span className="flex items-center gap-3 text-base font-semibold text-foreground">
                <Activity className="w-5 h-5 text-emerald-500 shrink-0" />
                Modelagem do Aquecimento
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-4">
                {/* Intensidades */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <IntensityCard label="Suave" icon={<HeartPulse className="w-4 h-4" />} color="emerald" />
                  <IntensityCard label="Intermediário" icon={<Gauge className="w-4 h-4" />} color="amber" />
                  <IntensityCard label="Agressivo" icon={<Zap className="w-4 h-4" />} color="red" />
                </div>

                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5">
                  <li>A intensidade deve respeitar o estado da conta</li>
                  <li>Não existe aquecimento real em 24 horas</li>
                  <li>Construção de estabilidade exige progressão gradual</li>
                  <li>Pressa aumenta risco</li>
                </ul>

                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex gap-3">
                  <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    A progressão gradual é a chave para estabilidade a longo prazo. Aumente a
                    intensidade somente quando a conta estiver estável.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* ───── 4. Diagnóstico e Estado Crítico ───── */}
        <AccordionItem value="diagnostic" className="border-0">
          <Card className="border-border/40 bg-card overflow-hidden rounded-xl">
            <AccordionTrigger className="px-5 py-4 hover:no-underline gap-3 [&>svg]:text-emerald-500">
              <span className="flex items-center gap-3 text-base font-semibold text-foreground">
                <AlertTriangle className="w-5 h-5 text-emerald-500 shrink-0" />
                Diagnóstico e Estado Crítico
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5">
              <div className="space-y-4">
                {/* Alerta amarelo */}
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                  <p className="text-sm font-medium text-amber-400 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Se a conta não aguenta enviar 1 mensagem:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Verificar qualidade da estrutura</li>
                    <li>Verificar IP e conexão</li>
                    <li>Verificar ambiente do aparelho</li>
                    <li>Verificar se está misturando contas problemáticas</li>
                  </ul>
                </div>

                {/* Alerta vermelho */}
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-2">
                  <p className="text-sm font-medium text-red-400 flex items-center gap-2">
                    <Ban className="w-4 h-4" />
                    Se estiver em estado crítico:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Reduzir intensidade do soft ao mínimo</li>
                    <li>Aumentar intervalos entre ações</li>
                    <li>Evitar qualquer pico de envio</li>
                    <li>Priorizar estabilização antes de escalar</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* ───── Checklist ───── */}
      <Card className="border-border/40 bg-card rounded-xl">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Checklist de Verificação
          </h2>
          <div className="space-y-3">
            {([
              { key: "formatted" as const, label: "Celular formatado" },
              { key: "whatsapp" as const, label: "WhatsApp oficial instalado" },
              { key: "structure" as const, label: "Estrutura validada" },
              { key: "intensity" as const, label: "Intensidade ajustada corretamente" },
            ]).map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <Checkbox
                  checked={checklist[item.key]}
                  onCheckedChange={(v) =>
                    setChecklist((prev) => ({ ...prev, [item.key]: !!v }))
                  }
                  className="border-border data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <span
                  className={`text-sm transition-colors ${
                    checklist[item.key]
                      ? "text-emerald-400 line-through"
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
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

function StepCard({
  step,
  title,
  icon,
  children,
}: {
  step: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-muted/30 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-500 text-xs font-bold">
          {step}
        </span>
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {/* Placeholder para imagem */}
      <div className="w-full h-28 rounded-md bg-muted/50 border border-dashed border-border/40 flex items-center justify-center text-xs text-muted-foreground">
        Espaço para imagem ilustrativa
      </div>
      {children}
    </div>
  );
}

function IntensityCard({
  label,
  icon,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  color: "emerald" | "amber" | "red";
}) {
  const styles = {
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    red: "border-red-500/30 bg-red-500/5 text-red-400",
  };
  return (
    <div className={`rounded-lg border p-3 flex items-center gap-2 ${styles[color]}`}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export default CustomModule;
