const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Watchlist = require('../models/Watchlist');

console.log('👀 Watchlist routes loading...');

// Get watchlist
router.get('/', auth, async (req, res) => {
  try {
    const userId = typeof req.userId === 'string'
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;
    
    const watchlist = await Watchlist.getOrCreate(userId);
    const sortedItems = watchlist.items.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    res.json({ success: true, watchlist: sortedItems });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching watchlist' });
  }
});

// Add to watchlist
router.post('/add', auth, async (req, res) => {
  try {
    const { symbol, name, type } = req.body;
    
    const userId = typeof req.userId === 'string'
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;
    
    const watchlist = await Watchlist.getOrCreate(userId);
    
    if (watchlist.hasSymbol(symbol)) {
      return res.status(400).json({ success: false, message: 'Already in watchlist' });
    }
    
    watchlist.addItem(symbol, name, type);
    await watchlist.save();
    
    res.json({ success: true, message: 'Added to watchlist', items: watchlist.items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error adding to watchlist' });
  }
});

// Remove from watchlist
router.delete('/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const userId = typeof req.userId === 'string'
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;
    
    const watchlist = await Watchlist.getOrCreate(userId);
    watchlist.removeItem(symbol);
    await watchlist.save();
    
    res.json({ success: true, message: 'Removed from watchlist', items: watchlist.items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error removing from watchlist' });
  }
});

// Reorder watchlist
router.put('/reorder', auth, async (req, res) => {
  console.log('\n🔄 ===== REORDER WATCHLIST REQUEST =====');
  
  try {
    const { orderedSymbols } = req.body;
    
    if (!Array.isArray(orderedSymbols)) {
      return res.status(400).json({ success: false, message: 'orderedSymbols must be an array' });
    }
    
    console.log(`👤 User: ${req.userId}`);
    console.log(`📊 New order:`, orderedSymbols);
    
    const userId = typeof req.userId === 'string'
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;
    
    const watchlist = await Watchlist.findOne({ userId });
    
    if (!watchlist) {
      return res.status(404).json({ success: false, message: 'Watchlist not found' });
    }
    
    orderedSymbols.forEach((symbol, index) => {
      const item = watchlist.items.find(i => i.symbol.toUpperCase() === symbol.toUpperCase());
      if (item) {
        item.order = index;
        console.log(`   ${symbol}: position ${index}`);
      }
    });
    
    await watchlist.save();
    
    console.log('✅ Watchlist order saved to database');
    
    const sortedItems = watchlist.items.sort((a, b) => a.order - b.order);
    
    res.json({
      success: true,
      message: 'Watchlist reordered successfully',
      items: sortedItems
    });
    
  } catch (error) {
    console.error('❌ Error reordering watchlist:', error);
    res.status(500).json({ success: false, message: 'Error reordering watchlist', error: error.message });
  }
});

console.log('✅ Watchlist routes registered');

module.exports = router;

// PUT /api/watchlist/reorder - Update order of all items
router.put('/reorder', auth, async (req, res) => {
  try {
    const userId = typeof req.userId === 'string'
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    const { orderedSymbols } = req.body; // Array of symbols in new order

    if (!Array.isArray(orderedSymbols)) {
      return res.status(400).json({ 
        success: false, 
        message: 'orderedSymbols must be an array' 
      });
    }

    const watchlist = await Watchlist.findOne({ userId });

    if (!watchlist) {
      return res.status(404).json({ 
        success: false, 
        message: 'Watchlist not found' 
      });
    }

    // Update order field for each item based on position in orderedSymbols
    watchlist.items.forEach(item => {
      const newIndex = orderedSymbols.indexOf(item.symbol);
      if (newIndex !== -1) {
        item.order = newIndex;
      }
    });

    // Sort by new order
    watchlist.items.sort((a, b) => a.order - b.order);

    await watchlist.save();

    console.log('✅ Watchlist reordered:', orderedSymbols.length, 'items');

    res.json({ 
      success: true, 
      message: 'Watchlist reordered',
      watchlist: watchlist.items.sort((a, b) => a.order - b.order)
    });

  } catch (error) {
    console.error('Error reordering watchlist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error reordering watchlist' 
    });
  }
});

