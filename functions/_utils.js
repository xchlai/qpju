const json = (data, init = {}) => {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
};

const getAdminPassword = (env) => env.ADMIN_PASSWORD || "";

const requireAdmin = (request, env) => {
  const password = request.headers.get("X-Admin-Password");
  if (!password) {
    return { ok: false, response: json({ error: "Missing admin password" }, { status: 401 }) };
  }
  if (password !== getAdminPassword(env)) {
    return { ok: false, response: json({ error: "Invalid admin password" }, { status: 403 }) };
  }
  return { ok: true };
};

const parseJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const ensureSchema = async (env) => {
  if (!env.DB) {
    throw new Error("Missing D1 binding");
  }
  await env.DB.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      employee_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT,
      updated_at TEXT,
      reviewed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS users_status_index ON users(status);
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      name TEXT NOT NULL,
      activity_id INTEGER NOT NULL,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY (employee_id) REFERENCES users(employee_id) ON DELETE CASCADE,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS submissions_employee_activity_unique
      ON submissions(employee_id, activity_id);
  `);
};

module.exports = {
  json,
  getAdminPassword,
  requireAdmin,
  parseJson,
  ensureSchema,
};
