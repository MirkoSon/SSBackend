/**
 * Base Plugin Interface - Standard structure for all SSBackend plugins
 * 
 * All plugins (internal and external) must follow this interface structure.
 * This ensures consistent behavior and lifecycle management.
 */
class PluginInterface {
  /**
   * Plugin manifest - REQUIRED
   * Contains metadata about the plugin
   */
  static get manifest() {
    throw new Error('Plugin must define a manifest property');
  }

  /**
   * Plugin routes - OPTIONAL
   * Array of route definitions to register with Express
   */
  static get routes() {
    return [];
  }

  /**
   * Database schemas - OPTIONAL
   * Array of database schema definitions
   */
  static get schemas() {
    return [];
  }

  /**
   * Called when plugin is loaded but not activated
   * Use this for initialization that doesn't affect the running server
   * 
   * @param {Object} context - Plugin context
   * @param {Object} context.app - Express app instance
   * @param {Object} context.db - Database instance
   * @param {Object} context.config - Plugin-specific configuration
   */
  static async onLoad(context) {
    // Override in plugin implementation
  }

  /**
   * Called when plugin is activated and should start affecting the server
   * Register routes, setup schemas, etc.
   * 
   * @param {Object} context - Plugin context
   * @param {Object} context.app - Express app instance
   * @param {Object} context.db - Database instance
   * @param {Object} context.config - Plugin-specific configuration
   */
  static async onActivate(context) {
    // Override in plugin implementation
  }

  /**
   * Called when plugin is deactivated
   * Cleanup resources, close connections, etc.
   * 
   * @param {Object} context - Plugin context
   * @param {Object} context.app - Express app instance
   * @param {Object} context.db - Database instance
   */
  static async onDeactivate(context) {
    // Override in plugin implementation
  }
}

/**
 * Standard manifest structure
 */
const MANIFEST_SCHEMA = {
  name: 'string (required)',            // Plugin identifier
  version: 'string (required)',         // Semantic version
  description: 'string (required)',     // Brief description
  author: 'string (optional)',          // Author name
  ssbackend_version: 'string (optional)', // Compatible SSBackend version
  dependencies: 'array (optional)',     // Other required plugins
  configSchema: 'object (optional)'     // JSON Schema for config validation
};

/**
 * Standard route definition structure
 */
const ROUTE_SCHEMA = {
  method: 'string (required)',          // HTTP method (GET, POST, etc.)
  path: 'string (required)',            // Route path
  handler: 'string|function (required)', // Route handler
  middleware: 'array (optional)'        // Middleware names
};

/**
 * Standard schema definition structure
 */
const SCHEMA_SCHEMA = {
  table: 'string (required)',           // Table name
  definition: 'string (required)'       // SQL schema definition
};

module.exports = {
  PluginInterface,
  MANIFEST_SCHEMA,
  ROUTE_SCHEMA,
  SCHEMA_SCHEMA
};
