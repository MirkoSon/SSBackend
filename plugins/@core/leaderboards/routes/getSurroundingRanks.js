/**
 * Get Surrounding Ranks Route Handler
 * GET /leaderboards/:boardId/user/:userId/surrounding
 */

module.exports = async (req, res) => {
  try {
    const { boardId, userId } = req.params;
    const { radius = 5 } = req.query;

    // Validate boardId
    const boardIdNum = parseInt(boardId);
    if (isNaN(boardIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leaderboard ID'
      });
    }

    // Validate userId
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Validate radius
    const radiusNum = Math.min(Math.max(parseInt(radius) || 5, 1), 20); // Between 1-20

    // Get leaderboard service
    const leaderboardService = req.pluginContext?.leaderboardService;
    if (!leaderboardService) {
      return res.status(500).json({
        success: false,
        message: 'Leaderboard service not available'
      });
    }

    // Get surrounding ranks
    const result = await leaderboardService.getSurroundingRanks(boardIdNum, userIdNum, radiusNum);

    if (!result.userRank) {
      return res.status(404).json({
        success: false,
        message: 'User not found on this leaderboard'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error getting surrounding ranks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve surrounding ranks'
    });
  }
};