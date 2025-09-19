const { getDatabase } = require('../../../../db/database');
const AchievementService = require('../services/AchievementService');

/**
 * POST /achievements/unlock - Manually unlock an achievement
 * Headers: Authorization: Bearer <jwt_token>
 * Body: { achievementId: number, userId?: number }
 */
module.exports = async (req, res) => {
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
    const achievementService = new AchievementService(db);
    
    // Check if achievement exists
    const achievementQuery = `
      SELECT id, name, description, type, requirement_value
      FROM plugin_achievements WHERE id = ?
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
    const hasAchievement = await achievementService.hasUserEarnedAchievement(targetUserId, achievementId);
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
    await achievementService.unlockAchievement(targetUserId, achievementId, progressValue);

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
};
