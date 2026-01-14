/**
 * List Notes Handler
 *
 * GET /notes
 * Returns all notes for the authenticated user.
 */

const NoteService = require('../services/NoteService');

module.exports = async (req, res) => {
  const { db, config } = req.pluginContext;
  const userId = req.user.id;

  try {
    const service = new NoteService(db, config);
    const notes = await service.getByUser(userId);

    res.json({
      notes,
      count: notes.length
    });
  } catch (error) {
    console.error('[Notes] List error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch notes',
      message: error.message
    });
  }
};
