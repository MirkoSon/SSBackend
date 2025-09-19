const { getDatabase } = require('../../../../db/database');

/**
 * GET /achievements/:userId/progress - Get achievement progress for user
 * Headers: Authorization: Bearer <jwt_token>
 */
module.exports = async (req, res) => {
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
        FROM plugin_achievements a
        LEFT JOIN character_progress cp ON cp.user_id = ? AND cp.metric_name = a.metric_name
        LEFT JOIN plugin_user_achievements ua ON ua.user_id = ? AND ua.achievement_id = a.id
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
        FROM plugin_achievements a
        LEFT JOIN character_progress cp ON cp.user_id = ? AND cp.metric_name = a.metric_name
        LEFT JOIN plugin_user_achievements ua ON ua.user_id = ? AND ua.achievement_id = a.id
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
};
