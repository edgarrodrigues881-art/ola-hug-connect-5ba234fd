import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

async function dispatchWebhook(payload: Record<string, unknown>) {
  const makeUrl = Deno.env.get("MAKE_WEBHOOK_URL");
  if (!makeUrl) return;
  try {
    const res = await fetch(makeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`[webhook-dispatch] ${payload.event} -> ${res.status}`);
    await res.text();
  } catch (e) {
    console.error("[webhook-dispatch] Error:", e.message);
  }
}

/**
 * Finds the first available pool token for a user.
 * Pool tokens are pre-allocated by admins in user_api_tokens with status='available'.
 * Returns null if none available.
 */
async function findAvailablePoolToken(adminClient: any, userId: string) {
  // Prefer healthy tokens first
  const { data: healthy } = await adminClient.from("user_api_tokens")
    .select("id, token, user_id, admin_id, status, healthy, label")
    .eq("user_id", userId)
    .eq("status", "available")
    .eq("healthy", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (healthy) return healthy;

  // Fall back to unchecked tokens
  const { data: unchecked } = await adminClient.from("user_api_tokens")
    .select("id, token, user_id, admin_id, status, healthy, label")
    .eq("user_id", userId)
    .eq("status", "available")
    .is("healthy", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return unchecked || null;
}

/**
 * Reserves a pool token by marking it as in_use and linking to a device.
 */
async function reservePoolToken(adminClient: any, tokenId: string, deviceId: string) {
  await adminClient.from("user_api_tokens").update({
    status: "in_use",
    device_id: deviceId,
    assigned_at: new Date().toISOString(),
  }).eq("id", tokenId);
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
      return json({ ok: false, error: "UNAUTHORIZED" }, 401);
    }

    const body = await req.json();
    const { event, client_id, instance_name, phone_number, type } = body;
    console.log("[webhook-instances] Event:", event, "client:", client_id, "type:", type);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);
    const ADMIN_BASE_URL = (Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");

    // ─── DELETE INSTANCE ───
    if (event === "instance.delete") {
      const { instance_id } = body;
      if (!instance_id) return json({ ok: false, error: "MISSING_INSTANCE_ID" }, 400);

      const { data: device } = await adminClient.from("devices")
        .select("id, name, user_id, proxy_id")
        .eq("id", instance_id)
        .maybeSingle();

      if (!device) return json({ ok: false, error: "INSTANCE_NOT_FOUND" }, 404);

      // Release pool token back to available
      await adminClient.from("user_api_tokens").update({
        status: "available",
        device_id: null,
        assigned_at: null,
      }).eq("device_id", instance_id).eq("status", "in_use");

      // Release proxy
      if (device.proxy_id) {
        await adminClient.from("proxies").update({ status: "USADA" }).eq("id", device.proxy_id);
      }

      // Delete device
      await adminClient.from("devices").delete().eq("id", instance_id);

      await adminClient.from("admin_logs").insert({
        admin_id: device.user_id,
        target_user_id: device.user_id,
        action: "webhook-delete-instance",
        details: `Instância deletada via webhook: ${device.name}`,
      });

      await dispatchWebhook({
        event: "instance.deleted",
        client_id: device.user_id,
        instance: { id: instance_id, name: device.name },
      });

      return json({ ok: true, deleted: true });
    }

    // ─── CREATE INSTANCE ───
    if (event !== "instance.create") {
      return json({ ok: false, error: "UNKNOWN_EVENT", message: `Event '${event}' not supported` }, 400);
    }

    // Validate client
    const { data: profile } = await adminClient.from("profiles").select("id, status, instance_override, full_name, client_type").eq("id", client_id).maybeSingle();
    if (!profile) return json({ ok: false, error: "CLIENT_NOT_FOUND" }, 404);
    if (profile.status === "suspended" || profile.status === "cancelled") {
      return json({ ok: false, error: "CLIENT_BLOCKED", message: `Client status: ${profile.status}` }, 403);
    }

    const { data: subscription } = await adminClient.from("subscriptions")
      .select("id, plan_name, max_instances, expires_at, plan_price").eq("user_id", client_id).order("created_at", { ascending: false }).limit(1).maybeSingle();

    const instanceType = type || "principal";

    // ─── NOTIFICATION INSTANCE ───
    if (instanceType === "notificacao") {
      const { data: existingNotif } = await adminClient.from("devices")
        .select("id").eq("user_id", client_id).eq("instance_type", "notificacao");

      if (existingNotif && existingNotif.length > 0) {
        return json({ ok: false, error: "NOTIFICATION_EXISTS" }, 409);
      }

      // Find available pool token
      const poolToken = await findAvailablePoolToken(adminClient, client_id);
      if (!poolToken) {
        return json({ ok: false, error: "NO_TOKEN_AVAILABLE", message: "No pool token available for this client" }, 422);
      }

      const { data: device, error: devError } = await adminClient.from("devices").insert({
        user_id: client_id,
        name: instance_name || "Notificação WhatsApp",
        login_type: "report_wa",
        instance_type: "notificacao",
        status: "Disconnected",
        number: phone_number || null,
        uazapi_token: poolToken.token,
        uazapi_base_url: ADMIN_BASE_URL || null,
      }).select().single();
      if (devError) throw devError;

      // Reserve pool token → in_use, linked to this device
      await reservePoolToken(adminClient, poolToken.id, device.id);

      await adminClient.from("admin_logs").insert({
        admin_id: client_id,
        target_user_id: client_id,
        action: "webhook-create-instance",
        details: `Instância notificação criada via webhook: ${device.name} (pool token: ${poolToken.id.substring(0, 8)}...)`,
      });

      await dispatchWebhook({
        event: "instance.created",
        client_id,
        plan: subscription?.plan_name || null,
        instance: { id: device.id, name: device.name, type: "notificacao", status: "desconectada", created_at: device.created_at },
      });

      return json({ ok: true, instance_id: device.id, status: "created" });
    }

    // ─── PRINCIPAL INSTANCE ───
    if (!subscription) return json({ ok: false, error: "NO_PLAN" }, 403);
    if (new Date(subscription.expires_at) < new Date()) return json({ ok: false, error: "PLAN_EXPIRED" }, 403);

    const maxInstances = subscription.max_instances + (profile.instance_override || 0);
    const { count: currentCount } = await adminClient.from("devices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", client_id)
      .neq("instance_type", "notificacao");

    if ((currentCount || 0) >= maxInstances) {
      return json({ ok: false, error: "LIMIT_REACHED", max: maxInstances, current: currentCount }, 429);
    }

    // Find available pool token — required, no auto-generation
    const poolToken = await findAvailablePoolToken(adminClient, client_id);
    if (!poolToken) {
      return json({ ok: false, error: "NO_TOKEN_AVAILABLE", message: "No pool token available for this client" }, 422);
    }

    const { data: device, error: devError } = await adminClient.from("devices").insert({
      user_id: client_id,
      name: instance_name || `Instância ${(currentCount || 0) + 1}`,
      login_type: "qr",
      instance_type: "principal",
      status: "Disconnected",
      number: phone_number || null,
      uazapi_token: poolToken.token,
      uazapi_base_url: ADMIN_BASE_URL || null,
    }).select().single();
    if (devError) throw devError;

    // Reserve pool token → in_use, linked to this device
    await reservePoolToken(adminClient, poolToken.id, device.id);

    await adminClient.from("admin_logs").insert({
      admin_id: client_id,
      target_user_id: client_id,
      action: "webhook-create-instance",
      details: `Instância principal criada via webhook: ${device.name} (pool token: ${poolToken.id.substring(0, 8)}...)`,
    });

    const { data: authUser } = await adminClient.auth.admin.getUserById(client_id);

    await dispatchWebhook({
      event: "instance.created",
      client_id,
      client_email: authUser?.user?.email || null,
      plan: subscription.plan_name,
      instance: { id: device.id, name: device.name, type: "principal", status: "desconectada", created_at: device.created_at },
    });

    return json({ ok: true, instance_id: device.id, status: "created" });

  } catch (error) {
    console.error("[webhook-instances] ERROR:", error.message, error.stack);
    return json({ ok: false, error: "INTERNAL_ERROR", message: error.message }, 500);
  }
});
