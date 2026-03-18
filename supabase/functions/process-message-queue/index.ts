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
        `Olá ${nome}! 🎁\n\n` +
        `Já se passaram 30 dias desde o vencimento do seu plano.\n\n` +
        `Para você voltar a utilizar a plataforma, liberamos uma condição especial de retorno.\n\n` +
        `💸 Desconto exclusivo na renovação.\n\n` +
        `Se quiser reativar sua conta, fale com nosso suporte.\n\n` +
        `📞 ${SUPORTE_NUMERO}`
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

// ─── VALIDATE PHONE NUMBER (BR) ───
function isValidPhoneNumber(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  // DDD (2 digits) + number (8-9 digits) = 10-11 digits
  if (local.length < 10 || local.length > 11) return false;
  // DDD must be 11-99
  const ddd = parseInt(local.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  return true;
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

    // Atomically claim pending messages using FOR UPDATE SKIP LOCKED
    // This prevents parallel process-message-queue calls from processing the same messages
    const { data: claimed, error: claimErr } = await adminClient.rpc("claim_pending_messages", { _limit: 50 });

    if (claimErr) {
      console.error("[process-mq] Claim error:", claimErr.message);
      return new Response(JSON.stringify({ error: claimErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate: only process first message per user+type, revert rest
    const seen = new Set<string>();
    const pendingItems: any[] = [];
    const duplicateIds: string[] = [];
    for (const item of (claimed || [])) {
      const key = `${item.user_id}:${item.message_type}`;
      if (seen.has(key)) {
        duplicateIds.push(item.id);
      } else {
        seen.add(key);
        pendingItems.push(item);
      }
    }
    // Mark duplicates as failed (they were already claimed as 'sent', update to 'failed')
    if (duplicateIds.length > 0) {
      await adminClient
        .from("message_queue")
        .update({ status: "failed" as any, error_message: "Duplicata removida automaticamente", updated_at: new Date().toISOString() })
        .in("id", duplicateIds);
      console.log(`[process-mq] Removed ${duplicateIds.length} duplicate messages`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log("[process-mq] No pending messages");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-mq] Claimed ${pendingItems.length} messages (${duplicateIds.length} duplicates removed)`);

    let sent = 0;
    let failed = 0;

    for (const item of pendingItems) {
      const phone = (item.client_phone || "").replace(/\D/g, "");

      if (!phone) {
        await adminClient.from("message_queue").update({
          status: "failed" as any, error_message: "Telefone não informado",
          sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("id", item.id);
        failed++;
        continue;
      }

      if (!isValidPhoneNumber(phone)) {
        await adminClient.from("message_queue").update({
          status: "failed" as any, error_message: `Número inválido: ${phone}`,
          sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).eq("id", item.id);
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
        // Already claimed as 'sent', just update content + timestamp
        await adminClient.from("message_queue").update({
          message_content: messageText,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", item.id);
        sent++;
        console.log(`[process-mq] ✅ Sent ${item.message_type} to ${item.client_name}`);

        // Report de envio removido — admin só quer notificação de novos cadastros
      } else {
        // Revert to failed
        await adminClient.from("message_queue").update({
          status: "failed" as any,
          error_message: result.error || "Erro desconhecido",
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", item.id);
        failed++;
        console.log(`[process-mq] ❌ Failed ${item.message_type} for ${item.client_name}: ${result.error}`);

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
