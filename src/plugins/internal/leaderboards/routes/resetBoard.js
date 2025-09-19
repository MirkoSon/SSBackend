/**
 * Reset Board Route Handler
 * POST /leaderboards/:boardId/reset
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

    // Check if leaderboard exists
    const leaderboard = await leaderboardService.getLeaderboard(boardIdNum);
    if (!leaderboard) {
      return res.status(404).json({
        success: false,
        message: 'Leaderboard not found'
      });
    }

    // Reset the leaderboard
    const result = await leaderboardService.resetLeaderboard(boardIdNum);

    res.json({
      success: true,
      data: result,
      message: `Leaderboard reset successfully. Removed ${result.deletedEntries} entries.`
    });

  } catch (error) {
    console.error('Error resetting leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset leaderboard'
    });
  }
};