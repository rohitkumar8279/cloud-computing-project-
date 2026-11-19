CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  submitted_by TEXT NOT NULL DEFAULT 'Anonymous',
  client_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- Small evidence files (JPG/PNG/PDF) are stored as base64 text. Fine for a demo;
-- a production app would use object storage (S3 / R2).
CREATE TABLE IF NOT EXISTS attachments (
  complaint_id INTEGER PRIMARY KEY,
  file_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at TEXT NOT NULL DEFAULT (datetime('now')),
  trigger_type TEXT NOT NULL,
  open_count INTEGER NOT NULL,
  resolved_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL
);
