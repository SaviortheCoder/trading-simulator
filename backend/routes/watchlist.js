// ============================================
// WATCHLIST ROUTES - User's watched assets
// ============================================

const express = require('express');
const router = express.Router();
const Watchlist = require('../models/Watchlist');
const { authenticate } = require('../middleware/auth');

// Popular stocks to initialize watchlist (reduced to 15 for reliability)
const POPULAR_STOCKS = [
    { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
    { symbol: 'TSLA', name: 'Tesla, Inc.', type: 'stock' },
    { symbol: 'META', name: 'Meta Platforms', type: 'stock' },
    { symbol: 'V', name: 'Visa Inc.', type: 'stock' },
    { symbol: 'JPM', name: 'JPMorgan Chase', type: 'stock' },
    { symbol: 'WMT', name: 'Walmart Inc.', type: 'stock' },
    { symbol: 'MA', name: 'Mastercard Inc.', type: 'stock' },
    { symbol: 'HD', name: 'Home Depot', type: 'stock' },
    { symbol: 'DIS', name: 'Walt Disney Co.', type: 'stock' },
    { symbol: 'NFLX', name: 'Netflix Inc.', type: 'stock' },
    { symbol: 'ADBE', name: 'Adobe Inc.', type: 'stock' },
  ];

// ============================================
// GET /api/watchlist - Get user's watchlist
// ============================================

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    // Get or create watchlist
    let watchlist = await Watchlist.findOne({ userId });

    // If no watchlist exists, create one with popular stocks
    if (!watchlist) {
      watchlist = new Watchlist({
        userId,
        items: POPULAR_STOCKS,
      });
      await watchlist.save();
    }

    res.json({
      success: true,
      watchlist: watchlist.items,
    });
  } catch (error) {
    console.error('Watchlist fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch watchlist',
    });
  }
});

// ============================================
// POST /api/watchlist - Add item to watchlist
// ============================================

router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { symbol, name, type } = req.body;

    if (!symbol || !name) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and name are required',
      });
    }

    // Get or create watchlist
    let watchlist = await Watchlist.getOrCreate(userId);

    // Check if already in watchlist
    if (watchlist.hasSymbol(symbol)) {
      return res.status(400).json({
        success: false,
        error: 'Symbol already in watchlist',
      });
    }

    // Add to watchlist
    watchlist.addItem(symbol, name, type || 'stock');
    await watchlist.save();

    res.json({
      success: true,
      message: 'Added to watchlist',
      watchlist: watchlist.items,
    });
  } catch (error) {
    console.error('Watchlist add error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add to watchlist',
    });
  }
});

// ============================================
// DELETE /api/watchlist/:symbol - Remove from watchlist
// ============================================

router.delete('/:symbol', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { symbol } = req.params;

    const watchlist = await Watchlist.findOne({ userId });

    if (!watchlist) {
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found',
      });
    }

    // Remove from watchlist
    watchlist.removeItem(symbol);
    await watchlist.save();

    res.json({
      success: true,
      message: 'Removed from watchlist',
      watchlist: watchlist.items,
    });
  } catch (error) {
    console.error('Watchlist remove error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove from watchlist',
    });
  }
});

module.exports = router;