// ============================================
// PRICE ROUTES - With smart caching
// ============================================

const express = require('express');
const router = express.Router();
const priceCache = require('../services/priceCache');
const {
  getStockPrice,
  getCryptoPrice,
  getBulkPrices,
  getCacheStats,
  searchSymbols,
} = require('../services/priceCache');

// ============================================
// GET /api/prices/stock/:symbol - Get stock price
// ============================================

router.get('/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await getStockPrice(symbol);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Stock price error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock price',
    });
  }
});

// ============================================
// GET /api/prices/crypto/:symbol - Get crypto price
// ============================================

router.get('/crypto/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await getCryptoPrice(symbol);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Crypto price error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch crypto price',
    });
  }
});

// ============================================
// POST /api/prices/bulk - Get multiple prices at once
// ============================================

router.post('/bulk', async (req, res) => {
    try {
      const { symbols } = req.body;
      
      if (!symbols || !Array.isArray(symbols)) {
        return res.status(400).json({
          success: false,
          error: 'Symbols array is required'
        });
      }
  
      // Normalize symbols - handle both string[] and {symbol, type}[]
      const normalizedSymbols = symbols.map(s => {
        if (typeof s === 'string') {
          return { symbol: s, type: 'stock' };
        }
        return s;
      });
  
      const prices = await getBulkPrices(normalizedSymbols);

      res.json({
        success: true,
        prices
      });
    } catch (error) {
      console.error('Bulk price error:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bulk prices'
      });
    }
  });

// ============================================
// GET /api/prices/search/:query - Search stocks (cached)
// ============================================

router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters',
      });
    }

    const results = await searchSymbols(query);

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

// ============================================
// GET /api/prices/cache/stats - Get cache statistics
// ============================================

router.get('/cache/stats', (req, res) => {
  const stats = getCacheStats();
  res.json({
    success: true,
    stats,
  });
});

module.exports = router;