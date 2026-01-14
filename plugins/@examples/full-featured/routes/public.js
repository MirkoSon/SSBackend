/**
 * Public Notes Handler
 *
 * GET /notes/public/all
 * Returns all public notes (no authentication required).
 */

const NoteService = require('../services/NoteService');

module.exports = async (req, res) => {
  const { db, config } = req.pluginContext;

  // Check if public notes are enabled
  if (config.allowPublicNotes === false) {
    return res.status(403).json({
      error: 'Public notes are disabled'
    });
  }

  const limit = parseInt(req.query.limit) || 50;

  try {
    const service = new NoteService(db, config);
    const notes = await service.getPublic(Math.min(limit, 100));

    res.json({
      notes,
      count: notes.length
    });
  } catch (error) {
    console.error('[Notes] Public list error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch public notes',
      message: error.message
    });
  }
};
