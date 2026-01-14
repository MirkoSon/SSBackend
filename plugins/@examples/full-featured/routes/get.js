/**
 * Get Note Handler
 *
 * GET /notes/:id
 * Returns a specific note by ID.
 */

const NoteService = require('../services/NoteService');

module.exports = async (req, res) => {
  const { db, config } = req.pluginContext;
  const userId = req.user.id;
  const noteId = parseInt(req.params.id);

  if (isNaN(noteId)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  try {
    const service = new NoteService(db, config);
    const note = await service.getById(noteId, userId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Get tags for the note
    const tags = await service.getTags(noteId);

    res.json({
      note: {
        ...note,
        tags
      }
    });
  } catch (error) {
    console.error('[Notes] Get error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch note',
      message: error.message
    });
  }
};
