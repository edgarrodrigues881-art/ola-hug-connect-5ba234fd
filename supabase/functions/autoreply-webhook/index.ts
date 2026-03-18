import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, token",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ──────────────────────────────────────────────────────────────
// UAZAPI HELPERS
// ──────────────────────────────────────────────────────────────

async function uazapiSend(baseUrl: string, token: string, endpoint: string, payload: any) {
  const url = `${baseUrl}${endpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[autoreply] API error ${res.status}: ${text}`);
    throw new Error(`API error ${res.status}`);
  }
  return JSON.parse(text);
}

async function sendFlowMessage(
  baseUrl: string,
  token: string,
  phone: string,
  text: string,
  imageUrl?: string,
  buttons?: { id: string; label: string }[]
) {
  const cleanPhone = phone.replace(/\D/g, "");

  const hasButtons = buttons && buttons.length > 0;
  if (hasButtons) {
    const choices = buttons!
      .map((b) => `${b.label}|${b.id}`)
      .filter(Boolean);

    const payload: any = {
      number: cleanPhone,
      type: "button",
      text,
      choices,
    };
    if (imageUrl) payload.imageButton = imageUrl;
    return await uazapiSend(baseUrl, token, "/send/menu", payload);
  }

  if (imageUrl) {
    return await uazapiSend(baseUrl, token, "/send/media", {
      number: cleanPhone,
      file: imageUrl,
      type: "image",
      caption: text,
    });
  }

  return await uazapiSend(baseUrl, token, "/send/text", {
    number: cleanPhone,
    text,
  });
}

// ──────────────────────────────────────────────────────────────
// FLOW GRAPH HELPERS
// ──────────────────────────────────────────────────────────────

interface FlowNode {
  id: string;
  type: string;
  data: {
    label?: string;
    trigger?: string;
    keyword?: string;
    text?: string;
    imageUrl?: string;
    imageCaption?: string;
    buttons?: { id: string; label: string; targetNodeId: string }[];
    delaySeconds?: number;
    action?: string;
    templateId?: string;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

function findNextNodes(nodeId: string, edges: FlowEdge[]): string[] {
  return edges
    .filter((e) => e.source === nodeId)
    .map((e) => e.target);
}

function findNodeById(nodeId: string, nodes: FlowNode[]): FlowNode | undefined {
  return nodes.find((n) => n.id === nodeId);
}

// Check if a message matches a flow's trigger
function matchesTrigger(
  startNode: FlowNode,
  messageText: string,
  isFirstMessage: boolean
): boolean {
  const trigger = startNode.data.trigger || "any_message";

  switch (trigger) {
    case "any_message":
      return true;
    case "keyword": {
      const keyword = (startNode.data.keyword || "").trim().toLowerCase();
      if (!keyword) return false;
      // Support multiple keywords separated by comma
      const keywords = keyword.split(",").map((k) => k.trim()).filter(Boolean);
      const msgLower = messageText.toLowerCase().trim();
      return keywords.some((kw) => msgLower.includes(kw));
    }
    case "new_contact":
      return isFirstMessage;
    case "start_chat":
      return isFirstMessage;
    case "template":
      // Template trigger = keyword match or any message based on config
      return true;
    default:
      return false;
  }
}

// ──────────────────────────────────────────────────────────────
// MAIN HANDLER
// ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();

    // ── Handle webhook registration request from frontend ──
    if (body.action === "register_webhook") {
      return await handleRegisterWebhook(supabase, body, req);
    }

    // ── Parse incoming message from UaZapi webhook ──
    const event = body.event || body.type || "";
    const msgData = body.data || body;

    // Extract message details
    let fromPhone = "";
    let messageText = "";
    let buttonResponseId = "";
    let isFromMe = false;
    let instanceToken = "";

    // Try to get the instance token from headers or body
    instanceToken = req.headers.get("token") || body.token || body.instance_token || "";

    // UaZapi format
    if (msgData.key) {
      fromPhone = (msgData.key.remoteJid || "").replace(/@.*$/, "");
      isFromMe = msgData.key.fromMe === true;
    } else if (msgData.from || msgData.phone || msgData.number) {
      fromPhone = (msgData.from || msgData.phone || msgData.number || "").replace(/\D/g, "");
    }

    // Extract message text
    if (msgData.message) {
      const msg = msgData.message;
      messageText =
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.imageMessage?.caption ||
        msg.videoMessage?.caption ||
        msg.documentMessage?.caption ||
        "";

      // Button response
      if (msg.buttonsResponseMessage) {
        buttonResponseId = msg.buttonsResponseMessage.selectedButtonId || "";
        messageText = msg.buttonsResponseMessage.selectedDisplayText || messageText;
      }
      if (msg.templateButtonReplyMessage) {
        buttonResponseId = msg.templateButtonReplyMessage.selectedId || "";
        messageText = msg.templateButtonReplyMessage.selectedDisplayText || messageText;
      }
      if (msg.listResponseMessage) {
        buttonResponseId = msg.listResponseMessage.singleSelectReply?.selectedRowId || "";
        messageText = msg.listResponseMessage.title || messageText;
      }
    } else if (msgData.body || msgData.text || msgData.messageBody) {
      messageText = msgData.body || msgData.text || msgData.messageBody || "";
    }

    // Skip messages from ourselves or group messages
    if (isFromMe || !fromPhone || fromPhone.includes("g.us")) {
      return json({ ok: true, skipped: true, reason: "self_or_group" });
    }

    // Skip non-message events
    if (event && !event.includes("message") && !event.includes("Message") && event !== "") {
      return json({ ok: true, skipped: true, reason: "non_message_event" });
    }

    console.log(`[autoreply] Incoming from ${fromPhone}: "${messageText}" buttonId: "${buttonResponseId}" token: ${instanceToken ? "yes" : "no"}`);

    // ── Find the device by token ──
    if (!instanceToken) {
      return json({ ok: true, skipped: true, reason: "no_token" });
    }

    const { data: device } = await supabase
      .from("devices")
      .select("id, user_id, uazapi_token, uazapi_base_url, status")
      .eq("uazapi_token", instanceToken)
      .maybeSingle();

    if (!device) {
      console.log("[autoreply] Device not found for token");
      return json({ ok: true, skipped: true, reason: "device_not_found" });
    }

    const deviceId = device.id;
    const userId = device.user_id;
    const baseUrl = (device.uazapi_base_url || "").replace(/\/+$/, "");
    const token = device.uazapi_token!;

    // ── Find active flows for this device ──
    const { data: flows } = await supabase
      .from("autoreply_flows")
      .select("id, nodes, edges, device_id")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!flows || flows.length === 0) {
      return json({ ok: true, skipped: true, reason: "no_active_flows" });
    }

    // Filter flows assigned to this device (or no device = all devices)
    const matchingFlows = flows.filter(
      (f) => !f.device_id || f.device_id === deviceId
    );

    if (matchingFlows.length === 0) {
      return json({ ok: true, skipped: true, reason: "no_matching_flows" });
    }

    // ── Check for existing session (button click continuation) ──
    if (buttonResponseId) {
      const { data: session } = await supabase
        .from("autoreply_sessions")
        .select("*")
        .eq("device_id", deviceId)
        .eq("contact_phone", fromPhone)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        const flow = matchingFlows.find((f) => f.id === session.flow_id);
        if (flow) {
          const nodes = flow.nodes as FlowNode[];
          const edges = flow.edges as FlowEdge[];
          const currentNode = findNodeById(session.current_node_id, nodes);

          if (currentNode?.data.buttons) {
            // Find button that was clicked
            const clickedButton = currentNode.data.buttons.find(
              (b) => b.id === buttonResponseId || b.label === buttonResponseId
            );

            if (clickedButton?.targetNodeId) {
              // Navigate to the target node
              await processNodeChain(
                supabase,
                baseUrl,
                token,
                fromPhone,
                clickedButton.targetNodeId,
                nodes,
                edges,
                session.id,
                flow.id,
                deviceId,
                userId
              );
              return json({ ok: true, action: "button_navigation" });
            }
          }

          // Button not mapped — try next nodes in sequence
          const nextNodes = findNextNodes(session.current_node_id, edges);
          if (nextNodes.length > 0) {
            await processNodeChain(
              supabase,
              baseUrl,
              token,
              fromPhone,
              nextNodes[0],
              nodes,
              edges,
              session.id,
              flow.id,
              deviceId,
              userId
            );
            return json({ ok: true, action: "sequence_next" });
          }
        }
      }
    }

    // ── Check for existing active session (text response continuation) ──
    {
      const { data: existingSession } = await supabase
        .from("autoreply_sessions")
        .select("*")
        .eq("device_id", deviceId)
        .eq("contact_phone", fromPhone)
        .eq("status", "waiting_response")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSession) {
        const flow = matchingFlows.find((f) => f.id === existingSession.flow_id);
        if (flow) {
          const nodes = flow.nodes as FlowNode[];
          const edges = flow.edges as FlowEdge[];
          const nextNodes = findNextNodes(existingSession.current_node_id, edges);

          if (nextNodes.length > 0) {
            await processNodeChain(
              supabase,
              baseUrl,
              token,
              fromPhone,
              nextNodes[0],
              nodes,
              edges,
              existingSession.id,
              flow.id,
              deviceId,
              userId
            );
            return json({ ok: true, action: "waiting_response_continued" });
          }
        }
      }
    }

    // ── No active session — check if message matches any flow trigger ──
    // Check if this is a first-time message (no prior sessions)
    const { count: priorSessions } = await supabase
      .from("autoreply_sessions")
      .select("id", { count: "exact", head: true })
      .eq("device_id", deviceId)
      .eq("contact_phone", fromPhone);

    const isFirstMessage = (priorSessions || 0) === 0;

    for (const flow of matchingFlows) {
      const nodes = flow.nodes as FlowNode[];
      const edges = flow.edges as FlowEdge[];

      const startNode = nodes.find((n) => n.type === "startNode");
      if (!startNode) continue;

      if (!matchesTrigger(startNode, messageText, isFirstMessage)) continue;

      console.log(`[autoreply] Flow ${flow.id} matched for ${fromPhone}`);

      // Create session
      const { data: newSession, error: sessErr } = await supabase
        .from("autoreply_sessions")
        .upsert(
          {
            flow_id: flow.id,
            device_id: deviceId,
            user_id: userId,
            contact_phone: fromPhone,
            current_node_id: startNode.id,
            status: "active",
            last_message_at: new Date().toISOString(),
          },
          { onConflict: "flow_id,contact_phone" }
        )
        .select("id")
        .single();

      if (sessErr) {
        console.error("[autoreply] Session create error:", sessErr.message);
        continue;
      }

      // Start processing from nodes connected to start
      const nextNodes = findNextNodes(startNode.id, edges);

      // If start node has text (template mode), send it first
      if (startNode.data.text) {
        await sendFlowMessage(
          baseUrl,
          token,
          fromPhone,
          startNode.data.text,
          startNode.data.imageUrl || undefined,
          startNode.data.buttons?.map((b) => ({ id: b.id, label: b.label }))
        );

        // Update session to start node (for button handling)
        await supabase
          .from("autoreply_sessions")
          .update({
            current_node_id: startNode.id,
            status: startNode.data.buttons?.length ? "active" : "active",
            last_message_at: new Date().toISOString(),
          })
          .eq("id", newSession!.id);

        // If there are buttons, wait for response
        if (startNode.data.buttons?.length) {
          return json({ ok: true, action: "start_with_buttons" });
        }
      }

      // Process the chain of connected nodes
      if (nextNodes.length > 0) {
        await processNodeChain(
          supabase,
          baseUrl,
          token,
          fromPhone,
          nextNodes[0],
          nodes,
          edges,
          newSession!.id,
          flow.id,
          deviceId,
          userId
        );
      }

      return json({ ok: true, action: "flow_started" });
    }

    return json({ ok: true, skipped: true, reason: "no_trigger_match" });
  } catch (err) {
    console.error("[autoreply] Error:", err);
    return json({ error: "Internal error", details: err.message }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// PROCESS NODE CHAIN
// ──────────────────────────────────────────────────────────────

async function processNodeChain(
  supabase: any,
  baseUrl: string,
  token: string,
  phone: string,
  startNodeId: string,
  nodes: FlowNode[],
  edges: FlowEdge[],
  sessionId: string,
  flowId: string,
  deviceId: string,
  userId: string
) {
  let currentNodeId = startNodeId;
  let maxSteps = 20; // Safety limit

  while (currentNodeId && maxSteps-- > 0) {
    const node = findNodeById(currentNodeId, nodes);
    if (!node) break;

    switch (node.type) {
      case "messageNode": {
        const text = node.data.text || "";
        if (text) {
          await sendFlowMessage(
            baseUrl,
            token,
            phone,
            text,
            node.data.imageUrl || undefined,
            node.data.buttons?.map((b) => ({ id: b.id, label: b.label }))
          );
        }

        // Update session
        await supabase
          .from("autoreply_sessions")
          .update({
            current_node_id: node.id,
            last_message_at: new Date().toISOString(),
            status: "active",
          })
          .eq("id", sessionId);

        // If node has buttons with targets, wait for button click
        const hasButtonTargets = node.data.buttons?.some((b) => b.targetNodeId);
        if (hasButtonTargets) {
          return; // Stop chain, wait for button response
        }

        // Continue to next node
        const nextNodes = findNextNodes(node.id, edges);
        currentNodeId = nextNodes[0] || "";
        break;
      }

      case "delayNode": {
        const delaySeconds = node.data.delaySeconds || 5;
        // For delays > 30s, we can't hold the request open
        // For short delays, wait inline
        if (delaySeconds <= 30) {
          await new Promise((r) => setTimeout(r, delaySeconds * 1000));
        } else {
          // For longer delays, save state and stop
          // A scheduler would need to resume this, but for now we cap at 30s
          const cappedDelay = Math.min(delaySeconds, 30);
          await new Promise((r) => setTimeout(r, cappedDelay * 1000));
        }

        // Update session
        await supabase
          .from("autoreply_sessions")
          .update({
            current_node_id: node.id,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        const nextNodes = findNextNodes(node.id, edges);
        currentNodeId = nextNodes[0] || "";
        break;
      }

      case "endNode": {
        // End the flow
        await supabase
          .from("autoreply_sessions")
          .update({
            current_node_id: node.id,
            status: "completed",
            last_message_at: new Date().toISOString(),
          })
          .eq("id", sessionId);

        if (node.data.action === "wait_response") {
          await supabase
            .from("autoreply_sessions")
            .update({ status: "waiting_response" })
            .eq("id", sessionId);
        }
        return;
      }

      default:
        // Unknown node type, skip
        const nextNodes = findNextNodes(node.id, edges);
        currentNodeId = nextNodes[0] || "";
        break;
    }
  }

  // Chain ended (no more nodes)
  await supabase
    .from("autoreply_sessions")
    .update({ status: "completed" })
    .eq("id", sessionId);
}
