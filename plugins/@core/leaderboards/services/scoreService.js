const { getDatabase } = require('../../../../src/db/database');

/**
 * Score Service - Handles score submission, validation, and management
 */
class ScoreService {
  constructor() {
    this.db = getDatabase();
  }

  /**
   * Submit a score to a leaderboard
   */
  async submitScore(leaderboardId, userId, score, metadata = {}) {
    // Validate inputs
    if (!leaderboardId || !userId || score === undefined) {
      throw new Error('Missing required fields: leaderboardId, userId, score');
    }
    
    if (typeof score !== 'number' || score < 0) {
      throw new Error('Score must be a non-negative number');
    }
    
    // Verify leaderboard exists and is active
    const leaderboard = await this.getLeaderboard(leaderboardId);
    if (!leaderboard || !leaderboard.active) {
      throw new Error(`Leaderboard '${leaderboardId}' not found or inactive`);
    }
    
    // Check configuration for duplicate handling
    const config = JSON.parse(leaderboard.config || '{}');
    const allowDuplicates = config.allowDuplicateScores !== false; // Default true
    
    if (!allowDuplicates) {
      // Check if user already has a score
      const existingScore = await this.getUserScore(leaderboardId, userId);
      
      if (existingScore) {
        // Keep best score (higher is better)
        if (score <= existingScore.score) {
          return {
            success: false,
            message: 'Score not improved. Existing score is better.',
            existingScore: existingScore.score,
            submittedScore: score
          };
        }
        
        // Update existing score
        const updateQuery = `
          UPDATE plugin_leaderboard_entries 
          SET score = ?, metadata = ?, submitted_at = CURRENT_TIMESTAMP
          WHERE leaderboard_id = ? AND user_id = ?
        `;
        
        this.db.prepare(updateQuery).run(
          score,
          JSON.stringify(metadata),
          leaderboardId,
          userId
        );
        
        return {
          success: true,
          message: 'Score updated successfully',
          scoreImproved: true,
          newScore: score,
          previousScore: existingScore.score
        };
      }
    }
    
    // Insert new score entry
    const insertQuery = `
      INSERT INTO plugin_leaderboard_entries (leaderboard_id, user_id, score, metadata)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = this.db.prepare(insertQuery).run(
      leaderboardId,
      userId,
      score,
      JSON.stringify(metadata)
    );
    
    return {
      success: true,
      message: 'Score submitted successfully',
      entryId: result.lastInsertRowid,
      score: score,
      metadata: metadata
    };
  }

  /**
   * Get user's score in a leaderboard
   */
  async getUserScore(leaderboardId, userId) {
    const query = `
      SELECT score, metadata, submitted_at
      FROM plugin_leaderboard_entries
      WHERE leaderboard_id = ? AND user_id = ?
      ORDER BY score DESC, submitted_at ASC
      LIMIT 1
    `;
    
    const row = this.db.prepare(query).get(leaderboardId, userId);
    if (!row) return null;
    
    return {
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  /**
   * Get all scores for a user across leaderboards
   */
  async getUserScores(userId, leaderboardIds = null) {
    let query = `
      SELECT 
        e.leaderboard_id,
        l.name as leaderboard_name,
        e.score,
        e.metadata,
        e.submitted_at
      FROM plugin_leaderboard_entries e
      JOIN plugin_leaderboards l ON e.leaderboard_id = l.id
      WHERE e.user_id = ?
    `;
    
    const params = [userId];
    
    if (leaderboardIds && leaderboardIds.length > 0) {
      const placeholders = leaderboardIds.map(() => '?').join(',');
      query += ` AND e.leaderboard_id IN (${placeholders})`;
      params.push(...leaderboardIds);
    }
    
    query += ' ORDER BY e.submitted_at DESC';
    
    const rows = this.db.prepare(query).all(...params);
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  /**
   * Delete a score entry
   */
  async deleteScore(leaderboardId, userId, entryId = null) {
    let query = 'DELETE FROM plugin_leaderboard_entries WHERE leaderboard_id = ? AND user_id = ?';
    const params = [leaderboardId, userId];
    
    if (entryId) {
      query += ' AND id = ?';
      params.push(entryId);
    }
    
    const result = this.db.prepare(query).run(...params);
    
    if (result.changes === 0) {
      throw new Error('Score entry not found');
    }
    
    return { success: true, deletedEntries: result.changes };
  }

  /**
   * Helper to get leaderboard info
   */
  async getLeaderboard(id) {
    const query = 'SELECT id, name, type, config, active FROM plugin_leaderboards WHERE id = ?';
    return this.db.prepare(query).get(id);
  }

  /**
   * Get leaderboard statistics
   */
  async getLeaderboardStats(leaderboardId) {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_entries,
        COUNT(DISTINCT user_id) as unique_players,
        MAX(score) as highest_score,
        MIN(score) as lowest_score,
        AVG(score) as average_score,
        MAX(submitted_at) as last_submission
      FROM plugin_leaderboard_entries
      WHERE leaderboard_id = ?
    `;
    
    return this.db.prepare(statsQuery).get(leaderboardId);
  }
}

module.exports = new ScoreService();
