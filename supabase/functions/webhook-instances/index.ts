import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const PLAN_LIMITS: Record<string, number> = {
  start: 10,
  pro: 30,
  scale: 50,
  elite: 100,
};

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "dg_";
  for (let i = 0; i < 40; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

async function dispatchWebhook(payload: Record<string, unknown>) {
  const makeUrl = Deno.env.get("MAKE_WEBHOOK_URL");
  if (!makeUrl) {
    console.log("[webhook-dispatch] MAKE_WEBHOOK_URL not set, skipping");
    return;
  }
  try {
    const res = await fetch(makeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`[webhook-dispatch] ${payload.event} -> ${res.status}`);
    await res.text(); // consume body
  } catch (e) {
    console.error("[webhook-dispatch] Error:", e.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Authenticate via X-Webhook-Secret
    const secret = req.headers.get("x-webhook-secret") || "";
    const expectedSecret = Deno.env.get("WEBHOOK_SECRET") || "";
    if (!expectedSecret || secret !== expectedSecret) {
      console.log("[webhook-instances] Invalid secret");
      return json({ ok: false, error: "UNAUTHORIZED" }, 401);
    }

    const body = await req.json();
    const { event, client_id, plan, type, instance_name, phone_number, meta } = body;

    console.log("[webhook-instances] Event:", event, "client:", client_id, "type:", type);

    if (event !== "instance.create") {
      return json({ ok: false, error: "UNKNOWN_EVENT", message: `Event '${event}' not supported` }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Validate client exists and is active
    const { data: profile } = await adminClient.from("profiles").select("*").eq("id", client_id).maybeSingle();
    if (!profile) {
      return json({ ok: false, error: "CLIENT_NOT_FOUND" }, 404);
    }
    if (profile.status === "suspended" || profile.status === "cancelled") {
      return json({ ok: false, error: "CLIENT_BLOCKED", message: `Client status: ${profile.status}` }, 403);
    }

    // Get subscription
    const { data: subscription } = await adminClient.from("subscriptions")
      .select("*").eq("user_id", client_id).order("created_at", { ascending: false }).limit(1).maybeSingle();

    const instanceType = type || "principal";

    if (instanceType === "notificacao") {
      // Check if notification instance already exists
      const { data: existingNotif } = await adminClient.from("devices")
        .select("id").eq("user_id", client_id).eq("instance_type", "notificacao");
      
      if (existingNotif && existingNotif.length > 0) {
        return json({ ok: false, error: "NOTIFICATION_EXISTS", message: "Client already has a notification instance" }, 409);
      }

      // Create notification instance (always pending approval)
      const isApproved = profile.notificacao_liberada === true;
      const status = isApproved ? "Disconnected" : "Disconnected";
      const token = generateToken();

      const { data: device, error: devError } = await adminClient.from("devices").insert({
        user_id: client_id,
        name: instance_name || "Notificação WhatsApp",
        login_type: "report_wa",
        instance_type: "notificacao",
        status,
        number: phone_number || null,
      }).select().single();

      if (devError) throw devError;

      // Create token
      const { error: tokError } = await adminClient.from("user_api_tokens").insert({
        user_id: client_id,
        token,
        admin_id: client_id,
        status: "in_use",
        device_id: device.id,
        healthy: true,
        assigned_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      });
      if (tokError) console.error("Token insert error:", tokError);

      // Audit log
      await adminClient.from("admin_logs").insert({
        admin_id: client_id,
        target_user_id: client_id,
        action: "webhook-create-instance",
        details: `Instância notificação criada via webhook: ${device.name} (${isApproved ? "aprovada" : "pendente_aprovacao"})`,
      });

      const responseStatus = isApproved ? "created" : "pending_approval";

      // Dispatch to Make
      await dispatchWebhook({
        event: "instance.created",
        client_id,
        plan: subscription?.plan_name || null,
        instance: {
          id: device.id,
          name: device.name,
          type: "notificacao",
          status: responseStatus,
          created_at: device.created_at,
        },
        token: { value: token, status: "em_uso", health: "valido" },
      });

      return json({
        ok: true,
        instance_id: device.id,
        token,
        status: responseStatus,
        reason: isApproved ? null : "Aguardando liberação pelo administrador",
      });
    }

    // Principal instance
    if (!subscription) {
      return json({ ok: false, error: "NO_PLAN", message: "Client has no active plan" }, 403);
    }

    if (new Date(subscription.expires_at) < new Date()) {
      return json({ ok: false, error: "PLAN_EXPIRED" }, 403);
    }

    const maxInstances = subscription.max_instances + (profile.instance_override || 0);

    // Count current principal instances
    const { count: currentCount } = await adminClient.from("devices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", client_id)
      .neq("instance_type", "notificacao");

    if ((currentCount || 0) >= maxInstances) {
      return json({ ok: false, error: "LIMIT_REACHED", max: maxInstances, current: currentCount }, 429);
    }

    // Auto-assign token from pool
    const ADMIN_BASE_URL = (Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");
    let availableToken: any = null;

    const { data: healthyToken } = await adminClient.from("user_api_tokens")
      .select("*").eq("user_id", client_id).eq("status", "available").eq("healthy", true)
      .order("created_at", { ascending: true }).limit(1).maybeSingle();

    if (healthyToken) {
      availableToken = healthyToken;
    } else {
      const { data: uncheckedToken } = await adminClient.from("user_api_tokens")
        .select("*").eq("user_id", client_id).eq("status", "available").is("healthy", null)
        .order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (uncheckedToken) availableToken = uncheckedToken;
    }

    // Create device
    const { data: device, error: devError } = await adminClient.from("devices").insert({
      user_id: client_id,
      name: instance_name || `Instância ${(currentCount || 0) + 1}`,
      login_type: "qr",
      instance_type: "principal",
      status: "Disconnected",
      number: phone_number || null,
      uazapi_token: availableToken?.token || null,
      uazapi_base_url: availableToken ? ADMIN_BASE_URL : null,
    }).select().single();

    if (devError) throw devError;

    // Generate platform token
    const platformToken = generateToken();
    await adminClient.from("user_api_tokens").insert({
      user_id: client_id,
      token: platformToken,
      admin_id: client_id,
      status: "in_use",
      device_id: device.id,
      healthy: true,
      assigned_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
    });

    // If pool token found, mark as in_use
    if (availableToken) {
      await adminClient.from("user_api_tokens").update({
        status: "in_use",
        device_id: device.id,
        assigned_at: new Date().toISOString(),
      }).eq("id", availableToken.id);
    }

    // Audit log
    await adminClient.from("admin_logs").insert({
      admin_id: client_id,
      target_user_id: client_id,
      action: "webhook-create-instance",
      details: `Instância principal criada via webhook: ${device.name} (token: ${platformToken.substring(0, 8)}...)`,
    });

    // Get client email for webhook dispatch
    const { data: authUser } = await adminClient.auth.admin.getUserById(client_id);

    await dispatchWebhook({
      event: "instance.created",
      client_id,
      client_email: authUser?.user?.email || null,
      plan: subscription.plan_name,
      instance: {
        id: device.id,
        name: device.name,
        type: "principal",
        status: "desconectada",
        created_at: device.created_at,
      },
      token: { value: platformToken, status: "em_uso", health: "valido" },
    });

    return json({
      ok: true,
      instance_id: device.id,
      token: platformToken,
      status: "created",
      reason: null,
    });

  } catch (error) {
    console.error("[webhook-instances] ERROR:", error.message, error.stack);
    return json({ ok: false, error: "INTERNAL_ERROR", message: error.message }, 500);
  }
});
