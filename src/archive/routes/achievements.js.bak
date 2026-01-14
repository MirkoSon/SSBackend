const express = require('express');
const { getDatabase } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const achievementChecker = require('../utils/achievementChecker');

const router = express.Router();

/**
 * GET /achievements/available - Get all available achievements
 * Headers: Authorization: Bearer <jwt_token>
 */
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    
    const achievementsQuery = `
      SELECT id, name, description, type, metric_name, requirement_value
      FROM achievements 
      ORDER BY requirement_value ASC, name ASC
    `;
    
    const achievements = await new Promise((resolve, reject) => {
      db.all(achievementsQuery, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    const achievementsList = achievements.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      metric: row.metric_name,
      requirement: row.requirement_value
    }));

    res.json({
      achievements: achievementsList,
      total: achievementsList.length,
      message: 'Available achievements retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving available achievements:', error.message);
    res.status(500).json({ error: 'Failed to retrieve available achievements' });
  }
});

/**
 * GET /achievements/:userId - Get user's earned achievements
 * Headers: Authorization: Bearer <jwt_token>
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  const targetUserId = parseInt(req.params.userId);
  const requestingUserId = req.user.id;

  // Validate user ID
  if (isNaN(targetUserId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Users can only access their own achievements (for now)
  if (targetUserId !== requestingUserId) {
    return res.status(403).json({ error: 'Cannot access another user\'s achievements' });
  }

  try {
    const db = getDatabase();
    
    // Get user's earned achievements
    const achievementsQuery = `
      SELECT a.id, a.name, a.description, a.type, a.metric_name, a.requirement_value,
             ua.unlocked_at, ua.progress_value
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ?
      ORDER BY ua.unlocked_at DESC
    `;
    
    const earnedAchievements = await new Promise((resolve, reject) => {
      db.all(achievementsQuery, [targetUserId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    const achievements = earnedAchievements.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      metric: row.metric_name,
      requirement: row.requirement_value,
      unlockedAt: row.unlocked_at,
      progressValue: row.progress_value
    }));

    res.json({
      userId: targetUserId,
      achievements,
      totalEarned: achievements.length,
      message: 'User achievements retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving user achievements:', error.message);
    res.status(500).json({ error: 'Failed to retrieve user achievements' });
  }
});

/**
 * POST /achievements/unlock - Manually unlock an achievement
 * Headers: Authorization: Bearer <jwt_token>
 * Body: { achievementId: number, userId?: number }
 */
router.post('/unlock', authenticateToken, async (req, res) => {
  const { achievementId, userId } = req.body;
  const requestingUserId = req.user.id;
  const targetUserId = userId || requestingUserId;

  // Validate input
  if (!achievementId || typeof achievementId !== 'number') {
    return res.status(400).json({ error: 'Achievement ID is required and must be a number' });
  }

  // Users can only unlock achievements for themselves (unless admin)
  if (targetUserId !== requestingUserId) {
    return res.status(403).json({ error: 'Cannot unlock achievements for another user' });
  }

  try {
    const db = getDatabase();
    
    // Check if achievement exists
    const achievementQuery = `
      SELECT id, name, description, type, requirement_value
      FROM achievements WHERE id = ?
    `;
    
    const achievement = await new Promise((resolve, reject) => {
      db.get(achievementQuery, [achievementId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    // Check if user already has this achievement
    const hasAchievement = await achievementChecker.hasUserEarnedAchievement(targetUserId, achievementId);
    if (hasAchievement) {
      return res.status(409).json({ error: 'Achievement already unlocked' });
    }

    // Get current progress value for the achievement metric (if applicable)
    let progressValue = 0;
    if (achievement.metric_name) {
      const progressQuery = `
        SELECT current_value FROM character_progress 
        WHERE user_id = ? AND metric_name = ?
      `;
      
      const progress = await new Promise((resolve, reject) => {
        db.get(progressQuery, [targetUserId, achievement.metric_name], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (progress) {
        progressValue = progress.current_value;
      }
    }

    // Unlock the achievement
    await achievementChecker.unlockAchievement(targetUserId, achievementId, progressValue);

    res.json({
      achievement: {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        type: achievement.type,
        requirement: achievement.requirement_value
      },
      userId: targetUserId,
      unlockedAt: new Date().toISOString(),
      progressValue,
      message: `Achievement "${achievement.name}" unlocked successfully`
    });

  } catch (error) {
    console.error('Error unlocking achievement:', error.message);
    res.status(500).json({ error: 'Failed to unlock achievement' });
  }
});

/**
 * GET /achievements/:userId/progress - Get achievement progress for user
 * Headers: Authorization: Bearer <jwt_token>
 */
router.get('/:userId/progress', authenticateToken, async (req, res) => {
  const targetUserId = parseInt(req.params.userId);
  const requestingUserId = req.user.id;
  const { metric } = req.query; // Optional metric filter

  // Validate user ID
  if (isNaN(targetUserId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Users can only access their own progress
  if (targetUserId !== requestingUserId) {
    return res.status(403).json({ error: 'Cannot access another user\'s achievement progress' });
  }

  try {
    const db = getDatabase();
    
    let progressQuery;
    let queryParams;

    if (metric) {
      // Get progress for specific metric
      progressQuery = `
        SELECT a.*, 
               cp.current_value,
               ua.unlocked_at,
               CASE WHEN ua.achievement_id IS NOT NULL THEN 1 ELSE 0 END as earned
        FROM achievements a
        LEFT JOIN character_progress cp ON cp.user_id = ? AND cp.metric_name = a.metric_name
        LEFT JOIN user_achievements ua ON ua.user_id = ? AND ua.achievement_id = a.id
        WHERE a.metric_name = ?
        ORDER BY a.requirement_value ASC
      `;
      queryParams = [targetUserId, targetUserId, metric];
    } else {
      // Get progress for all achievements
      progressQuery = `
        SELECT a.*, 
               cp.current_value,
               ua.unlocked_at,
               CASE WHEN ua.achievement_id IS NOT NULL THEN 1 ELSE 0 END as earned
        FROM achievements a
        LEFT JOIN character_progress cp ON cp.user_id = ? AND cp.metric_name = a.metric_name
        LEFT JOIN user_achievements ua ON ua.user_id = ? AND ua.achievement_id = a.id
        ORDER BY a.metric_name, a.requirement_value ASC
      `;
      queryParams = [targetUserId, targetUserId];
    }

    const achievements = await new Promise((resolve, reject) => {
      db.all(progressQuery, queryParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    const progressData = achievements.map(row => {
      const currentValue = row.current_value || 0;
      const requirementValue = row.requirement_value;
      const progressPercent = Math.min(100, (currentValue / requirementValue) * 100);

      return {
        achievement: {
          id: row.id,
          name: row.name,
          description: row.description,
          type: row.type,
          metric: row.metric_name,
          requirement: requirementValue
        },
        currentValue,
        progressPercent: Math.round(progressPercent * 100) / 100,
        earned: !!row.earned,
        unlockedAt: row.unlocked_at || null
      };
    });

    // Group by metric if showing all
    let response;
    if (metric) {
      response = {
        userId: targetUserId,
        metric,
        achievements: progressData,
        message: `Achievement progress for ${metric} retrieved successfully`
      };
    } else {
      const groupedByMetric = progressData.reduce((acc, item) => {
        const metric = item.achievement.metric;
        if (!acc[metric]) {
          acc[metric] = [];
        }
        acc[metric].push(item);
        return acc;
      }, {});

      response = {
        userId: targetUserId,
        progressByMetric: groupedByMetric,
        totalAchievements: progressData.length,
        earnedAchievements: progressData.filter(a => a.earned).length,
        message: 'Achievement progress retrieved successfully'
      };
    }

    res.json(response);

  } catch (error) {
    console.error('Error retrieving achievement progress:', error.message);
    res.status(500).json({ error: 'Failed to retrieve achievement progress' });
  }
});

/**
 * GET /achievements/stats - Get achievement statistics
 * Headers: Authorization: Bearer <jwt_token>
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    
    // Get total achievements
    const totalAchievementsQuery = 'SELECT COUNT(*) as total FROM achievements';
    const totalAchievements = await new Promise((resolve, reject) => {
      db.get(totalAchievementsQuery, [], (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    });

    // Get achievements by type
    const achievementsByTypeQuery = `
      SELECT type, COUNT(*) as count FROM achievements 
      GROUP BY type ORDER BY count DESC
    `;
    const achievementsByType = await new Promise((resolve, reject) => {
      db.all(achievementsByTypeQuery, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Get user's earned count
    const userEarnedQuery = `
      SELECT COUNT(*) as earned FROM user_achievements WHERE user_id = ?
    `;
    const userEarned = await new Promise((resolve, reject) => {
      db.get(userEarnedQuery, [req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row.earned);
      });
    });

    res.json({
      userId: req.user.id,
      statistics: {
        totalAchievements,
        userEarned,
        completionPercent: Math.round((userEarned / totalAchievements) * 100),
        achievementsByType: achievementsByType.reduce((acc, item) => {
          acc[item.type] = item.count;
          return acc;
        }, {})
      },
      message: 'Achievement statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving achievement stats:', error.message);
    res.status(500).json({ error: 'Failed to retrieve achievement statistics' });
  }
});

module.exports = router;
