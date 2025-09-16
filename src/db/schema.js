// Database schema definitions for the Local Game Backend Simulator

const SAVES_TABLE = `
  CREATE TABLE IF NOT EXISTS saves (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

const USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    login_count INTEGER DEFAULT 0
  )
`;

const INVENTORY_TABLE = `
  CREATE TABLE IF NOT EXISTS inventory (
    user_id INTEGER,
    item_id TEXT,
    quantity INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`;

const CHARACTER_PROGRESS_TABLE = `
  CREATE TABLE IF NOT EXISTS character_progress (
    user_id INTEGER,
    metric_name TEXT,
    current_value INTEGER DEFAULT 0,
    max_value INTEGER DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, metric_name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`;

const ACHIEVEMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL, -- 'score', 'progress', 'event'
    metric_name TEXT, -- Which progress metric to check
    requirement_value INTEGER, -- Value needed to unlock
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

const USER_ACHIEVEMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS user_achievements (
    user_id INTEGER,
    achievement_id INTEGER,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    progress_value INTEGER, -- Value when achievement was earned
    PRIMARY KEY (user_id, achievement_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
  )
`;

// Migration script to add new columns to existing users table
const USERS_MIGRATION = `
  ALTER TABLE users ADD COLUMN last_login DATETIME;
  ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
`;

// Sample achievements for seeding
const SAMPLE_ACHIEVEMENTS = [
  {
    name: "First Steps",
    description: "Reach level 5",
    type: "progress",
    metric_name: "level",
    requirement_value: 5
  },
  {
    name: "High Scorer",
    description: "Achieve a score of 10,000 points",
    type: "score",
    metric_name: "score",
    requirement_value: 10000
  },
  {
    name: "Quest Master",
    description: "Complete 50 quests",
    type: "progress",
    metric_name: "completed_quests",
    requirement_value: 50
  },
  {
    name: "Collector",
    description: "Collect 100 items",
    type: "progress",
    metric_name: "items_collected",
    requirement_value: 100
  },
  {
    name: "Explorer",
    description: "Explore 25 different areas",
    type: "progress",
    metric_name: "areas_explored",
    requirement_value: 25
  },
  {
    name: "Veteran",
    description: "Defeat 500 enemies",
    type: "progress",
    metric_name: "enemies_defeated",
    requirement_value: 500
  },
  {
    name: "Experienced",
    description: "Gain 50,000 experience points",
    type: "score",
    metric_name: "experience",
    requirement_value: 50000
  },
  {
    name: "Dedicated Player",
    description: "Play for 1000 minutes total",
    type: "progress",
    metric_name: "play_time_minutes",
    requirement_value: 1000
  }
];

module.exports = {
  SAVES_TABLE,
  USERS_TABLE,
  INVENTORY_TABLE,
  CHARACTER_PROGRESS_TABLE,
  ACHIEVEMENTS_TABLE,
  USER_ACHIEVEMENTS_TABLE,
  USERS_MIGRATION,
  SAMPLE_ACHIEVEMENTS
};
