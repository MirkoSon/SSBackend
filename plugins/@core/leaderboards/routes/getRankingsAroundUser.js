const rankingService = require('../services/rankingService');

/**
 * GET /plugins/leaderboards/:id/around/:userId - Get rankings around user
 */
module.exports = async (req, res) => {
  try {
    const { id: leaderboardId, userId } = req.params;
    const { 
      range = 10,
      includeUserData = true
    } = req.query;
    
    // Parse and validate query parameters
    const parsedRange = Math.min(parseInt(range) || 10, 50);
    const shouldIncludeUserData = includeUserData !== 'false';
    
    const rankings = await rankingService.getRankingsAroundUser(
      leaderboardId, 
      parseInt(userId), 
      {
        range: parsedRange,
        includeUserData: shouldIncludeUserData
      }
    );
    
    res.json({
      success: true,
      ...rankings
    });
    
  } catch (error) {
    console.error('Get rankings around user error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to retrieve rankings around user' });
  }
};
