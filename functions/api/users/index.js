const { json, requireAdmin, ensureSchema } = require("../../_utils");

const allowed = new Set(["pending", "approved", "rejected", "all"]);

exports.onRequestGet = async ({ request, env }) => {
  await ensureSchema(env);
  const auth = requireAdmin(request, env);
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";
  const finalStatus = allowed.has(status) ? status : "pending";

  const baseQuery = `
    SELECT
      users.employee_id,
      users.name,
      users.status,
      users.created_at,
      users.updated_at,
      users.reviewed_at,
      (SELECT COUNT(1) FROM submissions WHERE submissions.employee_id = users.employee_id) AS submissions_count
    FROM users
  `;
  const query = finalStatus === "all" ? baseQuery + " ORDER BY users.created_at DESC" : baseQuery + " WHERE users.status = ? ORDER BY users.created_at DESC";
  const stmt = env.DB.prepare(query);
  const { results } = finalStatus === "all" ? await stmt.all() : await stmt.bind(finalStatus).all();
  return json({ users: results });
};
