/**
 * Plugin UI Loader - Core system for loading and managing plugin UI components
 * Implements isolation and safety principles from Epic 4 architecture
 */
class PluginUILoader {
  constructor() {
    this.registeredPlugins = new Map();
    this.activePluginUIs = new Map();
    this.errorBoundaries = new Map();
    this.loadingPromises = new Map();
    
    console.log('🎨 Plugin UI Loader initialized');
  }

  /**
   * Register a plugin's UI components and routes
   * @param {Object} pluginManifest - Plugin manifest with adminUI section
   */
  async registerPluginUI(pluginManifest) {
    const pluginName = pluginManifest.name;
    
    try {
      // Validate plugin manifest has adminUI section
      if (!pluginManifest.adminUI || !pluginManifest.adminUI.enabled) {
        console.log(`⏭️ Plugin ${pluginName} has no admin UI or UI disabled`);
        return false;
      }

      console.log(`📝 Registering UI for plugin: ${pluginName}`);
      
      // Setup error boundary for this plugin
      this.setupErrorBoundary(pluginName);
      
      // Process plugin UI manifest
      const processedUI = await this.processPluginUIManifest(pluginManifest);
      
      // Store processed UI configuration
      this.registeredPlugins.set(pluginName, processedUI);
      
      console.log(`✅ Plugin UI registered successfully: ${pluginName}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to register plugin UI: ${pluginName}`, error);
      this.handleRegistrationError(pluginName, error);
      return false;
    }
  }

  /**
   * Process plugin UI manifest and validate configuration
   * @param {Object} pluginManifest - Plugin manifest
   * @returns {Object} Processed UI configuration
   */
  async processPluginUIManifest(pluginManifest) {
    const { adminUI } = pluginManifest;
    const pluginName = pluginManifest.name;
    
    // Validate and process routes
    const processedRoutes = this.validateAndProcessRoutes(adminUI.routes || [], pluginName);
    
    // Validate navigation configuration
    const navigation = this.validateNavigationConfig(adminUI.navigation || {}, pluginName);
    
    // Process component declarations
    const components = this.processComponentDeclarations(adminUI.components || {}, pluginName);
    
    return {
      pluginName,
      enabled: adminUI.enabled,
      routes: processedRoutes,
      navigation,
      components,
      permissions: adminUI.permissions || ['admin'],
      metadata: {
        version: pluginManifest.version,
        registeredAt: new Date().toISOString()
      }
    };
  }

  /**
   * Validate and process plugin routes to prevent conflicts
   * @param {Array} routes - Route definitions from plugin manifest
   * @param {String} pluginName - Name of the plugin
   * @returns {Array} Processed routes
   */
  validateAndProcessRoutes(routes, pluginName) {
    const reservedPaths = [
      '/admin/users',
      '/admin/saves', 
      '/admin/inventories',
      '/admin/progress',
      '/admin/exports',
      '/admin/api',
      '/admin/login',
      '/admin/logout'
    ];

    return routes.map(route => {
      // Ensure route path is string
      if (typeof route.path !== 'string') {
        throw new Error(`Invalid route path for plugin ${pluginName}: must be string`);
      }

      // Check for reserved path conflicts
      if (reservedPaths.some(reserved => route.path.startsWith(reserved))) {
        throw new Error(`Plugin route conflicts with core path: ${route.path}`);
      }

      // Ensure plugin routes are namespaced under /admin/{pluginName}
      const expectedPrefix = `/admin/${pluginName}`;
      if (!route.path.startsWith(expectedPrefix)) {
        console.warn(`⚠️ Plugin route should be namespaced under ${expectedPrefix}: ${route.path}`);
      }

      return {
        path: route.path,
        component: route.component,
        title: route.title || route.path,
        icon: route.icon || '🔌',
        permissions: route.permissions || ['admin'],
        metadata: {
          pluginName,
          registeredAt: new Date().toISOString()
        }
      };
    });
  }

  /**
   * Validate navigation configuration
   * @param {Object} navigation - Navigation config from plugin manifest
   * @param {String} pluginName - Name of the plugin
   * @returns {Object} Processed navigation config
   */
  validateNavigationConfig(navigation, pluginName) {
    return {
      label: navigation.label || pluginName,
      icon: navigation.icon || '🔌',
      group: navigation.group || 'plugins',
      priority: navigation.priority || 100,
      visible: navigation.visible !== false
    };
  }

  /**
   * Process component declarations for lazy loading
   * @param {Object} components - Component declarations
   * @param {String} pluginName - Name of the plugin
   * @returns {Object} Processed component config
   */
  processComponentDeclarations(components, pluginName) {
    const processed = {};
    
    for (const [componentName, componentPath] of Object.entries(components)) {
      processed[componentName] = {
        path: componentPath,
        loaded: false,
        instance: null,
        errorCount: 0
      };
    }
    
    return processed;
  }

  /**
   * Setup error boundary for plugin to isolate failures
   * @param {String} pluginName - Name of the plugin
   */
  setupErrorBoundary(pluginName) {
    const boundary = new PluginErrorBoundary(pluginName);
    this.errorBoundaries.set(pluginName, boundary);
    console.log(`🛡️ Error boundary set up for plugin: ${pluginName}`);
  }

  /**
   * Load and activate plugin UI components
   * @param {String} pluginName - Name of the plugin to load
   * @returns {Promise<Object>} Loaded plugin UI instance
   */
  async loadPluginUI(pluginName) {
    // Return existing instance if already loaded
    if (this.activePluginUIs.has(pluginName)) {
      return this.activePluginUIs.get(pluginName);
    }

    // Return loading promise if already in progress
    if (this.loadingPromises.has(pluginName)) {
      return this.loadingPromises.get(pluginName);
    }

    // Start loading process
    const loadingPromise = this.performPluginUILoad(pluginName);
    this.loadingPromises.set(pluginName, loadingPromise);

    try {
      const result = await loadingPromise;
      this.loadingPromises.delete(pluginName);
      return result;
    } catch (error) {
      this.loadingPromises.delete(pluginName);
      throw error;
    }
  }

  /**
   * Perform the actual plugin UI loading
   * @param {String} pluginName - Name of the plugin to load
   * @returns {Promise<Object>} Loaded plugin UI instance
   */
  async performPluginUILoad(pluginName) {
    const pluginConfig = this.registeredPlugins.get(pluginName);
    
    if (!pluginConfig) {
      throw new Error(`Plugin UI not registered: ${pluginName}`);
    }

    try {
      console.log(`🔄 Loading plugin UI: ${pluginName}`);
      
      // Get error boundary for this plugin
      const errorBoundary = this.errorBoundaries.get(pluginName);
      
      // Load plugin components with error isolation
      const loadedComponents = await this.loadPluginComponents(pluginConfig, errorBoundary);
      
      // Create plugin UI instance
      const pluginUIInstance = {
        pluginName,
        config: pluginConfig,
        components: loadedComponents,
        errorBoundary,
        loadedAt: new Date().toISOString()
      };
      
      // Store active instance
      this.activePluginUIs.set(pluginName, pluginUIInstance);
      
      console.log(`✅ Plugin UI loaded successfully: ${pluginName}`);
      return pluginUIInstance;
      
    } catch (error) {
      console.error(`❌ Failed to load plugin UI: ${pluginName}`, error);
      this.handleLoadingError(pluginName, error);
      throw error;
    }
  }

  /**
   * Load plugin components with error isolation
   * @param {Object} pluginConfig - Plugin configuration
   * @param {PluginErrorBoundary} errorBoundary - Error boundary instance
   * @returns {Object} Loaded components
   */
  async loadPluginComponents(pluginConfig, errorBoundary) {
    const loadedComponents = {};
    
    for (const [componentName, componentInfo] of Object.entries(pluginConfig.components)) {
      try {
        // Wrap component loading in error boundary
        const wrappedLoader = errorBoundary.wrapAsyncFunction(async () => {
          return await this.loadSingleComponent(pluginConfig.pluginName, componentName, componentInfo);
        });
        
        loadedComponents[componentName] = await wrappedLoader();
        
      } catch (error) {
        console.error(`Failed to load component ${componentName} for plugin ${pluginConfig.pluginName}:`, error);
        loadedComponents[componentName] = errorBoundary.createErrorComponent(componentName, error);
      }
    }
    
    return loadedComponents;
  }

  /**
   * Load a single component (placeholder implementation)
   * @param {String} pluginName - Plugin name
   * @param {String} componentName - Component name
   * @param {Object} componentInfo - Component information
   * @returns {Object} Component instance
   */
  async loadSingleComponent(pluginName, componentName, componentInfo) {
    // This is a placeholder implementation
    // In a real implementation, this would dynamically import the component
    console.log(`Loading component ${componentName} from ${componentInfo.path}`);
    
    return {
      name: componentName,
      path: componentInfo.path,
      loaded: true,
      render: () => `<div class="plugin-component" data-plugin="${pluginName}" data-component="${componentName}">
        Plugin Component: ${pluginName}/${componentName}
      </div>`
    };
  }

  /**
   * Unload plugin UI and clean up resources
   * @param {String} pluginName - Name of the plugin to unload
   */
  async unloadPluginUI(pluginName) {
    try {
      console.log(`🔄 Unloading plugin UI: ${pluginName}`);
      
      // Get active instance
      const instance = this.activePluginUIs.get(pluginName);
      if (!instance) {
        console.log(`⏭️ Plugin UI not loaded: ${pluginName}`);
        return;
      }

      // Clean up components
      if (instance.components) {
        for (const component of Object.values(instance.components)) {
          if (component.cleanup) {
            await component.cleanup();
          }
        }
      }

      // Remove from active instances
      this.activePluginUIs.delete(pluginName);
      
      // Clear any loading promises
      this.loadingPromises.delete(pluginName);
      
      console.log(`✅ Plugin UI unloaded successfully: ${pluginName}`);
      
    } catch (error) {
      console.error(`❌ Error unloading plugin UI: ${pluginName}`, error);
    }
  }

  /**
   * Get all registered plugin UIs
   * @returns {Array} Array of registered plugin UI configs
   */
  getRegisteredPlugins() {
    return Array.from(this.registeredPlugins.values());
  }

  /**
   * Get all active plugin UI instances
   * @returns {Array} Array of active plugin UI instances
   */
  getActivePlugins() {
    return Array.from(this.activePluginUIs.values());
  }

  /**
   * Check if a plugin UI is registered
   * @param {String} pluginName - Plugin name to check
   * @returns {Boolean} True if registered
   */
  isPluginRegistered(pluginName) {
    return this.registeredPlugins.has(pluginName);
  }

  /**
   * Check if a plugin UI is loaded
   * @param {String} pluginName - Plugin name to check
   * @returns {Boolean} True if loaded
   */
  isPluginLoaded(pluginName) {
    return this.activePluginUIs.has(pluginName);
  }

  /**
   * Handle registration errors
   * @param {String} pluginName - Plugin name
   * @param {Error} error - Error that occurred
   */
  handleRegistrationError(pluginName, error) {
    const errorInfo = {
      pluginName,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      type: 'registration'
    };
    
    console.error('Plugin UI registration error:', errorInfo);
    
    // Could emit event for error tracking
    if (window.PluginEventBus) {
      window.PluginEventBus.emit('plugin-ui-error', errorInfo);
    }
  }

  /**
   * Handle loading errors
   * @param {String} pluginName - Plugin name
   * @param {Error} error - Error that occurred
   */
  handleLoadingError(pluginName, error) {
    const errorInfo = {
      pluginName,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      type: 'loading'
    };
    
    console.error('Plugin UI loading error:', errorInfo);
    
    // Could emit event for error tracking
    if (window.PluginEventBus) {
      window.PluginEventBus.emit('plugin-ui-error', errorInfo);
    }
  }
}

// Make available globally for admin dashboard
window.PluginUILoader = PluginUILoader;