const rankingService = require('../services/rankingService');

/**
 * Ranking Query Route Handlers
 */

/**
 * GET /plugins/leaderboards/:id/rankings - Get paginated rankings
 */
async function getRankings(req, res) {
  try {
    const { id: leaderboardId } = req.params;
    const { 
      limit = 50, 
      offset = 0,
      includeUserData = true
    } = req.query;
    
    // Parse and validate query parameters
    const parsedLimit = Math.min(parseInt(limit) || 50, 100);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);
    const shouldIncludeUserData = includeUserData !== 'false';
    
    const rankings = await rankingService.getRankings(leaderboardId, {
      limit: parsedLimit,
      offset: parsedOffset,
      includeUserData: shouldIncludeUserData
    });
    
    res.json({
      success: true,
      ...rankings
    });
    
  } catch (error) {
    console.error('Get rankings error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('Maximum limit')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to retrieve rankings' });
  }
}

/**
 * GET /plugins/leaderboards/:id/user/:userId - Get user's position
 */
async function getUserPosition(req, res) {
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
}

/**
 * GET /plugins/leaderboards/:id/around/:userId - Get rankings around user
 */
async function getRankingsAroundUser(req, res) {
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
}

/**
 * GET /plugins/leaderboards/:id/top - Get top N players (convenience endpoint)
 */
async function getTopPlayers(req, res) {
  try {
    const { id: leaderboardId } = req.params;
    const { limit = 10 } = req.query;
    
    const parsedLimit = Math.min(parseInt(limit) || 10, 50);
    
    const topPlayers = await rankingService.getTopPlayers(leaderboardId, parsedLimit);
    
    res.json({
      success: true,
      ...topPlayers
    });
    
  } catch (error) {
    console.error('Get top players error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to retrieve top players' });
  }
}

/**
 * GET /plugins/leaderboards/:id/user/:userId/percentile - Get user's percentile
 */
async function getUserPercentile(req, res) {
  try {
    const { id: leaderboardId, userId } = req.params;
    
    const percentileData = await rankingService.getUserPercentile(
      leaderboardId, 
      parseInt(userId)
    );
    
    if (!percentileData) {
      return res.status(404).json({ 
        error: 'User has no scores in this leaderboard' 
      });
    }
    
    res.json({
      success: true,
      ...percentileData
    });
    
  } catch (error) {
    console.error('Get user percentile error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to retrieve user percentile' });
  }
}

module.exports = {
  getRankings,
  getUserPosition,
  getRankingsAroundUser,
  getTopPlayers,
  getUserPercentile
};
