const rankingService = require('../services/rankingService');

/**
 * GET /plugins/leaderboards/:id/user/:userId - Get user's position
 */
module.exports = async (req, res) => {
  try {
    const { id: leaderboardId, userId } = req.params;
    
    const userPosition = await rankingService.getUserPosition(
      leaderboardId, 
      parseInt(userId)
    );
    
    res.json({
      success: true,
      ...userPosition
    });
    
  } catch (error) {
    console.error('Get user position error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to retrieve user position' });
  }
};
