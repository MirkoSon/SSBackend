/**
 * Create Note Handler
 *
 * POST /notes
 * Creates a new note for the authenticated user.
 *
 * Body:
 * - title: string (required)
 * - content: string (optional)
 * - is_public: boolean (optional)
 * - tags: string[] (optional)
 */

const NoteService = require('../services/NoteService');

module.exports = async (req, res) => {
  const { db, config } = req.pluginContext;
  const userId = req.user.id;

  const { title, content, is_public, tags } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const service = new NoteService(db, config);

    // Create the note
    const note = await service.create(userId, {
      title,
      content,
      is_public
    });

    // Add tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      await service.addTags(note.id, tags);
    }

    res.status(201).json({
      note: {
        ...note,
        tags: tags || []
      },
      message: 'Note created successfully'
    });
  } catch (error) {
    console.error('[Notes] Create error:', error.message);

    // Return appropriate status code based on error
    if (error.message.includes('required') || error.message.includes('exceeds')) {
      return res.status(400).json({ error: error.message });
    }

    if (error.message.includes('limit')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to create note',
      message: error.message
    });
  }
};
