const { json, requireAdmin, ensureSchema } = require("../_utils");

exports.onRequestPost = async ({ request, env }) => {
  await ensureSchema(env);
  const auth = requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  await env.DB.exec("DELETE FROM submissions; DELETE FROM activities; DELETE FROM users;");
  await ensureSchema(env);
  return json({ ok: true });
};
