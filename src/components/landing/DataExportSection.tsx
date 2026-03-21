import { useState } from "react";
import { motion } from "framer-motion";
import { Database, Download, Copy, Check, Loader2, Table2, Users, HardDrive, Code2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

const ALL_TABLES = [
  "admin_connection_purposes", "admin_costs", "admin_dispatch_contacts", "admin_dispatch_templates",
  "admin_dispatches", "admin_logs", "admin_profile_data", "alerts", "announcement_dismissals",
  "announcements", "auto_message_templates", "autoreply_flows", "autoreply_sessions",
  "campaign_contacts", "campaign_device_locks", "campaigns", "chip_conversation_logs",
  "chip_conversations", "client_messages", "community_pairs", "community_settings",
  "community_warmup_configs", "community_warmup_logs", "contacts", "delay_profiles",
  "devices", "feature_controls", "group_interaction_logs", "group_interactions",
  "group_join_campaigns", "group_join_logs", "group_join_queue", "message_queue",
  "notifications", "operation_logs", "payments", "profiles", "proxies",
  "report_wa_configs", "report_wa_logs", "subscription_cycles", "subscriptions",
  "templates", "user_api_tokens", "user_roles", "warmup_audit_logs",
  "warmup_autosave_contacts", "warmup_community_membership", "warmup_cycles",
  "warmup_daily_stats", "warmup_folder_devices", "warmup_folders", "warmup_groups",
  "warmup_groups_pool", "warmup_instance_groups", "warmup_jobs", "warmup_logs",
  "warmup_messages", "warmup_plans", "warmup_sessions", "warmup_unique_recipients",
];

const EXPORT_GROUPS = [
  { label: "Todas as Tabelas", icon: Database, tables: ALL_TABLES },
  { label: "Usuários & Perfis", icon: Users, tables: ["profiles", "user_roles", "user_api_tokens", "subscriptions", "subscription_cycles", "payments"] },
  { label: "Dispositivos & Instâncias", icon: HardDrive, tables: ["devices", "warmup_folders", "warmup_folder_devices", "warmup_sessions", "warmup_jobs", "warmup_cycles", "warmup_logs", "warmup_daily_stats", "warmup_messages", "warmup_plans", "warmup_groups", "warmup_groups_pool", "warmup_instance_groups", "warmup_community_membership", "warmup_autosave_contacts", "warmup_audit_logs", "warmup_unique_recipients"] },
  { label: "Campanhas & Mensagens", icon: FileText, tables: ["campaigns", "campaign_contacts", "campaign_device_locks", "message_queue", "client_messages", "templates", "auto_message_templates", "admin_dispatch_templates", "admin_dispatches", "admin_dispatch_contacts"] },
  { label: "Logs & Operações", icon: Code2, tables: ["admin_logs", "operation_logs", "notifications", "alerts", "chip_conversation_logs", "community_warmup_logs", "group_interaction_logs", "group_join_logs", "report_wa_logs", "autoreply_sessions"] },
];

function toCsv(rows: any[]): string {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return "";
      const str = String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(","));
  }
  return lines.join("\n");
}

function downloadFile(content: string, filename: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const SQL_SCHEMA = ALL_TABLES.map(t =>
  `-- Exportar estrutura: ${t}\n-- Use: SELECT * FROM ${t};`
).join("\n\n");

const FULL_SQL_MIGRATION = `-- ============================================
-- SQL de Migração - DG Contingência PRO
-- Gerado em: ${new Date().toISOString().split("T")[0]}
-- ============================================
-- IMPORTANTE: Execute no banco de destino
-- As tabelas abaixo representam a estrutura atual

${ALL_TABLES.map(t => `-- Tabela: ${t}\n-- Para exportar: SELECT * FROM public.${t};`).join("\n\n")}

-- ============================================
-- Para migrar dados, exporte cada tabela como CSV
-- e importe no banco de destino usando:
-- \\copy public.<tabela> FROM 'arquivo.csv' WITH CSV HEADER;
-- ============================================
`;

export default function DataExportSection() {
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const exportGroup = async (groupLabel: string, tables: string[]) => {
    setLoading(groupLabel);
    try {
      for (const table of tables) {
        const { data, error } = await (supabase.from(table as any).select("*").limit(10000)) as any;
        if (error) { console.warn(`Erro ao exportar ${table}:`, error.message); continue; }
        if (!data || data.length === 0) continue;
        const csv = toCsv(data);
        downloadFile(csv, `${table}.csv`);
        // Small delay between downloads
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (e) {
      console.error("Erro na exportação:", e);
    } finally {
      setLoading(null);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(FULL_SQL_MIGRATION);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section id="exportar-dados" className="py-12 md:py-20 px-5">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="text-center mb-10">
          <motion.span variants={fadeUp} className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400/80 mb-4">Exportação de Dados</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-[2.75rem] font-extrabold text-white tracking-tight mb-4 leading-tight">
            Exporte seus dados
          </motion.h2>
          <motion.p variants={fadeUp} className="text-sm md:text-base text-white/45 max-w-2xl leading-relaxed font-medium mx-auto">
            Baixe todos os dados do sistema em CSV ou copie o SQL para migrar as tabelas.
          </motion.p>
        </motion.div>

        {/* Export buttons grid */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {EXPORT_GROUPS.map((g) => (
            <motion.div key={g.label} variants={fadeUp}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 hover:border-cyan-500/20 hover:bg-cyan-500/[0.04] transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <g.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white">{g.label}</h3>
                  <p className="text-[11px] text-white/35">{g.tables.length} tabelas</p>
                </div>
              </div>
              <Button
                onClick={() => exportGroup(g.label, g.tables)}
                disabled={loading !== null}
                className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-xs font-semibold h-9"
                variant="outline"
              >
                {loading === g.label ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exportando...</>
                ) : (
                  <><Download className="w-3.5 h-3.5" /> Exportar CSV</>
                )}
              </Button>
            </motion.div>
          ))}

          {/* Individual table export */}
          <motion.div variants={fadeUp}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 hover:border-cyan-500/20 hover:bg-cyan-500/[0.04] transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Table2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-white">Tabela Individual</h3>
                <p className="text-[11px] text-white/35">Selecione abaixo</p>
              </div>
            </div>
            <select
              onChange={async (e) => {
                const table = e.target.value;
                if (!table) return;
                await exportGroup(table, [table]);
                e.target.value = "";
              }}
              disabled={loading !== null}
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg text-white/70 text-xs px-3 py-2 h-9 focus:outline-none focus:border-cyan-500/40"
            >
              <option value="" className="bg-[#1a1e26]">Selecione a tabela...</option>
              {ALL_TABLES.map(t => (
                <option key={t} value={t} className="bg-[#1a1e26]">{t}</option>
              ))}
            </select>
          </motion.div>
        </motion.div>

        {/* SQL Schema area */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp}
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Code2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-white">SQL de Migração</h3>
                <p className="text-[11px] text-white/35">Copie e execute no banco de destino</p>
              </div>
            </div>
            <Button onClick={copySql} variant="outline"
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold h-9"
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar SQL</>}
            </Button>
          </div>
          <pre className="bg-black/30 rounded-xl p-4 text-[11px] text-white/50 font-mono leading-relaxed max-h-[300px] overflow-y-auto border border-white/[0.05] whitespace-pre-wrap">
            {FULL_SQL_MIGRATION}
          </pre>
        </motion.div>
      </div>
    </section>
  );
}
