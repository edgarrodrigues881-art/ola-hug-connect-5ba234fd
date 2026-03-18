import { Check, X, ArrowRight, Crown, Bell, Zap, Shield, Sparkles, BarChart3, Lock, Activity, TrendingUp } from "lucide-react";

const buildWhatsappUrl = (plan: { name: string; instances: number; price: string }) => {
  const msg = `Olá, tudo bem?\nTenho interesse em contratar o plano DG Contingência – ${plan.name} (${plan.instances} Instâncias) no valor de R$ ${plan.price}/mês.\nPode me enviar os dados para ativação e pagamento?`;
  return `https://wa.me/5562994192500?text=${encodeURIComponent(msg)}`;
};

const buildAddonWhatsappUrl = () => {
  const msg = `Olá, tudo bem?\nTenho interesse em contratar o addon Relatórios via WhatsApp no valor de R$ 18,90/mês.\nPode me enviar os dados para ativação?`;
  return `https://wa.me/5562994192500?text=${encodeURIComponent(msg)}`;
};

const plans = [
  {
    name: "Start",
    instances: 10,
    price: "149,90",
    perInstance: "14,99",
    subtitle: "Ideal para quem está começando com estrutura profissional.",
    extraCopy: null,
    cta: "Começar agora",
    popular: false,
    reportsIncluded: false,
    features: ["Aquecimento automatizado incluso", "Disparador interativo incluso", "Painel centralizado", "Monitoramento em tempo real", "Suporte padrão"],
  },
  {
    name: "Pro",
    instances: 30,
    price: "349,90",
    perInstance: "11,66",
    subtitle: "Estrutura ideal para operadores ativos.",
    extraCopy: "Plano mais escolhido por operadores ativos.",
    cta: "Começar agora",
    popular: true,
    reportsIncluded: false,
    features: ["Aquecimento automatizado incluso", "Disparador interativo incluso", "Gestão avançada de instâncias", "Monitoramento completo", "Suporte prioritário"],
  },
  {
    name: "Scale",
    instances: 50,
    price: "549,90",
    perInstance: "10,99",
    subtitle: "Para operações em crescimento que precisam de volume e estabilidade.",
    extraCopy: null,
    cta: "Escalar operação",
    popular: false,
    reportsIncluded: true,
    features: ["Aquecimento automatizado incluso", "Disparador interativo incluso", "Gestão avançada", "Monitoramento em tempo real", "Suporte prioritário"],
  },
  {
    name: "Elite",
    instances: 100,
    price: "899,90",
    perInstance: "8,99",
    subtitle: "Máxima capacidade operacional.",
    extraCopy: "Indicado para estruturas robustas com alto volume e suporte dedicado.",
    cta: "Máximo desempenho",
    popular: false,
    reportsIncluded: true,
    features: ["Aquecimento automatizado incluso", "Disparador interativo incluso", "Gestão completa de instâncias", "Monitoramento avançado", "Atendimento prioritário dedicado"],
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
    <div className="min-h-screen pb-24 -m-2.5 sm:-m-5 md:-m-8" style={{ background: '#080b0e' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 space-y-20">

        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto pt-14 sm:pt-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border border-amber-500/20 bg-amber-500/5 text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            Planos flexíveis para qualquer escala
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight leading-[1.15] text-white">
            Escolha o plano ideal para escalar sua operação com estabilidade
          </h1>
          <p className="text-sm sm:text-base mt-5 leading-relaxed max-w-lg mx-auto text-white/30">
            Todos os planos incluem aquecimento automatizado, disparador inteligente e monitoramento em tempo real.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl ${
                plan.popular
                  ? "border border-amber-500/30"
                  : "border border-white/[0.06]"
              }`}
            >
              <div
                className={`relative flex flex-col rounded-2xl p-7 sm:p-8 h-full ${
                  plan.popular ? "bg-[#0d1318]" : "bg-[#0f1419]"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-bold uppercase tracking-widest px-5 py-1.5 rounded-full whitespace-nowrap shadow-[0_0_20px_-4px_rgba(245,158,11,0.5)]">
                    ⭐ Mais Escolhido
                  </span>
                )}

                <h3 className="text-xl font-semibold mt-1 text-white/90">{plan.name}</h3>
                <p className="text-sm text-white/30 mb-1">{plan.instances} instâncias</p>
                <p className="text-xs text-white/20 mb-1 leading-relaxed">{plan.subtitle}</p>
                {plan.extraCopy && (
                  <p className="text-xs text-amber-400/60 mb-4 leading-relaxed">{plan.extraCopy}</p>
                )}
                {!plan.extraCopy && <div className="mb-3" />}

                <div className="mb-2">
                  <span className="text-4xl font-bold text-white/90">R$ {plan.price}</span>
                  <span className="text-white/20 text-base"> / mês</span>
                </div>

                <div className="h-px bg-white/[0.05] mb-7" />

                <div className="space-y-3.5 mb-8 flex-1">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-3 text-sm text-white/40">
                      <Check className="w-4 h-4 min-w-[16px] min-h-[16px] text-white/20 shrink-0" />
                      {f}
                    </div>
                  ))}

                  {/* Report line */}
                  <div className={`flex items-center gap-3 text-sm ${plan.reportsIncluded ? "text-white/40" : "text-white/15"}`}>
                    {plan.reportsIncluded ? (
                      <Check className="w-4 h-4 min-w-[16px] min-h-[16px] text-emerald-500/60 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 min-w-[16px] min-h-[16px] text-red-400/40 shrink-0" />
                    )}
                    <span className={!plan.reportsIncluded ? "line-through decoration-white/10" : ""}>
                      Relatórios WhatsApp {plan.reportsIncluded ? "incluso" : `+ R$ 18,90/mês`}
                    </span>
                  </div>
                </div>

                <a
                  href={buildWhatsappUrl(plan)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3.5 rounded-lg font-medium text-base flex items-center justify-center gap-2 transition-all duration-200 ${
                    plan.popular
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:from-amber-400 hover:to-yellow-400 shadow-[0_0_20px_-4px_rgba(245,158,11,0.4)]"
                      : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border border-white/[0.06]"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Addon - Relatórios via WhatsApp */}
        <div className="max-w-xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0f1419]">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 border border-amber-500/15">
                  <Bell className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white/90 mb-1">
                    Relatórios via WhatsApp
                  </h3>
                  <p className="text-xs text-white/30 leading-relaxed">
                    Receba relatórios automáticos e alertas direto no WhatsApp. Já incluso nos planos Scale e Elite.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xs font-medium text-white/30">R$</span>
                  <span className="text-2xl font-extrabold tracking-tighter leading-none text-white/90">18</span>
                  <span className="text-sm font-bold text-white/30">,90</span>
                  <span className="text-[10px] text-white/20 ml-0.5">/mês</span>
                </div>
                <a
                  href={buildAddonWhatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto sm:ml-0 px-5 py-2.5 font-semibold text-xs flex items-center gap-2 transition-all duration-200 rounded-xl bg-white/[0.05] text-white/60 border border-white/[0.06] hover:bg-white/[0.08]"
                >
                  Ativar
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold flex items-center justify-center gap-2.5 text-white/90">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              Comparação rápida
            </h2>
            <p className="text-sm mt-2 text-white/30">
              Veja o que cada plano oferece lado a lado.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#0f1419] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="text-left px-3 sm:px-5 py-3.5 sm:py-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider w-[120px] sm:w-[200px] text-white/30">Recurso</th>
                  {plans.map(p => (
                    <th key={p.name} className={`text-center px-2 sm:px-3 py-3.5 sm:py-4 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${p.popular ? "text-amber-400" : "text-white/40"}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, ri) => (
                  <tr key={ri}
                    className={`transition-colors duration-100 border-t border-white/[0.04] hover:bg-white/[0.02] ${ri % 2 === 1 ? "bg-white/[0.01]" : ""}`}
                  >
                    <td className="px-3 sm:px-5 py-3 sm:py-3.5 text-[12px] sm:text-[13px] font-medium text-white/40">
                      {row.label}
                    </td>
                    {row.values.map((val, vi) => (
                      <td key={vi} className="text-center px-2 sm:px-3 py-3 sm:py-3.5">
                        {typeof val === "boolean" ? (
                          val ? (
                            <Check className="w-4 h-4 mx-auto text-emerald-500/60" strokeWidth={2.5} />
                          ) : (
                            <X className="w-4 h-4 mx-auto text-red-400/40" strokeWidth={2} />
                          )
                        ) : (
                          <span className={`text-sm font-bold ${plans[vi].popular ? "text-amber-400" : "text-white/70"}`}>
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

        {/* Trust badges */}
        <div className="space-y-6 pb-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-white/30">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-500/50" />
              Sem fidelidade
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-500/50" />
              Upgrade imediato
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-500/50" />
              Garantia de 7 dias
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-10 text-sm text-white/20">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              Infraestrutura segura
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 flex-shrink-0" />
              Operação estável
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 flex-shrink-0" />
              Monitoramento contínuo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPlan;
