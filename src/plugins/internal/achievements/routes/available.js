const { getDatabase } = require('../../../../db/database');

/**
 * GET /achievements/available - Get all available achievements
 * Headers: Authorization: Bearer <jwt_token>
 */
module.exports = async (req, res) => {
  try {
    const db = getDatabase();
    
    const achievementsQuery = `
      SELECT id, name, description, type, metric_name, requirement_value
      FROM plugin_achievements 
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
};
