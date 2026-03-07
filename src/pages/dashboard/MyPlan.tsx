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

const GradientCheck = ({ className = "" }: { className?: string }) => (
  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${className}`}
    style={{ background: "linear-gradient(135deg, rgba(0,255,163,0.15), rgba(0,194,255,0.15))" }}>
    <Check className="w-3 h-3" strokeWidth={2.5}
      style={{ color: "#00deb3" }} />
  </div>
);

const MyPlan = () => {
  return (
    <div className="min-h-screen pb-20 bg-background -m-2.5 sm:-m-5 md:-m-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-20">

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto pt-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border"
            style={{
              background: "linear-gradient(135deg, rgba(0,255,163,0.08), rgba(0,194,255,0.08))",
              borderColor: "rgba(0,255,163,0.15)",
              color: "#00deb3"
            }}>
            <Sparkles className="w-3.5 h-3.5" />
            Planos flexíveis para qualquer escala
          </div>
          <h1 className="text-4xl md:text-[3rem] font-extrabold tracking-tight leading-[1.1] text-foreground"
            style={{ fontFamily: "'Plus Jakarta Sans', 'Space Grotesk', system-ui, sans-serif" }}>
            Escalone sua operação de WhatsApp com segurança
          </h1>
          <p className="text-base md:text-lg mt-5 leading-relaxed max-w-lg mx-auto text-muted-foreground">
            Escolha o plano ideal para o tamanho da sua operação. Todos incluem aquecimento inteligente e disparo profissional.
          </p>
          <p className="mt-4 text-sm font-medium text-muted-foreground/60">
            Mais de 1.200 operadores já usam nossa plataforma
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-5 items-stretch max-w-[1080px] mx-auto lg:overflow-visible overflow-x-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="relative group transition-all duration-200 ease-out"
              style={{
                borderRadius: "16px",
                background: plan.popular ? "#141b24" : "#11161C",
                border: plan.popular ? "none" : "1px solid rgba(255,255,255,0.08)",
                boxShadow: plan.popular
                  ? "0 10px 40px rgba(0,0,0,0.45), 0 0 0 1.5px rgba(0,255,163,0.25)"
                  : "0 10px 30px rgba(0,0,0,0.35)",
                transform: plan.popular ? "scale(1.05)" : "scale(1)",
                zIndex: plan.popular ? 10 : 1,
              }}
              onMouseEnter={(e) => {
                if (!plan.popular) {
                  e.currentTarget.style.transform = "scale(1.02) translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 20px 50px rgba(0,0,0,0.5)";
                } else {
                  e.currentTarget.style.transform = "scale(1.07) translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,163,0.12), 0 0 0 1.5px rgba(0,255,163,0.35)";
                }
              }}
              onMouseLeave={(e) => {
                if (!plan.popular) {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
                } else {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow = "0 10px 40px rgba(0,0,0,0.45), 0 0 0 1.5px rgba(0,255,163,0.25)";
                }
              }}
            >
              {/* Gradient border for popular */}
              {plan.popular && (
                <div className="absolute inset-0 rounded-[16px] pointer-events-none"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,255,163,0.2), rgba(0,194,255,0.1), transparent)",
                    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                    padding: "1.5px",
                  }} />
              )}

              {/* Badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] px-4 py-1.5 rounded-full"
                    style={{
                      background: "linear-gradient(135deg, #00FFA3, #00C2FF)",
                      color: "#0B0F13",
                      boxShadow: "0 4px 20px rgba(0,255,163,0.3)",
                    }}>
                    <Star className="w-3 h-3" fill="currentColor" />
                    Mais escolhido
                  </span>
                </div>
              )}

              <div className="p-7 pt-9 flex flex-col h-full">
                {/* Plan name */}
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: plan.popular ? "#00deb3" : "rgba(148,163,184,0.6)" }}>
                  {plan.name}
                </h3>

                {/* Instances */}
                <p className="font-semibold text-base mt-1.5" style={{ color: "#E2E8F0" }}>
                  {plan.instances} instâncias
                </p>

                {/* Price */}
                <div className="mt-6 mb-1">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-medium" style={{ color: "rgba(148,163,184,0.6)" }}>R$</span>
                    <span className="text-[2.75rem] font-extrabold tracking-tighter leading-none"
                      style={{
                        fontFamily: "'Plus Jakarta Sans', 'Space Grotesk', system-ui, sans-serif",
                        color: "#F1F5F9",
                      }}>
                      {plan.price.split(",")[0]}
                    </span>
                    <span className="text-xl font-bold" style={{ color: "rgba(241,245,249,0.5)" }}>
                      ,{plan.price.split(",")[1]}
                    </span>
                  </div>
                  <span className="text-[13px]" style={{ color: "rgba(148,163,184,0.45)" }}>por mês</span>
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(148,163,184,0.35)" }}>
                  Cancele quando quiser
                </p>

                {/* Description */}
                <p className="text-[13px] leading-relaxed mt-4 mb-7 min-h-[40px]"
                  style={{ color: "rgba(148,163,184,0.55)" }}>
                  {plan.description}
                </p>

                {/* CTA */}
                <a
                  href={buildWhatsappUrl(plan)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 font-semibold text-sm flex items-center justify-center gap-2 mb-7 transition-all duration-150"
                  style={{
                    borderRadius: "12px",
                    ...(plan.popular
                      ? {
                          background: "linear-gradient(135deg, #00FFA3, #00C2FF)",
                          color: "#0B0F13",
                          boxShadow: "0 4px 20px rgba(0,255,163,0.2)",
                        }
                      : {
                          background: "rgba(255,255,255,0.05)",
                          color: "#E2E8F0",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }),
                  }}
                  onMouseEnter={(e) => {
                    if (plan.popular) {
                      e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,255,163,0.35)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    } else {
                      e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.popular) {
                      e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,255,163,0.2)";
                      e.currentTarget.style.transform = "translateY(0)";
                    } else {
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    }
                  }}
                >
                  {plan.cta}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>

                {/* Divider */}
                <div className="h-px mb-6" style={{ background: "rgba(255,255,255,0.06)" }} />

                {/* Features */}
                <div className="space-y-4 flex-1">
                  {FEATURES.map((feature, i) => {
                    const isReport = feature === "Relatórios via WhatsApp";
                    const included = isReport ? plan.reportsIncluded : true;
                    return (
                      <div key={i} className="flex items-center gap-3 text-[13px]"
                        style={{ color: included ? "rgba(226,232,240,0.7)" : "rgba(148,163,184,0.2)" }}>
                        {included ? (
                          <GradientCheck />
                        ) : (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: "rgba(255,255,255,0.04)" }}>
                            <X className="w-3 h-3" strokeWidth={2.5} style={{ color: "rgba(148,163,184,0.2)" }} />
                          </div>
                        )}
                        <span className={!included ? "line-through" : ""} style={!included ? { textDecorationColor: "rgba(148,163,184,0.15)" } : {}}>
                          {feature}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Report highlight */}
                {plan.reportsIncluded && (
                  <div className="mt-6 px-4 py-2.5 rounded-xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,255,163,0.06), rgba(0,194,255,0.04))",
                      border: "1px solid rgba(0,255,163,0.1)",
                    }}>
                    <div className="flex items-center gap-2 text-[11px] font-semibold"
                      style={{ color: "#00deb3" }}>
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
            <h2 className="text-xl font-bold flex items-center justify-center gap-2 text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', 'Space Grotesk', system-ui, sans-serif" }}>
              <BarChart3 className="w-5 h-5" style={{ color: "#00deb3" }} />
              Comparação rápida
            </h2>
            <p className="text-sm mt-1.5 text-muted-foreground">
              Veja o que cada plano oferece lado a lado.
            </p>
          </div>
          <div className="overflow-hidden"
            style={{
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#11161C",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  <th className="text-left px-5 py-4 text-xs font-semibold uppercase tracking-wider w-[200px]"
                    style={{ color: "rgba(148,163,184,0.5)" }}>Recurso</th>
                  {plans.map(p => (
                    <th key={p.name} className="text-center px-3 py-4 text-xs font-bold uppercase tracking-wider"
                      style={{ color: p.popular ? "#00deb3" : "rgba(226,232,240,0.6)" }}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, ri) => (
                  <tr key={ri}
                    className="transition-colors duration-150"
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                      background: ri % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ri % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent"; }}
                  >
                    <td className="px-5 py-3.5 text-[13px] font-medium" style={{ color: "rgba(226,232,240,0.65)" }}>
                      {row.label}
                    </td>
                    {row.values.map((val, vi) => (
                      <td key={vi} className="text-center px-3 py-3.5">
                        {typeof val === "boolean" ? (
                          val ? (
                            <Check className="w-4 h-4 mx-auto" strokeWidth={2.5} style={{ color: "#00deb3" }} />
                          ) : (
                            <X className="w-4 h-4 mx-auto" strokeWidth={2.5} style={{ color: "rgba(148,163,184,0.15)" }} />
                          )
                        ) : (
                          <span className="text-sm font-bold"
                            style={{ color: plans[vi].popular ? "#00deb3" : "#E2E8F0" }}>
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
          <div className="relative overflow-hidden"
            style={{
              borderRadius: "16px",
              background: "#11161C",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}>
            {/* Addon tag */}
            <div className="absolute top-4 right-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] px-3 py-1 rounded-full"
                style={{
                  background: "rgba(0,255,163,0.08)",
                  color: "#00deb3",
                  border: "1px solid rgba(0,255,163,0.15)",
                }}>
                Addon
              </span>
            </div>

            <div className="p-8">
              <div className="flex items-start gap-4 mb-7">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,255,163,0.1), rgba(0,194,255,0.08))",
                    border: "1px solid rgba(0,255,163,0.12)",
                  }}>
                  <Bell className="w-5 h-5" style={{ color: "#00deb3" }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "#F1F5F9", fontFamily: "'Plus Jakarta Sans', 'Space Grotesk', system-ui, sans-serif" }}>
                    Relatórios via WhatsApp
                  </h3>
                  <p className="text-[13px] mt-1 leading-relaxed" style={{ color: "rgba(148,163,184,0.6)" }}>
                    Acompanhe sua operação sem precisar abrir o painel.
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-7">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-sm font-medium" style={{ color: "rgba(148,163,184,0.6)" }}>R$</span>
                  <span className="text-[2rem] font-extrabold tracking-tighter leading-none"
                    style={{ color: "#F1F5F9", fontFamily: "'Plus Jakarta Sans', 'Space Grotesk', system-ui, sans-serif" }}>
                    18
                  </span>
                  <span className="text-lg font-bold" style={{ color: "rgba(241,245,249,0.5)" }}>,90</span>
                </div>
                <p className="text-[12px] mt-0.5" style={{ color: "rgba(148,163,184,0.4)" }}>por mês</p>
              </div>

              <div className="space-y-4 mb-7">
                {[
                  "Relatórios automáticos de aquecimento",
                  "Notificação quando campanhas iniciam ou finalizam",
                  "Alertas de conexão e desconexão das instâncias",
                  "1 número dedicado apenas para notificações",
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-3 text-[13px]" style={{ color: "rgba(226,232,240,0.7)" }}>
                    <GradientCheck />
                    {feat}
                  </div>
                ))}
              </div>

              <p className="text-[11px] mb-6" style={{ color: "rgba(148,163,184,0.35)" }}>
                Já incluso nos planos Scale e Elite. Disponível separadamente para Start e Pro.
              </p>

              <a
                href={buildAddonWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-150"
                style={{
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.05)",
                  color: "#E2E8F0",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }}
              >
                Ativar notificações
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Trust */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-10 text-xs text-muted-foreground/50">
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
