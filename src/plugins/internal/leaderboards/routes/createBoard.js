/**
 * Create Leaderboard Route Handler
 * POST /leaderboards
 */

module.exports = async (req, res) => {
  try {
    const { name, description, type, gameMode, sortOrder, maxEntries, resetSchedule, metadata } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Leaderboard name is required'
      });
    }

    // Validate leaderboard type
    const validTypes = ['daily', 'weekly', 'monthly', 'all_time', 'custom'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leaderboard type. Valid types: ' + validTypes.join(', ')
      });
    }

    // Validate sort order
    if (sortOrder && !['ASC', 'DESC'].includes(sortOrder)) {
      return res.status(400).json({
        success: false,
        message: 'Sort order must be ASC or DESC'
      });
    }

    // Get leaderboard service from plugin context
    const leaderboardService = req.pluginContext?.leaderboardService;
    if (!leaderboardService) {
      return res.status(500).json({
        success: false,
        message: 'Leaderboard service not available'
      });
    }

    // Create the leaderboard
    const leaderboard = await leaderboardService.createLeaderboard({
      name,
      description,
      type: type || 'all_time',
      gameMode,
      sortOrder: sortOrder || 'DESC',
      maxEntries: maxEntries || 10000,
      resetSchedule,
      metadata
    });

    res.status(201).json({
      success: true,
      data: leaderboard,
      message: 'Leaderboard created successfully'
    });

  } catch (error) {
    console.error('Error creating leaderboard:', error);
    
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({
        success: false,
        message: 'A leaderboard with this name and game mode already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create leaderboard'
      });
    }
  }
};