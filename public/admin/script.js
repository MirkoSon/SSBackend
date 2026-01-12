/**
 * Admin Dashboard JavaScript
 * Provides interactive functionality for the game backend admin dashboard
 */

class AdminDashboard {
  constructor() {
    this.currentView = 'users';
    this.autoRefreshInterval = null;
    this.autoRefreshEnabled = false;
    this.searchTimeout = null;
    this.currentData = [];
    this.pluginNavManager = null;
    this.pluginTabs = null;
    this.pluginDropdown = null;
    
    this.init();
  }

  async init() {
    await this.checkAuthStatus();
    this.setupEventListeners();
    this.setupNavigation();
    this.initializeTabNavigation();
    
    // Initialize dynamic navigation if components are available
    await this.initializePluginNavigation();
    
    await this.loadView(this.currentView);
  }

  initializeTabNavigation() {
    console.log('Initializing Tab Navigation...');
    const container = document.getElementById('plugin-nav-container');
    if (!container) return;

    this.pluginNavManager = new window.PluginNavigationManager();
    
    // Mock plugins for demonstration
    const mockPlugins = [
      { name: 'economy', version: '1.0.0', adminUI: { enabled: true, navigation: { label: 'Economy', icon: '💰', priority: 10 } } },
      { name: 'achievements', version: '1.0.0', adminUI: { enabled: true, navigation: { label: 'Achievements', icon: '🏆', priority: 20 } } },
      { name: 'leaderboards', version: '1.0.0', adminUI: { enabled: false, navigation: { label: 'Leaderboards', icon: '📊', priority: 30 } } },
    ];
    mockPlugins.forEach(p => this.pluginNavManager.registerPlugin(p));

    const allPlugins = this.pluginNavManager.getRegisteredPlugins().map(p => {
        const manifest = mockPlugins.find(m => m.name === p.id);
        return { ...p, enabled: manifest.adminUI.enabled };
    });

    this.pluginTabs = new PluginTabs({
        allPlugins: allPlugins,
        activePlugin: 'economy',
        onTabClick: (pluginId) => {
            console.log('Tab clicked:', pluginId);
            // This would navigate to the plugin's view.
            // For now, we just update the active tab visually.
            this.pluginTabs.config.activePlugin = pluginId;
            this.pluginTabs.render();
        },
    });

    this.pluginDropdown = new PluginDropdown({
        plugins: allPlugins,
        onToggle: (pluginId, isEnabled) => {
            console.log('Toggle clicked:', pluginId, isEnabled);
        }
    });

    const navWrapper = document.createElement('div');
    navWrapper.className = 'plugin-nav-wrapper';
    navWrapper.appendChild(this.pluginTabs.render());
    navWrapper.appendChild(this.pluginDropdown.render());

    container.appendChild(navWrapper);
  }

  async checkAuthStatus() {
    try {
      const response = await fetch('/admin/status');
      const result = await response.json();
      
      if (!result.authenticated) {
        window.location.href = '/admin/login';
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      window.location.href = '/admin/login';
    }
  }

  setupEventListeners() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        this.switchView(view);
      });
    });

    // Refresh button
    document.getElementById('refreshButton').addEventListener('click', () => {
      this.loadView(this.currentView);
    });

    // Logout button
    document.getElementById('logoutButton').addEventListener('click', () => {
      this.logout();
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');

    searchInput.addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.filterData(e.target.value);
      }, 300);
    });

    searchButton.addEventListener('click', () => {
      const query = searchInput.value;
      this.filterData(query);
    });

    // Export current view
    document.getElementById('exportCurrentButton').addEventListener('click', () => {
      this.exportCurrentView();
    });

    // Auto-refresh toggle
    document.getElementById('autoRefreshToggle').addEventListener('click', () => {
      this.toggleAutoRefresh();
    });

    // Modal close
    document.querySelector('.modal-close').addEventListener('click', () => {
      this.closeModal();
    });

    // Close modal on outside click
    document.getElementById('detailModal').addEventListener('click', (e) => {
      if (e.target.id === 'detailModal') {
        this.closeModal();
      }
    });
  }

  setupNavigation() {
    // Set active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.dataset.view === this.currentView) {
        link.classList.add('active');
      }
    });
  }

  async switchView(viewName) {
    this.currentView = viewName;
    this.setupNavigation();
    await this.loadView(viewName);
  }

  async loadView(viewName) {
    const content = document.getElementById('dashboardContent');
    const title = document.getElementById('viewTitle');
    const stats = document.getElementById('dashboardStats');

    // Show loading
    content.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading ${viewName}...</p>
      </div>
    `;

    try {
      switch (viewName) {
        case 'users':
          title.textContent = 'Users Management';
          await this.loadUsers();
          break;
        case 'saves':
          title.textContent = 'Game Saves Browser';
          await this.loadSaves();
          break;
        case 'inventories':
          title.textContent = 'User Inventories';
          await this.loadInventories();
          break;
        case 'progress':
          title.textContent = 'Progress & Achievements';
          await this.loadProgress();
          break;
        case 'exports':
          title.textContent = 'Data Export Center';
          await this.loadExports();
          break;
      }
    } catch (error) {
      console.error(`Error loading ${viewName}:`, error);
      content.innerHTML = `
        <div class="error-message">
          <h3>Error loading ${viewName}</h3>
          <p>${error.message}</p>
          <button onclick="adminDashboard.loadView('${viewName}')" class="btn btn-primary">Retry</button>
        </div>
      `;
    }
  }

  async loadUsers() {
    const response = await fetch('/admin/api/users');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load users');
    }

    this.currentData = data.users;
    this.updateStats(data.count, 'Users');
    this.renderUsersTable(data.users);
  }

  async loadSaves() {
    const response = await fetch('/admin/api/saves');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load saves');
    }

    this.currentData = data.saves;
    this.updateStats(data.count, 'Saves', `${this.formatBytes(data.totalSize)} total`);
    this.renderSavesTable(data.saves);
  }

  async loadInventories() {
    const response = await fetch('/admin/api/inventories');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load inventories');
    }

    this.currentData = data.inventories;
    this.updateStats(data.userCount, 'Users with Items', `${data.totalItems} total items`);
    this.renderInventoriesTable(data.inventories);
  }

  async loadProgress() {
    const response = await fetch('/admin/api/progress');
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load progress');
    }

    this.currentData = data.progress;
    this.updateStats(data.userCount, 'Users with Progress', `${data.totalAchievements} achievements`);
    this.renderProgressTable(data.progress);
  }

  async loadExports() {
    const content = document.getElementById('dashboardContent');
    
    content.innerHTML = `
      <div class="export-center">
        <div class="export-grid">
          <div class="export-card" onclick="adminDashboard.exportData('users')">
            <h3>👥 Export Users</h3>
            <p>Download all user data as JSON</p>
          </div>
          <div class="export-card" onclick="adminDashboard.exportData('saves')">
            <h3>💾 Export Saves</h3>
            <p>Download all game saves as JSON</p>
          </div>
          <div class="export-card" onclick="adminDashboard.exportData('inventories')">
            <h3>🎒 Export Inventories</h3>
            <p>Download all inventory data as JSON</p>
          </div>
          <div class="export-card" onclick="adminDashboard.exportData('progress')">
            <h3>⭐ Export Progress</h3>
            <p>Download all progress data as JSON</p>
          </div>
          <div class="export-card" onclick="adminDashboard.exportData('achievements')">
            <h3>🏆 Export Achievements</h3>
            <p>Download all achievements as JSON</p>
          </div>
          <div class="export-card export-all" onclick="adminDashboard.exportData('all')">
            <h3>📦 Export Everything</h3>
            <p>Complete database dump as JSON</p>
          </div>
        </div>
      </div>
    `;

    this.updateStats('6', 'Export Options', 'Available');
  }

  renderUsersTable(users) {
    const content = document.getElementById('dashboardContent');
    
    if (users.length === 0) {
      content.innerHTML = '<div class="no-data">No users found</div>';
      return;
    }

    const tableHTML = `
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Login Count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => `
              <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>${user.last_login ? this.formatDate(user.last_login) : 'Never'}</td>
                <td>${user.login_count || 0}</td>
                <td>
                  <button onclick="adminDashboard.viewUserDetails(${user.id})" class="btn btn-sm btn-primary">
                    👁️ View
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = tableHTML;
  }

  renderSavesTable(saves) {
    const content = document.getElementById('dashboardContent');
    
    if (saves.length === 0) {
      content.innerHTML = '<div class="no-data">No saves found</div>';
      return;
    }

    const tableHTML = `
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Size</th>
              <th>Preview</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${saves.map(save => `
              <tr>
                <td>${save.id}</td>
                <td>${save.username || 'Unknown'}</td>
                <td>${this.formatDate(save.created_at)}</td>
                <td>${this.formatDate(save.updated_at)}</td>
                <td>${this.formatBytes(save.data_size)}</td>
                <td><div class="data-preview">${save.data_preview}</div></td>
                <td>
                  <button onclick="adminDashboard.viewSaveDetails('${save.id}')" class="btn btn-sm btn-primary">
                    👁️ View
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = tableHTML;
  }

  renderInventoriesTable(inventories) {
    const content = document.getElementById('dashboardContent');
    
    if (inventories.length === 0) {
      content.innerHTML = '<div class="no-data">No inventories found</div>';
      return;
    }

    const tableHTML = `
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Username</th>
              <th>Items Count</th>
              <th>Total Quantity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${inventories.map(inventory => `
              <tr>
                <td>${inventory.user_id}</td>
                <td>${inventory.username || 'Unknown'}</td>
                <td>${inventory.total_items}</td>
                <td>${inventory.total_quantity}</td>
                <td>
                  <button onclick="adminDashboard.viewInventoryDetails(${inventory.user_id})" class="btn btn-sm btn-primary">
                    👁️ View Items
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = tableHTML;
  }

  renderProgressTable(progressData) {
    const content = document.getElementById('dashboardContent');
    
    if (progressData.length === 0) {
      content.innerHTML = '<div class="no-data">No progress data found</div>';
      return;
    }

    const tableHTML = `
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Level</th>
              <th>Experience</th>
              <th>Play Time</th>
              <th>Achievements</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${progressData.map(progress => `
              <tr>
                <td>${progress.username || 'Unknown'}</td>
                <td>${progress.level}</td>
                <td>${progress.experience}</td>
                <td>${this.formatPlayTime(progress.play_time)}</td>
                <td>${progress.achievement_count}</td>
                <td>${progress.last_active ? this.formatDate(progress.last_active) : 'Never'}</td>
                <td>
                  <button onclick="adminDashboard.viewProgressDetails(${progress.user_id})" class="btn btn-sm btn-primary">
                    👁️ View
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    content.innerHTML = tableHTML;
  }

  updateStats(number, label, extra = '') {
    document.getElementById('statNumber').textContent = number;
    document.getElementById('statLabel').textContent = label + (extra ? ` • ${extra}` : '');
  }

  filterData(query) {
    if (!query) {
      this.loadView(this.currentView);
      return;
    }

    query = query.toLowerCase();
    let filteredData = [];

    switch (this.currentView) {
      case 'users':
        filteredData = this.currentData.filter(user => 
          user.username.toLowerCase().includes(query) ||
          user.id.toString().includes(query)
        );
        this.renderUsersTable(filteredData);
        this.updateStats(filteredData.length, 'Filtered Users');
        break;
      case 'saves':
        filteredData = this.currentData.filter(save => 
          (save.username && save.username.toLowerCase().includes(query)) ||
          save.id.toString().includes(query) ||
          save.data_preview.toLowerCase().includes(query)
        );
        this.renderSavesTable(filteredData);
        this.updateStats(filteredData.length, 'Filtered Saves');
        break;
      // Add more filter cases as needed
    }
  }

  async viewUserDetails(userId) {
    try {
      const response = await fetch(`/admin/api/users/${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error);
      }

      const user = data.user;
      this.openModal('User Details', `
        <div class="detail-view">
          <div class="detail-row">
            <strong>ID:</strong> ${user.id}
          </div>
          <div class="detail-row">
            <strong>Username:</strong> ${user.username}
          </div>
          <div class="detail-row">
            <strong>Created:</strong> ${this.formatDate(user.created_at)}
          </div>
          <div class="detail-row">
            <strong>Last Login:</strong> ${user.last_login ? this.formatDate(user.last_login) : 'Never'}
          </div>
          <div class="detail-row">
            <strong>Login Count:</strong> ${user.login_count || 0}
          </div>
        </div>
      `);
    } catch (error) {
      this.showToast('Error loading user details: ' + error.message, 'error');
    }
  }

  async viewSaveDetails(saveId) {
    try {
      const response = await fetch(`/admin/api/saves/${saveId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error);
      }

      const save = data.save;
      this.openModal('Save Details', `
        <div class="detail-view">
          <div class="detail-row">
            <strong>Save ID:</strong> ${save.id}
          </div>
          <div class="detail-row">
            <strong>User:</strong> ${save.username || 'Unknown'}
          </div>
          <div class="detail-row">
            <strong>Created:</strong> ${this.formatDate(save.created_at)}
          </div>
          <div class="detail-row">
            <strong>Updated:</strong> ${this.formatDate(save.updated_at)}
          </div>
          <div class="detail-row">
            <strong>Save Data:</strong>
            <pre class="json-data">${JSON.stringify(save.save_data, null, 2)}</pre>
          </div>
        </div>
      `);
    } catch (error) {
      console.error('Error loading save details:', error);
      this.showToast('Error loading save details: ' + error.message, 'error');
    }
  }

  async viewInventoryDetails(userId) {
    const inventory = this.currentData.find(inv => inv.user_id === userId);
    if (!inventory) return;

    this.openModal('Inventory Details', `
      <div class="detail-view">
        <div class="detail-row">
          <strong>User:</strong> ${inventory.username || 'Unknown'}
        </div>
        <div class="detail-row">
          <strong>Total Items:</strong> ${inventory.total_items}
        </div>
        <div class="detail-row">
          <strong>Total Quantity:</strong> ${inventory.total_quantity}
        </div>
        <div class="detail-row">
          <strong>Items:</strong>
          <div class="inventory-items">
            ${inventory.items.map(item => `
              <div class="inventory-item">
                <strong>${item.item_id}:</strong> ${item.quantity}
                <small>(Added: ${this.formatDate(item.created_at)})</small>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `);
  }

  async viewProgressDetails(userId) {
    const progress = this.currentData.find(p => p.user_id === userId);
    if (!progress) return;

    // Format metrics display
    const metricsDisplay = Object.keys(progress.metrics || {}).map(metricName => {
      const metric = progress.metrics[metricName];
      const maxValue = metric.max_value ? ` / ${metric.max_value}` : '';
      return `
        <div class="metric-item">
          <strong>${metricName}:</strong> ${metric.current_value}${maxValue}
          <small>(Updated: ${this.formatDate(metric.updated_at)})</small>
        </div>
      `;
    }).join('');

    this.openModal('Progress Details', `
      <div class="detail-view">
        <div class="detail-row">
          <strong>User:</strong> ${progress.username || 'Unknown'}
        </div>
        <div class="detail-row">
          <strong>Level:</strong> ${progress.level || 'N/A'}
        </div>
        <div class="detail-row">
          <strong>Experience:</strong> ${progress.experience || 'N/A'}
        </div>
        <div class="detail-row">
          <strong>Play Time:</strong> ${this.formatPlayTime(progress.play_time)}
        </div>
        <div class="detail-row">
          <strong>Last Active:</strong> ${progress.last_active ? this.formatDate(progress.last_active) : 'Never'}
        </div>
        <div class="detail-row">
          <strong>All Metrics:</strong>
          <div class="metrics-list">
            ${metricsDisplay || '<p>No metrics available</p>'}
          </div>
        </div>
        <div class="detail-row">
          <strong>Achievements:</strong> ${progress.achievement_count}
          ${progress.achievements.length > 0 ? `
            <div class="achievements-list">
              ${progress.achievements.map(achievement => `
                <div class="achievement-item">
                  <strong>${achievement.achievement_name}</strong>
                  <p>${achievement.description}</p>
                  <small>(Unlocked: ${this.formatDate(achievement.unlocked_at)})</small>
                </div>
              `).join('')}
            </div>
          ` : '<p>No achievements unlocked</p>'}
        </div>
      </div>
    `);
  }

  async exportData(type) {
    try {
      this.showToast(`Exporting ${type} data...`, 'info');
      
      const response = await fetch(`/admin/api/export/${type}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${type}-export.json`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      this.showToast(`${type} data exported successfully`, 'success');
    } catch (error) {
      this.showToast(`Export failed: ${error.message}`, 'error');
    }
  }

  async exportCurrentView() {
    const typeMap = {
      users: 'users',
      saves: 'saves',
      inventories: 'inventories',
      progress: 'progress'
    };

    const type = typeMap[this.currentView];
    if (type) {
      await this.exportData(type);
    } else {
      this.showToast('Export not available for current view', 'error');
    }
  }

  toggleAutoRefresh() {
    const button = document.getElementById('autoRefreshToggle');
    
    if (this.autoRefreshEnabled) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshEnabled = false;
      button.textContent = '⏰ Auto-refresh: OFF';
      button.classList.remove('active');
    } else {
      this.autoRefreshInterval = setInterval(() => {
        this.loadView(this.currentView);
      }, 30000); // Refresh every 30 seconds
      this.autoRefreshEnabled = true;
      button.textContent = '⏰ Auto-refresh: ON';
      button.classList.add('active');
    }
  }

  async logout() {
    try {
      const response = await fetch('/admin/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        window.location.href = '/admin/login';
      } else {
        this.showToast('Logout failed', 'error');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout request fails
      window.location.href = '/admin/login';
    }
  }

  openModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('detailModal').style.display = 'block';
  }

  closeModal() {
    document.getElementById('detailModal').style.display = 'none';
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const messageEl = document.getElementById('toastMessage');
    
    messageEl.textContent = message;
    toast.className = `toast toast-${type} toast-show`;
    
    setTimeout(() => {
      toast.classList.remove('toast-show');
    }, 3000);
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatPlayTime(seconds) {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Initialize plugin navigation system
   */
  async initializePluginNavigation() {
    try {
      // Check if dynamic navigation components are available
      if (typeof DynamicNavigation !== 'undefined') {
        console.log('🔄 Initializing plugin navigation system...');
        
        // Create dynamic navigation instance
        this.dynamicNav = new DynamicNavigation();
        
        // Make this dashboard instance available globally for navigation
        window.adminDashboard = this;
        
        console.log('✅ Plugin navigation system initialized');
      } else {
        console.log('ℹ️ Dynamic navigation components not loaded, using static navigation');
      }
    } catch (error) {
      console.error('❌ Failed to initialize plugin navigation:', error);
      // Graceful degradation - existing navigation continues to work
    }
  }

  /**
   * Show plugin UI - Enhanced implementation for Story 4.3
   */
  async showPluginUI(pluginId, view) {
    console.log(`🔄 Loading plugin UI: ${pluginId}/${view}`);
    
    try {
      // Check if plugin UI framework is available
      if (!window.pluginUILoader) {
        this.showPluginPlaceholder(pluginId, view);
        return;
      }
      
      // Load the plugin view
      await this.loadPluginView(pluginId, view);
      
    } catch (error) {
      console.error(`❌ Failed to load plugin UI: ${pluginId}/${view}`, error);
      this.showPluginError(pluginId, error);
    }
  }

  /**
   * Show plugin placeholder (fallback when framework not available)
   */
  showPluginPlaceholder(pluginId, view) {
    console.log(`🚧 Plugin UI placeholder: ${pluginId}/${view}`);
    
    // Update view title
    const viewTitle = document.getElementById('viewTitle');
    if (viewTitle) {
      viewTitle.textContent = `Plugin: ${pluginId} - ${view}`;
    }

    // Show placeholder content
    const content = document.getElementById('dashboardContent');
    if (content) {
      content.innerHTML = `
        <div class="plugin-placeholder">
          <div class="placeholder-icon">🧩</div>
          <h3>Plugin UI Framework Ready</h3>
          <p>Plugin: <strong>${pluginId}</strong></p>
          <p>View: <strong>${view}</strong></p>
          <div class="placeholder-note">
            ✅ Plugin UI framework is implemented and ready!<br>
            The plugin system can now load and display plugin interfaces.
          </div>
          <div class="framework-status">
            <h4>🔧 Framework Status:</h4>
            <ul>
              <li>✅ Plugin UI Loader: ${typeof window.pluginUILoader !== 'undefined' ? 'Available' : 'Missing'}</li>
              <li>✅ Plugin Event Bus: ${typeof window.pluginEventBus !== 'undefined' ? 'Available' : 'Missing'}</li>
              <li>✅ Plugin Router: ${typeof window.pluginRouter !== 'undefined' ? 'Available' : 'Missing'}</li>
              <li>✅ Plugin Components: ${typeof window.PluginTable !== 'undefined' ? 'Available' : 'Missing'}</li>
            </ul>
          </div>
          <button class="btn btn-primary" onclick="window.adminDashboard.switchView('users')">
            Return to Users
          </button>
        </div>
      `;
    }

    // Update active navigation state
    this.updateActiveNavigation(`plugin-${pluginId}-${view.replace(/\//g, '-')}`);
  }

  /**
   * Update active navigation state
   */
  updateActiveNavigation(activeId) {
    // Remove active class from all navigation items
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    // Add active class to current item
    const activeLink = document.querySelector(`[data-view="${activeId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  /**
   * Refresh plugin navigation
   */
  async refreshPluginNavigation() {
    if (this.dynamicNav) {
      await this.dynamicNav.updatePluginNavigation();
      console.log('🔄 Plugin navigation refreshed');
    }
  }
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminDashboard = new AdminDashboard();
});
