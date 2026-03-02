import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Não autorizado");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Não autorizado");

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) throw new Error("Acesso negado: não é admin");

  return { user, adminClient };
}

async function logAction(adminClient: any, adminId: string, targetUserId: string | null, action: string, details: string) {
  await adminClient.from("admin_logs").insert({
    admin_id: adminId,
    target_user_id: targetUserId,
    action,
    details,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user, adminClient } = await verifyAdmin(req);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "dashboard";

    // ─── DASHBOARD ───
    if (action === "dashboard") {
      const { data: authUsers } = await adminClient.auth.admin.listUsers();
      const { data: profiles } = await adminClient.from("profiles").select("*");
      const { data: roles } = await adminClient.from("user_roles").select("*");
      const { data: devices } = await adminClient.from("devices").select("*");
      const { data: campaigns } = await adminClient.from("campaigns").select("*");
      const { data: contacts } = await adminClient.from("contacts").select("*");
      const { data: subscriptions } = await adminClient.from("subscriptions").select("*");
      const { data: cycles } = await adminClient.from("subscription_cycles").select("*");
      const { data: payments } = await adminClient.from("payments").select("*");
      const { data: adminLogs } = await adminClient.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(500);
      const { data: costs } = await adminClient.from("admin_costs").select("*");

      const users = authUsers?.users?.map((u: any) => {
        const profile = profiles?.find((p: any) => p.id === u.id);
        const userRoles = roles?.filter((r: any) => r.user_id === u.id).map((r: any) => r.role) || [];
        const userDevices = devices?.filter((d: any) => d.user_id === u.id) || [];
        const userCampaigns = campaigns?.filter((c: any) => c.user_id === u.id) || [];
        const sub = subscriptions?.find((s: any) => s.user_id === u.id);
        return {
          id: u.id,
          email: u.email,
          full_name: profile?.full_name || null,
          company: profile?.company || null,
          phone: profile?.phone || null,
          document: profile?.document || null,
          avatar_url: profile?.avatar_url || null,
          status: profile?.status || "active",
          risk_flag: profile?.risk_flag || false,
          admin_notes: profile?.admin_notes || null,
          roles: userRoles,
          devices_count: userDevices.length,
          devices_connected: userDevices.filter((d: any) => d.status === "Connected").length,
          campaigns_count: userCampaigns.length,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          plan_name: sub?.plan_name || null,
          plan_price: sub?.plan_price || 0,
          max_instances: sub?.max_instances || 0,
          instance_override: profile?.instance_override || 0,
          plan_expires_at: sub?.expires_at || null,
          plan_started_at: sub?.started_at || null,
        };
      }) || [];

      const devicesWithOwner = (devices || []).map((d: any) => {
        const profile = profiles?.find((p: any) => p.id === d.user_id);
        return { ...d, owner_name: profile?.full_name || "Desconhecido" };
      });

      const stats = {
        total_users: authUsers?.users?.length || 0,
        total_devices: devices?.length || 0,
        active_devices: devices?.filter((d: any) => d.status === "Connected").length || 0,
        total_campaigns: campaigns?.length || 0,
        total_contacts: contacts?.length || 0,
        total_subscriptions: subscriptions?.length || 0,
      };

      return new Response(JSON.stringify({ users, devices: devicesWithOwner, stats, cycles: cycles || [], payments: payments || [], admin_logs: adminLogs || [], costs: costs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CLIENT DETAIL ───
    if (action === "client-detail" && req.method === "POST") {
      const { target_user_id } = await req.json();
      
      const { data: authUser } = await adminClient.auth.admin.getUserById(target_user_id);
      const { data: profile } = await adminClient.from("profiles").select("*").eq("id", target_user_id).maybeSingle();
      const { data: sub } = await adminClient.from("subscriptions").select("*").eq("user_id", target_user_id).maybeSingle();
      const { data: devices } = await adminClient.from("devices").select("*").eq("user_id", target_user_id).order("created_at", { ascending: false });
      const { data: campaigns } = await adminClient.from("campaigns").select("id, name, status, created_at, sent_count, total_contacts").eq("user_id", target_user_id).order("created_at", { ascending: false }).limit(20);
      const { data: logs } = await adminClient.from("admin_logs").select("*").eq("target_user_id", target_user_id).order("created_at", { ascending: false }).limit(50);
      const { data: payments } = await adminClient.from("payments").select("*").eq("user_id", target_user_id).order("paid_at", { ascending: false });
      const { data: cycles } = await adminClient.from("subscription_cycles").select("*").eq("user_id", target_user_id).order("cycle_start", { ascending: false });

      return new Response(JSON.stringify({
        user: authUser?.user || null,
        profile,
        subscription: sub,
        devices: devices || [],
        campaigns: campaigns || [],
        admin_logs: logs || [],
        payments: payments || [],
        cycles: cycles || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── UPDATE CLIENT PROFILE ───
    if (action === "update-client" && req.method === "POST") {
      const { target_user_id, full_name, phone, document, company, status, risk_flag, admin_notes, instance_override } = await req.json();
      
      // Check if override changed for logging
      const { data: oldProfile } = await adminClient.from("profiles").select("instance_override").eq("id", target_user_id).maybeSingle();
      const oldOverride = oldProfile?.instance_override ?? 0;
      const newOverride = instance_override ?? 0;

      await adminClient.from("profiles").update({
        full_name, phone, document, company, status, risk_flag, admin_notes,
        instance_override: newOverride,
        updated_at: new Date().toISOString(),
      }).eq("id", target_user_id);

      await logAction(adminClient, user.id, target_user_id, "update-client", `Dados atualizados`);

      if (oldOverride !== newOverride) {
        await logAction(adminClient, user.id, target_user_id, "instance-override",
          newOverride > 0
            ? `Override de instâncias: ${oldOverride} → ${newOverride} (+${newOverride} extras)`
            : `Override de instâncias removido (era +${oldOverride})`
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── UPDATE SUBSCRIPTION ───
    if (action === "update-subscription" && req.method === "POST") {
      const { target_user_id, plan_name, plan_price, max_instances, expires_at, started_at } = await req.json();
      
      // Upsert subscription
      const { data: existing } = await adminClient.from("subscriptions").select("id").eq("user_id", target_user_id).maybeSingle();
      
      if (existing) {
        await adminClient.from("subscriptions").update({
          plan_name, plan_price, max_instances, expires_at, started_at,
          updated_at: new Date().toISOString(),
        }).eq("user_id", target_user_id);
      } else {
        await adminClient.from("subscriptions").insert({
          user_id: target_user_id, plan_name, plan_price, max_instances, expires_at, started_at,
        });
      }

      await logAction(adminClient, user.id, target_user_id, "update-subscription", `Plano: ${plan_name}, Instâncias: ${max_instances}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── RESET PASSWORD ───
    if (action === "reset-password" && req.method === "POST") {
      const { target_user_id, email } = await req.json();
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      // Use admin API to generate reset link
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
      });

      if (error) throw error;

      await logAction(adminClient, user.id, target_user_id, "reset-password", `Reset de senha solicitado para ${email}`);

      return new Response(JSON.stringify({ success: true, message: "Link de redefinição gerado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── FORCE LOGOUT (invalidate sessions) ───
    if (action === "force-logout" && req.method === "POST") {
      const { target_user_id } = await req.json();
      
      // Sign out user from all sessions
      await adminClient.auth.admin.signOut(target_user_id);

      await logAction(adminClient, user.id, target_user_id, "force-logout", `Forçado logout do usuário`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SUSPEND/ACTIVATE CLIENT ───
    if (action === "toggle-status" && req.method === "POST") {
      const { target_user_id, new_status } = await req.json();
      
      await adminClient.from("profiles").update({ status: new_status, updated_at: new Date().toISOString() }).eq("id", target_user_id);

      // If suspending, also ban auth user
      if (new_status === "suspended" || new_status === "cancelled") {
        await adminClient.auth.admin.updateUserById(target_user_id, { ban_duration: "876600h" }); // ~100 years
      } else if (new_status === "active") {
        await adminClient.auth.admin.updateUserById(target_user_id, { ban_duration: "none" });
      }

      await logAction(adminClient, user.id, target_user_id, "toggle-status", `Status alterado para: ${new_status}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SET ROLE ───
    if (action === "set-role" && req.method === "POST") {
      const { target_user_id, role, remove } = await req.json();

      const PRIMARY_ADMIN_ID = "86d67880-af22-4c3f-a2c4-fa324a354737";
      if (target_user_id === PRIMARY_ADMIN_ID && remove) {
        return new Response(JSON.stringify({ error: "Não é possível remover o admin principal" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (remove) {
        await adminClient.from("user_roles").delete().eq("user_id", target_user_id).eq("role", role);
      } else {
        await adminClient.from("user_roles").upsert({ user_id: target_user_id, role }, { onConflict: "user_id,role" });
      }

      await logAction(adminClient, user.id, target_user_id, "set-role", `${remove ? "Removida" : "Adicionada"} role: ${role}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET ADMIN LOGS ───
    if (action === "admin-logs") {
      const { data: logs } = await adminClient
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      return new Response(JSON.stringify({ logs: logs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE DEVICE FOR USER ───
    if (action === "create-device" && req.method === "POST") {
      const { target_user_id, name, login_type } = await req.json();
      
      const { data, error } = await adminClient.from("devices").insert({
        user_id: target_user_id,
        name,
        login_type: login_type || "qr",
        status: "Disconnected",
      }).select().single();

      if (error) throw error;

      await logAction(adminClient, user.id, target_user_id, "create-device", `Instância criada: ${name}`);

      return new Response(JSON.stringify({ success: true, device: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DELETE DEVICE ───
    if (action === "delete-device" && req.method === "POST") {
      const { target_user_id, device_id, device_name } = await req.json();
      
      await adminClient.from("devices").delete().eq("id", device_id);

      await logAction(adminClient, user.id, target_user_id, "delete-device", `Instância removida: ${device_name}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── LIST PAYMENTS ───
    if (action === "list-payments" && req.method === "POST") {
      const { target_user_id } = await req.json();
      const { data: payments } = await adminClient.from("payments").select("*").eq("user_id", target_user_id).order("paid_at", { ascending: false });
      return new Response(JSON.stringify({ payments: payments || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ADD PAYMENT ───
    if (action === "add-payment" && req.method === "POST") {
      const { target_user_id, amount, method, notes, paid_at } = await req.json();
      await adminClient.from("payments").insert({
        user_id: target_user_id,
        amount,
        method,
        notes,
        paid_at,
        admin_id: user.id,
      });
      await logAction(adminClient, user.id, target_user_id, "add-payment", `Pagamento: R$ ${amount} via ${method}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DELETE PAYMENT ───
    if (action === "delete-payment" && req.method === "POST") {
      const { payment_id, target_user_id } = await req.json();
      await adminClient.from("payments").delete().eq("id", payment_id);
      await logAction(adminClient, user.id, target_user_id, "delete-payment", `Pagamento removido: ${payment_id}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── LIST MESSAGES ───
    if (action === "list-messages" && req.method === "POST") {
      const { target_user_id } = await req.json();
      const { data: messages } = await adminClient.from("client_messages").select("*").eq("user_id", target_user_id).order("sent_at", { ascending: false });
      return new Response(JSON.stringify({ messages: messages || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE CYCLE (renew subscription) ───
    if (action === "create-cycle" && req.method === "POST") {
      const { target_user_id, plan_name, cycle_amount, cycle_start, cycle_end } = await req.json();

      // Get or create subscription
      const { data: existing } = await adminClient.from("subscriptions").select("id").eq("user_id", target_user_id).maybeSingle();
      
      let subId = existing?.id;
      if (!subId) {
        const { data: newSub } = await adminClient.from("subscriptions").insert({
          user_id: target_user_id, plan_name, plan_price: cycle_amount, max_instances: 10,
          started_at: cycle_start, expires_at: cycle_end,
        }).select("id").single();
        subId = newSub?.id;
      } else {
        // Update subscription expiry to the new cycle end
        await adminClient.from("subscriptions").update({
          expires_at: cycle_end, started_at: cycle_start, plan_name,
          updated_at: new Date().toISOString(),
        }).eq("user_id", target_user_id);
      }

      // Insert cycle
      await adminClient.from("subscription_cycles").insert({
        user_id: target_user_id,
        subscription_id: subId,
        plan_name,
        cycle_start,
        cycle_end,
        cycle_amount,
        status: "pending",
      });

      await logAction(adminClient, user.id, target_user_id, "create-cycle", `Novo ciclo: ${plan_name}, R$ ${cycle_amount}, ${cycle_start} → ${cycle_end}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── REVERT LAST CYCLE ───
    if (action === "revert-cycle" && req.method === "POST") {
      const { target_user_id } = await req.json();

      // Get most recent cycle
      const { data: cycles } = await adminClient.from("subscription_cycles")
        .select("*").eq("user_id", target_user_id)
        .order("cycle_start", { ascending: false }).limit(2);

      if (!cycles || cycles.length === 0) {
        return new Response(JSON.stringify({ error: "Nenhum ciclo para reverter" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const latest = cycles[0];
      await adminClient.from("subscription_cycles").delete().eq("id", latest.id);

      // If there's a previous cycle, restore subscription to it
      if (cycles.length > 1) {
        const prev = cycles[1];
        await adminClient.from("subscriptions").update({
          expires_at: prev.cycle_end, started_at: prev.cycle_start, plan_name: prev.plan_name,
          updated_at: new Date().toISOString(),
        }).eq("user_id", target_user_id);
      }

      await logAction(adminClient, user.id, target_user_id, "revert-cycle", `Ciclo revertido: ${latest.plan_name}, ${latest.cycle_start} → ${latest.cycle_end}`);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── UPDATE CYCLE STATUS ───
    if (action === "update-cycle-status" && req.method === "POST") {
      const { cycle_id, status, target_user_id } = await req.json();
      await adminClient.from("subscription_cycles").update({ status }).eq("id", cycle_id);
      await logAction(adminClient, user.id, target_user_id, "update-cycle-status", `Ciclo ${cycle_id} → ${status}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SAVE MESSAGE ───
    if (action === "save-message" && req.method === "POST") {
      const { target_user_id, template_type, message_content, observation } = await req.json();
      await adminClient.from("client_messages").insert({
        user_id: target_user_id, admin_id: user.id, template_type, message_content, observation,
      });
      await logAction(adminClient, user.id, target_user_id, "send-message", `Mensagem: ${template_type}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ADD COST ───
    if (action === "add-cost" && req.method === "POST") {
      const { category, amount, description, cost_date } = await req.json();
      await adminClient.from("admin_costs").insert({
        admin_id: user.id, category, amount, description, cost_date,
      });
      await logAction(adminClient, user.id, null, "add-cost", `Custo: ${category} R$ ${amount}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── UPDATE COST ───
    if (action === "update-cost" && req.method === "POST") {
      const { cost_id, category, amount, description, cost_date } = await req.json();
      await adminClient.from("admin_costs").update({ category, amount, description, cost_date }).eq("id", cost_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DELETE COST ───
    if (action === "delete-cost" && req.method === "POST") {
      const { cost_id } = await req.json();
      await adminClient.from("admin_costs").delete().eq("id", cost_id);
      await logAction(adminClient, user.id, null, "delete-cost", `Custo removido: ${cost_id}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const status = error.message?.includes("autorizado") ? 401 : error.message?.includes("negado") ? 403 : 500;
    return new Response(JSON.stringify({ error: error.message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
