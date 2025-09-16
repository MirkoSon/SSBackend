const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SESSIONS_FILE = path.join(__dirname, '..', 'data', 'sessions.json');

/**
 * TokenStore - Secure token management with production security enhancements
 * 
 * Security Features:
 * - Token Hash Storage: Full JWTs never stored, only SHA-256 hashes
 * - Token Hash Truncation: Session display shows only 8 characters for privacy
 * - Blacklist Size Limiting: Maintains max 1000 blacklisted tokens to prevent memory exhaustion
 * - Automatic Cleanup: Expired tokens removed automatically
 */

class TokenStore {
  constructor() {
    this.sessions = {
      validTokens: {},
      blacklistedTokens: []
    };
    this.loadSessions();
  }

  // Load existing sessions from file
  loadSessions() {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
        this.sessions = JSON.parse(data);
        console.log('Sessions loaded from file');
        this.cleanupExpiredTokens();
      } else {
        console.log('No existing session file found, starting fresh');
        this.saveSessions();
      }
    } catch (error) {
      console.error('Error loading sessions:', error.message);
      // Initialize with empty sessions if file is corrupted
      this.sessions = {
        validTokens: {},
        blacklistedTokens: []
      };
      this.saveSessions();
    }
  }

  // Save sessions to file
  saveSessions() {
    try {
      const dir = path.dirname(SESSIONS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(this.sessions, null, 2));
    } catch (error) {
      console.error('Error saving sessions:', error.message);
      throw new Error('Failed to save session data');
    }
  }

  // Generate token hash for storage (Production Security: avoid storing full JWT)
  // Uses SHA-256 to create a secure, irreversible hash of the token
  generateTokenHash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Add token to valid tokens
  addToken(token, userId, username, expiresAt) {
    const tokenHash = this.generateTokenHash(token);
    const now = new Date().toISOString();
    
    this.sessions.validTokens[tokenHash] = {
      userId,
      username,
      issuedAt: now,
      expiresAt,
      lastActivity: now
    };
    
    this.saveSessions();
    return tokenHash;
  }

  // Check if token is valid
  isValidToken(token) {
    const tokenHash = this.generateTokenHash(token);
    
    // Check if token is blacklisted
    if (this.sessions.blacklistedTokens.includes(tokenHash)) {
      return false;
    }
    
    // Check if token exists in valid tokens
    const tokenData = this.sessions.validTokens[tokenHash];
    if (!tokenData) {
      return false;
    }
    
    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expiresAt);
    if (now > expiresAt) {
      // Remove expired token
      delete this.sessions.validTokens[tokenHash];
      this.saveSessions();
      return false;
    }
    
    return true;
  }

  // Update token activity
  updateActivity(token) {
    const tokenHash = this.generateTokenHash(token);
    const tokenData = this.sessions.validTokens[tokenHash];
    
    if (tokenData) {
      tokenData.lastActivity = new Date().toISOString();
      this.saveSessions();
    }
  }

  // Get token data
  getTokenData(token) {
    const tokenHash = this.generateTokenHash(token);
    return this.sessions.validTokens[tokenHash] || null;
  }

  // Get all sessions for a user
  getUserSessions(userId) {
    const userSessions = [];
    
    for (const [tokenHash, tokenData] of Object.entries(this.sessions.validTokens)) {
      if (tokenData.userId === userId) {
        userSessions.push({
          tokenId: tokenHash.substring(0, 8), // Security Enhancement: Show only first 8 chars for privacy protection
          issuedAt: tokenData.issuedAt,
          lastActivity: tokenData.lastActivity,
          expiresAt: tokenData.expiresAt,
          current: false // Will be updated by caller
        });
      }
    }
    
    return userSessions.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  }

  // Invalidate token (add to blacklist)
  invalidateToken(token) {
    const tokenHash = this.generateTokenHash(token);
    
    // Add to blacklist if not already there
    if (!this.sessions.blacklistedTokens.includes(tokenHash)) {
      this.sessions.blacklistedTokens.push(tokenHash);
    }
    
    // Remove from valid tokens
    delete this.sessions.validTokens[tokenHash];
    
    this.saveSessions();
  }

  // Cleanup expired tokens
  cleanupExpiredTokens() {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [tokenHash, tokenData] of Object.entries(this.sessions.validTokens)) {
      const expiresAt = new Date(tokenData.expiresAt);
      if (now > expiresAt) {
        delete this.sessions.validTokens[tokenHash];
        cleanedCount++;
      }
    }
    
    // Clean up old blacklisted tokens (Production Security Enhancement)
    // Prevent blacklist from growing indefinitely - maintain max 1000 entries
    // This prevents potential memory exhaustion attacks while maintaining security
    const maxBlacklistSize = 1000;
    if (this.sessions.blacklistedTokens.length > maxBlacklistSize) {
      this.sessions.blacklistedTokens = this.sessions.blacklistedTokens.slice(-maxBlacklistSize);
      console.log(`Blacklist size limited to ${maxBlacklistSize} entries`);
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired tokens`);
      this.saveSessions();
    }
  }

  // Get session statistics
  getStats() {
    return {
      activeTokens: Object.keys(this.sessions.validTokens).length,
      blacklistedTokens: this.sessions.blacklistedTokens.length,
      lastCleanup: new Date().toISOString()
    };
  }
}

// Create singleton instance
const tokenStore = new TokenStore();

// Cleanup expired tokens every hour
setInterval(() => {
  tokenStore.cleanupExpiredTokens();
}, 60 * 60 * 1000);

module.exports = tokenStore;
