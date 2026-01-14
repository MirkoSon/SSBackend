const { getDatabase } = require('../../../../src/db/database');

/**
 * GET /achievements/stats - Get achievement statistics
 * Headers: Authorization: Bearer <jwt_token>
 */
module.exports = async (req, res) => {
  try {
    // Validate authenticated user
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const db = getDatabase();
    const userId = req.user.id;
    
    // Get total achievements
    const totalAchievementsQuery = 'SELECT COUNT(*) as total FROM plugin_achievements';
    const totalAchievements = await new Promise((resolve, reject) => {
      db.get(totalAchievementsQuery, [], (err, row) => {
        if (err) {
          console.error('Error counting total achievements:', err);
          reject(err);
        } else {
          resolve(row ? row.total : 0);
        }
      });
    });

    // Get achievements by type
    const achievementsByTypeQuery = `
      SELECT type, COUNT(*) as count FROM plugin_achievements 
      GROUP BY type ORDER BY count DESC
    `;
    const achievementsByType = await new Promise((resolve, reject) => {
      db.all(achievementsByTypeQuery, [], (err, rows) => {
        if (err) {
          console.error('Error getting achievements by type:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });

    // Get user's earned count
    const userEarnedQuery = `
      SELECT COUNT(*) as earned FROM plugin_user_achievements WHERE user_id = ?
    `;
    const userEarned = await new Promise((resolve, reject) => {
      db.get(userEarnedQuery, [userId], (err, row) => {
        if (err) {
          console.error('Error counting user achievements:', err);
          reject(err);
        } else {
          resolve(row ? row.earned : 0);
        }
      });
    });

    // Calculate completion percentage (avoid division by zero)
    const completionPercent = totalAchievements > 0 
      ? Math.round((userEarned / totalAchievements) * 100) 
      : 0;

    // Transform achievements by type into object
    const achievementsByTypeObj = achievementsByType.reduce((acc, item) => {
      acc[item.type] = item.count;
      return acc;
    }, {});

    res.json({
      userId: userId,
      statistics: {
        totalAchievements,
        userEarned,
        completionPercent,
        achievementsByType: achievementsByTypeObj
      },
      message: 'Achievement statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving achievement stats:', error.message);
    res.status(500).json({ error: 'Failed to retrieve achievement statistics' });
  }
};