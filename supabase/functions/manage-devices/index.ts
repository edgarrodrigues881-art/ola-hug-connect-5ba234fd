import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function oplog(client: any, userId: string, event: string, details: string, deviceId?: string | null, meta?: any) {
  try { await client.from("operation_logs").insert({ user_id: userId, device_id: deviceId || null, event, details, meta: meta || {} }); } catch (_e) { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const body = await req.json();
  const { action } = body;

  try {
    // ─── CREATE SINGLE DEVICE ──────────────────────────────────
    if (action === "create") {
      const { name, login_type = "qr" } = body;
      if (!name?.trim()) throw new Error("Nome é obrigatório.");

      // 1. Check plan limits
      const { data: sub } = await admin
        .from("subscriptions")
        .select("max_instances, expires_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub || new Date(sub.expires_at) < new Date()) {
        throw new Error("Você não possui um plano ativo.");
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("instance_override, status")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.status === "suspended" || profile?.status === "cancelled") {
        throw new Error("Conta suspensa/cancelada.");
      }

      const { count: currentCount } = await admin
        .from("devices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("login_type", "report_wa");

      const maxAllowed = (sub.max_instances ?? 0) + (profile?.instance_override ?? 0);
      if ((currentCount ?? 0) >= maxAllowed) {
        throw new Error(`Limite de instâncias atingido (${currentCount} de ${maxAllowed}).`);
      }

      // 2. Find available token
      const { data: available } = await admin
        .from("user_api_tokens")
        .select("id, token")
        .eq("user_id", user.id)
        .eq("status", "available")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!available) {
        throw new Error("Nenhum token disponível no pool. Solicite ao administrador.");
      }

      // 3. Reserve token
      const { error: reserveErr } = await admin
        .from("user_api_tokens")
        .update({ status: "reserved" })
        .eq("id", available.id)
        .eq("status", "available");
      if (reserveErr) throw new Error("Falha ao reservar token.");

      try {
        // 4. Create device record (with token — server-side only)
        const { data: newDevice, error: insertErr } = await admin
          .from("devices")
          .insert({
            name: name.trim(),
            login_type,
            user_id: user.id,
            uazapi_token: available.token,
          })
          .select("id, name, status, login_type, number, proxy_id, profile_picture, profile_name, created_at, updated_at, instance_type")
          .single();
        if (insertErr) throw insertErr;

        // 5. Token already provisioned from pool — no need to create instance on provider
        // The token was created via /instance/init during plan provisioning in admin-data

        // 6. Set base URL on device (needed for connect/QR later)
        const BASE_URL = (Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");
        if (BASE_URL) {
          await admin.from("devices").update({ uazapi_base_url: BASE_URL }).eq("id", newDevice.id);
        }

        // 7. Mark token as in_use
        await admin.from("user_api_tokens").update({
          status: "in_use",
          device_id: newDevice.id,
          assigned_at: new Date().toISOString(),
        }).eq("id", available.id);

        await oplog(admin, user.id, "instance_created", `Instância "${newDevice.name}" criada`, newDevice.id, { token_assigned: true });

        return new Response(
          JSON.stringify({ device: { ...newDevice, has_api_config: true } }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        // Rollback token
        await admin.from("user_api_tokens").update({
          status: "available",
          device_id: null,
          assigned_at: null,
        }).eq("id", available.id);
        throw err;
      }
    }

    // ─── BULK CREATE DEVICES ───────────────────────────────────
    if (action === "bulk-create") {
      const { prefix = "Instância", proxyIds = [], noProxyCount = 0, startIndex = 1 } = body;
      const totalCount = (proxyIds?.length || 0) + (noProxyCount || 0);
      if (totalCount === 0) throw new Error("Nenhuma instância para criar.");

      // Check plan limits
      const { data: sub } = await admin
        .from("subscriptions")
        .select("max_instances, expires_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub || new Date(sub.expires_at) < new Date()) {
        throw new Error("Sem plano ativo.");
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("instance_override")
        .eq("id", user.id)
        .maybeSingle();

      const { count: currentCount } = await admin
        .from("devices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("login_type", "report_wa");

      const maxAllowed = (sub.max_instances ?? 0) + (profile?.instance_override ?? 0);
      if ((currentCount ?? 0) + totalCount > maxAllowed) {
        throw new Error(`Limite excedido. Disponível: ${maxAllowed - (currentCount ?? 0)}.`);
      }

      // Get available tokens
      const { data: tokens } = await admin
        .from("user_api_tokens")
        .select("id, token")
        .eq("user_id", user.id)
        .eq("status", "available")
        .order("created_at", { ascending: true })
        .limit(totalCount);

      // Build inserts
      const inserts: any[] = [];
      let tokenIdx = 0;
      let idx = startIndex;

      for (const proxyId of (proxyIds || [])) {
        const token = tokens?.[tokenIdx];
        inserts.push({
          name: `${prefix} ${idx}`,
          login_type: "qr",
          user_id: user.id,
          proxy_id: proxyId,
          uazapi_token: token?.token || null,
        });
        if (token) tokenIdx++;
        idx++;
      }

      for (let i = 0; i < noProxyCount; i++) {
        const token = tokens?.[tokenIdx];
        inserts.push({
          name: `${prefix} ${idx}`,
          login_type: "qr",
          user_id: user.id,
          proxy_id: null,
          uazapi_token: token?.token || null,
        });
        if (token) tokenIdx++;
        idx++;
      }

      // Reserve tokens
      const usedTokenIds = (tokens || []).slice(0, tokenIdx).map((t: any) => t.id);
      if (usedTokenIds.length > 0) {
        await admin.from("user_api_tokens").update({ status: "reserved" }).in("id", usedTokenIds);
      }

      const { data: newDevices, error: bulkErr } = await admin
        .from("devices")
        .insert(inserts)
        .select("id, name, status, login_type, number, proxy_id, profile_picture, profile_name, created_at, updated_at, instance_type");

      if (bulkErr) {
        if (usedTokenIds.length > 0) {
          await admin.from("user_api_tokens").update({ status: "available" }).in("id", usedTokenIds);
        }
        throw bulkErr;
      }

      // Mark tokens as in_use
      if (newDevices && tokens) {
        for (let i = 0; i < Math.min(newDevices.length, tokens.length); i++) {
          await admin.from("user_api_tokens").update({
            status: "in_use",
            device_id: newDevices[i].id,
            assigned_at: new Date().toISOString(),
          }).eq("id", tokens[i].id);
        }
      }

      // Mark assigned proxies as USANDO
      const assignedProxyIds = (newDevices || [])
        .map((d: any) => d.proxy_id)
        .filter(Boolean);
      if (assignedProxyIds.length > 0) {
        await admin.from("proxies").update({ status: "USANDO" }).in("id", assignedProxyIds);
      }

      // Log bulk creation
      for (const d of (newDevices || [])) {
        await oplog(admin, user.id, "instance_created", `Instância "${d.name}" criada (bulk)`, d.id, { proxy_id: d.proxy_id, has_token: !!inserts.find((ins: any) => ins.name === d.name)?.uazapi_token });
        if (d.proxy_id) await oplog(admin, user.id, "proxy_assigned", `Proxy atribuída → USANDO`, d.id, { proxy_id: d.proxy_id });
      }

      // Return devices without token fields
      const safeDevices = (newDevices || []).map((d: any) => ({
        ...d,
        has_api_config: !!inserts.find((ins: any) => ins.name === d.name)?.uazapi_token,
      }));

      return new Response(
        JSON.stringify({ devices: safeDevices, count: safeDevices.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── DELETE DEVICE ──────────────────────────────────────────
    if (action === "delete") {
      const { deviceId } = body;
      if (!deviceId) throw new Error("deviceId obrigatório.");

      // Verify ownership
      const { data: device } = await admin
        .from("devices")
        .select("id, proxy_id, user_id")
        .eq("id", deviceId)
        .eq("user_id", user.id)
        .single();
      if (!device) throw new Error("Instância não encontrada.");

      // 1. Delete instance from UaZapi server (non-blocking)
      try {
        const evolutionUrl = `${supabaseUrl}/functions/v1/evolution-connect`;
        await fetch(evolutionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({ action: "deleteInstance", deviceId }),
        });
      } catch (e) {
        console.warn("Failed to delete instance from provider (non-blocking):", e);
      }

      // 2. Release token back to pool
      await admin.from("user_api_tokens").update({
        status: "available",
        device_id: null,
        assigned_at: null,
      }).eq("device_id", deviceId);

      // 3. Clean up warmup data (jobs first due to FK on cycles)
      await admin.from("warmup_jobs").delete().eq("device_id", deviceId);
      await admin.from("warmup_audit_logs").delete().eq("device_id", deviceId);
      await admin.from("warmup_logs").delete().eq("device_id", deviceId);
      await admin.from("warmup_instance_groups").delete().eq("device_id", deviceId);
      await admin.from("warmup_community_membership").delete().eq("device_id", deviceId);
      await admin.from("warmup_sessions").delete().eq("device_id", deviceId);
      await admin.from("warmup_cycles").delete().eq("device_id", deviceId);

      // 4. Release proxy
      if (device.proxy_id) {
        await admin.from("proxies").update({ status: "USADA" }).eq("id", device.proxy_id);
        await oplog(admin, user.id, "proxy_released", `Proxy liberada → USADA`, deviceId, { proxy_id: device.proxy_id });
      }

      await oplog(admin, user.id, "instance_deleted", `Instância deletada`, deviceId);

      // 5. Delete device record
      const { error: delErr } = await admin.from("devices").delete().eq("id", deviceId);
      if (delErr) throw delErr;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── CREATE REPORT_WA DEVICE ──────────────────────────────
    if (action === "create-report") {
      // Check if user already has a report_wa device
      const { data: existing } = await admin
        .from("devices")
        .select("id")
        .eq("user_id", user.id)
        .eq("login_type", "report_wa")
        .limit(1)
        .maybeSingle();

      if (existing) {
        throw new Error("Já existe uma instância de relatório configurada.");
      }

      const { data: newDevice, error: insertErr } = await admin
        .from("devices")
        .insert({
          name: "Relatorio Via Whatsapp",
          login_type: "report_wa",
          user_id: user.id,
          status: "Disconnected",
          instance_type: "notificacao",
        })
        .select("id, name, status, login_type, created_at")
        .single();

      if (insertErr) throw insertErr;

      return new Response(
        JSON.stringify({ device: newDevice }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("manage-devices error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
