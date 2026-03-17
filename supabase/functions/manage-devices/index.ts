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

      // 2. Find available token — or generate one on-demand
      let available: { id: string; token: string } | null = null;

      // Try available first, then blocked (as fallback)
      for (const st of ["available", "blocked"]) {
        const { data } = await admin
          .from("user_api_tokens")
          .select("id, token")
          .eq("user_id", user.id)
          .eq("status", st)
          .is("device_id", null)
          .limit(1)
          .maybeSingle();
        if (data) {
          available = data;
          break;
        }
      }

      // No token in pool — generate one on-demand via API
      if (!available) {
        const BASE_URL = (Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");
        const ADMIN_TOKEN = Deno.env.get("UAZAPI_TOKEN") || "";
        if (!BASE_URL || !ADMIN_TOKEN) {
          throw new Error("Configuração do provedor incompleta. Contate o administrador.");
        }

        // Get client name for label
        const { data: prof } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        const clientLabel = (prof?.full_name || user.email || "cliente").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 20);

        // Count existing tokens to build sequential label
        const { count: tokenCount } = await admin.from("user_api_tokens")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        const instanceName = `${clientLabel}_${(tokenCount ?? 0) + 1}`;

        // Create instance on provider
        const headerVariants = [
          { admintoken: ADMIN_TOKEN },
          { token: ADMIN_TOKEN },
          { Authorization: `Bearer ${ADMIN_TOKEN}` },
        ];

        let newToken: string | null = null;
        for (const authHeaders of headerVariants) {
          try {
            const res = await fetch(`${BASE_URL}/instance/init`, {
              method: "POST",
              headers: { ...authHeaders, Accept: "application/json", "Content-Type": "application/json" },
              body: JSON.stringify({ name: instanceName }),
            });
            if (res.status === 401) continue;
            const resData = await res.json().catch(() => ({}));
            if (res.ok) {
              newToken = resData.token || resData.instance?.token || resData.data?.token;
              break;
            }
          } catch { /* try next auth method */ }
        }

        if (!newToken) {
          throw new Error("Falha ao gerar token no provedor. Tente novamente ou contate o administrador.");
        }

        // Idempotency check
        const { data: dup } = await admin.from("user_api_tokens")
          .select("id").eq("token", newToken).maybeSingle();
        if (dup) {
          // Token already exists — reuse it
          available = { id: dup.id, token: newToken };
          await admin.from("user_api_tokens").update({ status: "available", device_id: null }).eq("id", dup.id);
        } else {
          // Insert new token
          const { data: inserted, error: insErr } = await admin.from("user_api_tokens").insert({
            user_id: user.id, token: newToken, admin_id: user.id,
            status: "available", healthy: true, label: instanceName,
            last_checked_at: new Date().toISOString(),
          }).select("id, token").single();

          if (insErr || !inserted) throw new Error("Falha ao salvar token gerado.");
          available = inserted;
        }

        console.log(`[manage-devices] on-demand token created: ${instanceName}`);
        await oplog(admin, user.id, "token_on_demand", `Token gerado sob demanda: ${instanceName}`, null, { label: instanceName });
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

      // Get available tokens (pool + blocked fallback)
      const { data: poolTokens } = await admin
        .from("user_api_tokens")
        .select("id, token")
        .eq("user_id", user.id)
        .in("status", ["available", "blocked"])
        .is("device_id", null)
        .order("created_at", { ascending: true })
        .limit(totalCount);

      const tokens = [...(poolTokens || [])];

      // Generate missing tokens on-demand
      const missing = totalCount - tokens.length;
      if (missing > 0) {
        const BASE_URL = (Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");
        const ADMIN_TOKEN_VAL = Deno.env.get("UAZAPI_TOKEN") || "";
        if (BASE_URL && ADMIN_TOKEN_VAL) {
          const { data: prof } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
          const clientLabel = (prof?.full_name || user.email || "cliente").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 20);
          const { count: existingTokenCount } = await admin.from("user_api_tokens")
            .select("id", { count: "exact", head: true }).eq("user_id", user.id);

          for (let i = 0; i < missing; i++) {
            const instName = `${clientLabel}_${(existingTokenCount ?? 0) + tokens.length + i + 1}`;
            const headerVariants = [
              { admintoken: ADMIN_TOKEN_VAL },
              { token: ADMIN_TOKEN_VAL },
              { Authorization: `Bearer ${ADMIN_TOKEN_VAL}` },
            ];
            let newToken: string | null = null;
            for (const authHeaders of headerVariants) {
              try {
                const res = await fetch(`${BASE_URL}/instance/init`, {
                  method: "POST",
                  headers: { ...authHeaders, Accept: "application/json", "Content-Type": "application/json" },
                  body: JSON.stringify({ name: instName }),
                });
                if (res.status === 401) continue;
                const resData = await res.json().catch(() => ({}));
                if (res.ok) {
                  newToken = resData.token || resData.instance?.token || resData.data?.token;
                  break;
                }
              } catch { /* try next */ }
            }
            if (newToken) {
              const { data: dup } = await admin.from("user_api_tokens")
                .select("id").eq("token", newToken).maybeSingle();
              if (!dup) {
                const { data: ins } = await admin.from("user_api_tokens").insert({
                  user_id: user.id, token: newToken, admin_id: user.id,
                  status: "available", healthy: true, label: instName,
                  last_checked_at: new Date().toISOString(),
                }).select("id, token").single();
                if (ins) tokens.push(ins);
              }
            }
          }
        }
      }

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

      // Set uazapi_base_url + mark tokens as in_use + mark proxies as USANDO — all in parallel
      const BASE_URL = (Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");
      const parallelOps: Promise<any>[] = [];

      // Set base URL on all new devices
      if (BASE_URL && newDevices) {
        const deviceIds = newDevices.map((d: any) => d.id);
        parallelOps.push(admin.from("devices").update({ uazapi_base_url: BASE_URL }).in("id", deviceIds));
      }

      // Mark tokens as in_use (batch update instead of sequential)
      if (newDevices && tokens) {
        for (let i = 0; i < Math.min(newDevices.length, tokens.length); i++) {
          parallelOps.push(admin.from("user_api_tokens").update({
            status: "in_use",
            device_id: newDevices[i].id,
            assigned_at: new Date().toISOString(),
          }).eq("id", tokens[i].id));
        }
      }

      // Mark assigned proxies as USANDO
      const assignedProxyIds = (newDevices || [])
        .map((d: any) => d.proxy_id)
        .filter(Boolean);
      if (assignedProxyIds.length > 0) {
        parallelOps.push(admin.from("proxies").update({ status: "USANDO" }).in("id", assignedProxyIds));
      }

      // Run all in parallel
      await Promise.allSettled(parallelOps);

      // Log bulk creation in background (don't block response)
      Promise.allSettled((newDevices || []).map((d: any) => {
        const ops = [oplog(admin, user.id, "instance_created", `Instância "${d.name}" criada (bulk)`, d.id, { proxy_id: d.proxy_id, has_token: !!inserts.find((ins: any) => ins.name === d.name)?.uazapi_token })];
        if (d.proxy_id) ops.push(oplog(admin, user.id, "proxy_assigned", `Proxy atribuída → USANDO`, d.id, { proxy_id: d.proxy_id }));
        return Promise.all(ops);
      })).catch(() => {});

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
        .maybeSingle();
      if (!device) {
        // Already deleted — return success (idempotent)
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
        .select("id, uazapi_token")
        .eq("user_id", user.id)
        .eq("login_type", "report_wa")
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Already exists — just return it, don't create another
        return new Response(
          JSON.stringify({ device: existing, reused: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ADMIN_BASE_URL = (Deno.env.get("UAZAPI_BASE_URL") || "").replace(/\/+$/, "");
      const ADMIN_TOKEN = Deno.env.get("UAZAPI_TOKEN") || "";

      if (!ADMIN_BASE_URL || !ADMIN_TOKEN) {
        throw new Error("Configuração do provedor incompleta. Contate o administrador.");
      }

      // Check if profile already has a token (reuse it instead of creating new)
      const { data: profile } = await admin.from("profiles").select("full_name, whatsapp_monitor_token").eq("id", user.id).maybeSingle();
      let provisionedToken = profile?.whatsapp_monitor_token || null;

      if (!provisionedToken) {
        // Only create new instance on provider if no token exists
        const clientName = (profile?.full_name || user.email || "cliente").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 20);
        const instanceName = `${clientName}_report_wa`;

        const headerVariants = [
          { admintoken: ADMIN_TOKEN },
          { token: ADMIN_TOKEN },
          { Authorization: `Bearer ${ADMIN_TOKEN}` },
        ];

        for (const authHeaders of headerVariants) {
          const res = await fetch(`${ADMIN_BASE_URL}/instance/init`, {
            method: "POST",
            headers: { ...authHeaders, Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ name: instanceName }),
          });
          if (res.status === 401) continue;
          const resData = await res.json().catch(() => ({}));
          if (res.ok) {
            provisionedToken = resData.token || resData.instance?.token || resData.data?.token;
            break;
          }
          throw new Error(`Falha ao criar instância no provedor [${res.status}]: ${JSON.stringify(resData).substring(0, 200)}`);
        }

        if (!provisionedToken) {
          throw new Error("Falha na autenticação com o provedor. Contate o administrador.");
        }

        // Save token to profile
        await admin.from("profiles").update({ whatsapp_monitor_token: provisionedToken }).eq("id", user.id);
      }

      console.log(`[create-report] Token: reused=${!!profile?.whatsapp_monitor_token}`);

      const { data: newDevice, error: insertErr } = await admin
        .from("devices")
        .insert({
          name: "Relatorio Via Whatsapp",
          login_type: "report_wa",
          user_id: user.id,
          status: "Disconnected",
          instance_type: "notificacao",
          uazapi_token: provisionedToken,
          uazapi_base_url: ADMIN_BASE_URL,
        })
        .select("id, name, status, login_type, created_at")
        .single();

      if (insertErr) throw insertErr;

      await oplog(admin, user.id, "report_wa_provisioned", `Instância report_wa criada`, newDevice.id, { token_reused: !!profile?.whatsapp_monitor_token });

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
