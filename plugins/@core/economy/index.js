const path = require('path');

/**
 * Economy Plugin - Virtual currency and transaction system
 * Provides multi-currency support, secure transactions, and economic analytics
 */

const manifest = {
  name: 'economy',
  version: '1.0.0',
  description: 'Virtual currency and transaction system with multi-currency support, secure atomic transactions, and economic analytics',
  author: 'SSBackend Core Team',
  ssbackend_version: '^1.0.0',
  dependencies: [],
  configSchema: {
    type: 'object',
    properties: {
      default_currencies: {
        type: 'array',
        default: [
          {
            id: 'coins',
            name: 'Coins',
            symbol: '🪙',
            decimal_places: 0,
            starting_balance: 100,
            transferable: true,
            max_balance: -1
          },
          {
            id: 'gems',
            name: 'Gems',
            symbol: '💎',
            decimal_places: 0,
            starting_balance: 5,
            transferable: true,
            max_balance: -1
          }
        ],
        description: 'Default currencies to create on plugin activation'
      },
      transaction_limits: {
        type: 'object',
        default: {
          max_amount: 1000000,
          daily_volume_limit: 10000000
        },
        description: 'Transaction amount and volume limits'
      },
      analytics: {
        type: 'object',
        default: {
          enabled: true,
          retention_days: 365
        },
        description: 'Analytics collection and retention settings'
      },
      cache: {
        type: 'object',
        default: {
          balance_ttl: 300,
          analytics_ttl: 3600
        },
        description: 'Cache settings for performance optimization'
      }
    }
  },

  // Admin UI Configuration for Enhanced Dashboard Navigation (Story 4.2)
  adminUI: {
    enabled: true,
    modulePath: './ui/economyUI.module.js',
    navigation: {
      label: 'Economy',
      icon: '💵',
      group: 'plugins',
      priority: 10
    },
    routes: [
      {
        path: '/admin/economy',
        title: 'Economy Overview',
        icon: '📊',
        component: 'EconomyDashboard',
        permissions: ['admin']
      },
      {
        path: '/admin/economy/balances',
        title: 'Balance Management',
        icon: '💳',
        component: 'BalanceManager',
        permissions: ['admin']
      },
      {
        path: '/admin/economy/transactions',
        title: 'Transaction Monitor',
        icon: '📈',
        component: 'TransactionMonitor',
        permissions: ['admin']
      },
      {
        path: '/admin/economy/analytics',
        title: 'Economic Analytics',
        icon: '📊',
        component: 'EconomyAnalytics',
        permissions: ['admin']
      },
      {
        path: '/admin/economy/currencies',
        title: 'Currency Configuration',
        icon: '⚙️',
        component: 'CurrencyConfig',
        permissions: ['admin']
      },
      {
        path: '/admin/economy/alerts',
        title: 'Alert Configuration',
        icon: '🔔',
        component: 'AlertConfig',
        permissions: ['admin']
      }
    ]
  },

  // Documentation Configuration (Story 5.2)
  docs: {
    apiReference: {
      path: 'docs/api-reference.md',
      title: 'Economy API',
      icon: '💰'
    }
  }
};
/**
 * Plugin lifecycle hooks
 */
async function onLoad(context) {
  console.log('💰 Loading Economy plugin...');
  // Plugin loading logic - validate dependencies, setup resources

  try {
    // Validate that required services are available
    const { app, db } = context;
    if (!app || !db) {
      throw new Error('Required context missing: app or db not provided');
    }

    console.log('✅ Economy plugin context validated');
  } catch (error) {
    console.error('❌ Error loading Economy plugin:', error);
    throw error;
  }
}

async function onActivate(context) {
  console.log('💰 Activating Economy plugin...');
  // Plugin activation logic - register routes, setup database schemas

  const { app, db, config } = context;

  try {
    // Mount admin routes
    const adminRoutes = require('./routes/admin/index')(db);
    app.use('/admin/api/plugins/economy', adminRoutes);

    // Initialize economy services
    const CurrencyService = require('./services/CurrencyService');
    const BalanceService = require('./services/balanceService');
    const TransactionService = require('./services/TransactionService');
    const AnalyticsService = require('./services/AnalyticsService');
    const economyAuditLogger = require('./services/economyAuditLogger');

    context.currencyService = new CurrencyService(db);
    context.balanceService = new BalanceService(db);
    context.transactionService = new TransactionService(db);
    context.analyticsService = new AnalyticsService(db);

    // Initialize audit logger
    economyAuditLogger.init(db);

    // Initialize default currencies
    const defaultCurrencies = config.default_currencies || [];
    for (const currency of defaultCurrencies) {
      await context.currencyService.createCurrency(currency);
    }

    console.log('💰 Economy plugin activated successfully');
  } catch (error) {
    console.error('❌ Error activating Economy plugin:', error);
    throw error;
  }
}

async function onDeactivate(context) {
  console.log('💰 Deactivating Economy plugin...');
  // Plugin deactivation logic - cleanup resources, close connections

  if (context.currencyService) delete context.currencyService;
  if (context.balanceService) delete context.balanceService;
  if (context.transactionService) delete context.transactionService;
  if (context.analyticsService) delete context.analyticsService;
}
/**
 * Plugin route definitions
 */
const routes = [
  // Currency Management Routes
  {
    method: 'GET',
    path: '/economy/currencies',
    handler: './routes/currencies.js',
    middleware: ['auth'],
    description: 'List all available currencies'
  },
  {
    method: 'POST',
    path: '/economy/currencies',
    handler: './routes/currencies.js',
    middleware: ['auth'],
    description: 'Create new currency (admin only)'
  },
  {
    method: 'GET',
    path: '/economy/currencies/:currencyId',
    handler: './routes/currencies.js',
    middleware: ['auth'],
    description: 'Get currency details'
  },
  {
    method: 'PUT',
    path: '/economy/currencies/:currencyId',
    handler: './routes/currencies.js',
    middleware: ['auth'],
    description: 'Update currency (admin only)'
  },

  // Balance Management Routes
  {
    method: 'GET',
    path: '/economy/balances/:userId',
    handler: './routes/balances.js',
    middleware: ['auth'],
    description: 'Get user balances for all currencies'
  },
  {
    method: 'POST',
    path: '/economy/balances/adjust',
    handler: './routes/balances.js',
    middleware: ['auth'],
    description: 'Admin balance adjustment'
  },
  {
    method: 'GET',
    path: '/economy/balances/leaderboard/:currencyId',
    handler: './routes/balances.js',
    middleware: ['auth'],
    description: 'Get richest players for a currency'
  },

  // Transaction Processing Routes
  {
    method: 'POST',
    path: '/economy/transactions',
    handler: './routes/transactions.js',
    middleware: ['auth'],
    description: 'Create new transaction'
  },
  {
    method: 'GET',
    path: '/economy/transactions/:userId',
    handler: './routes/transactions.js',
    middleware: ['auth'],
    description: 'Get user transaction history'
  },
  {
    method: 'GET',
    path: '/economy/transactions/history/:transactionId',
    handler: './routes/transactions.js',
    middleware: ['auth'],
    description: 'Get transaction details'
  },
  {
    method: 'POST',
    path: '/economy/transactions/:transactionId/rollback',
    handler: './routes/transactions.js',
    middleware: ['auth'],
    description: 'Rollback transaction (admin only)'
  },

  // Analytics Routes
  {
    method: 'GET',
    path: '/economy/analytics/overview',
    handler: './routes/analytics.js',
    middleware: ['auth'],
    description: 'Get economy overview statistics'
  },
  {
    method: 'GET',
    path: '/economy/analytics/currency/:currencyId',
    handler: './routes/analytics.js',
    middleware: ['auth'],
    description: 'Get currency-specific analytics'
  },
  {
    method: 'GET',
    path: '/economy/analytics/users',
    handler: './routes/analytics.js',
    middleware: ['auth'],
    description: 'Get user economic behavior analysis'
  },
  {
    method: 'GET',
    path: '/economy/analytics/flow',
    handler: './routes/analytics.js',
    middleware: ['auth'],
    description: 'Get transaction flow analysis'
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
    table: 'plugin_currencies',
    definition: `
      CREATE TABLE IF NOT EXISTS plugin_currencies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        symbol TEXT,
        decimal_places INTEGER DEFAULT 0,
        description TEXT,
        max_balance INTEGER DEFAULT -1,
        transferable INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        config TEXT
      );
    `
  },
  {
    table: 'plugin_user_balances',
    definition: `
      CREATE TABLE IF NOT EXISTS plugin_user_balances (
        user_id INTEGER NOT NULL,
        currency_id TEXT NOT NULL,
        balance INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        PRIMARY KEY (user_id, currency_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (currency_id) REFERENCES plugin_currencies(id),
        CHECK (balance >= 0)
      );
    `
  },
  {
    table: 'plugin_transactions',
    definition: `
      CREATE TABLE IF NOT EXISTS plugin_transactions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        currency_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balance_before INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT,
        description TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        rollback_of TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (currency_id) REFERENCES plugin_currencies(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (rollback_of) REFERENCES plugin_transactions(id)
      );
    `
  }
];
/**
 * Database indexes for performance optimization
 */
const indexes = [
  'CREATE INDEX IF NOT EXISTS idx_user_balances ON plugin_user_balances(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_user_transactions ON plugin_transactions(user_id, created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_transaction_type ON plugin_transactions(transaction_type, created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_currency_transactions ON plugin_transactions(currency_id, created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_transaction_source ON plugin_transactions(source, created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_balance_currency ON plugin_user_balances(currency_id, balance DESC);'
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