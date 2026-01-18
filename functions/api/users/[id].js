const { json, parseJson, requireAdmin, ensureSchema } = require("../../_utils");

const validStatus = new Set(["pending", "approved", "rejected"]);

const getId = (params) => {
  if (!params.id) return null;
  const id = decodeURIComponent(params.id).trim();
  return id || null;
};

exports.onRequestPut = async ({ request, env, params }) => {
  await ensureSchema(env);
  const auth = requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const employeeId = getId(params);
  if (!employeeId) return json({ error: "Invalid employee id" }, { status: 400 });
  const body = await parseJson(request);
  if (!body || !validStatus.has(body.status)) {
    return json({ error: "Invalid payload" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const name = body.name ? body.name.trim() : null;
  const status = body.status;
  const existing = await env.DB.prepare("SELECT status FROM users WHERE employee_id = ?")
    .bind(employeeId)
    .first();
  if (!existing) {
    return json({ error: "User not found" }, { status: 404 });
  }
  const reviewedAt = existing.status !== status ? now : null;

  if (name) {
    await env.DB.prepare(
      "UPDATE users SET name = ?, status = ?, updated_at = ?, reviewed_at = COALESCE(?, reviewed_at) WHERE employee_id = ?"
    )
      .bind(name, status, now, reviewedAt, employeeId)
      .run();
  } else {
    await env.DB.prepare(
      "UPDATE users SET status = ?, updated_at = ?, reviewed_at = COALESCE(?, reviewed_at) WHERE employee_id = ?"
    )
      .bind(status, now, reviewedAt, employeeId)
      .run();
  }
  return json({ ok: true });
};

exports.onRequestGet = async ({ request, env, params }) => {
  await ensureSchema(env);
  const auth = requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const employeeId = getId(params);
  if (!employeeId) return json({ error: "Invalid employee id" }, { status: 400 });
  const user = await env.DB.prepare(
    "SELECT employee_id, name, status, created_at, updated_at, reviewed_at FROM users WHERE employee_id = ?"
  )
    .bind(employeeId)
    .first();
  if (!user) return json({ error: "User not found" }, { status: 404 });
  const { results: submissions } = await env.DB.prepare(
    "SELECT COUNT(1) as count FROM submissions WHERE employee_id = ?"
  )
    .bind(employeeId)
    .all();
  return json({ user, submissions_count: submissions[0]?.count || 0 });
};
