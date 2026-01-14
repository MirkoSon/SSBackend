/**
 * Alert Configuration - Alert management interface for economy plugin
 * Allows admins to create, modify, and delete monitoring alerts
 * Part of Story 4.5: Economy Plugin Dashboard Integration
 */

class AlertConfig {
  constructor() {
    this.eventBus = window.PluginFramework?.eventBus;
    this.alerts = [];
    this.editingAlert = null;
    this.alertTypes = [
      { value: 'transaction_volume', label: 'Transaction Volume', description: 'Alert when transaction volume exceeds threshold' },
      { value: 'balance_changes', label: 'Balance Changes', description: 'Alert when user balance changes exceed threshold' },
      { value: 'user_activity', label: 'User Activity', description: 'Alert when user activity patterns are unusual' },
      { value: 'currency_flow', label: 'Currency Flow', description: 'Alert when currency flow rates change significantly' },
      { value: 'system_health', label: 'System Health', description: 'Alert when system performance metrics are concerning' }
    ];

    this.init();
  }

  async init() {
    try {
      await this.loadAlerts();
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize Alert Configuration:', error);
      this.renderError('Failed to load alert configuration');
    }
  }

  async loadAlerts() {
    try {
      const response = await fetch('/admin/api/plugins/economy/alerts', {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to load alerts: ${response.status}`);
      }

      const data = await response.json();
      this.alerts = data.success ? data.alerts : [];
    } catch (error) {
      console.error('Error loading alerts:', error);
      this.alerts = []; // Fallback to empty array
    }
  }

  render() {
    const container = document.getElementById('alert-config');
    if (!container) {
      console.error('Alert config container not found');
      return;
    }

    container.innerHTML = `
      <div class="alert-config">
        <div class="alert-config-header">
          <h2>
            <span class="alert-icon">🚨</span>
            Alert Configuration
          </h2>
          <button class="btn btn-primary" id="create-alert-btn">
            <span class="icon">➕</span>
            Create Alert
          </button>
        </div>

        <div class="alert-overview-cards">
          ${this.renderOverviewCards()}
        </div>

        <div class="alert-list-section">
          <h3>Active Alerts</h3>
          <div class="alert-list">
            ${this.renderAlertList()}
          </div>
        </div>

        ${this.renderAlertModal()}
      </div>
    `;
  }

  renderOverviewCards() {
    const totalAlerts = this.alerts.length;
    const activeAlerts = this.alerts.filter(a => a.status === 'active').length;
    const triggeredToday = 0; // Placeholder - would track actual triggers

    const cards = [
      {
        title: 'Total Alerts',
        value: totalAlerts,
        icon: '🚨',
        color: 'primary'
      },
      {
        title: 'Active Alerts',
        value: activeAlerts,
        icon: '✅',
        color: 'success'
      },
      {
        title: 'Triggered Today',
        value: triggeredToday,
        icon: '🔔',
        color: 'warning'
      }
    ];

    return cards.map(card => `
      <div class="metric-card metric-card-${card.color}">
        <div class="metric-card-header">
          <span class="metric-icon">${card.icon}</span>
          <h4>${card.title}</h4>
        </div>
        <div class="metric-value">${card.value}</div>
      </div>
    `).join('');
  }

  renderAlertList() {
    if (this.alerts.length === 0) {
      return `
        <div class="no-alerts">
          <div class="no-alerts-icon">🚨</div>
          <div class="no-alerts-message">No alerts configured yet</div>
          <div class="no-alerts-subtitle">Create your first alert to monitor economy activity</div>
        </div>
      `;
    }

    return this.alerts.map(alert => this.renderAlertItem(alert)).join('');
  }

  renderAlertItem(alert) {
    const alertType = this.alertTypes.find(t => t.value === alert.type);
    const statusIcon = alert.status === 'active' ? '✅' : '⏸️';
    const statusClass = alert.status === 'active' ? 'status-active' : 'status-inactive';

    return `
      <div class="alert-item" data-alert-id="${alert.id}">
        <div class="alert-item-header">
          <div class="alert-item-title">
            <h4>${alert.name}</h4>
            <span class="alert-status ${statusClass}">${statusIcon} ${alert.status}</span>
          </div>
          <div class="alert-item-actions" id="actions-${alert.id}">
            <!-- Actions will be rendered here -->
          </div>
        </div>
        <div class="alert-item-details">
          <div class="alert-detail">
            <strong>Type:</strong> ${alertType?.label || alert.type}
          </div>
          <div class="alert-detail">
            <strong>Threshold:</strong> ${alert.threshold}
          </div>
          <div class="alert-detail">
            <strong>Notification:</strong> ${alert.notificationMethod}
          </div>
        </div>
        <div class="alert-item-description">
          ${alertType?.description || 'Custom alert configuration'}
        </div>
      </div>
    `;
  }

  renderAlertModal() {
    return `
      <div class="modal-backdrop" id="alert-modal" style="display: none;">
        <div class="modal alert-modal">
          <div class="modal-header">
            <h3 id="modal-title">Create Alert</h3>
            <button class="modal-close" id="modal-close-btn">×</button>
          </div>
          <div class="modal-body">
            <form id="alert-form">
              <div class="form-group">
                <label for="alert-name">Alert Name</label>
                <input type="text" id="alert-name" name="name" required 
                       placeholder="Enter a descriptive name for this alert">
              </div>
              
              <div class="form-group">
                <label for="alert-type">Alert Type</label>
                <select id="alert-type" name="type" required>
                  <option value="">Select alert type...</option>
                  ${this.alertTypes.map(type => `
                    <option value="${type.value}">${type.label}</option>
                  `).join('')}
                </select>
                <div class="form-help" id="type-description"></div>
              </div>
              
              <div class="form-group">
                <label for="alert-threshold">Threshold Value</label>
                <input type="number" id="alert-threshold" name="threshold" required 
                       placeholder="Enter threshold value">
                <div class="form-help">Alerts will trigger when this threshold is exceeded</div>
              </div>
              
              <div class="form-group">
                <label for="notification-method">Notification Method</label>
                <select id="notification-method" name="notificationMethod" required>
                  <option value="">Select notification method...</option>
                  <option value="email">Email Notification</option>
                  <option value="dashboard">Dashboard Notification</option>
                  <option value="webhook">Webhook (Advanced)</option>
                </select>
              </div>
              
              <div class="form-group" id="notification-details" style="display: none;">
                <label for="notification-target">Notification Target</label>
                <input type="text" id="notification-target" name="notificationTarget" 
                       placeholder="Email address, webhook URL, etc.">
              </div>
              
              <div class="form-group">
                <label>
                  <input type="checkbox" id="alert-active" name="active" checked>
                  Enable this alert immediately
                </label>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
            <button type="submit" form="alert-form" class="btn btn-primary" id="modal-save-btn">
              Create Alert
            </button>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Create alert button
    document.getElementById('create-alert-btn')?.addEventListener('click', () => {
      this.openAlertModal();
    });

    // Modal close buttons
    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
      this.closeAlertModal();
    });

    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
      this.closeAlertModal();
    });

    // Form submission
    document.getElementById('alert-form')?.addEventListener('submit', (e) => {
      this.handleFormSubmit(e);
    });

    // Alert type change - show description
    document.getElementById('alert-type')?.addEventListener('change', (e) => {
      const selectedType = this.alertTypes.find(t => t.value === e.target.value);
      const descElement = document.getElementById('type-description');
      if (descElement && selectedType) {
        descElement.textContent = selectedType.description;
      }
    });

    // Notification method change - show additional fields
    document.getElementById('notification-method')?.addEventListener('change', (e) => {
      const detailsSection = document.getElementById('notification-details');
      const targetInput = document.getElementById('notification-target');

      if (e.target.value === 'email') {
        detailsSection.style.display = 'block';
        targetInput.placeholder = 'admin@example.com';
        targetInput.setAttribute('type', 'email');
      } else if (e.target.value === 'webhook') {
        detailsSection.style.display = 'block';
        targetInput.placeholder = 'https://your-webhook-url.com/alerts';
        targetInput.setAttribute('type', 'url');
      } else {
        detailsSection.style.display = 'none';
      }
    });

    // Alert list actions
    document.addEventListener('click', (e) => {
      if (e.target.matches('.edit-alert-btn') || e.target.closest('.edit-alert-btn')) {
        const btn = e.target.matches('.edit-alert-btn') ? e.target : e.target.closest('.edit-alert-btn');
        const alertId = btn.dataset.alertId;
        this.editAlert(alertId);
      }

      if (e.target.matches('.delete-alert-btn') || e.target.closest('.delete-alert-btn')) {
        const btn = e.target.matches('.delete-alert-btn') ? e.target : e.target.closest('.delete-alert-btn');
        const alertId = btn.dataset.alertId;
        this.deleteAlert(alertId);
      }
    });

    // Modal backdrop click to close
    document.getElementById('alert-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'alert-modal') {
        this.closeAlertModal();
      }
    });
  }

  openAlertModal(alert = null) {
    this.editingAlert = alert;
    const modal = document.getElementById('alert-modal');
    const title = document.getElementById('modal-title');
    const saveBtn = document.getElementById('modal-save-btn');

    if (alert) {
      title.textContent = 'Edit Alert';
      saveBtn.textContent = 'Update Alert';
      this.populateForm(alert);
    } else {
      title.textContent = 'Create Alert';
      saveBtn.textContent = 'Create Alert';
      document.getElementById('alert-form').reset();
    }

    modal.style.display = 'flex';
  }

  closeAlertModal() {
    const modal = document.getElementById('alert-modal');
    modal.style.display = 'none';
    this.editingAlert = null;
    document.getElementById('alert-form').reset();
  }

  populateForm(alert) {
    document.getElementById('alert-name').value = alert.name || '';
    document.getElementById('alert-type').value = alert.type || '';
    document.getElementById('alert-threshold').value = alert.threshold || '';
    document.getElementById('notification-method').value = alert.notificationMethod || '';
    document.getElementById('alert-active').checked = alert.status === 'active';

    // Trigger change events to show descriptions
    document.getElementById('alert-type').dispatchEvent(new Event('change'));
    document.getElementById('notification-method').dispatchEvent(new Event('change'));

    if (alert.notificationTarget) {
      document.getElementById('notification-target').value = alert.notificationTarget;
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const alertData = {
      name: formData.get('name'),
      type: formData.get('type'),
      threshold: parseInt(formData.get('threshold')),
      notificationMethod: formData.get('notificationMethod'),
      notificationTarget: formData.get('notificationTarget'),
      status: formData.get('active') === 'on' ? 'active' : 'inactive'
    };

    try {
      let response;

      if (this.editingAlert) {
        // Update existing alert
        response = await fetch(`/admin/api/plugins/economy/alerts/${this.editingAlert.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertData)
        });
      } else {
        // Create new alert
        response = await fetch('/admin/api/plugins/economy/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alertData)
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${this.editingAlert ? 'update' : 'create'} alert`);
      }

      const result = await response.json();

      if (result.success) {
        this.showSuccessMessage(`Alert ${this.editingAlert ? 'updated' : 'created'} successfully`);
        this.closeAlertModal();
        await this.loadAlerts();
        this.updateDisplay();
      } else {
        throw new Error(result.message || 'Operation failed');
      }

    } catch (error) {
      console.error('Error saving alert:', error);
      this.showErrorMessage(error.message || 'Failed to save alert');
    }
  }

  editAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      this.openAlertModal(alert);
    }
  }

  async deleteAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return;

    if (!confirm(`Are you sure you want to delete the alert "${alert.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/admin/api/plugins/economy/alerts/${alertId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete alert');
      }

      const result = await response.json();

      if (result.success) {
        this.showSuccessMessage(`Alert "${alert.name}" deleted successfully`);
        await this.loadAlerts();
        this.updateDisplay();
      } else {
        throw new Error(result.message || 'Delete operation failed');
      }

    } catch (error) {
      console.error('Error deleting alert:', error);
      this.showErrorMessage(error.message || 'Failed to delete alert');
    }
  }

  updateDisplay() {
    // Update overview cards
    const cardContainer = document.querySelector('.alert-overview-cards');
    if (cardContainer) {
      cardContainer.innerHTML = this.renderOverviewCards();
    }

    // Update alert list
    const listContainer = document.querySelector('.alert-list');
    if (listContainer) {
      listContainer.innerHTML = this.renderAlertList();

      // Render standardized action buttons
      this.alerts.forEach(alert => {
        const actionContainer = document.getElementById(`actions-${alert.id}`);
        if (actionContainer) {
          this.renderStandardActions(actionContainer, alert);
        }
      });
    }
  }

  renderStandardActions(container, alert) {
    const actions = [
      { id: 'edit', handler: () => this.editAlert(alert.id) },
      { id: 'delete', handler: () => this.deleteAlert(alert.id) }
    ];

    actions.forEach(config => {
      const action = window.PluginFramework?.components?.ActionRegistry?.resolve(config.id);
      const btn = document.createElement('button');
      btn.className = `action-btn ${action.className || ''}`;
      btn.textContent = action.label;
      btn.title = action.title;
      btn.onclick = (e) => {
        e.stopPropagation();
        config.handler();
      };
      container.appendChild(btn);
    });
  }

  renderError(message) {
    const container = document.getElementById('alert-config');
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

  showSuccessMessage(message) {
    if (window.EconomyPluginUI?.showNotification) {
      window.EconomyPluginUI.showNotification(message, 'success');
    } else if (window.showToast) {
      window.showToast(message, 'success');
    } else {
      console.log('Success:', message);
    }
  }

  showErrorMessage(message) {
    if (window.EconomyPluginUI?.showNotification) {
      window.EconomyPluginUI.showNotification(message, 'error');
    } else if (window.showToast) {
      window.showToast(message, 'error');
    } else {
      console.error('Error:', message);
    }
  }

  destroy() {
    if (this.eventBus) {
      // Clean up any event listeners if needed
    }

    // Remove modal from DOM if it exists
    const modal = document.getElementById('alert-modal');
    if (modal) {
      modal.remove();
    }
  }
}

// Export for use by Plugin UI Framework
window.AlertConfig = AlertConfig;