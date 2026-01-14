/**
 * Get Board Route Handler
 * GET /leaderboards/:boardId
 */

module.exports = async (req, res) => {
  try {
    const { boardId } = req.params;

    // Validate boardId
    const boardIdNum = parseInt(boardId);
    if (isNaN(boardIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leaderboard ID'
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

    // Get leaderboard
    const leaderboard = await leaderboardService.getLeaderboard(boardIdNum);

    if (!leaderboard) {
      return res.status(404).json({
        success: false,
        message: 'Leaderboard not found'
      });
    }

    res.json({
      success: true,
      data: leaderboard
    });

  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leaderboard'
    });
  }
};