import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { groupLinks, deviceIds } = await req.json();

    if (!groupLinks?.length || !deviceIds?.length) {
      return new Response(
        JSON.stringify({ error: "Selecione pelo menos um grupo e um dispositivo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get global UaZapi config as fallback
    const UAZAPI_BASE_URL = Deno.env.get("UAZAPI_BASE_URL");
    const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");

    // Fetch devices
    const { data: devices, error: devError } = await supabase
      .from("devices")
      .select("id, name, uazapi_token, uazapi_base_url")
      .in("id", deviceIds)
      .eq("user_id", user.id);

    if (devError || !devices?.length) {
      return new Response(
        JSON.stringify({ error: "Dispositivos não encontrados" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ device: string; group: string; status: string; error?: string }> = [];

    for (const device of devices) {
      for (const link of groupLinks) {
        try {
          // Extract invite code: remove URL prefix and query params
          const inviteCode = link
            .replace("https://chat.whatsapp.com/", "")
            .replace("http://chat.whatsapp.com/", "")
            .split("?")[0]
            .split("/")[0]
            .trim();

          console.log(`Joining group inviteCode=${inviteCode} for device ${device.name}`);

          // Use per-device token/url, fallback to global secrets
          const deviceToken = device.uazapi_token || UAZAPI_TOKEN;
          const deviceBaseUrl = (device.uazapi_base_url || UAZAPI_BASE_URL || "").replace(/\/+$/, "");

          if (!deviceToken || !deviceBaseUrl) {
            results.push({
              device: device.name,
              group: link,
              status: "error",
              error: "Token ou URL UaZapi não configurado para este dispositivo",
            });
            continue;
          }

          const response = await fetch(`${deviceBaseUrl}/group/acceptInviteGroup`, {
            method: "PUT",
            headers: {
              "token": deviceToken,
              "Accept": "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inviteCode: inviteCode }),
          });

          const data = await response.json();
          console.log(`Join result for ${device.name}:`, response.status, JSON.stringify(data).substring(0, 300));

          results.push({
            device: device.name,
            group: link,
            status: response.ok ? "success" : "error",
            error: response.ok ? undefined : (data.message || JSON.stringify(data)),
          });
        } catch (err) {
          console.error(`Join error for ${device.name}:`, err);
          results.push({
            device: device.name,
            group: link,
            status: "error",
            error: String(err),
          });
        }
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});