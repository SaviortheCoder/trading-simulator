// ============================================
// TRADE ROUTES - Buy and sell stocks/crypto
// ============================================

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');

// ============================================
// POST /api/trade/buy - Buy stocks/crypto
// ============================================

router.post('/buy', authenticate, async (req, res) => {
  try {
    const { symbol, quantity, price, name, type } = req.body;

    // Validate input
    if (!symbol || !quantity || !price) {
      return res.status(400).json({
        success: false,
        error: 'Symbol, quantity, and price are required',
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0',
      });
    }

    const totalCost = price * quantity;

    // Get user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if user has enough cash
    if (user.cashBalance < totalCost) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient funds',
        required: totalCost,
        available: user.cashBalance,
      });
    }

    // Check if user already owns this asset
    let holding = await Portfolio.findOne({ 
      userId: req.userId, 
      symbol: symbol.toUpperCase() 
    });

    if (holding) {
      // Update existing holding using the model's method
      await holding.addShares(quantity, price);
    } else {
      // Create new holding
      holding = new Portfolio({
        userId: req.userId,
        symbol: symbol.toUpperCase(),
        name: name || symbol,
        type: type || 'stock',
        quantity,
        avgBuyPrice: price,
        currentPrice: price,
      });
      await holding.save();
    }

    // Update user cash balance
    user.cashBalance -= totalCost;
    await user.save();

    // Create transaction record with correct field names
    const transaction = new Transaction({
      userId: req.userId,
      symbol: symbol.toUpperCase(),
      name: name || symbol,
      type: type || 'stock',
      action: 'buy',  // ← Changed from 'type' to 'action'
      quantity,
      price,
      totalAmount: totalCost,  // ← Changed from 'total' to 'totalAmount'
      status: 'completed',
    });
    await transaction.save();

    res.json({
      success: true,
      transaction: {
        type: 'buy',
        symbol: symbol.toUpperCase(),
        quantity,
        price,
        total: totalCost,
      },
      newCashBalance: user.cashBalance,
      holding: {
        symbol: holding.symbol,
        quantity: holding.quantity,
        avgBuyPrice: holding.avgBuyPrice,
        currentPrice: holding.currentPrice,
      },
    });
  } catch (error) {
    console.error('Buy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute buy order',
    });
  }
});

// ============================================
// POST /api/trade/sell - Sell stocks/crypto
// ============================================

router.post('/sell', authenticate, async (req, res) => {
  try {
    const { symbol, quantity, price } = req.body;

    // Validate input
    if (!symbol || !quantity || !price) {
      return res.status(400).json({
        success: false,
        error: 'Symbol, quantity, and price are required',
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0',
      });
    }

    const totalValue = price * quantity;

    // Get user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Find holding
    const holding = await Portfolio.findOne({ 
      userId: req.userId, 
      symbol: symbol.toUpperCase() 
    });

    if (!holding) {
      return res.status(400).json({
        success: false,
        error: `You don't own any ${symbol}`,
      });
    }

    if (holding.quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: `Insufficient shares. You own ${holding.quantity} shares`,
        owned: holding.quantity,
        requested: quantity,
      });
    }

    // Store holding details before potentially deleting it
    const holdingName = holding.name;
    const holdingType = holding.type;

    // Remove shares (this will delete the holding if quantity reaches 0)
    await holding.removeShares(quantity);

    // Update user cash balance
    user.cashBalance += totalValue;
    await user.save();

    // Create transaction record with correct field names
    const transaction = new Transaction({
      userId: req.userId,
      symbol: symbol.toUpperCase(),
      name: holdingName,
      type: holdingType,
      action: 'sell',  // ← Changed from 'type' to 'action'
      quantity,
      price,
      totalAmount: totalValue,  // ← Changed from 'total' to 'totalAmount'
      status: 'completed',
    });
    await transaction.save();

    res.json({
      success: true,
      transaction: {
        type: 'sell',
        symbol: symbol.toUpperCase(),
        quantity,
        price,
        total: totalValue,
      },
      newCashBalance: user.cashBalance,
      remainingShares: holding.quantity > 0 ? holding.quantity : 0,
    });
  } catch (error) {
    console.error('Sell error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute sell order',
    });
  }
});

// ============================================
// GET /api/trade/holdings - Get user holdings
// ============================================

router.get('/holdings', authenticate, async (req, res) => {
  try {
    const holdings = await Portfolio.getUserPortfolio(req.userId);

    res.json({
      success: true,
      holdings: holdings.map(h => ({
        symbol: h.symbol,
        name: h.name,
        type: h.type,
        quantity: h.quantity,
        avgBuyPrice: h.avgBuyPrice,
        currentPrice: h.currentPrice,
        currentValue: h.currentValue,
        profitLoss: h.profitLoss,
        profitLossPercent: h.profitLossPercent,
      })),
    });
  } catch (error) {
    console.error('Get holdings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get holdings',
    });
  }
});

// ============================================
// GET /api/trade/holding/:symbol - Get specific holding
// ============================================

router.get('/holding/:symbol', authenticate, async (req, res) => {
    try {
      const { symbol } = req.params;
      
      const holding = await Portfolio.findOne({ 
        userId: req.userId, 
        symbol: symbol.toUpperCase() 
      });
  
      if (!holding) {
        return res.json({
          success: true,
          holding: null,
        });
      }
  
      res.json({
        success: true,
        holding: {
          symbol: holding.symbol,
          name: holding.name,
          type: holding.type,
          quantity: holding.quantity,
          avgBuyPrice: holding.avgBuyPrice,
          currentPrice: holding.currentPrice,
          totalCost: holding.totalCost,
          currentValue: holding.currentValue,
          profitLoss: holding.profitLoss,
          profitLossPercent: holding.profitLossPercent,
        },
      });
    } catch (error) {
      console.error('Get holding error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get holding',
      });
    }
  });
  
  // ============================================
  // GET /api/trade/transactions/:symbol - Get transactions for symbol
  // ============================================
  
  router.get('/transactions/:symbol', authenticate, async (req, res) => {
    try {
      const { symbol } = req.params;
      
      const transactions = await Transaction.getSymbolTransactions(
        req.userId, 
        symbol.toUpperCase()
      );
  
      res.json({
        success: true,
        transactions,
      });
    } catch (error) {
      console.error('Get symbol transactions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transactions',
      });
    }
  });

// ============================================
// GET /api/trade/transactions - Get transaction history
// ============================================

router.get('/transactions', authenticate, async (req, res) => {
  try {
    const transactions = await Transaction.getUserTransactions(req.userId, 50);

    res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transactions',
    });
  }
});

module.exports = router;