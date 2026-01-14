/**
 * Economy Audit Logger - Enhanced audit system for economy plugin
 * Part of Story 4.5: Economy Plugin Dashboard Integration
 */

class EconomyAuditLogger {
  constructor() {
    // Database will be injected when needed
    this.auditDb = null;
  }

  /**
   * Initialize with database connection
   */
  init(db) {
    this.auditDb = db;
    this.ensureAuditTable();
  }

  /**
   * Ensure audit log table exists
   */
  async ensureAuditTable() {
    if (!this.auditDb) return;

    return new Promise((resolve, reject) => {
      this.auditDb.run(`
        CREATE TABLE IF NOT EXISTS plugin_audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          plugin TEXT NOT NULL DEFAULT 'economy',
          action TEXT NOT NULL,
          details TEXT,
          admin_user TEXT,
          ip_address TEXT,
          user_agent TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `, (err) => {
        if (err) {
          console.error('Failed to create audit log table:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Log an administrative action
   */
  async logAdminAction(action, details, adminUser = 'unknown') {
    if (!this.auditDb) {
      console.error('Audit database not initialized');
      return;
    }

    const auditEntry = {
      plugin: 'economy',
      action,
      details: JSON.stringify(details),
      admin_user: adminUser,
      ip_address: details.ipAddress || null,
      user_agent: details.userAgent || null,
      timestamp: new Date().toISOString()
    };

    try {
      await new Promise((resolve, reject) => {
        this.auditDb.run(`
          INSERT INTO plugin_audit_log 
          (plugin, action, details, admin_user, ip_address, user_agent, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          auditEntry.plugin,
          auditEntry.action,
          auditEntry.details,
          auditEntry.admin_user,
          auditEntry.ip_address,
          auditEntry.user_agent,
          auditEntry.timestamp
        ], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });

      console.log(`[AUDIT] Economy action logged: ${action} by ${adminUser}`);
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't fail the operation if audit logging fails
    }
  }

  /**
   * Get audit trail with filters
   */
  async getAuditTrail(filters = {}) {
    if (!this.auditDb) {
      throw new Error('Audit database not initialized');
    }

    const { 
      startDate, 
      endDate, 
      adminUser, 
      action, 
      limit = 1000,
      offset = 0 
    } = filters;

    let query = 'SELECT * FROM plugin_audit_log WHERE plugin = "economy"';
    const params = [];

    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }

    if (adminUser) {
      query += ' AND admin_user = ?';
      params.push(adminUser);
    }

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return new Promise((resolve, reject) => {
      this.auditDb.all(query, params, (err, rows) => {
        if (err) {
          console.error('Failed to retrieve audit trail:', err);
          reject(err);
        } else {
          // Parse JSON details
          const auditEntries = rows.map(row => ({
            ...row,
            details: row.details ? JSON.parse(row.details) : null
          }));
          resolve(auditEntries);
        }
      });
    });
  }

  /**
   * Get audit summary statistics
   */
  async getAuditSummary(timeRange = '7 days') {
    if (!this.auditDb) {
      throw new Error('Audit database not initialized');
    }

    const timeCondition = this.getTimeCondition(timeRange);

    try {
      // Get total actions
      const totalActions = await new Promise((resolve, reject) => {
        this.auditDb.get(`
          SELECT COUNT(*) as count 
          FROM plugin_audit_log 
          WHERE plugin = "economy" ${timeCondition}
        `, (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      // Get actions by type
      const actionsByType = await new Promise((resolve, reject) => {
        this.auditDb.all(`
          SELECT action, COUNT(*) as count 
          FROM plugin_audit_log 
          WHERE plugin = "economy" ${timeCondition}
          GROUP BY action 
          ORDER BY count DESC
        `, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Get actions by admin user
      const actionsByUser = await new Promise((resolve, reject) => {
        this.auditDb.all(`
          SELECT admin_user, COUNT(*) as count 
          FROM plugin_audit_log 
          WHERE plugin = "economy" ${timeCondition}
          GROUP BY admin_user 
          ORDER BY count DESC
        `, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      return {
        timeRange,
        totalActions,
        actionsByType,
        actionsByUser,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to generate audit summary:', error);
      throw error;
    }
  }

  /**
   * Clean old audit logs (for maintenance)
   */
  async cleanOldLogs(retentionDays = 365) {
    if (!this.auditDb) {
      throw new Error('Audit database not initialized');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return new Promise((resolve, reject) => {
      this.auditDb.run(`
        DELETE FROM plugin_audit_log 
        WHERE plugin = "economy" AND timestamp < ?
      `, [cutoffDate.toISOString()], function(err) {
        if (err) {
          console.error('Failed to clean old audit logs:', err);
          reject(err);
        } else {
          console.log(`Cleaned ${this.changes} old audit log entries`);
          resolve(this.changes);
        }
      });
    });
  }

  /**
   * Export audit logs to CSV
   */
  async exportAuditLogs(filters = {}) {
    const auditEntries = await this.getAuditTrail({ ...filters, limit: 10000 });

    const csvHeader = 'ID,Plugin,Action,Admin User,IP Address,Timestamp,Details\n';
    const csvRows = auditEntries.map(entry => {
      const detailsString = entry.details 
        ? JSON.stringify(entry.details).replace(/"/g, '""') // Escape quotes
        : '';

      return [
        entry.id,
        entry.plugin,
        entry.action,
        entry.admin_user || '',
        entry.ip_address || '',
        entry.timestamp,
        detailsString
      ].map(field => `"${field}"`).join(',');
    }).join('\n');

    return csvHeader + csvRows;
  }

  /**
   * Helper function to get time condition for queries
   */
  getTimeCondition(timeRange) {
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case '1 day':
        startTime = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7 days':
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30 days':
        startTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90 days':
        startTime = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return ''; // No time condition
    }

    return `AND timestamp >= '${startTime.toISOString()}'`;
  }

  /**
   * Predefined audit actions for consistency
   */
  static get ACTIONS() {
    return {
      BALANCE_ADJUSTMENT: 'balance_adjustment',
      TRANSACTION_ROLLBACK: 'transaction_rollback',
      CURRENCY_CREATED: 'currency_created',
      CURRENCY_UPDATED: 'currency_updated',
      CURRENCY_DELETED: 'currency_deleted',
      BULK_BALANCE_UPDATE: 'bulk_balance_update',
      USER_BALANCE_FROZEN: 'user_balance_frozen',
      USER_BALANCE_UNFROZEN: 'user_balance_unfrozen',
      DATA_EXPORT: 'data_export',
      CONFIG_CHANGED: 'config_changed',
      SYSTEM_MAINTENANCE: 'system_maintenance'
    };
  }

  /**
   * Log balance adjustment with standard format
   */
  async logBalanceAdjustment(userId, currency, adjustmentType, amount, previousBalance, newBalance, reason, adminUser, ipAddress, userAgent) {
    await this.logAdminAction(EconomyAuditLogger.ACTIONS.BALANCE_ADJUSTMENT, {
      userId,
      currency,
      adjustmentType,
      amount,
      previousBalance,
      newBalance,
      reason,
      ipAddress,
      userAgent
    }, adminUser);
  }

  /**
   * Log transaction rollback with standard format
   */
  async logTransactionRollback(originalTransactionId, rollbackTransactionId, userId, currency, originalAmount, rollbackAmount, reason, adminUser, ipAddress, userAgent) {
    await this.logAdminAction(EconomyAuditLogger.ACTIONS.TRANSACTION_ROLLBACK, {
      originalTransactionId,
      rollbackTransactionId,
      userId,
      currency,
      originalAmount,
      rollbackAmount,
      reason,
      ipAddress,
      userAgent
    }, adminUser);
  }

  /**
   * Log data export with standard format
   */
  async logDataExport(exportType, recordCount, filters, adminUser, ipAddress, userAgent) {
    await this.logAdminAction(EconomyAuditLogger.ACTIONS.DATA_EXPORT, {
      exportType,
      recordCount,
      filters,
      ipAddress,
      userAgent
    }, adminUser);
  }
}

// Create singleton instance
const economyAuditLogger = new EconomyAuditLogger();

module.exports = economyAuditLogger;