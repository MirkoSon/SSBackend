const express = require('express');
const { getDatabase } = require('../db/database');

const router = express.Router();

/**
 * POST /save - Save game data
 * Body: { id: string, data: object }
 */
router.post('/', (req, res) => {
  const { id, data } = req.body;

  // Validate input
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing id' });
  }

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid or missing data' });
  }

  try {
    const db = getDatabase();
    const dataString = JSON.stringify(data);

    // Insert or replace save data
    const query = `
      INSERT OR REPLACE INTO saves (id, data, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `;

    db.run(query, [id, dataString], function(err) {
      if (err) {
        console.error('Database error saving data:', err.message);
        return res.status(500).json({ error: 'Failed to save data' });
      }

      res.json({ 
        success: true, 
        id: id,
        message: 'Data saved successfully'
      });
    });

  } catch (error) {
    console.error('Error saving data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /save/:id - Load game data by ID
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid id parameter' });
  }

  try {
    const db = getDatabase();
    const query = 'SELECT data, created_at, updated_at FROM saves WHERE id = ?';

    db.get(query, [id], (err, row) => {
      if (err) {
        console.error('Database error loading data:', err.message);
        return res.status(500).json({ error: 'Failed to load data' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Save not found' });
      }

      try {
        const data = JSON.parse(row.data);
        res.json({
          id: id,
          data: data,
          created_at: row.created_at,
          updated_at: row.updated_at
        });
      } catch (parseError) {
        console.error('Error parsing saved data:', parseError.message);
        res.status(500).json({ error: 'Data corruption detected' });
      }
    });

  } catch (error) {
    console.error('Error loading data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /save - List all save IDs (useful for debugging)
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const query = 'SELECT id, created_at, updated_at FROM saves ORDER BY updated_at DESC';

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Database error listing saves:', err.message);
        return res.status(500).json({ error: 'Failed to list saves' });
      }

      res.json({
        saves: rows,
        count: rows.length
      });
    });

  } catch (error) {
    console.error('Error listing saves:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;