// WA Lifecycle — Automated welcome messages + daily lifecycle alerts to admin group
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPORTE_NUMERO = "(62) 99419-2500";

// ─── MESSAGE TEMPLATES ───
function buildWelcomeMessage(nome: string, plano: string, vencimento: string): string {
  return `Olá ${nome}! 👋\n\nSeja bem-vindo(a) ao DG CONTINGÊNCIA PRO!\n\nSeu plano ${plano} já está ativo.\nVencimento: ${vencimento}\n\nQualquer dúvida, fale com nosso suporte: ${SUPORTE_NUMERO}\n\nBons envios! 🚀`;
}

function buildLifecycleGroupAlert(tipo: string, nome: string, email: string, phone: string, plano: string, vencimento: string, diasRestantes: number): string {
  let emoji = "";
  let statusText = "";

  switch (tipo) {
    case "faltam-3-dias":
      emoji = "⏰";
      statusText = `Vence em ${diasRestantes} dias`;
      break;
    case "vence-hoje":
      emoji = "⚠️";
      statusText = "VENCE HOJE";
      break;
    case "vencido-1-dia":
      emoji = "❌";
      statusText = "Vencido há 1 dia";
      break;
    case "vencido-7-dias":
      emoji = "🔴";
      statusText = "Vencido há 7 dias";
      break;
    case "vencido-30-dias":
      emoji = "💀";
      statusText = "Vencido há 30 dias";
      break;
  }

  return (
    `${emoji} *ALERTA DE CICLO DE VIDA*\n\n` +
    `*Status:* ${statusText}\n\n` +
    `👤 *Cliente:* ${nome}\n` +
    `📧 *Email:* ${email}\n` +
    `📱 *Telefone:* ${phone || "—"}\n` +
    `📦 *Plano:* ${plano}\n` +
    `📅 *Vencimento:* ${vencimento}\n\n` +
    `─────────────────\n` +
    `💡 Acesse o BackOffice → Relatório WhatsApp para enviar a mensagem manualmente.`
  );
}

// ─── SEND TEXT VIA UAZAPI ───
async function sendText(baseUrl: string, token: string, number: string, text: string): Promise<{ ok: boolean; error?: string }> {
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

// ─── GET WA REPORT CONFIG ───
async function getReportConfig(adminClient: any): Promise<{ baseUrl: string; token: string; groupNumber: string } | null> {
  const { data: configRows } = await adminClient.from("community_settings")
    .select("key, value")
    .in("key", ["wa_report_device_id", "wa_report_group_id"]);

  const cfg: Record<string, string> = {};
  for (const c of (configRows || [])) cfg[c.key] = c.value;

  const deviceId = cfg["wa_report_device_id"];
  const groupId = cfg["wa_report_group_id"];

  if (!deviceId || !groupId) {
    console.log("[wa-lifecycle] Config incomplete: no device or group");
    return null;
  }

  const { data: device } = await adminClient.from("devices")
    .select("id, uazapi_token, uazapi_base_url")
    .eq("id", deviceId)
    .maybeSingle();

  if (!device) {
    console.log("[wa-lifecycle] Device not found:", deviceId);
    return null;
  }

  let token = device.uazapi_token;
  let baseUrl = device.uazapi_base_url;

  if (!token) {
    const { data: poolToken } = await adminClient.from("user_api_tokens")
      .select("token")
      .eq("device_id", deviceId)
      .eq("status", "in_use")
      .maybeSingle();
    token = poolToken?.token || null;
  }

  if (!baseUrl) baseUrl = Deno.env.get("UAZAPI_BASE_URL") || "";

  if (!token || !baseUrl) {
    console.log("[wa-lifecycle] No credentials for device:", deviceId);
    return null;
  }

  const groupNumber = groupId.replace(/@g\.us$/, "");
  return { baseUrl: baseUrl.replace(/\/+$/, ""), token, groupNumber };
}

function formatDateUTC(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "cron";

    // ─── ACTION: WELCOME (called from provision-trial) ───
    if (action === "welcome") {
      const { user_id } = await req.json();
      console.log("[wa-lifecycle] Welcome for user:", user_id);

      const config = await getReportConfig(adminClient);
      if (!config) {
        return new Response(JSON.stringify({ skipped: true, reason: "WA report not configured" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user profile + subscription
      const { data: profile } = await adminClient.from("profiles")
        .select("full_name, phone, company")
        .eq("id", user_id)
        .maybeSingle();

      const { data: sub } = await adminClient.from("subscriptions")
        .select("plan_name, expires_at")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!profile || !sub) {
        console.log("[wa-lifecycle] No profile or subscription found");
        return new Response(JSON.stringify({ skipped: true, reason: "No profile/sub" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const nome = profile.full_name || "Cliente";
      const plano = sub.plan_name || "Trial";
      const vencimento = formatDateUTC(sub.expires_at);
      const clientPhone = (profile.phone || "").replace(/\D/g, "");

      // 1) Send PV to client
      let pvResult = { ok: false, error: "Sem telefone" };
      if (clientPhone) {
        const pvNumber = clientPhone.startsWith("55") ? clientPhone : `55${clientPhone}`;
        const welcomeMsg = buildWelcomeMessage(nome, plano, vencimento);
        pvResult = await sendText(config.baseUrl, config.token, pvNumber, welcomeMsg);
        console.log("[wa-lifecycle] PV result:", pvResult.ok ? "OK" : pvResult.error);
      }

      // 2) Notify admin group
      const { data: authUser } = await adminClient.auth.admin.getUserById(user_id);
      const email = authUser?.user?.email || "—";

      const groupMsg =
        `🎉 *NOVO CLIENTE CADASTRADO*\n\n` +
        `✅ Boas-vindas ${pvResult.ok ? "enviada com sucesso" : `falhou: ${pvResult.error}`}\n\n` +
        `👤 *Nome:* ${nome}\n` +
        `📧 *Email:* ${email}\n` +
        `📱 *Telefone:* ${clientPhone || "—"}\n` +
        `🏢 *Empresa:* ${profile.company || "—"}\n` +
        `📦 *Plano:* ${plano}\n` +
        `📅 *Vencimento:* ${vencimento}`;

      const groupResult = await sendText(config.baseUrl, config.token, config.groupNumber, groupMsg);
      console.log("[wa-lifecycle] Group result:", groupResult.ok ? "OK" : groupResult.error);

      // Save to client_messages history
      await adminClient.from("client_messages").insert({
        user_id,
        admin_id: user_id,
        template_type: "boas-vindas",
        message_content: buildWelcomeMessage(nome, plano, vencimento),
        observation: `AUTO | PV: ${pvResult.ok ? "✅" : "❌ " + pvResult.error} | Grupo: ${groupResult.ok ? "✅" : "❌ " + groupResult.error}`,
      });

      return new Response(JSON.stringify({ success: true, pv: pvResult.ok, group: groupResult.ok }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: CRON (daily lifecycle check) ───
    if (action === "cron") {
      console.log("[wa-lifecycle] Running daily lifecycle check");

      const config = await getReportConfig(adminClient);
      if (!config) {
        return new Response(JSON.stringify({ skipped: true, reason: "WA report not configured" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all active subscriptions with profiles
      const { data: subs } = await adminClient.from("subscriptions")
        .select("user_id, plan_name, expires_at");

      if (!subs || subs.length === 0) {
        return new Response(JSON.stringify({ processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get all profiles
      const userIds = subs.map(s => s.user_id);
      const { data: profiles } = await adminClient.from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Get auth users for emails
      const { data: authUsers } = await adminClient.auth.admin.listUsers();
      const emailMap = new Map((authUsers?.users || []).map(u => [u.id, u.email]));

      // Check which lifecycle messages were already sent today
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const { data: sentToday } = await adminClient.from("client_messages")
        .select("user_id, template_type")
        .gte("sent_at", todayStart.toISOString());

      const sentSet = new Set((sentToday || []).map(s => `${s.user_id}:${s.template_type}`));

      let alertsSent = 0;
      const now = new Date();

      for (const sub of subs) {
        const expiresAt = new Date(sub.expires_at);
        const diffMs = expiresAt.getTime() - now.getTime();
        const daysLeft = Math.ceil(diffMs / 86400000);

        // Determine lifecycle stage
        let tipo: string | null = null;
        if (daysLeft === 3) tipo = "faltam-3-dias";
        else if (daysLeft === 0) tipo = "vence-hoje";
        else if (daysLeft === -1) tipo = "vencido-1-dia";
        else if (daysLeft === -7) tipo = "vencido-7-dias";
        else if (daysLeft === -30) tipo = "vencido-30-dias";

        if (!tipo) continue;

        // Skip if already sent today
        const key = `${sub.user_id}:${tipo}`;
        if (sentSet.has(key)) {
          console.log(`[wa-lifecycle] Skipping ${tipo} for ${sub.user_id} - already sent today`);
          continue;
        }

        const profile = profileMap.get(sub.user_id);
        const nome = profile?.full_name || "Cliente";
        const phone = (profile?.phone || "").replace(/\D/g, "");
        const email = emailMap.get(sub.user_id) || "—";
        const vencimento = formatDateUTC(sub.expires_at);

        // Send group-only alert
        const alertMsg = buildLifecycleGroupAlert(tipo, nome, email, phone, sub.plan_name, vencimento, daysLeft);
        const result = await sendText(config.baseUrl, config.token, config.groupNumber, alertMsg);
        console.log(`[wa-lifecycle] ${tipo} for ${sub.user_id}: ${result.ok ? "OK" : result.error}`);

        // Record in history
        await adminClient.from("client_messages").insert({
          user_id: sub.user_id,
          admin_id: sub.user_id,
          template_type: tipo,
          message_content: `[ALERTA AUTOMÁTICO] ${tipo}`,
          observation: `AUTO-CRON | Grupo: ${result.ok ? "✅" : "❌ " + result.error} | Aguardando envio manual do PV`,
        });

        if (result.ok) alertsSent++;

        // Small delay between messages
        await new Promise(r => setTimeout(r, 1500));
      }

      console.log(`[wa-lifecycle] Cron completed: ${alertsSent} alerts sent`);

      return new Response(JSON.stringify({ success: true, alerts_sent: alertsSent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[wa-lifecycle] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
