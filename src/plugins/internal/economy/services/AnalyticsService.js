/**
 * Analytics Service - Provides economic insights and analytics
 */
class AnalyticsService {
  constructor(db) {
    this.db = db;
  }

  // Helper methods to promisify database calls
  async dbGet(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Get economy overview statistics
   * @returns {Promise<Object>} Economy overview data
   */
  async getEconomyOverview() {
    // Get basic stats
    const totalUsers = await this.dbGet('SELECT COUNT(DISTINCT user_id) as count FROM plugin_user_balances');
    const totalTransactions = await this.dbGet('SELECT COUNT(*) as count FROM plugin_transactions');
    const totalCurrencies = await this.dbGet('SELECT COUNT(*) as count FROM plugin_currencies');

    // Get currency statistics
    const currencyStats = await this.dbAll(`
      SELECT 
        c.id,
        c.name,
        c.symbol,
        COALESCE(SUM(ub.balance), 0) as total_supply,
        COUNT(ub.user_id) as holders,
        COALESCE(AVG(ub.balance), 0) as average_balance,
        COALESCE(MAX(ub.balance), 0) as max_balance,
        (SELECT COUNT(*) FROM plugin_transactions WHERE currency_id = c.id) as transaction_count
      FROM plugin_currencies c
      LEFT JOIN plugin_user_balances ub ON c.id = ub.currency_id
      GROUP BY c.id, c.name, c.symbol
      ORDER BY total_supply DESC
    `);
    
    // Get recent transaction trends (last 7 days)
    const trendData = await this.dbAll(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as credits,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as debits
      FROM plugin_transactions
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    return {
      overview: {
        totalUsers: totalUsers.count,
        totalTransactions: totalTransactions.count,
        totalCurrencies: totalCurrencies.count,
        currencyStats: currencyStats.reduce((acc, curr) => {
          acc[curr.id] = {
            name: curr.name,
            symbol: curr.symbol,
            totalSupply: curr.total_supply,
            holders: curr.holders,
            averageBalance: Math.round(curr.average_balance * 100) / 100,
            maxBalance: curr.max_balance,
            transactionCount: curr.transaction_count
          };
          return acc;
        }, {})
      },
      trends: {
        dailyData: trendData.map(day => ({
          date: day.date,
          transactions: day.transaction_count,
          credits: day.credits,
          debits: day.debits,
          netFlow: day.credits - day.debits
        }))
      }
    };
  }

  /**
   * Get currency-specific analytics
   * @param {string} currencyId - Currency ID
   * @returns {Promise<Object>} Currency analytics
   */
  async getCurrencyAnalytics(currencyId) {
    // Basic currency info
    const currency = await this.dbGet('SELECT * FROM plugin_currencies WHERE id = ?', [currencyId]);
    if (!currency) {
      throw new Error('Currency not found');
    }

    // Balance distribution
    const balanceDistribution = await this.dbAll(`
      SELECT 
        CASE 
          WHEN balance = 0 THEN '0'
          WHEN balance <= 100 THEN '1-100'
          WHEN balance <= 1000 THEN '101-1000'
          WHEN balance <= 10000 THEN '1001-10000'
          ELSE '10000+'
        END as balance_range,
        COUNT(*) as user_count
      FROM plugin_user_balances
      WHERE currency_id = ?
      GROUP BY balance_range
      ORDER BY MIN(balance)
    `, [currencyId]);
    
    // Transaction patterns
    const transactionPatterns = await this.dbAll(`
      SELECT 
        transaction_type,
        source,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM plugin_transactions
      WHERE currency_id = ?
      GROUP BY transaction_type, source
      ORDER BY count DESC
    `, [currencyId]);

    // Top earners and spenders
    const topEarners = await this.dbAll(`
      SELECT 
        u.username,
        SUM(t.amount) as total_earned
      FROM plugin_transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.currency_id = ? AND t.amount > 0
      GROUP BY t.user_id, u.username
      ORDER BY total_earned DESC
      LIMIT 10
    `, [currencyId]);

    const topSpenders = await this.dbAll(`
      SELECT 
        u.username,
        SUM(ABS(t.amount)) as total_spent
      FROM plugin_transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.currency_id = ? AND t.amount < 0
      GROUP BY t.user_id, u.username
      ORDER BY total_spent DESC
      LIMIT 10
    `, [currencyId]);

    return {
      currency: {
        id: currency.id,
        name: currency.name,
        symbol: currency.symbol,
        decimal_places: currency.decimal_places
      },
      balanceDistribution,
      transactionPatterns,
      topUsers: {
        earners: topEarners,
        spenders: topSpenders
      }
    };
  }

  /**
   * Get user economic behavior analysis
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} User behavior analytics
   */
  async getUserBehaviorAnalytics(options = {}) {
    const { limit = 100 } = options;

    // Most active users by transaction count
    const mostActive = await this.dbAll(`
      SELECT 
        u.username,
        COUNT(t.id) as transaction_count,
        COUNT(DISTINCT t.currency_id) as currencies_used,
        MIN(t.created_at) as first_transaction,
        MAX(t.created_at) as last_transaction
      FROM plugin_transactions t
      JOIN users u ON t.user_id = u.id
      GROUP BY t.user_id, u.username
      ORDER BY transaction_count DESC
      LIMIT ?
    `, [limit]);
    
    // User economic profiles
    const userProfiles = await this.dbAll(`
      SELECT 
        u.username,
        SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as total_earned,
        SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_spent,
        (SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) - 
         SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END)) as net_worth_change,
        SUM(ub.balance) as current_total_balance
      FROM plugin_transactions t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN plugin_user_balances ub ON t.user_id = ub.user_id
      GROUP BY t.user_id, u.username
      HAVING total_earned > 0 OR total_spent > 0
      ORDER BY current_total_balance DESC
      LIMIT ?
    `, [limit]);

    return {
      mostActiveUsers: mostActive,
      economicProfiles: userProfiles,
      summary: {
        totalActiveUsers: mostActive.length,
        averageTransactionsPerUser: mostActive.reduce((sum, user) => sum + user.transaction_count, 0) / mostActive.length
      }
    };
  }

  /**
   * Get transaction flow analysis
   * @param {Object} options - Analysis options  
   * @returns {Promise<Object>} Transaction flow data
   */
  async getTransactionFlowAnalysis(options = {}) {
    const { days = 30 } = options;

    // Daily transaction volume
    const dailyVolume = await this.dbAll(`
      SELECT 
        DATE(created_at) as date,
        currency_id,
        transaction_type,
        COUNT(*) as count,
        SUM(ABS(amount)) as volume
      FROM plugin_transactions
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(created_at), currency_id, transaction_type
      ORDER BY date DESC, volume DESC
    `, [days]);

    // Source analysis
    const sourceAnalysis = await this.dbAll(`
      SELECT 
        source,
        transaction_type,
        COUNT(*) as transaction_count,
        SUM(ABS(amount)) as total_volume,
        AVG(ABS(amount)) as avg_transaction_size
      FROM plugin_transactions
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY source, transaction_type
      ORDER BY total_volume DESC
    `, [days]);

    return {
      period: `Last ${days} days`,
      dailyVolume,
      sourceAnalysis,
      summary: {
        totalTransactions: dailyVolume.reduce((sum, day) => sum + day.count, 0),
        totalVolume: dailyVolume.reduce((sum, day) => sum + day.volume, 0),
        avgDailyTransactions: dailyVolume.reduce((sum, day) => sum + day.count, 0) / Math.min(days, dailyVolume.length)
      }
    };
  }
}

module.exports = AnalyticsService;
