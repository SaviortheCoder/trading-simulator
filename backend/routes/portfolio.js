// ============================================
// PORTFOLIO ROUTES - User holdings
// ============================================

const express = require('express');
const router = express.Router();
const Portfolio = require('../models/Portfolio');
const authenticate = require('../middleware/auth');

// ============================================
// GET /api/portfolio - Get user's portfolio
// ============================================

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;

    // Get all holdings for this user
    const holdings = await Portfolio.find({ userId })
      .sort({ currentValue: -1 }); // Sort by value (highest first)

    res.json({
      success: true,
      holdings,
    });
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio',
    });
  }
});

// ============================================
// GET /api/portfolio/:symbol - Get specific holding
// ============================================

router.get('/:symbol', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { symbol } = req.params;

    const holding = await Portfolio.findOne({
      userId,
      symbol: symbol.toUpperCase(),
    });

    if (!holding) {
      return res.status(404).json({
        success: false,
        error: 'Holding not found',
      });
    }

    res.json({
      success: true,
      holding,
    });
  } catch (error) {
    console.error('Holding fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch holding',
    });
  }
});

module.exports = router;