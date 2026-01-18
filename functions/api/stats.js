const { json, requireAdmin, ensureSchema } = require("../_utils");

exports.onRequestGet = async ({ request, env }) => {
  await ensureSchema(env);
  const auth = requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  const totals = await env.DB.prepare(
    `
    SELECT
      COUNT(DISTINCT submissions.employee_id) AS volunteers,
      COUNT(submissions.id) AS participations,
      COALESCE(SUM(activities.duration_minutes), 0) AS minutes
    FROM submissions
    JOIN users ON users.employee_id = submissions.employee_id
    JOIN activities ON activities.id = submissions.activity_id
    WHERE users.status = 'approved'
  `
  ).first();

  const { results: perPerson } = await env.DB.prepare(
    `
    SELECT
      users.employee_id,
      users.name,
      COALESCE(SUM(activities.duration_minutes), 0) AS total_minutes
    FROM submissions
    JOIN users ON users.employee_id = submissions.employee_id
    JOIN activities ON activities.id = submissions.activity_id
    WHERE users.status = 'approved'
    GROUP BY users.employee_id, users.name
    ORDER BY total_minutes DESC
  `
  ).all();

  return json({ totals: totals || { volunteers: 0, participations: 0, minutes: 0 }, perPerson });
};
