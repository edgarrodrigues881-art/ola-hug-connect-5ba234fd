import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check if user already has tokens (idempotent - skip if already provisioned)
    const { data: existingTokens } = await adminClient.from("user_api_tokens")
      .select("id").eq("user_id", user.id).limit(1);

    if (existingTokens && existingTokens.length > 0) {
      return new Response(JSON.stringify({ success: true, message: "Tokens já provisionados", created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user has a Trial subscription
    const { data: sub } = await adminClient.from("subscriptions")
      .select("plan_name, max_instances, expires_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub || new Date(sub.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Sem plano ativo" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxInstances = sub.max_instances || 3;
    const ADMIN_BASE_URL = (Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");
    const ADMIN_TOKEN = Deno.env.get("UAZAPI_TOKEN") || "";

    if (!ADMIN_BASE_URL || !ADMIN_TOKEN) {
      console.error("[provision-trial] UAZAPI_BASE_URL or UAZAPI_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Configuração do provedor incompleta" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get client name for labels
    const { data: profile } = await adminClient.from("profiles")
      .select("full_name").eq("id", user.id).maybeSingle();
    const clientName = profile?.full_name || user.email || "cliente";
    const sanitizedName = clientName.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 20);

    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < maxInstances; i++) {
      const instanceName = `${sanitizedName}_trial_${i + 1}`;
      try {
        const res = await fetch(`${ADMIN_BASE_URL}/instance/init`, {
          method: "POST",
          headers: { "admintoken": ADMIN_TOKEN, "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ name: instanceName }),
        });
        const body = await res.json();
        console.log(`[provision-trial] ${instanceName}: status=${res.status}`, JSON.stringify(body));

        if (!res.ok) {
          errors.push(`${instanceName}: ${body?.message || res.statusText}`);
          continue;
        }

        const token = body?.token || body?.data?.token || body?.instance?.token;
        if (!token) {
          errors.push(`${instanceName}: Sem token na resposta`);
          continue;
        }

        // Idempotency check
        const { data: dup } = await adminClient.from("user_api_tokens")
          .select("id").eq("token", token).maybeSingle();
        if (dup) continue;

        await adminClient.from("user_api_tokens").insert({
          user_id: user.id, token, admin_id: user.id,
          status: "available", healthy: true, label: instanceName,
          last_checked_at: new Date().toISOString(),
        });
        created++;
      } catch (e) {
        errors.push(`${instanceName}: ${e.message}`);
      }
    }

    // Log
    await adminClient.from("admin_logs").insert({
      admin_id: user.id, target_user_id: user.id,
      action: "auto-trial-provision",
      details: `Trial: ${created}/${maxInstances} tokens provisionados${errors.length ? `. Erros: ${errors.join("; ")}` : ""}`,
    });

    console.log(`[provision-trial] user=${user.id} created=${created} errors=${errors.length}`);

    return new Response(JSON.stringify({ success: true, created, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[provision-trial] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
