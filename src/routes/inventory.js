const express = require('express');
const { getDatabase } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all inventory routes
router.use(authenticateToken);

/**
 * Authorization middleware to check inventory ownership
 * Users can only access their own inventory data
 */
function checkInventoryOwnership(req, res, next) {
  const requestedUserId = parseInt(req.params.userId || req.body.userId);
  const authenticatedUserId = req.user.id;

  if (isNaN(requestedUserId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (requestedUserId !== authenticatedUserId) {
    return res.status(403).json({ 
      error: 'Cannot access another user\'s inventory' 
    });
  }

  next();
}

module.exports = router;
/**
 * POST /inventory/add - Add item to user's inventory
 * Body: { userId: number, itemId: string, quantity: number }
 */
router.post('/add', checkInventoryOwnership, (req, res) => {
  const { userId, itemId, quantity } = req.body;

  // Validate input
  if (!userId || !itemId || quantity === undefined) {
    return res.status(400).json({ 
      error: 'userId, itemId, and quantity are required' 
    });
  }

  if (typeof itemId !== 'string' || itemId.trim().length === 0) {
    return res.status(400).json({ error: 'itemId must be a non-empty string' });
  }

  const quantityNum = parseInt(quantity);
  if (isNaN(quantityNum) || quantityNum < 1) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }

  try {
    const db = req.db; // Use project-specific database
    
    // Check if item already exists for this user
    const checkQuery = 'SELECT quantity FROM inventory WHERE user_id = ? AND item_id = ?';
    
    db.get(checkQuery, [userId, itemId], (err, existingItem) => {
      if (err) {
        console.error('Database error checking existing item:', err.message);
        return res.status(500).json({ error: 'Failed to check inventory' });
      }

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + quantityNum;
        const updateQuery = `
          UPDATE inventory 
          SET quantity = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE user_id = ? AND item_id = ?
        `;

        db.run(updateQuery, [newQuantity, userId, itemId], function(err) {
          if (err) {
            console.error('Database error updating item quantity:', err.message);
            return res.status(500).json({ error: 'Failed to update inventory' });
          }

          res.json({
            userId: userId,
            itemId: itemId,
            quantity: newQuantity,
            message: 'Item quantity updated'
          });
        });
      } else {
        // Insert new item
        const insertQuery = `
          INSERT INTO inventory (user_id, item_id, quantity) 
          VALUES (?, ?, ?)
        `;

        db.run(insertQuery, [userId, itemId, quantityNum], function(err) {
          if (err) {
            console.error('Database error adding new item:', err.message);
            return res.status(500).json({ error: 'Failed to add item to inventory' });
          }

          res.json({
            userId: userId,
            itemId: itemId,
            quantity: quantityNum,
            message: 'Item added to inventory'
          });
        });
      }
    });

  } catch (error) {
    console.error('Error adding to inventory:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /inventory/:userId - Get user's complete inventory
 */
router.get('/:userId', checkInventoryOwnership, (req, res) => {
  const userId = parseInt(req.params.userId);

  try {
    const db = req.db; // Use project-specific database
    
    // First verify user exists
    const userQuery = 'SELECT id FROM users WHERE id = ?';
    
    db.get(userQuery, [userId], (err, user) => {
      if (err) {
        console.error('Database error checking user:', err.message);
        return res.status(500).json({ error: 'Failed to check user' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get all inventory items for the user
      const inventoryQuery = `
        SELECT item_id, quantity, created_at, updated_at 
        FROM inventory 
        WHERE user_id = ? 
        ORDER BY item_id ASC
      `;

      db.all(inventoryQuery, [userId], (err, items) => {
        if (err) {
          console.error('Database error getting inventory:', err.message);
          return res.status(500).json({ error: 'Failed to get inventory' });
        }

        res.json({
          userId: userId,
          items: items.map(item => ({
            itemId: item.item_id,
            quantity: item.quantity,
            created_at: item.created_at,
            updated_at: item.updated_at
          })),
          totalItems: items.length
        });
      });
    });

  } catch (error) {
    console.error('Error getting inventory:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /inventory/:userId/:itemId - Remove specific item from user's inventory
 */
router.delete('/:userId/:itemId', checkInventoryOwnership, (req, res) => {
  const userId = parseInt(req.params.userId);
  const itemId = req.params.itemId;

  // Validate input
  if (!itemId || typeof itemId !== 'string' || itemId.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid itemId' });
  }

  try {
    const db = req.db; // Use project-specific database
    
    // Check if item exists in user's inventory
    const checkQuery = 'SELECT quantity FROM inventory WHERE user_id = ? AND item_id = ?';
    
    db.get(checkQuery, [userId, itemId], (err, existingItem) => {
      if (err) {
        console.error('Database error checking item:', err.message);
        return res.status(500).json({ error: 'Failed to check inventory item' });
      }

      if (!existingItem) {
        return res.status(404).json({ error: 'Item not found in inventory' });
      }

      // Delete the item
      const deleteQuery = 'DELETE FROM inventory WHERE user_id = ? AND item_id = ?';
      
      db.run(deleteQuery, [userId, itemId], function(err) {
        if (err) {
          console.error('Database error deleting item:', err.message);
          return res.status(500).json({ error: 'Failed to remove item from inventory' });
        }

        res.json({
          message: 'Item removed from inventory',
          userId: userId,
          itemId: itemId,
          removedQuantity: existingItem.quantity
        });
      });
    });

  } catch (error) {
    console.error('Error removing from inventory:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});
