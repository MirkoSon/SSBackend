const express = require('express');
const { getDatabase } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
// achievementChecker is now handled dynamically via the achievements plugin if enabled
// const achievementChecker = require('../utils/achievementChecker');

const router = express.Router();

/**
 * POST /progress/update - Update character progress metrics
 * Headers: Authorization: Bearer <jwt_token>
 * Body: { metric: string, value: number, increment?: boolean }
 */
router.post('/update', authenticateToken, async (req, res) => {
  const { metric, value, increment = false } = req.body;
  const userId = req.user.id;

  // Validate input
  if (!metric || typeof metric !== 'string') {
    return res.status(400).json({ error: 'Metric name is required and must be a string' });
  }

  if (value === undefined || typeof value !== 'number') {
    return res.status(400).json({ error: 'Value is required and must be a number' });
  }

  if (value < 0) {
    return res.status(400).json({ error: 'Value cannot be negative' });
  }

  try {
    const db = getDatabase();

    // Get current progress if it exists
    const currentQuery = `
      SELECT current_value, max_value FROM character_progress 
      WHERE user_id = ? AND metric_name = ?
    `;

    const currentProgress = await new Promise((resolve, reject) => {
      db.get(currentQuery, [userId, metric], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    let newValue;
    if (increment && currentProgress) {
      newValue = currentProgress.current_value + value;
    } else {
      newValue = value;
    }

    // Ensure new value doesn't exceed max_value if set
    if (currentProgress && currentProgress.max_value !== null) {
      newValue = Math.min(newValue, currentProgress.max_value);
    }

    // Insert or update progress
    const upsertQuery = `
      INSERT INTO character_progress (user_id, metric_name, current_value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, metric_name) DO UPDATE SET
        current_value = excluded.current_value,
        updated_at = CURRENT_TIMESTAMP
    `;

    await new Promise((resolve, reject) => {
      db.run(upsertQuery, [userId, metric, newValue], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });

    // Check for new achievements via the plugin service if active
    let newAchievements = [];
    if (global.pluginManager && global.pluginManager.activePlugins.has('achievements')) {
      const achievementPlugin = global.pluginManager.activePlugins.get('achievements');
      if (achievementPlugin.context && achievementPlugin.context.achievementService) {
        newAchievements = await achievementPlugin.context.achievementService.checkAchievements(userId, metric, newValue);
      }
    }

    res.json({
      userId,
      metric,
      currentValue: newValue,
      updated: true,
      newAchievements: newAchievements.map(achievement => ({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description
      })),
      message: `Progress updated for metric: ${metric}`
    });

  } catch (error) {
    console.error('Error updating progress:', error.message);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

/**
 * GET /progress/:userId - Get character progress for user
 * Headers: Authorization: Bearer <jwt_token>
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  const targetUserId = parseInt(req.params.userId);
  const requestingUserId = req.user.id;

  // Validate user ID
  if (isNaN(targetUserId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Users can only access their own progress (for now)
  if (targetUserId !== requestingUserId) {
    return res.status(403).json({ error: 'Cannot access another user\'s progress' });
  }

  try {
    const db = getDatabase();

    // Get all progress for user
    const progressQuery = `
      SELECT metric_name, current_value, max_value, updated_at 
      FROM character_progress 
      WHERE user_id = ?
      ORDER BY metric_name
    `;

    const progress = await new Promise((resolve, reject) => {
      db.all(progressQuery, [targetUserId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    const progressData = progress.map(row => ({
      metric: row.metric_name,
      currentValue: row.current_value,
      maxValue: row.max_value,
      updatedAt: row.updated_at,
      progressPercent: row.max_value ? Math.round((row.current_value / row.max_value) * 100) : null
    }));

    res.json({
      userId: targetUserId,
      progress: progressData,
      message: 'Character progress retrieved successfully'
    });

  } catch (error) {
    console.error('Error retrieving progress:', error.message);
    res.status(500).json({ error: 'Failed to retrieve progress' });
  }
});

/**
 * GET /progress/:userId/:metric - Get specific metric progress
 * Headers: Authorization: Bearer <jwt_token>
 */
router.get('/:userId/:metric', authenticateToken, async (req, res) => {
  const targetUserId = parseInt(req.params.userId);
  const metric = req.params.metric;
  const requestingUserId = req.user.id;

  // Validate parameters
  if (isNaN(targetUserId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (!metric || typeof metric !== 'string') {
    return res.status(400).json({ error: 'Invalid metric name' });
  }

  // Users can only access their own progress
  if (targetUserId !== requestingUserId) {
    return res.status(403).json({ error: 'Cannot access another user\'s progress' });
  }

  try {
    const db = getDatabase();

    // Get specific metric progress
    const progressQuery = `
      SELECT metric_name, current_value, max_value, updated_at 
      FROM character_progress 
      WHERE user_id = ? AND metric_name = ?
    `;

    const progress = await new Promise((resolve, reject) => {
      db.get(progressQuery, [targetUserId, metric], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!progress) {
      return res.status(404).json({
        error: 'Progress metric not found',
        suggestion: 'Update this metric first to initialize it'
      });
    }

    // Get achievement progress for this metric via the plugin service if active
    let achievementProgress = [];
    if (global.pluginManager && global.pluginManager.activePlugins.has('achievements')) {
      const achievementPlugin = global.pluginManager.activePlugins.get('achievements');
      if (achievementPlugin.context && achievementPlugin.context.achievementService) {
        achievementProgress = await achievementPlugin.context.achievementService.getProgressTowardAchievements(targetUserId, metric);
      }
    }

    res.json({
      userId: targetUserId,
      metric: progress.metric_name,
      currentValue: progress.current_value,
      maxValue: progress.max_value,
      updatedAt: progress.updated_at,
      progressPercent: progress.max_value ? Math.round((progress.current_value / progress.max_value) * 100) : null,
      achievementProgress,
      message: `Progress retrieved for metric: ${metric}`
    });

  } catch (error) {
    console.error('Error retrieving metric progress:', error.message);
    res.status(500).json({ error: 'Failed to retrieve metric progress' });
  }
});

/**
 * POST /progress/set-max - Set maximum value for a progress metric
 * Headers: Authorization: Bearer <jwt_token>
 * Body: { metric: string, maxValue: number }
 */
router.post('/set-max', authenticateToken, async (req, res) => {
  const { metric, maxValue } = req.body;
  const userId = req.user.id;

  // Validate input
  if (!metric || typeof metric !== 'string') {
    return res.status(400).json({ error: 'Metric name is required and must be a string' });
  }

  if (maxValue === undefined || typeof maxValue !== 'number' || maxValue <= 0) {
    return res.status(400).json({ error: 'Max value must be a positive number' });
  }

  try {
    const db = getDatabase();

    // Insert or update max value for metric
    const upsertQuery = `
      INSERT INTO character_progress (user_id, metric_name, current_value, max_value, updated_at)
      VALUES (?, ?, 0, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, metric_name) DO UPDATE SET
        max_value = excluded.max_value,
        updated_at = CURRENT_TIMESTAMP
    `;

    await new Promise((resolve, reject) => {
      db.run(upsertQuery, [userId, metric, maxValue], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      userId,
      metric,
      maxValue,
      message: `Maximum value set for metric: ${metric}`
    });

  } catch (error) {
    console.error('Error setting max value:', error.message);
    res.status(500).json({ error: 'Failed to set maximum value' });
  }
});

module.exports = router;
