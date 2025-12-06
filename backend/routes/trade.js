// ============================================
// TRADE ROUTES - Buy/Sell stocks and crypto (FIXED CALCULATIONS)
// ============================================

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Portfolio = require('../models/Portfolio');
const Holding = require('../models/Holding');
const { getStockPrice, getCryptoPrice } = require('../services/priceCache');

// ============================================
// GET HOLDINGS - With correct return calculations
// ============================================
router.get('/holdings', auth, async (req, res) => {
  try {
    const holdings = await Holding.find({ userId: req.userId });
    
    console.log(`📊 Found ${holdings.length} holdings for user ${req.userId}`);
    
    // Get current prices for all holdings
    const holdingsWithPrices = await Promise.all(
      holdings.map(async (holding) => {
        try {
          let priceData;
          
          // Get current price based on type
          if (holding.type === 'crypto') {
            priceData = await getCryptoPrice(holding.symbol);
          } else {
            priceData = await getStockPrice(holding.symbol);
          }
          
          if (!priceData || !priceData.price) {
            console.warn(`⚠️ No price data for ${holding.symbol}`);
            return holding.toObject();
          }

          const currentPrice = priceData.price;
          const previousClose = priceData.previousClose || currentPrice; // Use previousClose if available
          
          // Calculate values
          const currentValue = holding.quantity * currentPrice;
          const totalInvested = holding.quantity * holding.avgBuyPrice;
          const totalReturn = currentValue - totalInvested;
          const totalReturnPercent = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;
          
          // Calculate today's return
          const yesterdayValue = holding.quantity * previousClose;
          const todaysReturn = currentValue - yesterdayValue;
          const todaysReturnPercent = yesterdayValue > 0 ? ((todaysReturn / yesterdayValue) * 100) : 0;

          console.log(`📈 ${holding.symbol}:`, {
            quantity: holding.quantity,
            avgBuyPrice: holding.avgBuyPrice,
            currentPrice: currentPrice,
            previousClose: previousClose,
            currentValue: currentValue.toFixed(2),
            totalInvested: totalInvested.toFixed(2),
            totalReturn: totalReturn.toFixed(2),
            totalReturnPercent: totalReturnPercent.toFixed(2) + '%',
            todaysReturn: todaysReturn.toFixed(2),
            todaysReturnPercent: todaysReturnPercent.toFixed(2) + '%'
          });

          return {
            ...holding.toObject(),
            currentPrice,
            previousClose,
            currentValue,
            profitLoss: totalReturn,
            profitLossPercent: totalReturnPercent.toFixed(2),
            todaysReturn,
            todaysReturnPercent: todaysReturnPercent.toFixed(2),
            totalReturn,
            totalReturnPercent: totalReturnPercent.toFixed(2),
          };
        } catch (error) {
          console.error(`❌ Error processing ${holding.symbol}:`, error.message);
          return holding.toObject();
        }
      })
    );

    res.json({
      success: true,
      holdings: holdingsWithPrices,
    });
  } catch (error) {
    console.error('❌ Error fetching holdings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch holdings',
      error: error.message,
    });
  }
});

// ============================================
// GET SINGLE HOLDING
// ============================================
router.get('/holding/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const holding = await Holding.findOne({ 
      userId: req.userId, 
      symbol: symbol.toUpperCase() 
    });
    
    if (!holding) {
      return res.json({
        success: true,
        holding: null,
      });
    }

    // Get current price
    let priceData;
    if (holding.type === 'crypto') {
      priceData = await getCryptoPrice(holding.symbol);
    } else {
      priceData = await getStockPrice(holding.symbol);
    }

    if (!priceData || !priceData.price) {
      return res.json({
        success: true,
        holding: holding.toObject(),
      });
    }

    const currentPrice = priceData.price;
    const previousClose = priceData.previousClose || currentPrice;
    
    // Calculate values
    const currentValue = holding.quantity * currentPrice;
    const totalInvested = holding.quantity * holding.avgBuyPrice;
    const totalReturn = currentValue - totalInvested;
    const totalReturnPercent = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;
    
    // Calculate today's return
    const yesterdayValue = holding.quantity * previousClose;
    const todaysReturn = currentValue - yesterdayValue;
    const todaysReturnPercent = yesterdayValue > 0 ? ((todaysReturn / yesterdayValue) * 100) : 0;

    res.json({
      success: true,
      holding: {
        ...holding.toObject(),
        currentPrice,
        previousClose,
        currentValue,
        profitLoss: totalReturn,
        profitLossPercent: totalReturnPercent.toFixed(2),
        todaysReturn,
        todaysReturnPercent: todaysReturnPercent.toFixed(2),
        totalReturn,
        totalReturnPercent: totalReturnPercent.toFixed(2),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching holding:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch holding',
      error: error.message,
    });
  }
});

// ============================================
// BUY ASSET
// ============================================
router.post('/buy', auth, async (req, res) => {
  try {
    const { symbol, quantity, price, name, type } = req.body;

    // Validate inputs
    if (!symbol || !quantity || !price || !name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    if (quantity <= 0 || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity and price must be positive',
      });
    }

    const totalCost = quantity * price;

    // Get user's portfolio
    let portfolio = await Portfolio.findOne({ userId: req.userId });
    if (!portfolio) {
      portfolio = new Portfolio({ userId: req.userId });
    }

    // Check if user has enough cash
    if (portfolio.cashBalance < totalCost) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient funds',
      });
    }

    // Update or create holding
    let holding = await Holding.findOne({
      userId: req.userId,
      symbol: symbol.toUpperCase(),
    });

    if (holding) {
      // Update existing holding with weighted average
      const totalQuantity = holding.quantity + quantity;
      const totalValue = (holding.quantity * holding.avgBuyPrice) + (quantity * price);
      holding.avgBuyPrice = totalValue / totalQuantity;
      holding.quantity = totalQuantity;
      holding.currentPrice = price;
      holding.currentValue = totalQuantity * price;
      holding.profitLoss = holding.currentValue - (totalQuantity * holding.avgBuyPrice);
      holding.profitLossPercent = (((holding.currentValue / (totalQuantity * holding.avgBuyPrice)) - 1) * 100).toFixed(2);
    } else {
      // Create new holding
      holding = new Holding({
        userId: req.userId,
        symbol: symbol.toUpperCase(),
        name,
        type,
        quantity,
        avgBuyPrice: price,
        currentPrice: price,
        currentValue: totalCost,
        profitLoss: 0,
        profitLossPercent: '0.00',
      });
    }

    await holding.save();

    // Create transaction
    const transaction = new Transaction({
      userId: req.userId,
      symbol: symbol.toUpperCase(),
      name,
      type,
      action: 'buy',
      quantity,
      price,
      total: totalCost,
    });

    await transaction.save();

    // Update portfolio cash balance
    portfolio.cashBalance -= totalCost;
    await portfolio.save();

    console.log(`✅ Buy successful: ${quantity} ${symbol} @ $${price}`);

    res.json({
      success: true,
      message: 'Purchase successful',
      holding: holding.toObject(),
      transaction: transaction.toObject(),
      newBalance: portfolio.cashBalance,
    });
  } catch (error) {
    console.error('❌ Error buying asset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to buy asset',
      error: error.message,
    });
  }
});

// ============================================
// SELL ASSET
// ============================================
router.post('/sell', auth, async (req, res) => {
  try {
    const { symbol, quantity, price } = req.body;

    // Validate inputs
    if (!symbol || !quantity || !price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    if (quantity <= 0 || price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity and price must be positive',
      });
    }

    // Get holding
    const holding = await Holding.findOne({
      userId: req.userId,
      symbol: symbol.toUpperCase(),
    });

    if (!holding) {
      return res.status(400).json({
        success: false,
        message: `You don't own any ${symbol}`,
      });
    }

    // Check if user has enough shares
    if (holding.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${symbol}. You own ${holding.quantity} but tried to sell ${quantity}`,
      });
    }

    const totalValue = quantity * price;

    // Update or delete holding
    if (holding.quantity === quantity) {
      // Selling all shares - delete holding
      await Holding.deleteOne({ _id: holding._id });
      console.log(`🗑️ Deleted holding: sold all ${quantity} ${symbol}`);
    } else {
      // Selling partial shares - update holding
      holding.quantity -= quantity;
      holding.currentPrice = price;
      holding.currentValue = holding.quantity * price;
      holding.profitLoss = holding.currentValue - (holding.quantity * holding.avgBuyPrice);
      holding.profitLossPercent = (((holding.currentValue / (holding.quantity * holding.avgBuyPrice)) - 1) * 100).toFixed(2);
      await holding.save();
      console.log(`📉 Updated holding: sold ${quantity} ${symbol}, ${holding.quantity} remaining`);
    }

    // Create transaction
    const transaction = new Transaction({
      userId: req.userId,
      symbol: symbol.toUpperCase(),
      name: holding.name,
      type: holding.type,
      action: 'sell',
      quantity,
      price,
      total: totalValue,
    });

    await transaction.save();

    // Update portfolio cash balance
    let portfolio = await Portfolio.findOne({ userId: req.userId });
    if (!portfolio) {
      portfolio = new Portfolio({ userId: req.userId });
    }
    portfolio.cashBalance += totalValue;
    await portfolio.save();

    console.log(`✅ Sell successful: ${quantity} ${symbol} @ $${price}`);

    res.json({
      success: true,
      message: 'Sale successful',
      holding: holding.quantity > 0 ? holding.toObject() : null,
      transaction: transaction.toObject(),
      newBalance: portfolio.cashBalance,
    });
  } catch (error) {
    console.error('❌ Error selling asset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sell asset',
      error: error.message,
    });
  }
});

// ============================================
// GET TRANSACTIONS
// ============================================
router.get('/transactions', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message,
    });
  }
});

// ============================================
// GET TRANSACTIONS FOR SPECIFIC SYMBOL
// ============================================
router.get('/transactions/:symbol', auth, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const transactions = await Transaction.find({
      userId: req.userId,
      symbol: symbol.toUpperCase(),
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions',
      error: error.message,
    });
  }
});

module.exports = router;