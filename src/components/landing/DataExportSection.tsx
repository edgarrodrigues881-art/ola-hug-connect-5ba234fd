import { useState } from "react";
import { motion } from "framer-motion";
import { Database, Download, Copy, Check, Loader2, Table2, Users, HardDrive, Code2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
// Export sem login - usa service_role no backend

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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 1000);
}

function getFilenameFromDisposition(headerValue: string | null, fallback: string) {
  if (!headerValue) return fallback;
  const match = headerValue.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}

function getExportSummary(headerValue: string | null) {
  if (!headerValue) return [] as Array<{ table: string; row_count: number; status: "ok" | "error"; error?: string }>;
  try {
    return JSON.parse(decodeURIComponent(headerValue));
  } catch {
    return [];
  }
}

const FULL_SQL_MIGRATION = `-- ============================================
-- SQL de Migração - DG Contingência PRO
-- Gerado em: ${new Date().toISOString().split("T")[0]}
-- ============================================
${ALL_TABLES.map(t => `-- Tabela: ${t}\n-- Para exportar: SELECT * FROM public.${t};`).join("\n\n")}
`;

export default function DataExportSection() {
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const exportGroup = async (groupLabel: string, tables: string[]) => {
    setLoading(groupLabel);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-data`, {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ label: groupLabel, tables }),
      });

      if (!response.ok) {
        let message = "Não foi possível exportar os dados.";
        try {
          const errorData = await response.json();
          message = errorData?.error || message;
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      if (!blob.size) {
        throw new Error("O arquivo ZIP veio vazio.");
      }

      const fallbackName = `export_${groupLabel.toLowerCase().replace(/[^a-z0-9]/g, "_")}.zip`;
      const filename = getFilenameFromDisposition(response.headers.get("content-disposition"), fallbackName);
      const summary = getExportSummary(response.headers.get("x-export-manifest"));
      const failedTables = summary.filter((item) => item.status === "error");
      const exportedTables = summary.filter((item) => item.status === "ok").length;

      downloadBlob(blob, filename);

      toast({
        title: failedTables.length ? "Exportação concluída com avisos" : "Exportação concluída",
        description: failedTables.length
          ? `${exportedTables} tabelas exportadas e ${failedTables.length} com erro; veja o manifest.json no ZIP.`
          : `${exportedTables} tabelas exportadas com sucesso em um único ZIP.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Falha na exportação",
        description: error instanceof Error ? error.message : "Erro inesperado ao gerar o ZIP.",
      });
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
    <section id="exportar-dados" className="px-5 py-12 md:py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="mb-10 text-center">
          <motion.span variants={fadeUp} className="mb-4 inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-primary/80">
            Exportação de Dados
          </motion.span>
          <motion.h2 variants={fadeUp} className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-[2.75rem]">
            Exporte seus dados
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground md:text-base">
            Baixe todos os dados do sistema em um ZIP com CSVs ou copie o SQL para migrar as tabelas.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={stagger} className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXPORT_GROUPS.map((group) => (
            <motion.div
              key={group.label}
              variants={fadeUp}
              className="rounded-2xl border border-border/70 bg-card/60 p-6 transition-all duration-300 hover:border-primary/40 hover:bg-primary/5"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <group.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-foreground">{group.label}</h3>
                  <p className="text-[11px] text-muted-foreground">{group.tables.length} tabelas</p>
                </div>
              </div>

              <Button
                onClick={() => exportGroup(group.label, group.tables)}
                disabled={loading !== null}
                variant="outline"
                className="h-9 w-full border-primary/25 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/15"
              >
                {loading === group.label ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando ZIP...</>
                ) : (
                  <><Download className="h-3.5 w-3.5" /> Exportar ZIP</>
                )}
              </Button>
            </motion.div>
          ))}

          <motion.div
            variants={fadeUp}
            className="rounded-2xl border border-border/70 bg-card/60 p-6 transition-all duration-300 hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Table2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-foreground">Tabela Individual</h3>
                <p className="text-[11px] text-muted-foreground">Selecione abaixo</p>
              </div>
            </div>

            <select
              onChange={async (event) => {
                const table = event.target.value;
                if (!table) return;
                await exportGroup(table, [table]);
                event.target.value = "";
              }}
              disabled={loading !== null}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Selecione a tabela...</option>
              {ALL_TABLES.map((table) => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          className="rounded-2xl border border-border/70 bg-card/60 p-6"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-foreground">SQL de Migração</h3>
                <p className="text-[11px] text-muted-foreground">Copie e execute no banco de destino</p>
              </div>
            </div>

            <Button
              onClick={copySql}
              variant="outline"
              className="h-9 border-primary/25 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/15"
            >
              {copied ? <><Check className="h-3.5 w-3.5" /> Copiado!</> : <><Copy className="h-3.5 w-3.5" /> Copiar SQL</>}
            </Button>
          </div>

          <pre className="max-h-[300px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-secondary/30 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {FULL_SQL_MIGRATION}
          </pre>
        </motion.div>
      </div>
    </section>
  );
}
