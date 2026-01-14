const fs = require('fs');
const path = require('path');

/**
 * PluginValidator - Validates plugin structure before loading
 * Prevents malformed plugins from crashing the server
 */
class PluginValidator {
  constructor() {
    this.validHttpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
    this.knownMiddleware = ['auth']; // Expandable list
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate a plugin completely
   * @param {Object} plugin - Plugin module (with manifest, routes, schemas, etc.)
   * @param {string} pluginName - Name of the plugin
   * @param {string} pluginPath - Path to plugin directory
   * @returns {Object} { valid: boolean, errors: [], warnings: [] }
   */
  validate(plugin, pluginName, pluginPath) {
    this.errors = [];
    this.warnings = [];

    // Validate manifest (required)
    if (!this.validateManifest(plugin.manifest, pluginName)) {
      return this.getResult();
    }

    // Validate routes (optional)
    if (plugin.routes) {
      this.validateRoutes(plugin.routes, pluginName, pluginPath);
    }

    // Validate schemas (optional)
    if (plugin.schemas) {
      this.validateSchemas(plugin.schemas, pluginName);
    }

    // Validate dependencies (optional)
    if (plugin.manifest.dependencies) {
      this.validateDependencies(plugin.manifest.dependencies, pluginName);
    }

    return this.getResult();
  }

  /**
   * Validate plugin manifest structure
   * @param {Object} manifest - Plugin manifest
   * @param {string} pluginName - Plugin name
   * @returns {boolean} - True if valid
   */
  validateManifest(manifest, pluginName) {
    if (!manifest) {
      this.addError(`Plugin ${pluginName} is missing manifest`);
      return false;
    }

    // Required fields
    const requiredFields = ['name', 'version', 'description'];
    for (const field of requiredFields) {
      if (!manifest[field]) {
        this.addError(`Manifest missing required field: ${field}`);
      }
    }

    // Validate name format (lowercase, alphanumeric, hyphens only)
    if (manifest.name && !/^[a-z0-9-]+$/.test(manifest.name)) {
      this.addError(`Manifest name "${manifest.name}" must be lowercase alphanumeric with hyphens only`);
    }

    // Validate version format (semantic versioning)
    if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      this.addError(`Manifest version "${manifest.version}" must follow semantic versioning (e.g., 1.0.0)`);
    }

    // Validate description length
    if (manifest.description && manifest.description.length < 10) {
      this.addWarning(`Manifest description should be at least 10 characters (current: ${manifest.description.length})`);
    }

    // Validate dependencies format (if present)
    if (manifest.dependencies && !Array.isArray(manifest.dependencies)) {
      this.addError('Manifest dependencies must be an array');
    }

    return this.errors.length === 0;
  }

  /**
   * Validate plugin routes
   * @param {Array} routes - Array of route definitions
   * @param {string} pluginName - Plugin name
   * @param {string} pluginPath - Plugin directory path
   */
  validateRoutes(routes, pluginName, pluginPath) {
    if (!Array.isArray(routes)) {
      this.addError('Routes must be an array');
      return;
    }

    routes.forEach((route, index) => {
      // Validate required fields
      if (!route.method) {
        this.addError(`Route[${index}] missing required field: method`);
      }
      if (!route.path) {
        this.addError(`Route[${index}] missing required field: path`);
      }
      if (!route.handler) {
        this.addError(`Route[${index}] missing required field: handler`);
      }

      // Validate HTTP method
      if (route.method && !this.validHttpMethods.includes(route.method.toUpperCase())) {
        this.addError(`Route[${index}] invalid HTTP method: ${route.method}. Must be one of: ${this.validHttpMethods.join(', ')}`);
      }

      // Validate path format
      if (route.path && !route.path.startsWith('/')) {
        this.addError(`Route[${index}] path must start with /: ${route.path}`);
      }

      // Validate handler (must be string path or function)
      if (route.handler) {
        const handlerType = typeof route.handler;
        if (handlerType !== 'string' && handlerType !== 'function') {
          this.addError(`Route[${index}] handler must be a string (file path) or function`);
        }

        // If handler is a string path, check if file exists
        if (handlerType === 'string') {
          const handlerPath = path.resolve(pluginPath, route.handler);
          if (!fs.existsSync(handlerPath)) {
            this.addError(`Route[${index}] handler file not found: ${route.handler} (resolved to: ${handlerPath})`);
          }
        }
      }

      // Validate middleware (optional)
      if (route.middleware) {
        if (!Array.isArray(route.middleware)) {
          this.addError(`Route[${index}] middleware must be an array`);
        } else {
          route.middleware.forEach((mw, mwIndex) => {
            if (!this.knownMiddleware.includes(mw)) {
              this.addWarning(`Route[${index}] middleware[${mwIndex}] references unknown middleware: ${mw}`);
            }
          });
        }
      }
    });
  }

  /**
   * Validate plugin database schemas
   * @param {Array} schemas - Array of schema definitions
   * @param {string} pluginName - Plugin name
   */
  validateSchemas(schemas, pluginName) {
    if (!Array.isArray(schemas)) {
      this.addError('Schemas must be an array');
      return;
    }

    schemas.forEach((schema, index) => {
      // Validate required fields
      if (!schema.table) {
        this.addError(`Schema[${index}] missing required field: table`);
      }
      if (!schema.definition) {
        this.addError(`Schema[${index}] missing required field: definition`);
      }

      // Validate table naming convention
      if (schema.table && !schema.table.startsWith('plugin_')) {
        this.addWarning(`Schema[${index}] table name "${schema.table}" should start with "plugin_" for consistency`);
      }

      // Basic SQL validation
      if (schema.definition) {
        const sql = schema.definition.trim().toUpperCase();

        // Check for CREATE TABLE statement
        if (!sql.includes('CREATE TABLE')) {
          this.addError(`Schema[${index}] definition should contain CREATE TABLE statement`);
        }

        // Recommend IF NOT EXISTS
        if (!sql.includes('IF NOT EXISTS')) {
          this.addWarning(`Schema[${index}] should use "CREATE TABLE IF NOT EXISTS" for idempotency`);
        }

        // Check for dangerous SQL keywords
        const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER'];
        dangerousKeywords.forEach(keyword => {
          if (sql.includes(keyword)) {
            this.addWarning(`Schema[${index}] contains potentially destructive keyword: ${keyword}`);
          }
        });
      }
    });
  }

  /**
   * Validate plugin dependencies
   * @param {Array} dependencies - Array of plugin names this plugin depends on
   * @param {string} pluginName - Name of the plugin being validated
   */
  validateDependencies(dependencies, pluginName) {
    if (!Array.isArray(dependencies)) {
      this.addError('Dependencies must be an array');
      return;
    }

    // Check for self-dependency
    if (dependencies.includes(pluginName)) {
      this.addError(`Plugin cannot depend on itself`);
    }

    // Check for empty dependency names
    dependencies.forEach((dep, index) => {
      if (!dep || typeof dep !== 'string' || dep.trim() === '') {
        this.addError(`Dependency[${index}] must be a non-empty string`);
      }
    });

    // Note: Circular dependency detection would require loading all plugin manifests
    // This is a basic validation - deeper checks happen at runtime
    if (dependencies.length > 10) {
      this.addWarning(`Plugin has ${dependencies.length} dependencies - consider reducing complexity`);
    }
  }

  /**
   * Add an error to the validation results
   * @param {string} message - Error message
   */
  addError(message) {
    this.errors.push(message);
  }

  /**
   * Add a warning to the validation results
   * @param {string} message - Warning message
   */
  addWarning(message) {
    this.warnings.push(message);
  }

  /**
   * Get validation result
   * @returns {Object} { valid: boolean, errors: [], warnings: [] }
   */
  getResult() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Format validation result as a readable string
   * @param {Object} result - Validation result
   * @param {string} pluginName - Plugin name
   * @returns {string} - Formatted message
   */
  static formatResult(result, pluginName) {
    let output = [];

    if (result.valid) {
      output.push(`✅ Plugin "${pluginName}" passed validation`);
      if (result.warnings.length > 0) {
        output.push(`\n⚠️  Warnings (${result.warnings.length}):`);
        result.warnings.forEach((warning, i) => {
          output.push(`   ${i + 1}. ${warning}`);
        });
      }
    } else {
      output.push(`❌ Plugin "${pluginName}" failed validation`);
      output.push(`\n❌ Errors (${result.errors.length}):`);
      result.errors.forEach((error, i) => {
        output.push(`   ${i + 1}. ${error}`);
      });

      if (result.warnings.length > 0) {
        output.push(`\n⚠️  Warnings (${result.warnings.length}):`);
        result.warnings.forEach((warning, i) => {
          output.push(`   ${i + 1}. ${warning}`);
        });
      }
    }

    return output.join('\n');
  }
}

module.exports = PluginValidator;
