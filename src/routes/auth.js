const express = require('express');
const { getDatabase } = require('../db/database');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

/**
 * POST /auth/register - Register new user
 * Body: { username: string, password: string }
 */
router.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required and must be a string' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required and must be a string' });
  }

  // Basic validation
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  try {
    const db = getDatabase();
    
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

      // Insert new user (plaintext password for prototype)
      const insertQuery = `
        INSERT INTO users (username, password) 
        VALUES (?, ?)
      `;

      db.run(insertQuery, [username, password], function(err) {
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

  } catch (error) {
    console.error('Error registering user:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
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
    const db = getDatabase();
    
    // Find user by username
    const query = 'SELECT id, username, password FROM users WHERE username = ?';
    
    db.get(query, [username], (err, user) => {
      if (err) {
        console.error('Database error during login:', err.message);
        return res.status(500).json({ error: 'Login failed' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password (plaintext comparison for prototype)
      if (user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = generateToken({
        id: user.id,
        username: user.username
      });

      res.json({
        token: token,
        user: {
          id: user.id,
          username: user.username
        },
        message: 'Login successful'
      });
    });

  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /auth/me - Get current user info (protected route)
 */
router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
  res.json({
    user: req.user,
    message: 'Authenticated user information'
  });
});
