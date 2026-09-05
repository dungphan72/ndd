// Cloudflare Worker: relay gui thong bao Zalo Bot khi co giao dich VIP moi.
// Ly do can worker nay: Zalo Bot API (bot-api.zaloplatforms.com) khong tra
// header CORS, nen trinh duyet KHONG THE goi truc tiep. Worker nay chay
// phia server, nhan request tu website, roi goi Zalo Bot API ho.
//
// Secrets can thiet lap truoc khi deploy (khong ghi thang vao code):
//   wrangler secret put ZALO_BOT_TOKEN
//   wrangler secret put ZALO_CHAT_ID
//   wrangler secret put RELAY_SHARED_SECRET
//
// RELAY_SHARED_SECRET la 1 chuoi ngau nhien do ban tu dat (vd: dung
// `openssl rand -hex 16`), dung de front-end xac thuc voi worker nay.
// No khong phai la bot token that, nen neu lo bi lo cung khong the
// dieu khien bot lam viec khac ngoai gui tin vao dung 1 chat_id co dinh.

const ALLOWED_ORIGIN = "https://nhomdinhduong.vn";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Relay-Secret",
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders() });
    }

    const providedSecret = request.headers.get("X-Relay-Secret") || "";
    if (providedSecret !== env.RELAY_SHARED_SECRET) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const text = (body && body.text ? String(body.text) : "").slice(0, 2000);
    if (!text) {
      return new Response(JSON.stringify({ ok: false, error: "Missing text" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const zaloUrl = `https://bot-api.zaloplatforms.com/bot${env.ZALO_BOT_TOKEN}/sendMessage`;
    const zaloRes = await fetch(zaloUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: env.ZALO_CHAT_ID, text }),
    });

    const zaloData = await zaloRes.json().catch(() => ({}));

    return new Response(JSON.stringify({ ok: zaloRes.ok, zalo: zaloData }), {
      status: zaloRes.ok ? 200 : 502,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  },
};
