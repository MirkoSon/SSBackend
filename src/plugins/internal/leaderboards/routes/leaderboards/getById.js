const leaderboardService = require('../../services/leaderboardService');

/**
 * GET /plugins/leaderboards/:id - Get leaderboard details
 */
module.exports = async (req, res) => {
  try {
    const { id } = req.params;
    
    const leaderboard = await leaderboardService.getLeaderboardById(id);
    
    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to retrieve leaderboard' });
  }
};
