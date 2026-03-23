import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "npm:jszip";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "content-disposition, x-export-manifest",
};

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
] as const;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "dados";
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return "";
      const stringValue = typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

      return /[",\n]/.test(stringValue)
        ? `"${stringValue.replace(/"/g, '""')}"`
        : stringValue;
    }).join(","));
  }

  return lines.join("\n");
}

function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

async function fetchTableRows(adminClient: ReturnType<typeof createClient>, table: string) {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;
  let pageSize = 500;

  while (true) {
    let lastError: Error | null = null;
    let data: Record<string, unknown>[] | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const response = await adminClient
        .from(table)
        .select("*")
        .range(offset, offset + pageSize - 1);

      if (!response.error) {
        data = (response.data as Record<string, unknown>[] | null) ?? [];
        break;
      }

      lastError = new Error(response.error.message);
      if (!/timeout/i.test(response.error.message) || attempt === 3) {
        break;
      }

      pageSize = Math.max(100, Math.floor(pageSize / 2));
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }

    if (lastError) {
      throw new Error(`${table}: ${lastError.message}`);
    }

    if (!data?.length) {
      break;
    }

    rows.push(...data);

    if (data.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  try {
    const { adminClient } = await verifyAdmin(req);
    const body = await req.json().catch(() => ({}));
    const requestedTables = Array.isArray(body?.tables) ? body.tables : [];
    const label = typeof body?.label === "string" ? body.label : "dados";

    const tables = requestedTables.filter((table: unknown): table is string => (
      typeof table === "string" && ALL_TABLES.includes(table as typeof ALL_TABLES[number])
    ));

    if (!tables.length) {
      return json({ error: "Nenhuma tabela válida foi enviada para exportação." }, 400);
    }

    const manifest: Array<{ table: string; row_count: number; status: "ok" | "error"; error?: string }> = [];
    const zip = new JSZip();

    for (const table of tables) {
      try {
        const rows = await fetchTableRows(adminClient, table);
        zip.file(`${table}.csv`, toCsv(rows));
        manifest.push({ table, row_count: rows.length, status: "ok" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        manifest.push({ table, row_count: 0, status: "error", error: message });
        zip.file(`${table}.error.txt`, message);
      }
    }

    zip.file("manifest.json", JSON.stringify({ generated_at: new Date().toISOString(), tables: manifest }, null, 2));

    const zipBytes = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const date = new Date().toISOString().split("T")[0];
    const fileName = `export_${sanitizeFileName(label)}_${date}.zip`;

    return new Response(zipBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Export-Manifest": encodeURIComponent(JSON.stringify(manifest)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar exportação.";
    const status = /Acesso negado/.test(message) ? 403 : /Sessão inválida/.test(message) ? 401 : 500;
    return json({ error: message }, status);
  }
});
