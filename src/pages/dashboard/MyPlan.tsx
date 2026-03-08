import { Check, X, ArrowRight, Crown, Bell, Zap, Shield, Sparkles, BarChart3, Star, Users } from "lucide-react";

const buildWhatsappUrl = (plan: { name: string; instances: number; price: string }) => {
  const msg = `Olá, tudo bem?\nTenho interesse em contratar o plano DG Contingência – ${plan.name} (${plan.instances} Instâncias) no valor de R$ ${plan.price}/mês.\nPode me enviar os dados para ativação e pagamento?`;
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
    icon: Shield,
  },
  {
    name: "Pro",
    instances: 30,
    price: "349,90",
    description: "Ideal para operadores ativos que precisam de mais capacidade.",
    cta: "Começar agora",
    popular: true,
    reportsIncluded: false,
    icon: Zap,
  },
  {
    name: "Scale",
    instances: 50,
    price: "549,90",
    description: "Para operações em crescimento que precisam de escala e monitoramento.",
    cta: "Escalar operação",
    popular: false,
    reportsIncluded: true,
    icon: BarChart3,
  },
  {
    name: "Elite",
    instances: 100,
    price: "899,90",
    description: "Máxima capacidade operacional para estruturas de alto volume.",
    cta: "Máximo desempenho",
    popular: false,
    reportsIncluded: true,
    icon: Crown,
  },
];

const comparisonRows = [
  { label: "Instâncias", values: ["10", "30", "50", "100"] },
  { label: "Aquecimento automático", values: [true, true, true, true] },
  { label: "Disparo de mensagens", values: [true, true, true, true] },
  { label: "Monitoramento", values: [true, true, true, true] },
  { label: "Relatórios via WhatsApp", values: [false, false, true, true] },
];

const GradientCheck = () => (
  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
    <Check className="w-3 h-3 text-primary" strokeWidth={2.5} />
  </div>
);

const fontDisplay = { fontFamily: "'Plus Jakarta Sans', 'Space Grotesk', system-ui, sans-serif" };

const MyPlan = () => {
  return (
    <div className="min-h-screen pb-24 bg-background -m-2.5 sm:-m-5 md:-m-8">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 space-y-24">

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto pt-14 sm:pt-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border border-primary/20 bg-primary/5 text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            Planos flexíveis para qualquer escala
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-[3.25rem] font-extrabold tracking-tight leading-[1.08] text-foreground" style={fontDisplay}>
            Escalone sua operação de WhatsApp com segurança
          </h1>
          <p className="text-base md:text-lg mt-6 leading-relaxed max-w-lg mx-auto text-muted-foreground">
            Escolha o plano ideal para o tamanho da sua operação. Todos incluem aquecimento inteligente e disparo profissional.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground/60">
            <Users className="w-4 h-4" />
            Mais de 1.200 operadores já usam nossa plataforma
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 lg:gap-5 items-stretch max-w-[1100px] mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative group transition-all duration-300 ease-out rounded-2xl border flex flex-col
                  ${plan.popular
                    ? "border-primary/30 shadow-lg shadow-primary/5 dark:shadow-primary/10 bg-card lg:scale-[1.04] z-10 ring-1 ring-primary/10 mt-2 sm:mt-0"
                    : "border-border/60 bg-card shadow-sm hover:shadow-md dark:shadow-none"
                  }
                  hover:-translate-y-1
                `}
              >
                {/* Badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] px-4 py-1.5 rounded-full text-primary-foreground shadow-lg border border-black/10 dark:border-transparent"
                      style={{
                        background: "linear-gradient(135deg, #00FFA3, #00C2FF)",
                        boxShadow: "0 4px 20px rgba(0,255,163,0.25)",
                      }}>
                      <Star className="w-3 h-3" fill="currentColor" />
                      Mais escolhido
                    </span>
                  </div>
                )}

                <div className="p-6 sm:p-7 pt-8 sm:pt-9 flex flex-col h-full">
                  {/* Plan header */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${plan.popular ? "bg-primary/15" : "bg-muted/60 dark:bg-white/5"}`}>
                      <Icon className={`w-4 h-4 ${plan.popular ? "text-primary" : "text-muted-foreground/60"}`} />
                    </div>
                    <div>
                      <h3 className={`text-[11px] font-bold uppercase tracking-[0.14em] leading-none ${plan.popular ? "text-primary" : "text-muted-foreground/50"}`}>
                        {plan.name}
                      </h3>
                      <p className="font-semibold text-sm mt-0.5 text-foreground">
                        {plan.instances} instâncias
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mt-4 mb-1.5">
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-medium text-muted-foreground/50">R$</span>
                      <span className="text-[2.5rem] sm:text-[2.75rem] font-extrabold tracking-tighter leading-none text-foreground" style={fontDisplay}>
                        {plan.price.split(",")[0]}
                      </span>
                      <span className="text-lg font-bold text-foreground/40">
                        ,{plan.price.split(",")[1]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[13px] text-muted-foreground/45">por mês</span>
                      <span className="text-[10px] text-muted-foreground/30">•</span>
                      <span className="text-[11px] text-muted-foreground/35">Cancele quando quiser</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[13px] leading-relaxed mt-4 mb-6 min-h-[40px] text-muted-foreground/60">
                    {plan.description}
                  </p>

                  {/* CTA */}
                  <a
                    href={buildWhatsappUrl(plan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-3 font-semibold text-[13px] flex items-center justify-center gap-2 mb-6 transition-all duration-200 rounded-xl
                      ${plan.popular
                        ? "text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-black/10 dark:border-transparent"
                        : "bg-muted/40 dark:bg-white/[0.04] text-foreground/80 border border-border/60 hover:bg-muted/70 dark:hover:bg-white/[0.08] hover:border-border"
                      }
                    `}
                    style={plan.popular ? { background: "linear-gradient(135deg, #00FFA3, #00C2FF)" } : {}}
                  >
                    {plan.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>

                  {/* Divider */}
                  <div className="h-px mb-5 bg-border/40" />

                  {/* Features */}
                  <div className="space-y-3.5 flex-1">
                    {FEATURES.map((feature, i) => {
                      const isReport = feature === "Relatórios via WhatsApp";
                      const included = isReport ? plan.reportsIncluded : true;
                      return (
                        <div key={i} className={`flex items-center gap-2.5 text-[12.5px] ${included ? "text-foreground/65" : "text-muted-foreground/20"}`}>
                          {included ? (
                            <GradientCheck />
                          ) : (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-muted/30 dark:bg-white/[0.03]">
                              <X className="w-3 h-3 text-red-400" strokeWidth={2} />
                            </div>
                          )}
                          <span className={!included ? "line-through decoration-muted-foreground/10" : ""}>
                            {feature}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Report highlight */}
                  {plan.reportsIncluded && (
                    <div className="mt-5 px-3.5 py-2.5 rounded-xl bg-primary/[0.04] border border-primary/10">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-primary">
                        <Bell className="w-3.5 h-3.5" />
                        Relatórios WhatsApp incluídos
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison Table */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold flex items-center justify-center gap-2.5 text-foreground" style={fontDisplay}>
              <BarChart3 className="w-5 h-5 text-primary" />
              Comparação rápida
            </h2>
            <p className="text-sm mt-2 text-muted-foreground">
              Veja o que cada plano oferece lado a lado.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card shadow-sm">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="bg-muted/20 dark:bg-white/[0.02]">
                  <th className="text-left px-3 sm:px-5 py-3.5 sm:py-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider w-[120px] sm:w-[200px] text-muted-foreground/50">Recurso</th>
                  {plans.map(p => (
                    <th key={p.name} className={`text-center px-2 sm:px-3 py-3.5 sm:py-4 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${p.popular ? "text-primary" : "text-foreground/50"}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, ri) => (
                  <tr key={ri}
                    className={`transition-colors duration-100 border-t border-border/20 hover:bg-muted/20 dark:hover:bg-white/[0.02] ${ri % 2 === 1 ? "bg-muted/8 dark:bg-white/[0.008]" : ""}`}
                  >
                    <td className="px-3 sm:px-5 py-3 sm:py-3.5 text-[12px] sm:text-[13px] font-medium text-foreground/60">
                      {row.label}
                    </td>
                    {row.values.map((val, vi) => (
                      <td key={vi} className="text-center px-2 sm:px-3 py-3 sm:py-3.5">
                        {typeof val === "boolean" ? (
                          val ? (
                            <Check className="w-4 h-4 mx-auto text-primary" strokeWidth={2.5} />
                          ) : (
                            <X className="w-4 h-4 mx-auto text-red-400" strokeWidth={2} />
                          )
                        ) : (
                          <span className={`text-sm font-bold ${plans[vi].popular ? "text-primary" : "text-foreground/80"}`}>
                            {val}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trust */}
        <div className="flex flex-row items-center justify-center gap-8 sm:gap-12 text-xs text-muted-foreground/40 pb-4">
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
    </div>
  );
};

export default MyPlan;
