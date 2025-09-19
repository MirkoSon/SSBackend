/**
 * Get User Rank Route Handler
 * GET /leaderboards/:boardId/user/:userId/rank
 */

module.exports = async (req, res) => {
  try {
    const { boardId, userId } = req.params;

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

    // Get leaderboard service
    const leaderboardService = req.pluginContext?.leaderboardService;
    if (!leaderboardService) {
      return res.status(500).json({
        success: false,
        message: 'Leaderboard service not available'
      });
    }

    // Get user's rank
    const userRank = await leaderboardService.getUserRank(boardIdNum, userIdNum);

    if (!userRank) {
      return res.status(404).json({
        success: false,
        message: 'User not found on this leaderboard'
      });
    }

    res.json({
      success: true,
      data: userRank
    });

  } catch (error) {
    console.error('Error getting user rank:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user rank'
    });
  }
};