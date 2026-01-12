const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

// Load configuration (handles missing config.yml automatically)
const { loadConfig, getConfigValue } = require('./utils/config');
const config = loadConfig();

// Initialize JWT with configuration
const { initializeJWT } = require('./utils/jwt');
initializeJWT(config);

// Parse command-line arguments
const args = process.argv.slice(2);
let customPort = null;

// Parse command-line arguments
const EnhancedPluginCLI = require('./cli/enhancedPluginCLI');
const pluginCLI = new EnhancedPluginCLI();

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    customPort = parseInt(args[i + 1]);
    i++; // Skip the next argument since we used it as the port value
  } else if (args[i] === 'plugins') {
    // Handle plugin commands
    pluginCLI.handlePluginCommand(args.slice(i)).then(() => {
      process.exit(0);
    }).catch(error => {
      console.error('❌ Plugin command failed:', error.message);
      process.exit(1);
    });
    return; // Exit early for plugin commands
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
🎮 Stupid Simple Backend

Usage:
  ssbackend [options]
  ssbackend plugins <command> [options]

Options:
  --port <number>    Set custom port (default: 3000)
  --help, -h         Show this help message

Plugin Commands:
  plugins list [--verbose]         List all available plugins with status
  plugins enable <name|number>     Enable a plugin by name or list number
  plugins disable <name|number>    Disable a plugin by name or list number
  plugins info <name|number>       Show detailed plugin information
  plugins validate                 Validate plugin system health and configuration
  plugins install <path>           Install external plugin from path
  plugins remove <name|number>     Remove external plugin (internal plugins protected)

Environment Variables:
  PORT               Set port via environment variable

Examples:
  ssbackend                         # Run on default port 3000
  ssbackend --port 8080             # Run on port 8080
  ssbackend plugins list            # List all plugins
  ssbackend plugins list --verbose  # List plugins with detailed information
  ssbackend plugins enable economy  # Enable economy plugin
  ssbackend plugins enable 1        # Enable first plugin in list
  ssbackend plugins info economy    # Show detailed economy plugin information
  ssbackend plugins validate        # Check plugin system health

API Endpoints:
  GET  /health                         # Health check
  POST /save                          # Save game data
  GET  /save/:id                      # Load game data
  POST /auth/register                 # Register user
  POST /auth/login                    # Login user
  POST /inventory/add                 # Add inventory item
  GET  /inventory/:userId             # Get user inventory
  DELETE /inventory/:userId/:itemId   # Remove inventory item
  GET  /achievements/*                # Achievement endpoints (via plugins)
  GET  /admin                         # Admin dashboard (web-based plugin management)

Plugin Management:
  • CLI operations require SSBackend server to be running
  • CLI uses same backend APIs as web admin interface
  • Authentication required for plugin management operations
  • Visit http://localhost:3000/admin for web-based management
`);
    process.exit(0);
  }
}

// Import routes
const saveRoutes = require('./routes/save');
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const progressRoutes = require('./routes/progress');
// Note: achievements routes are now handled by plugin system
const adminRoutes = require('./routes/admin');

// Import database initialization
const { initializeDatabase } = require('./db/database');
const { initializeEpic4Database } = require('./db/migrations/epic4-tables');
const { initializeEpic4EconomyDatabase } = require('./db/migrations/epic4-economy-tables.js');

// Import plugin system
const PluginManager = require('./plugins/PluginManager');

const app = express();

// Port configuration with priority: CLI args > Environment variable > Config file > Default
const PORT = customPort || process.env.PORT || getConfigValue('server.port', 3000);

// Validate port
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error('❌ Error: Port must be a number between 1 and 65535');
  console.error(`   Provided: ${PORT}`);
  process.exit(1);
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware for admin authentication
app.use(session({
  secret: process.env.SESSION_SECRET || getConfigValue('auth.session_secret', 'admin-session-secret-key'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files for admin dashboard
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));

// Serve static files for plugins (including internal plugin UI components)
app.use('/plugins', express.static(path.join(__dirname, 'plugins')));

// Serve UI components from src/ui for admin interface
app.use('/ui', express.static(path.join(__dirname, 'ui')));

// Admin dashboard route - serve index.html for /admin path
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'index.html'));
});

// Admin login page
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin', 'login.html'));
});

// Basic request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/save', saveRoutes);
app.use('/auth', authRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/progress', progressRoutes);
// Note: /achievements routes are now handled by plugin system
app.use('/admin', adminRoutes);
app.use('/admin/api', require('./routes/admin/plugins')); // NEW: Plugin management API routes


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    // Initialize Epic 4 database features
    await initializeEpic4Database();
    await initializeEpic4EconomyDatabase();
    
    // Get database instance
    const { getDatabase } = require('./db/database');
    const db = getDatabase();
    
    // Initialize plugin system BEFORE middleware setup
    console.log('🔌 Initializing Plugin System...');
    const pluginManager = new PluginManager();
    await pluginManager.initialize(app, db);
    
    // Setup error handling and 404 after plugins are loaded
    setupFinalMiddleware();
    
    app.listen(PORT, () => {
      console.log(`🎮 Stupid Simple Backend running on port ${PORT}`);
      console.log(`📡 Server URL: http://localhost:${PORT}`);
      console.log(`🔧 Admin Dashboard: http://localhost:${PORT}/admin`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Save API: http://localhost:${PORT}/save`);
      console.log(`Auth API: http://localhost:${PORT}/auth`);
      console.log(`Inventory API: http://localhost:${PORT}/inventory`);
      console.log(`Progress API: http://localhost:${PORT}/progress`);
      console.log(`Achievements API: http://localhost:${PORT}/achievements (via plugins)`);
      console.log(`💡 Use --help for usage options`);
      console.log(`🔌 Use "ssbackend plugins list" to manage plugins`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Setup final middleware after plugins are loaded
function setupFinalMiddleware() {
  // Basic error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  // 404 handler (must be last)
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
}

startServer();

module.exports = app;