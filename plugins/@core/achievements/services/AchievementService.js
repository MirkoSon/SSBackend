/**
 * Achievement Service - Business logic for achievement system
 * Migrated from utils/achievementChecker.js with plugin table names
 */
class AchievementService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Check for new achievements or updates based on progress
   * @param {number} userId
   * @param {string} metric
   * @param {number} newValue
   */
  async checkAchievements(userId, metric, newValue) {
    try {
      const updates = [];

      // 1. Get all active achievements for this metric
      // We look for any achievement linking to this metric
      const achievements = await this.getAchievementsByMetric(metric);

      for (const achievement of achievements) {
        // 2. Get current state for user
        let userState = await this.getUserAchievementState(userId, achievement.id);

        // 3. Init if missing (Lazy initialization 'locked' -> 'in_progress')
        if (!userState) {
          userState = { state: 'in_progress', progress: 0 };
          await this.initUserAchievement(userId, achievement.id);
        }

        // If already unlocked, skip (Idempotence)
        if (userState.state === 'unlocked') continue;

        // 4. Update progress
        // Only update if value increased (monotonic) for incremental, or just set it
        // Depending on game logic, usually progress is cumulative value for the metric
        const newProgress = newValue;
        const targetMet = newProgress >= achievement.target;

        let newState = userState.state;
        let unlockedAt = null;

        if (targetMet) {
          newState = 'unlocked';
          unlockedAt = new Date().toISOString();
        }

        // 5. Persist update
        await this.updateProgress(userId, achievement.id, newProgress, newState, unlockedAt);

        if (newState === 'unlocked') {
          updates.push(achievement);
        }
      }

      return updates; // Return newly unlocked achievements
    } catch (error) {
      console.error('Error checking achievements:', error.message);
      return [];
    }
  }

  // Helper: Get definition by metric
  async getAchievementsByMetric(metric) {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT * FROM plugin_achievements WHERE metric_name = ? AND is_active = 1", [metric], (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  }

  // Helper: Get user state
  async getUserAchievementState(userId, achievementId) {
    return new Promise((resolve, reject) => {
      this.db.get("SELECT state, progress FROM plugin_user_achievements WHERE user_id = ? AND achievement_id = ?",
        [userId, achievementId], (err, row) => {
          if (err) reject(err); else resolve(row);
        });
    });
  }

  // Helper: Init row
  async initUserAchievement(userId, achievementId) {
    return new Promise((resolve, reject) => {
      this.db.run(`INSERT OR IGNORE INTO plugin_user_achievements (user_id, achievement_id, state, progress, updated_at) VALUES (?, ?, 'in_progress', 0, CURRENT_TIMESTAMP)`,
        [userId, achievementId], (err) => {
          if (err) reject(err); else resolve();
        });
    });
  }

  // Helper: Update progress & state
  async updateProgress(userId, achievementId, progress, state, unlockedAt) {
    return new Promise((resolve, reject) => {
      const query = `
            UPDATE plugin_user_achievements 
            SET progress = ?, state = ?, updated_at = CURRENT_TIMESTAMP ${unlockedAt ? ', unlocked_at = ?' : ''}
            WHERE user_id = ? AND achievement_id = ?
        `;
      const params = unlockedAt
        ? [progress, state, unlockedAt, userId, achievementId]
        : [progress, state, userId, achievementId];

      this.db.run(query, params, (err) => {
        if (err) reject(err); else resolve();
      });
    });
  }

  /**
   * Get user's progress toward unearned achievements for a metric (Legacy support view)
   */
  async getProgressTowardAchievements(userId, metric) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT a.*, ua.progress as current_value, ua.state, ua.unlocked_at
        FROM plugin_achievements a
        LEFT JOIN plugin_user_achievements ua ON ua.user_id = ? AND ua.achievement_id = a.id
        WHERE a.metric_name = ? AND a.is_active = 1
      `;

      this.db.all(query, [userId, metric], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const progress = rows.map(row => ({
            achievement: {
              id: row.id,
              code: row.code,
              name: row.name,
              description: row.description,
              type: row.type,
              target: row.target
            },
            currentValue: row.current_value || 0,
            earned: row.state === 'unlocked',
            state: row.state || 'locked',
            progressPercent: Math.min(100, ((row.current_value || 0) / row.target) * 100)
          }));
          resolve(progress);
        }
      });
    });
  }
}

module.exports = AchievementService;
