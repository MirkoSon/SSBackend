/**
 * Plugin Router - Manages plugin routes and prevents conflicts
 * Implements safe route registration with authentication inheritance
 */
class PluginRouter {
  constructor() {
    this.pluginRoutes = new Map();
    this.routeHandlers = new Map();
    this.reservedPaths = [
      '/admin/users',
      '/admin/saves', 
      '/admin/inventories',
      '/admin/progress',
      '/admin/exports',
      '/admin/api',
      '/admin/login',
      '/admin/logout'
    ];
    
    console.log('🛤️ Plugin Router initialized');
  }

  /**
   * Register routes for a plugin
   * @param {String} pluginName - Name of the plugin
   * @param {Array} routes - Array of route definitions
   * @returns {Boolean} Success status
   */
  registerPluginRoutes(pluginName, routes) {
    try {
      const validatedRoutes = [];
      
      for (const route of routes) {
        const validatedRoute = this.validateAndProcessRoute(pluginName, route);
        validatedRoutes.push(validatedRoute);
      }
      
      // Store routes for the plugin
      this.pluginRoutes.set(pluginName, validatedRoutes);
      
      // Register route handlers
      this.registerRouteHandlers(pluginName, validatedRoutes);
      
      console.log(`✅ Registered ${validatedRoutes.length} routes for plugin: ${pluginName}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to register routes for plugin ${pluginName}:`, error);
      return false;
    }
  }

  /**
   * Validate and process a single route
   * @param {String} pluginName - Plugin name
   * @param {Object} route - Route definition
   * @returns {Object} Processed route
   */
  validateAndProcessRoute(pluginName, route) {
    // Validate route structure
    if (!route.path || typeof route.path !== 'string') {
      throw new Error(`Invalid route path for plugin ${pluginName}: must be a string`);
    }

    // Check for reserved path conflicts
    if (this.isPathReserved(route.path)) {
      throw new Error(`Plugin route conflicts with core path: ${route.path}`);
    }

    // Ensure plugin routes are namespaced properly
    const expectedPrefix = `/admin/${pluginName}`;
    if (!route.path.startsWith(expectedPrefix)) {
      console.warn(`⚠️ Plugin route should be namespaced under ${expectedPrefix}: ${route.path}`);
    }

    // Validate component reference
    if (!route.component || typeof route.component !== 'string') {
      throw new Error(`Invalid component reference for route ${route.path}: must be a string`);
    }

    return {
      path: route.path,
      component: route.component,
      title: route.title || route.path,
      icon: route.icon || '🔌',
      permissions: route.permissions || ['admin'],
      pluginName,
      metadata: {
        registeredAt: new Date().toISOString(),
        validatedBy: 'PluginRouter'
      }
    };
  }

  /**
   * Check if a path conflicts with reserved core paths
   * @param {String} path - Path to check
   * @returns {Boolean} True if path is reserved
   */
  isPathReserved(path) {
    return this.reservedPaths.some(reserved => 
      path === reserved || path.startsWith(reserved + '/')
    );
  }

  /**
   * Register route handlers for client-side routing
   * @param {String} pluginName - Plugin name
   * @param {Array} routes - Validated routes
   */
  registerRouteHandlers(pluginName, routes) {
    for (const route of routes) {
      const handlerKey = route.path;
      
      // Create route handler with authentication wrapper
      const handler = this.createRouteHandler(route);
      
      // Store handler
      this.routeHandlers.set(handlerKey, handler);
      
      console.log(`📍 Route handler registered: ${handlerKey}`);
    }
  }

  /**
   * Create a route handler with authentication and error handling
   * @param {Object} route - Route definition
   * @returns {Function} Route handler function
   */
  createRouteHandler(route) {
    return async (params = {}) => {
      try {
        // Check authentication (reuse existing admin auth)
        if (!this.isAuthenticated()) {
          console.warn(`Authentication required for route: ${route.path}`);
          window.location.href = '/admin/login';
          return;
        }

        // Check route-specific permissions
        if (!this.hasPermission(route.permissions)) {
          console.error(`Insufficient permissions for route: ${route.path}`);
          return this.renderUnauthorized(route);
        }

        // Load and render plugin component
        return await this.loadAndRenderComponent(route, params);

      } catch (error) {
        console.error(`Error handling route ${route.path}:`, error);
        return this.renderRouteError(route, error);
      }
    };
  }

  /**
   * Check if user is authenticated (uses existing dashboard auth)
   * @returns {Boolean} Authentication status
   */
  isAuthenticated() {
    // Check if the dashboard is authenticated
    // This integrates with existing authentication
    return document.body.classList.contains('authenticated') || 
           window.dashboard?.authenticated === true;
  }

  /**
   * Check if user has required permissions
   * @param {Array} requiredPermissions - Required permissions
   * @returns {Boolean} Permission status
   */
  hasPermission(requiredPermissions) {
    // For now, assume admin users have all permissions
    // This can be enhanced with more granular permission checking
    return this.isAuthenticated() && requiredPermissions.includes('admin');
  }

  /**
   * Load and render a plugin component
   * @param {Object} route - Route definition
   * @param {Object} params - Route parameters
   * @returns {String} Rendered HTML
   */
  async loadAndRenderComponent(route, params) {
    try {
      // Get plugin UI loader
      const pluginUI = window.PluginUILoader;
      if (!pluginUI) {
        throw new Error('Plugin UI Loader not available');
      }

      // Load plugin UI if not already loaded
      const pluginInstance = await pluginUI.loadPluginUI(route.pluginName);
      
      // Get the specific component
      const component = pluginInstance.components[route.component];
      if (!component) {
        throw new Error(`Component not found: ${route.component}`);
      }

      // Render component
      const html = await this.renderComponent(component, route, params);
      
      return html;

    } catch (error) {
      console.error(`Failed to load component for route ${route.path}:`, error);
      return this.renderComponentError(route, error);
    }
  }

  /**
   * Render a component with proper layout integration
   * @param {Object} component - Component instance
   * @param {Object} route - Route definition
   * @param {Object} params - Route parameters
   * @returns {String} Rendered HTML
   */
  async renderComponent(component, route, params) {
    // Render component content
    let content;
    if (typeof component.render === 'function') {
      content = await component.render(params);
    } else {
      content = component.html || `<div>Component: ${route.component}</div>`;
    }

    // Wrap in plugin layout
    return this.wrapInPluginLayout(content, route);
  }

  /**
   * Wrap component content in plugin layout
   * @param {String} content - Component HTML content
   * @param {Object} route - Route definition
   * @returns {String} Wrapped HTML
   */
  wrapInPluginLayout(content, route) {
    return `
      <div class="plugin-route-container" data-plugin="${route.pluginName}" data-route="${route.path}">
        <div class="plugin-route-header">
          <div class="plugin-route-breadcrumb">
            <a href="/admin">Dashboard</a> 
            <span class="breadcrumb-separator">/</span>
            <span class="plugin-name">${route.pluginName}</span>
            <span class="breadcrumb-separator">/</span>
            <span class="route-title">${route.title}</span>
          </div>
          <h1 class="plugin-route-title">
            <span class="route-icon">${route.icon}</span>
            ${route.title}
          </h1>
        </div>
        <div class="plugin-route-content">
          ${content}
        </div>
      </div>
    `;
  }

  /**
   * Render unauthorized access message
   * @param {Object} route - Route definition
   * @returns {String} Unauthorized HTML
   */
  renderUnauthorized(route) {
    return `
      <div class="plugin-error unauthorized">
        <div class="error-icon">🚫</div>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this plugin route.</p>
        <p><strong>Route:</strong> ${route.path}</p>
        <p><strong>Required permissions:</strong> ${route.permissions.join(', ')}</p>
        <button onclick="history.back()" class="btn btn-secondary">Go Back</button>
      </div>
    `;
  }

  /**
   * Render route error message
   * @param {Object} route - Route definition
   * @param {Error} error - Error that occurred
   * @returns {String} Error HTML
   */
  renderRouteError(route, error) {
    return `
      <div class="plugin-error route-error">
        <div class="error-icon">⚠️</div>
        <h2>Route Error</h2>
        <p>Failed to load plugin route: <strong>${route.path}</strong></p>
        <details class="error-details">
          <summary>Error Details</summary>
          <pre>${error.message}</pre>
        </details>
        <div class="error-actions">
          <button onclick="location.reload()" class="btn btn-primary">Reload</button>
          <button onclick="history.back()" class="btn btn-secondary">Go Back</button>
        </div>
      </div>
    `;
  }

  /**
   * Render component error message
   * @param {Object} route - Route definition
   * @param {Error} error - Error that occurred
   * @returns {String} Error HTML
   */
  renderComponentError(route, error) {
    return `
      <div class="plugin-error component-error">
        <div class="error-icon">🔧</div>
        <h2>Component Error</h2>
        <p>Failed to load component: <strong>${route.component}</strong></p>
        <p>Plugin: <strong>${route.pluginName}</strong></p>
        <details class="error-details">
          <summary>Error Details</summary>
          <pre>${error.message}</pre>
        </details>
        <div class="error-actions">
          <button onclick="window.PluginUILoader?.unloadPluginUI('${route.pluginName}')" class="btn btn-secondary">
            Reload Plugin
          </button>
          <button onclick="history.back()" class="btn btn-secondary">Go Back</button>
        </div>
      </div>
    `;
  }

  /**
   * Handle route navigation
   * @param {String} path - Path to navigate to
   * @param {Object} params - Route parameters
   */
  async navigateToRoute(path, params = {}) {
    const handler = this.routeHandlers.get(path);
    
    if (!handler) {
      console.error(`No handler found for route: ${path}`);
      return;
    }

    try {
      const content = await handler(params);
      
      // Update browser URL without page reload
      history.pushState({ path, params }, '', path);
      
      // Update page content
      this.updatePageContent(content);
      
    } catch (error) {
      console.error(`Navigation error for route ${path}:`, error);
    }
  }

  /**
   * Update page content with route content
   * @param {String} content - HTML content to display
   */
  updatePageContent(content) {
    const contentContainer = document.getElementById('content');
    if (contentContainer) {
      contentContainer.innerHTML = content;
    } else {
      console.error('Content container not found');
    }
  }

  /**
   * Get all registered routes for a plugin
   * @param {String} pluginName - Plugin name
   * @returns {Array} Array of routes
   */
  getPluginRoutes(pluginName) {
    return this.pluginRoutes.get(pluginName) || [];
  }

  /**
   * Get all registered routes
   * @returns {Array} Array of all routes
   */
  getAllRoutes() {
    const allRoutes = [];
    for (const routes of this.pluginRoutes.values()) {
      allRoutes.push(...routes);
    }
    return allRoutes;
  }

  /**
   * Unregister routes for a plugin
   * @param {String} pluginName - Plugin name
   */
  unregisterPluginRoutes(pluginName) {
    const routes = this.pluginRoutes.get(pluginName) || [];
    
    // Remove route handlers
    for (const route of routes) {
      this.routeHandlers.delete(route.path);
    }
    
    // Remove plugin routes
    this.pluginRoutes.delete(pluginName);
    
    console.log(`🗑️ Unregistered ${routes.length} routes for plugin: ${pluginName}`);
  }

  /**
   * Check if a route is registered
   * @param {String} path - Route path
   * @returns {Boolean} True if route is registered
   */
  isRouteRegistered(path) {
    return this.routeHandlers.has(path);
  }
}

// Make available globally
window.PluginRouter = PluginRouter;