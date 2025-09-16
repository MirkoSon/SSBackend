const { getDatabase } = require('../db/database');

/**
 * Achievement validation and automatic checking utility
 */
class AchievementChecker {
  /**
   * Check for new achievements based on updated progress
   * @param {number} userId - User ID
   * @param {string} metric - Progress metric name
   * @param {number} newValue - New value for the metric
   * @returns {Array} Array of newly earned achievements
   */
  async checkAchievements(userId, metric, newValue) {
    try {
      const db = getDatabase();
      const newlyEarned = [];

      // Get all achievements for this metric that user hasn't earned
      const achievementsQuery = `
        SELECT a.* FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
        WHERE a.metric_name = ? AND ua.achievement_id IS NULL
      `;

      const achievements = await new Promise((resolve, reject) => {
        db.all(achievementsQuery, [userId, metric], (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });

      // Check each achievement
      for (const achievement of achievements) {
        if (await this.meetsRequirement(achievement, newValue)) {
          await this.unlockAchievement(userId, achievement.id, newValue);
          newlyEarned.push(achievement);
        }
      }

      return newlyEarned;
    } catch (error) {
      console.error('Error checking achievements:', error.message);
      return [];
    }
  }

  /**
   * Check if a value meets an achievement requirement
   * @param {Object} achievement - Achievement object with type and requirement_value
   * @param {number} value - Current value to check
   * @returns {boolean} Whether requirement is met
   */
  async meetsRequirement(achievement, value) {
    switch (achievement.type) {
      case 'score':
      case 'progress':
        return value >= achievement.requirement_value;
      case 'event':
        // Event-based achievements are manually triggered
        return false;
      default:
        return false;
    }
  }

  /**
   * Unlock an achievement for a user
   * @param {number} userId - User ID
   * @param {number} achievementId - Achievement ID
   * @param {number} progressValue - Progress value when earned
   */
  async unlockAchievement(userId, achievementId, progressValue) {
    const db = getDatabase();

    return new Promise((resolve, reject) => {
      const insertQuery = `
        INSERT INTO user_achievements (user_id, achievement_id, progress_value)
        VALUES (?, ?, ?)
      `;

      db.run(insertQuery, [userId, achievementId, progressValue], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            userId,
            achievementId,
            progressValue,
            unlockedAt: new Date().toISOString()
          });
        }
      });
    });
  }

  /**
   * Check if user has already earned an achievement
   * @param {number} userId - User ID
   * @param {number} achievementId - Achievement ID
   * @returns {boolean} Whether achievement is already earned
   */
  async hasUserEarnedAchievement(userId, achievementId) {
    const db = getDatabase();

    return new Promise((resolve, reject) => {
      const query = `
        SELECT 1 FROM user_achievements 
        WHERE user_id = ? AND achievement_id = ?
      `;

      db.get(query, [userId, achievementId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
  }

  /**
   * Get all achievements that can be earned for a specific metric
   * @param {string} metric - Metric name
   * @returns {Array} Array of achievements for the metric
   */
  async getAchievementsByMetric(metric) {
    const db = getDatabase();

    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM achievements WHERE metric_name = ?
      `;

      db.all(query, [metric], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Get user's progress toward unearned achievements for a metric
   * @param {number} userId - User ID
   * @param {string} metric - Metric name
   * @returns {Array} Progress info for unearned achievements
   */
  async getProgressTowardAchievements(userId, metric) {
    const db = getDatabase();

    return new Promise((resolve, reject) => {
      const query = `
        SELECT a.*, cp.current_value,
               CASE WHEN ua.achievement_id IS NOT NULL THEN 1 ELSE 0 END as earned
        FROM achievements a
        LEFT JOIN character_progress cp ON cp.user_id = ? AND cp.metric_name = a.metric_name
        LEFT JOIN user_achievements ua ON ua.user_id = ? AND ua.achievement_id = a.id
        WHERE a.metric_name = ?
      `;

      db.all(query, [userId, userId, metric], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const progress = rows.map(row => ({
            achievement: {
              id: row.id,
              name: row.name,
              description: row.description,
              type: row.type,
              requirementValue: row.requirement_value
            },
            currentValue: row.current_value || 0,
            earned: !!row.earned,
            progressPercent: Math.min(100, ((row.current_value || 0) / row.requirement_value) * 100)
          }));
          resolve(progress);
        }
      });
    });
  }
}

// Create singleton instance
const achievementChecker = new AchievementChecker();

module.exports = achievementChecker;
