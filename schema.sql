CREATE TABLE IF NOT EXISTS teams (
  id         TEXT PRIMARY KEY,
  data       TEXT NOT NULL,      -- JSON: {type, back, front, pet, counters:[{back, front, pet, note}]}
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
