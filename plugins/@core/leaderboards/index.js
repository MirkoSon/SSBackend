const path = require('path');

/**
 * Leaderboards Plugin - Competitive ranking and scoring system
 * Provides multiple leaderboard types, score submission, and ranking queries
 */

const manifest = {
  name: 'leaderboards',
  version: '1.0.0',
  description: 'Competitive leaderboards with rankings, scoring, and multiple board types',
  author: 'SSBackend Core Team',
  ssbackend_version: '^1.0.0',
  dependencies: [],
  configSchema: {
    type: 'object',
    properties: {
      maxEntriesPerBoard: {
        type: 'integer',
        default: 10000,
        description: 'Maximum entries to store per leaderboard'
      },
      defaultPageSize: {
        type: 'integer',
        default: 50,
        description: 'Default number of entries per page'
      },
      maxPageSize: {
        type: 'integer',
        default: 100,
        description: 'Maximum entries allowed per page'
      },
      enableDailyBoards: {
        type: 'boolean',
        default: true,
        description: 'Enable automatic daily leaderboard creation'
      },
      enableWeeklyBoards: {
        type: 'boolean',
        default: true,
        description: 'Enable automatic weekly leaderboard creation'
      },
      cleanupOldBoards: {
        type: 'boolean',
        default: true,
        description: 'Automatically cleanup old expired boards'
      }
    }
  },

  // Admin UI Configuration for Enhanced Dashboard Navigation (Story 4.2)
  adminUI: {
    enabled: true,
    modulePath: './ui/leaderboardsUI.module.js',
    navigation: {
      label: 'Leaderboards',
      icon: '🏆',
      group: 'plugins',
      priority: 2
    },
    routes: [
      {
        path: '/admin/leaderboards',
        title: 'Leaderboards Overview',
        icon: '📊',
        component: 'LeaderboardsDashboard',
        permissions: ['admin']
      },
      {
        path: '/admin/leaderboards/rankings',
        title: 'Rankings Management',
        icon: '🥇',
        component: 'RankingsManager',
        permissions: ['admin']
      },
      {
        path: '/admin/leaderboards/competitions',
        title: 'Competitions',
        icon: '🏁',
        component: 'CompetitionsManager',
        permissions: ['admin']
      },
      {
        path: '/admin/leaderboards/configuration',
        title: 'Board Configuration',
        icon: '⚙️',
        component: 'LeaderboardConfig',
        permissions: ['admin']
      }
    ]
  }
};

/**
 * Plugin lifecycle hooks
 */
async function onLoad(context) {
  console.log('📊 Loading Leaderboards plugin...');
  // Plugin loading logic - validate dependencies, setup resources
}

async function onActivate(context) {
  console.log('📊 Activating Leaderboards plugin...');
  // Plugin activation logic - register routes, setup database schemas

  const { db } = context;

  // Initialize leaderboard management service
  const LeaderboardService = require('./services/LeaderboardService');
  context.leaderboardService = new LeaderboardService(db);

  // Mount admin routes
  try {
    const adminRoutes = require('./routes/admin/index')(db);
    context.app.use('/admin/api/plugins/leaderboards', adminRoutes);
    console.log('  - Mounted admin routes at /admin/api/plugins/leaderboards');
  } catch (err) {
    console.warn('  - Failed to mount admin routes:', err.message);
  }

  // Setup database schemas will be handled by plugin manager
}

async function onDeactivate(context) {
  console.log('📊 Deactivating Leaderboards plugin...');
  // Plugin deactivation logic - cleanup resources, close connections

  if (context.leaderboardService) {
    await context.leaderboardService.cleanup();
    delete context.leaderboardService;
  }
}

/**
 * Plugin route definitions
 */
const routes = [
  // Leaderboard Management Routes
  {
    method: 'POST',
    path: '/leaderboards',
    handler: './routes/createBoard.js',
    middleware: ['auth'],
    description: 'Create a new leaderboard'
  },
  {
    method: 'GET',
    path: '/leaderboards',
    handler: './routes/listBoards.js',
    middleware: ['auth'],
    description: 'List all available leaderboards'
  },

  // Statistics Routes (MUST be before parameterized routes)
  {
    method: 'GET',
    path: '/leaderboards/stats',
    handler: './routes/getStats.js',
    middleware: ['auth'],
    description: 'Get global leaderboard statistics'
  },

  {
    method: 'GET',
    path: '/leaderboards/:boardId',
    handler: './routes/getBoard.js',
    middleware: ['auth'],
    description: 'Get leaderboard details and rankings'
  },
  {
    method: 'PUT',
    path: '/leaderboards/:boardId',
    handler: './routes/updateBoard.js',
    middleware: ['auth'],
    description: 'Update leaderboard configuration'
  },
  {
    method: 'DELETE',
    path: '/leaderboards/:boardId',
    handler: './routes/deleteBoard.js',
    middleware: ['auth'],
    description: 'Delete a leaderboard'
  },
  {
    method: 'POST',
    path: '/leaderboards/:boardId/reset',
    handler: './routes/resetBoard.js',
    middleware: ['auth'],
    description: 'Reset/clear leaderboard scores'
  },

  // Score Submission Routes
  {
    method: 'POST',
    path: '/leaderboards/:boardId/submit',
    handler: './routes/submitScore.js',
    middleware: ['auth'],
    description: 'Submit a score to a leaderboard'
  },

  // Ranking Query Routes
  {
    method: 'GET',
    path: '/leaderboards/:boardId/rankings',
    handler: './routes/getRankings.js',
    middleware: ['auth'],
    description: 'Get paginated leaderboard rankings'
  },
  {
    method: 'GET',
    path: '/leaderboards/:boardId/user/:userId/rank',
    handler: './routes/getUserRank.js',
    middleware: ['auth'],
    description: 'Get specific user rank and score'
  },
  {
    method: 'GET',
    path: '/leaderboards/:boardId/user/:userId/surrounding',
    handler: './routes/getSurroundingRanks.js',
    middleware: ['auth'],
    description: 'Get rankings around a specific user'
  }
];

/**
 * Database schema definitions
 * 
 * NOTE: This plugin now uses migrations (see migrations/ directory).
 * The schemas below are kept for backward compatibility only.
 * New schema changes should be added as migration files.
 */
const schemas = [
  {
    table: 'plugin_leaderboards',
    definition: `
      CREATE TABLE IF NOT EXISTS plugin_leaderboards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL DEFAULT 'all_time',
        game_mode VARCHAR(100),
        sort_order VARCHAR(10) NOT NULL DEFAULT 'DESC',
        max_entries INTEGER DEFAULT 10000,
        reset_schedule VARCHAR(50),
        last_reset DATETIME,
        next_reset DATETIME,
        metadata TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, game_mode)
      );
    `
  },
  {
    table: 'plugin_leaderboard_entries',
    definition: `
      CREATE TABLE IF NOT EXISTS plugin_leaderboard_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        leaderboard_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        score REAL NOT NULL,
        rank_position INTEGER,
        metadata TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leaderboard_id) REFERENCES plugin_leaderboards(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(leaderboard_id, user_id)
      );
    `
  }
];

/**
 * Database indexes for performance optimization
 */
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_score ON plugin_leaderboard_entries(leaderboard_id, score DESC, submitted_at ASC);',
  'CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user ON plugin_leaderboard_entries(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_rank ON plugin_leaderboard_entries(leaderboard_id, rank_position);',
  'CREATE INDEX IF NOT EXISTS idx_leaderboards_type ON plugin_leaderboards(type, is_active);',
  'CREATE INDEX IF NOT EXISTS idx_leaderboards_reset ON plugin_leaderboards(next_reset) WHERE next_reset IS NOT NULL;'
];

module.exports = {
  manifest,
  onLoad,
  onActivate,
  onDeactivate,
  routes,
  schemas,
  indexes
};