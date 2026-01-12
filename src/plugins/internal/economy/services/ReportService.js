const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Report Service - Enhanced reporting system for Economy Plugin
 * Handles report generation, export, and management
 */
class ReportService {
  constructor(db) {
    this.db = db;
    this.reportsDir = path.join(process.cwd(), 'reports');
    this.ensureReportsDirectory();
  }

  async ensureReportsDirectory() {
    try {
      await fs.access(this.reportsDir);
    } catch (error) {
      await fs.mkdir(this.reportsDir, { recursive: true });
    }
  }

  // Database helper methods using Promise wrapper for SQLite3
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

  async dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  /**
   * Generate a report based on configuration
   * @param {Object} config - Report configuration
   * @returns {Object} Report generation result
   */
  async generateReport(config) {
    const reportId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    try {
      // Create report record
      await this.createReportRecord(reportId, config, timestamp);

      const startTime = Date.now();
      let data = [];

      // Generate report data based on type
      switch (config.type) {
        case 'transactions':
          data = await this.generateTransactionReport(config);
          break;
        case 'balances': 
          data = await this.generateBalanceReport(config);
          break;
        case 'analytics':
          data = await this.generateAnalyticsReport(config);
          break;
        case 'currency_flow':
          data = await this.generateCurrencyFlowReport(config);
          break;
        case 'wealth_distribution':
          data = await this.generateWealthDistributionReport(config);
          break;
        case 'admin_actions':
          data = await this.generateAdminActionsReport(config);
          break;
        default:
          throw new Error('Unknown report type: ' + config.type);
      }

      const generationTime = Date.now() - startTime;

      // Save report file if specified
      let filePath = null;
      let fileSize = 0;
      
      if (config.saveFile !== false) {
        filePath = await this.saveReportFile(reportId, data, config);
        const stats = await fs.stat(filePath);
        fileSize = stats.size;
      }

      // Update report record with results
      await this.updateReportRecord(reportId, {
        status: 'completed',
        file_path: filePath,
        file_size: fileSize,
        row_count: data.length,
        generation_time: generationTime + 'ms',
        completed_at: new Date().toISOString()
      });

      return {
        reportId,
        status: 'completed',
        data: config.returnData !== false ? data : null,
        filePath,
        rowCount: data.length,
        generationTime: generationTime + 'ms'
      };

    } catch (error) {
      // Update report record with error
      await this.updateReportRecord(reportId, {
        status: 'failed',
        error_message: error.message
      });

      throw error;
    }
  }

  // Query builders
  getTransactionSummaryQuery(config) {
    let whereConditions = [];
    let params = [];

    // Search filter
    if (config.search) {
      whereConditions.push('(t.id LIKE ? OR t.description LIKE ? OR u.username LIKE ?)');
      params.push(`%${config.search}%`, `%${config.search}%`, `%${config.search}%`);
    }

    // Currency filter
    if (config.currency && config.currency !== 'all') {
      whereConditions.push('t.currency_id = ?');
      params.push(config.currency);
    }

    // Transaction type filter
    if (config.transactionType && config.transactionType !== 'all') {
      whereConditions.push('t.transaction_type = ?');
      params.push(config.transactionType);
    }

    // Date filters
    if (config.dateFrom) {
      whereConditions.push('DATE(t.created_at) >= ?');
      params.push(config.dateFrom);
    }
    if (config.dateTo) {
      whereConditions.push('DATE(t.created_at) <= ?');
      params.push(config.dateTo);
    }

    // Amount filters
    if (config.minAmount !== undefined) {
      whereConditions.push('ABS(t.amount) >= ?');
      params.push(config.minAmount);
    }
    if (config.maxAmount !== undefined) {
      whereConditions.push('ABS(t.amount) <= ?');
      params.push(config.maxAmount);
    }

    // User filter
    if (config.userId) {
      whereConditions.push('t.user_id = ?');
      params.push(config.userId);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        t.id,
        t.user_id,
        u.username,
        t.currency_id,
        c.name as currency_name,
        c.symbol as currency_symbol,
        t.amount,
        t.balance_before,
        t.balance_after,
        t.transaction_type,
        t.source,
        t.description,
        t.created_at,
        t.created_by,
        CASE WHEN t.rollback_of IS NOT NULL THEN 'rolled_back' ELSE 'completed' END as status
      FROM plugin_transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN plugin_currencies c ON t.currency_id = c.id
      ${whereClause}
      ORDER BY t.created_at DESC
      ${config.maxRows > 0 ? `LIMIT ${config.maxRows}` : ''}
    `;

    return { query, params };
  }

  getUserBalancesQuery(config) {
    let whereConditions = [];
    let params = [];

    // Search filter
    if (config.search) {
      whereConditions.push('(u.username LIKE ? OR u.id = ?)');
      params.push(`%${config.search}%`, isNaN(config.search) ? -1 : parseInt(config.search));
    }

    // Currency filter
    if (config.currency && config.currency !== 'all') {      whereConditions.push('ub.currency_id = ?');
      params.push(config.currency);
    }

    // Balance range filter
    if (config.minBalance !== undefined) {
      whereConditions.push('ub.balance >= ?');
      params.push(config.minBalance);
    }
    if (config.maxBalance !== undefined) {
      whereConditions.push('ub.balance <= ?');
      params.push(config.maxBalance);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        u.id as user_id,
        u.username,
        ub.currency_id,
        c.name as currency_name,
        c.symbol as currency_symbol,
        ub.balance,
        ub.updated_at as last_updated,
        ub.version
      FROM users u
      JOIN plugin_user_balances ub ON u.id = ub.user_id
      JOIN plugin_currencies c ON ub.currency_id = c.id
      ${whereClause}
      ORDER BY u.username, ub.currency_id
    `;

    return { query, params };
  }

  getAnalyticsOverviewQuery(config) {
    let whereConditions = [];
    let params = [];

    // Date filters
    if (config.dateFrom) {
      whereConditions.push('DATE(created_at) >= ?');
      params.push(config.dateFrom);
    }
    if (config.dateTo) {
      whereConditions.push('DATE(created_at) <= ?');
      params.push(config.dateTo);
    }

    // Currency filter
    if (config.currency && config.currency !== 'all') {
      whereConditions.push('currency_id = ?');
      params.push(config.currency);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        DATE(created_at) as date,
        currency_id,
        transaction_type,
        COUNT(*) as transaction_count,
        SUM(ABS(amount)) as total_volume,
        AVG(ABS(amount)) as avg_amount,
        MIN(ABS(amount)) as min_amount,
        MAX(ABS(amount)) as max_amount
      FROM plugin_transactions 
      ${whereClause}
      GROUP BY DATE(created_at), currency_id, transaction_type
      ORDER BY date DESC, currency_id, transaction_type
    `;

    return { query, params };
  }

  getCurrencyFlowQuery(config) {
    let whereConditions = [];
    let params = [];

    // Date filters
    if (config.dateFrom) {
      whereConditions.push('DATE(created_at) >= ?');
      params.push(config.dateFrom);
    }
    if (config.dateTo) {
      whereConditions.push('DATE(created_at) <= ?');
      params.push(config.dateTo);
    }

    // Currency filter
    if (config.currency && config.currency !== 'all') {
      whereConditions.push('currency_id = ?');
      params.push(config.currency);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        DATE(created_at) as date,
        currency_id,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as inflow,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as outflow,
        SUM(amount) as net_flow
      FROM plugin_transactions 
      ${whereClause}
      GROUP BY DATE(created_at), currency_id
      ORDER BY date DESC, currency_id
    `;

    return { query, params };
  }

  getWealthDistributionQuery(config) {
    let whereConditions = [];
    let params = [];

    // Currency filter
    if (config.currency && config.currency !== 'all') {
      whereConditions.push('currency_id = ?');
      params.push(config.currency);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      WITH user_totals AS (
        SELECT 
          user_id,
          currency_id,
          SUM(balance) as total_balance
        FROM plugin_user_balances 
        ${whereClause}
        GROUP BY user_id, currency_id
      )
      SELECT 
        currency_id,
        CASE 
          WHEN total_balance = 0 THEN '0'
          WHEN total_balance <= 100 THEN '1-100'
          WHEN total_balance <= 500 THEN '101-500'
          WHEN total_balance <= 1000 THEN '501-1000'
          WHEN total_balance <= 5000 THEN '1001-5000'
          ELSE '5000+'
        END as wealth_range,
        COUNT(*) as user_count,
        SUM(total_balance) as total_wealth
      FROM user_totals
      GROUP BY currency_id, wealth_range
      ORDER BY currency_id, MIN(total_balance)
    `;

    return { query, params };
  }

  getAdminActionsQuery(config) {
    let whereConditions = [];
    let params = [];

    // Date filters
    if (config.dateFrom) {
      whereConditions.push('DATE(timestamp) >= ?');
      params.push(config.dateFrom);
    }
    if (config.dateTo) {
      whereConditions.push('DATE(timestamp) <= ?');
      params.push(config.dateTo);
    }

    // Action type filter
    if (config.actionType && config.actionType !== 'all') {
      whereConditions.push('action = ?');
      params.push(config.actionType);
    }

    // Admin user filter
    if (config.adminUser && config.adminUser !== 'all') {
      whereConditions.push('admin_user = ?');
      params.push(config.adminUser);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const query = `
      SELECT 
        timestamp,
        admin_user,
        action,
        target_type,
        target_id,
        details,
        ip_address,
        user_agent
      FROM plugin_admin_actions 
      ${whereClause}
      ORDER BY timestamp DESC
      ${config.maxRows > 0 ? `LIMIT ${config.maxRows}` : ''}
    `;

    return { query, params };
  }

  // Data processors
  processTransactionData(data, config) {
    return data.map(row => ({
      'Transaction ID': row.id,
      'User ID': row.user_id,
      'Username': row.username || 'Unknown',
      'Currency': row.currency_symbol,
      'Currency Name': row.currency_name,
      'Amount': row.amount,
      'Balance Before': row.balance_before,
      'Balance After': row.balance_after,
      'Transaction Type': row.transaction_type,
      'Source': row.source,
      'Description': row.description || '',
      'Date': row.created_at,
      'Status': row.status,
      'Created By': row.created_by || ''
    }));
  }

  processBalanceData(data, config) {
    return data.map(row => ({
      'User ID': row.user_id,
      'Username': row.username,
      'Currency ID': row.currency_id,
      'Currency Name': row.currency_name,
      'Currency Symbol': row.currency_symbol,
      'Balance': row.balance,
      'Last Updated': row.last_updated,
      'Version': row.version
    }));
  }

  processAnalyticsData(data, config) {
    return data.map(row => ({
      'Date': row.date,
      'Currency': row.currency_id,
      'Transaction Type': row.transaction_type,
      'Transaction Count': row.transaction_count,
      'Total Volume': row.total_volume,
      'Average Amount': parseFloat(row.avg_amount).toFixed(2),
      'Minimum Amount': row.min_amount,
      'Maximum Amount': row.max_amount
    }));
  }

  processCurrencyFlowData(data, config) {
    return data.map(row => ({
      'Date': row.date,
      'Currency': row.currency_id,
      'Inflow': row.inflow,
      'Outflow': row.outflow,
      'Net Flow': row.net_flow
    }));
  }

  processWealthDistributionData(data, config) {
    const totalUsers = data.reduce((sum, row) => sum + row.user_count, 0);
    return data.map(row => ({
      'Currency': row.currency_id,
      'Wealth Range': row.wealth_range,
      'User Count': row.user_count,
      'Percentage': totalUsers > 0 ? ((row.user_count / totalUsers) * 100).toFixed(1) + '%' : '0%',
      'Total Wealth': row.total_wealth
    }));
  }

  processAdminActionsData(data, config) {
    return data.map(row => ({
      'Timestamp': row.timestamp,
      'Admin User': row.admin_user,
      'Action': row.action,
      'Target Type': row.target_type,
      'Target ID': row.target_id,
      'Details': typeof row.details === 'string' ? row.details : JSON.stringify(row.details),
      'IP Address': row.ip_address,
      'User Agent': row.user_agent
    }));
  }

  // Individual report generators
  async generateTransactionReport(config) {
    const { query, params } = this.getTransactionSummaryQuery(config);
    const data = await this.dbAll(query, params);
    return this.processTransactionData(data, config);
  }

  async generateBalanceReport(config) {
    const { query, params } = this.getUserBalancesQuery(config);
    const data = await this.dbAll(query, params);
    return this.processBalanceData(data, config);
  }

  async generateAnalyticsReport(config) {
    const { query, params } = this.getAnalyticsOverviewQuery(config);
    const data = await this.dbAll(query, params);
    return this.processAnalyticsData(data, config);
  }

  async generateCurrencyFlowReport(config) {
    const { query, params } = this.getCurrencyFlowQuery(config);
    const data = await this.dbAll(query, params);
    return this.processCurrencyFlowData(data, config);
  }

  async generateWealthDistributionReport(config) {
    const { query, params } = this.getWealthDistributionQuery(config);
    const data = await this.dbAll(query, params);
    return this.processWealthDistributionData(data, config);
  }

  async generateAdminActionsReport(config) {
    const { query, params } = this.getAdminActionsQuery(config);
    const data = await this.dbAll(query, params);
    return this.processAdminActionsData(data, config);
  }

  async getReport(reportId) {
    const query = 'SELECT * FROM plugin_reports WHERE id = ?';
    return await this.dbGet(query, [reportId]);
  }

  async deleteReport(reportId) {
    const report = await this.getReport(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    // Delete file if it exists
    if (report.file_path) {
      try {
        await fs.unlink(report.file_path);
      } catch (error) {
        console.warn('Warning: Could not delete report file:', error.message);
      }
    }

    // Delete database record
    const query = 'DELETE FROM plugin_reports WHERE id = ?';
    await this.dbRun(query, [reportId]);

    return { success: true, message: 'Report deleted successfully' };
  }

  async getReportFile(reportId) {
    const report = await this.getReport(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'completed') {
      throw new Error('Report is not ready for download');
    }

    if (!report.file_path) {
      throw new Error('Report file not found');
    }

    try {
      const fileContent = await fs.readFile(report.file_path);
      const filename = path.basename(report.file_path);
      
      return {
        content: fileContent,
        filename,
        mimeType: this.getMimeType(report.format),
        size: fileContent.length
      };
    } catch (error) {
      throw new Error('Could not read report file: ' + error.message);
    }
  }

  getMimeType(format) {
    const mimeTypes = {
      csv: 'text/csv',
      json: 'application/json',
      pdf: 'application/pdf',
      txt: 'text/plain'
    };
    return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  // Cleanup methods
  async cleanupOldReports(daysOld = 30) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    
    // Get old reports
    const oldReports = await this.dbAll(
      'SELECT * FROM plugin_reports WHERE created_at < ?',
      [cutoffDate]
    );

    // Delete files
    for (const report of oldReports) {
      if (report.file_path) {
        try {
          await fs.unlink(report.file_path);
        } catch (error) {
          console.warn('Warning: Could not delete old report file:', error.message);
        }
      }
    }

    // Delete database records
    const result = await this.dbRun(
      'DELETE FROM plugin_reports WHERE created_at < ?',
      [cutoffDate]
    );

    return {
      deletedReports: result.changes,
      message: `Cleaned up ${result.changes} old reports`
    };
  }

  // Export enhanced existing transaction export
  async exportTransactionsEnhanced(filters = {}) {
    const config = {
      name: 'Transaction Export',
      type: 'transactions',
      format: filters.format || 'csv',
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      currency: filters.currency,
      transactionType: filters.type,
      maxRows: parseInt(filters.maxRows) || 0,
      includeMetadata: filters.includeMetadata !== 'false'
    };

    return await this.generateTransactionReport(config);
  }

  // Bulk export methods
  async exportUserBalances(userIds, format = 'csv') {
    if (!userIds || userIds.length === 0) {
      throw new Error('No user IDs provided');
    }

    const placeholders = userIds.map(() => '?').join(',');
    const query = `
      SELECT 
        u.id as user_id,
        u.username,
        ub.currency_id,
        c.name as currency_name,
        c.symbol as currency_symbol,
        ub.balance,
        ub.updated_at as last_updated,
        ub.version
      FROM users u
      JOIN plugin_user_balances ub ON u.id = ub.user_id
      JOIN plugin_currencies c ON ub.currency_id = c.id
      WHERE u.id IN (${placeholders})
      ORDER BY u.id, ub.currency_id
    `;

    const data = await this.dbAll(query, userIds);
    return this.processBalanceData(data, { format });
  }

  // Analytics export with custom date ranges
  async exportAnalytics(filters = {}) {
    const config = {
      name: 'Analytics Export',
      type: 'analytics',
      format: filters.format || 'csv',
      dateFrom: filters.start,
      dateTo: filters.end,
      currency: filters.currency,
      maxRows: parseInt(filters.maxRows) || 0
    };

    return await this.generateAnalyticsReport(config);
  }

  // Initialize database schema for reports
  async initializeReportsTables() {
    const createReportsTable = `
      CREATE TABLE IF NOT EXISTS plugin_reports (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        format TEXT NOT NULL,
        config TEXT,
        status TEXT DEFAULT 'generating',
        file_path TEXT,
        file_size INTEGER,
        row_count INTEGER,
        generation_time TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
      )
    `;

    await this.dbRun(createReportsTable);

    // Create index for faster queries
    const createIndex = `
      CREATE INDEX IF NOT EXISTS idx_plugin_reports_created_at 
      ON plugin_reports(created_at)
    `;

    await this.dbRun(createIndex);
  }
}

module.exports = ReportService;