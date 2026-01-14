/**
 * NoteService
 *
 * Business logic layer for notes management.
 * Handles all database operations and validation.
 */

class NoteService {
  constructor(db, config = {}) {
    this.db = db;
    this.config = {
      maxNotesPerUser: config.maxNotesPerUser || 100,
      allowPublicNotes: config.allowPublicNotes !== false,
      maxNoteLength: config.maxNoteLength || 5000
    };
  }

  /**
   * Get all notes for a user
   */
  async getByUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM plugin_notes WHERE user_id = ? ORDER BY updated_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Get a single note by ID
   */
  async getById(noteId, userId = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM plugin_notes WHERE id = ?';
      const params = [noteId];

      // If userId provided, ensure user owns the note or it's public
      if (userId !== null) {
        query += ' AND (user_id = ? OR is_public = 1)';
        params.push(userId);
      }

      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Get all public notes
   */
  async getPublic(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT n.*, u.username as author
         FROM plugin_notes n
         LEFT JOIN users u ON n.user_id = u.id
         WHERE n.is_public = 1
         ORDER BY n.created_at DESC
         LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Create a new note
   */
  async create(userId, data) {
    // Validate
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Title is required');
    }

    if (data.content && data.content.length > this.config.maxNoteLength) {
      throw new Error(`Content exceeds maximum length of ${this.config.maxNoteLength}`);
    }

    if (data.is_public && !this.config.allowPublicNotes) {
      throw new Error('Public notes are not allowed');
    }

    // Check note limit
    const count = await this.countByUser(userId);
    if (count >= this.config.maxNotesPerUser) {
      throw new Error(`Maximum notes limit (${this.config.maxNotesPerUser}) reached`);
    }

    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();

      this.db.run(
        `INSERT INTO plugin_notes (user_id, title, content, is_public, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, data.title.trim(), data.content || '', data.is_public ? 1 : 0, now, now],
        function(err) {
          if (err) reject(err);
          else resolve({
            id: this.lastID,
            user_id: userId,
            title: data.title.trim(),
            content: data.content || '',
            is_public: !!data.is_public,
            created_at: now,
            updated_at: now
          });
        }
      );
    });
  }

  /**
   * Update a note
   */
  async update(noteId, userId, data) {
    // First check ownership
    const note = await this.getById(noteId);

    if (!note) {
      throw new Error('Note not found');
    }

    if (note.user_id !== userId) {
      throw new Error('Not authorized to update this note');
    }

    // Validate content length
    if (data.content && data.content.length > this.config.maxNoteLength) {
      throw new Error(`Content exceeds maximum length of ${this.config.maxNoteLength}`);
    }

    if (data.is_public && !this.config.allowPublicNotes) {
      throw new Error('Public notes are not allowed');
    }

    return new Promise((resolve, reject) => {
      const updates = [];
      const params = [];

      if (data.title !== undefined) {
        updates.push('title = ?');
        params.push(data.title.trim());
      }

      if (data.content !== undefined) {
        updates.push('content = ?');
        params.push(data.content);
      }

      if (data.is_public !== undefined) {
        updates.push('is_public = ?');
        params.push(data.is_public ? 1 : 0);
      }

      if (updates.length === 0) {
        return resolve(note);
      }

      updates.push('updated_at = ?');
      const now = new Date().toISOString();
      params.push(now);

      params.push(noteId);

      this.db.run(
        `UPDATE plugin_notes SET ${updates.join(', ')} WHERE id = ?`,
        params,
        (err) => {
          if (err) reject(err);
          else resolve({
            ...note,
            ...data,
            updated_at: now
          });
        }
      );
    });
  }

  /**
   * Delete a note
   */
  async delete(noteId, userId) {
    const note = await this.getById(noteId);

    if (!note) {
      throw new Error('Note not found');
    }

    if (note.user_id !== userId) {
      throw new Error('Not authorized to delete this note');
    }

    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM plugin_notes WHERE id = ?',
        [noteId],
        function(err) {
          if (err) reject(err);
          else resolve({ deleted: this.changes > 0 });
        }
      );
    });
  }

  /**
   * Count notes for a user
   */
  async countByUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM plugin_notes WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.count : 0);
        }
      );
    });
  }

  /**
   * Add tags to a note
   */
  async addTags(noteId, tags) {
    if (!Array.isArray(tags) || tags.length === 0) return;

    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(
        'INSERT INTO plugin_notes_tags (note_id, tag) VALUES (?, ?)'
      );

      tags.forEach(tag => {
        stmt.run([noteId, tag.trim().toLowerCase()]);
      });

      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get tags for a note
   */
  async getTags(noteId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT tag FROM plugin_notes_tags WHERE note_id = ?',
        [noteId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows ? rows.map(r => r.tag) : []);
        }
      );
    });
  }
}

module.exports = NoteService;
