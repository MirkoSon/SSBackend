const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request object
 */
function authenticateToken(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Add user info to request object
    req.user = {
      id: decoded.userId,
      username: decoded.username
    };

    next();

  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.message === 'Token expired') {
      return res.status(401).json({ 
        error: 'Access denied. Token expired.' 
      });
    } else if (error.message === 'Invalid token') {
      return res.status(401).json({ 
        error: 'Access denied. Invalid token.' 
      });
    } else {
      return res.status(401).json({ 
        error: 'Access denied. Token verification failed.' 
      });
    }
  }
}

/**
 * Optional authentication middleware
 * Sets user info if token is valid, but doesn't block request if missing
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.userId,
        username: decoded.username
      };
    }
  } catch (error) {
    // Ignore token errors for optional auth
    console.log('Optional auth failed:', error.message);
  }

  next();
}

module.exports = {
  authenticateToken,
  optionalAuth
};