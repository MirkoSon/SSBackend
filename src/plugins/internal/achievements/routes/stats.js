const { getDatabase } = require('../../../../db/database');

/**
 * GET /achievements/stats - Get achievement statistics
 * Headers: Authorization: Bearer <jwt_token>
 */
module.exports = async (req, res) => {
  try {
    const db = getDatabase();
    
    // Get total achievements
    const totalAchievementsQuery = 'SELECT COUNT(*) as total FROM plugin_achievements';
    const totalAchievements = await new Promise((resolve, reject) => {
      db.get(totalAchievementsQuery, [], (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    });

    // Get achievements by type
    const achievementsByTypeQuery = `
      SELECT type, COUNT(*) as count FROM plugin_achievements 
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
      SELECT COUNT(*) as earned FROM plugin_user_achievements WHERE user_id = ?
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
};
