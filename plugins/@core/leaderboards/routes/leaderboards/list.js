const leaderboardService = require('../../services/leaderboardService');

/**
 * GET /plugins/leaderboards - List all leaderboards
 */
module.exports = async (req, res) => {
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
};
