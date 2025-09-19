-- Leaderboard entries with performance indexing
CREATE TABLE IF NOT EXISTS plugin_leaderboard_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  leaderboard_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  metadata TEXT DEFAULT '{}', -- JSON for additional score data (level, time, etc.)
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leaderboard_id) REFERENCES plugin_leaderboards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Critical indexes for ranking performance
-- Primary index for rankings: leaderboard -> score (desc) -> time (asc for tie-breaking)
CREATE INDEX IF NOT EXISTS idx_leaderboard_rankings ON plugin_leaderboard_entries(leaderboard_id, score DESC, submitted_at ASC);

-- Index for user score lookups
CREATE INDEX IF NOT EXISTS idx_user_scores ON plugin_leaderboard_entries(user_id, leaderboard_id);

-- Index for submission time queries
CREATE INDEX IF NOT EXISTS idx_submission_time ON plugin_leaderboard_entries(leaderboard_id, submitted_at DESC);

-- Composite index for efficient user position lookup
CREATE INDEX IF NOT EXISTS idx_user_leaderboard ON plugin_leaderboard_entries(leaderboard_id, user_id);
