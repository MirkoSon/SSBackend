const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

// Parse command-line arguments
const args = process.argv.slice(2);
let customPort = null;

// Parse command-line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    customPort = parseInt(args[i + 1]);
    i++; // Skip the next argument since we used it as the port value
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
🎮 Stupid Simple Backend

Usage:
  ssbackend [options]

Options:
  --port <number>    Set custom port (default: 3000)
  --help, -h         Show this help message

Environment Variables:
  PORT               Set port via environment variable

Examples:
  ssbackend                    # Run on default port 3000
  ssbackend --port 8080        # Run on port 8080
  PORT=8080 ssbackend          # Run on port 8080 via env var

API Endpoints:
  GET  /health                         # Health check
  POST /save                          # Save game data
  GET  /save/:id                      # Load game data
  POST /auth/register                 # Register user
  POST /auth/login                    # Login user
  POST /inventory/add                 # Add inventory item
  GET  /inventory/:userId             # Get user inventory
  DELETE /inventory/:userId/:itemId   # Remove inventory item
`);
    process.exit(0);
  }
}

// Import routes
const saveRoutes = require('./routes/save');
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');

// Import database initialization
const { initializeDatabase } = require('./db/database');

const app = express();

// Port configuration with priority: CLI args > Environment variable > Default
const PORT = customPort || process.env.PORT || 3000;

// Validate port
if (isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error('❌ Error: Port must be a number between 1 and 65535');
  console.error(`   Provided: ${PORT}`);
  process.exit(1);
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Basic request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/save', saveRoutes);
app.use('/auth', authRoutes);
app.use('/inventory', inventoryRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`🎮 Stupid Simple Backend running on port ${PORT}`);
      console.log(`📡 Server URL: http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Save API: http://localhost:${PORT}/save`);
      console.log(`Auth API: http://localhost:${PORT}/auth`);
      console.log(`Inventory API: http://localhost:${PORT}/inventory`);
      console.log(`💡 Use --help for usage options`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;