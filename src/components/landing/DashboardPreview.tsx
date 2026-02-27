import { motion } from "framer-motion";
import { MessageSquare, Send, Activity, Wifi } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const stats = [
  { icon: MessageSquare, label: "Conversas iniciadas", value: 1248, suffix: "", format: true },
  { icon: Send, label: "Mensagens enviadas hoje", value: 342, suffix: "" },
  { icon: Activity, label: "Progresso aquecimento", value: 89, suffix: "%" },
  { icon: Wifi, label: "Status da conexão", value: 0, text: "Ativo" },
];

function Counter({ value, suffix = "", format, text }: { value: number; suffix?: string; format?: boolean; text?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started || text) return;
    const dur = 2000;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setCount(Math.round(ease * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, value, text]);

  if (text) return <p ref={ref} className="text-2xl font-bold text-white mb-1">{text}</p>;

  const display = format ? count.toLocaleString("pt-BR") : count.toString();
  return <p ref={ref} className="text-2xl font-bold text-white mb-1">{display}{suffix}</p>;
}

const chartData = [35, 50, 45, 65, 55, 80, 89];
const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const DashboardPreview = () => (
  <section id="dashboard" className="relative py-24 lg:py-32">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <span className="text-[#07C160] text-sm font-semibold tracking-widest uppercase mb-3 block">Painel</span>
        <h2 className="text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Controle total em um painel
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(12,18,28,0.98), rgba(8,12,20,0.95))",
          boxShadow: "0 25px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(7,193,96,0.1)",
        }}
      >
        {/* Ambient glow behind */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(7,193,96,0.06) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <div className="relative p-6 lg:p-8">
          {/* Top bar */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-xs text-white/15 font-mono tracking-wide">dashboard.dgcontingencia.pro</span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                className="group p-4 rounded-xl border border-white/[0.06] hover:border-[#07C160]/20 transition-all duration-500"
                style={{
                  background: "linear-gradient(160deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-[#07C160]/[0.07] flex items-center justify-center mb-3 group-hover:bg-[#07C160]/[0.12] transition-colors duration-500">
                  <stat.icon className="w-4 h-4 text-[#07C160]/70 group-hover:text-[#07C160] transition-colors duration-500" />
                </div>
                <Counter value={stat.value} suffix={stat.suffix} format={stat.format} text={stat.text} />
                <p className="text-[11px] text-white/30">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Chart */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-6 p-5 rounded-xl border border-white/[0.04]"
            style={{ background: "rgba(255,255,255,0.015)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-medium text-white/50">Atividade de aquecimento</span>
              <span className="text-[11px] text-[#07C160]/70 font-medium">Últimos 7 dias</span>
            </div>
            <div className="flex items-end gap-3 h-28">
              {chartData.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    whileInView={{ height: `${h}%`, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 + i * 0.06, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="w-full rounded-md relative"
                    style={{
                      background: `linear-gradient(to top, rgba(7,193,96,${0.12 + (h / 400)}), rgba(7,193,96,${0.25 + (h / 300)}))`,
                      boxShadow: h > 70 ? "0 0 12px -4px rgba(7,193,96,0.15)" : "none",
                    }}
                  />
                  <span className="text-[9px] text-white/20 font-medium">{days[i]}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default DashboardPreview;
