const NAME_MAX = 60;
const BODY_MAX = 2000;
const EMAIL_MAX = 254;
const ITEM_ID_MAX = 512;
const SUBJECT_MAX = 200;
const HTML_MAX = 1_000_000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (url.pathname === "/comments" && request.method === "GET") {
        return json(await getComments(url, env), 200, cors);
      }
      if (url.pathname === "/comments/counts" && request.method === "GET") {
        return json(await getCommentCounts(env), 200, cors);
      }
      if (url.pathname === "/comments" && request.method === "POST") {
        return json(await postComment(request, env), 200, cors);
      }
      if (url.pathname === "/subscribe" && request.method === "POST") {
        return json(await postSubscribe(request, env), 200, cors);
      }
      if (url.pathname === "/notify" && request.method === "POST") {
        return json(await postNotify(request, env), 200, cors);
      }
      if (url.pathname === "/unsubscribe" && request.method === "GET") {
        return getUnsubscribe(url, env, cors);
      }
      return json({ error: "not found" }, 404, cors);
    } catch (err) {
      if (err instanceof HttpError) {
        return json({ error: err.message }, err.status, cors);
      }
      console.error(err);
      return json({ error: "internal error" }, 500, cors);
    }
  },
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim());
  const allow = allowed.includes(origin) ? origin : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    Vary: "Origin",
  };
}

async function getComments(url, env) {
  const itemId = (url.searchParams.get("item") || "").trim();
  if (!itemId || itemId.length > ITEM_ID_MAX) {
    throw new HttpError(400, "invalid item");
  }
  const { results } = await env.DB.prepare(
    "SELECT name, body, created_at FROM comments WHERE item_id = ? ORDER BY created_at ASC",
  )
    .bind(itemId)
    .all();
  return { comments: results || [] };
}

async function getCommentCounts(env) {
  const { results } = await env.DB.prepare(
    "SELECT item_id, COUNT(*) AS c FROM comments GROUP BY item_id",
  ).all();
  const counts = {};
  for (const row of results || []) counts[row.item_id] = row.c;
  return { counts };
}

async function postComment(request, env) {
  const data = await readJson(request);
  const itemId = str(data.item, ITEM_ID_MAX, "item");
  const name = str(data.name, NAME_MAX, "name");
  const body = str(data.body, BODY_MAX, "body");
  await verifyTurnstile(data.turnstileToken, request, env);

  const createdAt = Date.now();
  await env.DB.prepare(
    "INSERT INTO comments (item_id, name, body, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(itemId, name, body, createdAt)
    .run();
  return { ok: true, comment: { name, body, created_at: createdAt } };
}

async function postSubscribe(request, env) {
  const data = await readJson(request);
  const email = str(data.email, EMAIL_MAX, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "invalid email");
  }
  await verifyTurnstile(data.turnstileToken, request, env);

  const createdAt = Date.now();
  const token = crypto.randomUUID();
  try {
    await env.DB.prepare(
      "INSERT INTO subscribers (email, unsubscribe_token, created_at) VALUES (?, ?, ?)",
    )
      .bind(email, token, createdAt)
      .run();
    return { ok: true, status: "subscribed" };
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      return { ok: true, status: "already_subscribed" };
    }
    throw err;
  }
}

async function postNotify(request, env) {
  requireAdmin(request, env);
  if (!env.RESEND_API_KEY) throw new HttpError(500, "RESEND_API_KEY not set");
  if (!env.FROM_EMAIL) throw new HttpError(500, "FROM_EMAIL not set");

  const data = await readJson(request);
  const subject = str(data.subject, SUBJECT_MAX, "subject");
  const html = str(data.html, HTML_MAX, "html");
  const text =
    typeof data.text === "string" ? data.text.slice(0, HTML_MAX) : "";
  const fromName = env.FROM_NAME || "jakewel.ch";
  const fromAddress = env.FROM_EMAIL.includes("<")
    ? env.FROM_EMAIL
    : `${fromName} <${env.FROM_EMAIL}>`;

  const { results } = await env.DB.prepare(
    "SELECT id, email, unsubscribe_token FROM subscribers",
  ).all();
  const subscribers = results || [];

  let sent = 0;
  const failures = [];
  const apiBase = new URL(request.url).origin;

  for (const sub of subscribers) {
    let token = sub.unsubscribe_token;
    if (!token) {
      token = crypto.randomUUID();
      await env.DB.prepare(
        "UPDATE subscribers SET unsubscribe_token = ? WHERE id = ?",
      )
        .bind(token, sub.id)
        .run();
    }
    const unsubscribeUrl = `${apiBase}/unsubscribe?token=${encodeURIComponent(token)}`;
    const personalizedHtml = html.replaceAll(
      "{{UNSUBSCRIBE_URL}}",
      unsubscribeUrl,
    );
    const personalizedText = text.replaceAll(
      "{{UNSUBSCRIBE_URL}}",
      unsubscribeUrl,
    );

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [sub.email],
        subject,
        html: personalizedHtml,
        text: personalizedText || undefined,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (resp.ok) {
      sent++;
    } else {
      const body = await resp.text();
      failures.push({
        email: sub.email,
        status: resp.status,
        body: body.slice(0, 500),
      });
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  return { ok: true, total: subscribers.length, sent, failures };
}

async function getUnsubscribe(url, env, cors) {
  const token = (url.searchParams.get("token") || "").trim();
  if (!token) {
    return htmlPage("missing token.", 400, cors);
  }
  const { success, meta } = await env.DB.prepare(
    "DELETE FROM subscribers WHERE unsubscribe_token = ?",
  )
    .bind(token)
    .run();
  const removed = meta && (meta.changes || meta.rows_written) ? 1 : 0;
  if (!success || removed === 0) {
    return htmlPage("not found — you may already be unsubscribed.", 404, cors);
  }
  return htmlPage("unsubscribed. sorry to see you go.", 200, cors);
}

function htmlPage(message, status, cors) {
  const body = `<!doctype html>
<html><head><meta charset="utf-8"><title>jakewel.ch</title>
<style>
  body { font-family: monospace, monospace; font-size: 13px; background: #206818; margin: 0; padding: 0; }
  .card { background: white; border: 1px solid black; max-width: 30em; margin: 3em auto; padding: 1.5em; }
  a { color: #0000EE; }
</style>
</head><body>
<div class="card">
  <p>${escapeHtml(message)}</p>
  <p><a href="https://jakewel.ch/">jakewel.ch</a></p>
</div>
</body></html>`;
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...cors },
  });
}

function requireAdmin(request, env) {
  if (!env.ADMIN_TOKEN) throw new HttpError(500, "ADMIN_TOKEN not set");
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match || match[1] !== env.ADMIN_TOKEN) {
    throw new HttpError(401, "unauthorized");
  }
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "invalid json");
  }
}

function str(value, max, field) {
  if (typeof value !== "string") throw new HttpError(400, `missing ${field}`);
  const trimmed = value.trim();
  if (!trimmed) throw new HttpError(400, `missing ${field}`);
  if (trimmed.length > max) throw new HttpError(400, `${field} too long`);
  return trimmed;
}

function escapeHtml(s) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET) return;
  if (typeof token !== "string" || !token) {
    throw new HttpError(400, "missing turnstile token");
  }
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) form.append("remoteip", ip);

  const resp = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form },
  );
  const result = await resp.json();
  if (!result.success) throw new HttpError(400, "turnstile failed");
}
