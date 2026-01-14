const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

/**
 * TODO [EPIC 7 - Multi-Project Support]:
 * Config format will need to support multiple projects.
 * New structure:
 * ```yaml
 * server:
 *   port: 3000
 *   default_project: default
 * projects:
 *   - id: default
 *     name: "Default Project"
 *     database: "./projects/default.db"
 *     plugins: {...}
 *   - id: game-rpg
 *     name: "RPG Game"
 *     database: "./projects/game-rpg.db"
 *     plugins: {...}
 * ```
 * Auto-migration needed to convert existing single-project configs.
 * See: docs/multi-project-architecture-design.md, Story 7.1.2
 */

const CONFIG_FILE = 'config.yml';
let currentConfig = null;

/**
 * Default configuration with comments and secure defaults
 */
const DEFAULT_CONFIG = {
  // Server configuration
  server: {
    port: 3000,                    // Default port for the API server
    host: 'localhost'              // Host to bind to
  },
  
  // Database configuration
  database: {
    file: 'game.db',              // SQLite database file path
    init_on_startup: true        // Whether to initialize DB schema on startup
  },
  
  // Authentication configuration
  auth: {
    jwt_secret: null,             // JWT signing secret (generated automatically)
    jwt_expires_in: '24h',        // JWT token expiration time
    session_secret: null          // Express session secret (generated automatically)
  },
  
  // Development settings
  dev: {
    enable_logging: true,         // Enable request logging
    enable_cors: false           // Enable CORS for development
  }
};

/**
 * Generates a secure random string for secrets
 * @param {number} length - Length of the random string in bytes
 * @returns {string} Hex-encoded random string
 */
function generateSecureSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Creates a YAML configuration file with comments
 * @param {Object} config - Configuration object
 * @param {string} filePath - Path to save the config file
 */
function createConfigFile(config, filePath) {
  // Generate secure secrets
  config.auth.jwt_secret = generateSecureSecret(32);
  config.auth.session_secret = generateSecureSecret(24);

  const configYaml = `# Stupid Simple Backend Configuration
# This file was automatically generated on startup
# You can modify these values and restart the server to apply changes

# Server configuration
server:
  port: ${config.server.port}              # Port for the API server
  host: "${config.server.host}"           # Host to bind to (use "0.0.0.0" for external access)

# Database configuration  
database:
  file: "${config.database.file}"         # SQLite database file path
  init_on_startup: ${config.database.init_on_startup}      # Initialize DB schema on startup

# Authentication configuration
auth:
  jwt_secret: "${config.auth.jwt_secret}"        # JWT signing secret (keep this secure!)
  jwt_expires_in: "${config.auth.jwt_expires_in}"     # JWT token expiration time
  session_secret: "${config.auth.session_secret}"     # Express session secret

# Development settings
dev:
  enable_logging: ${config.dev.enable_logging}           # Enable request logging
  enable_cors: ${config.dev.enable_cors}              # Enable CORS for development
`;

  fs.writeFileSync(filePath, configYaml, 'utf8');
}

/**
 * Loads configuration from file or creates default if missing
 * @param {string} configPath - Path to the configuration file (optional)
 * @returns {Object} Loaded configuration object
 */
function loadConfig(configPath = CONFIG_FILE) {
  const fullPath = path.resolve(configPath);
  
  try {
    // Check if config file exists
    if (!fs.existsSync(fullPath)) {
      console.log(`⚡ Configuration file not found: ${configPath}`);
      console.log('📝 Creating default configuration...');
      
      // Create default config with secure secrets
      const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // Deep copy
      createConfigFile(config, fullPath);
      
      console.log(`✅ Created configuration file: ${configPath}`);
      console.log('🔒 Generated secure JWT and session secrets');
      console.log('💡 You can edit this file to customize your settings');
      
      currentConfig = config;
      return config;
    }
    
    // Load existing config file
    console.log(`📋 Loading configuration from: ${configPath}`);
    const configData = fs.readFileSync(fullPath, 'utf8');
    const config = yaml.load(configData);
    
    // Validate required fields
    if (!config.auth || !config.auth.jwt_secret) {
      throw new Error('Invalid configuration: missing auth.jwt_secret');
    }
    
    console.log('✅ Configuration loaded successfully');
    currentConfig = config;
    return config;
    
  } catch (error) {
    console.error(`❌ Error loading configuration: ${error.message}`);
    
    // If there's an error with the existing config, create a backup and generate new one
    if (fs.existsSync(fullPath)) {
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      console.log(`📋 Backing up corrupted config to: ${backupPath}`);
      fs.copyFileSync(fullPath, backupPath);
    }
    
    console.log('🔧 Generating new default configuration...');
    const config = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // Deep copy
    createConfigFile(config, fullPath);
    
    console.log(`✅ Created new configuration file: ${configPath}`);
    currentConfig = config;
    return config;
  }
}

/**
 * Gets a configuration value using dot notation
 * @param {string} key - Dot-notation key (e.g., 'auth.jwt_secret')
 * @param {*} defaultValue - Default value if key not found
 * @returns {*} Configuration value
 */
function getConfigValue(key, defaultValue = null) {
  if (!currentConfig) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  
  const keys = key.split('.');
  let value = currentConfig;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return defaultValue;
    }
  }
  
  return value;
}

/**
 * Updates a configuration value and saves to file
 * @param {string} key - Dot-notation key (e.g., 'plugins.achievements.enabled')
 * @param {*} value - New value to set
 * @param {string} configPath - Path to the configuration file (optional)
 */
function updateConfig(key, value, configPath = CONFIG_FILE) {
  if (!currentConfig) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }

  const keys = key.split('.');
  let target = currentConfig;
  
  // Navigate to the parent object
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!target[k] || typeof target[k] !== 'object') {
      target[k] = {};
    }
    target = target[k];
  }
  
  // Set the final value
  target[keys[keys.length - 1]] = value;
  
  // Save to file
  const fullPath = path.resolve(configPath);
  const configYaml = yaml.dump(currentConfig, {
    indent: 2,
    lineWidth: -1,
    noArrayIndent: false,
    skipInvalid: false,
    flowLevel: -1
  });
  
  fs.writeFileSync(fullPath, configYaml, 'utf8');
}

module.exports = {
  loadConfig,
  getConfigValue,
  updateConfig,
  DEFAULT_CONFIG
};
