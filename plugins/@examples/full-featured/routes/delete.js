/**
 * Delete Note Handler
 *
 * DELETE /notes/:id
 * Deletes a note owned by the authenticated user.
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
    const result = await service.delete(noteId, userId);

    if (result.deleted) {
      res.json({ message: 'Note deleted successfully' });
    } else {
      res.status(404).json({ error: 'Note not found' });
    }
  } catch (error) {
    console.error('[Notes] Delete error:', error.message);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to delete note',
      message: error.message
    });
  }
};
