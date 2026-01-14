/**
 * Update Board Route Handler
 * PUT /leaderboards/:boardId
 */

module.exports = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name, description, isActive, maxEntries, resetSchedule, metadata } = req.body;

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
    const existingBoard = await leaderboardService.getLeaderboard(boardIdNum);
    if (!existingBoard) {
      return res.status(404).json({
        success: false,
        message: 'Leaderboard not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }
    if (maxEntries !== undefined) {
      updates.push('max_entries = ?');
      params.push(maxEntries);
    }
    if (resetSchedule !== undefined) {
      updates.push('reset_schedule = ?');
      params.push(resetSchedule);
    }
    if (metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(metadata ? JSON.stringify(metadata) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Add updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(boardIdNum);

    // Execute update
    const db = leaderboardService.db;
    const stmt = db.prepare(`
      UPDATE plugin_leaderboards 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    stmt.run(...params);

    // Return updated leaderboard
    const updatedBoard = await leaderboardService.getLeaderboard(boardIdNum);

    res.json({
      success: true,
      data: updatedBoard,
      message: 'Leaderboard updated successfully'
    });

  } catch (error) {
    console.error('Error updating leaderboard:', error);
    
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({
        success: false,
        message: 'A leaderboard with this name already exists'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update leaderboard'
      });
    }
  }
};