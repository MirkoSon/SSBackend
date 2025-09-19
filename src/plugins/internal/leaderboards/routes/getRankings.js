/**
 * Get Rankings Route Handler
 * GET /leaderboards/:boardId/rankings
 */

module.exports = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { limit = 50, offset = 0, includeMe } = req.query;

    // Validate boardId
    const boardIdNum = parseInt(boardId);
    if (isNaN(boardIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leaderboard ID'
      });
    }

    // Parse and validate pagination
    const parsedLimit = Math.min(parseInt(limit) || 50, 100); // Max 100
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    // Get leaderboard service
    const leaderboardService = req.pluginContext?.leaderboardService;
    if (!leaderboardService) {
      return res.status(500).json({
        success: false,
        message: 'Leaderboard service not available'
      });
    }

    // Get rankings with optional user inclusion
    const includeUserId = includeMe === 'true' ? req.user.id : null;
    
    const result = await leaderboardService.getRankings(boardIdNum, {
      limit: parsedLimit,
      offset: parsedOffset,
      includeUser: includeUserId
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error getting rankings:', error);
    
    if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        message: 'Leaderboard not found'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve rankings'
      });
    }
  }
};