// CampusCare Lite - serverless complaint system on Cloudflare Workers.
//  - fetch()     : HTTP API (like API Gateway + Lambda)
//  - scheduled() : cron job (like EventBridge + Lambda)
//  - env.DB      : D1 serverless database (like DynamoDB)

const CATEGORIES = ["Hostel", "Mess", "Network", "Academics", "Library", "Transport", "Other"];
const MAX_ATTACHMENT_BYTES = 250 * 1024; // 250 KB after the browser compresses images

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const isAdmin = (request, env) =>
  !!env.ADMIN_KEY && request.headers.get("x-admin-key") === env.ADMIN_KEY;

// Decide the real file type from the first bytes, never from what the client claims.
function sniffMime(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "application/pdf";
  return null;
}

function decodeBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getStats(env) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(status = 'open'), 0) AS open,
            COALESCE(SUM(status = 'resolved'), 0) AS resolved
     FROM complaints`
  ).first();
  const { results } = await env.DB.prepare(
    "SELECT category, COUNT(*) AS n FROM complaints GROUP BY category ORDER BY n DESC"
  ).all();
  return {
    ...row,
    rate: row.total ? Math.round((row.resolved / row.total) * 100) : 0,
    by_category: results,
  };
}

// Counts complaints and stores a summary row. Used by cron and the manual button.
async function generateReport(env, triggerType) {
  const row = await getStats(env);
  await env.DB.prepare(
    "INSERT INTO reports (trigger_type, open_count, resolved_count, total_count) VALUES (?, ?, ?, ?)"
  ).bind(triggerType, row.open, row.resolved, row.total).run();
  console.log(`[${triggerType}] report: total=${row.total} open=${row.open} resolved=${row.resolved}`);
  return { total: row.total, open: row.open, resolved: row.resolved };
}

async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}

async function handleApi(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  // Submit a complaint (public)
  if (path === "/api/complaints" && method === "POST") {
    const body = await readJson(request);
    if (!body) return json({ error: "Invalid JSON" }, 400);
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const location = String(body.location ?? "").trim();
    const category = String(body.category ?? "");
    const submittedBy = String(body.submitted_by ?? "").trim().slice(0, 60) || "Anonymous";
    const clientId = String(body.client_id ?? "").slice(0, 64);
    if (!title || title.length > 100) return json({ error: "Title is required (max 100 characters)" }, 400);
    if (!description || description.length > 500) return json({ error: "Description is required (max 500 characters)" }, 400);
    if (location.length > 100) return json({ error: "Location is too long (max 100 characters)" }, 400);
    if (!CATEGORIES.includes(category)) return json({ error: "Invalid category" }, 400);

    let attachment = null;
    if (body.attachment) {
      const a = body.attachment;
      const data = String(a.data ?? "");
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return json({ error: "Invalid attachment" }, 400);
      if (data.length > Math.ceil((MAX_ATTACHMENT_BYTES * 4) / 3) + 4) return json({ error: "Attachment is too large (max 250 KB)" }, 413);
      let bytes;
      try { bytes = decodeBase64(data); } catch { return json({ error: "Invalid attachment" }, 400); }
      if (bytes.length > MAX_ATTACHMENT_BYTES) return json({ error: "Attachment is too large (max 250 KB)" }, 413);
      const mime = sniffMime(bytes);
      if (!mime) return json({ error: "Only JPG, PNG or PDF files are allowed" }, 400);
      attachment = { name: String(a.name ?? "file").replace(/[^\w.\- ]/g, "_").slice(0, 80), mime, data };
    }

    const result = await env.DB.prepare(
      "INSERT INTO complaints (title, category, location, description, submitted_by, client_id) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(title, category, location, description, submittedBy, clientId).run();
    const id = result.meta.last_row_id;
    if (attachment) {
      await env.DB.prepare(
        "INSERT INTO attachments (complaint_id, file_name, mime, data) VALUES (?, ?, ?, ?)"
      ).bind(id, attachment.name, attachment.mime, attachment.data).run();
    }
    return json({ id, status: "open" }, 201);
  }

  // List complaints (public). ?client_id=... returns only that browser's complaints.
  if (path === "/api/complaints" && method === "GET") {
    const mine = url.searchParams.get("client_id");
    const base = `SELECT c.id, c.title, c.category, c.location, c.description, c.status, c.submitted_by,
                         c.created_at, c.resolved_at,
                         EXISTS(SELECT 1 FROM attachments a WHERE a.complaint_id = c.id) AS has_attachment
                  FROM complaints c`;
    const stmt = mine
      ? env.DB.prepare(`${base} WHERE c.client_id = ? ORDER BY c.id DESC LIMIT 100`).bind(mine.slice(0, 64))
      : env.DB.prepare(`${base} ORDER BY c.id DESC LIMIT 100`);
    const { results } = await stmt.all();
    return json({ complaints: results });
  }

  // Download an attachment
  const att = path.match(/^\/api\/complaints\/(\d+)\/attachment$/);
  if (att && method === "GET") {
    const row = await env.DB.prepare("SELECT file_name, mime, data FROM attachments WHERE complaint_id = ?")
      .bind(Number(att[1])).first();
    if (!row) return json({ error: "No attachment" }, 404);
    return new Response(decodeBase64(row.data), {
      headers: {
        "content-type": row.mime,
        "content-disposition": `inline; filename="${row.file_name}"`,
        "x-content-type-options": "nosniff",
        "content-security-policy": "sandbox; default-src 'none'; img-src 'self' data:",
        "cache-control": "private, max-age=300",
      },
    });
  }

  // Mark resolved / reopen (admin only)
  const match = path.match(/^\/api\/complaints\/(\d+)$/);
  if (match && method === "PATCH") {
    if (!isAdmin(request, env)) return json({ error: "Unauthorized: wrong admin key" }, 401);
    const body = await readJson(request);
    if (!body || !["open", "resolved"].includes(body.status)) return json({ error: "Invalid status" }, 400);
    const resolvedAt = body.status === "resolved" ? "datetime('now')" : "NULL";
    const result = await env.DB.prepare(
      `UPDATE complaints SET status = ?, resolved_at = ${resolvedAt} WHERE id = ?`
    ).bind(body.status, Number(match[1])).run();
    if (!result.meta.changes) return json({ error: "Complaint not found" }, 404);
    return json({ ok: true });
  }

  // Live stats (public)
  if (path === "/api/stats" && method === "GET") return json(await getStats(env));

  // Report history written by cron (public)
  if (path === "/api/reports" && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, run_at, trigger_type, open_count, resolved_count, total_count FROM reports ORDER BY id DESC LIMIT 20"
    ).all();
    return json({ reports: results });
  }

  // Run the report job now (admin only) - same function the cron runs
  if (path === "/api/run-report" && method === "POST") {
    if (!isAdmin(request, env)) return json({ error: "Unauthorized: wrong admin key" }, 401);
    return json(await generateReport(env, "manual"));
  }

  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request, env) {
    try {
      return await handleApi(request, env, new URL(request.url));
    } catch (err) {
      console.error(err);
      return json({ error: "Server error" }, 500);
    }
  },

  // Cron trigger
  async scheduled(event, env, ctx) {
    ctx.waitUntil(generateReport(env, "cron"));
  },
};
