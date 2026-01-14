/**
 * Submit Score Route Handler
 * POST /leaderboards/:boardId/submit
 */

module.exports = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { score, metadata } = req.body;
    const userId = req.user.id; // From auth middleware

    // Validate required fields
    if (score === undefined || score === null) {
      return res.status(400).json({
        success: false,
        message: 'Score is required'
      });
    }

    // Validate score is a number
    const numericScore = parseFloat(score);
    if (isNaN(numericScore)) {
      return res.status(400).json({
        success: false,
        message: 'Score must be a valid number'
      });
    }

    // Validate boardId is a number
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

    // Submit the score
    const entry = await leaderboardService.submitScore(
      boardIdNum,
      userId,
      numericScore,
      metadata
    );

    res.status(201).json({
      success: true,
      data: entry,
      message: 'Score submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting score:', error);
    
    if (error.message.includes('not found') || error.message.includes('inactive')) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to submit score'
      });
    }
  }
};