// ============================================
// TRADE ROUTES - WITH LIVE PRICE FETCHING
// Fetches current prices from APIs and updates holdings
// ============================================

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios'); // ✅ REQUIRED FOR LIVE PRICES
const Portfolio = require('../models/Portfolio');
const Holding = require('../models/Holding');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

console.log('🔧 Trade routes loaded with live price fetching');

// ============================================
// LIVE PRICE FETCHING FUNCTIONS
// ============================================

async function getCurrentStockPrice(symbol) {
  try {
    const response = await axios.get(`http://localhost:3001/api/prices/stock/${symbol}`);
    if (response.data.success && response.data.data.price) {
      return response.data.data.price;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error.message);
    return null;
  }
}

async function getCurrentCryptoPrice(symbol) {
  try {
    const response = await axios.get(`http://localhost:3001/api/prices/crypto/${symbol}`);
    if (response.data.success && response.data.data.price) {
      return response.data.data.price;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching crypto price for ${symbol}:`, error.message);
    return null;
  }
}

// ============================================
// GET HOLDINGS - WITH LIVE PRICE UPDATES
// ============================================
router.get('/holdings', auth, async (req, res) => {
  console.log('\n📊 ===== GET HOLDINGS REQUEST =====');
  console.log(`👤 User ID: ${req.userId}`);
  
  try {
    const userIdToFind = typeof req.userId === 'string' 
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;
    
    console.log(`🔍 Searching for holdings with userId:`, userIdToFind);

    const holdings = await Holding.find({ userId: userIdToFind });
    console.log(`✅ Found ${holdings.length} holdings`);
    
    if (holdings.length === 0) {
      console.log(`   📭 No holdings found`);
      return res.json({
        success: true,
        holdings: [],
        totalValue: 0
      });
    }

    // ✅ FETCH CURRENT PRICES AND UPDATE HOLDINGS
    console.log(`💰 Fetching current prices...`);
    
    for (const holding of holdings) {
      console.log(`\n📊 Processing ${holding.symbol}...`);
      
      const isStock = holding.type === 'stock' || holding.assetType === 'stock';
      const isCrypto = holding.type === 'crypto' || holding.assetType === 'crypto';
      
      let currentPrice = holding.currentPrice || holding.avgBuyPrice;
      
      // Fetch live price based on type
      if (isStock) {
        const livePrice = await getCurrentStockPrice(holding.symbol);
        if (livePrice) {
          console.log(`   📈 Live stock price: $${livePrice.toFixed(2)}`);
          currentPrice = livePrice;
        } else {
          console.log(`   ⚠️ Could not fetch live price, using stored: $${currentPrice.toFixed(2)}`);
        }
      } else if (isCrypto) {
        const livePrice = await getCurrentCryptoPrice(holding.symbol);
        if (livePrice) {
          console.log(`   ₿ Live crypto price: $${livePrice.toFixed(2)}`);
          currentPrice = livePrice;
        } else {
          console.log(`   ⚠️ Could not fetch live price, using stored: $${currentPrice.toFixed(2)}`);
        }
      }
      
      // Calculate current values
      const quantity = holding.quantity;
      const avgBuyPrice = holding.avgBuyPrice;
      const currentValue = quantity * currentPrice;
      const costBasis = quantity * avgBuyPrice;
      const profitLoss = currentValue - costBasis;
      const profitLossPercent = ((profitLoss / costBasis) * 100).toFixed(2);
      
      console.log(`   📊 Calculations:`);
      console.log(`      Quantity: ${quantity}`);
      console.log(`      Avg Buy: $${avgBuyPrice.toFixed(2)}`);
      console.log(`      Current: $${currentPrice.toFixed(2)}`);
      console.log(`      Value: $${currentValue.toFixed(2)}`);
      console.log(`      P/L: $${profitLoss.toFixed(2)} (${profitLossPercent}%)`);
      
      // ✅ UPDATE HOLDING IN DATABASE
      holding.currentPrice = currentPrice;
      holding.currentValue = currentValue;
      holding.profitLoss = profitLoss;
      holding.profitLossPercent = profitLossPercent;
      await holding.save();
      
      console.log(`   ✅ Updated ${holding.symbol} in database`);
    }

    // Format holdings for response
    const formattedHoldings = holdings.map(h => ({
      symbol: h.symbol,
      name: h.name,
      type: h.type || h.assetType || 'stock',
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      currentPrice: h.currentPrice,
      currentValue: h.currentValue,
      profitLoss: h.profitLoss,
      profitLossPercent: h.profitLossPercent,
      todaysReturn: h.todaysReturn || 0,
      todaysReturnPercent: h.todaysReturnPercent || 0
    }));

    const totalValue = formattedHoldings.reduce((sum, h) => sum + h.currentValue, 0);
    console.log(`\n💰 Total holdings value: $${totalValue.toFixed(2)}`);
    console.log(`✅ Returning holdings to frontend\n`);

    res.json({
      success: true,
      holdings: formattedHoldings,
      totalValue: totalValue
    });

  } catch (error) {
    console.error('❌ GET HOLDINGS ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching holdings', 
      error: error.message 
    });
  }
});

// ============================================
// GET SINGLE HOLDING BY SYMBOL
// ============================================
router.get('/holding/:symbol', auth, async (req, res) => {
  console.log('\n📊 ===== GET SINGLE HOLDING REQUEST =====');
  console.log(`👤 User ID: ${req.userId}`);
  console.log(`🔍 Symbol: ${req.params.symbol}`);
  
  try {
    const userIdToFind = typeof req.userId === 'string' 
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;
    
    const holding = await Holding.findOne({ 
      userId: userIdToFind, 
      symbol: req.params.symbol 
    });

    if (!holding) {
      console.log(`❌ No holding found for ${req.params.symbol}`);
      return res.json({
        success: true,
        holding: null,
        message: `No holding found for ${req.params.symbol}`
      });
    }

    console.log(`✅ Found holding: ${holding.quantity} @ $${holding.avgBuyPrice}`);

    // Fetch live price
    const isStock = holding.type === 'stock' || holding.assetType === 'stock';
    let currentPrice = holding.currentPrice;
    
    if (isStock) {
      const livePrice = await getCurrentStockPrice(holding.symbol);
      if (livePrice) currentPrice = livePrice;
    } else {
      const livePrice = await getCurrentCryptoPrice(holding.symbol);
      if (livePrice) currentPrice = livePrice;
    }
    
    // Update calculations
const currentValue = holding.quantity * currentPrice;
const profitLoss = currentValue - (holding.quantity * holding.avgBuyPrice);
const profitLossPercent = ((profitLoss / (holding.quantity * holding.avgBuyPrice)) * 100).toFixed(2);

// Calculate today's return (estimate using 0.5% daily movement as baseline)
const estimatedOpenPrice = currentPrice * 0.995;  // Simplified - real apps would use actual market open data
const todaysReturn = holding.quantity * (currentPrice - estimatedOpenPrice);
const todaysReturnPercent = ((currentPrice - estimatedOpenPrice) / estimatedOpenPrice) * 100;

// Update in database
holding.currentPrice = currentPrice;
holding.currentValue = currentValue;
holding.profitLoss = profitLoss;
holding.profitLossPercent = profitLossPercent;
holding.todaysReturn = todaysReturn;  // ← ADD THIS
holding.todaysReturnPercent = todaysReturnPercent.toFixed(2);  // ← ADD THIS
await holding.save();

    res.json({
      success: true,
      holding: {
        symbol: holding.symbol,
        name: holding.name,
        type: holding.type || holding.assetType || 'stock',
        quantity: holding.quantity,
        avgBuyPrice: holding.avgBuyPrice,
        currentPrice: holding.currentPrice,
        currentValue: holding.currentValue,
        profitLoss: holding.profitLoss,
        profitLossPercent: holding.profitLossPercent,
        todaysReturn: holding.todaysReturn || 0,
        todaysReturnPercent: holding.todaysReturnPercent || 0
      }
    });

  } catch (error) {
    console.error('❌ GET SINGLE HOLDING ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching holding', 
      error: error.message 
    });
  }
});

// ============================================
// GET TRANSACTIONS
// ============================================
router.get('/transactions', auth, async (req, res) => {
  console.log('\n📝 ===== GET TRANSACTIONS REQUEST =====');
  console.log(`👤 User ID: ${req.userId}`);
  
  try {
    const userIdToFind = typeof req.userId === 'string' 
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    const transactions = await Transaction.find({ userId: userIdToFind })
      .sort({ createdAt: -1 })
      .limit(100);

    console.log(`✅ Found ${transactions.length} transactions`);

    res.json({
      success: true,
      transactions
    });

  } catch (error) {
    console.error('❌ GET TRANSACTIONS ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching transactions' 
    });
  }
});

// ============================================
// GET TRANSACTIONS FOR SPECIFIC SYMBOL
// ============================================
router.get('/transactions/:symbol', auth, async (req, res) => {
  console.log('\n📝 ===== GET SYMBOL TRANSACTIONS REQUEST =====');
  console.log(`👤 User ID: ${req.userId}`);
  console.log(`🔍 Symbol: ${req.params.symbol}`);
  
  try {
    const userIdToFind = typeof req.userId === 'string' 
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    const transactions = await Transaction.find({ 
      userId: userIdToFind,
      symbol: req.params.symbol
    })
      .sort({ createdAt: -1 })
      .limit(100);

    console.log(`✅ Found ${transactions.length} transactions for ${req.params.symbol}`);
    
    res.json({
      success: true,
      transactions
    });

  } catch (error) {
    console.error('❌ GET SYMBOL TRANSACTIONS ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching transactions' 
    });
  }
});

// ============================================
// BUY ROUTE
// ============================================
router.post('/buy', auth, async (req, res) => {
  console.log('\n💰 ===== BUY REQUEST RECEIVED =====');
  
  try {
    const { symbol, name, quantity, price, assetType } = req.body;

    console.log(`👤 User ID: ${req.userId}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Quantity: ${quantity}`);
    console.log(`   Price: $${price}`);

    if (!symbol || !quantity || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const userIdToFind = typeof req.userId === 'string' 
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    let portfolio = await Portfolio.findOne({ userId: userIdToFind });
    if (!portfolio) {
      return res.status(404).json({ 
        success: false, 
        message: 'Portfolio not found' 
      });
    }

    const totalCost = quantity * price;

    if (portfolio.cashBalance < totalCost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient funds`
      });
    }

    portfolio.cashBalance -= totalCost;
    await portfolio.save();

    let holding = await Holding.findOne({ userId: userIdToFind, symbol });
    
    if (holding) {
      const totalQuantity = holding.quantity + quantity;
      const totalCost = (holding.quantity * holding.avgBuyPrice) + (quantity * price);
      const newAvgPrice = totalCost / totalQuantity;
      
      holding.avgBuyPrice = newAvgPrice;
      holding.quantity = totalQuantity;
      holding.currentPrice = price;
      holding.currentValue = totalQuantity * price;
      holding.profitLoss = (totalQuantity * price) - (totalQuantity * newAvgPrice);
      holding.profitLossPercent = (((price - newAvgPrice) / newAvgPrice) * 100).toFixed(2);
      
      await holding.save();
    } else {
      holding = new Holding({
        userId: userIdToFind,
        symbol,
        name,
        quantity,
        avgBuyPrice: price,
        currentPrice: price,
        currentValue: quantity * price,
        profitLoss: 0,
        profitLossPercent: '0.00',
        type: assetType || 'stock',
        assetType: assetType || 'stock',
        todaysReturn: 0,
        todaysReturnPercent: 0
      });
      await holding.save();
    }

    const transaction = new Transaction({
      userId: userIdToFind,
      symbol,
      name,
      action: 'buy',
      quantity,
      price,
      totalAmount: totalCost,
      assetType: assetType || 'stock'
    });
    await transaction.save();

    console.log(`✅ Buy successful: ${symbol}`);

    res.json({
      success: true,
      message: 'Purchase successful',
      portfolio: { cashBalance: portfolio.cashBalance },
      holding,
      transaction
    });

  } catch (error) {
    console.error('❌ BUY ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing purchase', 
      error: error.message 
    });
  }
});

// ============================================
// SELL ROUTE
// ============================================
router.post('/sell', auth, async (req, res) => {
  console.log('\n💵 ===== SELL REQUEST RECEIVED =====');
  
  try {
    const { symbol, name, quantity, price, assetType } = req.body;

    console.log(`👤 User ID: ${req.userId}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Quantity: ${quantity}`);
    console.log(`   Price: $${price}`);

    if (!symbol || !quantity || !price) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const userIdToFind = typeof req.userId === 'string' 
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    let portfolio = await Portfolio.findOne({ userId: userIdToFind });
    if (!portfolio) {
      return res.status(404).json({ 
        success: false, 
        message: 'Portfolio not found' 
      });
    }

    let holding = await Holding.findOne({ userId: userIdToFind, symbol });
    if (!holding) {
      return res.status(404).json({ 
        success: false, 
        message: `You do not own any ${symbol}` 
      });
    }

    if (holding.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient shares`
      });
    }

    const totalSaleAmount = quantity * price;
    const costBasis = quantity * holding.avgBuyPrice;
    const realizedPL = totalSaleAmount - costBasis;
    const realizedPLPercent = (realizedPL / costBasis) * 100;

    portfolio.cashBalance += totalSaleAmount;
    await portfolio.save();

    holding.quantity -= quantity;
    
    if (holding.quantity === 0) {
      await Holding.deleteOne({ _id: holding._id });
    } else {
      holding.currentValue = holding.quantity * price;
      holding.profitLoss = (holding.quantity * price) - (holding.quantity * holding.avgBuyPrice);
      holding.profitLossPercent = (((price - holding.avgBuyPrice) / holding.avgBuyPrice) * 100).toFixed(2);
      holding.currentPrice = price;
      await holding.save();
    }

    const transaction = new Transaction({
      userId: userIdToFind,
      symbol,
      name,
      action: 'sell',
      quantity,
      price,
      totalAmount: totalSaleAmount,
      assetType: assetType || 'stock',
      realizedPL: realizedPL,
      realizedPLPercent: realizedPLPercent
    });
    await transaction.save();

    console.log(`✅ Sell successful: ${symbol}, P/L: $${realizedPL.toFixed(2)}`);

    res.json({
      success: true,
      message: 'Sale successful',
      portfolio: { cashBalance: portfolio.cashBalance },
      holding: holding.quantity > 0 ? holding : null,
      transaction,
      realizedPL: {
        amount: realizedPL,
        percent: realizedPLPercent
      }
    });

  } catch (error) {
    console.error('❌ SELL ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing sale', 
      error: error.message 
    });
  }
});

console.log('✅ Trade routes registered with live price fetching\n');

module.exports = router;

// Get realized P/L transactions
router.get('/realized-pl', auth, async (req, res) => {
  try {
    const userId = typeof req.userId === 'string' 
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;
    
    const realizedTxs = await Transaction.find({
      userId,
      action: 'sell',
      realizedPL: { $exists: true }
    }).sort({ createdAt: -1 });
    
    const summary = {
      totalRealized: 0,
      totalGains: 0,
      totalLosses: 0,
      transactions: realizedTxs.length
    };
    
    realizedTxs.forEach(tx => {
      summary.totalRealized += tx.realizedPL;
      if (tx.realizedPL > 0) summary.totalGains += tx.realizedPL;
      else summary.totalLosses += tx.realizedPL;
    });
    
    res.json({
      success: true,
      summary,
      transactions: realizedTxs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching realized P/L' });
  }
});

// GET /api/trade/realized-pl - Get realized profit/loss summary
router.get('/realized-pl', auth, async (req, res) => {
  try {
    const userId = typeof req.userId === 'string'
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;
    
    const { period = '1M' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '1M': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '3M': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case 'YTD': startDate = new Date(now.getFullYear(), 0, 1); break;
      case 'ALL': startDate = new Date(0); break;
      default: startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get all sell transactions in period
    const sellTransactions = await Transaction.find({
      userId,
      action: 'sell',
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });
    
    // Calculate totals
    const totalRealizedPL = sellTransactions.reduce((sum, tx) => {
      return sum + (tx.realizedPL || 0);
    }, 0);
    
    const totalTrades = sellTransactions.length;
    const winningTrades = sellTransactions.filter(tx => (tx.realizedPL || 0) > 0).length;
    const losingTrades = sellTransactions.filter(tx => (tx.realizedPL || 0) < 0).length;
    
    res.json({
      success: true,
      data: {
        period,
        totalRealizedPL,
        totalTrades,
        winningTrades,
        losingTrades,
        winRate: totalTrades > 0 ? (winningTrades / totalTrades * 100) : 0,
        transactions: sellTransactions.map(tx => ({
          symbol: tx.symbol,
          quantity: tx.quantity,
          price: tx.price,
          totalAmount: tx.totalAmount,
          realizedPL: tx.realizedPL || 0,
          realizedPLPercent: tx.realizedPLPercent || 0,
          date: tx.createdAt
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching realized P/L:', error);
    res.status(500).json({ success: false, message: 'Error fetching realized P/L' });
  }
});

