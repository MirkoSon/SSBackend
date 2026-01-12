/**
 * Quick Plugin Integration Fix
 * This bridges the gap between the tab navigation and the actual plugin UI components
 */

// Wait for DOM and modules to load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🔧 Quick Plugin Fix - Initializing...');
  
  // Create plugin content containers
  const mainContent = document.getElementById('dashboardContent');
  if (!mainContent) {
    console.error('Main content area not found');
    return;
  }

  // Hide the main content initially
  const originalContent = mainContent.cloneNode(true);
  
  // Create container for economy plugin
  const economyContainer = document.createElement('div');
  economyContainer.id = 'economy-plugin-container';
  economyContainer.style.display = 'none';
  economyContainer.innerHTML = `
    <div id="balance-manager-container" class="plugin-content">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>Loading Economy Plugin...</p>
      </div>
    </div>
  `;
  mainContent.parentNode.insertBefore(economyContainer, mainContent);

  // Function to show plugin UI
  window.showPluginUI = async (pluginId) => {
    console.log('📦 Loading plugin:', pluginId);
    
    // Hide all content
    mainContent.style.display = 'none';
    economyContainer.style.display = 'none';
    
    if (pluginId === 'economy') {
      economyContainer.style.display = 'block';
      
      // Wait for economy modules to be available
      if (window.EconomyModules) {
        try {
          const container = document.getElementById('balance-manager-container');
          container.innerHTML = ''; // Clear loading spinner
          
          // Check what's actually available in EconomyModules
          console.log('Available Economy Modules:', Object.keys(window.EconomyModules));
          
          // Try to initialize Balance Manager using available modules
          const { BalanceManagerController, EconomyAPI } = window.EconomyModules;
          
          if (!BalanceManagerController || !EconomyAPI) {
            throw new Error('Required modules not found in EconomyModules');
          }
          
          const api = new EconomyAPI();
          const [users, currencies] = await Promise.all([
            api.getUsers(),
            api.getCurrencies()
          ]);

          const controller = new BalanceManagerController({ users, currencies });
          
          // Check if BalanceManagerView is available
          if (window.EconomyModules.BalanceManagerView) {
            const view = new window.EconomyModules.BalanceManagerView(container, controller);
            view.render();
          } else {
            // Fallback: create a simple display
            container.innerHTML = `
              <div class="card">
                <div class="card-header">
                  <h2>Balance Manager</h2>
                  <p>Users: ${users.length}, Currencies: ${currencies.length}</p>
                </div>
                <div class="card-body">
                  <p class="info-message">Balance Manager components loaded successfully!</p>
                  <p><small>Note: Full UI coming in next story.</small></p>
                </div>
              </div>
            `;
          }
          
          console.log('✅ Balance Manager initialized');
        } catch (error) {
          console.error('❌ Failed to initialize Balance Manager:', error);
          economyContainer.innerHTML = `
            <div class="error-message">
              <h3>Failed to load Economy Plugin</h3>
              <p>${error.message}</p>
              <button onclick="location.reload()" class="btn btn-primary">Reload Page</button>
            </div>
          `;
        }
      } else {
        console.error('Economy modules not loaded yet');
        setTimeout(() => window.showPluginUI('economy'), 500);
      }
    } else {
      // Show standard dashboard
      mainContent.style.display = 'block';
    }
  };

  // Override tab click handler
  setTimeout(() => {
    if (window.adminDashboard && window.adminDashboard.pluginTabs) {
      const originalConfig = window.adminDashboard.pluginTabs.config;
      window.adminDashboard.pluginTabs.config = {
        ...originalConfig,
        onTabClick: (pluginId) => {
          console.log('🔄 Tab clicked (fixed handler):', pluginId);
          originalConfig.activePlugin = pluginId;
          window.adminDashboard.pluginTabs.render();
          window.showPluginUI(pluginId);
        }
      };
      
      // Trigger economy tab on page load
      window.showPluginUI('economy');
    }
  }, 1000);

  console.log('✅ Quick Plugin Fix initialized');
});
