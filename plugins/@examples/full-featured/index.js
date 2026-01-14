/**
 * Full-Featured Example Plugin
 *
 * A comprehensive example demonstrating all plugin capabilities:
 * - Complete manifest with configuration
 * - CRUD routes with authentication
 * - Database schema with relationships
 * - Service layer for business logic
 * - Lifecycle hooks
 * - Error handling
 */

const manifest = {
  name: 'notes',
  version: '1.0.0',
  description: 'A notes management plugin demonstrating full plugin capabilities',
  author: 'SSBackend Examples',

  // SSBackend version compatibility
  ssbackend_version: '^1.0.0',

  // Plugin dependencies (none for this example)
  dependencies: [],

  // Configuration schema
  configSchema: {
    type: 'object',
    properties: {
      maxNotesPerUser: {
        type: 'number',
        default: 100,
        description: 'Maximum notes a user can create'
      },
      allowPublicNotes: {
        type: 'boolean',
        default: true,
        description: 'Allow users to create public notes'
      },
      maxNoteLength: {
        type: 'number',
        default: 5000,
        description: 'Maximum characters per note'
      }
    }
  },

  // Admin UI configuration
  adminUI: {
    enabled: true,
    navigation: {
      label: 'Notes',
      icon: '📝',
      group: 'plugins',
      priority: 50
    },
    routes: [
      {
        path: '/admin/notes',
        title: 'Notes Manager',
        icon: '📝',
        component: 'NotesView'
      }
    ]
  }
};

// Route definitions - CRUD operations
const routes = [
  // List all notes for authenticated user
  {
    method: 'GET',
    path: '/notes',
    handler: './routes/list.js',
    middleware: ['auth']
  },
  // Get a specific note
  {
    method: 'GET',
    path: '/notes/:id',
    handler: './routes/get.js',
    middleware: ['auth']
  },
  // Create a new note
  {
    method: 'POST',
    path: '/notes',
    handler: './routes/create.js',
    middleware: ['auth']
  },
  // Update a note
  {
    method: 'PUT',
    path: '/notes/:id',
    handler: './routes/update.js',
    middleware: ['auth']
  },
  // Delete a note
  {
    method: 'DELETE',
    path: '/notes/:id',
    handler: './routes/delete.js',
    middleware: ['auth']
  },
  // Get public notes (no auth required)
  {
    method: 'GET',
    path: '/notes/public/all',
    handler: './routes/public.js'
  }
];

// Database schema
const schemas = [
  {
    table: 'plugin_notes',
    definition: `
      CREATE TABLE IF NOT EXISTS plugin_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        is_public BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `
  },
  {
    table: 'plugin_notes_tags',
    definition: `
      CREATE TABLE IF NOT EXISTS plugin_notes_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        note_id INTEGER NOT NULL,
        tag TEXT NOT NULL,
        FOREIGN KEY (note_id) REFERENCES plugin_notes(id) ON DELETE CASCADE
      )
    `
  }
];

// Store for plugin services
let noteService = null;

async function onLoad(context) {
  console.log('📝 Notes plugin loading...');

  const { db, config } = context;

  // Initialize the notes service
  const NoteService = require('./services/NoteService');
  noteService = new NoteService(db, config);

  // Store service in context for route handlers
  context.noteService = noteService;

  console.log('📝 Notes plugin loaded with config:', {
    maxNotesPerUser: config.maxNotesPerUser || 100,
    allowPublicNotes: config.allowPublicNotes !== false
  });
}

async function onActivate(context) {
  console.log('📝 Notes plugin activating...');

  // Create indexes for better performance
  await createIndexes(context.db);

  console.log('📝 Notes plugin activated!');
}

async function onDeactivate(context) {
  console.log('📝 Notes plugin deactivating...');

  // Cleanup
  noteService = null;

  console.log('📝 Notes plugin deactivated');
}

// Helper to create indexes
async function createIndexes(db) {
  return new Promise((resolve) => {
    db.serialize(() => {
      db.run('CREATE INDEX IF NOT EXISTS idx_notes_user ON plugin_notes(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_notes_public ON plugin_notes(is_public)');
      db.run('CREATE INDEX IF NOT EXISTS idx_notes_tags_note ON plugin_notes_tags(note_id)', () => {
        resolve();
      });
    });
  });
}

module.exports = {
  manifest,
  routes,
  schemas,
  onLoad,
  onActivate,
  onDeactivate
};
