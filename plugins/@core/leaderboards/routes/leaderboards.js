const leaderboardService = require('../services/leaderboardService');

/**
 * Leaderboard Management Route Handlers
 */

/**
 * POST /plugins/leaderboards/create - Create new leaderboard
 */
async function create(req, res) {
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
}

/**
 * GET /plugins/leaderboards - List all leaderboards
 */
async function list(req, res) {
  try {
    const { includeInactive = false } = req.query;
    
    const leaderboards = await leaderboardService.getLeaderboards(
      includeInactive === 'true'
    );
    
    res.json({
      success: true,
      leaderboards,
      count: leaderboards.length
    });
  } catch (error) {
    console.error('List leaderboards error:', error);
    res.status(500).json({ error: 'Failed to retrieve leaderboards' });
  }
}

/**
 * GET /plugins/leaderboards/:id - Get leaderboard details
 */
async function getById(req, res) {
  try {
    const { id } = req.params;
    
    const leaderboard = await leaderboardService.getLeaderboardById(id);
    
    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to retrieve leaderboard' });
  }
}

/**
 * POST /plugins/leaderboards/:id/reset - Reset leaderboard (clear all scores)
 */
async function reset(req, res) {
  try {
    const { id } = req.params;
    
    // TODO: Add admin role check here
    // For now, any authenticated user can reset (will be fixed in future story)
    
    const result = await leaderboardService.resetLeaderboard(id);
    
    res.json(result);
  } catch (error) {
    console.error('Reset leaderboard error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to reset leaderboard' });
  }
}

/**
 * DELETE /plugins/leaderboards/:id - Delete leaderboard
 */
async function deleteLeaderboard(req, res) {
  try {
    const { id } = req.params;
    
    // TODO: Add admin role check here
    // For now, any authenticated user can delete (will be fixed in future story)
    
    const result = await leaderboardService.deleteLeaderboard(id);
    
    res.json(result);
  } catch (error) {
    console.error('Delete leaderboard error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to delete leaderboard' });
  }
}

// Export handlers with correct names for the router format
module.exports = {
  create,
  list,
  getById,
  reset,
  delete: deleteLeaderboard
};
