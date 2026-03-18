import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const onlineStatuses = new Set(["connected", "Connected", "Ready", "ready", "authenticated"]);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function getSkipMessage(reason: string, incomingText: string) {
  switch (reason) {
    case "no_active_flows":
      return "Nenhuma automação ativa para esta instância.";
    case "no_matching_flows":
      return "A automação ativa está vinculada a outra instância.";
    case "no_trigger_match":
      return `A mensagem de teste "${incomingText}" não corresponde ao gatilho configurado.`;
    case "device_not_found":
      return "Instância não encontrada para processar o teste.";
    default:
      return `Teste ignorado (${reason}).`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Não autenticado" }, 401);
    }

    const body = await req.json();
    const deviceId = body.device_id as string | undefined;
    const incomingText = String(body.incoming_text || body.message_text || "").trim();

    if (!deviceId) {
      return json({ error: "Selecione uma instância antes de testar" }, 400);
    }

    if (!incomingText) {
      return json({ error: "Defina uma mensagem de entrada para simular o teste" }, 400);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();

    if (!profile?.phone) {
      return json({ error: "Cadastre seu telefone no perfil para testar" }, 400);
    }

    const phone = normalizePhone(profile.phone);
    if (phone.length < 10) {
      return json({ error: "O telefone do perfil é inválido para o teste" }, 400);
    }

    const { data: device } = await supabase
      .from("devices")
      .select("id, status, uazapi_token, uazapi_base_url")
      .eq("id", deviceId)
      .eq("user_id", user.id)
      .single();

    if (!device) {
      return json({ error: "Instância não encontrada" }, 404);
    }

    if (!onlineStatuses.has(device.status)) {
      return json({ error: "A instância selecionada está offline. Reconecte antes de testar." }, 400);
    }

    if (!device.uazapi_token || !device.uazapi_base_url) {
      return json({ error: "Instância sem configuração de API. Conecte-a primeiro." }, 400);
    }

    const webhookResponse = await fetch(`${supabaseUrl}/functions/v1/autoreply-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-device-id": deviceId,
        ...(webhookSecret ? { "x-webhook-secret": webhookSecret } : {}),
      },
      body: JSON.stringify({
        event: "message",
        device_id: deviceId,
        data: {
          from: phone,
          text: incomingText,
        },
      }),
    });

    const responseText = await webhookResponse.text();
    let payload: Record<string, any> = {};
    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch {
      payload = { raw: responseText };
    }

    if (!webhookResponse.ok || payload.error) {
      return json(
        {
          error: payload.error || "Falha ao executar o teste",
          details: payload.details || payload.raw || responseText || undefined,
        },
        webhookResponse.status >= 400 ? webhookResponse.status : 500,
      );
    }

    if (payload.skipped) {
      return json({ error: getSkipMessage(String(payload.reason || "unknown"), incomingText) }, 400);
    }

    return json({
      success: true,
      phone,
      trigger: incomingText,
      action: payload.action,
      message: `Teste executado simulando uma mensagem recebida de ${phone}.`,
    });
  } catch (err) {
    console.error("test-autoreply error:", err);
    return json({ error: "Erro interno", details: err instanceof Error ? err.message : String(err) }, 500);
  }
});
