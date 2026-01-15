const https = require('https');
const http = require('http');
const path = require('path');
const { loadConfig } = require('../utils/config');

/**
 * API Client for CLI Plugin Management
 * Integrates with backend plugin management APIs from Story 4.1
 */
class PluginManagementAPIClient {
  constructor() {
    this.config = loadConfig();
    this.projectId = 'default';

    // Determine base URL from config or defaults
    const port = this.config.port || this.config.server?.port || 3000;
    this.baseAdminURL = `http://localhost:${port}/admin/api`;
    this.baseURL = this.baseAdminURL;

    // CLI authentication token (for now, we'll use a simple approach)
    this.authToken = null;
    this.sessionCookie = null;
  }

  /**
   * Set project ID for subsequent requests
   * @param {string} projectId 
   */
  setProject(projectId) {
    this.projectId = projectId;
    const port = this.config.port || this.config.server?.port || 3000;
    // If not default, use project-scoped URL
    if (projectId && projectId !== 'default') {
      this.baseURL = `http://localhost:${port}/admin/api/project/${projectId}`;
    } else {
      this.baseURL = this.baseAdminURL;
    }
  }

  /**
   * Initialize authentication for CLI operations
   * For now, we'll implement a simple admin session approach
   */
  async initialize() {
    try {
      // For CLI operations, we need to establish an admin session
      // This is a simplified approach for CLI access
      await this.establishAdminSession();
    } catch (error) {
      throw new Error(`Failed to initialize CLI API client: ${error.message}`);
    }
  }

  /**
   * Establish admin session for CLI operations
   * In a production system, this would use proper authentication
   */
  async establishAdminSession() {
    // For development, we'll use a simple session-based approach
    // In production, this would involve proper authentication
    try {
      const basePort = this.config.port || this.config.server?.port || 3000;
      const healthURL = `http://localhost:${basePort}/health`;
      const healthResponse = await this.makeHealthRequestDirect(healthURL);
      if (!healthResponse.ok) {
        throw new Error('Unable to connect to SSBackend server');
      }
    } catch (error) {
      throw new Error(`Unable to connect to SSBackend server: ${error.message}`);
    }
  }

  /**
   * Make HTTP request with proper error handling using built-in http module
   */
  async makeRequest(endpoint, method = 'GET', body = null, requireAuth = true) {
    // Handle both relative and absolute URLs
    let fullURL;
    if (endpoint.startsWith('http')) {
      fullURL = endpoint;
    } else {
      fullURL = this.baseURL + endpoint;
    }

    const url = new URL(fullURL);

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SSBackend-CLI',
        'X-CLI-Request': 'true'
      }
    };

    // For CLI operations, we'll attempt to bypass authentication temporarily
    // This is a development convenience - in production, proper authentication should be used
    if (requireAuth) {
      // For now, we'll handle the authentication at the route level
      // The CLI will provide helpful error messages if authentication fails
    }

    return new Promise((resolve, reject) => {
      const httpModule = url.protocol === 'https:' ? https : http;

      const req = httpModule.request(options, (res) => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            json: async () => {
              try {
                return JSON.parse(data);
              } catch (error) {
                throw new Error('Invalid JSON response');
              }
            }
          });
        });
      });

      req.on('error', (error) => {
        if (error.code === 'ECONNREFUSED') {
          reject(new Error('SSBackend server is not running. Please start the server first.'));
        } else {
          reject(error);
        }
      });

      // Send request body if present
      if (body && (method === 'POST' || method === 'PUT')) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Parse JSON response with error handling
   */
  async parseResponse(response) {
    try {
      const data = await response.json();

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          throw new Error('Admin authentication required. Please authenticate via web interface first.');
        }
        throw new Error(data.details || data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.message.includes('Invalid JSON')) {
        throw new Error('Invalid response from server');
      }
      throw error;
    }
  }

  /**
   * Get all plugins with status and metadata
   * Calls: GET /admin/api/plugins
   */
  async listPlugins() {
    const response = await this.makeRequest('/plugins');
    return this.parseResponse(response);
  }

  /**
   * Enable a plugin
   * Calls: POST /admin/api/plugins/{id}/enable
   */
  async enablePlugin(pluginId) {
    const response = await this.makeRequest(`/plugins/${pluginId}/enable`, 'POST');
    return this.parseResponse(response);
  }

  /**
   * Disable a plugin
   * Calls: POST /admin/api/plugins/{id}/disable
   */
  async disablePlugin(pluginId) {
    const response = await this.makeRequest(`/plugins/${pluginId}/disable`, 'POST');
    return this.parseResponse(response);
  }

  /**
   * Reload a plugin without server restart (Story 6.3 - Hot-Reload)
   * Calls: POST /admin/api/plugins/{id}/reload
   */
  async reloadPlugin(pluginId) {
    const response = await this.makeRequest(`/plugins/${pluginId}/reload`, 'POST');
    return this.parseResponse(response);
  }

  /**
   * Get plugin configuration and detailed information
   * Calls: GET /admin/api/plugins/{id}/config and GET /admin/api/plugins/{id}
   */
  async getPluginInfo(pluginId) {
    try {
      // Get basic plugin info
      const infoResponse = await this.makeRequest(`/plugins/${pluginId}`);
      const info = await this.parseResponse(infoResponse);

      return info;
    } catch (error) {
      // If the detailed endpoint doesn't work, fall back to basic list
      const listResponse = await this.listPlugins();
      const plugin = listResponse.data.plugins.find(p => p.id === pluginId);

      if (!plugin) {
        throw new Error(`Plugin '${pluginId}' not found`);
      }

      return {
        success: true,
        data: {
          plugin: plugin,
          configuration: { message: 'Configuration details not available via CLI' }
        }
      };
    }
  }

  /**
   * Validate the entire plugin system
   * Calls: POST /admin/api/plugins/validate
   */
  async validatePluginSystem() {
    const response = await this.makeRequest('/plugins/validate', 'POST');
    return this.parseResponse(response);
  }

  /**
   * Update plugin configuration
   * Calls: PUT /admin/api/plugins/{id}/config
   */
  async updatePluginConfiguration(pluginId, config) {
    const response = await this.makeRequest(`/plugins/${pluginId}/config`, 'PUT', config);
    return this.parseResponse(response);
  }

  /**
   * Check if server is running and accessible
   */
  async checkServerHealth() {
    try {
      // Try to connect to the base server (not admin endpoint)
      const port = this.config.port || this.config.server?.port || 3000;
      const response = await this.makeHealthRequest(port);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Make a simple health check request
   */
  async makeHealthRequest(port) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/health',
        method: 'GET'
      };

      const req = http.request(options, (res) => {
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });

      req.on('error', (error) => {
        resolve({ ok: false, error: error.message });
      });

      req.end();
    });
  }

  /**
   * Make a direct health check request (used in establishAdminSession)
   */
  async makeHealthRequestDirect(fullURL) {
    return new Promise((resolve, reject) => {
      const url = new URL(fullURL);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET'
      };

      const req = http.request(options, (res) => {
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300
        });
      });

      req.on('error', (error) => {
        resolve({ ok: false, error: error.message });
      });

      req.end();
    });
  }

  /**
   * Set authentication for subsequent requests
   * This is a simplified approach for CLI usage
   */
  setAuthenticationCookie(cookie) {
    this.sessionCookie = cookie;
  }
}

module.exports = PluginManagementAPIClient;