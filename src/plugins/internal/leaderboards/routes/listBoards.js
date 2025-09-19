/**
 * List Leaderboards Route Handler
 * GET /leaderboards
 */

module.exports = async (req, res) => {
  try {
    const { type, gameMode, isActive, limit = 50, offset = 0 } = req.query;

    // Parse and validate limit/offset
    const parsedLimit = Math.min(parseInt(limit) || 50, 100); // Max 100
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    // Parse isActive
    let parsedIsActive;
    if (isActive !== undefined) {
      parsedIsActive = isActive === 'true' || isActive === '1';
    }

    // Get leaderboard service
    const leaderboardService = req.pluginContext?.leaderboardService;
    if (!leaderboardService) {
      return res.status(500).json({
        success: false,
        message: 'Leaderboard service not available'
      });
    }

    // List leaderboards with filters
    const leaderboards = await leaderboardService.listLeaderboards({
      type,
      gameMode,
      isActive: parsedIsActive,
      limit: parsedLimit,
      offset: parsedOffset
    });

    res.json({
      success: true,
      data: leaderboards,
      pagination: {
        limit: parsedLimit,
        offset: parsedOffset,
        count: leaderboards.length
      }
    });

  } catch (error) {
    console.error('Error listing leaderboards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leaderboards'
    });
  }
};