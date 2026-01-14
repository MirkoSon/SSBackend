/**
 * ReportingHub - Comprehensive reporting system for Economy Plugin
 * Part of Story 4.5 Phase 2.2: Enhanced Reporting
 * Provides advanced report generation, export capabilities, and templates
 */
class ReportingHub {
  constructor() {
    // Reporting data and state
    this.reports = [];
    this.reportTemplates = [];
    this.currencies = [];
    this.exportQueue = [];
    this.isGenerating = false;
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.totalReports = 0;

    // Report configuration
    this.reportConfig = {
      formats: ['csv', 'pdf', 'json'],
      maxRows: 100000,
      compressionEnabled: true,
      scheduling: false,
      emailDelivery: false
    };

    // Filter state
    this.filters = {
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
      reportType: 'all',
      status: 'all',
      search: ''
    };

    // Event bus for real-time updates
    this.eventBus = window.PluginFramework?.eventBus || null;

    this.init();
  }

  async init() {
    try {
      await this.loadReportTemplates();
      await this.loadRecentReports();
      await this.loadCurrencies();
      this.render();
      this.setupEventListeners();

      // Set up real-time updates
      if (this.eventBus) {
        this.eventBus.on('economy:report:generated', (data) => {
          this.handleReportGenerated(data);
        });
      }

    } catch (error) {
      console.error('Error initializing Reporting Hub:', error);
      this.renderError('Failed to initialize reporting system');
    }
  }

  async loadReportTemplates() {
    // Define built-in report templates
    this.reportTemplates = [
      {
        id: 'transaction-summary',
        name: 'Transaction Summary Report',
        description: 'Comprehensive summary of all transactions within date range',
        category: 'Transactions',
        fields: ['id', 'user_id', 'username', 'currency', 'amount', 'type', 'date', 'status'],
        filters: ['dateRange', 'currency', 'transactionType', 'userFilter'],
        formats: ['csv', 'pdf', 'json'],
        icon: '📊'
      },
      {
        id: 'user-balances',
        name: 'User Balance Report',
        description: 'Current balances for all users across all currencies',
        category: 'Balances',
        fields: ['user_id', 'username', 'currency', 'balance', 'last_updated'],
        filters: ['currency', 'balanceRange', 'userFilter'],
        formats: ['csv', 'pdf'],
        icon: '💰'
      },
      {
        id: 'analytics-overview',
        name: 'Economic Analytics Overview',
        description: 'Comprehensive economic analytics and trends',
        category: 'Analytics',
        fields: ['date', 'currency', 'transaction_count', 'total_volume', 'avg_amount'],
        filters: ['dateRange', 'currency', 'analyticsType'],
        formats: ['csv', 'pdf'],
        icon: '📈'
      },
      {
        id: 'currency-flow',
        name: 'Currency Flow Analysis',
        description: 'Detailed analysis of currency inflows and outflows',
        category: 'Analytics',
        fields: ['date', 'currency', 'inflow', 'outflow', 'net_flow'],
        filters: ['dateRange', 'currency'],
        formats: ['csv', 'pdf'],
        icon: '🔄'
      },
      {
        id: 'wealth-distribution',
        name: 'Wealth Distribution Report',
        description: 'Analysis of wealth distribution across user base',
        category: 'Analytics',
        fields: ['wealth_range', 'user_count', 'percentage', 'total_wealth'],
        filters: ['currency'],
        formats: ['csv', 'pdf'],
        icon: '📊'
      },
      {
        id: 'admin-actions',
        name: 'Administrative Actions Log',
        description: 'Audit log of administrative actions taken',
        category: 'Audit',
        fields: ['timestamp', 'admin_user', 'action', 'target', 'details'],
        filters: ['dateRange', 'actionType', 'adminUser'],
        formats: ['csv', 'json'],
        icon: '🔐'
      }
    ];
  }

  async loadRecentReports() {
    try {
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.itemsPerPage,
        ...this.filters
      });

      const response = await fetch(`/admin/api/plugins/economy/reports?${params}`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Reports API error: ${response.status}`);
      }

      const data = await response.json();
      this.reports = data.reports || [];
      this.totalReports = data.total || 0;

    } catch (error) {
      console.error('Error loading recent reports:', error);
      this.reports = [];
    }
  }

  async loadCurrencies() {
    try {
      const response = await fetch('/admin/api/plugins/economy/currencies', {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Currencies API error: ${response.status}`);
      }

      const data = await response.json();
      this.currencies = data.currencies || [];

    } catch (error) {
      console.error('Error loading currencies:', error);
      this.currencies = [];
    }
  }

  render() {
    const container = document.getElementById('reporting-hub');
    if (!container) return;

    container.innerHTML = `
      <div class="reporting-hub">
        <!-- Header Section -->
        <div class="reporting-header">
          <div class="header-content">
            <h2>📋 Report Center</h2>
            <p>Generate comprehensive reports and export economy data</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" id="generate-report-btn">
              📊 Generate Report
            </button>
          </div>
        </div>

        <!-- Report Templates Section -->
        <div class="reporting-section">
          <div class="section-header">
            <h3>📑 Report Templates</h3>
            <p>Pre-configured reports ready for generation</p>
          </div>
          
          <div class="report-templates-grid">
            ${this.renderReportTemplates()}
          </div>
        </div>

        <!-- Recent Reports Section -->
        <div class="reporting-section">
          <div class="section-header">
            <h3>📄 Recent Reports</h3>
            <div class="section-controls">
              ${this.renderReportFilters()}
            </div>
          </div>
          
          <div class="reports-table-container">
            ${this.renderReportsTable()}
          </div>
          
          ${this.renderPagination()}
        </div>

        <!-- Export Queue Section -->
        <div class="reporting-section ${this.exportQueue.length === 0 ? 'hidden' : ''}">
          <div class="section-header">
            <h3>🚀 Export Queue</h3>
            <p>Reports currently being generated</p>
          </div>
          
          <div class="export-queue">
            ${this.renderExportQueue()}
          </div>
        </div>
      </div>

      <!-- Generate Report Modal (will be added dynamically) -->
    `;
  }

  renderReportTemplates() {
    const categories = [...new Set(this.reportTemplates.map(t => t.category))];

    return categories.map(category => `
      <div class="template-category">
        <h4 class="category-title">${category}</h4>
        <div class="template-cards">
          ${this.reportTemplates
        .filter(template => template.category === category)
        .map(template => `
              <div class="template-card" data-template-id="${template.id}">
                <div class="template-icon">${template.icon}</div>
                <div class="template-content">
                  <h5 class="template-name">${template.name}</h5>
                  <p class="template-description">${template.description}</p>
                  <div class="template-formats">
                    ${template.formats.map(format =>
          `<span class="format-badge">${format.toUpperCase()}</span>`
        ).join('')}
                  </div>
                </div>
                <div class="template-actions">
                  <button class="btn btn-sm btn-primary generate-template-btn" 
                          data-template-id="${template.id}">
                    Generate
                  </button>
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    `).join('');
  }

  renderReportFilters() {
    return `
      <div class="report-filters">
        <div class="filter-group">
          <input type="date" class="form-control" id="filter-date-from" 
                 value="${this.filters.dateFrom}" placeholder="From Date">
        </div>
        <div class="filter-group">
          <input type="date" class="form-control" id="filter-date-to" 
                 value="${this.filters.dateTo}" placeholder="To Date">
        </div>
        <div class="filter-group">
          <select class="form-control" id="filter-report-type">
            <option value="all" ${this.filters.reportType === 'all' ? 'selected' : ''}>All Types</option>
            <option value="transactions" ${this.filters.reportType === 'transactions' ? 'selected' : ''}>Transactions</option>
            <option value="balances" ${this.filters.reportType === 'balances' ? 'selected' : ''}>Balances</option>
            <option value="analytics" ${this.filters.reportType === 'analytics' ? 'selected' : ''}>Analytics</option>
            <option value="audit" ${this.filters.reportType === 'audit' ? 'selected' : ''}>Audit</option>
          </select>
        </div>
        <div class="filter-group">
          <select class="form-control" id="filter-status">
            <option value="all" ${this.filters.status === 'all' ? 'selected' : ''}>All Status</option>
            <option value="completed" ${this.filters.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="generating" ${this.filters.status === 'generating' ? 'selected' : ''}>Generating</option>
            <option value="failed" ${this.filters.status === 'failed' ? 'selected' : ''}>Failed</option>
          </select>
        </div>
        <div class="filter-group">
          <input type="search" class="form-control" id="filter-search" 
                 value="${this.filters.search}" placeholder="Search reports...">
        </div>
        <div class="filter-group">
          <button class="btn btn-secondary" id="clear-filters-btn">Clear</button>
        </div>
      </div>
    `;
  }

  renderReportsTable() {
    if (this.reports.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <h4>No Reports Found</h4>
          <p>Generate your first report using the templates above.</p>
        </div>
      `;
    }

    return `
      <div class="reports-table">
        <table class="data-table">
          <thead>
            <tr>
              <th>Report Name</th>
              <th>Type</th>
              <th>Generated</th>
              <th>Format</th>
              <th>Rows</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.reports.map(report => `
              <tr class="report-row" data-report-id="${report.id}">
                <td>
                  <div class="report-name">
                    <span class="report-icon">${this.getReportIcon(report.type)}</span>
                    <div class="name-info">
                      <div class="primary-name">${report.name}</div>
                      <div class="secondary-info">${report.description || ''}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="type-badge type-${report.type}">${report.type}</span>
                </td>
                <td>
                  <div class="timestamp">
                    <div class="primary-time">${this.formatDateTime(report.created_at)}</div>
                    <div class="secondary-time">${this.timeAgo(report.created_at)}</div>
                  </div>
                </td>
                <td>
                  <span class="format-badge">${report.format.toUpperCase()}</span>
                </td>
                <td>
                  <span class="row-count">${(report.row_count || 0).toLocaleString()}</span>
                </td>
                <td>
                  <span class="status-indicator status-${report.status}">
                    <span class="status-icon">${this.getStatusIcon(report.status)}</span>
                    ${report.status}
                  </span>
                </td>
                <td id="actions-${report.id}">
                  <!-- Actions will be rendered here -->
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderExportQueue() {
    if (this.exportQueue.length === 0) {
      return `<div class="queue-empty">No reports currently generating</div>`;
    }

    return `
      <div class="queue-items">
        ${this.exportQueue.map(item => `
          <div class="queue-item" data-queue-id="${item.id}">
            <div class="queue-icon">${this.getReportIcon(item.type)}</div>
            <div class="queue-info">
              <div class="queue-name">${item.name}</div>
              <div class="queue-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${item.progress}%"></div>
                </div>
                <div class="progress-text">${item.progress}% - ${item.status_message}</div>
              </div>
            </div>
            <div class="queue-actions">
              <button class="btn btn-sm btn-danger cancel-export-btn" 
                      data-queue-id="${item.id}">
                Cancel
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderPagination() {
    const totalPages = Math.ceil(this.totalReports / this.itemsPerPage);

    if (totalPages <= 1) return '';

    return `
      <div class="pagination-container">
        <div class="pagination-info">
          Showing ${(this.currentPage - 1) * this.itemsPerPage + 1} to 
          ${Math.min(this.currentPage * this.itemsPerPage, this.totalReports)} of 
          ${this.totalReports} reports
        </div>
        <div class="pagination-controls">
          <button class="btn btn-sm ${this.currentPage === 1 ? 'btn-disabled' : 'btn-secondary'}" 
                  id="prev-page-btn" ${this.currentPage === 1 ? 'disabled' : ''}>
            Previous
          </button>
          
          ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
      const page = Math.max(1, this.currentPage - 2) + i;
      if (page > totalPages) return '';
      return `
              <button class="btn btn-sm ${page === this.currentPage ? 'btn-primary' : 'btn-secondary'}" 
                      data-page="${page}">
                ${page}
              </button>
            `;
    }).join('')}
          
          <button class="btn btn-sm ${this.currentPage === totalPages ? 'btn-disabled' : 'btn-secondary'}" 
                  id="next-page-btn" ${this.currentPage === totalPages ? 'disabled' : ''}>
            Next
          </button>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    const container = document.getElementById('reporting-hub');
    if (!container) return;

    // Generate report button
    container.addEventListener('click', (e) => {
      if (e.target.id === 'generate-report-btn') {
        this.showGenerateReportModal();
      }

      // Template generate buttons
      if (e.target.classList.contains('generate-template-btn')) {
        const templateId = e.target.dataset.templateId;
        this.showTemplateConfigModal(templateId);
      }

      // Report table actions
      if (e.target.classList.contains('download-report-btn')) {
        const reportId = e.target.dataset.reportId;
        this.downloadReport(reportId);
      }

      if (e.target.classList.contains('view-report-btn')) {
        const reportId = e.target.dataset.reportId;
        this.viewReportDetails(reportId);
      }

      if (e.target.classList.contains('delete-report-btn')) {
        const reportId = e.target.dataset.reportId;
        this.confirmDeleteReport(reportId);
      }

      // Export queue actions
      if (e.target.classList.contains('cancel-export-btn')) {
        const queueId = e.target.dataset.queueId;
        this.cancelExport(queueId);
      }

      // Pagination
      if (e.target.id === 'prev-page-btn') {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.refreshReports();
        }
      }

      if (e.target.id === 'next-page-btn') {
        const totalPages = Math.ceil(this.totalReports / this.itemsPerPage);
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.refreshReports();
        }
      }

      if (e.target.dataset.page) {
        this.currentPage = parseInt(e.target.dataset.page);
        this.refreshReports();
      }

      // Clear filters
      if (e.target.id === 'clear-filters-btn') {
        this.clearFilters();
      }
    });

    // Filter change events
    container.addEventListener('change', (e) => {
      if (e.target.id === 'filter-date-from') {
        this.filters.dateFrom = e.target.value;
        this.applyFilters();
      }

      if (e.target.id === 'filter-date-to') {
        this.filters.dateTo = e.target.value;
        this.applyFilters();
      }

      if (e.target.id === 'filter-report-type') {
        this.filters.reportType = e.target.value;
        this.applyFilters();
      }

      if (e.target.id === 'filter-status') {
        this.filters.status = e.target.value;
        this.applyFilters();
      }
    });

    // Search input with debounce
    container.addEventListener('input', (e) => {
      if (e.target.id === 'filter-search') {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          this.filters.search = e.target.value;
          this.applyFilters();
        }, 300);
      }
    });

    // Modal event delegation
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-close') ||
        e.target.classList.contains('modal-backdrop')) {
        this.closeModal();
      }

      if (e.target.id === 'confirm-generate-report') {
        this.confirmGenerateReport();
      }
    });
  }

  // Utility methods
  getReportIcon(type) {
    const icons = {
      transactions: '💳',
      balances: '💰',
      analytics: '📈',
      audit: '🔐',
      summary: '📊',
      export: '📤'
    };
    return icons[type] || '📄';
  }

  getStatusIcon(status) {
    const icons = {
      completed: '✅',
      generating: '⏳',
      failed: '❌',
      cancelled: '🚫'
    };
    return icons[status] || '❓';
  }

  formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
option">
    <input type = "checkbox" id = "include-metadata" checked>
                    <span class="checkmark"></span>
                    Include metadata and additional fields
                  </label >
                  
                  <label class="checkbox-option">
                    <input type="checkbox" id="compress-output">
                    <span class="checkmark"></span>
                    Compress large reports (ZIP format)
                  </label>
                  
                  <label class="checkbox-option">
                    <input type="checkbox" id="email-delivery">
                    <span class="checkmark"></span>
                    Email report when ready (if configured)
                  </label>
                </div >
              </div >

  <div class="config-section limits-section">
    <h4>Output Limits</h4>
    <div class="form-group">
      <label for="max-rows">Maximum Rows (0 = unlimited)</label>
      <input type="number" id="max-rows" class="form-control"
        value="10000" min="0" max="1000000">
        <small class="form-help">Large reports may take longer to generate</small>
    </div>
  </div>
            </div >
          </div >

  <div class="modal-footer">
    <button class="btn btn-secondary modal-close">Cancel</button>
    <button class="btn btn-primary" id="confirm-generate-report">
      📊 Generate Report
    </button>
  </div>
        </div >
      </div >
  `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  async showTemplateConfigModal(templateId) {
    const template = this.reportTemplates.find(t => t.id === templateId);
    if (!template) return;

    const modalHtml = `
  < div class="modal-backdrop" >
    <div class="modal template-config-modal">
      <div class="modal-header">
        <h3>${template.icon} ${template.name}</h3>
        <button class="modal-close">&times;</button>
      </div>

      <div class="modal-body">
        <div class="template-description">
          <p>${template.description}</p>
        </div>

        <div class="template-config-form">
          <div class="config-section">
            <h4>Report Settings</h4>
            <div class="form-grid">
              <div class="form-group">
                <label for="template-format">Format</label>
                <select id="template-format" class="form-control">
                  ${template.formats.map(format => `
                        <option value="${format}">${format.toUpperCase()}</option>
                      `).join('')}
                </select>
              </div>

              ${template.filters.includes('dateRange') ? `
                    <div class="form-group">
                      <label for="template-date-from">From Date</label>
                      <input type="date" id="template-date-from" class="form-control" 
                             value="${this.filters.dateFrom}">
                    </div>
                    
                    <div class="form-group">
                      <label for="template-date-to">To Date</label>
                      <input type="date" id="template-date-to" class="form-control" 
                             value="${this.filters.dateTo}">
                    </div>
                  ` : ''}

              ${template.filters.includes('currency') ? `
                    <div class="form-group">
                      <label for="template-currency">Currency</label>
                      <select id="template-currency" class="form-control">
                        <option value="all">All Currencies</option>
                        ${this.currencies.map(currency => `
                          <option value="${currency.id}">${currency.name} (${currency.symbol})</option>
                        `).join('')}
                      </select>
                    </div>
                  ` : ''}

              ${template.filters.includes('transactionType') ? `
                    <div class="form-group">
                      <label for="template-transaction-type">Transaction Type</label>
                      <select id="template-transaction-type" class="form-control">
                        <option value="all">All Types</option>
                        <option value="transfer">Transfers</option>
                        <option value="admin_adjustment">Admin Adjustments</option>
                        <option value="system">System Transactions</option>
                        <option value="rollback">Rollbacks</option>
                      </select>
                    </div>
                  ` : ''}
            </div>
          </div>

          <div class="config-section">
            <h4>Output Options</h4>
            <div class="checkbox-group">
              <label class="checkbox-option">
                <input type="checkbox" id="template-include-headers" checked>
                  <span class="checkmark"></span>
                  Include column headers
              </label>

              <label class="checkbox-option">
                <input type="checkbox" id="template-compress">
                  <span class="checkmark"></span>
                  Compress output (for large reports)
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary modal-close">Cancel</button>
        <button class="btn btn-primary" id="generate-template-report"
          data-template-id="${templateId}">
          ${template.icon} Generate Report
        </button>
      </div>
    </div>
      </div >
  `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add event listener for template generation
    document.getElementById('generate-template-report').addEventListener('click', () => {
      this.generateTemplateReport(templateId);
    });
  }

  async confirmGenerateReport() {
    const reportType = document.querySelector('input[name="report-type"]:checked')?.value;
    const reportName = document.getElementById('report-name')?.value;
    const format = document.getElementById('report-format')?.value;
    const dateFrom = document.getElementById('date-from')?.value;
    const dateTo = document.getElementById('date-to')?.value;
    const currency = document.getElementById('currency-filter')?.value;
    const includeMetadata = document.getElementById('include-metadata')?.checked;
    const compress = document.getElementById('compress-output')?.checked;
    const emailDelivery = document.getElementById('email-delivery')?.checked;
    const maxRows = parseInt(document.getElementById('max-rows')?.value) || 0;

    if (!reportName) {
      this.showErrorMessage('Report name is required');
      return;
    }

    const reportConfig = {
      name: reportName,
      type: reportType,
      format,
      dateFrom,
      dateTo,
      currency,
      includeMetadata,
      compress,
      emailDelivery,
      maxRows
    };

    await this.generateReport(reportConfig);
    this.closeModal();
  }

  async generateTemplateReport(templateId) {
    const template = this.reportTemplates.find(t => t.id === templateId);
    if (!template) return;

    const format = document.getElementById('template-format')?.value;
    const dateFrom = document.getElementById('template-date-from')?.value;
    const dateTo = document.getElementById('template-date-to')?.value;
    const currency = document.getElementById('template-currency')?.value;
    const transactionType = document.getElementById('template-transaction-type')?.value;
    const includeHeaders = document.getElementById('template-include-headers')?.checked;
    const compress = document.getElementById('template-compress')?.checked;

    const reportConfig = {
      templateId,
      name: template.name,
      type: template.category.toLowerCase(),
      format,
      dateFrom,
      dateTo,
      currency,
      transactionType,
      includeHeaders,
      compress,
      fields: template.fields
    };

    await this.generateReport(reportConfig);
    this.closeModal();
  }

  async generateReport(config) {
    try {
      this.isGenerating = true;

      // Add to export queue
      const queueItem = {
        id: Date.now().toString(),
        name: config.name,
        type: config.type,
        progress: 0,
        status_message: 'Initializing...'
      };
      
      this.exportQueue.push(queueItem);
      this.render(); // Update UI to show queue

      // Make API request to generate report
      const response = await fetch('/admin/api/plugins/economy/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`Report generation failed: ${ response.status } `);
      }

      const result = await response.json();
      
      // Update queue item
      const queueIndex = this.exportQueue.findIndex(item => item.id === queueItem.id);
      if (queueIndex !== -1) {
        this.exportQueue[queueIndex] = {
          ...queueItem,
          progress: 100,
          status_message: 'Completed',
          reportId: result.reportId
        };
      }

      // Refresh reports list
      await this.refreshReports();
      
      this.showSuccessMessage(`Report "${config.name}" generated successfully!`);

      // Remove from queue after a delay
      setTimeout(() => {
        const index = this.exportQueue.findIndex(item => item.id === queueItem.id);
        if (index !== -1) {
          this.exportQueue.splice(index, 1);
          this.render();
        }
      }, 3000);

    } catch (error) {
      console.error('Error generating report:', error);
      this.showErrorMessage('Failed to generate report: ' + error.message);
      
      // Remove from queue on error
      const queueIndex = this.exportQueue.findIndex(item => item.id === queueItem.id);
      if (queueIndex !== -1) {
        this.exportQueue.splice(queueIndex, 1);
        this.render();
      }
    } finally {
      this.isGenerating = false;
    }
  }

  async downloadReport(reportId) {
    try {
      const response = await fetch(`/ admin / api / plugins / economy / reports / ${ reportId }/download`, {
headers: { 'Content-Type': 'application/json' }
      });

if (!response.ok) {
  throw new Error(`Download failed: ${response.status}`);
}

// Get filename from response header
const contentDisposition = response.headers.get('content-disposition');
let filename = 'report.csv';
if (contentDisposition) {
  const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (match) {
    filename = match[1].replace(/['"]/g, '');
  }
}

// Download the file
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.style.display = 'none';
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
window.URL.revokeObjectURL(url);
document.body.removeChild(a);

    } catch (error) {
  console.error('Error downloading report:', error);
  this.showErrorMessage('Failed to download report');
}
  }

  async viewReportDetails(reportId) {
  try {
    const response = await fetch(`/admin/api/plugins/economy/reports/${reportId}`, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch report details: ${response.status}`);
    }

    const report = await response.json();
    this.showReportDetailsModal(report);

  } catch (error) {
    console.error('Error fetching report details:', error);
    this.showErrorMessage('Failed to load report details');
  }
}

showReportDetailsModal(report) {
  const modalHtml = `
      <div class="modal-backdrop">
        <div class="modal report-details-modal">
          <div class="modal-header">
            <h3>${this.getReportIcon(report.type)} Report Details</h3>
            <button class="modal-close">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="report-details">
              
              <div class="detail-section">
                <h4>Basic Information</h4>
                <div class="detail-grid">
                  <div class="detail-item">
                    <label>Report Name:</label>
                    <span>${report.name}</span>
                  </div>
                  <div class="detail-item">
                    <label>Type:</label>
                    <span class="type-badge type-${report.type}">${report.type}</span>
                  </div>
                  <div class="detail-item">
                    <label>Format:</label>
                    <span class="format-badge">${report.format.toUpperCase()}</span>
                  </div>
                  <div class="detail-item">
                    <label>Status:</label>
                    <span class="status-indicator status-${report.status}">
                      ${this.getStatusIcon(report.status)} ${report.status}
                    </span>
                  </div>
                </div>
              </div>

              <div class="detail-section">
                <h4>Generation Details</h4>
                <div class="detail-grid">
                  <div class="detail-item">
                    <label>Created:</label>
                    <span>${this.formatDateTime(report.created_at)}</span>
                  </div>
                  <div class="detail-item">
                    <label>Generation Time:</label>
                    <span>${report.generation_time || 'N/A'}</span>
                  </div>
                  <div class="detail-item">
                    <label>File Size:</label>
                    <span>${this.formatFileSize(report.file_size)}</span>
                  </div>
                  <div class="detail-item">
                    <label>Row Count:</label>
                    <span>${(report.row_count || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              ${report.config ? `
                <div class="detail-section">
                  <h4>Report Configuration</h4>
                  <div class="config-details">
                    ${Object.entries(JSON.parse(report.config)).map(([key, value]) => `
                      <div class="config-item">
                        <label>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</label>
                        <span>${typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${report.error_message ? `
                <div class="detail-section error-section">
                  <h4>Error Information</h4>
                  <div class="error-message">
                    ${report.error_message}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="modal-footer">
            ${report.status === 'completed' ? `
              <button class="btn btn-primary" onclick="window.reportingHub.downloadReport('${report.id}')">
                📥 Download Report
              </button>
            ` : ''}
            <button class="btn btn-secondary modal-close">Close</button>
          </div>
        </div>
      </div>
    `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

  async confirmDeleteReport(reportId) {
  const report = this.reports.find(r => r.id === reportId);
  if (!report) return;

  const modalHtml = `
      <div class="modal-backdrop">
        <div class="modal delete-confirmation-modal">
          <div class="modal-header">
            <h3>🗑️ Delete Report</h3>
            <button class="modal-close">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="delete-warning">
              <div class="warning-icon">⚠️</div>
              <div class="warning-message">
                <h4>Are you sure you want to delete this report?</h4>
                <p>This action cannot be undone. The report file and all associated data will be permanently deleted.</p>
              </div>
            </div>

            <div class="report-summary">
              <div class="summary-item">
                <label>Report:</label>
                <span>${report.name}</span>
              </div>
              <div class="summary-item">
                <label>Created:</label>
                <span>${this.formatDateTime(report.created_at)}</span>
              </div>
              <div class="summary-item">
                <label>Size:</label>
                <span>${this.formatFileSize(report.file_size)}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary modal-close">Cancel</button>
            <button class="btn btn-danger" id="confirm-delete-report" 
                    data-report-id="${reportId}">
              🗑️ Delete Report
            </button>
          </div>
        </div>
      </div>
    `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Add event listener for delete confirmation
  document.getElementById('confirm-delete-report').addEventListener('click', () => {
    this.deleteReport(reportId);
  });
}

  async deleteReport(reportId) {
  try {
    const response = await fetch(`/admin/api/plugins/economy/reports/${reportId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.status}`);
    }

    await this.refreshReports();
    this.showSuccessMessage('Report deleted successfully');
    this.closeModal();

  } catch (error) {
    console.error('Error deleting report:', error);
    this.showErrorMessage('Failed to delete report');
  }
}

  async cancelExport(queueId) {
  const queueIndex = this.exportQueue.findIndex(item => item.id === queueId);
  if (queueIndex !== -1) {
    this.exportQueue.splice(queueIndex, 1);
    this.render();
    this.showSuccessMessage('Export cancelled');
  }
}

  async refreshReports() {
  await this.loadRecentReports();
  this.render();

  // Render standardized action buttons
  this.reports.forEach(report => {
    const actionContainer = document.getElementById(`actions-${report.id}`);
    if (actionContainer) {
      this.renderStandardActions(actionContainer, report);
    }
  });
}

applyFilters() {
  this.currentPage = 1; // Reset to first page when filters change
  this.refreshReports();
}

clearFilters() {
  this.filters = {
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    reportType: 'all',
    status: 'all',
    search: ''
  };
  this.currentPage = 1;
  this.refreshReports();
}

renderStandardActions(container, report) {
  const actions = [];
  if (report.status === 'completed') {
    actions.push({
      id: 'save',
      label: '📥',
      title: 'Download Report',
      handler: () => this.downloadReport(report.id)
    });
  }
  actions.push({ id: 'view', handler: () => this.viewReportDetails(report.id) });
  actions.push({ id: 'delete', handler: () => this.confirmDeleteReport(report.id) });
  actions.forEach(config => {
    const action = window.PluginFramework?.components?.ActionRegistry?.resolve(config.id);
    const btn = document.createElement('button');
    btn.className = `action-btn ${action.className || ''}`;
    btn.textContent = config.label || action.label;
    btn.title = config.title || action.title;
    btn.onclick = (e) => {
      e.stopPropagation();
      config.handler();
    };
    container.appendChild(btn);
  });
}

closeModal() {
  const modal = document.querySelector('.modal-backdrop');
  if (modal) {
    modal.remove();
  }
}

// Handle real-time updates from event bus
handleReportGenerated(data) {
  // Update export queue or reports list based on the data
  const queueIndex = this.exportQueue.findIndex(item => item.reportId === data.reportId);
  if (queueIndex !== -1) {
    this.exportQueue[queueIndex].progress = data.progress || 100;
    this.exportQueue[queueIndex].status_message = data.status_message || 'Completed';
    this.render();
  }

  // Refresh reports if generation is complete
  if (data.status === 'completed') {
    this.refreshReports();
  }
}

formatFileSize(bytes) {
  if (!bytes) return 'N/A';

  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Message display methods
showSuccessMessage(message) {
  this.showMessage(message, 'success');
}

showErrorMessage(message) {
  this.showMessage(message, 'error');
}

showMessage(message, type) {
  // Create and show a toast notification
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span>
      <span class="toast-message">${message}</span>
    `;

  document.body.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

renderError(message) {
  const container = document.getElementById('reporting-hub');
  if (!container) return;

  container.innerHTML = `
      <div class="error-state">
        <div class="error-icon">❌</div>
        <h3>Error Loading Reporting Hub</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">
          Reload Page
        </button>
      </div>
    `;
}

destroy() {
  // Clean up event listeners and intervals
  if (this.refreshInterval) {
    clearInterval(this.refreshInterval);
  }

  if (this.searchTimeout) {
    clearTimeout(this.searchTimeout);
  }

  if (this.eventBus) {
    this.eventBus.off('economy:report:generated');
  }
}
}

// Export the component
window.ReportingHub = ReportingHub;
