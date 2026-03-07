import { Check, X, ArrowRight, Crown, Bell, Zap, Shield, Sparkles, BarChart3 } from "lucide-react";
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
    <div className="space-y-20 pb-16 max-w-6xl mx-auto px-4">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium mb-5 border border-primary/10">
          <Sparkles className="w-3.5 h-3.5" />
          Planos flexíveis para qualquer escala
        </div>
        <h1 className="text-3xl md:text-[2.5rem] font-bold text-foreground tracking-tight leading-[1.15]">
          Escalone sua operação de WhatsApp com segurança
        </h1>
        <p className="text-base text-muted-foreground mt-4 leading-relaxed max-w-lg mx-auto">
          Escolha o plano ideal para o tamanho da sua operação. Todos incluem aquecimento inteligente e disparo profissional.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-4 items-stretch max-w-5xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative group rounded-2xl transition-all duration-300 ease-out hover:scale-[1.02] ${
              plan.popular
                ? "border-2 border-primary shadow-[0_8px_40px_-12px] shadow-primary/15 bg-card lg:scale-[1.03] z-10"
                : "border border-border/50 shadow-[0_2px_12px_-4px] shadow-foreground/[0.04] bg-card hover:shadow-[0_8px_30px_-8px] hover:shadow-foreground/[0.08] hover:border-border"
            }`}
          >
            {/* Top accent bar */}
            {plan.popular && (
              <div className="absolute top-0 inset-x-0 h-[3px] bg-primary rounded-t-2xl" />
            )}

            {/* Badge */}
            {plan.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-[0.08em] px-4 py-1 shadow-lg shadow-primary/25 rounded-full">
                  Mais utilizado
                </Badge>
              </div>
            )}

            <div className="p-7 pt-9 flex flex-col h-full">
              {/* Plan name */}
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.12em]">{plan.name}</h3>

              {/* Instances */}
              <p className="text-foreground font-semibold text-base mt-1.5">
                {plan.instances} instâncias
              </p>

              {/* Price */}
              <div className="mt-5 mb-1.5">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-sm text-muted-foreground font-medium">R$</span>
                  <span className="text-[2.75rem] font-extrabold text-foreground tracking-tighter leading-none">{plan.price.split(",")[0]}</span>
                  <span className="text-xl font-bold text-foreground/70">,{plan.price.split(",")[1]}</span>
                </div>
                <span className="text-[13px] text-muted-foreground/60">por mês</span>
              </div>

              {/* Description */}
              <p className="text-[13px] text-muted-foreground/70 leading-relaxed mt-2 mb-6 min-h-[40px]">
                {plan.description}
              </p>

              {/* CTA */}
              <a
                href={buildWhatsappUrl(plan)}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 mb-7 ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25"
                    : "bg-foreground/[0.04] text-foreground hover:bg-foreground/[0.08] border border-border/60 hover:border-border"
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>

              {/* Divider */}
              <div className="h-px bg-border/25 mb-6" />

              {/* Features */}
              <div className="space-y-3.5 flex-1">
                {FEATURES.map((feature, i) => {
                  const isReport = feature === "Relatórios via WhatsApp";
                  const included = isReport ? plan.reportsIncluded : true;
                  return (
                    <div key={i} className={`flex items-center gap-3 text-[13px] ${
                      included ? "text-foreground/75" : "text-muted-foreground/30"
                    }`}>
                      {included ? (
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-primary" strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center shrink-0">
                          <X className="w-3 h-3 text-muted-foreground/25" strokeWidth={2.5} />
                        </div>
                      )}
                      <span className={!included ? "line-through decoration-muted-foreground/20" : ""}>
                        {feature}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Report highlight */}
              {plan.reportsIncluded && (
                <div className="mt-6 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-primary">
                    <Bell className="w-3.5 h-3.5" />
                    Relatórios WhatsApp incluídos
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Comparação rápida
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">Veja o que cada plano oferece lado a lado.</p>
        </div>
        <div className="border border-border/40 rounded-2xl overflow-hidden shadow-[0_2px_12px_-4px] shadow-foreground/[0.03]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/20">
                <th className="text-left px-5 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[200px]">Recurso</th>
                {plans.map(p => (
                  <th key={p.name} className={`text-center px-3 py-4 text-xs font-bold uppercase tracking-wider ${
                    p.popular ? "text-primary" : "text-foreground/70"
                  }`}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {comparisonRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-muted/5 transition-colors">
                  <td className="px-5 py-3.5 text-foreground/75 text-[13px] font-medium">{row.label}</td>
                  {row.values.map((val, vi) => (
                    <td key={vi} className="text-center px-3 py-3.5">
                      {typeof val === "boolean" ? (
                        val ? (
                          <Check className="w-4 h-4 text-primary mx-auto" strokeWidth={2.5} />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/20 mx-auto" strokeWidth={2.5} />
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
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Relatórios via WhatsApp
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-md mx-auto">
            Receba alertas automáticos da sua operação diretamente no WhatsApp.
          </p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card shadow-[0_2px_16px_-4px] shadow-foreground/[0.04] hover:shadow-[0_8px_30px_-8px] hover:shadow-foreground/[0.08] transition-all duration-300 p-8">
          <div className="flex items-start justify-between gap-5 mb-7">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/8 border border-primary/10 flex items-center justify-center shrink-0">
                <Bell className="w-5.5 h-5.5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Relatórios via WhatsApp</h3>
                <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                  Acompanhe sua operação sem precisar abrir o painel.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-baseline gap-0.5">
                <span className="text-sm text-muted-foreground font-medium">R$</span>
                <span className="text-[2rem] font-extrabold text-foreground tracking-tighter leading-none">18</span>
                <span className="text-lg font-bold text-foreground/70">,90</span>
              </div>
              <p className="text-[12px] text-muted-foreground/60 mt-0.5">por mês</p>
            </div>
          </div>

          <div className="space-y-3.5 mb-7">
            {[
              "Relatórios automáticos de aquecimento",
              "Notificação quando campanhas iniciam ou finalizam",
              "Alertas de conexão e desconexão das instâncias",
              "1 número dedicado apenas para notificações",
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-3 text-[13px] text-foreground/75">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-primary" strokeWidth={2.5} />
                </div>
                {feat}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground/45 mb-6">
            Já incluso nos planos Scale e Elite. Disponível separadamente para Start e Pro.
          </p>

          <a
            href={buildAddonWhatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 bg-foreground/[0.04] text-foreground hover:bg-foreground/[0.08] border border-border/60 hover:border-border"
          >
            Ativar plano
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Trust */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-10 text-xs text-muted-foreground/35">
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
