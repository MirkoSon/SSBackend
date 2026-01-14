-- Leaderboard definitions table
CREATE TABLE IF NOT EXISTS plugin_leaderboards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'all-time', 'custom')),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reset_schedule TEXT, -- cron-like schedule for resets (for daily/weekly/custom)
  config TEXT DEFAULT '{}', -- JSON configuration (tie rules, metadata fields, etc.)
  active INTEGER DEFAULT 1, -- Enable/disable leaderboard
  last_reset DATETIME DEFAULT NULL, -- Track when leaderboard was last reset
  created_by INTEGER, -- User who created the leaderboard
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_type ON plugin_leaderboards(type, active);
CREATE INDEX IF NOT EXISTS idx_leaderboard_active ON plugin_leaderboards(active);
