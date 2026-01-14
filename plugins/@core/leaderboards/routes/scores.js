const scoreService = require('../services/scoreService');

/**
 * Score Submission Route Handlers
 */

/**
 * POST /plugins/leaderboards/:id/submit - Submit score to leaderboard
 */
async function submit(req, res) {
  try {
    const { id: leaderboardId } = req.params;
    const { score, metadata = {} } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    if (score === undefined || score === null) {
      return res.status(400).json({ error: 'Score is required' });
    }
    
    if (typeof score !== 'number') {
      return res.status(400).json({ error: 'Score must be a number' });
    }
    
    if (score < 0) {
      return res.status(400).json({ error: 'Score must be non-negative' });
    }
    
    // Validate metadata if provided
    if (metadata && typeof metadata !== 'object') {
      return res.status(400).json({ error: 'Metadata must be an object' });
    }
    
    const result = await scoreService.submitScore(
      leaderboardId,
      userId,
      score,
      metadata
    );
    
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
    
  } catch (error) {
    console.error('Submit score error:', error);
    
    if (error.message.includes('not found') || error.message.includes('inactive')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('must be')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to submit score' 
    });
  }
}

/**
 * GET /plugins/leaderboards/:id/user/:userId/score - Get user's score in leaderboard
 */
async function getUserScore(req, res) {
  try {
    const { id: leaderboardId, userId } = req.params;
    
    // Users can only view their own scores unless admin
    const requestingUserId = req.user?.id;
    if (parseInt(userId) !== requestingUserId) {
      // TODO: Add admin role check here
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const score = await scoreService.getUserScore(leaderboardId, parseInt(userId));
    
    if (!score) {
      return res.status(404).json({ 
        error: 'No score found for this user in this leaderboard' 
      });
    }
    
    res.json({
      success: true,
      leaderboardId,
      userId: parseInt(userId),
      ...score
    });
    
  } catch (error) {
    console.error('Get user score error:', error);
    res.status(500).json({ error: 'Failed to retrieve user score' });
  }
}

/**
 * DELETE /plugins/leaderboards/:id/user/:userId/score - Delete user's score
 */
async function deleteUserScore(req, res) {
  try {
    const { id: leaderboardId, userId } = req.params;
    const { entryId } = req.query;
    
    // Users can only delete their own scores unless admin
    const requestingUserId = req.user?.id;
    if (parseInt(userId) !== requestingUserId) {
      // TODO: Add admin role check here
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await scoreService.deleteScore(
      leaderboardId, 
      parseInt(userId), 
      entryId ? parseInt(entryId) : null
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('Delete user score error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to delete score' });
  }
}

module.exports = {
  submit,
  getUserScore,
  deleteUserScore
};
