import { Check, X, ArrowRight, Crown, Bell, Zap, Shield, Sparkles, BarChart3, Lock, Activity, TrendingUp, MessageSquare, Bot } from "lucide-react";

const buildWhatsappUrl = (plan: { name: string; instances: number | string; price: string }) => {
  const inst = typeof plan.instances === "number" ? plan.instances : plan.instances;
  const msg = `Olá, tudo bem?\nTenho interesse em contratar o plano DG Contingência – ${plan.name} (${inst} Instâncias) no valor de R$ ${plan.price}/mês.\nPode me enviar os dados para ativação e pagamento?`;
  return `https://wa.me/5562994192500?text=${encodeURIComponent(msg)}`;
};

const buildCustomWhatsappUrl = () => {
  const msg = `Olá, quero um plano customizado para alta escala`;
  return `https://wa.me/5562994192500?text=${encodeURIComponent(msg)}`;
};

const buildAddonWhatsappUrl = () => {
  const msg = `Olá, tudo bem?\nTenho interesse em contratar o addon Relatórios via WhatsApp no valor de R$ 18,90/mês.\nPode me enviar os dados para ativação?`;
  return `https://wa.me/5562994192500?text=${encodeURIComponent(msg)}`;
};

const buildAutoReplyAddonUrl = (tier: string, price: string) => {
  const msg = `Olá, tudo bem?\nTenho interesse em contratar o addon Resposta Automática Inteligente – ${tier} no valor de R$ ${price}/mês.\nPode me enviar os dados para ativação?`;
  return `https://wa.me/5562994192500?text=${encodeURIComponent(msg)}`;
};

const plans = [
  {
    name: "Essencial",
    instances: 5,
    price: "89,90",
    subtitle: "Ideal para quem está iniciando e quer aquecer chips com segurança e estrutura profissional desde o início.",
    extraCopy: null,
    cta: "Começar agora",
    popular: false,
    highlight: false,
    reportsIncluded: false,
    features: ["Aquecimento automatizado", "Disparo interativo", "Monitoramento básico", "Suporte padrão"],
  },
  {
    name: "Start",
    instances: 10,
    price: "159,90",
    subtitle: "Para quem já validou a operação e precisa dobrar capacidade com estabilidade.",
    extraCopy: "Melhor custo-benefício inicial",
    cta: "Começar agora",
    popular: false,
    highlight: false,
    reportsIncluded: false,
    features: ["Tudo do Essencial", "Painel centralizado", "Monitoramento em tempo real"],
  },
  {
    name: "Pro",
    instances: 30,
    price: "349,90",
    subtitle: "Estrutura ideal para operadores ativos que precisam escalar com consistência.",
    extraCopy: "Plano mais escolhido por operadores ativos",
    cta: "Escalar operação",
    popular: true,
    highlight: false,
    reportsIncluded: false,
    features: ["Tudo do Start", "Gestão avançada de instâncias", "Monitoramento completo", "Suporte prioritário"],
  },
  {
    name: "Scale",
    instances: 50,
    price: "549,90",
    subtitle: "Para operações em crescimento que exigem volume com estabilidade.",
    extraCopy: null,
    cta: "Escalar operação",
    popular: false,
    highlight: false,
    reportsIncluded: true,
    features: ["Tudo do Pro", "Gestão avançada", "Monitoramento em tempo real", "Suporte prioritário"],
  },
  {
    name: "Elite",
    instances: 100,
    price: "999,90",
    subtitle: "Infraestrutura para operações de alto volume com máxima estabilidade e prioridade de processamento.",
    extraCopy: "Alto desempenho e prioridade",
    cta: "Máximo desempenho",
    popular: false,
    highlight: true,
    reportsIncluded: true,
    features: ["Tudo do Scale", "Gestão completa de instâncias", "Monitoramento avançado", "Atendimento prioritário dedicado"],
  },
  {
    name: "Custom",
    instances: "200+",
    price: "Sob consulta",
    subtitle: "Soluções personalizadas para operações de grande escala com necessidades específicas.",
    extraCopy: null,
    cta: "Falar com suporte",
    popular: false,
    highlight: false,
    reportsIncluded: true,
    isCustom: true,
    features: ["Tudo do Elite", "Instâncias ilimitadas", "Infraestrutura dedicada", "Suporte VIP"],
  },
];

const comparisonRows = [
  { label: "Instâncias", values: ["5", "10", "30", "50", "100", "200+"] },
  { label: "Aquecimento automático", values: [true, true, true, true, true, true] },
  { label: "Disparo de mensagens", values: [true, true, true, true, true, true] },
  { label: "Monitoramento", values: ["Básico", "Tempo real", "Completo", "Tempo real", "Avançado", "Avançado"] },
  { label: "Relatórios via WhatsApp", values: [false, false, false, true, true, true] },
  { label: "Suporte prioritário", values: [false, false, true, true, true, true] },
];

const MyPlan = () => {
  return (
    <div className="min-h-screen pb-24 -m-2.5 sm:-m-5 md:-m-8" style={{ background: '#080b0e' }}>
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 space-y-20">

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

        {/* Plans Grid - 6 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-stretch">
          {plans.map((plan) => {
            const isCustom = "isCustom" in plan && plan.isCustom;
            return (
              <div
                key={plan.name}
                className={`group relative flex flex-col rounded-2xl transition-all duration-200 ${
                  plan.popular
                    ? "border border-amber-500/30 hover:border-amber-500/50 hover:shadow-[0_0_30px_-8px_rgba(245,158,11,0.25)]"
                    : plan.highlight
                    ? "border border-white/[0.10] hover:border-white/[0.18] hover:shadow-[0_0_20px_-8px_rgba(255,255,255,0.08)]"
                    : "border border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                <div
                  className={`relative flex flex-col rounded-2xl p-5 sm:p-6 h-full ${
                    plan.popular ? "bg-[#0d1318]" : plan.highlight ? "bg-[#101820]" : "bg-[#0f1419]"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full whitespace-nowrap shadow-[0_0_20px_-4px_rgba(245,158,11,0.5)]">
                      ⭐ Mais Escolhido
                    </span>
                  )}

                  <h3 className="text-lg font-semibold mt-1 text-white/90">{plan.name}</h3>
                  <p className="text-xs text-white/30 mb-1">
                    {typeof plan.instances === "number" ? `${plan.instances} instâncias` : `${plan.instances} instâncias`}
                  </p>
                  <p className="text-[11px] text-white/20 mb-1 leading-relaxed min-h-[36px]">{plan.subtitle}</p>
                  {plan.extraCopy && (
                    <p className={`text-[11px] mb-3 leading-relaxed ${plan.popular ? "text-amber-400/60" : plan.highlight ? "text-teal-400/50" : "text-emerald-400/50"}`}>
                      {plan.extraCopy}
                    </p>
                  )}
                  {!plan.extraCopy && <div className="mb-2" />}

                  <div className="mb-2">
                    {isCustom ? (
                      <span className="text-2xl font-bold text-white/90">Sob consulta</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-white/90">R$ {plan.price}</span>
                        <span className="text-white/20 text-sm"> / mês</span>
                      </>
                    )}
                  </div>

                  <div className="h-px bg-white/[0.05] mb-5" />

                  <div className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f, fi) => (
                      <div key={fi} className="flex items-start gap-2.5 text-xs text-white/40">
                        <Check className="w-3.5 h-3.5 min-w-[14px] min-h-[14px] text-white/20 shrink-0 mt-0.5" />
                        {f}
                      </div>
                    ))}

                    {/* Report line */}
                    <div className={`flex items-start gap-2.5 text-xs ${plan.reportsIncluded ? "text-white/40" : "text-white/15"}`}>
                      {plan.reportsIncluded ? (
                        <Check className="w-3.5 h-3.5 min-w-[14px] min-h-[14px] text-emerald-500/60 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-3.5 h-3.5 min-w-[14px] min-h-[14px] text-red-400/40 shrink-0 mt-0.5" />
                      )}
                      <span className={!plan.reportsIncluded ? "line-through decoration-white/10" : ""}>
                        Relatórios WhatsApp {plan.reportsIncluded ? "incluso" : `+ R$ 18,90`}
                      </span>
                    </div>
                  </div>

                  <a
                    href={isCustom ? buildCustomWhatsappUrl() : buildWhatsappUrl(plan as any)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] hover:scale-[1.02] ${
                      plan.popular
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:from-amber-400 hover:to-yellow-400 shadow-[0_0_20px_-4px_rgba(245,158,11,0.4)]"
                        : plan.highlight
                        ? "bg-white/[0.08] text-white/70 hover:bg-white/[0.12] border border-white/[0.10]"
                        : "bg-white/[0.05] text-white/60 hover:bg-white/[0.08] border border-white/[0.06]"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 flex-shrink-0" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Addons Section */}
        <div className="space-y-6">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold text-white/90 flex items-center justify-center gap-2">
              <Zap className="w-4.5 h-4.5 text-amber-400" />
              Add-ons
            </h2>
            <p className="text-xs text-white/30 mt-1">Potencialize sua operação com módulos extras.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Addon 1: Relatórios via WhatsApp */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0f1419] hover:border-white/[0.12] transition-all duration-200">
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 border border-amber-500/15">
                    <Bell className="w-4.5 h-4.5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/90 mb-0.5">Relatórios via WhatsApp</h3>
                    <p className="text-[11px] text-white/30 leading-relaxed">
                      Receba relatórios automáticos e alertas direto no WhatsApp. Já incluso nos planos Scale e Elite.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xs font-medium text-white/30">R$</span>
                    <span className="text-xl font-extrabold tracking-tighter leading-none text-white/90">18</span>
                    <span className="text-sm font-bold text-white/30">,90</span>
                    <span className="text-[10px] text-white/20 ml-0.5">/mês</span>
                  </div>
                  <a
                    href={buildAddonWhatsappUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 font-semibold text-xs flex items-center gap-1.5 transition-all duration-200 rounded-lg bg-white/[0.05] text-white/60 border border-white/[0.06] hover:bg-white/[0.08] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Ativar
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Addon 2: Resposta Automática Inteligente */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0f1419] hover:border-white/[0.12] transition-all duration-200">
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-teal-500/10 border border-teal-500/15">
                    <Bot className="w-4.5 h-4.5 text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/90 mb-0.5">Resposta Automática Inteligente</h3>
                    <p className="text-[11px] text-white/30 leading-relaxed">
                      Automatize conversas, respostas e fluxos sem intervenção manual.
                    </p>
                  </div>
                </div>

                {/* Two tiers */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.04]">
                  {/* Básico */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Básico</p>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xs text-white/30">R$</span>
                      <span className="text-lg font-extrabold tracking-tighter leading-none text-white/90">29</span>
                      <span className="text-xs font-bold text-white/30">,90</span>
                      <span className="text-[9px] text-white/20 ml-0.5">/mês</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/25 flex items-center gap-1"><Check className="w-3 h-3 text-white/20" />Até 3 fluxos</p>
                      <p className="text-[10px] text-white/25 flex items-center gap-1"><Check className="w-3 h-3 text-white/20" />Respostas simples</p>
                    </div>
                    <a
                      href={buildAutoReplyAddonUrl("Básico", "29,90")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 font-semibold text-[10px] flex items-center justify-center gap-1 transition-all duration-200 rounded-md bg-white/[0.05] text-white/50 border border-white/[0.06] hover:bg-white/[0.08] hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Ativar
                    </a>
                  </div>

                  {/* Pro */}
                  <div className="space-y-2 relative">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400/70">Pro</p>
                      <span className="text-[8px] bg-teal-500/15 text-teal-400/70 px-1.5 py-0.5 rounded-full font-semibold">Recomendado</span>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xs text-white/30">R$</span>
                      <span className="text-lg font-extrabold tracking-tighter leading-none text-white/90">49</span>
                      <span className="text-xs font-bold text-white/30">,90</span>
                      <span className="text-[9px] text-white/20 ml-0.5">/mês</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/25 flex items-center gap-1"><Check className="w-3 h-3 text-teal-500/50" />Fluxos ilimitados</p>
                      <p className="text-[10px] text-white/25 flex items-center gap-1"><Check className="w-3 h-3 text-teal-500/50" />Automação completa</p>
                    </div>
                    <a
                      href={buildAutoReplyAddonUrl("Pro", "49,90")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 font-semibold text-[10px] flex items-center justify-center gap-1 transition-all duration-200 rounded-md bg-teal-500/10 text-teal-400/80 border border-teal-500/20 hover:bg-teal-500/15 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Ativar
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="max-w-5xl mx-auto">
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
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-white/[0.02]">
                  <th className="text-left px-3 sm:px-5 py-3.5 sm:py-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider w-[140px] sm:w-[180px] text-white/30">Recurso</th>
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
                          <span className={`text-xs font-bold ${plans[vi].popular ? "text-amber-400" : "text-white/70"}`}>
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
