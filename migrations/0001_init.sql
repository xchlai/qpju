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
