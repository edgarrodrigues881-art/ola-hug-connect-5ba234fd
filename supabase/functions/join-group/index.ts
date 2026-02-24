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

    // Fetch devices with their tokens
    const { data: devices, error: devError } = await supabase
      .from("devices")
      .select("id, name, whapi_token")
      .in("id", deviceIds)
      .eq("user_id", user.id);

    if (devError || !devices?.length) {
      return new Response(
        JSON.stringify({ error: "Dispositivos não encontrados" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uazapiBaseUrl = Deno.env.get("UAZAPI_BASE_URL");

    const results: Array<{ device: string; group: string; status: string; error?: string }> = [];

    for (const device of devices) {
      for (const link of groupLinks) {
        try {
          if (!uazapiBaseUrl || !device.whapi_token) {
            results.push({
              device: device.name,
              group: link,
              status: "skipped",
              error: !uazapiBaseUrl
                ? "UAZAPI_BASE_URL não configurada"
                : "Token do dispositivo não configurado",
            });
            continue;
          }

          // Extract invite code from WhatsApp link
          const inviteCode = link
            .replace("https://chat.whatsapp.com/", "")
            .split("?")[0];

          // UaZapi endpoint: PUT /group/joinGroup/{instance}
          const response = await fetch(
            `${uazapiBaseUrl}/group/joinGroup/${device.whapi_token}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ link: inviteCode }),
            }
          );

          const data = await response.json();

          results.push({
            device: device.name,
            group: link,
            status: response.ok ? "success" : "error",
            error: response.ok ? undefined : JSON.stringify(data),
          });
        } catch (err) {
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
