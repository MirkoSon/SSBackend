/**
 * Plugin Event Bus - Communication system for plugin UI framework
 * Enables safe communication between plugins and dashboard components
 */
class PluginEventBus {
  constructor() {
    this.events = new Map();
    this.pluginListeners = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 100;
    
    console.log('📡 Plugin Event Bus initialized');
    
    // Initialize standard dashboard events
    this.initializeStandardEvents();
  }

  /**
   * Initialize standard events that plugins can listen for
   */
  initializeStandardEvents() {
    this.standardEvents = [
      'plugin-enabled',
      'plugin-disabled', 
      'plugin-loaded',
      'plugin-unloaded',
      'plugin-error',
      'dashboard-refresh',
      'user-action',
      'data-updated',
      'notification-show',
      'navigation-change'
    ];
    
    // Initialize event arrays
    for (const eventName of this.standardEvents) {
      this.events.set(eventName, []);
    }
  }

  /**
   * Emit an event to all registered listeners
   * @param {String} eventName - Name of the event
   * @param {Object} payload - Event payload data
   * @param {String} sourcePlugin - Plugin that emitted the event
   */
  emit(eventName, payload = {}, sourcePlugin = null) {
    try {
      // Validate event name
      if (!eventName || typeof eventName !== 'string') {
        console.error('Invalid event name:', eventName);
        return false;
      }

      // Validate and sanitize payload
      const validatedPayload = this.validateEventPayload(eventName, payload);
      
      // Create event object
      const eventObj = {
        name: eventName,
        payload: validatedPayload,
        sourcePlugin,
        timestamp: new Date().toISOString(),
        id: this.generateEventId()
      };

      // Log event emission
      console.log(`📡 Event emitted: ${eventName}`, eventObj);
      
      // Add to history
      this.addToHistory(eventObj);
      
      // Get listeners for this event
      const listeners = this.events.get(eventName) || [];
      
      if (listeners.length === 0) {
        console.log(`📡 No listeners for event: ${eventName}`);
        return true;
      }

      // Emit to all listeners with error isolation
      let successCount = 0;
      let errorCount = 0;
      
      for (const listener of listeners) {
        try {
          // Call listener with error boundary
          const result = listener.callback(validatedPayload, sourcePlugin, eventObj);
          
          // Handle async listeners
          if (result && typeof result.then === 'function') {
            result.catch(error => {
              console.error(`Async listener error for event ${eventName}:`, error);
              this.handleListenerError(eventName, listener, error);
            });
          }
          
          successCount++;
          
        } catch (error) {
          errorCount++;
          console.error(`Listener error for event ${eventName}:`, error);
          this.handleListenerError(eventName, listener, error);
        }
      }
      
      console.log(`📡 Event ${eventName} delivered to ${successCount}/${listeners.length} listeners`);
      
      return errorCount === 0;
      
    } catch (error) {
      console.error(`Failed to emit event ${eventName}:`, error);
      return false;
    }
  }

  /**
   * Register a listener for an event
   * @param {String} eventName - Event name to listen for
   * @param {Function} callback - Callback function
   * @param {String} pluginName - Plugin registering the listener
   * @param {Object} options - Listener options
   */
  on(eventName, callback, pluginName = null, options = {}) {
    try {
      // Validate parameters
      if (!eventName || typeof eventName !== 'string') {
        throw new Error('Event name must be a string');
      }
      
      if (!callback || typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }

      // Create listener object
      const listener = {
        callback,
        pluginName,
        registeredAt: new Date().toISOString(),
        id: this.generateListenerId(),
        once: options.once || false,
        priority: options.priority || 0
      };

      // Ensure event exists
      if (!this.events.has(eventName)) {
        this.events.set(eventName, []);
      }

      // Add listener
      const listeners = this.events.get(eventName);
      listeners.push(listener);
      
      // Sort by priority (higher first)
      listeners.sort((a, b) => b.priority - a.priority);

      // Track plugin listeners for cleanup
      if (pluginName) {
        if (!this.pluginListeners.has(pluginName)) {
          this.pluginListeners.set(pluginName, []);
        }
        this.pluginListeners.get(pluginName).push({ eventName, listener });
      }

      console.log(`📝 Listener registered for ${eventName} by ${pluginName || 'system'}`);
      
      return listener.id;
      
    } catch (error) {
      console.error(`Failed to register listener for ${eventName}:`, error);
      return null;
    }
  }

  /**
   * Register a one-time listener
   * @param {String} eventName - Event name
   * @param {Function} callback - Callback function
   * @param {String} pluginName - Plugin name
   */
  once(eventName, callback, pluginName = null) {
    return this.on(eventName, callback, pluginName, { once: true });
  }

  /**
   * Remove a specific listener
   * @param {String} eventName - Event name
   * @param {Function|String} callbackOrId - Callback function or listener ID
   */
  off(eventName, callbackOrId) {
    const listeners = this.events.get(eventName);
    if (!listeners) return false;

    const initialLength = listeners.length;
    
    // Remove by callback function or ID
    const filtered = listeners.filter(listener => {
      if (typeof callbackOrId === 'string') {
        return listener.id !== callbackOrId;
      } else {
        return listener.callback !== callbackOrId;
      }
    });

    this.events.set(eventName, filtered);
    
    const removed = initialLength - filtered.length;
    if (removed > 0) {
      console.log(`🗑️ Removed ${removed} listeners for ${eventName}`);
    }
    
    return removed > 0;
  }

  /**
   * Remove all listeners for a plugin
   * @param {String} pluginName - Plugin name
   */
  removePluginListeners(pluginName) {
    const pluginListeners = this.pluginListeners.get(pluginName) || [];
    let removedCount = 0;
    
    for (const { eventName, listener } of pluginListeners) {
      if (this.off(eventName, listener.id)) {
        removedCount++;
      }
    }
    
    this.pluginListeners.delete(pluginName);
    
    console.log(`🗑️ Removed ${removedCount} listeners for plugin: ${pluginName}`);
    return removedCount;
  }

  /**
   * Validate and sanitize event payload
   * @param {String} eventName - Event name
   * @param {Object} payload - Event payload
   * @returns {Object} Validated payload
   */
  validateEventPayload(eventName, payload) {
    // Basic validation - ensure payload is an object
    if (payload === null || typeof payload !== 'object') {
      return { data: payload };
    }

    // Clone to prevent mutation
    const validated = JSON.parse(JSON.stringify(payload));
    
    // Add standard metadata
    validated._meta = {
      eventName,
      validatedAt: new Date().toISOString(),
      size: JSON.stringify(validated).length
    };

    // Limit payload size (prevent memory issues)
    if (validated._meta.size > 50000) { // 50KB limit
      console.warn(`Large event payload for ${eventName}: ${validated._meta.size} bytes`);
    }

    return validated;
  }

  /**
   * Handle listener errors
   * @param {String} eventName - Event name
   * @param {Object} listener - Listener that failed
   * @param {Error} error - Error that occurred
   */
  handleListenerError(eventName, listener, error) {
    const errorInfo = {
      eventName,
      listenerPlugin: listener.pluginName,
      listenerId: listener.id,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    // Log error
    console.error('Event listener error:', errorInfo);
    
    // Remove listener if it's a plugin listener and has repeated errors
    if (listener.pluginName) {
      listener.errorCount = (listener.errorCount || 0) + 1;
      
      if (listener.errorCount >= 3) {
        console.warn(`Removing error-prone listener for ${eventName} from ${listener.pluginName}`);
        this.off(eventName, listener.id);
      }
    }

    // Emit error event for error tracking
    setTimeout(() => {
      this.emit('listener-error', errorInfo, 'system');
    }, 0);
  }

  /**
   * Generate unique event ID
   * @returns {String} Unique event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique listener ID
   * @returns {String} Unique listener ID
   */
  generateListenerId() {
    return `lst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add event to history
   * @param {Object} eventObj - Event object
   */
  addToHistory(eventObj) {
    this.eventHistory.push(eventObj);
    
    // Limit history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.splice(0, this.eventHistory.length - this.maxHistorySize);
    }
  }

  /**
   * Get event history
   * @param {Number} limit - Maximum number of events to return
   * @returns {Array} Event history
   */
  getEventHistory(limit = 50) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get listeners for an event
   * @param {String} eventName - Event name
   * @returns {Array} Array of listeners
   */
  getListeners(eventName) {
    return (this.events.get(eventName) || []).map(listener => ({
      id: listener.id,
      pluginName: listener.pluginName,
      registeredAt: listener.registeredAt,
      priority: listener.priority,
      once: listener.once
    }));
  }

  /**
   * Get all plugin listeners
   * @param {String} pluginName - Plugin name
   * @returns {Array} Array of plugin listeners
   */
  getPluginListeners(pluginName) {
    return this.pluginListeners.get(pluginName) || [];
  }

  /**
   * Get event bus statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const eventStats = {};
    let totalListeners = 0;
    
    for (const [eventName, listeners] of this.events.entries()) {
      eventStats[eventName] = listeners.length;
      totalListeners += listeners.length;
    }

    return {
      totalEvents: this.events.size,
      totalListeners,
      eventStats,
      pluginCount: this.pluginListeners.size,
      historySize: this.eventHistory.length,
      standardEvents: this.standardEvents.length
    };
  }

  /**
   * Clear all listeners and history
   */
  clear() {
    this.events.clear();
    this.pluginListeners.clear();
    this.eventHistory = [];
    this.initializeStandardEvents();
    
    console.log('🧹 Event bus cleared');
  }

  /**
   * Emit standard dashboard events
   */
  emitPluginEnabled(pluginName) {
    this.emit('plugin-enabled', { pluginName }, 'system');
  }

  emitPluginDisabled(pluginName) {
    this.emit('plugin-disabled', { pluginName }, 'system');
  }

  emitDataUpdated(dataType, data) {
    this.emit('data-updated', { dataType, data }, 'system');
  }

  emitNotification(message, type = 'info') {
    this.emit('notification-show', { message, type }, 'system');
  }

  emitNavigationChange(newPath, oldPath) {
    this.emit('navigation-change', { newPath, oldPath }, 'system');
  }
}

// Make available globally
window.PluginEventBus = new PluginEventBus();