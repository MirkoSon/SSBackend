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
 * Initialize Plugin Registry with available plugins from API
 */
async function initializePluginRegistry() {
  console.log('🔍 Fetching plugin UI metadata...');

  try {
    // Step 1: Fetch UI modules metadata from the new endpoint
    const uiResponse = await fetch('/admin/api/plugins/ui-modules');
    const uiData = await uiResponse.json();

    if (!uiData.success) {
      throw new Error(uiData.error || 'Failed to fetch UI modules');
    }

    // Step 2: Load each UI module dynamically
    // Use the convention: plugin 'economy' -> window.EconomyModules
    const loadPromises = uiData.plugins.map(async (plugin) => {
      if (plugin.uiModulePath) {
        try {
          console.log(`📥 Loading UI module for ${plugin.id} from ${plugin.uiModulePath}...`);
          const module = await import(plugin.uiModulePath);

          // Conventional naming for plugin modules on window
          const moduleKey = plugin.id.charAt(0).toUpperCase() + plugin.id.slice(1) + 'Modules';
          window[moduleKey] = module;

          console.log(`✅ Loaded ${moduleKey}`);
          return { id: plugin.id, loaded: true };
        } catch (err) {
          console.error(`❌ Failed to load UI module for ${plugin.id}:`, err);
          return { id: plugin.id, loaded: false, error: err.message };
        }
      }
      return { id: plugin.id, loaded: false, message: 'No module path' };
    });

    await Promise.all(loadPromises);

    // Step 3: Fetch health/status for the registry
    const response = await fetch('/health/plugins');
    const healthData = await response.json();

    window.pluginHealthStatus = healthData;
    window.availablePlugins = [];
    window.failedPlugins = [];
    window.missingPlugins = [];

    // Helper to find UI metadata
    const getUIMeta = (id) => uiData.plugins.find(p => p.id === id) || {};

    // Add active plugins
    (healthData.plugins?.active || []).forEach((pluginData) => {
      const id = typeof pluginData === 'string' ? pluginData : pluginData.name;
      const group = typeof pluginData === 'object' ? pluginData.group : null;
      const uiMeta = getUIMeta(id);
      window.availablePlugins.push({
        id,
        name: uiMeta.name || id,
        icon: uiMeta.icon || '🧩',
        enabled: true,
        status: 'active',
        displayOrder: uiMeta.priority || 100,
        description: uiMeta.description || 'Plugin',
        group: group || uiMeta.group || 'Community'
      });
    });

    // Add loaded but not active plugins (these are disabled in config)
    (healthData.plugins?.loaded || []).forEach((pluginData) => {
      const id = typeof pluginData === 'string' ? pluginData : pluginData.name;
      const group = typeof pluginData === 'object' ? pluginData.group : null;
      const uiMeta = getUIMeta(id);
      window.availablePlugins.push({
        id,
        name: uiMeta.name || id,
        icon: uiMeta.icon || '🧩',
        enabled: false, // Not active = disabled by default
        status: 'loaded',
        displayOrder: uiMeta.priority || 100,
        description: uiMeta.description || 'Plugin',
        group: group || uiMeta.group || 'Community'
      });
    });

    // Add disabled plugins
    (healthData.plugins?.disabled || []).forEach((pluginData, index) => {
      const id = typeof pluginData === 'string' ? pluginData : pluginData.name;
      const group = typeof pluginData === 'object' ? pluginData.group : null;
      const uiMeta = getUIMeta(id);
      window.availablePlugins.push({
        id,
        name: uiMeta.name || id,
        icon: uiMeta.icon || '🧩',
        enabled: false,
        status: 'disabled',
        displayOrder: uiMeta.priority || (300 + index),
        description: uiMeta.description || 'Plugin',
        group: group || uiMeta.group || 'Community'
      });
    });

    // Add failed plugins
    (healthData.plugins?.failed || []).forEach((failedPlugin, index) => {
      const id = failedPlugin.name;
      const uiMeta = getUIMeta(id);
      window.failedPlugins.push({
        id,
        name: uiMeta.name || id,
        icon: uiMeta.icon || '🧩',
        enabled: false,
        status: 'failed',
        displayOrder: uiMeta.priority || (200 + index),
        description: uiMeta.description || 'Plugin',
        error: failedPlugin.error,
        errorPhase: failedPlugin.phase,
        errorTimestamp: failedPlugin.timestamp
      });
    });

    // Add missing plugins
    (healthData.plugins?.missing || []).forEach((missingPlugin, index) => {
      const id = missingPlugin.name;
      const uiMeta = getUIMeta(id);
      window.missingPlugins.push({
        id,
        name: uiMeta.name || id,
        icon: uiMeta.icon || '🧩',
        enabled: false,
        status: 'missing',
        displayOrder: uiMeta.priority || (300 + index),
        description: uiMeta.description || 'Plugin',
        error: missingPlugin.error,
        errorTimestamp: missingPlugin.timestamp,
        config: missingPlugin.config
      });
    });

    console.log('📋 Active plugins:', window.availablePlugins.length);
    console.log('❌ Failed plugins:', window.failedPlugins.length);
    console.log('🔍 Missing plugins:', window.missingPlugins.length);

    // Show missing plugin modal queue if any missing plugins found
    if (window.missingPlugins.length > 0) {
      showMissingPluginQueue();
    }

  } catch (error) {
    console.error('Failed to fetch plugin status, using defaults:', error);
    // Fallback to hardcoded list
    window.availablePlugins = [
      { id: 'economy', name: 'Economy', icon: '💰', enabled: true, status: 'unknown', displayOrder: 1, description: 'Manage economy' },
      { id: 'achievements', name: 'Achievements', icon: '🏆', enabled: true, status: 'unknown', displayOrder: 2, description: 'Manage achievements' },
      { id: 'leaderboards', name: 'Leaderboards', icon: '📊', enabled: true, status: 'unknown', displayOrder: 3, description: 'Ranking system' }
    ];
    window.failedPlugins = [];
  }

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
 * Populate Plugin Dropdown with available and failed plugins
 */
function populatePluginDropdown() {
  const menu = document.getElementById('pluginMenu');
  if (!menu) return;

  // Clear existing items (keep header)
  const header = menu.querySelector('.plugins-dropdown-header');
  menu.innerHTML = '';
  menu.appendChild(header);

  // Show system health status
  const healthStatus = window.pluginHealthStatus;
  if (healthStatus) {
    const statusBanner = document.createElement('div');
    statusBanner.className = `plugins-status-banner ${healthStatus.status === 'ok' ? 'status-ok' : 'status-degraded'}`;
    statusBanner.innerHTML = `
      <span class="status-indicator ${healthStatus.status === 'ok' ? 'indicator-ok' : 'indicator-warning'}"></span>
      <span>System: ${healthStatus.status === 'ok' ? 'All plugins healthy' : 'Some plugins failed'}</span>
    `;
    menu.appendChild(statusBanner);
  }

  // Add grouped plugins to dropdown
  if (window.availablePlugins.length > 0) {

    // Group plugins by type
    const groups = {
      'Core': [],
      'Examples': [],
      'Community': []
    };

    window.availablePlugins.forEach(plugin => {
      const group = plugin.group || 'Community';
      if (groups[group]) {
        groups[group].push(plugin);
      }
    });

    // Render each group
    ['Core', 'Examples', 'Community'].forEach(groupName => {
      const plugins = groups[groupName];
      if (plugins.length === 0) return;

      // Add group header
      const groupHeader = document.createElement('div');
      groupHeader.className = 'plugins-dropdown-group-header';
      groupHeader.textContent = groupName.toUpperCase();
      menu.appendChild(groupHeader);

      // Add plugins in this group
      plugins.forEach(plugin => {
        // Check localStorage for actual enabled state
        const pluginState = getPluginState(plugin.id);
        const isEnabled = pluginState !== null ? pluginState : plugin.enabled;

        const item = document.createElement('div');
        item.className = 'plugins-dropdown-item';
        item.innerHTML = `
          <div class="plugin-info">
            <span>${plugin.icon}</span>
            <span class="plugin-name">${plugin.name}</span>
            <span class="plugin-status-badge status-${plugin.status || 'active'}">
              ${plugin.status === 'active' ? '✓' : plugin.status === 'disabled' ? '○' : '?'}
            </span>
          </div>
          <div class="toggle-switch ${isEnabled ? 'active' : ''}"
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
    });
  }

  // Add failed plugins section if any
  if (window.failedPlugins && window.failedPlugins.length > 0) {
    const failedSection = document.createElement('div');
    failedSection.className = 'plugins-section plugins-section-failed';
    failedSection.innerHTML = '<div class="plugins-section-title plugins-section-title-failed">⚠️ Failed Plugins</div>';
    menu.appendChild(failedSection);

    window.failedPlugins.forEach(plugin => {
      const item = document.createElement('div');
      item.className = 'plugins-dropdown-item plugins-dropdown-item-failed';
      item.innerHTML = `
        <div class="plugin-info plugin-info-failed">
          <span>${plugin.icon}</span>
          <span class="plugin-name">${plugin.name}</span>
          <span class="plugin-status-badge status-failed">✗</span>
        </div>
        <button class="btn-plugin-error-info" data-plugin-id="${plugin.id}" title="View error details">ℹ️</button>
      `;

      // Add error details tooltip/modal
      const infoBtn = item.querySelector('.btn-plugin-error-info');
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showPluginErrorDetails(plugin);
      });

      menu.appendChild(item);
    });
  }
}

/**
 * Show plugin error details in a modal
 */
function showPluginErrorDetails(plugin) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const timestamp = plugin.errorTimestamp ? new Date(plugin.errorTimestamp).toLocaleString() : 'Unknown';

  overlay.innerHTML = `
    <div class="modal-container" style="max-width: 600px;">
      <div class="modal-header" style="background: var(--color-error, #dc3545); color: white;">
        <h3>⚠️ Plugin Error: ${plugin.name}</h3>
        <button class="btn-close" style="color: white;">&times;</button>
      </div>
      <div class="modal-body">
        <div class="error-details">
          <div class="error-detail-row">
            <strong>Plugin:</strong> ${plugin.name} (${plugin.id})
          </div>
          <div class="error-detail-row">
            <strong>Status:</strong> <span class="status-badge status-failed">Failed</span>
          </div>
          <div class="error-detail-row">
            <strong>Failed Phase:</strong> ${plugin.errorPhase || 'Unknown'}
          </div>
          <div class="error-detail-row">
            <strong>Timestamp:</strong> ${timestamp}
          </div>
          <div class="error-detail-row">
            <strong>Error Message:</strong>
            <pre class="error-message-box">${plugin.error || 'No error message available'}</pre>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-close-modal">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Bind close events
  const close = () => document.body.removeChild(overlay);
  overlay.querySelectorAll('.btn-close, .btn-close-modal').forEach(btn => btn.onclick = close);
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

/**
 * Toggle plugin enabled state (from dropdown)
 */
function togglePlugin(pluginId) {
  const plugin = window.availablePlugins.find(p => p.id === pluginId);
  if (!plugin) return;

  // Toggle state
  plugin.enabled = !plugin.enabled;

  // Save to localStorage
  setPluginState(pluginId, plugin.enabled);

  console.log(`Plugin ${pluginId} ${plugin.enabled ? 'enabled' : 'disabled'}`);

  // Update UI
  populatePluginDropdown();
  setupPluginTabs();

  // Show toast
  showToast(`Plugin "${plugin.name}" ${plugin.enabled ? 'enabled' : 'disabled'}`, plugin.enabled ? 'success' : 'info');
}

/**
 * Setup Plugin Tabs (Horizontal Tab Bar)
 */
function setupPluginTabs() {
  const container = document.getElementById('plugin-tabs-container');
  if (!container) {
    console.error('Plugin tabs container not found');
    return;
  }

  // Clear existing tabs
  container.innerHTML = '';

  // Get all plugins and filter by enabled state (from localStorage or default)
  const enabledPlugins = window.availablePlugins.filter(plugin => {
    const pluginState = getPluginState(plugin.id);
    return pluginState !== null ? pluginState : plugin.enabled;
  });

  // Get custom order from localStorage or use default sort
  const customOrder = getPluginOrder();
  if (customOrder && customOrder.length > 0) {
    // Sort by custom order
    enabledPlugins.sort((a, b) => {
      const indexA = customOrder.indexOf(a.id);
      const indexB = customOrder.indexOf(b.id);
      // If not in custom order, put at end sorted by displayOrder
      if (indexA === -1 && indexB === -1) return a.displayOrder - b.displayOrder;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  } else {
    // Sort by display order
    enabledPlugins.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  // Create tabs for enabled plugins only
  enabledPlugins.forEach(plugin => {
    const tab = createPluginTab(plugin);
    container.appendChild(tab);
  });

  console.log('📑 Plugin tabs created:', enabledPlugins.length);
}

/**
 * Create a plugin tab element with drag-and-drop support
 */
function createPluginTab(plugin) {
  const tab = document.createElement('div');
  tab.className = 'plugin-tab';
  tab.dataset.pluginId = plugin.id;
  tab.draggable = true;

  // Check if plugin is enabled in localStorage
  const pluginState = getPluginState(plugin.id);
  const isEnabled = pluginState !== null ? pluginState : plugin.enabled;

  if (!isEnabled) {
    tab.classList.add('plugin-tab--disabled');
  }

  tab.innerHTML = `
    <span class="plugin-tab__icon">${plugin.icon}</span>
    <span class="plugin-tab__title">${plugin.name}</span>
  `;

  // Handle tab click
  tab.addEventListener('click', (e) => {
    if (isEnabled) {
      activatePlugin(plugin.id);
    } else {
      showToast(`Plugin "${plugin.name}" is disabled. Enable it from the dropdown menu.`, 'info');
    }
  });

  // Drag and drop handlers
  tab.addEventListener('dragstart', handleDragStart);
  tab.addEventListener('dragover', handleDragOver);
  tab.addEventListener('drop', handleDrop);
  tab.addEventListener('dragend', handleDragEnd);

  return tab;
}

/**
 * Get plugin enabled state from localStorage
 */
function getPluginState(pluginId) {
  const state = localStorage.getItem(`plugin_${pluginId}_enabled`);
  return state !== null ? state === 'true' : null;
}

/**
 * Set plugin enabled state in localStorage
 */
function setPluginState(pluginId, enabled) {
  localStorage.setItem(`plugin_${pluginId}_enabled`, enabled.toString());
}

/**
 * Get plugin order from localStorage
 */
function getPluginOrder() {
  const order = localStorage.getItem('plugin_tab_order');
  return order ? JSON.parse(order) : null;
}

/**
 * Set plugin order in localStorage
 */
function setPluginOrder(order) {
  localStorage.setItem('plugin_tab_order', JSON.stringify(order));
}

// Drag and drop state
let draggedElement = null;

/**
 * Handle drag start
 */
function handleDragStart(e) {
  draggedElement = e.currentTarget;
  e.currentTarget.style.opacity = '0.4';
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

/**
 * Handle drag over
 */
function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';

  const target = e.currentTarget;
  if (draggedElement !== target) {
    const container = target.parentNode;
    const allTabs = Array.from(container.children);
    const draggedIndex = allTabs.indexOf(draggedElement);
    const targetIndex = allTabs.indexOf(target);

    if (draggedIndex < targetIndex) {
      target.parentNode.insertBefore(draggedElement, target.nextSibling);
    } else {
      target.parentNode.insertBefore(draggedElement, target);
    }
  }

  return false;
}

/**
 * Handle drop
 */
function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  return false;
}

/**
 * Handle drag end
 */
function handleDragEnd(e) {
  e.currentTarget.style.opacity = '1';

  // Save new order to localStorage
  const container = document.getElementById('plugin-tabs-container');
  const tabs = Array.from(container.children);
  const newOrder = tabs.map(tab => tab.dataset.pluginId);
  setPluginOrder(newOrder);

  console.log('📋 Plugin order saved:', newOrder);
}

/**
 * Toggle plugin enabled state
 */
function togglePluginState(pluginId, tabElement) {
  const currentState = getPluginState(pluginId);
  const plugin = window.availablePlugins.find(p => p.id === pluginId);
  const newState = currentState !== null ? !currentState : !plugin.enabled;

  setPluginState(pluginId, newState);

  // Update UI
  const toggleBtn = tabElement.querySelector('.plugin-tab__toggle');
  if (newState) {
    tabElement.classList.remove('plugin-tab--disabled');
    toggleBtn.textContent = '👁️';
    toggleBtn.title = 'Disable plugin';
    showToast(`Plugin "${plugin.name}" enabled`, 'success');
  } else {
    tabElement.classList.add('plugin-tab--disabled');
    toggleBtn.textContent = '🔒';
    toggleBtn.title = 'Enable plugin';
    showToast(`Plugin "${plugin.name}" disabled`, 'info');

    // If this plugin is currently active, switch to dashboard
    if (window.activePluginId === pluginId) {
      showCoreDashboard();
    }
  }
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast--show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('toast--show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Hide core dashboard
  const coreDashboard = document.getElementById('core-dashboard-content');
  if (coreDashboard) {
    coreDashboard.style.display = 'none';
  }

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
  let container = document.getElementById(`${pluginId}-plugin-container`);
  if (!container) {
    console.log(`🏗️ Creating dynamic container for plugin: ${pluginId}`);
    container = document.createElement('div');
    container.id = `${pluginId}-plugin-container`;
    container.className = 'plugin-view';
    container.style.display = 'none';

    const pluginContentArea = document.getElementById('plugin-content-area');
    if (pluginContentArea) {
      pluginContentArea.appendChild(container);
    } else {
      console.error('❌ plugin-content-area not found! Cannot create container.');
      return;
    }
  }
  // Hide all plugin containers to prevent stacking
  const allPluginContainers = document.querySelectorAll('.plugin-view');
  allPluginContainers.forEach(c => c.style.display = 'none');

  // Show this plugin's container
  container.style.display = 'block';

  // Generic Plugin Loading Logic
  // Convention: plugin 'economy' -> EconomyModules.PluginView
  const moduleKey = pluginId.charAt(0).toUpperCase() + pluginId.slice(1) + 'Modules';
  const modules = window[moduleKey];

  if (modules && modules.PluginView) {
    try {
      console.log(`🏗️ Initializing UI for ${pluginId} using ${moduleKey}.PluginView...`);
      container.innerHTML = '';
      const view = new modules.PluginView(container);
      if (view.render) {
        await view.render();
      }
      console.log(`✅ ${pluginId} UI rendered successfully`);
    } catch (err) {
      console.error(`❌ Error rendering ${pluginId} UI:`, err);
      container.innerHTML = `<div class="error-message"><p>Error rendering plugin: ${err.message}</p></div>`;
    }
    return;
  }

  // No fallback needed anymore as all core plugins use PluginView pattern
  console.warn(`⚠️ No generic PluginView found for ${pluginId}.`);
  container.innerHTML = `<div class="info-message"><p>Plugin ${pluginId} loaded but has no dynamic UI components recognized.</p></div>`;
}

/**
 * Show Missing Plugin Queue - Process missing plugins one at a time
 */
function showMissingPluginQueue() {
  if (!window.missingPlugins || window.missingPlugins.length === 0) {
    return;
  }

  // Create a copy of the queue
  const queue = [...window.missingPlugins];
  let currentIndex = 0;

  function showNextModal() {
    if (currentIndex >= queue.length) {
      console.log('✅ All missing plugins processed');
      return;
    }

    const plugin = queue[currentIndex];
    showMissingPluginModal(plugin, () => {
      currentIndex++;
      showNextModal();
    });
  }

  showNextModal();
}

/**
 * Show Missing Plugin Modal
 */
function showMissingPluginModal(plugin, onComplete) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h2>⚠️ Plugin Not Found</h2>
      </div>
      <div class="modal-body">
        <p>The plugin <strong>${plugin.name}</strong> (ID: <code>${plugin.id}</code>) was previously installed but is no longer found in the filesystem.</p>
        <p class="error-message" style="font-size: 0.9em; margin-top: 1em;">${plugin.error}</p>
        <p style="margin-top: 1.5em;">What would you like to do?</p>
      </div>
      <div class="modal-footer" style="display: flex; gap: 1em; justify-content: flex-end;">
        <button class="btn btn-secondary" id="deactivate-plugin-btn">
          🔇 Deactivate
        </button>
        <button class="btn btn-danger" id="delete-plugin-btn">
          🗑️ Delete
        </button>
        <button class="btn btn-primary" id="cancel-modal-btn">
          Cancel
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeAndProceed = () => {
    modal.remove();
    if (onComplete) onComplete();
  };

  // Handle Delete
  modal.querySelector('#delete-plugin-btn').addEventListener('click', async () => {
    try {
      const response = await fetch(`/admin/api/plugins/${plugin.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.success) {
        console.log(`✅ Plugin ${plugin.id} purged successfully`);
        closeAndProceed();
        // Reload plugin registry after all modals are processed
      } else {
        alert(`Failed to delete plugin: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting plugin:', error);
      alert('Failed to delete plugin. Check console for details.');
    }
  });

  // Handle Deactivate
  modal.querySelector('#deactivate-plugin-btn').addEventListener('click', async () => {
    try {
      const response = await fetch(`/admin/api/plugins/${plugin.id}/suppress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.success) {
        console.log(`✅ Plugin ${plugin.id} suppressed successfully`);
        closeAndProceed();
        // Reload plugin registry after all modals are processed
      } else {
        alert(`Failed to deactivate plugin: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deactivating plugin:', error);
      alert('Failed to deactivate plugin. Check console for details.');
    }
  });

  // Handle Cancel
  modal.querySelector('#cancel-modal-btn').addEventListener('click', () => {
    closeAndProceed();
  });

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeAndProceed();
    }
  });
}

/**
 * Show Core Dashboard (hide all plugin UIs)
 */
function showCoreDashboard() {
  window.activePluginId = null;

  // Clear active tabs
  const tabs = document.querySelectorAll('.plugin-tab');
  tabs.forEach(tab => tab.classList.remove('active'));

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
