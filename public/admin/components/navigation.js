/**
 * Dynamic Navigation Component for Admin Dashboard
 * Extends existing navigation with plugin support following Epic 4 architecture
 */
class DynamicNavigation {
  constructor() {
    this.coreNavItems = [];
    this.pluginNavItems = [];
    this.navigationState = {
      collapsed: {},
      searchTerm: '',
      searchEnabled: true, // Enable search by default
      initialized: false
    };
    
    this.init();
  }

  /**
   * Initialize dynamic navigation system
   */
  async init() {
    try {
      console.log('🔄 Initializing Dynamic Navigation...');
      
      // Extract and preserve existing navigation
      this.coreNavItems = this.extractExistingNav();
      
      // Load navigation state from localStorage
      this.loadNavigationState();
      
      // Initialize plugin navigation
      await this.loadPluginNavigation();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initial render
      this.render();
      
      console.log('✅ Dynamic Navigation initialized successfully');
      this.navigationState.initialized = true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Dynamic Navigation:', error);
      // Graceful degradation - existing navigation continues to work
    }
  }

  /**
   * Extract existing navigation items to preserve them
   */
  extractExistingNav() {
    const existingLinks = document.querySelectorAll('.nav-link');
    return Array.from(existingLinks).map(link => ({
      id: link.dataset.view,
      label: link.textContent.trim(),
      href: link.href,
      icon: this.extractIcon(link.textContent),
      isCore: true,
      element: link.cloneNode(true) // Preserve original element
    }));
  }

  /**
   * Extract icon from existing navigation text
   */
  extractIcon(text) {
    const match = text.match(/^([^\w\s]+)\s*(.+)$/);
    return match ? match[1] : '📄';
  }

  /**
   * Load plugin navigation from API
   */
  async loadPluginNavigation() {
    try {
      console.log('🔌 Loading plugin navigation...');
      
      const response = await fetch('/admin/api/plugins');
      if (!response.ok) {
        console.warn('⚠️ Could not load plugin status, using static navigation');
        return;
      }
      
      const result = await response.json();
      if (!result.success) {
        console.warn('⚠️ Plugin API returned error:', result.error);
        return;
      }
      
      // Process plugin navigation data
      this.pluginNavItems = this.processPluginNavigation(result.data.plugins);
      
      console.log(`✅ Loaded ${this.pluginNavItems.length} plugin navigation items`);
      
    } catch (error) {
      console.error('❌ Error loading plugin navigation:', error);
      // Graceful degradation - continue with core navigation only
    }
  }

  /**
   * Process plugin data into navigation items
   */
  processPluginNavigation(plugins) {
    const navItems = [];
    
    plugins.forEach(plugin => {
      if (plugin.enabled && plugin.adminUI) {
        const adminUI = plugin.adminUI;
        
        // Create plugin navigation group
        const pluginNav = {
          id: `plugin-${plugin.id}`,
          label: adminUI.navigation?.label || plugin.name,
          icon: adminUI.navigation?.icon || '🧩',
          group: 'plugins',
          isCore: false,
          isPlugin: true,
          pluginId: plugin.id,
          priority: adminUI.navigation?.priority || 100,
          items: []
        };

        // Add plugin routes as navigation items
        if (adminUI.routes && Array.isArray(adminUI.routes)) {
          adminUI.routes.forEach(route => {
            pluginNav.items.push({
              id: `${plugin.id}-${route.path.replace(/\//g, '-')}`,
              label: route.title || route.label,
              icon: route.icon || '📄',
              path: route.path,
              isCore: false,
              isPlugin: true,
              pluginId: plugin.id
            });
          });
        }

        navItems.push(pluginNav);
      }
    });

    // Sort by priority
    navItems.sort((a, b) => (a.priority || 100) - (b.priority || 100));
    
    return navItems;
  }

  /**
   * Load navigation state from localStorage
   */
  loadNavigationState() {
    try {
      const saved = localStorage.getItem('adminNavState');
      if (saved) {
        const state = JSON.parse(saved);
        this.navigationState = { ...this.navigationState, ...state };
      }
    } catch (error) {
      console.warn('⚠️ Could not load navigation state:', error);
    }
  }

  /**
   * Save navigation state to localStorage
   */
  saveNavigationState() {
    try {
      localStorage.setItem('adminNavState', JSON.stringify({
        collapsed: this.navigationState.collapsed,
        searchTerm: this.navigationState.searchTerm
      }));
    } catch (error) {
      console.warn('⚠️ Could not save navigation state:', error);
    }
  }

  /**
   * Setup event listeners for navigation interactions
   */
  setupEventListeners() {
    // Listen for plugin state changes (if available)
    if (window.pluginStateEmitter) {
      window.pluginStateEmitter.on('pluginToggled', async () => {
        await this.loadPluginNavigation();
        this.render();
      });
    }

    // Setup search functionality (will be added in Task 4)
    this.setupSearchHandlers();
  }

  /**
   * Setup search event handlers
   */
  setupSearchHandlers() {
    // Search functionality implementation
    console.log('🔍 Setting up search handlers...');
    
    // Will be handled by NavigationRenderer after initial render
    // This method is called during init, but search setup happens during render
  }

  /**
   * Toggle plugin section collapse state
   */
  toggleSection(sectionId) {
    this.navigationState.collapsed[sectionId] = !this.navigationState.collapsed[sectionId];
    this.saveNavigationState();
    this.render();
  }

  /**
   * Update plugin navigation when plugins are toggled
   */
  async updatePluginNavigation() {
    await this.loadPluginNavigation();
    this.render();
  }

  /**
   * Render the complete navigation system
   */
  render() {
    try {
      const navMenu = document.querySelector('.nav-menu');
      if (!navMenu) {
        console.error('❌ Nav menu element not found');
        return;
      }

      // Use NavigationRenderer if available
      if (typeof NavigationRenderer !== 'undefined') {
        if (!this.renderer) {
          this.renderer = new NavigationRenderer();
        }
        
        this.renderer.renderNavigation(
          this.coreNavItems, 
          this.pluginNavItems, 
          this.navigationState
        );
      } else {
        // Fallback to basic rendering
        this.renderBasic(navMenu);
      }
      
    } catch (error) {
      console.error('❌ Error rendering navigation:', error);
    }
  }

  /**
   * Render core navigation items
   */
  renderCoreNavigation(container) {
    this.coreNavItems.forEach(item => {
      const li = document.createElement('li');
      
      // Clone the original link to preserve all attributes and event listeners
      const link = item.element.cloneNode(true);
      link.classList.add('nav-core-item');
      
      li.appendChild(link);
      container.appendChild(li);
    });
  }

  /**
   * Render plugin navigation sections
   */
  renderPluginNavigation(container) {
    if (this.pluginNavItems.length === 0) return;

    // Add separator between core and plugin navigation
    const separator = document.createElement('li');
    separator.className = 'nav-separator';
    separator.innerHTML = '<hr>';
    container.appendChild(separator);

    // Create plugins section header
    const pluginsHeader = document.createElement('li');
    pluginsHeader.className = 'nav-section-header';
    pluginsHeader.innerHTML = `
      <div class="nav-section-title">
        <span class="nav-section-icon">🧩</span>
        <span>Plugins</span>
        <button class="nav-section-toggle" data-section="plugins" title="Toggle plugins section">
          ${this.navigationState.collapsed.plugins ? '▶' : '▼'}
        </button>
      </div>
    `;
    container.appendChild(pluginsHeader);

    // Add toggle event listener
    const toggleBtn = pluginsHeader.querySelector('.nav-section-toggle');
    toggleBtn.addEventListener('click', () => this.toggleSection('plugins'));

    // Render plugin items if not collapsed
    if (!this.navigationState.collapsed.plugins) {
      this.pluginNavItems.forEach(plugin => {
        this.renderPluginGroup(container, plugin);
      });
    }
  }

  /**
   * Render individual plugin group
   */
  renderPluginGroup(container, plugin) {
    const pluginGroup = document.createElement('li');
    pluginGroup.className = 'nav-plugin-group';

    // Plugin group header
    const groupHeader = document.createElement('div');
    groupHeader.className = 'nav-plugin-header';
    groupHeader.innerHTML = `
      <span class="nav-plugin-icon">${plugin.icon}</span>
      <span class="nav-plugin-label">${plugin.label}</span>
      <div class="nav-plugin-indicators">
        <span class="plugin-status-indicator" title="Plugin Active">●</span>
      </div>
    `;

    pluginGroup.appendChild(groupHeader);

    // Plugin navigation items
    if (plugin.items && plugin.items.length > 0) {
      const itemsList = document.createElement('ul');
      itemsList.className = 'nav-plugin-items';

      plugin.items.forEach(item => {
        const itemLi = document.createElement('li');
        const itemLink = document.createElement('a');
        
        itemLink.href = `#${item.id}`;
        itemLink.className = 'nav-link nav-plugin-item';
        itemLink.dataset.view = item.id;
        itemLink.dataset.pluginId = item.pluginId;
        itemLink.innerHTML = `${item.icon} ${item.label}`;
        
        itemLi.appendChild(itemLink);
        itemsList.appendChild(itemLi);
      });

      pluginGroup.appendChild(itemsList);
    }

    container.appendChild(pluginGroup);
  }

  /**
   * Restore navigation event handlers (integrates with existing dashboard)
   */
  restoreNavigationHandlers() {
    // This will integrate with existing AdminDashboard navigation handling
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      // Remove any existing listeners to prevent duplicates
      link.removeEventListener('click', this.handleNavClick);
      
      // Add click handler
      link.addEventListener('click', this.handleNavClick.bind(this));
    });
  }

  /**
   * Handle navigation clicks (preserves existing behavior)
   */
  handleNavClick(e) {
    e.preventDefault();
    
    const link = e.currentTarget;
    const view = link.dataset.view;
    const pluginId = link.dataset.pluginId;

    // Update active state
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    // Emit navigation event for integration with existing dashboard
    if (window.adminDashboard) {
      if (pluginId) {
        // Plugin navigation - will be handled in Story 4.3
        console.log(`🧩 Plugin navigation: ${pluginId} - ${view}`);
        this.handlePluginNavigation(pluginId, view);
      } else {
        // Core navigation - delegate to existing dashboard
        window.adminDashboard.switchView(view);
      }
    }
  }

  /**
   * Handle plugin-specific navigation (placeholder for Story 4.3)
   */
  handlePluginNavigation(pluginId, view) {
    // This will be implemented in Story 4.3 - Plugin UI Framework
    console.log(`🚧 Plugin UI loading not yet implemented: ${pluginId}/${view}`);
    
    // For now, show a placeholder
    if (window.adminDashboard) {
      window.adminDashboard.showPluginPlaceholder(pluginId, view);
    }
  }

  /**
   * Add search functionality (for Task 4)
   */
  addSearchBox() {
    // This will be implemented in Task 4
    console.log('🔍 Search functionality pending implementation');
  }

  /**
   * Filter navigation based on search term (for Task 4)
   */
  filterNavigation(searchTerm) {
    this.navigationState.searchTerm = searchTerm;
    this.saveNavigationState();
    
    // Use renderer to apply search filter
    if (this.renderer) {
      this.renderer.applySearchFilter(searchTerm);
      this.renderer.highlightMatches(searchTerm);
    }
    
    console.log('🔍 Navigation filtered:', searchTerm);
  }

  /**
   * Basic fallback rendering without NavigationRenderer
   */
  renderBasic(navMenu) {
    // Clear existing content
    navMenu.innerHTML = '';

    // Render core navigation items
    this.renderCoreNavigation(navMenu);

    // Render plugin navigation if available
    if (this.pluginNavItems.length > 0) {
      this.renderPluginNavigation(navMenu);
    }

    // Restore event listeners for navigation links
    this.restoreNavigationHandlers();
  }

  /**
   * Get current navigation state for debugging
   */
  getState() {
    return {
      initialized: this.navigationState.initialized,
      coreItems: this.coreNavItems.length,
      pluginItems: this.pluginNavItems.length,
      collapsed: this.navigationState.collapsed
    };
  }
}

// Export for use in other modules
window.DynamicNavigation = DynamicNavigation;