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
  }
};

// Route definitions - maintains exact same API as before
const routes = [
  {
    method: 'GET',
    path: '/achievements/available',
    handler: './routes/available.js',
    middleware: ['auth']
  },
  {
    method: 'GET', 
    path: '/achievements/:userId',
    handler: './routes/userAchievements.js',
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
    path: '/achievements/:userId/progress',
    handler: './routes/progress.js',
    middleware: ['auth']
  },
  {
    method: 'GET',
    path: '/achievements/stats',
    handler: './routes/stats.js',
    middleware: ['auth']
  }
];

// Database schema definitions - migrated tables with plugin_ prefix
const schemas = [
  {
    table: 'plugin_achievements',
    definition: `
      CREATE TABLE IF NOT EXISTS plugin_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        metric_name TEXT,
        requirement_value INTEGER,
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
        unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        progress_value INTEGER,
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
  
  // Perform data migration if needed
  await performDataMigration(context.db);
  
  // Seed default achievements if none exist
  await seedDefaultAchievements(context.db);
  
  console.log('✅ Achievements plugin activated');
}

async function onDeactivate(context) {
  console.log('🏆 Deactivating Achievements plugin...');
  
  // Cleanup if configured to do so
  const config = context.config || {};
  if (config.cleanupOnDisable) {
    console.log('🧹 Cleaning up achievement data...');
    // Note: Actual cleanup would be implemented here
  }
  
  console.log('✅ Achievements plugin deactivated');
}

/**
 * Migrate existing achievements data to plugin format
 */
async function performDataMigration(db) {
  return new Promise((resolve, reject) => {
    // Check if migration is needed
    const checkQuery = "SELECT name FROM sqlite_master WHERE type='table' AND name='achievements'";
    
    db.get(checkQuery, [], (err, row) => {
      if (err) {
        console.error('❌ Migration check failed:', err);
        return reject(err);
      }
      
      if (row) {
        console.log('📦 Migrating existing achievements data...');
        
        // Copy data from old tables to new plugin tables
        const migrationSQL = `
          INSERT OR IGNORE INTO plugin_achievements 
          SELECT * FROM achievements;
          
          INSERT OR IGNORE INTO plugin_user_achievements
          SELECT * FROM user_achievements;
        `;
        
        db.exec(migrationSQL, (err) => {
          if (err) {
            console.error('❌ Data migration failed:', err);
            return reject(err);
          }
          
          console.log('✅ Achievements data migrated successfully');
          resolve();
        });
      } else {
        console.log('📋 No existing achievements data to migrate');
        resolve();
      }
    });
  });
}

/**
 * Seed default achievements if none exist
 */
async function seedDefaultAchievements(db) {
  return new Promise((resolve, reject) => {
    // Check if achievements already exist
    db.get('SELECT COUNT(*) as count FROM plugin_achievements', [], (err, row) => {
      if (err) {
        console.error('❌ Failed to check existing achievements:', err);
        return reject(err);
      }
      
      if (row.count === 0) {
        console.log('🌱 Seeding default achievements...');
        
        const defaultAchievements = [
          {
            name: "First Steps",
            description: "Complete your first save",
            type: "event",
            metric_name: "saves_count",
            requirement_value: 1
          },
          {
            name: "Getting Started",
            description: "Reach level 5",
            type: "progress",
            metric_name: "level",
            requirement_value: 5
          },
          {
            name: "Collector",
            description: "Collect 10 items",
            type: "progress", 
            metric_name: "items_collected",
            requirement_value: 10
          },
          {
            name: "Experienced",
            description: "Reach level 25",
            type: "progress",
            metric_name: "level",
            requirement_value: 25
          },
          {
            name: "Master Collector",
            description: "Collect 100 items", 
            type: "progress",
            metric_name: "items_collected",
            requirement_value: 100
          }
        ];
        
        const insertSQL = `
          INSERT INTO plugin_achievements (name, description, type, metric_name, requirement_value)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        let completed = 0;
        for (const achievement of defaultAchievements) {
          db.run(insertSQL, [
            achievement.name,
            achievement.description,
            achievement.type,
            achievement.metric_name,
            achievement.requirement_value
          ], (err) => {
            if (err) {
              console.error('❌ Failed to seed achievement:', err);
            } else {
              completed++;
              if (completed === defaultAchievements.length) {
                console.log(`✅ Seeded ${completed} default achievements`);
                resolve();
              }
            }
          });
        }
      } else {
        console.log(`📋 Found ${row.count} existing achievements`);
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
