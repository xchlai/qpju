const { json, parseJson, requireAdmin, ensureSchema } = require("../../_utils");

const parseId = (params) => {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
};

exports.onRequestPut = async ({ request, env, params }) => {
  await ensureSchema(env);
  const auth = requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const id = parseId(params);
  if (!id) return json({ error: "Invalid id" }, { status: 400 });
  const body = await parseJson(request);
  if (!body || !body.name || !Number.isInteger(body.duration_minutes) || body.duration_minutes <= 0) {
    return json({ error: "Invalid payload" }, { status: 400 });
  }
  await env.DB.prepare(
    "UPDATE activities SET name = ?, duration_minutes = ? WHERE id = ?"
  )
    .bind(body.name.trim(), body.duration_minutes, id)
    .run();
  return json({ ok: true });
};

exports.onRequestDelete = async ({ request, env, params }) => {
  await ensureSchema(env);
  const auth = requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const id = parseId(params);
  if (!id) return json({ error: "Invalid id" }, { status: 400 });
  await env.DB.prepare("DELETE FROM activities WHERE id = ?").bind(id).run();
  return json({ ok: true });
};
