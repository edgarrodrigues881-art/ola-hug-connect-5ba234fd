import { Check, X, ArrowRight, Crown, Bell, Zap, Shield, Sparkles, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const buildWhatsappUrl = (plan: { name: string; instances: number; price: string }) => {
  const msg = `Olá, tudo bem?\nTenho interesse em contratar o plano DG Contingência – ${plan.name} (${plan.instances} Instâncias) no valor de R$ ${plan.price}/mês.\nPode me enviar os dados para ativação e pagamento?`;
  return `https://wa.me/5562994192500?text=${encodeURIComponent(msg)}`;
};

const buildAddonWhatsappUrl = () => {
  const msg = `Olá, tudo bem?\nTenho interesse em contratar o addon Relatórios via WhatsApp no valor de R$ 18,90/mês.\nPode me enviar os dados para ativação?`;
  return `https://wa.me/5562994192500?text=${encodeURIComponent(msg)}`;
};

const FEATURES = [
  "Aquecimento automático inteligente",
  "Disparo de mensagens em massa",
  "Gestão de instâncias",
  "Monitoramento em tempo real",
  "Painel centralizado",
  "Relatórios via WhatsApp",
];

const plans = [
  {
    name: "Start",
    instances: 10,
    price: "149,90",
    description: "Perfeito para quem está iniciando uma operação profissional.",
    cta: "Começar agora",
    popular: false,
    reportsIncluded: false,
  },
  {
    name: "Pro",
    instances: 30,
    price: "349,90",
    description: "Ideal para operadores ativos que precisam de mais capacidade.",
    cta: "Começar agora",
    popular: true,
    reportsIncluded: false,
  },
  {
    name: "Scale",
    instances: 50,
    price: "549,90",
    description: "Para operações em crescimento que precisam de escala e monitoramento.",
    cta: "Escalar operação",
    popular: false,
    reportsIncluded: true,
  },
  {
    name: "Elite",
    instances: 100,
    price: "899,90",
    description: "Máxima capacidade operacional para estruturas de alto volume.",
    cta: "Máximo desempenho",
    popular: false,
    reportsIncluded: true,
  },
];

const comparisonRows = [
  { label: "Instâncias", values: ["10", "30", "50", "100"] },
  { label: "Aquecimento automático", values: [true, true, true, true] },
  { label: "Disparo de mensagens", values: [true, true, true, true] },
  { label: "Monitoramento", values: [true, true, true, true] },
  { label: "Relatórios via WhatsApp", values: [false, false, true, true] },
];

const MyPlan = () => {
  return (
    <div className="space-y-16 pb-12">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Planos flexíveis para qualquer escala
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">
          Escalone sua operação de WhatsApp com segurança
        </h1>
        <p className="text-base text-muted-foreground mt-3 leading-relaxed">
          Escolha o plano ideal para o tamanho da sua operação. Todos incluem aquecimento inteligente e disparo profissional.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative transition-all duration-300 ${
              plan.popular
                ? "border-primary ring-2 ring-primary/15 shadow-2xl shadow-primary/5 lg:scale-105 z-10"
                : "border-border/40 hover:border-border hover:shadow-lg"
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 inset-x-0 h-[3px] bg-primary rounded-t-xl" />
            )}
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 shadow-lg shadow-primary/20">
                  Mais utilizado
                </Badge>
              </div>
            )}
            <CardContent className="p-6 pt-8 flex flex-col h-full">
              {/* Plan name */}
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{plan.name}</h3>

              {/* Instances highlight */}
              <p className="text-foreground font-bold text-lg mt-1">
                {plan.instances} instâncias
              </p>

              {/* Price */}
              <div className="mt-4 mb-1">
                <div className="flex items-baseline">
                  <span className="text-xs text-muted-foreground mr-1">R$</span>
                  <span className="text-4xl font-extrabold text-foreground tracking-tight">{plan.price.split(",")[0]}</span>
                  <span className="text-lg font-bold text-foreground">,{plan.price.split(",")[1]}</span>
                </div>
                <span className="text-xs text-muted-foreground">por mês</span>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground/70 leading-relaxed mt-2 mb-5 min-h-[36px]">
                {plan.description}
              </p>

              {/* CTA */}
              <a
                href={buildWhatsappUrl(plan)}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 mb-6 ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20"
                    : "bg-foreground/5 text-foreground hover:bg-foreground/10 border border-border/60"
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              {/* Divider */}
              <div className="h-px bg-border/30 mb-5" />

              {/* Features */}
              <div className="space-y-3 flex-1">
                {FEATURES.map((feature, i) => {
                  const isReport = feature === "Relatórios via WhatsApp";
                  const included = isReport ? plan.reportsIncluded : true;
                  return (
                    <div key={i} className={`flex items-start gap-2.5 text-[13px] ${
                      included ? "text-foreground/80" : "text-muted-foreground/35"
                    }`}>
                      {included ? (
                        <div className="w-4.5 h-4.5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                          <X className="w-3 h-3 text-muted-foreground/30" />
                        </div>
                      )}
                      <span className={!included ? "line-through" : ""}>
                        {feature}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Report highlight for Scale/Elite */}
              {plan.reportsIncluded && (
                <div className="mt-5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                    <Bell className="w-3.5 h-3.5" />
                    Relatórios WhatsApp incluídos
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Comparação rápida
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Veja o que cada plano oferece lado a lado.</p>
        </div>
        <div className="border border-border/40 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[200px]">Recurso</th>
                {plans.map(p => (
                  <th key={p.name} className={`text-center px-3 py-3 text-xs font-bold uppercase tracking-wider ${
                    p.popular ? "text-primary" : "text-foreground"
                  }`}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {comparisonRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 text-foreground/80 text-[13px] font-medium">{row.label}</td>
                  {row.values.map((val, vi) => (
                    <td key={vi} className="text-center px-3 py-3">
                      {typeof val === "boolean" ? (
                        val ? (
                          <Check className="w-4 h-4 text-primary mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/25 mx-auto" />
                        )
                      ) : (
                        <span className={`text-sm font-bold ${plans[vi].popular ? "text-primary" : "text-foreground"}`}>{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relatórios via WhatsApp */}
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Relatórios via WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md mx-auto">
            Receba alertas automáticos da sua operação diretamente no WhatsApp.
          </p>
        </div>
        <Card className="border-border/40 hover:shadow-xl transition-all">
          <CardContent className="p-7">
            <div className="flex items-start justify-between gap-5 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Relatórios via WhatsApp</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Acompanhe sua operação sem precisar abrir o painel.
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-baseline">
                  <span className="text-xs text-muted-foreground mr-1">R$</span>
                  <span className="text-3xl font-extrabold text-foreground">18</span>
                  <span className="text-lg font-bold text-foreground">,90</span>
                </div>
                <p className="text-[11px] text-muted-foreground">por mês</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {[
                "Relatórios automáticos de aquecimento",
                "Notificação quando campanhas iniciam ou finalizam",
                "Alertas de conexão e desconexão das instâncias",
                "1 número dedicado apenas para notificações",
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2.5 text-[13px] text-foreground/80">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  {feat}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-muted-foreground/50 mb-5">
              Já incluso nos planos Scale e Elite. Disponível separadamente para Start e Pro.
            </p>

            <a
              href={buildAddonWhatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-foreground/5 text-foreground hover:bg-foreground/10 border border-border/60"
            >
              Ativar plano
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Trust */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-xs text-muted-foreground/40">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Sem fidelidade
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Upgrade imediato
        </div>
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4" />
          Garantia de 7 dias
        </div>
      </div>
    </div>
  );
};

export default MyPlan;
