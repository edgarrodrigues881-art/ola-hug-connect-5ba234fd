/**
 * Temporary diagnostic function to test UAZAPI endpoints
 * Tests: fetch messages, send image, send sticker
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const baseUrl = "https://dgcontingencia.uazapi.com";
  const token = "3efd9a89-36d7-4a50-8166-63b5aa64a626";
  const groupJid = "120363408035119092@g.us";
  const testImageUrl = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&q=60";

  const results: Record<string, any> = {};
  const headers = { token, Accept: "application/json", "Content-Type": "application/json" };

  // ═══ TEST 1: Fetch last messages ═══
  const msgEndpoints = [
    { label: "GET /chat/messages?chatId=", url: `${baseUrl}/chat/messages?chatId=${encodeURIComponent(groupJid)}&count=5` },
    { label: "GET /chat/messages?jid=", url: `${baseUrl}/chat/messages?jid=${encodeURIComponent(groupJid)}&count=5` },
    { label: "GET /chat/messages/{jid}", url: `${baseUrl}/chat/messages/${encodeURIComponent(groupJid)}?count=5` },
    { label: "GET /chat/{jid}/messages", url: `${baseUrl}/chat/${encodeURIComponent(groupJid)}/messages?count=5` },
    { label: "GET /messages/{jid}", url: `${baseUrl}/messages/${encodeURIComponent(groupJid)}?limit=5` },
    { label: "POST /chat/messages (chatId)", url: `${baseUrl}/chat/messages`, body: { chatId: groupJid, count: 5 } },
    { label: "POST /chat/messages (jid)", url: `${baseUrl}/chat/messages`, body: { jid: groupJid, count: 5 } },
    { label: "GET /chat/list?count=5", url: `${baseUrl}/chat/list?count=5` },
    { label: "GET /chats?type=group", url: `${baseUrl}/chats?type=group&count=5` },
    { label: "GET /group/messages?chatId=", url: `${baseUrl}/group/messages?chatId=${encodeURIComponent(groupJid)}&count=5` },
    { label: "POST /group/messages", url: `${baseUrl}/group/messages`, body: { chatId: groupJid, count: 5 } },
    { label: "GET /chat/fetchMessages", url: `${baseUrl}/chat/fetchMessages?chatId=${encodeURIComponent(groupJid)}&count=5` },
    { label: "POST /chat/fetchMessages", url: `${baseUrl}/chat/fetchMessages`, body: { chatId: groupJid, count: 5 } },
  ];

  results.messages = [];
  for (const ep of msgEndpoints) {
    try {
      const opts: RequestInit = { method: ep.body ? "POST" : "GET", headers };
      if (ep.body) opts.body = JSON.stringify(ep.body);
      const res = await fetch(ep.url, opts);
      const raw = await res.text();
      const preview = raw.substring(0, 500);
      results.messages.push({ label: ep.label, status: res.status, preview });
    } catch (e) {
      results.messages.push({ label: ep.label, error: e.message });
    }
  }

  // ═══ TEST 2: Send image (JSON endpoints, dry-run style — actually sends!) ═══
  const imgEndpoints = [
    { label: "POST /send/image (image field)", url: `${baseUrl}/send/image`, body: { number: groupJid, image: testImageUrl, caption: "🧪 teste imagem" } },
    { label: "POST /send/media (media+type=image)", url: `${baseUrl}/send/media`, body: { number: groupJid, media: testImageUrl, type: "image", caption: "🧪 teste imagem" } },
    { label: "POST /send/media (file+type=image)", url: `${baseUrl}/send/media`, body: { number: groupJid, file: testImageUrl, type: "image", caption: "🧪 teste imagem" } },
    { label: "POST /message/sendMedia (chatId)", url: `${baseUrl}/message/sendMedia`, body: { chatId: groupJid, media: testImageUrl, type: "image", caption: "🧪 teste imagem" } },
    { label: "POST /send/media (url field)", url: `${baseUrl}/send/media`, body: { number: groupJid, url: testImageUrl, type: "image", caption: "🧪 teste imagem" } },
  ];

  results.image = [];
  for (const ep of imgEndpoints) {
    try {
      const res = await fetch(ep.url, { method: "POST", headers, body: JSON.stringify(ep.body) });
      const raw = await res.text();
      results.image.push({ label: ep.label, status: res.status, preview: raw.substring(0, 500) });
      if (res.ok) break; // Stop on first success
    } catch (e) {
      results.image.push({ label: ep.label, error: e.message });
    }
  }

  // ═══ TEST 3: Send sticker ═══
  const stickerEndpoints = [
    { label: "POST /send/sticker (file URL)", url: `${baseUrl}/send/sticker`, body: { number: groupJid, file: testImageUrl } },
    { label: "POST /send/sticker (sticker URL)", url: `${baseUrl}/send/sticker`, body: { number: groupJid, sticker: testImageUrl } },
    { label: "POST /send/sticker (media URL)", url: `${baseUrl}/send/sticker`, body: { number: groupJid, media: testImageUrl } },
    { label: "POST /send/sticker (url URL)", url: `${baseUrl}/send/sticker`, body: { number: groupJid, url: testImageUrl } },
    { label: "POST /send/media (type=sticker)", url: `${baseUrl}/send/media`, body: { number: groupJid, media: testImageUrl, type: "sticker" } },
    { label: "POST /send/media (type=sticker, file)", url: `${baseUrl}/send/media`, body: { number: groupJid, file: testImageUrl, type: "sticker" } },
    { label: "POST /send/media (type=sticker, url)", url: `${baseUrl}/send/media`, body: { number: groupJid, url: testImageUrl, type: "sticker" } },
    { label: "POST /message/sendSticker", url: `${baseUrl}/message/sendSticker`, body: { chatId: groupJid, file: testImageUrl } },
  ];

  results.sticker = [];
  for (const ep of stickerEndpoints) {
    try {
      const res = await fetch(ep.url, { method: "POST", headers, body: JSON.stringify(ep.body) });
      const raw = await res.text();
      results.sticker.push({ label: ep.label, status: res.status, preview: raw.substring(0, 500) });
      if (res.ok) break; // Stop on first success
    } catch (e) {
      results.sticker.push({ label: ep.label, error: e.message });
    }
  }

  // ═══ TEST 4: Multipart sticker ═══
  try {
    const imgRes = await fetch(testImageUrl);
    const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
    const mimeType = imgRes.headers.get("content-type") || "image/jpeg";

    const multipartEndpoints = [
      { label: "MULTIPART /send/sticker", url: `${baseUrl}/send/sticker`, fields: { number: groupJid } },
      { label: "MULTIPART /send/media (sticker)", url: `${baseUrl}/send/media`, fields: { number: groupJid, type: "sticker" } },
    ];

    results.sticker_multipart = [];
    for (const ep of multipartEndpoints) {
      try {
        const form = new FormData();
        Object.entries(ep.fields).forEach(([k, v]) => form.append(k, v));
        form.append("file", new Blob([imgBytes], { type: mimeType }), "sticker.jpg");
        const res = await fetch(ep.url, { method: "POST", headers: { token, Accept: "application/json" }, body: form });
        const raw = await res.text();
        results.sticker_multipart.push({ label: ep.label, status: res.status, preview: raw.substring(0, 500) });
        if (res.ok) break;
      } catch (e) {
        results.sticker_multipart.push({ label: ep.label, error: e.message });
      }
    }
  } catch (e) {
    results.sticker_multipart = [{ error: `Download failed: ${e.message}` }];
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
