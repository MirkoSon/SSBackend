/**
 * Admin Dashboard Integration (Story 4.2 Completion with Epic 6)
 * Integrates Epic 6 Plugin Navigation components into admin dashboard
 */

console.log('🔧 Admin Dashboard Integration - Loading...');

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📦 Initializing Plugin Framework Integration...');

  // Step 1: Initialize Plugin Registry
  await initializePluginRegistry();

  // Step 2: Setup Plugin Dropdown
  setupPluginDropdown();

  // Step 3: Setup Plugin Tabs
  setupPluginTabs();

  // Step 4: Setup Navigation Event Handlers
  setupNavigation();

  console.log('✅ Admin Dashboard Integration Complete');
});

/**
 * Initialize Plugin Registry with available plugins
 */
async function initializePluginRegistry() {
  // For now, hardcode economy plugin
  // In future, this will query the plugin API
  window.availablePlugins = [
    {
      id: 'economy',
      name: 'Economy',
      icon: '💰',
      enabled: true,
      displayOrder: 1,
      description: 'Manage virtual economy, balances, and transactions'
    }
    // Future plugins will be added here dynamically
  ];

  console.log('📋 Plugins registered:', window.availablePlugins);
}

/**
 * Setup Plugin Dropdown Menu
 */
function setupPluginDropdown() {
  const trigger = document.getElementById('pluginMenuTrigger');
  const menu = document.getElementById('pluginMenu');

  if (!trigger || !menu) {
    console.error('Plugin dropdown elements not found');
    return;
  }

  // Toggle dropdown on click
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = menu.style.display === 'block';
    menu.style.display = isVisible ? 'none' : 'block';
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    menu.style.display = 'none';
  });

  // Populate dropdown with plugins
  populatePluginDropdown();
}
/**
 * Populate Plugin Dropdown with available plugins
 */
function populatePluginDropdown() {
  const menu = document.getElementById('pluginMenu');
  if (!menu) return;

  // Clear existing items (keep header)
  const header = menu.querySelector('.plugins-dropdown-header');
  menu.innerHTML = '';
  menu.appendChild(header);

  // Add plugin items
  window.availablePlugins.forEach(plugin => {
    const item = document.createElement('div');
    item.className = 'plugins-dropdown-item';
    item.innerHTML = `
      <div class="plugin-info">
        <span>${plugin.icon}</span>
        <span class="plugin-name">${plugin.name}</span>
      </div>
      <div class="toggle-switch ${plugin.enabled ? 'active' : ''}" 
           data-plugin-id="${plugin.id}">
      </div>
    `;

    // Handle toggle click
    const toggle = item.querySelector('.toggle-switch');
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePlugin(plugin.id);
    });

    menu.appendChild(item);
  });
}

/**
 * Toggle plugin enabled state
 */
function togglePlugin(pluginId) {
  const plugin = window.availablePlugins.find(p => p.id === pluginId);
  if (!plugin) return;

  plugin.enabled = !plugin.enabled;
  console.log(`Plugin ${pluginId} ${plugin.enabled ? 'enabled' : 'disabled'}`);

  // Update UI
  populatePluginDropdown();
  setupPluginTabs();
}

/**
 * Setup Plugin Tabs
 */
function setupPluginTabs() {
  const container = document.getElementById('plugin-tabs-container');
  if (!container) {
    console.error('Plugin tabs container not found');
    return;
  }

  // Clear existing tabs
  container.innerHTML = '';

  // Get enabled plugins
  const enabledPlugins = window.availablePlugins
    .filter(p => p.enabled)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // Create tabs
  enabledPlugins.forEach(plugin => {
    const tab = createPluginTab(plugin);
    container.appendChild(tab);
  });

  console.log('📑 Plugin tabs created:', enabledPlugins.length);
}
/**
 * Create a plugin tab element
 */
function createPluginTab(plugin) {
  const tab = document.createElement('div');
  tab.className = 'plugin-tab';
  tab.dataset.pluginId = plugin.id;

  tab.innerHTML = `
    <span class="plugin-tab__icon">${plugin.icon}</span>
    <span class="plugin-tab__title">${plugin.name}</span>
    <span class="plugin-tab__close">×</span>
  `;

  // Handle tab click
  tab.addEventListener('click', (e) => {
    if (!e.target.classList.contains('plugin-tab__close')) {
      activatePlugin(plugin.id);
    }
  });

  // Handle close button
  const closeBtn = tab.querySelector('.plugin-tab__close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closePluginTab(plugin.id);
  });

  return tab;
}

/**
 * Close a plugin tab (hide it, don't disable the plugin)
 */
function closePluginTab(pluginId) {
  const plugin = window.availablePlugins.find(p => p.id === pluginId);
  if (!plugin) return;

  // For now, just hide the tab (in future, use localStorage)
  plugin.tabOpen = false;
  setupPluginTabs();

  // If this was the active plugin, switch to core dashboard
  if (window.activePluginId === pluginId) {
    showCoreDashboard();
  }
}

/**
 * Setup Navigation Event Handlers
 */
function setupNavigation() {
  // Top nav links (core features)
  const topNavLinks = document.querySelectorAll('.top-nav__link');
  topNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = e.currentTarget.dataset.view;
      if (view) {
        showCoreDashboard();
        // Existing dashboard script will handle the view switch
        if (window.adminDashboard) {
          window.adminDashboard.loadView(view);
        }
      }
    });
  });
}

/**
 * Activate a plugin (show its UI)
 */
async function activatePlugin(pluginId) {
  console.log('🔄 Activating plugin:', pluginId);

  // Update active plugin state
  window.activePluginId = pluginId;

  // Update tab UI
  const tabs = document.querySelectorAll('.plugin-tab');
  tabs.forEach(tab => {
    if (tab.dataset.pluginId === pluginId) {
      tab.classList.add('plugin-tab--active');
    } else {
      tab.classList.remove('plugin-tab--active');
    }
  });

  // Hide core dashboard
  const coreDashboard = document.getElementById('core-dashboard-content');
  if (coreDashboard) coreDashboard.style.display = 'none';

  // Show plugin content area
  const pluginArea = document.getElementById('plugin-content-area');
  if (pluginArea) pluginArea.style.display = 'block';

  // Load specific plugin UI
  await loadPluginUI(pluginId);
}
/**
 * Load Plugin UI into its container
 */
async function loadPluginUI(pluginId) {
  const container = document.getElementById(`${pluginId}-plugin-container`);
  if (!container) {
    console.error(`Container for plugin ${pluginId} not found`);
    return;
  }

  // Hide all plugin containers
  const allPluginContainers = document.querySelectorAll('.plugin-view');
  allPluginContainers.forEach(c => c.style.display = 'none');

  // Show this plugin's container
  container.style.display = 'block';

  // Plugin-specific loading logic
  if (pluginId === 'economy') {
    await loadEconomyPlugin(container);
  }

  // Future plugins will have their own loaders
}

/**
 * Load Economy Plugin UI
 */
async function loadEconomyPlugin(container) {
  try {
    // Wait for Economy modules to be available
    if (!window.EconomyModules) {
      console.log('⏳ Waiting for Economy modules to load...');
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (window.EconomyModules) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });
    }

    if (!window.EconomyModules) {
      throw new Error('Economy modules failed to load within timeout');
    }

    console.log('✅ Economy modules available');

    // Clear loading spinner
    container.innerHTML = '';

    // Initialize Economy plugin with simpler approach
    const { BalanceManagerView, EconomyAPI } = window.EconomyModules;

    // Create a robust controller object that BalanceManagerView expects
    const simpleController = {
      users: [],
      filteredUsers: [],
      currencies: [],
      view: null,

      // Data Access Methods
      getCurrencies: () => simpleController.currencies,
      getTotalUsers: () => simpleController.filteredUsers.length,

      getPaginatedUsers: (page, pageSize) => {
        const start = (page - 1) * pageSize;
        return simpleController.filteredUsers.slice(start, start + pageSize);
      },

      // Filter & Search Methods
      handleSearch: (query) => {
        const q = query.toLowerCase();
        simpleController.filteredUsers = simpleController.users.filter(u =>
          u.username.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          u.id.toString().includes(q)
        );
        if (simpleController.view) {
          simpleController.view.currentPage = 1;
          simpleController.view.updateTable();
        }
      },

      handleCurrencyFilter: (currencyCode) => {
        // Reset to full list first
        simpleController.filteredUsers = [...simpleController.users];

        // Apply currency filter if selected
        if (currencyCode) {
          simpleController.filteredUsers = simpleController.filteredUsers.filter(u =>
            u.balances && u.balances[currencyCode] !== undefined
          );
        }

        if (simpleController.view) {
          simpleController.view.currentPage = 1;
          simpleController.view.updateTable();
        }
      },

      handleStatusFilter: (status) => {
        // Mock implementation - users don't have status yet
        console.log('Status filter not fully implemented:', status);
      },

      handleSort: (field, direction) => {
        simpleController.filteredUsers.sort((a, b) => {
          let valA = a[field];
          let valB = b[field];

          // Handle undefined/null
          if (valA == null) valA = '';
          if (valB == null) valB = '';

          // Case insensitive string sort
          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();

          if (valA < valB) return direction === 'asc' ? -1 : 1;
          if (valA > valB) return direction === 'asc' ? 1 : -1;
          return 0;
        });
        if (simpleController.view) simpleController.view.updateTable();
      },

      // Actions
      refreshData: async () => {
        await loadEconomyPlugin(container);
      },

      exportData: () => {
        alert('Export feature coming soon!');
      },

      handleRowSelect: (row) => {
        console.log('Row selected:', row);
      },

      showTransactionHistory: (userId) => {
        console.log('Show transaction history for user:', userId);
        alert('Transaction history feature coming soon!');
      },

      showBalanceModal: (userId) => {
        const user = simpleController.users.find(u => u.id === userId);
        if (!user) return;

        // Ensure user has balances object
        const balances = user.balances || {};

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        // Modal HTML - constructing the form
        // We use innerHTML for simplicity in this integration script
        overlay.innerHTML = `
          <div class="modal-container">
            <div class="modal-header">
              <h3 class="modal-title">Adjust Balance: <span style="color: var(--color-primary)">${user.username}</span></h3>
              <button class="modal-close" type="button">&times;</button>
            </div>
            <div class="modal-body">
              <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--color-background-tertiary); border-radius: var(--border-radius);">
                <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--color-text-secondary);">Current Balances</h4>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                  ${Object.entries(balances).length ?
            Object.entries(balances).map(([curr, amt]) =>
              `<span class="status-badge status-active">${curr}: ${amt}</span>`
            ).join('') :
            '<span style="font-style: italic; color: var(--color-text-secondary)">No active balances</span>'
          }
                </div>
              </div>

              <form id="balance-form">
                <div class="form-group">
                  <label class="form-label">Currency</label>
                  <select name="currency" class="form-control form-select" required>
                    ${simpleController.currencies.map(c =>
            `<option value="${c.id}">${c.name} (${c.symbol || c.code})</option>`
          ).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Action</label>
                  <select name="adjustmentType" class="form-control form-select" required>
                    <option value="add">Add (+)</option>
                    <option value="subtract">Subtract (-)</option>
                    <option value="set">Set (=)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Amount</label>
                  <input type="number" name="amount" class="form-control" min="0" step="1" required placeholder="Enter amount">
                </div>
                <div class="form-group">
                  <label class="form-label">Reason</label>
                  <input type="text" name="reason" class="form-control" required placeholder="e.g. Admin adjustment, Bonus">
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
              <button type="submit" form="balance-form" class="btn btn-primary">Save Changes</button>
            </div>
          </div>
        `;

        document.body.appendChild(overlay);

        // Event Handlers
        const close = () => {
          if (overlay.parentNode) {
            document.body.removeChild(overlay);
          }
        };

        const closeBtn = overlay.querySelector('.modal-close');
        const cancelBtn = overlay.querySelector('.modal-cancel');

        closeBtn.onclick = close;
        cancelBtn.onclick = close;

        // Close on outside click
        overlay.onclick = (e) => {
          if (e.target === overlay) close();
        };

        // Form Submission
        const form = overlay.querySelector('#balance-form');
        form.onsubmit = async (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const data = {
            currency: formData.get('currency'),
            adjustmentType: formData.get('adjustmentType'),
            amount: parseInt(formData.get('amount')),
            reason: formData.get('reason')
          };

          try {
            const submitBtn = overlay.querySelector('button[type="submit"]');
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.textContent = 'Saving...';
            }

            const res = await fetch(`/admin/api/plugins/economy/balances/${userId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });

            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Failed to update balance');
            }

            const result = await res.json();
            alert('Balance updated successfully!');
            close();

            // Reload the plugin to refresh data
            loadEconomyPlugin(container);

          } catch (error) {
            console.error('Error updating balance:', error);
            alert('Error: ' + error.message);
            const submitBtn = overlay.querySelector('button[type="submit"]');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Save Changes';
            }
          }
        };
      }
    };

    // Fetch data using the fixed Economy API endpoint that includes balances for ALL users
    const [balancesResponse, currenciesResponse] = await Promise.all([
      fetch(`/admin/api/plugins/economy/balances?limit=1000&_t=${Date.now()}`).then(r => r.json()),
      fetch('/admin/api/plugins/economy/currencies').then(r => r.json())
    ]);

    // Map the response to the expected structure
    // The API now returns { balances: [users...] } because 'balanceRoutes.js' maps 'users' from service to 'balances' in response
    // Wait, let's verify what balanceRoutes.js returns.
    // In Step 123 (balanceRoutes.js), it returns: { balances: balances.users, ... }
    // So 'balancesResponse.balances' IS the array of users.
    const mappedUsers = (balancesResponse.balances || []).map(u => ({
      ...u,
      // Ensure keys match what View expects
      id: u.user_id || u.id,
      // Calculate status from last_login (Active if < 30 days)
      status: u.status || (u.last_login && (Date.now() - new Date(u.last_login).getTime() < 30 * 24 * 60 * 60 * 1000) ? 'active' : 'inactive') || 'inactive',
      // Ensure balances object exists
      balances: u.balances || {},
      // Ensure dates exist
      last_updated: u.updated_at || u.last_login || new Date().toISOString(),
      email: u.email || 'N/A'
    }));

    simpleController.users = mappedUsers;
    simpleController.filteredUsers = [...mappedUsers];
    simpleController.currencies = currenciesResponse.currencies || currenciesResponse;

    // Render the view
    const view = new BalanceManagerView(container, simpleController);
    simpleController.view = view; // Link view to controller
    view.render();

    console.log('✅ Economy Plugin UI loaded successfully with User data');
  } catch (error) {
    console.error('❌ Failed to load Economy plugin:', error);
    container.innerHTML = `
      <div class="error-message">
        <h3>Failed to load Economy Plugin</h3>
        <p>${error.message}</p>
        <button onclick="location.reload()" class="btn btn-primary">Reload Page</button>
      </div>
    `;
  }
}

/**
 * Show Core Dashboard (hide all plugin UIs)
 */
function showCoreDashboard() {
  window.activePluginId = null;

  // Clear active tabs
  const tabs = document.querySelectorAll('.plugin-tab');
  tabs.forEach(tab => tab.classList.remove('plugin-tab--active'));

  // Show core dashboard
  const coreDashboard = document.getElementById('core-dashboard-content');
  if (coreDashboard) coreDashboard.style.display = 'block';

  // Hide plugin area
  const pluginArea = document.getElementById('plugin-content-area');
  if (pluginArea) pluginArea.style.display = 'none';

  console.log('📊 Core dashboard activated');
}

// Make functions globally available for debugging
window.pluginFramework = {
  activatePlugin,
  showCoreDashboard,
  togglePlugin,
  availablePlugins: () => window.availablePlugins
};

console.log('✅ Admin Dashboard Integration loaded');
