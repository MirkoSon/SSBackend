/**
 * Plugin Error Boundary - Isolates plugin UI failures to prevent dashboard crashes
 * Implements isolation and safety principles from Epic 4 architecture
 */
class PluginErrorBoundary {
  constructor(pluginName) {
    this.pluginName = pluginName;
    this.errorCount = 0;
    this.maxErrors = 3;
    this.errorHistory = [];
    this.isDisabled = false;
    
    console.log(`🛡️ Error boundary created for plugin: ${pluginName}`);
  }

  /**
   * Wrap a function to catch and handle errors
   * @param {Function} fn - Function to wrap
   * @returns {Function} Wrapped function
   */
  wrapFunction(fn) {
    return (...args) => {
      if (this.isDisabled) {
        console.warn(`Plugin ${this.pluginName} is disabled due to too many errors`);
        return this.renderErrorFallback('Plugin disabled due to errors');
      }

      try {
        return fn.apply(this, args);
      } catch (error) {
        return this.handleError(error, 'Function execution error');
      }
    };
  }

  /**
   * Wrap an async function to catch and handle errors
   * @param {Function} asyncFn - Async function to wrap
   * @returns {Function} Wrapped async function
   */
  wrapAsyncFunction(asyncFn) {
    return async (...args) => {
      if (this.isDisabled) {
        console.warn(`Plugin ${this.pluginName} is disabled due to too many errors`);
        return this.renderErrorFallback('Plugin disabled due to errors');
      }

      try {
        return await asyncFn.apply(this, args);
      } catch (error) {
        return this.handleError(error, 'Async function execution error');
      }
    };
  }

  /**
   * Wrap component methods to prevent crashes
   * @param {Object} component - Component to wrap
   * @returns {Object} Wrapped component
   */
  wrapComponent(component) {
    if (!component) {
      return this.createErrorComponent('Invalid component', new Error('Component is null or undefined'));
    }

    const wrapped = { ...component };

    // Wrap render method if it exists
    if (typeof component.render === 'function') {
      wrapped.render = this.wrapFunction(component.render.bind(component));
    }

    // Wrap other methods
    for (const [key, value] of Object.entries(component)) {
      if (typeof value === 'function' && key !== 'render') {
        wrapped[key] = this.wrapFunction(value.bind(component));
      }
    }

    return wrapped;
  }

  /**
   * Handle errors that occur within the plugin
   * @param {Error} error - Error that occurred
   * @param {String} context - Context where error occurred
   * @returns {String} Error fallback HTML
   */
  handleError(error, context = 'Unknown') {
    this.errorCount++;
    
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      errorCount: this.errorCount
    };

    this.errorHistory.push(errorInfo);
    
    console.error(`Plugin Error (${this.pluginName}):`, errorInfo);

    // Disable plugin if too many errors
    if (this.errorCount >= this.maxErrors) {
      this.disablePlugin();
    }

    // Report error to dashboard if error reporting is available
    this.reportError(errorInfo);

    return this.renderErrorFallback(error.message, context);
  }

  /**
   * Disable the plugin due to excessive errors
   */
  disablePlugin() {
    if (!this.isDisabled) {
      this.isDisabled = true;
      console.error(`🚫 Plugin ${this.pluginName} disabled due to ${this.errorCount} errors`);
      
      // Notify dashboard of plugin disable
      if (window.PluginEventBus) {
        window.PluginEventBus.emit('plugin-disabled', {
          pluginName: this.pluginName,
          reason: 'excessive_errors',
          errorCount: this.errorCount,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Report error to dashboard error tracking system
   * @param {Object} errorInfo - Error information
   */
  reportError(errorInfo) {
    try {
      // Report to global error tracking if available
      if (window.PluginEventBus) {
        window.PluginEventBus.emit('plugin-error', {
          pluginName: this.pluginName,
          ...errorInfo
        });
      }

      // Could also send to server for logging
      // fetch('/admin/api/plugin-errors', { method: 'POST', body: JSON.stringify(errorInfo) });
      
    } catch (reportingError) {
      console.error('Failed to report plugin error:', reportingError);
    }
  }

  /**
   * Render error fallback UI
   * @param {String} errorMessage - Error message to display
   * @param {String} context - Context where error occurred
   * @returns {String} Error fallback HTML
   */
  renderErrorFallback(errorMessage = 'Unknown error', context = '') {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return `
      <div class="plugin-error-boundary" data-plugin="${this.pluginName}" data-error-id="${errorId}">
        <div class="error-icon">⚠️</div>
        <h3>Plugin Error</h3>
        <p>The <strong>${this.pluginName}</strong> plugin encountered an error.</p>
        ${context ? `<p class="error-context"><small>Context: ${context}</small></p>` : ''}
        <details class="error-details">
          <summary>Error Details</summary>
          <pre class="error-message">${errorMessage}</pre>
          <p class="error-count">Error count: ${this.errorCount}/${this.maxErrors}</p>
        </details>
        <div class="error-actions">
          <button onclick="window.PluginUILoader?.unloadPluginUI('${this.pluginName}')" class="btn btn-secondary">
            Unload Plugin
          </button>
          <button onclick="location.reload()" class="btn btn-primary">
            Reload Dashboard
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Create an error component for failed component loads
   * @param {String} componentName - Name of the failed component
   * @param {Error} error - Error that occurred
   * @returns {Object} Error component
   */
  createErrorComponent(componentName, error) {
    return {
      name: `${componentName}-error`,
      loaded: false,
      error: true,
      render: () => this.renderErrorFallback(
        `Failed to load component: ${componentName}\nError: ${error.message}`,
        'Component loading'
      ),
      cleanup: () => {
        console.log(`Cleaning up error component for ${componentName}`);
      }
    };
  }

  /**
   * Retry plugin operation after error
   * @param {Function} operation - Operation to retry
   * @param {Number} maxRetries - Maximum number of retries
   * @returns {Promise} Result of operation
   */
  async retryOperation(operation, maxRetries = 2) {
    let attempts = 0;
    
    while (attempts <= maxRetries) {
      try {
        return await operation();
      } catch (error) {
        attempts++;
        
        if (attempts > maxRetries) {
          throw error;
        }
        
        console.warn(`Retry attempt ${attempts}/${maxRetries} for plugin ${this.pluginName}`);
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
  }

  /**
   * Reset error count and enable plugin
   */
  reset() {
    this.errorCount = 0;
    this.errorHistory = [];
    this.isDisabled = false;
    
    console.log(`🔄 Error boundary reset for plugin: ${this.pluginName}`);
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    return {
      pluginName: this.pluginName,
      errorCount: this.errorCount,
      maxErrors: this.maxErrors,
      isDisabled: this.isDisabled,
      errorHistory: this.errorHistory.slice(),
      lastError: this.errorHistory.length > 0 ? this.errorHistory[this.errorHistory.length - 1] : null
    };
  }

  /**
   * Check if plugin is healthy (not disabled and under error threshold)
   * @returns {Boolean} True if plugin is healthy
   */
  isHealthy() {
    return !this.isDisabled && this.errorCount < this.maxErrors;
  }
}

// Make available globally
window.PluginErrorBoundary = PluginErrorBoundary;