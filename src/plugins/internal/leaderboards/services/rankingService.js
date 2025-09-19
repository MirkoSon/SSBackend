const { getDatabase } = require('../../../../db/database');

/**
 * Ranking Service - Handles efficient ranking queries and position calculations
 */
class RankingService {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get paginated rankings for a leaderboard
   */
  async getRankings(leaderboardId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      includeUserData = true
    } = options;
    
    // Validate inputs
    if (limit > 100) {
      throw new Error('Maximum limit is 100 entries per request');
    }
    
    // Get leaderboard info
    const leaderboard = await this.getLeaderboard(leaderboardId);
    if (!leaderboard) {
      throw new Error(`Leaderboard '${leaderboardId}' not found`);
    }
    
    // Main ranking query with proper tie handling
    let rankingsQuery = `
      SELECT 
        e.user_id,
        e.score,
        e.metadata,
        e.submitted_at,
        RANK() OVER (ORDER BY e.score DESC, e.submitted_at ASC) as rank
    `;
    
    if (includeUserData) {
      rankingsQuery += `, u.username`;
    }
    
    rankingsQuery += `
      FROM plugin_leaderboard_entries e
    `;
    
    if (includeUserData) {
      rankingsQuery += ` LEFT JOIN users u ON e.user_id = u.id`;
    }
    
    rankingsQuery += `
      WHERE e.leaderboard_id = ?
      ORDER BY e.score DESC, e.submitted_at ASC
      LIMIT ? OFFSET ?
    `;
    
    const rankings = this.db.prepare(rankingsQuery).all(leaderboardId, limit, offset);
    
    // Get total count for pagination
    const countQuery = 'SELECT COUNT(*) as total FROM plugin_leaderboard_entries WHERE leaderboard_id = ?';
    const { total } = this.db.prepare(countQuery).get(leaderboardId);
    
    return {
      leaderboard: {
        id: leaderboard.id,
        name: leaderboard.name,
        type: leaderboard.type
      },
      rankings: rankings.map(row => ({
        rank: row.rank,
        userId: row.user_id,
        username: row.username || null,
        score: row.score,
        metadata: JSON.parse(row.metadata || '{}'),
        submittedAt: row.submitted_at
      })),
      pagination: {
        total,
        limit,
        offset,
        hasNext: offset + limit < total,
        hasPrevious: offset > 0
      }
    };
  }

  /**
   * Get user's position in leaderboard
   */
  async getUserPosition(leaderboardId, userId) {
    // Verify leaderboard exists
    const leaderboard = await this.getLeaderboard(leaderboardId);
    if (!leaderboard) {
      throw new Error(`Leaderboard '${leaderboardId}' not found`);
    }
    
    // Get user's best score and rank
    const userQuery = `
      WITH ranked_scores AS (
        SELECT 
          user_id,
          score,
          metadata,
          submitted_at,
          RANK() OVER (ORDER BY score DESC, submitted_at ASC) as rank
        FROM plugin_leaderboard_entries
        WHERE leaderboard_id = ?
      )
      SELECT 
        r.user_id,
        r.score,
        r.metadata,
        r.submitted_at,
        r.rank,
        u.username
      FROM ranked_scores r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.user_id = ?
    `;
    
    const userRank = this.db.prepare(userQuery).get(leaderboardId, userId);
    
    if (!userRank) {
      return {
        leaderboard: {
          id: leaderboard.id,
          name: leaderboard.name,
          type: leaderboard.type
        },
        user: null,
        message: 'User has no scores in this leaderboard'
      };
    }
    
    // Get total entries count
    const countQuery = 'SELECT COUNT(*) as total FROM plugin_leaderboard_entries WHERE leaderboard_id = ?';
    const { total } = this.db.prepare(countQuery).get(leaderboardId);
    
    return {
      leaderboard: {
        id: leaderboard.id,
        name: leaderboard.name,
        type: leaderboard.type
      },
      user: {
        userId: userRank.user_id,
        username: userRank.username || null,
        rank: userRank.rank,
        score: userRank.score,
        metadata: JSON.parse(userRank.metadata || '{}'),
        submittedAt: userRank.submitted_at,
        totalEntries: total
      }
    };
  }

  /**
   * Get rankings around a specific user
   */
  async getRankingsAroundUser(leaderboardId, userId, options = {}) {
    const { range = 10, includeUserData = true } = options;
    
    // First get user's position
    const userPosition = await this.getUserPosition(leaderboardId, userId);
    
    if (!userPosition.user) {
      return userPosition; // User not found in leaderboard
    }
    
    const userRank = userPosition.user.rank;
    
    // Calculate offset to center around user
    const offset = Math.max(0, userRank - Math.floor(range / 2) - 1);
    
    // Get rankings around user
    const rankings = await this.getRankings(leaderboardId, {
      limit: range,
      offset,
      includeUserData
    });
    
    return {
      ...rankings,
      centerUser: {
        userId: userPosition.user.userId,
        rank: userPosition.user.rank,
        isInResults: rankings.rankings.some(r => r.userId === userId)
      }
    };
  }

  /**
   * Get top N players from leaderboard
   */
  async getTopPlayers(leaderboardId, limit = 10) {
    return await this.getRankings(leaderboardId, { limit, offset: 0 });
  }

  /**
   * Helper to get leaderboard info
   */
  async getLeaderboard(id) {
    const query = 'SELECT id, name, type, active FROM plugin_leaderboards WHERE id = ?';
    return this.db.prepare(query).get(id);
  }

  /**
   * Calculate percentile for a user's score
   */
  async getUserPercentile(leaderboardId, userId) {
    const userPos = await this.getUserPosition(leaderboardId, userId);
    
    if (!userPos.user) {
      return null;
    }
    
    const percentile = ((userPos.user.totalEntries - userPos.user.rank + 1) / userPos.user.totalEntries) * 100;
    
    return {
      ...userPos,
      percentile: Math.round(percentile * 100) / 100 // Round to 2 decimal places
    };
  }
}

module.exports = new RankingService();
