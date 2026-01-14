const leaderboardService = require('../../services/leaderboardService');

/**
 * POST /plugins/leaderboards/create - Create new leaderboard
 */
module.exports = async (req, res) => {
  try {
    const { id, name, type, description, resetSchedule, config } = req.body;
    const createdBy = req.user?.id;
    
    if (!id || !name || !type) {
      return res.status(400).json({ 
        error: 'Missing required fields: id, name, type' 
      });
    }
    
    const leaderboard = await leaderboardService.createLeaderboard({
      id,
      name,
      type,
      description,
      resetSchedule,
      config,
      createdBy
    });
    
    res.status(201).json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('Create leaderboard error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(400).json({ error: error.message });
  }
};
