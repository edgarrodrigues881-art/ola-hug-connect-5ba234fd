import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const onlineStatuses = new Set(["connected", "Connected", "Ready", "ready", "authenticated"]);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

interface FlowNode {
  id: string;
  type: string;
  data: {
    trigger?: string;
    keyword?: string;
    text?: string;
    imageUrl?: string;
    imageCaption?: string;
    delay?: number;
    buttons?: { id: string; label: string; targetNodeId?: string }[];
    delaySeconds?: number;
    action?: string;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
}

interface DraftFlowPayload {
  name?: string;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
}

function findNextNodes(nodeId: string, edges: FlowEdge[]): string[] {
  return edges.filter((e) => e.source === nodeId).map((e) => e.target);
}

function findNodeById(nodeId: string, nodes: FlowNode[]) {
  return nodes.find((node) => node.id === nodeId);
}

function matchesTrigger(startNode: FlowNode, messageText: string, isFirstMessage: boolean) {
  const trigger = startNode.data.trigger || "any_message";
  switch (trigger) {
    case "any_message":
    case "template":
      return true;
    case "keyword": {
      const keyword = (startNode.data.keyword || "").trim().toLowerCase();
      if (!keyword) return false;
      const keywords = keyword.split(",").map((item) => item.trim()).filter(Boolean);
      const msgLower = messageText.toLowerCase().trim();
      return keywords.some((kw) => msgLower.includes(kw));
    }
    case "new_contact":
    case "start_chat":
      return isFirstMessage;
    default:
      return false;
  }
}

/** Collect all message nodes to send in order, following the flow graph */
function collectFlowMessages(nodes: FlowNode[], edges: FlowEdge[], startNode: FlowNode) {
  const visited = new Set<string>();
  const messages: { text: string; imageUrl?: string; imageCaption?: string; delay?: number; buttons?: { id: string; label: string }[] }[] = [];
  let currentNodeId = startNode.id;
  let maxSteps = 30;

  while (currentNodeId && maxSteps-- > 0 && !visited.has(currentNodeId)) {
    visited.add(currentNodeId);
    const node = findNodeById(currentNodeId, nodes);
    if (!node) break;

    // Collect message from messageNode or startNode with text
    if (node.type === "messageNode" || (node.type === "startNode" && node.data.text)) {
      const text = (node.data.text || "").trim();
      if (text || node.data.imageUrl) {
        messages.push({
          text,
          imageUrl: node.data.imageUrl || undefined,
          imageCaption: node.data.imageCaption || undefined,
          delay: node.data.delay || 0,
          buttons: node.data.buttons?.length ? node.data.buttons : undefined,
        });
      }
      // If node has buttons, stop traversal (user needs to pick)
      if (node.data.buttons?.length) break;
    }

    if (node.type === "delayNode") {
      // We'll add the delay to the next message
    }

    if (node.type === "endNode") break;

    const nextNodes = findNextNodes(node.id, edges);
    currentNodeId = nextNodes[0] || "";
  }

  return messages;
}

function isValidDraftFlow(draftFlow: DraftFlowPayload | null | undefined) {
  return !!draftFlow && Array.isArray(draftFlow.nodes) && Array.isArray(draftFlow.edges) && draftFlow.nodes.length > 0;
}

async function sendMessage(
  baseUrl: string,
  token: string,
  phone: string,
  text: string,
  imageUrl?: string,
  buttons?: { id: string; label: string }[]
) {
  const url = `${baseUrl}/send/text`;
  const payload: Record<string, unknown> = { number: phone, text };

  if (imageUrl) {
    // Send as image with caption
    const imgUrl = `${baseUrl}/send/image`;
    const imgPayload = { number: phone, image: imageUrl, caption: text || "" };
    console.log(`[test-autoreply] Sending image to ${phone}`);
    const resp = await fetch(imgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify(imgPayload),
    });
    const body = await resp.text();
    console.log(`[test-autoreply] Image response: ${resp.status} ${body.slice(0, 200)}`);
    return { ok: resp.ok, status: resp.status, body };
  }

  if (buttons?.length) {
    // Send with buttons
    const btnUrl = `${baseUrl}/send/buttons`;
    const btnPayload = {
      number: phone,
      title: "",
      text,
      footer: "",
      buttons: buttons.slice(0, 3).map((b) => ({ text: b.label })),
    };
    console.log(`[test-autoreply] Sending buttons to ${phone}`);
    const resp = await fetch(btnUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify(btnPayload),
    });
    const body = await resp.text();
    console.log(`[test-autoreply] Buttons response: ${resp.status} ${body.slice(0, 200)}`);
    // If buttons endpoint fails, fallback to plain text
    if (!resp.ok) {
      console.log(`[test-autoreply] Buttons failed, falling back to text`);
      const resp2 = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify(payload),
      });
      const body2 = await resp2.text();
      return { ok: resp2.ok, status: resp2.status, body: body2 };
    }
    return { ok: resp.ok, status: resp.status, body };
  }

  console.log(`[test-autoreply] Sending text to ${phone}`);
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify(payload),
  });
  const body = await resp.text();
  console.log(`[test-autoreply] Text response: ${resp.status} ${body.slice(0, 200)}`);
  return { ok: resp.ok, status: resp.status, body };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    let user = null;
    const claimsResult = await supabase.auth.getClaims(token);
    user = claimsResult.data?.claims ? { id: claimsResult.data.claims.sub as string } : null;

    if (!user) {
      const userResult = await supabase.auth.getUser(token);
      user = userResult.data.user;
    }

    if (!user) {
      return json({ error: "Não autenticado" }, 401);
    }

    const body = await req.json();
    const deviceId = body.device_id as string | undefined;
    const incomingText = String(body.incoming_text || body.message_text || "").trim();
    const draftFlow = (body.draft_flow || null) as DraftFlowPayload | null;

    if (!deviceId) {
      return json({ error: "Selecione uma instância antes de testar" }, 400);
    }

    if (!incomingText) {
      return json({ error: "Defina uma mensagem de entrada para simular o teste" }, 400);
    }

    // Get user's phone from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();

    if (!profile?.phone) {
      return json({ error: "Cadastre seu telefone no perfil para receber a mensagem de teste" }, 400);
    }

    const phone = normalizePhone(profile.phone);
    if (phone.length < 10) {
      return json({ error: "O telefone do perfil é inválido para o teste" }, 400);
    }

    // Get device with credentials
    const { data: device } = await supabase
      .from("devices")
      .select("id, status, uazapi_token, uazapi_base_url")
      .eq("id", deviceId)
      .single();

    if (!device) {
      return json({ error: "Instância não encontrada" }, 404);
    }

    if (!onlineStatuses.has(device.status)) {
      return json({ error: "A instância selecionada está offline. Reconecte antes de testar." }, 400);
    }

    // Get token - device's own or from pool
    let apiToken = device.uazapi_token;
    let baseUrl = device.uazapi_base_url;

    if (!apiToken) {
      const { data: poolToken } = await supabase
        .from("user_api_tokens")
        .select("token")
        .eq("device_id", deviceId)
        .eq("status", "in_use")
        .limit(1)
        .single();

      if (poolToken) {
        apiToken = poolToken.token;
      }
    }

    if (!baseUrl) {
      baseUrl = Deno.env.get("UAZAPI_BASE_URL") || null;
    }

    if (!apiToken || !baseUrl) {
      return json({ error: "A instância não possui credenciais configuradas. Reconecte o dispositivo." }, 400);
    }

    const cleanBaseUrl = baseUrl.replace(/\/+$/, "");

    // Find matching flow
    const flowsToTest = isValidDraftFlow(draftFlow)
      ? [{
          id: "draft-flow",
          name: draftFlow?.name || "Rascunho",
          device_id: deviceId,
          nodes: draftFlow?.nodes || [],
          edges: draftFlow?.edges || [],
        }]
      : await (async () => {
          const { data: activeFlows } = await supabase
            .from("autoreply_flows")
            .select("id, name, nodes, edges, device_id, updated_at")
            .eq("user_id", user!.id)
            .eq("is_active", true)
            .order("updated_at", { ascending: false });

          if (!activeFlows?.length) return [];
          return activeFlows.filter((flow: any) => !flow.device_id || flow.device_id === deviceId);
        })();

    if (!flowsToTest.length) {
      return json({ error: "Nenhuma automação ativa para esta instância." }, 400);
    }

    const isFirstMessage = true;

    for (const flow of flowsToTest) {
      const nodes = Array.isArray(flow.nodes) ? (flow.nodes as unknown as FlowNode[]) : [];
      const edges = Array.isArray(flow.edges) ? (flow.edges as unknown as FlowEdge[]) : [];
      const startNode = nodes.find((node) => node.type === "startNode");

      if (!startNode) continue;
      if (!matchesTrigger(startNode, incomingText, isFirstMessage)) continue;

      // Collect messages to send
      const messages = collectFlowMessages(nodes, edges, startNode);

      if (messages.length === 0) {
        return json({
          error: "O fluxo não possui mensagens para enviar. Adicione blocos de mensagem após o início.",
        }, 400);
      }

      console.log(`[test-autoreply] Sending ${messages.length} message(s) to ${phone} via flow "${flow.name}"`);

      let sentCount = 0;
      let lastError = "";

      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        // Add delay between messages (min 1s between sends)
        if (i > 0) {
          const delayMs = Math.max((msg.delay || 1) * 1000, 1000);
          await sleep(Math.min(delayMs, 10000)); // cap at 10s for test
        }

        try {
          const result = await sendMessage(
            cleanBaseUrl,
            apiToken,
            phone,
            msg.text,
            msg.imageUrl,
            msg.buttons
          );

          if (result.ok) {
            sentCount++;
          } else {
            lastError = `Erro ${result.status}: ${result.body.slice(0, 100)}`;
            console.error(`[test-autoreply] Send failed: ${lastError}`);
          }
        } catch (err: any) {
          lastError = err.message || String(err);
          console.error(`[test-autoreply] Send exception: ${lastError}`);
        }
      }

      if (sentCount === 0) {
        return json({
          error: "Falha ao enviar mensagem de teste",
          details: lastError,
        }, 500);
      }

      return json({
        success: true,
        phone,
        trigger: incomingText,
        flow_id: flow.id,
        flow_name: flow.name,
        messages_sent: sentCount,
        messages_total: messages.length,
        message: `Teste enviado com sucesso! ${sentCount} mensagem${sentCount > 1 ? "s" : ""} enviada${sentCount > 1 ? "s" : ""} para ${phone}.`,
      });
    }

    return json({
      error: `A mensagem "${incomingText}" não corresponde ao gatilho configurado.`,
    }, 400);
  } catch (err) {
    console.error("[test-autoreply] error:", err);
    return json({ error: "Erro interno", details: err instanceof Error ? err.message : String(err) }, 500);
  }
});
