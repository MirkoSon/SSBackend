/**
 * Leaderboard Service - Core business logic for leaderboard management
 * Handles scoring, ranking, and leaderboard lifecycle operations
 */

class LeaderboardService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new leaderboard
   */
  async createLeaderboard(data) {
    const {
      name,
      description = '',
      type = 'all_time',
      gameMode = null,
      sortOrder = 'DESC', 
      maxEntries = 10000,
      resetSchedule = null,
      metadata = null
    } = data;

    // Calculate next reset time if schedule provided
    let nextReset = null;
    if (resetSchedule) {
      nextReset = this.calculateNextReset(resetSchedule);
    }

    const query = `
      INSERT INTO plugin_leaderboards 
      (name, description, type, game_mode, sort_order, max_entries, reset_schedule, next_reset, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await new Promise((resolve, reject) => {
      this.db.run(query, [
        name,
        description, 
        type,
        gameMode,
        sortOrder,
        maxEntries,
        resetSchedule,
        nextReset,
        metadata ? JSON.stringify(metadata) : null
      ], function(err) {
        if (err) reject(err);
        else resolve({ lastInsertRowid: this.lastID });
      });
    });

    return this.getLeaderboard(result.lastInsertRowid);
  }
  /**
   * Get leaderboard by ID
   */
  async getLeaderboard(id) {
    const query = `
      SELECT *, 
        (SELECT COUNT(*) FROM plugin_leaderboard_entries WHERE leaderboard_id = ?) as entry_count
      FROM plugin_leaderboards 
      WHERE id = ?
    `;
    
    const board = await new Promise((resolve, reject) => {
      this.db.get(query, [id, id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });

    if (!board) return null;

    // Parse metadata if present
    if (board.metadata) {
      board.metadata = JSON.parse(board.metadata);
    }

    return board;
  }

  /**
   * List all leaderboards with filtering
   */
  async listLeaderboards(filters = {}) {
    const { type, gameMode, isActive, limit = 50, offset = 0 } = filters;
    
    let query = `
      SELECT *, 
        (SELECT COUNT(*) FROM plugin_leaderboard_entries WHERE leaderboard_id = plugin_leaderboards.id) as entry_count
      FROM plugin_leaderboards 
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }

    if (gameMode) {
      query += ` AND game_mode = ?`;
      params.push(gameMode);
    }

    if (isActive !== undefined) {
      query += ` AND is_active = ?`;
      params.push(isActive ? 1 : 0);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Use async sqlite3 API pattern
    const boards = await new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Parse metadata for each board
    boards.forEach(board => {
      if (board.metadata) {
        board.metadata = JSON.parse(board.metadata);
      }
    });

    return boards;
  }
  /**
   * Submit a score to a leaderboard
   */
  async submitScore(leaderboardId, userId, score, metadata = null) {
    // Get leaderboard details
    const board = await this.getLeaderboard(leaderboardId);
    if (!board || !board.is_active) {
      throw new Error('Leaderboard not found or inactive');
    }

    // Check if user already has an entry
    const existingEntry = await new Promise((resolve, reject) => {
      this.db.get(`
        SELECT * FROM plugin_leaderboard_entries 
        WHERE leaderboard_id = ? AND user_id = ?
      `, [leaderboardId, userId], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });

    const shouldUpdate = this.shouldUpdateScore(existingEntry, score, board.sort_order);
    
    if (existingEntry && !shouldUpdate) {
      // Existing score is better, return current entry
      return existingEntry;
    }

    // Insert or update the score
    let result;
    if (existingEntry) {
      // Update existing entry
      await new Promise((resolve, reject) => {
        this.db.run(`
          UPDATE plugin_leaderboard_entries 
          SET score = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
          WHERE leaderboard_id = ? AND user_id = ?
        `, [score, metadata ? JSON.stringify(metadata) : null, leaderboardId, userId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
      result = { ...existingEntry, score, metadata };
    } else {
      // Insert new entry
      const insertResult = await new Promise((resolve, reject) => {
        this.db.run(`
          INSERT INTO plugin_leaderboard_entries (leaderboard_id, user_id, score, metadata)
          VALUES (?, ?, ?, ?)
        `, [leaderboardId, userId, score, metadata ? JSON.stringify(metadata) : null], function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID });
        });
      });
      
      result = {
        id: insertResult.lastID,
        leaderboard_id: leaderboardId,
        user_id: userId,
        score,
        metadata,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    // Update ranks for this leaderboard
    await this.updateRanks(leaderboardId);
    
    // Get the updated entry with rank
    const updatedEntry = await new Promise((resolve, reject) => {
      this.db.get(`
        SELECT * FROM plugin_leaderboard_entries 
        WHERE leaderboard_id = ? AND user_id = ?
      `, [leaderboardId, userId], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });

    return updatedEntry;
  }
  /**
   * Get leaderboard rankings with pagination
   */
  async getRankings(leaderboardId, options = {}) {
    const { limit = 50, offset = 0, includeUser = null } = options;
    
    const board = await this.getLeaderboard(leaderboardId);
    if (!board) {
      throw new Error('Leaderboard not found');
    }

    // Get rankings with user info
    const rankings = await new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          e.*, 
          u.username
        FROM plugin_leaderboard_entries e
        JOIN users u ON e.user_id = u.id
        WHERE e.leaderboard_id = ?
        ORDER BY e.rank_position ASC
        LIMIT ? OFFSET ?
      `, [leaderboardId, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Parse metadata for each entry
    rankings.forEach(entry => {
      if (entry.metadata) {
        entry.metadata = JSON.parse(entry.metadata);
      }
    });

    // If includeUser is specified and not in results, get their rank separately
    let userRank = null;
    if (includeUser && !rankings.find(r => r.user_id === includeUser)) {
      userRank = await this.getUserRank(leaderboardId, includeUser);
    }

    return {
      leaderboard: board,
      rankings,
      userRank,
      pagination: {
        limit,
        offset,
        total: board.entry_count
      }
    };
  }

  /**
   * Get user's specific rank and score
   */
  async getUserRank(leaderboardId, userId) {
    const entry = await new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          e.*,
          u.username
        FROM plugin_leaderboard_entries e
        JOIN users u ON e.user_id = u.id
        WHERE e.leaderboard_id = ? AND e.user_id = ?
      `, [leaderboardId, userId], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
    
    if (!entry) return null;

    if (entry.metadata) {
      entry.metadata = JSON.parse(entry.metadata);
    }

    return entry;
  }
  /**
   * Get rankings surrounding a specific user
   */
  async getSurroundingRanks(leaderboardId, userId, radius = 5) {
    const userRank = await this.getUserRank(leaderboardId, userId);
    if (!userRank) {
      return { userRank: null, surrounding: [] };
    }

    const startRank = Math.max(1, userRank.rank_position - radius);
    const endRank = userRank.rank_position + radius;
    const limit = (endRank - startRank) + 1;
    const offset = startRank - 1;

    const rankings = await this.getRankings(leaderboardId, { limit, offset });
    
    return {
      userRank,
      surrounding: rankings.rankings
    };
  }

  /**
   * Reset/clear a leaderboard
   */
  async resetLeaderboard(leaderboardId) {
    // Delete all entries
    const result = await new Promise((resolve, reject) => {
      this.db.run(`
        DELETE FROM plugin_leaderboard_entries WHERE leaderboard_id = ?
      `, [leaderboardId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    // Update last reset time and calculate next reset
    const board = await this.getLeaderboard(leaderboardId);
    if (board && board.reset_schedule) {
      const nextReset = this.calculateNextReset(board.reset_schedule);
      await new Promise((resolve, reject) => {
        this.db.run(`
          UPDATE plugin_leaderboards 
          SET last_reset = CURRENT_TIMESTAMP, next_reset = ?
          WHERE id = ?
        `, [nextReset, leaderboardId], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    return { deletedEntries: result.changes };
  }

  /**
   * Update rank positions for a leaderboard
   */
  async updateRanks(leaderboardId) {
    const board = await this.getLeaderboard(leaderboardId);
    if (!board) return;

    const orderBy = board.sort_order === 'ASC' ? 'ASC' : 'DESC';
    
    // Update ranks using ROW_NUMBER() window function
    await new Promise((resolve, reject) => {
      this.db.run(`
        UPDATE plugin_leaderboard_entries
        SET rank_position = (
          SELECT new_rank FROM (
            SELECT 
              id,
              ROW_NUMBER() OVER (
                ORDER BY score ${orderBy}, submitted_at ASC
              ) as new_rank
            FROM plugin_leaderboard_entries
            WHERE leaderboard_id = ?
          ) ranked
          WHERE ranked.id = plugin_leaderboard_entries.id
        )
        WHERE leaderboard_id = ?
      `, [leaderboardId, leaderboardId], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  /**
   * Utility methods
   */

  shouldUpdateScore(existingEntry, newScore, sortOrder) {
    if (!existingEntry) return true;
    
    if (sortOrder === 'ASC') {
      return newScore < existingEntry.score;
    } else {
      return newScore > existingEntry.score;
    }
  }

  calculateNextReset(schedule) {
    const now = new Date();
    let nextReset = new Date();

    switch (schedule) {
      case 'daily':
        nextReset.setDate(now.getDate() + 1);
        nextReset.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        const daysUntilNextWeek = 7 - now.getDay();
        nextReset.setDate(now.getDate() + daysUntilNextWeek);
        nextReset.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        nextReset.setMonth(now.getMonth() + 1, 1);
        nextReset.setHours(0, 0, 0, 0);
        break;
      default:
        return null;
    }

    return nextReset.toISOString();
  }

  async getLeaderboardStats() {
    return await new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(*) as total_boards,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_boards,
          COUNT(CASE WHEN type = 'daily' THEN 1 END) as daily_boards,
          COUNT(CASE WHEN type = 'weekly' THEN 1 END) as weekly_boards,
          COUNT(CASE WHEN type = 'all_time' THEN 1 END) as alltime_boards,
          (SELECT COUNT(*) FROM plugin_leaderboard_entries) as total_entries
        FROM plugin_leaderboards
      `, [], (err, row) => {
        if (err) reject(err);
        else resolve(row || {});
      });
    });
  }

  async cleanup() {
    // Cleanup logic for plugin deactivation
    console.log('📊 Leaderboard service cleanup complete');
  }
}

module.exports = LeaderboardService;