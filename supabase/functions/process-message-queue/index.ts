// Process Message Queue — sends pending messages via WhatsApp with random delays
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPORTE_NUMERO = "(62) 99419-2500";

// ─── MESSAGE TEMPLATES BY TYPE ───
function buildMessageByType(
  type: string,
  nome: string,
  plano: string,
  vencimento: string
): string {
  switch (type) {
    case "WELCOME":
      return (
        `Olá ${nome}! 👋\n\n` +
        `Seja bem-vindo ao DG CONTINGÊNCIA PRO.\n\n` +
        `Seu teste gratuito de 3 dias já está ativo.\n\n` +
        `📅 Vencimento: ${vencimento}\n\n` +
        `Se precisar de ajuda, fale com nosso suporte:\n` +
        `📞 ${SUPORTE_NUMERO}\n\n` +
        `Bons envios! 🚀`
      );
    case "DUE_3_DAYS":
      return (
        `Olá ${nome}! ⏳\n\n` +
        `Seu plano ${plano} vence em 3 dias.\n\n` +
        `Para evitar interrupção nas suas instâncias, recomendamos renovar antecipadamente.\n\n` +
        `📅 Vencimento: ${vencimento}\n\n` +
        `Se precisar de ajuda, fale com nosso suporte:\n` +
        `📞 ${SUPORTE_NUMERO}`
      );
    case "DUE_TODAY":
      return (
        `Olá ${nome}! ⚠️\n\n` +
        `Seu plano ${plano} vence HOJE.\n\n` +
        `Sem renovação, suas instâncias poderão ser bloqueadas automaticamente.\n\n` +
        `📅 Vencimento: ${vencimento}\n\n` +
        `Renove para continuar utilizando a plataforma normalmente.\n\n` +
        `Suporte:\n` +
        `📞 ${SUPORTE_NUMERO}`
      );
    case "OVERDUE_1":
      return (
        `Olá ${nome}! 🚫\n\n` +
        `Seu plano ${plano} venceu ontem.\n\n` +
        `Suas instâncias estão temporariamente bloqueadas.\n\n` +
        `Renove para voltar a utilizá-las imediatamente.\n\n` +
        `Suporte:\n` +
        `📞 ${SUPORTE_NUMERO}`
      );
    case "OVERDUE_7":
      return (
        `Olá ${nome}! 📢\n\n` +
        `Seu plano está vencido há 7 dias.\n\n` +
        `Ainda é possível reativar sua conta e continuar utilizando suas instâncias normalmente.\n\n` +
        `Se precisar de ajuda com a renovação, fale com nosso suporte.\n\n` +
        `📞 ${SUPORTE_NUMERO}`
      );
    case "OVERDUE_30":
      return (
        `Olá ${nome}! 💀\n\n` +
        `Seu plano ${plano} venceu há 30 dias (${vencimento}).\n\n` +
        `Sua conta será desativada. Entre em contato urgente.\n\n` +
        `Suporte: ${SUPORTE_NUMERO}`
      );
    default:
      return `Olá ${nome}, esta é uma mensagem do DG CONTINGÊNCIA PRO. Suporte: ${SUPORTE_NUMERO}`;
  }
}

// ─── SEND TEXT VIA UAZAPI ───
async function sendText(
  baseUrl: string,
  token: string,
  number: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/send/text`, {
      method: "POST",
      headers: { token, "Content-Type": "application/json" },
      body: JSON.stringify({ number, text }),
    });
    const data = await res.json();
    if (res.ok) return { ok: true };
    return { ok: false, error: JSON.stringify(data).slice(0, 200) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── TYPE LABEL MAP ───
function typeLabel(type: string): string {
  const map: Record<string, string> = {
    WELCOME: "Boas-vindas",
    DUE_3_DAYS: "Vence em 3 dias",
    DUE_TODAY: "Vence hoje",
    OVERDUE_1: "Vencido há 1 dia",
    OVERDUE_7: "Vencido há 7 dias",
    OVERDUE_30: "Vencido há 30 dias",
  };
  return map[type] || type;
}

// ─── BUILD REPORT FOR ADMIN GROUP ───
function buildReport(
  status: string,
  item: any,
  vencimento: string,
  messageText: string,
  errorMsg?: string
): string {
  const statusLine = status === "sent"
    ? "✅ *Status:* Enviado com sucesso"
    : `❌ *Status:* Falha no envio\n⚠️ *Erro:* ${errorMsg || "Desconhecido"}`;

  return (
    `📋 *RELATÓRIO DG CONTINGÊNCIA PRO*\n\n` +
    `${statusLine}\n\n` +
    `👤 *Cliente:* ${item.client_name || "—"}\n` +
    `📧 *Email:* ${item.client_email || "—"}\n` +
    `📱 *Telefone:* ${item.client_phone || "—"}\n` +
    `📦 *Plano:* ${item.plan_name || "—"}\n` +
    `📅 *Vencimento:* ${vencimento}\n` +
    `🏷️ *Tipo:* ${typeLabel(item.message_type)}\n\n` +
    `─────────────────\n` +
    `✉️ *Mensagem enviada:*\n\n` +
    `${messageText}`
  );
}

// ─── GET REPORT DEVICE CREDENTIALS + GROUP ───
async function getReportDevice(adminClient: any): Promise<{ baseUrl: string; token: string; groupNumber: string | null } | null> {
  const { data: configRows } = await adminClient
    .from("community_settings")
    .select("key, value")
    .in("key", ["wa_report_device_id", "wa_report_group_id"]);

  const cfg: Record<string, string> = {};
  for (const c of configRows || []) cfg[c.key] = c.value;

  const deviceId = cfg["wa_report_device_id"];
  const groupId = cfg["wa_report_group_id"] || null;

  if (!deviceId) {
    console.log("[process-mq] No wa_report_device_id configured");
    return null;
  }

  const { data: device } = await adminClient
    .from("devices")
    .select("id, uazapi_token, uazapi_base_url")
    .eq("id", deviceId)
    .maybeSingle();

  if (!device) {
    console.log("[process-mq] Device not found:", deviceId);
    return null;
  }

  let token = device.uazapi_token;
  let baseUrl = device.uazapi_base_url;

  if (!token) {
    const { data: poolToken } = await adminClient
      .from("user_api_tokens")
      .select("token")
      .eq("device_id", deviceId)
      .eq("status", "in_use")
      .maybeSingle();
    token = poolToken?.token || null;
  }

  if (!baseUrl) baseUrl = Deno.env.get("UAZAPI_BASE_URL") || "";
  if (!token || !baseUrl) {
    console.log("[process-mq] No credentials for device:", deviceId);
    return null;
  }

  const groupNumber = groupId ? groupId.replace(/@g\.us$/, "") : null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), token, groupNumber };
}

function formatDateBR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((r) => setTimeout(r, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("INTERNAL_TICK_SECRET");
    if (cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    console.log("[process-mq] Starting queue processing...");

    // Get device credentials for sending
    const device = await getReportDevice(adminClient);
    if (!device) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No WA device configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch pending messages (limit 50 per run)
    const { data: pendingItems, error: fetchErr } = await adminClient
      .from("message_queue")
      .select("id, user_id, client_name, client_email, client_phone, plan_name, expires_at, message_type, status")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchErr) {
      console.error("[process-mq] Fetch error:", fetchErr.message);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log("[process-mq] No pending messages");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-mq] Found ${pendingItems.length} pending messages`);

    let sent = 0;
    let failed = 0;

    for (const item of pendingItems) {
      const phone = (item.client_phone || "").replace(/\D/g, "");

      if (!phone) {
        // No phone — mark as failed
        await adminClient
          .from("message_queue")
          .update({
            status: "failed",
            error_message: "Telefone não informado",
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        failed++;
        continue;
      }

      const number = phone.startsWith("55") ? phone : `55${phone}`;
      const vencimento = item.expires_at ? formatDateBR(item.expires_at) : "—";
      const messageText = buildMessageByType(
        item.message_type,
        item.client_name || "Cliente",
        item.plan_name || "—",
        vencimento
      );

      // Send via WhatsApp
      const result = await sendText(device.baseUrl, device.token, number, messageText);

      if (result.ok) {
        await adminClient
          .from("message_queue")
          .update({
            status: "sent",
            message_content: messageText,
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        sent++;
        console.log(`[process-mq] ✅ Sent ${item.message_type} to ${item.client_name}`);

        // Send report to admin group
        if (device.groupNumber) {
          const report = buildReport("sent", item, vencimento, messageText);
          await sendText(device.baseUrl, device.token, device.groupNumber, report);
          await randomDelay(1500, 2500);
        }
      } else {
        await adminClient
          .from("message_queue")
          .update({
            status: "failed",
            error_message: result.error || "Erro desconhecido",
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        failed++;
        console.log(`[process-mq] ❌ Failed ${item.message_type} for ${item.client_name}: ${result.error}`);

        // Send failure report to admin group
        if (device.groupNumber) {
          const report = buildReport("failed", item, vencimento, messageText, result.error);
          await sendText(device.baseUrl, device.token, device.groupNumber, report);
          await randomDelay(1500, 2500);
        }
      }

      // Random delay between 3-8 seconds to avoid mass sending
      if (pendingItems.indexOf(item) < pendingItems.length - 1) {
        const delayMs = Math.floor(Math.random() * 5000) + 3000;
        console.log(`[process-mq] Waiting ${delayMs}ms before next...`);
        await randomDelay(delayMs, delayMs);
      }
    }

    console.log(`[process-mq] Done: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: pendingItems.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[process-mq] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
