import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user is admin using their token
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acesso negado: não é admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "dashboard";

    if (action === "dashboard") {
      // Fetch all users with profiles
      const { data: users } = await adminClient.auth.admin.listUsers();
      const { data: profiles } = await adminClient.from("profiles").select("*");
      const { data: roles } = await adminClient.from("user_roles").select("*");
      const { data: devices } = await adminClient.from("devices").select("*");
      const { data: campaigns } = await adminClient.from("campaigns").select("*");
      const { data: contacts } = await adminClient.from("contacts").select("*");

      const usersWithProfiles = users?.users?.map((u) => {
        const profile = profiles?.find((p) => p.id === u.id);
        const userRoles = roles?.filter((r) => r.user_id === u.id).map((r) => r.role) || [];
        const userDevices = devices?.filter((d) => d.user_id === u.id) || [];
        const userCampaigns = campaigns?.filter((c) => c.user_id === u.id) || [];
        return {
          id: u.id,
          email: u.email,
          full_name: profile?.full_name || null,
          company: profile?.company || null,
          phone: profile?.phone || null,
          avatar_url: profile?.avatar_url || null,
          roles: userRoles,
          devices_count: userDevices.length,
          campaigns_count: userCampaigns.length,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
        };
      }) || [];

      // Map devices with owner info
      const devicesWithOwner = (devices || []).map((d) => {
        const profile = profiles?.find((p) => p.id === d.user_id);
        const ownerUser = users?.users?.find((u) => u.id === d.user_id);
        return {
          ...d,
          owner_name: profile?.full_name || ownerUser?.email || "Desconhecido",
        };
      });

      const stats = {
        total_users: users?.users?.length || 0,
        total_devices: devices?.length || 0,
        active_devices: devices?.filter((d) => d.status === "Connected").length || 0,
        total_campaigns: campaigns?.length || 0,
        total_contacts: contacts?.length || 0,
      };

      return new Response(JSON.stringify({ users: usersWithProfiles, devices: devicesWithOwner, stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set-role" && req.method === "POST") {
      const { target_user_id, role, remove } = await req.json();

      // Protect primary admin
      const PRIMARY_ADMIN_ID = "86d67880-af22-4c3f-a2c4-fa324a354737";
      if (target_user_id === PRIMARY_ADMIN_ID && remove) {
        return new Response(JSON.stringify({ error: "Não é possível remover o admin principal" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (remove) {
        await adminClient.from("user_roles").delete().eq("user_id", target_user_id).eq("role", role);
      } else {
        await adminClient.from("user_roles").upsert(
          { user_id: target_user_id, role },
          { onConflict: "user_id,role" }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "devices") {
      const { data: devices } = await adminClient
        .from("devices")
        .select("*, profiles:user_id(full_name)")
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({ devices }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
