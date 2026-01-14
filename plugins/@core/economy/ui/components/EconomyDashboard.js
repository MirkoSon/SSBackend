/**
 * Economy Dashboard - Main overview interface for economy plugin
 * Provides key metrics, system health indicators, and quick actions
 * Part of Story 4.5: Economy Plugin Dashboard Integration
 */

class EconomyDashboard {
  constructor() {
    this.eventBus = window.PluginFramework?.eventBus;
    this.components = window.PluginFramework?.components;
    this.refreshInterval = null;
    this.metrics = {
      totalCurrencies: 0,
      activeUsers: 0,
      dailyTransactions: 0,
      totalVolume: 0
    };
    this.systemHealth = {
      databaseStatus: 'unknown',
      apiResponseTime: 0,
      cacheHitRate: 0
    };
    this.recentActivity = [];
    
    this.init();
  }

  async init() {
    try {
      await this.loadInitialData();
      this.setupEventListeners();
      this.startRealTimeUpdates();
      this.render();
    } catch (error) {
      console.error('Failed to initialize Economy Dashboard:', error);
      this.renderError('Failed to load economy dashboard');
    }
  }

  async loadInitialData() {
    try {
      // Load key metrics
      const metricsResponse = await fetch('/admin/api/plugins/economy/metrics', {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!metricsResponse.ok) {
        throw new Error(`Failed to load metrics: ${metricsResponse.status}`);
      }
      
      const metricsData = await metricsResponse.json();
      this.metrics = { ...this.metrics, ...metricsData };

      // Load system health data
      const healthResponse = await fetch('/admin/api/plugins/economy/health', {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        this.systemHealth = { ...this.systemHealth, ...healthData };
      }

      // Load recent activity
      const activityResponse = await fetch('/admin/api/plugins/economy/recent-activity', {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        this.recentActivity = activityData.activities || [];
      }

    } catch (error) {
      console.error('Error loading initial data:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Listen for real-time updates
    if (this.eventBus) {
      this.eventBus.on('economy:metrics:update', (data) => {
        this.updateMetrics(data);
      });

      this.eventBus.on('economy:activity:new', (activity) => {
        this.addRecentActivity(activity);
      });
    }

    // Setup refresh button
    document.addEventListener('click', (e) => {
      if (e.target.matches('.economy-refresh-btn')) {
        this.refreshData();
      }
    });

    // Setup quick action buttons
    document.addEventListener('click', (e) => {
      if (e.target.matches('.economy-quick-action')) {
        const action = e.target.dataset.action;
        this.handleQuickAction(action);
      }
    });
  }

  startRealTimeUpdates() {
    // Start periodic updates (fallback if WebSocket not available)
    this.refreshInterval = setInterval(async () => {
      try {
        await this.loadInitialData();
        this.updateDisplay();
      } catch (error) {
        console.error('Error during periodic update:', error);
      }
    }, 30000); // 30 seconds
  }

  stopRealTimeUpdates() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  updateMetrics(newMetrics) {
    this.metrics = { ...this.metrics, ...newMetrics };
    this.updateDisplay();
  }

  addRecentActivity(activity) {
    this.recentActivity.unshift(activity);
    if (this.recentActivity.length > 10) {
      this.recentActivity = this.recentActivity.slice(0, 10);
    }
    this.updateRecentActivity();
  }

  async refreshData() {
    try {
      await this.loadInitialData();
      this.updateDisplay();
      this.showSuccessMessage('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      this.showErrorMessage('Failed to refresh data');
    }
  }

  handleQuickAction(action) {
    switch (action) {
      case 'view-transactions':
        window.location.href = '#/admin/economy/transactions';
        break;
      case 'manage-balances':
        window.location.href = '#/admin/economy/balances';
        break;
      case 'view-analytics':
        window.location.href = '#/admin/economy/analytics';
        break;
      case 'currency-config':
        window.location.href = '#/admin/economy/currencies';
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  render() {
    const container = document.getElementById('economy-dashboard');
    if (!container) {
      console.error('Economy dashboard container not found');
      return;
    }
    container.innerHTML = ''; // Clear existing content

    const dashboard = new this.components.CardContainer({
      title: 'Economy Dashboard',
      content: `
        <div class="dashboard-stats">
          ${this.renderMetricCards()}
        </div>
        <div class="economy-content-grid">
          <div class="economy-charts">
            ${this.renderAnalyticsCharts()}
          </div>
          <div class="economy-sidebar">
            ${this.renderSystemHealth()}
            ${this.renderQuickActions()}
          </div>
        </div>
        <div class="economy-recent-activity">
          ${this.renderRecentActivity()}
        </div>
      `
    });

    container.appendChild(dashboard.render());

    // Initialize any interactive components
    this.initializeComponents();
  }

  renderMetricCards() {
    const { StatCard } = this.components;
    const metrics = [
      {
        label: 'Total Users',
        value: this.metrics.activeUsers,
        icon: '👥',
        trend: { value: this.calculateTrend('users'), direction: this.calculateTrend('users') > 0 ? 'up' : 'down' }
      },
      {
        label: 'Total Balance',
        value: this.formatCurrency(this.metrics.totalVolume), // Assuming totalVolume is total balance
        icon: '💰'
      },
      {
        label: 'Active Transactions',
        value: this.metrics.dailyTransactions,
        icon: '📊'
      },
      {
        label: 'Daily Volume',
        value: this.formatCurrency(this.metrics.totalVolume),
        icon: '📈'
      }
    ];

    return metrics.map(metric => new StatCard(metric).render()).join('');
  }

  renderAnalyticsCharts() {
    return `
      <div class="analytics-section">
        <h3>Transaction Activity</h3>
        <div class="chart-container">
          <div id="economy-transaction-chart" class="economy-chart">
            <div class="chart-placeholder">
              📊 Loading transaction trends...
            </div>
          </div>
        </div>
        
        <h3>Currency Distribution</h3>
        <div class="chart-container">
          <div id="economy-currency-chart" class="economy-chart">
            <div class="chart-placeholder">
              🥧 Loading currency distribution...
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderSystemHealth() {
    const healthStatus = this.systemHealth.databaseStatus === 'healthy' ? 'healthy' : 'warning';
    const healthIcon = healthStatus === 'healthy' ? '✅' : '⚠️';

    return `
      <div class="system-health">
        <h3>System Health</h3>
        <div class="health-metrics">
          <div class="health-item">
            <span class="health-icon">${healthIcon}</span>
            <span class="health-label">Database</span>
            <span class="health-value">${this.systemHealth.databaseStatus}</span>
          </div>
          <div class="health-item">
            <span class="health-icon">⚡</span>
            <span class="health-label">API Response</span>
            <span class="health-value">${this.systemHealth.apiResponseTime}ms</span>
          </div>
          <div class="health-item">
            <span class="health-icon">🎯</span>
            <span class="health-label">Cache Hit Rate</span>
            <span class="health-value">${this.systemHealth.cacheHitRate}%</span>
          </div>
        </div>
      </div>
    `;
  }

  renderQuickActions() {
    return `
      <div class="quick-actions">
        <h3>Quick Actions</h3>
        <div class="action-buttons">
          <button class="btn btn-primary economy-quick-action" data-action="view-transactions">
            📊 View Transactions
          </button>
          <button class="btn btn-secondary economy-quick-action" data-action="manage-balances">
            💳 Manage Balances
          </button>
          <button class="btn btn-info economy-quick-action" data-action="view-analytics">
            📈 Analytics
          </button>
          <button class="btn btn-warning economy-quick-action" data-action="currency-config">
            ⚙️ Configure Currencies
          </button>
        </div>
      </div>
    `;
  }

  renderRecentActivity() {
    return `
      <div class="recent-activity">
        <h3>Recent Activity</h3>
        <div class="activity-list">
          ${this.recentActivity.length > 0 
            ? this.recentActivity.map(activity => this.renderActivityItem(activity)).join('')
            : '<div class="no-activity">No recent activity</div>'
          }
        </div>
      </div>
    `;
  }

  renderActivityItem(activity) {
    const timeAgo = this.getTimeAgo(new Date(activity.timestamp));
    const actionIcon = this.getActionIcon(activity.action);

    return `
      <div class="activity-item">
        <span class="activity-icon">${actionIcon}</span>
        <div class="activity-content">
          <div class="activity-description">${activity.description}</div>
          <div class="activity-time">${timeAgo}</div>
        </div>
      </div>
    `;
  }

  initializeComponents() {
    // Initialize charts if data is available
    this.initializeTransactionChart();
    this.initializeCurrencyChart();
  }

  initializeTransactionChart() {
    // Placeholder for chart initialization
    // In a real implementation, this would use Chart.js or similar
    const chartElement = document.getElementById('economy-transaction-chart');
    if (chartElement) {
      chartElement.innerHTML = `
        <div class="simple-chart">
          <div class="chart-bar" style="height: 60%"></div>
          <div class="chart-bar" style="height: 80%"></div>
          <div class="chart-bar" style="height: 45%"></div>
          <div class="chart-bar" style="height: 90%"></div>
          <div class="chart-bar" style="height: 75%"></div>
          <div class="chart-bar" style="height: 65%"></div>
          <div class="chart-bar" style="height: 85%"></div>
        </div>
      `;
    }
  }

  initializeCurrencyChart() {
    // Placeholder for currency distribution chart
    const chartElement = document.getElementById('economy-currency-chart');
    if (chartElement) {
      chartElement.innerHTML = `
        <div class="currency-distribution">
          <div class="currency-item">
            <span class="currency-icon">🪙</span>
            <span class="currency-name">Coins</span>
            <span class="currency-percentage">65%</span>
          </div>
          <div class="currency-item">
            <span class="currency-icon">💎</span>
            <span class="currency-name">Gems</span>
            <span class="currency-percentage">35%</span>
          </div>
        </div>
      `;
    }
  }

  updateDisplay() {
    // Update metric cards
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach((card, index) => {
      const valueElement = card.querySelector('.metric-value');
      if (valueElement && this.getMetricValue(index)) {
        valueElement.textContent = this.getMetricValue(index);
      }
    });

    // Update system health
    this.updateSystemHealthDisplay();
  }

  updateSystemHealthDisplay() {
    const healthItems = document.querySelectorAll('.health-item');
    healthItems.forEach((item, index) => {
      const valueElement = item.querySelector('.health-value');
      if (valueElement) {
        switch (index) {
          case 0:
            valueElement.textContent = this.systemHealth.databaseStatus;
            break;
          case 1:
            valueElement.textContent = `${this.systemHealth.apiResponseTime}ms`;
            break;
          case 2:
            valueElement.textContent = `${this.systemHealth.cacheHitRate}%`;
            break;
        }
      }
    });
  }

  updateRecentActivity() {
    const activityList = document.querySelector('.activity-list');
    if (activityList) {
      activityList.innerHTML = this.recentActivity.length > 0 
        ? this.recentActivity.map(activity => this.renderActivityItem(activity)).join('')
        : '<div class="no-activity">No recent activity</div>';
    }
  }

  renderError(message) {
    const container = document.getElementById('economy-dashboard');
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <div class="error-message">${message}</div>
          <button class="btn btn-primary" onclick="location.reload()">
            Retry
          </button>
        </div>
      `;
    }
  }

  // Utility methods
  calculateTrend(metric) {
    // Placeholder for trend calculation
    // In real implementation, this would calculate actual trends
    return Math.floor(Math.random() * 20) - 10; // Random between -10 and 10
  }

  formatCurrency(amount) {
    return amount.toLocaleString();
  }

  getMetricValue(index) {
    const values = [
      this.metrics.totalCurrencies,
      this.metrics.activeUsers.toLocaleString(),
      this.metrics.dailyTransactions.toLocaleString(),
      this.formatCurrency(this.metrics.totalVolume)
    ];
    return values[index];
  }

  getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }

  getActionIcon(action) {
    const icons = {
      'transaction': '💸',
      'balance_adjustment': '💳',
      'currency_created': '💰',
      'system_event': '⚙️',
      'user_activity': '👤'
    };
    return icons[action] || '📝';
  }

  showSuccessMessage(message) {
    // Show success toast/notification
    console.log('Success:', message);
  }

  showErrorMessage(message) {
    // Show error toast/notification
    console.error('Error:', message);
  }

  destroy() {
    this.stopRealTimeUpdates();
    if (this.eventBus) {
      this.eventBus.off('economy:metrics:update');
      this.eventBus.off('economy:activity:new');
    }
  }
}

// Export for use by Plugin UI Framework
window.EconomyDashboard = EconomyDashboard;