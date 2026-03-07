import { Check, X, ArrowRight, Crown, Bell, Zap, Shield, Sparkles, BarChart3, Star } from "lucide-react";
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

const GradientCheck = () => (
  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-primary/15">
    <Check className="w-3 h-3 text-primary" strokeWidth={2.5} />
  </div>
);

const MyPlan = () => {
  return (
    <div className="min-h-screen pb-20 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-20">

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto pt-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border border-primary/15 bg-primary/8 text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            Planos flexíveis para qualquer escala
          </div>
          <h1 className="text-4xl md:text-[3rem] font-extrabold tracking-tight leading-[1.1] text-foreground">
            Escalone sua operação de WhatsApp com segurança
          </h1>
          <p className="text-base md:text-lg mt-5 leading-relaxed max-w-lg mx-auto text-muted-foreground">
            Escolha o plano ideal para o tamanho da sua operação. Todos incluem aquecimento inteligente e disparo profissional.
          </p>
          <p className="mt-4 text-sm font-medium text-muted-foreground/50">
            Mais de 1.200 operadores já usam nossa plataforma
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-5 items-stretch max-w-[1080px] mx-auto overflow-visible pt-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative group rounded-2xl transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl ${
                plan.popular
                  ? "border-2 border-primary shadow-[0_8px_40px_-12px] shadow-primary/15 bg-card lg:scale-[1.03] z-10"
                  : "border border-border bg-card shadow-md hover:shadow-lg hover:border-border/80"
              }`}
            >
              {/* Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
                  style={{ animation: "badgeFloat 3s ease-in-out infinite" }}>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] px-5 py-2 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                    <Star className="w-3 h-3" fill="currentColor" />
                    Mais escolhido
                  </span>
                </div>
              )}

              <div className="p-7 pt-9 flex flex-col h-full">
                {/* Plan name */}
                <h3 className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
                  plan.popular ? "text-primary" : "text-muted-foreground/60"
                }`}>
                  {plan.name}
                </h3>

                {/* Instances */}
                <p className="font-semibold text-base mt-1.5 text-foreground">
                  {plan.instances} instâncias
                </p>

                {/* Price */}
                <div className="mt-6 mb-1">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-medium text-muted-foreground/60">R$</span>
                    <span className="text-[2.75rem] font-extrabold tracking-tighter leading-none text-foreground">
                      {plan.price.split(",")[0]}
                    </span>
                    <span className="text-xl font-bold text-foreground/50">
                      ,{plan.price.split(",")[1]}
                    </span>
                  </div>
                  <span className="text-[13px] text-muted-foreground/50">por mês</span>
                </div>
                <p className="text-[11px] mt-0.5 text-muted-foreground/40">
                  Cancele quando quiser
                </p>

                {/* Description */}
                <p className="text-[13px] leading-relaxed mt-4 mb-7 min-h-[40px] text-muted-foreground/70">
                  {plan.description}
                </p>

                {/* CTA */}
                <a
                  href={buildWhatsappUrl(plan)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-7 transition-all duration-150 hover:-translate-y-0.5 ${
                    plan.popular
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:bg-primary/90"
                      : "bg-muted/50 text-foreground hover:bg-muted border border-border hover:border-border/80"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>

                {/* Divider */}
                <div className="h-px mb-6 bg-border/40" />

                {/* Features */}
                <div className="space-y-4 flex-1">
                  {FEATURES.map((feature, i) => {
                    const isReport = feature === "Relatórios via WhatsApp";
                    const included = isReport ? plan.reportsIncluded : true;
                    return (
                      <div key={i} className={`flex items-center gap-3 text-[13px] ${
                        included ? "text-foreground/75" : "text-muted-foreground/25"
                      }`}>
                        {included ? (
                          <GradientCheck />
                        ) : (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-destructive/10">
                            <X className="w-3 h-3 text-destructive/70" strokeWidth={2.5} />
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
            <h2 className="text-xl font-bold flex items-center justify-center gap-2 text-foreground">
              <BarChart3 className="w-5 h-5 text-primary" />
              Comparação rápida
            </h2>
            <p className="text-sm mt-1.5 text-muted-foreground">
              Veja o que cada plano oferece lado a lado.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wider w-[200px] text-muted-foreground/60">
                    Recurso
                  </th>
                  {plans.map(p => (
                    <th key={p.name} className={`text-center px-3 py-4 text-xs font-bold uppercase tracking-wider ${
                      p.popular ? "text-primary" : "text-foreground/60"
                    }`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, ri) => (
                  <tr key={ri} className={`transition-colors duration-150 border-t border-border/30 hover:bg-muted/20 ${
                    ri % 2 === 1 ? "bg-muted/10" : ""
                  }`}>
                    <td className="px-5 py-3.5 text-[13px] font-medium text-foreground/70">
                      {row.label}
                    </td>
                    {row.values.map((val, vi) => (
                      <td key={vi} className="text-center px-3 py-3.5">
                        {typeof val === "boolean" ? (
                          val ? (
                            <Check className="w-4 h-4 mx-auto text-primary" strokeWidth={2.5} />
                          ) : (
                            <X className="w-4 h-4 mx-auto text-muted-foreground/20" strokeWidth={2.5} />
                          )
                        ) : (
                          <span className={`text-sm font-bold ${plans[vi].popular ? "text-primary" : "text-foreground"}`}>
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

        {/* Addon — Relatórios via WhatsApp */}
        <div className="max-w-md mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-md">
            {/* Addon tag */}
            <div className="absolute top-4 right-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] px-3 py-1 rounded-full bg-primary/8 text-primary border border-primary/15">
                Addon
              </span>
            </div>

            <div className="p-8">
              <div className="flex items-start gap-4 mb-7">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/12">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Relatórios via WhatsApp
                  </h3>
                  <p className="text-[13px] mt-1 leading-relaxed text-muted-foreground">
                    Acompanhe sua operação sem precisar abrir o painel.
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-7">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-sm font-medium text-muted-foreground/60">R$</span>
                  <span className="text-[2rem] font-extrabold tracking-tighter leading-none text-foreground">
                    18
                  </span>
                  <span className="text-lg font-bold text-foreground/50">,90</span>
                </div>
                <p className="text-[12px] mt-0.5 text-muted-foreground/50">por mês</p>
              </div>

              <div className="space-y-4 mb-7">
                {[
                  "Relatórios automáticos de aquecimento",
                  "Notificação quando campanhas iniciam ou finalizam",
                  "Alertas de conexão e desconexão das instâncias",
                  "1 número dedicado apenas para notificações",
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3 text-[13px] text-foreground/75">
                    <GradientCheck />
                    {feat}
                  </div>
                ))}
              </div>

              <p className="text-[11px] mb-6 text-muted-foreground/40">
                Já incluso nos planos Scale e Elite. Disponível separadamente para Start e Pro.
              </p>

              <a
                href={buildAddonWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-150 bg-muted/50 text-foreground hover:bg-muted border border-border hover:border-border/80 hover:-translate-y-0.5"
              >
                Ativar notificações
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
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
    </div>
  );
};

export default MyPlan;
