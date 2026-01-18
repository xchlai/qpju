const { json, requireAdmin, ensureSchema } = require("../../_utils");

const parseId = (params) => {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
};

exports.onRequestDelete = async ({ request, env, params }) => {
  await ensureSchema(env);
  const auth = requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const id = parseId(params);
  if (!id) return json({ error: "Invalid id" }, { status: 400 });
  await env.DB.prepare("DELETE FROM submissions WHERE id = ?").bind(id).run();
  return json({ ok: true });
};
