import { motion } from "framer-motion";
import { MessageSquare, Send, Activity, Wifi } from "lucide-react";

const stats = [
  { icon: MessageSquare, label: "Conversas iniciadas", value: "1.248", color: "#07C160" },
  { icon: Send, label: "Mensagens enviadas hoje", value: "342", color: "#07C160" },
  { icon: Activity, label: "Progresso aquecimento", value: "89%", color: "#07C160" },
  { icon: Wifi, label: "Status da conexão", value: "Ativo", color: "#07C160" },
];

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
        <h2 className="text-3xl lg:text-4xl font-bold text-white">Controle total em um painel</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto bg-[#111111] border border-white/5 rounded-2xl p-6 lg:p-8"
      >
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
              className="p-4 bg-white/[0.03] border border-white/5 rounded-xl"
            >
              <stat.icon className="w-5 h-5 text-[#07C160] mb-3" />
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-[11px] text-white/40">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Mini chart area */}
        <div className="mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-white/60">Atividade de aquecimento</span>
            <span className="text-xs text-[#07C160]">Últimos 7 dias</span>
          </div>
          <div className="flex items-end gap-2 h-20">
            {[35, 50, 45, 65, 55, 80, 89].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                whileInView={{ height: `${h}%` }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.08 }}
                className="flex-1 bg-[#07C160]/20 rounded-t-md relative overflow-hidden"
              >
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[#07C160]/30" />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default DashboardPreview;
