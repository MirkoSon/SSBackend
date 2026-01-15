const express = require('express');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../db/database');

const router = express.Router();

// Simple admin authentication
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  const adminSession = req.session?.adminAuthenticated;
  if (!adminSession) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  next();
};

/**
 * Admin login endpoint
 * POST /admin/login - Authenticate admin user
 */
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }

  // Set admin session
  if (!req.session) {
    return res.status(500).json({ error: 'Session management not available' });
  }

  req.session.adminAuthenticated = true;
  res.json({ message: 'Admin login successful' });
});

/**
 * Admin logout endpoint
 * POST /admin/logout - Clear admin session
 */
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.adminAuthenticated = false;
  }
  res.json({ message: 'Admin logout successful' });
});

/**
 * Check admin authentication status
 * GET /admin/status - Return authentication status
 */
router.get('/status', (req, res) => {
  const isAuthenticated = req.session?.adminAuthenticated || false;
  res.json({ authenticated: isAuthenticated });
});

/**
 * API Routes - All require admin authentication
 */

/**
 * GET /admin/api/users - Get all users with metadata
 */
router.get('/api/users', adminAuth, (req, res) => {
  try {
    const db = req.db; // Use project-specific database

    const query = `
      SELECT 
        id, 
        username, 
        created_at, 
        last_login, 
        COALESCE(login_count, 0) as login_count
      FROM users 
      ORDER BY created_at DESC
    `;

    db.all(query, (err, users) => {
      if (err) {
        console.error('Error fetching users:', err.message);
        return res.status(500).json({ error: 'Failed to fetch users' });
      }

      res.json({
        users: users,
        count: users.length,
        message: 'Users retrieved successfully'
      });
    });

  } catch (error) {
    console.error('Error in users endpoint:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/api/users/:id - Get detailed user information
 */
router.get('/api/users/:id', adminAuth, (req, res) => {
  try {
    const db = req.db; // Use project-specific database
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const userQuery = `
      SELECT 
        id, 
        username, 
        created_at, 
        last_login, 
        COALESCE(login_count, 0) as login_count
      FROM users 
      WHERE id = ?
    `;

    db.get(userQuery, [userId], (err, user) => {
      if (err) {
        console.error('Error fetching user:', err.message);
        return res.status(500).json({ error: 'Failed to fetch user' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        user: user,
        message: 'User details retrieved successfully'
      });
    });

  } catch (error) {
    console.error('Error in user detail endpoint:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/api/saves - Get all save data with preview
 */
router.get('/api/saves', adminAuth, (req, res) => {
  try {
    const db = req.db; // Use project-specific database

    const query = `
      SELECT 
        s.id,
        s.data,
        s.created_at,
        s.updated_at,
        LENGTH(s.data) as data_size
      FROM saves s
      ORDER BY s.updated_at DESC
    `;

    db.all(query, (err, saves) => {
      if (err) {
        console.error('Error fetching saves:', err.message);
        return res.status(500).json({ error: 'Failed to fetch saves' });
      }

      // Add data preview and parse JSON structure info
      const savesWithPreview = saves.map(save => {
        let dataPreview = 'No data';
        let dataStructure = {};
        let username = 'Unknown'; // We don't have user relationship in saves

        try {
          if (save.data) {
            const parsed = JSON.parse(save.data);
            dataPreview = JSON.stringify(parsed).substring(0, 100) + '...';
            dataStructure = {
              keys: Object.keys(parsed).length,
              topLevelKeys: Object.keys(parsed).slice(0, 5)
            };
          }
        } catch (e) {
          dataPreview = 'Invalid JSON';
        }

        return {
          id: save.id,
          username: username,
          data_preview: dataPreview,
          data_structure: dataStructure,
          data_size: save.data_size,
          created_at: save.created_at,
          updated_at: save.updated_at
        };
      });

      res.json({
        saves: savesWithPreview,
        count: saves.length,
        totalSize: saves.reduce((sum, save) => sum + (save.data_size || 0), 0),
        message: 'Saves retrieved successfully'
      });
    });

  } catch (error) {
    console.error('Error in saves endpoint:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/api/saves/:id - Get detailed save data
 */
router.get('/api/saves/:id', adminAuth, (req, res) => {
  try {
    const db = req.db; // Use project-specific database
    const saveId = req.params.id;

    const query = `
      SELECT 
        s.id,
        s.data,
        s.created_at,
        s.updated_at
      FROM saves s
      WHERE s.id = ?
    `;

    db.get(query, [saveId], (err, save) => {
      if (err) {
        console.error('Error fetching save:', err.message);
        return res.status(500).json({ error: 'Failed to fetch save' });
      }

      if (!save) {
        return res.status(404).json({ error: 'Save not found' });
      }

      // Parse and format the save data
      let formattedData = save.data;
      try {
        if (save.data) {
          formattedData = JSON.parse(save.data);
        }
      } catch (e) {
        console.warn('Save data is not valid JSON');
      }

      res.json({
        save: {
          id: save.id,
          username: 'Unknown', // No user relationship in current schema
          save_data: formattedData,
          created_at: save.created_at,
          updated_at: save.updated_at
        },
        message: 'Save details retrieved successfully'
      });
    });

  } catch (error) {
    console.error('Error in save detail endpoint:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/api/inventories - Get all user inventories
 */
router.get('/api/inventories', adminAuth, (req, res) => {
  try {
    const db = req.db; // Use project-specific database

    const query = `
      SELECT 
        i.user_id,
        u.username,
        i.item_id,
        i.quantity,
        i.created_at,
        i.updated_at
      FROM inventory i
      LEFT JOIN users u ON i.user_id = u.id
      ORDER BY u.username, i.item_id
    `;

    db.all(query, (err, inventoryItems) => {
      if (err) {
        console.error('Error fetching inventories:', err.message);
        return res.status(500).json({ error: 'Failed to fetch inventories' });
      }

      // Group by user for better organization
      const groupedInventories = inventoryItems.reduce((acc, item) => {
        const userId = item.user_id;
        if (!acc[userId]) {
          acc[userId] = {
            user_id: userId,
            username: item.username,
            items: [],
            total_items: 0,
            total_quantity: 0
          };
        }

        acc[userId].items.push({
          item_id: item.item_id,
          quantity: item.quantity,
          created_at: item.created_at,
          updated_at: item.updated_at
        });

        acc[userId].total_items += 1;
        acc[userId].total_quantity += item.quantity;

        return acc;
      }, {});

      const inventories = Object.values(groupedInventories);

      res.json({
        inventories: inventories,
        userCount: inventories.length,
        totalItems: inventoryItems.length,
        message: 'Inventories retrieved successfully'
      });
    });

  } catch (error) {
    console.error('Error in inventories endpoint:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/api/progress - Get all user progress and achievements
 */
router.get('/api/progress', adminAuth, (req, res) => {
  try {
    const db = req.db; // Use project-specific database

    // Query progress data from the character_progress table
    const progressQuery = `
      SELECT 
        p.user_id,
        u.username,
        p.metric_name,
        p.current_value,
        p.max_value,
        p.updated_at
      FROM character_progress p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.user_id, p.metric_name
    `;

    db.all(progressQuery, (err, progressData) => {
      if (err) {
        console.error('Error fetching progress:', err.message);
        return res.status(500).json({ error: 'Failed to fetch progress data' });
      }

      // Query achievements data from user_achievements + achievements tables  
      const achievementsQuery = `
        SELECT 
          ua.user_id,
          u.username,
          a.name as achievement_name,
          a.description,
          ua.unlocked_at,
          ua.progress_value
        FROM user_achievements ua
        LEFT JOIN users u ON ua.user_id = u.id
        LEFT JOIN achievements a ON ua.achievement_id = a.id
        ORDER BY u.username, ua.unlocked_at DESC
      `;

      db.all(achievementsQuery, (err, achievementsData) => {
        if (err) {
          console.error('Error fetching achievements:', err.message);
          return res.status(500).json({ error: 'Failed to fetch achievements data' });
        }

        // Group progress data by user
        const progressByUser = progressData.reduce((acc, progress) => {
          const userId = progress.user_id;
          if (!acc[userId]) {
            acc[userId] = {
              user_id: userId,
              username: progress.username,
              metrics: {},
              // Set defaults for common metrics
              level: 0,
              experience: 0,
              play_time: 0,
              last_active: null
            };
          }

          // Store all metrics
          acc[userId].metrics[progress.metric_name] = {
            current_value: progress.current_value,
            max_value: progress.max_value,
            updated_at: progress.updated_at
          };

          // Map common metric names to expected fields
          switch (progress.metric_name) {
            case 'level':
              acc[userId].level = progress.current_value;
              break;
            case 'experience':
              acc[userId].experience = progress.current_value;
              break;
            case 'play_time_minutes':
              acc[userId].play_time = progress.current_value;
              break;
          }

          // Update last_active to the most recent update
          if (!acc[userId].last_active || progress.updated_at > acc[userId].last_active) {
            acc[userId].last_active = progress.updated_at;
          }

          return acc;
        }, {});

        // Group achievements by user
        const achievementsByUser = achievementsData.reduce((acc, achievement) => {
          const userId = achievement.user_id;
          if (!acc[userId]) {
            acc[userId] = [];
          }

          acc[userId].push({
            achievement_name: achievement.achievement_name,
            description: achievement.description,
            unlocked_at: achievement.unlocked_at,
            progress_value: achievement.progress_value
          });

          return acc;
        }, {});

        // Combine progress and achievements data
        const combinedData = Object.values(progressByUser).map(progress => ({
          ...progress,
          achievements: achievementsByUser[progress.user_id] || [],
          achievement_count: (achievementsByUser[progress.user_id] || []).length
        }));

        res.json({
          progress: combinedData,
          userCount: combinedData.length,
          totalAchievements: achievementsData.length,
          message: 'Progress and achievements retrieved successfully'
        });
      });
    });

  } catch (error) {
    console.error('Error in progress endpoint:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/api/export/:type - Export data as JSON
 */
router.get('/api/export/:type', adminAuth, (req, res) => {
  try {
    const db = req.db; // Use project-specific database
    const exportType = req.params.type;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    let query, filename;

    switch (exportType) {
      case 'users':
        query = `
          SELECT id, username, created_at, last_login, login_count
          FROM users ORDER BY created_at
        `;
        filename = `users-export-${timestamp}.json`;
        break;

      case 'saves':
        query = `
          SELECT id, data, created_at, updated_at
          FROM saves ORDER BY updated_at DESC
        `;
        filename = `saves-export-${timestamp}.json`;
        break;

      case 'inventories':
        query = `
          SELECT i.user_id, u.username, i.item_id, i.quantity, i.created_at, i.updated_at
          FROM inventory i LEFT JOIN users u ON i.user_id = u.id
          ORDER BY u.username, i.item_id
        `;
        filename = `inventories-export-${timestamp}.json`;
        break;

      case 'progress':
        query = `
          SELECT p.user_id, u.username, p.metric_name, p.current_value, p.max_value, p.updated_at
          FROM character_progress p LEFT JOIN users u ON p.user_id = u.id
          ORDER BY p.user_id, p.metric_name
        `;
        filename = `progress-export-${timestamp}.json`;
        break;

      case 'achievements':
        query = `
          SELECT ua.user_id, u.username, a.name as achievement_name, a.description, ua.unlocked_at, ua.progress_value
          FROM user_achievements ua 
          LEFT JOIN users u ON ua.user_id = u.id
          LEFT JOIN achievements a ON ua.achievement_id = a.id
          ORDER BY u.username, ua.unlocked_at DESC
        `;
        filename = `achievements-export-${timestamp}.json`;
        break;

      case 'all':
        // For 'all' export, we'll return a comprehensive data dump
        const allQueries = [
          { name: 'users', query: 'SELECT * FROM users ORDER BY created_at' },
          { name: 'saves', query: 'SELECT * FROM saves ORDER BY updated_at DESC' },
          { name: 'inventory', query: 'SELECT * FROM inventory ORDER BY user_id, item_id' },
          { name: 'character_progress', query: 'SELECT * FROM character_progress ORDER BY user_id, metric_name' },
          { name: 'achievements', query: 'SELECT * FROM achievements ORDER BY id' },
          { name: 'user_achievements', query: 'SELECT * FROM user_achievements ORDER BY user_id, unlocked_at DESC' }
        ];

        const allData = {
          export_timestamp: new Date().toISOString(),
          export_type: 'complete_database_dump'
        };
        let completedQueries = 0;

        allQueries.forEach(({ name, query }) => {
          db.all(query, (err, rows) => {
            if (err) {
              console.error(`Error exporting ${name}:`, err.message);
              allData[name] = { error: err.message };
            } else {
              allData[name] = rows;
            }

            completedQueries++;
            if (completedQueries === allQueries.length) {
              res.setHeader('Content-Disposition', `attachment; filename="complete-export-${timestamp}.json"`);
              res.setHeader('Content-Type', 'application/json');
              res.json(allData);
            }
          });
        });
        return; // Exit early for 'all' case

      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    db.all(query, (err, rows) => {
      if (err) {
        console.error('Error exporting data:', err.message);
        return res.status(500).json({ error: 'Failed to export data' });
      }

      const exportData = {
        export_timestamp: new Date().toISOString(),
        export_type: exportType,
        record_count: rows.length,
        data: rows
      };

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      res.json(exportData);
    });

  } catch (error) {
    console.error('Error in export endpoint:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /admin/api/docs/:filename(*) - Get a documentation file as Markdown
 * Supports subdirectories (e.g., api/core-endpoints.md, architecture/overview.md)
 * Supports plugin docs (e.g., plugins/@core/economy/docs/api-reference.md)
 */
router.get('/api/docs/:filename(*)', adminAuth, (req, res) => {
  try {
    const filename = req.params.filename;

    // Security: Validate filename to prevent path traversal
    // Allow subdirectories, alphanumeric characters, dashes, underscores, @, slashes, and .md extension
    // Prevent .. (parent directory) and absolute paths
    if (!/^[a-zA-Z0-9\-_@\/]+\.md$/.test(filename) || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid documentation filename' });
    }

    let docsPath;
    let allowedDir;

    // Check if it's a plugin doc path
    if (filename.startsWith('plugins/')) {
      // Plugin documentation: plugins/@core/{pluginName}/docs/{docName}.md
      docsPath = path.join(__dirname, '..', '..', filename);
      allowedDir = path.join(__dirname, '..', '..', 'plugins');
    } else {
      // Regular documentation: docs/{path}/{docName}.md
      docsPath = path.join(__dirname, '..', '..', 'docs', filename);
      allowedDir = path.join(__dirname, '..', '..', 'docs');
    }

    // Security: Ensure resolved path is within allowed directory
    const resolvedPath = path.resolve(docsPath);
    const resolvedAllowedDir = path.resolve(allowedDir);
    if (!resolvedPath.startsWith(resolvedAllowedDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(docsPath)) {
      return res.status(404).json({ error: 'Documentation file not found' });
    }

    const content = fs.readFileSync(docsPath, 'utf8');
    res.json({
      filename: filename,
      content: content
    });
  } catch (error) {
    console.error('Error serving documentation:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
