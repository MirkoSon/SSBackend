/**
 * Get Leaderboard Stats Route Handler
 * GET /leaderboards/stats
 */

module.exports = async (req, res) => {
  try {
    // Get leaderboard service
    const leaderboardService = req.pluginContext?.leaderboardService;
    if (!leaderboardService) {
      return res.status(500).json({
        success: false,
        message: 'Leaderboard service not available'
      });
    }

    // Get global statistics
    const stats = await leaderboardService.getLeaderboardStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting leaderboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leaderboard statistics'
    });
  }
};