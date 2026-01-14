const express = require('express');
const router = express.Router();
const ReportService = require('../../services/ReportService');
const PDFReportGenerator = require('../../services/PDFReportGenerator');

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
  const reportService = new ReportService(db);

  /**
   * Enhanced transaction export with advanced options
   * GET /admin/api/plugins/economy/reports/transactions/export
   */
  router.get('/reports/transactions/export', adminAuth, async (req, res) => {
    try {
      const filters = {
        search: req.query.search || '',
        currency: req.query.currency || 'all',
        type: req.query.type || 'all',
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
        minAmount: req.query.minAmount || '',
        maxAmount: req.query.maxAmount || '',
        userId: req.query.userId || '',
        format: req.query.format || 'csv',
        includeMetadata: req.query.includeMetadata !== 'false',
        maxRows: parseInt(req.query.maxRows) || 10000
      };

      const data = await reportService.exportTransactionsEnhanced(filters);

      if (filters.format === 'csv') {
        const csvHeader = 'Transaction ID,User ID,Username,Currency,Currency Name,Amount,Balance Before,Balance After,Type,Source,Description,Date,Status,Created By\n';
        const csvRows = data.map(tx => {
          return [
            tx['Transaction ID'],
            tx['User ID'],
            tx['Username'],
            tx['Currency'],
            tx['Currency Name'],
            tx['Amount'],
            tx['Balance Before'],
            tx['Balance After'],
            tx['Transaction Type'],
            tx['Source'],
            (tx['Description'] || '').replace(/"/g, '""'),
            tx['Date'],
            tx['Status'],
            tx['Created By']
          ].map(field => `"${field}"`).join(',');
        }).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=enhanced-transactions-export-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
      } else {
        res.json({ 
          transactions: data, 
          total: data.length,
          exported: new Date().toISOString(),
          filters: filters
        });
      }

    } catch (error) {
      console.error('Error exporting enhanced transactions:', error);
      res.status(500).json({ error: 'Failed to export transactions' });
    }
  });

  /**
   * Enhanced balance export with bulk operations
   * POST /admin/api/plugins/economy/reports/balances/export
   */
  router.post('/reports/balances/export', adminAuth, async (req, res) => {
    try {
      const { userIds, format = 'csv', includeZeroBalances = false } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'User IDs array is required' });
      }

      const data = await reportService.exportUserBalances(userIds, format);

      // Filter out zero balances if requested
      const filteredData = includeZeroBalances ? data : data.filter(balance => balance.Balance > 0);

      if (format === 'csv') {
        const csvHeader = 'User ID,Username,Currency ID,Currency Name,Currency Symbol,Balance,Last Updated,Version\n';
        const csvRows = filteredData.map(balance => {
          return [
            balance['User ID'],
            balance['Username'] || '',
            balance['Currency ID'],
            balance['Currency Name'],
            balance['Currency Symbol'],
            balance['Balance'],
            balance['Last Updated'],
            balance['Version']
          ].map(field => `"${field}"`).join(',');
        }).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=enhanced-balances-export-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
      } else {
        res.json({ 
          balances: filteredData, 
          total: filteredData.length,
          exported: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error exporting enhanced balances:', error);
      res.status(500).json({ error: 'Failed to export balance data' });
    }
  });

  /**
   * Enhanced analytics export with custom formatting
   * GET /admin/api/plugins/economy/reports/analytics/export
   */
  router.get('/reports/analytics/export', adminAuth, async (req, res) => {
    try {
      const filters = {
        start: req.query.start,
        end: req.query.end,
        currency: req.query.currency || 'all',
        format: req.query.format || 'csv',
        maxRows: parseInt(req.query.maxRows) || 5000,
        includeCharts: req.query.includeCharts === 'true'
      };

      const data = await reportService.exportAnalytics(filters);

      if (filters.format === 'csv') {
        const csvHeader = 'Date,Currency,Transaction Type,Count,Total Volume,Average Amount,Minimum Amount,Maximum Amount\n';
        const csvRows = data.map(row => {
          return [
            row['Date'],
            row['Currency'],
            row['Transaction Type'],
            row['Transaction Count'],
            row['Total Volume'],
            row['Average Amount'],
            row['Minimum Amount'],
            row['Maximum Amount']
          ].map(field => `"${field}"`).join(',');
        }).join('\n');

        const csv = csvHeader + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=enhanced-analytics-export-${filters.start || 'all'}-to-${filters.end || 'now'}.csv`);
        res.send(csv);
      } else if (filters.format === 'json') {
        res.json({ 
          analytics: data, 
          total: data.length,
          exported: new Date().toISOString(),
          filters: filters,
          summary: {
            dateRange: `${filters.start || 'All'} to ${filters.end || 'Now'}`,
            totalRecords: data.length,
            currencies: [...new Set(data.map(row => row['Currency']))],
            transactionTypes: [...new Set(data.map(row => row['Transaction Type']))]
          }
        });
      } else {
        res.status(400).json({ error: 'Unsupported format. Use csv or json.' });
      }

    } catch (error) {
      console.error('Error exporting enhanced analytics:', error);
      res.status(500).json({ error: 'Failed to export analytics data' });
    }
  });

  /**
   * Bulk report generation for multiple report types
   * POST /admin/api/plugins/economy/reports/bulk-generate
   */
  router.post('/reports/bulk-generate', adminAuth, async (req, res) => {
    try {
      const { reportConfigs } = req.body;

      if (!reportConfigs || !Array.isArray(reportConfigs)) {
        return res.status(400).json({ error: 'Report configurations array is required' });
      }

      if (reportConfigs.length > 10) {
        return res.status(400).json({ error: 'Maximum 10 reports can be generated at once' });
      }

      const results = await reportService.bulkGenerateReports(reportConfigs, {
        adminUser: req.session.adminUser || 'admin',
        ipAddress: req.ip
      });

      res.json({
        success: true,
        generated: results.successful,
        failed: results.failed,
        results: results.results,
        errors: results.errors
      });

    } catch (error) {
      console.error('Error in bulk report generation:', error);
      res.status(500).json({ error: 'Failed to generate bulk reports' });
    }
  });

  /**
   * Report cleanup - delete old reports
   * DELETE /admin/api/plugins/economy/reports/cleanup
   */
  router.delete('/reports/cleanup', adminAuth, async (req, res) => {
    try {
      const { daysOld = 30 } = req.query;
      const result = await reportService.cleanupOldReports(parseInt(daysOld));
      
      res.json(result);

    } catch (error) {
      console.error('Error cleaning up reports:', error);
      res.status(500).json({ error: 'Failed to cleanup old reports' });
    }
  });

  /**
   * Get report generation status
   * GET /admin/api/plugins/economy/reports/status
   */
  router.get('/reports/status', adminAuth, async (req, res) => {
    try {
      const status = await reportService.getReportStatus();
      res.json(status);

    } catch (error) {
      console.error('Error fetching report status:', error);
      res.status(500).json({ error: 'Failed to retrieve report status' });
    }
  });

  /**
   * Generate PDF report
   * POST /admin/api/plugins/economy/reports/pdf
   */
  router.post('/reports/pdf', adminAuth, async (req, res) => {
    try {
      const { reportType, filters, title, description } = req.body;
      
      if (!reportType) {
        return res.status(400).json({ error: 'Report type is required' });
      }

      const pdfGenerator = new PDFReportGenerator();
      
      // Generate report data based on type
      let reportData;
      switch (reportType) {
        case 'transactions':
          reportData = await reportService.generateTransactionReport(filters);
          break;
        case 'balances':
          reportData = await reportService.generateBalanceReport(filters);
          break;
        case 'analytics':
          reportData = await reportService.generateAnalyticsReport(filters);
          break;
        case 'currency_flow':
          reportData = await reportService.generateCurrencyFlowReport(filters);
          break;
        case 'wealth_distribution':
          reportData = await reportService.generateWealthDistributionReport(filters);
          break;
        case 'admin_actions':
          reportData = await reportService.generateAdminActionsReport(filters);
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }

      // Generate PDF
      const pdfBuffer = await pdfGenerator.generateReport({
        type: reportType,
        title: title || `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        description: description || `Generated on ${new Date().toISOString()}`,
        data: reportData,
        generatedBy: req.session.adminUser || 'admin',
        generatedAt: new Date()
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);

    } catch (error) {
      console.error('Error generating PDF report:', error);
      res.status(500).json({ error: 'Failed to generate PDF report: ' + error.message });
    }
  });

  return router;
};