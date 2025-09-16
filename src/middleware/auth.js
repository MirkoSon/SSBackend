const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request object
 * Now includes token store validation and activity tracking
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

    // Verify token (now includes token store validation and activity tracking)
    const decoded = verifyToken(token);

    // Add user info to request object
    req.user = {
      id: decoded.userId,
      username: decoded.username
    };

    // Store token in request for logout and session management
    req.token = token;

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
    } else if (error.message === 'Token is invalid or has been revoked') {
      return res.status(401).json({ 
        error: 'Access denied. Token has been revoked.' 
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
 * Now includes token store validation
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
      req.token = token;
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
