const { json, parseJson, requireAdmin, ensureSchema } = require("../../_utils");

exports.onRequestGet = async ({ env }) => {
  await ensureSchema(env);
  const { results } = await env.DB.prepare(
    "SELECT id, name, duration_minutes FROM activities ORDER BY id DESC"
  ).all();
  return json({ activities: results });
};

exports.onRequestPost = async ({ request, env }) => {
  await ensureSchema(env);
  const auth = requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const body = await parseJson(request);
  if (!body || !body.name || !Number.isInteger(body.duration_minutes) || body.duration_minutes <= 0) {
    return json({ error: "Invalid payload" }, { status: 400 });
  }
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO activities (name, duration_minutes, created_at) VALUES (?, ?, ?)"
  )
    .bind(body.name.trim(), body.duration_minutes, now)
    .run();
  return json({ ok: true });
};
