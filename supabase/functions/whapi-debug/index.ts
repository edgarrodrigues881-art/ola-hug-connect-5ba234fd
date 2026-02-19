const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WHAPI_BASE = "https://gate.whapi.cloud";
const TOKEN = "T4e3JEsIGeGMHG1AjZZjPlB6p84aL76w";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results: Record<string, any> = {};

    // 1. Check health
    const healthRes = await fetch(`${WHAPI_BASE}/health`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
    });
    results.health = { status: healthRes.status, body: await healthRes.json().catch(() => null) };

    // 2. Check recent messages to see delivery status
    const msgsRes = await fetch(`${WHAPI_BASE}/messages/list?count=5&chatId=5562994192500@s.whatsapp.net`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
    });
    results.recentMessages = { status: msgsRes.status, body: await msgsRes.json().catch(() => null) };

    // 3. Try sending a simple test directly
    const sendRes = await fetch(`${WHAPI_BASE}/messages/text`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ to: "5562994192500", body: "Teste direto debug " + new Date().toISOString() }),
    });
    const sendBody = await sendRes.json().catch(() => null);
    results.directSend = { status: sendRes.status, body: sendBody };

    // 4. If we got a message ID, wait 3 seconds and check its status
    if (sendBody?.message?.id) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await fetch(`${WHAPI_BASE}/messages/${sendBody.message.id}`, {
        headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
      });
      results.messageStatusAfter3s = { status: statusRes.status, body: await statusRes.json().catch(() => null) };
    }

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
