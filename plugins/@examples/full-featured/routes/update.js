/**
 * Update Note Handler
 *
 * PUT /notes/:id
 * Updates an existing note.
 *
 * Body (all optional):
 * - title: string
 * - content: string
 * - is_public: boolean
 */

const NoteService = require('../services/NoteService');

module.exports = async (req, res) => {
  const { db, config } = req.pluginContext;
  const userId = req.user.id;
  const noteId = parseInt(req.params.id);

  if (isNaN(noteId)) {
    return res.status(400).json({ error: 'Invalid note ID' });
  }

  const { title, content, is_public } = req.body;

  try {
    const service = new NoteService(db, config);

    const updatedNote = await service.update(noteId, userId, {
      title,
      content,
      is_public
    });

    res.json({
      note: updatedNote,
      message: 'Note updated successfully'
    });
  } catch (error) {
    console.error('[Notes] Update error:', error.message);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Not authorized')) {
      return res.status(403).json({ error: error.message });
    }

    if (error.message.includes('exceeds') || error.message.includes('not allowed')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to update note',
      message: error.message
    });
  }
};
