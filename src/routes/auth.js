const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { getDatabase } = require('../db/database');
const { generateToken, refreshToken, invalidateToken, getUserSessions, getTokenStoreStats } = require('../utils/jwt');
const { authenticateToken } = require('../middleware/auth');
const { validatePassword } = require('../utils/passwordValidator');

const logStream = fs.createWriteStream(path.join(__dirname, '..', 'auth.log'), { flags: 'a' });

const router = express.Router();

// Security configuration
const SALT_ROUNDS = 10; // For bcrypt password hashing

/**
 * POST /auth/register - Register new user
 * Body: { username: string, password: string }
 */
router.post('/register', (req, res) => {
  logStream.write('REGISTER_ROUTE_HIT: ' + JSON.stringify(req.body) + '\n');
  const { username, password } = req.body;

  // Validate input
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required and must be a string' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required and must be a string' });
  }

  // Basic username validation
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  // Enhanced password validation
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ 
      error: 'Password does not meet requirements',
      details: passwordValidation.errors
    });
  }

  try {
    const db = req.db; // Use project-specific database
    
    // Check if username already exists
    const checkQuery = 'SELECT id FROM users WHERE username = ?';
    
    db.get(checkQuery, [username], (err, existingUser) => {
      if (err) {
        console.error('Database error checking username:', err.message);
        return res.status(500).json({ error: 'Failed to check username availability' });
      }

      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      // Hash password before storing (Production Security Enhancement)
      bcrypt.hash(password, SALT_ROUNDS, (hashErr, hashedPassword) => {

        if (hashErr) {
          console.error('Error hashing password:', hashErr.message);
          return res.status(500).json({ error: 'Failed to process password' });
        }

        // Insert new user with hashed password
        const insertQuery = `
          INSERT INTO users (username, password, login_count) 
          VALUES (?, ?, 0)
        `;

        db.run(insertQuery, [username, hashedPassword], function(err) {
          if (err) {
            console.error('Database error creating user:', err.message);
            return res.status(500).json({ error: 'Failed to create user' });
          }

          res.status(201).json({
            id: this.lastID,
            username: username,
            message: 'User created successfully'
          });
        });
      });
    });

  } catch (error) {
    console.error('Error registering user:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/login - User login
 * Body: { username: string, password: string }
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const db = req.db; // Use project-specific database
    
    // Find user by username
    const query = 'SELECT id, username, password, created_at, last_login, login_count FROM users WHERE username = ?';
    
    db.get(query, [username], (err, user) => {
      if (err) {
        console.error('Database error during login:', err.message);
        return res.status(500).json({ error: 'Login failed' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Compare password with hashed version (Production Security Enhancement)
      bcrypt.compare(password, user.password, (compareErr, isMatch) => {
        if (compareErr) {
          console.error('Error comparing password:', compareErr.message);
          return res.status(500).json({ error: 'Login failed' });
        }

        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update login statistics
        const updateQuery = `
          UPDATE users 
          SET last_login = CURRENT_TIMESTAMP, 
              login_count = COALESCE(login_count, 0) + 1 
          WHERE id = ?
        `;
        
        db.run(updateQuery, [user.id], (updateErr) => {
          if (updateErr) {
            console.error('Error updating login stats:', updateErr.message);
          }
        });

        // Generate JWT token with enhanced info
        const tokenInfo = generateToken({
          id: user.id,
          username: user.username
        });

        res.json({
          token: tokenInfo.token,
          expiresAt: tokenInfo.expiresAt,
          user: {
            id: user.id,
            username: user.username
          },
          message: 'Login successful'
        });
      });
    });

  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/refresh - Refresh JWT token
 * Headers: Authorization: Bearer <jwt_token>
 */
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    const oldToken = req.token;
    const tokenInfo = refreshToken(oldToken);

    res.json({
      token: tokenInfo.token,
      expiresAt: tokenInfo.expiresAt,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Error refreshing token:', error.message);
    res.status(401).json({ error: 'Failed to refresh token' });
  }
});

/**
 * GET /auth/sessions - Get user's active sessions
 * Headers: Authorization: Bearer <jwt_token>
 */
router.get('/sessions', authenticateToken, (req, res) => {
  try {
    const sessions = getUserSessions(req.user.id, req.token);

    res.json({
      sessions: sessions,
      message: 'User sessions retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving sessions:', error.message);
    res.status(500).json({ error: 'Failed to retrieve sessions' });
  }
});

/**
 * POST /auth/logout - Logout and invalidate token
 * Headers: Authorization: Bearer <jwt_token>
 */
router.post('/logout', authenticateToken, (req, res) => {
  try {
    invalidateToken(req.token);

    res.json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Error during logout:', error.message);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /auth/profile - Get current user profile
 * Headers: Authorization: Bearer <jwt_token>
 */
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const db = req.db; // Use project-specific database
    
    // Get complete user information
    const query = `
      SELECT id, username, created_at, last_login, 
             COALESCE(login_count, 0) as login_count 
      FROM users WHERE id = ?
    `;
    
    db.get(query, [req.user.id], (err, user) => {
      if (err) {
        console.error('Database error retrieving profile:', err.message);
        return res.status(500).json({ error: 'Failed to retrieve profile' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get session information
      const sessions = getUserSessions(req.user.id, req.token);
      const currentSession = sessions.find(s => s.current);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          createdAt: user.created_at,
          lastLogin: user.last_login,
          loginCount: user.login_count
        },
        session: {
          activeSessions: sessions.length,
          currentSession: currentSession ? {
            issuedAt: currentSession.issuedAt,
            lastActivity: currentSession.lastActivity,
            expiresAt: currentSession.expiresAt
          } : null
        },
        message: 'Profile retrieved successfully'
      });
    });

  } catch (error) {
    console.error('Error retrieving profile:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /auth/me - Get current user info (protected route) - LEGACY ENDPOINT
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: req.user,
    message: 'Authenticated user information'
  });
});

/**
 * GET /auth/stats - Get token store statistics (development/debugging)
 * Headers: Authorization: Bearer <jwt_token>
 */
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const stats = getTokenStoreStats();
    
    res.json({
      tokenStore: stats,
      message: 'Token store statistics'
    });

  } catch (error) {
    console.error('Error retrieving stats:', error.message);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

module.exports = router;
