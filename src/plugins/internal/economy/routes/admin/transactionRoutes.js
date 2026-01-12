const express = require('express');
const router = express.Router();
const TransactionService = require('../../services/TransactionService');

// Admin authentication middleware (reuse pattern from main admin routes)
const adminAuth = (req, res, next) => {
  const adminSession = req.session?.adminAuthenticated;
  const isCliRequest = req.headers['user-agent']?.includes('CLI') || req.headers['x-cli-request'];
  
  // Temporary CLI bypass for development - in production, implement proper CLI auth
  if (isCliRequest && process.env.NODE_ENV !== 'production') {
    console.log('🔧 CLI request detected - bypassing admin auth for development');
    return next();
  }
  
  if (!adminSession) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  next();
};

module.exports = (db) => {
  const transactionService = new TransactionService(db);

  /**
   * Get transactions with filtering and pagination
   * GET /admin/api/plugins/economy/transactions
   */
  router.get('/transactions', adminAuth, async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'created_at',
        sortOrder = 'desc',
        search = '',
        currency = 'all',
        type = 'all',
        dateFrom = '',
        dateTo = '',
        minAmount = '',
        maxAmount = '',
        userId = ''
      } = req.query;

      const transactions = await transactionService.getTransactions({
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
        search,
        currency,
        type,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        userId
      });

      res.json({
        transactions: transactions.transactions,
        total: transactions.total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(transactions.total / parseInt(limit))
      });

    } catch (error) {
      console.error('Error getting transactions:', error);
      res.status(500).json({ error: 'Failed to retrieve transactions' });
    }
  });

  /**
   * Export transactions to CSV
   * GET /admin/api/plugins/economy/transactions/export
   */
  router.get('/transactions/export', adminAuth, async (req, res) => {
    try {
      const {
        search = '',
        currency = 'all',
        type = 'all',
        dateFrom = '',
        dateTo = '',
        minAmount = '',
        maxAmount = '',
        userId = '',
        format = 'csv',
        maxRows = 10000
      } = req.query;

      const transactions = await transactionService.exportTransactions({
        search,
        currency,
        type,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        userId,
        format,
        maxRows
      });

      if (format === 'csv') {
        const csvHeader = 'Transaction ID,User ID,Username,Currency,Currency Name,Amount,Balance Before,Balance After,Type,Source,Description,Date,Status,Created By\n';
        const csvRows = transactions.map(tx => {
          return [
            tx.id,
            tx.user_id,
            tx.username || '',
            tx.currency_id,
            tx.currency_name,
            tx.amount,
            tx.balance_before,
            tx.balance_after,
            tx.transaction_type,
            tx.source,
            (tx.description || '').replace(/"/g, '""'),
            tx.created_at,
            tx.status,
            tx.created_by
          ].map(field => `"${field}"`).join(',');
        }).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=transactions-export-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
      } else {
        res.json({ transactions, total: transactions.length });
      }

    } catch (error) {
      console.error('Error exporting transactions:', error);
      res.status(500).json({ error: 'Failed to export transactions' });
    }
  });

  /**
   * Get single transaction details
   * GET /admin/api/plugins/economy/transactions/:transactionId
   */
  router.get('/transactions/:transactionId', adminAuth, async (req, res) => {
    try {
      const { transactionId } = req.params;

      const transaction = await transactionService.getTransactionDetails(transactionId);

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json(transaction);

    } catch (error) {
      console.error('Error getting transaction details:', error);
      res.status(500).json({ error: 'Failed to retrieve transaction details' });
    }
  });

  /**
   * Rollback transaction
   * POST /admin/api/plugins/economy/transactions/:transactionId/rollback
   */
  router.post('/transactions/:transactionId/rollback', adminAuth, async (req, res) => {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Rollback reason is required' });
      }

      const result = await transactionService.rollbackTransaction(transactionId, reason, req.session.adminUser || 'admin');

      res.json({
        success: true,
        originalTransactionId: transactionId,
        rollbackTransactionId: result.rollbackTransactionId,
        rollbackAmount: result.rollbackAmount,
        newBalance: result.newBalance
      });

    } catch (error) {
      console.error('Error rolling back transaction:', error);
      res.status(500).json({ error: 'Failed to rollback transaction' });
    }
  });

  return router;
};