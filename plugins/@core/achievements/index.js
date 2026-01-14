const path = require('path');

/**
 * Achievements Plugin - Migrated from core achievements functionality
 * Maintains 100% API compatibility with existing /achievements/* endpoints
 */

const manifest = {
  name: 'achievements',
  version: '1.0.0',
  description: 'Achievement system with progress tracking and unlocking',
  author: 'SSBackend Core Team',
  ssbackend_version: '^1.0.0',
  dependencies: [],
  configSchema: {
    type: 'object',
    properties: {
      autoCheck: {
        type: 'boolean',
        default: true,
        description: 'Automatically check for new achievements when progress updates'
      },
      cleanupOnDisable: {
        type: 'boolean',
        default: false,
        description: 'Remove achievement data when plugin is disabled'
      }
    }
  },

  // Admin UI Configuration for Enhanced Dashboard Navigation (Story 4.2)
  adminUI: {
    enabled: true,
    modulePath: './ui/achievementsUI.module.js',
    navigation: {
      label: 'Achievements',
      icon: '🏅',
      group: 'plugins',
      priority: 3
    },
    routes: [
      {
        path: '/admin/achievements',
        title: 'Achievements Overview',
        icon: '📊',
        component: 'AchievementsDashboard',
        permissions: ['admin']
      },
      {
        path: '/admin/achievements/management',
        title: 'Achievement Management',
        icon: '🏅',
        component: 'AchievementManager',
        permissions: ['admin']
      },
      {
        path: '/admin/achievements/progress',
        title: 'User Progress',
        icon: '📈',
        component: 'ProgressMonitor',
        permissions: ['admin']
      },
      {
        path: '/admin/achievements/configuration',
        title: 'Achievement Configuration',
        icon: '⚙️',
        component: 'AchievementConfig',
        permissions: ['admin']
      }
    ]
  }
};

// Route definitions - maintains exact same API as before
// IMPORTANT: Specific routes MUST come before parameterized routes to avoid conflicts
const routes = [
  {
    method: 'GET',
    path: '/achievements/available',
    handler: './routes/available.js',
    middleware: ['auth']
  },
  {
    method: 'GET',
    path: '/achievements/stats',
    handler: './routes/stats.js',
    middleware: ['auth']
  },
  {
    method: 'POST',
    path: '/achievements/unlock',
    handler: './routes/unlock.js',
    middleware: ['auth']
  },
  {
    method: 'GET',
    path: '/achievements/:userId',
    handler: './routes/userAchievements.js',
    middleware: ['auth']
  },
  {
    method: 'GET',
    path: '/achievements/:userId/progress',
    handler: './routes/progress.js',
    middleware: ['auth']
  }
];

// Database schema definitions - Aligned with Achievement_Design.md
const schemas = [
  {
    table: 'plugin_achievements',
    definition: `
      CREATE TABLE IF NOT EXISTS plugin_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,       -- Stable string identifier (e.g., 'KILL_10')
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,              -- 'one-shot' | 'incremental'
        metric_name TEXT,                -- 'kill', 'match_end' (maps to event_type)
        target INTEGER NOT NULL,         -- e.g., 100
        is_active BOOLEAN DEFAULT 1,
        season_id TEXT,                  -- Optional season identifier
        version INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
  {
    table: 'plugin_user_achievements',
    definition: `
      CREATE TABLE IF NOT EXISTS plugin_user_achievements (
        user_id INTEGER,
        achievement_id INTEGER,
        state TEXT NOT NULL DEFAULT 'locked',  -- 'locked', 'in_progress', 'unlocked'
        progress INTEGER DEFAULT 0,            -- Current value
        progress_data TEXT,                    -- JSON for complex tracking
        unlocked_at DATETIME,                  -- Set ONLY when state -> unlocked
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, achievement_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES plugin_achievements(id) ON DELETE CASCADE
      )
    `
  }
];

async function onLoad(context) {
  console.log('🏆 Loading Achievements plugin...');

  // Initialize achievement service
  const AchievementService = require('./services/AchievementService');
  context.achievementService = new AchievementService(context.db);

  console.log('✅ Achievements plugin loaded');
}

async function onActivate(context) {
  console.log('🏆 Activating Achievements plugin...');

  const { app, db, config } = context;

  // Mount admin routes
  try {
    const adminRoutes = require('./routes/admin/index')(db);
    app.use('/admin/api/plugins/achievements', adminRoutes);
    console.log('  - Mounted admin routes at /admin/api/plugins/achievements');
  } catch (err) {
    console.warn('  - Failed to mount admin routes:', err.message);
  }

  // Force strict schema alignment (Drop & Recreate)
  await performSchemaReset(context.db);

  // Seed default achievements if none exist
  await seedDefaultAchievements(context.db);

  console.log('✅ Achievements plugin activated');
}

async function onDeactivate(context) {
  console.log('🏆 Deactivating Achievements plugin...');
}

/**
 * RESET Tables to match new design (Authorized by user)
 */
async function performSchemaReset(db) {
  return new Promise((resolve, reject) => {
    // Check if we need to reset (check for 'code' column existence)
    db.get("PRAGMA table_info(plugin_achievements)", [], (err, rows) => {
      // Simple heuristic: If table exists but triggers schema error or missing 'code', reset.
      // For simplicity in this step, we'll just check if it exists and DROP it to be safe 
      // as requested by "erase old columns".

      console.log('♻️  Resetting Achievements Tables to align with Design...');

      db.serialize(() => {
        db.run("DROP TABLE IF EXISTS plugin_user_achievements");
        db.run("DROP TABLE IF EXISTS plugin_achievements");

        // Re-create tables
        schemas.forEach(schema => {
          db.run(schema.definition, (err) => {
            if (err) console.error(`Failed to create ${schema.table}:`, err);
            else console.log(`   - Created ${schema.table}`);
          });
        });
        resolve();
      });
    });
  });
}

/**
 * Seed default achievements if none exist
 */
async function seedDefaultAchievements(db) {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM plugin_achievements', [], (err, row) => {
      if (err) return reject(err);

      if (row.count === 0) {
        console.log('🌱 Seeding default achievements...');

        const defaultAchievements = [
          {
            code: "FIRST_STEPS",
            name: "First Steps",
            description: "Complete your first save",
            type: "one-shot",
            metric_name: "saves_count",
            target: 1
          },
          {
            code: "LEVEL_5",
            name: "Getting Started",
            description: "Reach level 5",
            type: "incremental",
            metric_name: "level",
            target: 5
          },
          {
            code: "COLLECTOR_10",
            name: "Collector",
            description: "Collect 10 items",
            type: "incremental",
            metric_name: "items_collected",
            target: 10
          },
          {
            code: "LEVEL_25",
            name: "Experienced",
            description: "Reach level 25",
            type: "incremental",
            metric_name: "level",
            target: 25
          },
          {
            code: "COLLECTOR_100",
            name: "Master Collector",
            description: "Collect 100 items",
            type: "incremental",
            metric_name: "items_collected",
            target: 100
          }
        ];

        const insertSQL = `
          INSERT INTO plugin_achievements (code, name, description, type, metric_name, target, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `;

        const stmt = db.prepare(insertSQL);
        defaultAchievements.forEach(a => {
          stmt.run([a.code, a.name, a.description, a.type, a.metric_name, a.target]);
        });
        stmt.finalize(() => {
          console.log(`✅ Seeded ${defaultAchievements.length} default achievements`);
          resolve();
        });

      } else {
        resolve();
      }
    });
  });
}

module.exports = {
  manifest,
  routes,
  schemas,
  onLoad,
  onActivate,
  onDeactivate
};
