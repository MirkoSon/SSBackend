const { getDatabase } = require('../../../../db/database');

/**
 * GET /achievements/:userId - Get user's earned achievements
 * Headers: Authorization: Bearer <jwt_token>
 */
module.exports = async (req, res) => {
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
      FROM plugin_user_achievements ua
      JOIN plugin_achievements a ON ua.achievement_id = a.id
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
};
