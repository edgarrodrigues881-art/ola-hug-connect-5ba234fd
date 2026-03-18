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

function getSkipMessage(reason: string, incomingText: string) {
  switch (reason) {
    case "no_active_flows":
      return "Nenhuma automação ativa para esta instância.";
    case "no_matching_flows":
      return "A automação ativa está vinculada a outra instância.";
    case "no_trigger_match":
      return `A mensagem de teste "${incomingText}" não corresponde ao gatilho configurado.`;
    case "missing_start_node":
      return "A automação não possui nó inicial configurado.";
    default:
      return `Teste ignorado (${reason}).`;
  }
}

interface FlowNode {
  id: string;
  type: string;
  data: {
    trigger?: string;
    keyword?: string;
    text?: string;
    buttons?: { id: string; label: string; targetNodeId?: string }[];
    delaySeconds?: number;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
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
      return true;
    case "template":
      return false;
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

function buildSimulationPreview(nodes: FlowNode[], edges: FlowEdge[], startNode: FlowNode) {
  const visited = new Set<string>();
  const messages: string[] = [];
  let buttonsCount = 0;
  let currentNodeId = startNode.id;
  let maxSteps = 20;

  while (currentNodeId && maxSteps-- > 0 && !visited.has(currentNodeId)) {
    visited.add(currentNodeId);
    const node = findNodeById(currentNodeId, nodes);
    if (!node) break;

    if (node.type === "messageNode" || (node.type === "startNode" && node.data.text)) {
      const text = (node.data.text || "").trim();
      if (text) messages.push(text);
      if (node.data.buttons?.length) {
        buttonsCount += node.data.buttons.length;
        break;
      }
    }

    if (node.type === "delayNode") {
      // only simulate path, no waiting
    }

    if (node.type === "endNode") {
      break;
    }

    const nextNodes = findNextNodes(node.id, edges);
    currentNodeId = nextNodes[0] || "";
  }

  return {
    stepsVisited: visited.size,
    buttonsCount,
    messagesCount: messages.length,
    firstMessage: messages[0] || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return json({ error: "Não autenticado" }, 401);
    }

    const body = await req.json();
    const deviceId = body.device_id as string | undefined;
    const incomingText = String(body.incoming_text || body.message_text || "").trim();

    if (!deviceId) {
      return json({ error: "Selecione uma instância antes de testar" }, 400);
    }

    if (!incomingText) {
      return json({ error: "Defina uma mensagem de entrada para simular o teste" }, 400);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();

    if (!profile?.phone) {
      return json({ error: "Cadastre seu telefone no perfil para testar" }, 400);
    }

    const phone = normalizePhone(profile.phone);
    if (phone.length < 10) {
      return json({ error: "O telefone do perfil é inválido para o teste" }, 400);
    }

    const { data: device } = await supabase
      .from("devices")
      .select("id, status")
      .eq("id", deviceId)
      .eq("user_id", user.id)
      .single();

    if (!device) {
      return json({ error: "Instância não encontrada" }, 404);
    }

    if (!onlineStatuses.has(device.status)) {
      return json({ error: "A instância selecionada está offline. Reconecte antes de testar." }, 400);
    }

    const { data: activeFlows } = await supabase
      .from("autoreply_flows")
      .select("id, name, nodes, edges, device_id, updated_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (!activeFlows?.length) {
      return json({ error: getSkipMessage("no_active_flows", incomingText) }, 400);
    }

    const matchingFlows = activeFlows.filter((flow) => !flow.device_id || flow.device_id === deviceId);
    if (!matchingFlows.length) {
      return json({ error: getSkipMessage("no_matching_flows", incomingText) }, 400);
    }

    const isFirstMessage = true;

    for (const flow of matchingFlows) {
      const nodes = Array.isArray(flow.nodes) ? (flow.nodes as unknown as FlowNode[]) : [];
      const edges = Array.isArray(flow.edges) ? (flow.edges as unknown as FlowEdge[]) : [];
      const startNode = nodes.find((node) => node.type === "startNode");

      if (!startNode) {
        continue;
      }

      if (!matchesTrigger(startNode, incomingText, isFirstMessage)) {
        continue;
      }

      const preview = buildSimulationPreview(nodes, edges, startNode);
      const previewText = preview.firstMessage
        ? ` Primeira mensagem prevista: "${preview.firstMessage.slice(0, 120)}${preview.firstMessage.length > 120 ? "..." : ""}"`
        : "";

      return json({
        success: true,
        simulated: true,
        phone,
        trigger: incomingText,
        flow_id: flow.id,
        flow_name: flow.name,
        steps_visited: preview.stepsVisited,
        messages_count: preview.messagesCount,
        buttons_count: preview.buttonsCount,
        first_message: preview.firstMessage,
        message: `Simulação concluída sem envio real.${previewText}`,
      });
    }

    return json({ error: getSkipMessage("no_trigger_match", incomingText) }, 400);
  } catch (err) {
    console.error("test-autoreply error:", err);
    return json({ error: "Erro interno", details: err instanceof Error ? err.message : String(err) }, 500);
  }
});