/**
 * Plugin Navigation Manager
 * Handles plugin-specific navigation registration and management
 */
class PluginNavigationManager {
  constructor() {
    this.registeredPlugins = new Map();
    this.navigationCache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
    
    console.log('🔌 Plugin Navigation Manager initialized');
  }

  /**
   * Register navigation for a plugin
   */
  registerPluginNavigation(pluginManifest) {
    try {
      if (!pluginManifest || !pluginManifest.name) {
        console.warn('⚠️ Invalid plugin manifest for navigation registration');
        return false;
      }

      const pluginId = pluginManifest.name;
      console.log(`📝 Registering navigation for plugin: ${pluginId}`);

      // Process adminUI section if present
      if (pluginManifest.adminUI) {
        const navData = this.processPluginUIManifest(pluginManifest);
        this.registeredPlugins.set(pluginId, navData);
        
        // Clear cache for this plugin
        this.navigationCache.delete(pluginId);
        
        console.log(`✅ Navigation registered for plugin: ${pluginId}`);
        return true;
      }

      console.log(`ℹ️ Plugin ${pluginId} does not have adminUI configuration`);
      return false;
      
    } catch (error) {
      console.error('❌ Error registering plugin navigation:', error);
      return false;
    }
  }

  /**
   * Process plugin UI manifest into navigation structure
   */
  processPluginUIManifest(manifest) {
    const adminUI = manifest.adminUI;
    
    return {
      pluginId: manifest.name,
      enabled: adminUI.enabled !== false, // Default to true
      navigation: {
        label: adminUI.navigation?.label || manifest.displayName || manifest.name,
        icon: adminUI.navigation?.icon || '🧩',
        group: adminUI.navigation?.group || 'plugins',
        priority: adminUI.navigation?.priority || 100
      },
      routes: this.processPluginRoutes(adminUI.routes || []),
      lastUpdated: Date.now()
    };
  }

  /**
   * Process plugin routes into navigation items
   */
  processPluginRoutes(routes) {
    return routes.map(route => ({
      id: route.path.replace(/\//g, '-').replace(/^-/, ''),
      path: route.path,
      title: route.title || route.label,
      icon: route.icon || '📄',
      component: route.component,
      permissions: route.permissions || ['admin']
    }));
  }

  /**
   * Get navigation data for a specific plugin
   */
  getPluginNavigation(pluginId) {
    const cached = this.navigationCache.get(pluginId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    const navData = this.registeredPlugins.get(pluginId);
    if (navData) {
      this.navigationCache.set(pluginId, {
        data: navData,
        timestamp: Date.now()
      });
    }

    return navData || null;
  }

  /**
   * Get all registered plugin navigation data
   */
  getAllPluginNavigation() {
    const allNavigation = [];
    
    for (const [pluginId, navData] of this.registeredPlugins) {
      if (navData.enabled) {
        allNavigation.push({
          pluginId,
          ...navData
        });
      }
    }

    // Sort by priority
    allNavigation.sort((a, b) => 
      (a.navigation.priority || 100) - (b.navigation.priority || 100)
    );

    return allNavigation;
  }

  /**
   * Update plugin status (enabled/disabled)
   */
  updatePluginStatus(pluginId, enabled) {
    const navData = this.registeredPlugins.get(pluginId);
    if (navData) {
      navData.enabled = enabled;
      navData.lastUpdated = Date.now();
      
      // Clear cache
      this.navigationCache.delete(pluginId);
      
      console.log(`📊 Updated status for plugin ${pluginId}: ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    
    return false;
  }

  /**
   * Remove plugin navigation
   */
  unregisterPlugin(pluginId) {
    const removed = this.registeredPlugins.delete(pluginId);
    this.navigationCache.delete(pluginId);
    
    if (removed) {
      console.log(`🗑️ Unregistered navigation for plugin: ${pluginId}`);
    }
    
    return removed;
  }

  /**
   * Check if plugin has navigation registered
   */
  hasPluginNavigation(pluginId) {
    return this.registeredPlugins.has(pluginId);
  }

  /**
   * Get navigation statistics
   */
  getNavigationStats() {
    const total = this.registeredPlugins.size;
    const enabled = Array.from(this.registeredPlugins.values())
      .filter(nav => nav.enabled).length;
    
    return {
      totalRegistered: total,
      enabled: enabled,
      disabled: total - enabled,
      cacheSize: this.navigationCache.size
    };
  }

  /**
   * Clear all navigation cache
   */
  clearCache() {
    this.navigationCache.clear();
    console.log('🗑️ Plugin navigation cache cleared');
  }

  /**
   * Validate plugin navigation structure
   */
  validatePluginNavigation(pluginManifest) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    try {
      if (!pluginManifest.adminUI) {
        validation.warnings.push('No adminUI section found');
        return validation;
      }

      const adminUI = pluginManifest.adminUI;

      // Validate navigation section
      if (adminUI.navigation) {
        if (!adminUI.navigation.label) {
          validation.warnings.push('Navigation label not specified');
        }
        if (!adminUI.navigation.icon) {
          validation.warnings.push('Navigation icon not specified');
        }
      }

      // Validate routes
      if (adminUI.routes) {
        if (!Array.isArray(adminUI.routes)) {
          validation.errors.push('Routes must be an array');
          validation.valid = false;
        } else {
          adminUI.routes.forEach((route, index) => {
            if (!route.path) {
              validation.errors.push(`Route ${index}: path is required`);
              validation.valid = false;
            }
            if (!route.title && !route.label) {
              validation.warnings.push(`Route ${index}: title or label recommended`);
            }
          });
        }
      }

    } catch (error) {
      validation.errors.push(`Validation error: ${error.message}`);
      validation.valid = false;
    }

    return validation;
  }
}

// Export for use in other modules
window.PluginNavigationManager = PluginNavigationManager;