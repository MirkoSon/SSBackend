/**
 * Delete Board Route Handler
 * DELETE /leaderboards/:boardId
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

    // Delete the leaderboard (will cascade delete entries due to FK constraint)
    const db = leaderboardService.db;
    const stmt = db.prepare('DELETE FROM plugin_leaderboards WHERE id = ?');
    const result = stmt.run(boardIdNum);

    res.json({
      success: true,
      message: 'Leaderboard deleted successfully',
      data: {
        deletedLeaderboard: leaderboard.name,
        entriesDeleted: leaderboard.entry_count
      }
    });

  } catch (error) {
    console.error('Error deleting leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete leaderboard'
    });
  }
};