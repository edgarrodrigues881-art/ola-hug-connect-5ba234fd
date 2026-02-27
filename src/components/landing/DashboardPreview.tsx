import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { MessageSquare, Send, Activity, Wifi } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const stats = [
  { icon: MessageSquare, label: "Conversas iniciadas", value: 1248, display: "1.248", color: "#07C160" },
  { icon: Send, label: "Mensagens enviadas hoje", value: 342, display: "342", color: "#07C160" },
  { icon: Activity, label: "Progresso aquecimento", value: 89, display: "89%", suffix: "%", color: "#07C160" },
  { icon: Wifi, label: "Status da conexão", value: 0, display: "Ativo", isText: true, color: "#07C160" },
];

function AnimatedNumber({ value, suffix = "", isText, display }: { value: number; suffix?: string; isText?: boolean; display: string }) {
  const [inView, setInView] = useState(false);
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || isText) return;
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value, isText]);

  if (isText) return <p ref={ref} className="text-2xl font-bold text-white mb-1">{display}</p>;

  const formatted = value >= 1000
    ? count.toLocaleString("pt-BR")
    : count.toString();

  return <p ref={ref} className="text-2xl font-bold text-white mb-1">{formatted}{suffix}</p>;
}

const chartData = [35, 50, 45, 65, 55, 80, 89];

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
        <h2 className="text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Controle total em um painel</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative max-w-4xl mx-auto rounded-2xl p-6 lg:p-8 overflow-hidden border border-[#07C160]/15"
        style={{
          background: "linear-gradient(145deg, rgba(17,24,39,0.95), rgba(10,15,25,0.9))",
          boxShadow: "0 20px 60px -15px rgba(0,0,0,0.6), 0 0 40px -10px rgba(7,193,96,0.08)",
        }}
      >
        {/* Border shimmer animations */}
        <motion.div
          className="absolute top-0 left-0 h-[2px] w-[80px] rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, rgba(7,193,96,0.6), transparent)" }}
          animate={{ left: ["0%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-0 right-0 h-[2px] w-[80px] rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, rgba(7,193,96,0.6), transparent)" }}
          animate={{ right: ["0%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute left-0 w-[3px] h-10 rounded-full"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(7,193,96,0.5), transparent)" }}
          animate={{ top: ["10%", "70%", "10%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-0 w-[3px] h-10 rounded-full"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(7,193,96,0.5), transparent)" }}
          animate={{ top: ["70%", "10%", "70%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Top bar */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="ml-3 text-xs text-white/20 font-mono">dashboard.dgcontingencia.pro</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.1 }}
              whileHover={{ scale: 1.04, transition: { duration: 0.2 } }}
              className="relative p-4 rounded-xl overflow-hidden border border-[#07C160]/10"
              style={{
                background: "linear-gradient(145deg, rgba(7,193,96,0.04), rgba(255,255,255,0.02))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
              }}
            >
              {/* Subtle inner glow on hover */}
              <motion.div
                className="absolute inset-0 rounded-xl opacity-0 pointer-events-none"
                whileHover={{ opacity: 1 }}
                style={{ boxShadow: "inset 0 0 20px rgba(7,193,96,0.06)" }}
              />
              <stat.icon className="w-5 h-5 text-[#07C160] mb-3" />
              <AnimatedNumber value={stat.value} suffix={stat.display.includes("%") ? "%" : ""} isText={stat.isText} display={stat.display} />
              <p className="text-[11px] text-white/40">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Chart area */}
        <div className="mt-6 p-4 rounded-xl border border-white/5" style={{ background: "rgba(255,255,255,0.015)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white/60">Atividade de aquecimento</span>
            <span className="text-xs text-[#07C160]">Últimos 7 dias</span>
          </div>
          <div className="flex items-end gap-2 h-24">
            {chartData.map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                whileInView={{ height: `${h}%` }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: "easeOut" }}
                whileHover={{ scaleY: 1.1, transition: { duration: 0.2 } }}
                className="flex-1 rounded-t-md relative overflow-hidden cursor-default"
                style={{
                  background: `linear-gradient(to top, rgba(7,193,96,0.15), rgba(7,193,96,${0.2 + h / 200}))`,
                }}
              >
                {/* Animated bar shine */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to top, transparent 40%, rgba(7,193,96,0.3))",
                  }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                />
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#07C160]/50" />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default DashboardPreview;
