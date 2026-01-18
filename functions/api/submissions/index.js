const { json, parseJson, requireAdmin, ensureSchema } = require("../../_utils");

const normalizeActivityIds = (body) => {
  if (Array.isArray(body.activity_ids)) return body.activity_ids;
  if (body.activity_id !== undefined && body.activity_id !== null) return [body.activity_id];
  return [];
};

exports.onRequestPost = async ({ request, env }) => {
  await ensureSchema(env);
  const body = await parseJson(request);
  if (!body) return json({ error: "Invalid payload" }, { status: 400 });
  const employeeId = (body.employee_id || "").trim();
  const name = (body.name || "").trim();
  const activityIds = normalizeActivityIds(body).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
  if (!employeeId || !name || activityIds.length === 0) {
    return json({ error: "Missing fields" }, { status: 400 });
  }
  const mode = body.submission_mode === "append" ? "append" : "reset";
  const now = new Date().toISOString();

  const existing = await env.DB.prepare("SELECT employee_id FROM users WHERE employee_id = ?")
    .bind(employeeId)
    .first();
  if (!existing) {
    await env.DB.prepare(
      "INSERT INTO users (employee_id, name, status, created_at, updated_at) VALUES (?, ?, 'pending', ?, ?)"
    )
      .bind(employeeId, name, now, now)
      .run();
  } else {
    await env.DB.prepare("UPDATE users SET name = ?, updated_at = ? WHERE employee_id = ?")
      .bind(name, now, employeeId)
      .run();
  }

  if (mode === "reset") {
    await env.DB.prepare("DELETE FROM submissions WHERE employee_id = ?")
      .bind(employeeId)
      .run();
  } else {
    await env.DB.prepare("UPDATE submissions SET name = ?, updated_at = ? WHERE employee_id = ?")
      .bind(name, now, employeeId)
      .run();
  }

  const stmt = env.DB.prepare(
    "INSERT INTO submissions (employee_id, name, activity_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  );
  const upsertStmt = env.DB.prepare(
    "UPDATE submissions SET name = ?, updated_at = ? WHERE employee_id = ? AND activity_id = ?"
  );

  for (const activityId of activityIds) {
    try {
      await stmt.bind(employeeId, name, activityId, now, now).run();
    } catch (error) {
      if (mode === "append" && String(error).includes("UNIQUE")) {
        await upsertStmt.bind(name, now, employeeId, activityId).run();
      } else {
        throw error;
      }
    }
  }

  return json({ ok: true, mode });
};

exports.onRequestGet = async ({ request, env }) => {
  await ensureSchema(env);
  const auth = requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";
  const allowed = new Set(["all", "pending", "approved", "rejected"]);
  const finalStatus = allowed.has(status) ? status : "all";

  const baseQuery = `
    SELECT
      submissions.id AS submission_id,
      submissions.employee_id,
      users.name AS user_name,
      users.status AS user_status,
      activities.name AS activity_name,
      activities.duration_minutes,
      submissions.created_at,
      submissions.updated_at
    FROM submissions
    JOIN users ON users.employee_id = submissions.employee_id
    JOIN activities ON activities.id = submissions.activity_id
  `;
  const query = finalStatus === "all" ? baseQuery + " ORDER BY submissions.updated_at DESC" : baseQuery + " WHERE users.status = ? ORDER BY submissions.updated_at DESC";
  const stmt = env.DB.prepare(query);
  const { results } = finalStatus === "all" ? await stmt.all() : await stmt.bind(finalStatus).all();
  return json({ submissions: results });
};
