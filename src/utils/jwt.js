const jwt = require('jsonwebtoken');
const tokenStore = require('./tokenStore');

// In-memory signing key for prototype simplicity
const JWT_SECRET = 'game-backend-simulator-secret-key-2025';

// Token expiration: 7 days (as per session management requirements)
const JWT_EXPIRATION = '7d';

/**
 * Generate JWT token for user and store it
 * @param {Object} user - User object with id and username
 * @returns {Object} Token info with token and expiration
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    username: user.username
  };

  const token = jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRATION 
  });

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // Store token in persistent storage
  tokenStore.addToken(token, user.id, user.username, expiresAt.toISOString());

  return {
    token,
    expiresAt: expiresAt.toISOString()
  };
}

/**
 * Verify JWT token with persistent storage check
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid, expired, or blacklisted
 */
function verifyToken(token) {
  // First check if token is valid in our store
  if (!tokenStore.isValidToken(token)) {
    throw new Error('Token is invalid or has been revoked');
  }

  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Update token activity
    tokenStore.updateActivity(token);
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      // Remove expired token from store
      tokenStore.invalidateToken(token);
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Refresh token - generate new token with extended expiration
 * @param {string} oldToken - Current valid token
 * @returns {Object} New token info with token and expiration
 * @throws {Error} If old token is invalid
 */
function refreshToken(oldToken) {
  // Verify old token is valid
  const decoded = verifyToken(oldToken);
  
  // Get user info from token store
  const tokenData = tokenStore.getTokenData(oldToken);
  if (!tokenData) {
    throw new Error('Token not found in session store');
  }

  // Invalidate old token
  tokenStore.invalidateToken(oldToken);

  // Generate new token
  const user = {
    id: decoded.userId,
    username: decoded.username
  };

  return generateToken(user);
}

/**
 * Invalidate token (logout)
 * @param {string} token - Token to invalidate
 */
function invalidateToken(token) {
  tokenStore.invalidateToken(token);
}

/**
 * Get user sessions
 * @param {number} userId - User ID
 * @param {string} currentToken - Current token to mark as active
 * @returns {Array} Array of user sessions
 */
function getUserSessions(userId, currentToken = null) {
  const sessions = tokenStore.getUserSessions(userId);
  
  // Mark current token if provided
  if (currentToken) {
    const currentTokenHash = tokenStore.generateTokenHash(currentToken).substring(0, 8);
    const currentSession = sessions.find(s => s.tokenId === currentTokenHash);
    if (currentSession) {
      currentSession.current = true;
    }
  }
  
  return sessions;
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null if not found
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Get token store statistics
 * @returns {Object} Token store stats
 */
function getTokenStoreStats() {
  return tokenStore.getStats();
}

module.exports = {
  generateToken,
  verifyToken,
  refreshToken,
  invalidateToken,
  getUserSessions,
  extractTokenFromHeader,
  getTokenStoreStats,
  JWT_SECRET,
  JWT_EXPIRATION
};
