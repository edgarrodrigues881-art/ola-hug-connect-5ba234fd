import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-device-id, token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  console.log(`[autoreply] Sending to ${endpoint}: ${JSON.stringify(payload).substring(0, 200)}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[autoreply] API error ${res.status}: ${text}`);
    throw new Error(`API error ${res.status}: ${text.substring(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
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

// Find all next nodes from a given node (no handle filter)
function findNextNodes(nodeId: string, edges: FlowEdge[]): string[] {
  return edges
    .filter((e) => e.source === nodeId)
    .map((e) => e.target);
}

// Find the next node for a specific button handle
function findNextNodeForButton(nodeId: string, buttonId: string, edges: FlowEdge[]): string | null {
  // Edges from button handles use sourceHandle like "btn-{buttonId}"
  const possibleHandles = [
    `btn-${buttonId}`,
    buttonId,
  ];

  for (const handle of possibleHandles) {
    const edge = edges.find((e) => e.source === nodeId && e.sourceHandle === handle);
    if (edge) return edge.target;
  }

  // Also try partial match (handle contains buttonId)
  const partialMatch = edges.find(
    (e) => e.source === nodeId && e.sourceHandle && e.sourceHandle.includes(buttonId)
  );
  if (partialMatch) return partialMatch.target;

  return null;
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
      const keywords = keyword.split(",").map((k) => k.trim()).filter(Boolean);
      const msgLower = messageText.toLowerCase().trim();
      return keywords.some((kw) => msgLower.includes(kw));
    }
    case "new_contact":
      return isFirstMessage;
    case "start_chat":
      return isFirstMessage;
    case "template":
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
    let deviceHeaderId = "";

    // Try to get instance identifiers from headers/body
    instanceToken = (
      req.headers.get("token") ||
      req.headers.get("x-instance-token") ||
      body.token ||
      body.instance_token ||
      ""
    ).trim().replace(/^Bearer\s+/i, "");

    deviceHeaderId = (
      req.headers.get("x-device-id") ||
      body.device_id ||
      body.instance_id ||
      body.deviceId ||
      ""
    ).trim();

    const webhookSecret = req.headers.get("x-webhook-secret") || "";
    const expectedWebhookSecret = Deno.env.get("WEBHOOK_SECRET") || "";
    if (webhookSecret && expectedWebhookSecret && webhookSecret !== expectedWebhookSecret) {
      return json({ error: "Invalid webhook secret" }, 401);
    }

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

    // Also check for button response at top level (some UaZapi versions)
    if (!buttonResponseId) {
      buttonResponseId = msgData.selectedButtonId || msgData.buttonId || body.selectedButtonId || "";
    }

    // Skip messages from ourselves or group messages
    if (isFromMe || !fromPhone || fromPhone.includes("g.us")) {
      return json({ ok: true, skipped: true, reason: "self_or_group" });
    }

    // Skip non-message events
    if (event && !event.includes("message") && !event.includes("Message") && event !== "") {
      return json({ ok: true, skipped: true, reason: "non_message_event" });
    }

    console.log(`[autoreply] Incoming from ${fromPhone}: "${messageText}" buttonId: "${buttonResponseId}" token: ${instanceToken ? "yes" : "no"} deviceId: ${deviceHeaderId || "no"}`);

    // ── Find the device by explicit device id, fallback to token ──
    if (!deviceHeaderId && !instanceToken) {
      return json({ ok: true, skipped: true, reason: "no_device_identifier" });
    }

    let device: { id: string; user_id: string; uazapi_token: string | null; uazapi_base_url: string | null; status: string } | null = null;

    if (deviceHeaderId) {
      const { data } = await supabase
        .from("devices")
        .select("id, user_id, uazapi_token, uazapi_base_url, status")
        .eq("id", deviceHeaderId)
        .maybeSingle();
      device = data;
    }

    if (!device && instanceToken) {
      const { data } = await supabase
        .from("devices")
        .select("id, user_id, uazapi_token, uazapi_base_url, status")
        .eq("uazapi_token", instanceToken)
        .maybeSingle();
      device = data;
    }

    if (!device) {
      console.log("[autoreply] Device not found for webhook identifiers");
      return json({ ok: true, skipped: true, reason: "device_not_found" });
    }

    const deviceId = device.id;
    const userId = device.user_id;
    const baseUrl = (device.uazapi_base_url || "").replace(/\/+$/, "");
    const deviceToken = device.uazapi_token!;

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
            const clickedButton = currentNode.data.buttons.find(
              (b) => b.id === buttonResponseId || b.label === buttonResponseId
            );

            // 1. Try explicit targetNodeId on the button
            if (clickedButton?.targetNodeId) {
              console.log(`[autoreply] Button "${clickedButton.label}" → targetNodeId ${clickedButton.targetNodeId}`);
              await processNodeChain(supabase, baseUrl, deviceToken, fromPhone, clickedButton.targetNodeId, nodes, edges, session.id, flow.id, deviceId, userId);
              return json({ ok: true, action: "button_navigation" });
            }

            // 2. Try resolving via edge sourceHandle (the correct approach for flow editor)
            if (clickedButton) {
              const targetFromEdge = findNextNodeForButton(currentNode.id, clickedButton.id, edges);
              if (targetFromEdge) {
                console.log(`[autoreply] Button "${clickedButton.label}" → edge target ${targetFromEdge}`);
                await processNodeChain(supabase, baseUrl, deviceToken, fromPhone, targetFromEdge, nodes, edges, session.id, flow.id, deviceId, userId);
                return json({ ok: true, action: "button_edge_navigation" });
              }
            }

            // 3. Also try matching by label text in button response
            if (!clickedButton) {
              const labelMatch = currentNode.data.buttons.find(
                (b) => b.label.toLowerCase() === messageText.toLowerCase().trim()
              );
              if (labelMatch) {
                const targetFromEdge = findNextNodeForButton(currentNode.id, labelMatch.id, edges);
                if (targetFromEdge) {
                  console.log(`[autoreply] Button label match "${labelMatch.label}" → edge target ${targetFromEdge}`);
                  await processNodeChain(supabase, baseUrl, deviceToken, fromPhone, targetFromEdge, nodes, edges, session.id, flow.id, deviceId, userId);
                  return json({ ok: true, action: "button_label_navigation" });
                }
                if (labelMatch.targetNodeId) {
                  await processNodeChain(supabase, baseUrl, deviceToken, fromPhone, labelMatch.targetNodeId, nodes, edges, session.id, flow.id, deviceId, userId);
                  return json({ ok: true, action: "button_label_target_navigation" });
                }
              }
            }
          }

          // Fallback: try next nodes in sequence (first edge from current node)
          const nextNodes = findNextNodes(session.current_node_id, edges);
          if (nextNodes.length > 0) {
            console.log(`[autoreply] Button fallback → first edge target ${nextNodes[0]}`);
            await processNodeChain(supabase, baseUrl, deviceToken, fromPhone, nextNodes[0], nodes, edges, session.id, flow.id, deviceId, userId);
            return json({ ok: true, action: "sequence_next" });
          }
        }
      }
    }

    // ── Check for existing active session with text matching a button label ──
    {
      const { data: activeSession } = await supabase
        .from("autoreply_sessions")
        .select("*")
        .eq("device_id", deviceId)
        .eq("contact_phone", fromPhone)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSession && messageText) {
        const flow = matchingFlows.find((f) => f.id === activeSession.flow_id);
        if (flow) {
          const nodes = flow.nodes as FlowNode[];
          const edges = flow.edges as FlowEdge[];
          const currentNode = findNodeById(activeSession.current_node_id, nodes);

          // Check if the text matches a button label (user typed the button text)
          if (currentNode?.data.buttons?.length) {
            const labelMatch = currentNode.data.buttons.find(
              (b) => b.label.toLowerCase().trim() === messageText.toLowerCase().trim()
            );
            if (labelMatch) {
              const targetFromEdge = findNextNodeForButton(currentNode.id, labelMatch.id, edges);
              const targetNode = targetFromEdge || labelMatch.targetNodeId || null;
              if (targetNode) {
                console.log(`[autoreply] Text matches button label "${labelMatch.label}" → ${targetNode}`);
                await processNodeChain(supabase, baseUrl, deviceToken, fromPhone, targetNode, nodes, edges, activeSession.id, flow.id, deviceId, userId);
                return json({ ok: true, action: "text_as_button" });
              }
            }
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
            await processNodeChain(supabase, baseUrl, deviceToken, fromPhone, nextNodes[0], nodes, edges, existingSession.id, flow.id, deviceId, userId);
            return json({ ok: true, action: "waiting_response_continued" });
          }
        }
      }
    }

    // ── No active session — check if message matches any flow trigger ──
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

      // Create or reset session
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

      // If start node has text (template mode), send it first
      if (startNode.data.text) {
        try {
          await sendFlowMessage(
            baseUrl,
            deviceToken,
            fromPhone,
            startNode.data.text,
            startNode.data.imageUrl || undefined,
            startNode.data.buttons?.map((b) => ({ id: b.id, label: b.label }))
          );
          console.log(`[autoreply] Start message sent to ${fromPhone}`);
        } catch (sendErr) {
          console.error(`[autoreply] Failed to send start message: ${sendErr}`);
          return json({ error: "Failed to send start message", details: sendErr instanceof Error ? sendErr.message : String(sendErr) }, 502);
        }

        // Update session to start node
        await supabase
          .from("autoreply_sessions")
          .update({
            current_node_id: startNode.id,
            status: "active",
            last_message_at: new Date().toISOString(),
          })
          .eq("id", newSession!.id);

        // If there are buttons, wait for response
        if (startNode.data.buttons?.length) {
          return json({ ok: true, action: "start_with_buttons" });
        }
      }

      // Process the chain of connected nodes
      const nextNodes = findNextNodes(startNode.id, edges);
      if (nextNodes.length > 0) {
        await processNodeChain(supabase, baseUrl, deviceToken, fromPhone, nextNodes[0], nodes, edges, newSession!.id, flow.id, deviceId, userId);
      }

      return json({ ok: true, action: "flow_started" });
    }

    return json({ ok: true, skipped: true, reason: "no_trigger_match" });
  } catch (err) {
    console.error("[autoreply] Error:", err);
    return json({ error: "Internal error", details: err instanceof Error ? err.message : String(err) }, 500);
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
  let maxSteps = 20;

  while (currentNodeId && maxSteps-- > 0) {
    const node = findNodeById(currentNodeId, nodes);
    if (!node) break;

    switch (node.type) {
      case "messageNode": {
        const text = node.data.text || "";
        if (text) {
          try {
            await sendFlowMessage(
              baseUrl,
              token,
              phone,
              text,
              node.data.imageUrl || undefined,
              node.data.buttons?.map((b) => ({ id: b.id, label: b.label }))
            );
            console.log(`[autoreply] Message sent: "${text.substring(0, 50)}..." to ${phone}`);
          } catch (sendErr) {
            console.error(`[autoreply] Failed to send message node ${node.id}: ${sendErr}`);
            // Don't break chain for send errors - log and continue
          }
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

        // If node has buttons with targets or edge connections, wait for button click
        const hasButtonTargets = node.data.buttons?.some((b) => b.targetNodeId);
        const hasButtonEdges = node.data.buttons?.some((b) => findNextNodeForButton(node.id, b.id, edges));
        if (hasButtonTargets || hasButtonEdges) {
          return; // Stop chain, wait for button response
        }

        // If has buttons at all (even without mapped targets), still wait
        if (node.data.buttons?.length) {
          return;
        }

        // Continue to next node
        const nextNodes = findNextNodes(node.id, edges);
        currentNodeId = nextNodes[0] || "";
        break;
      }

      case "delayNode": {
        const delaySeconds = node.data.delaySeconds || 5;
        const cappedDelay = Math.min(delaySeconds, 30);
        await new Promise((r) => setTimeout(r, cappedDelay * 1000));

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

      default: {
        const nextNodes = findNextNodes(node.id, edges);
        currentNodeId = nextNodes[0] || "";
        break;
      }
    }
  }

  // Chain ended
  await supabase
    .from("autoreply_sessions")
    .update({ status: "completed" })
    .eq("id", sessionId);
}

// ──────────────────────────────────────────────────────────────
// WEBHOOK REGISTRATION ON UAZAPI
// ──────────────────────────────────────────────────────────────

async function handleRegisterWebhook(supabase: any, body: any, req: Request) {
  const { device_id } = body;

  const authHeader = req.headers.get("authorization") ?? "";
  const bearerToken = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const internalSecret = Deno.env.get("INTERNAL_TICK_SECRET") || "";
  const cronSecret = req.headers.get("x-cron-secret") || body._internal_secret || "";
  const isServiceRole = bearerToken === serviceRoleKey;
  const isInternal = internalSecret && cronSecret === internalSecret;

  if (isServiceRole || isInternal) {
    const { data: device } = await supabase
      .from("devices")
      .select("id, user_id, uazapi_token, uazapi_base_url")
      .eq("id", device_id)
      .single();
    if (!device?.uazapi_token || !device?.uazapi_base_url) {
      return json({ error: "Device not configured" }, 400);
    }
    return await doRegisterWebhook(device);
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser(bearerToken);
  if (authErr || !user) {
    return json({ error: "Not authenticated" }, 401);
  }

  const { data: device } = await supabase
    .from("devices")
    .select("id, uazapi_token, uazapi_base_url")
    .eq("id", device_id)
    .eq("user_id", user.id)
    .single();

  if (!device?.uazapi_token || !device?.uazapi_base_url) {
    return json({ error: "Device not configured" }, 400);
  }

  return await doRegisterWebhook(device);
}

async function doRegisterWebhook(device: any) {
  const baseUrl = device.uazapi_base_url.replace(/\/+$/, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const webhookUrl = `${supabaseUrl}/functions/v1/autoreply-webhook`;
  const webhookSecret = Deno.env.get("WEBHOOK_SECRET") || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    token: device.uazapi_token,
  };

  const webhookHeaders: Record<string, string> = {
    token: device.uazapi_token,
    "x-device-id": device.id,
  };
  if (webhookSecret) {
    webhookHeaders["x-webhook-secret"] = webhookSecret;
  }

  // Try multiple endpoint formats for different UaZapi versions
  const attempts = [
    // UaZapi GO v2 format
    {
      url: `${baseUrl}/webhook`,
      body: {
        url: webhookUrl,
        enabled: true,
        events: ["messages"],
        excludeMessages: ["wasSentByApi"],
        addUrlEvents: true,
        headers: webhookHeaders,
      },
    },
    // UaZapi GO alternate format
    {
      url: `${baseUrl}/webhook`,
      body: {
        webhookURL: webhookUrl,
        enabled: true,
        events: ["messages"],
        excludeMessages: ["wasSentByApi"],
        webhookHeaders,
      },
    },
    // UaZapi legacy format
    {
      url: `${baseUrl}/webhook/set`,
      body: {
        url: webhookUrl,
        enabled: true,
        events: ["messages"],
        excludeMessages: ["wasSentByApi"],
        headers: webhookHeaders,
      },
    },
  ];

  let lastError = "";
  let lastStatus = 0;

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, {
        method: "POST",
        headers,
        body: JSON.stringify(attempt.body),
      });

      const text = await res.text();
      console.log(`[autoreply] Webhook attempt ${attempt.url}: ${res.status} ${text.substring(0, 300)}`);

      if (res.ok || res.status === 200 || res.status === 201) {
        return json({ ok: true, webhook_url: webhookUrl, endpoint: attempt.url });
      }

      lastError = text;
      lastStatus = res.status;

      // If method not allowed, try next format
      if (res.status === 405) continue;
      // If bad request, try next format
      if (res.status === 400) continue;

      // For other errors, return immediately
      return json({ error: `Webhook registration failed (${res.status})`, details: text.substring(0, 300) }, 502);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[autoreply] Webhook attempt ${attempt.url} error:`, lastError);
      continue;
    }
  }

  // Also try PUT method as some versions use that
  try {
    const res = await fetch(`${baseUrl}/webhook`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        url: webhookUrl,
        events: ["messages"],
        headers: webhookHeaders,
      }),
    });

    const text = await res.text();
    console.log(`[autoreply] Webhook PUT attempt: ${res.status} ${text.substring(0, 300)}`);

    if (res.ok) {
      return json({ ok: true, webhook_url: webhookUrl, endpoint: "PUT /webhook" });
    }

    lastError = text;
    lastStatus = res.status;
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
  }

  console.error(`[autoreply] All webhook registration attempts failed. Last: ${lastStatus} ${lastError}`);
  return json({
    error: "Falha ao registrar webhook em todos os formatos",
    details: `Status ${lastStatus}: ${lastError.substring(0, 300)}`,
    webhook_url: webhookUrl,
    manual_setup: "Configure manualmente: cole a URL acima no campo 'URL' do webhook na UaZapi, evento 'messages', exclua 'wasSentByApi'",
  }, 502);
}
