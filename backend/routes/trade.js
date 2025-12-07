// ============================================
// COMPLETE TRADE ROUTES - WITH GET HOLDINGS
// ============================================
// Location: backend/routes/trade.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Portfolio = require('../models/Portfolio');
const Holding = require('../models/Holding');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// ============================================
// GET HOLDINGS - THIS WAS MISSING!
// ============================================
router.get('/holdings', auth, async (req, res) => {
  try {
    console.log('\n📊 GET HOLDINGS REQUEST');
    console.log(`   User ID: ${req.userId}`);

    // Convert userId to ObjectId
    const userIdToFind = typeof req.userId === 'string' 
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    // Find all holdings for user
    const holdings = await Holding.find({ userId: userIdToFind });
    console.log(`   Found ${holdings.length} holdings`);

    // Format holdings for response
    const formattedHoldings = holdings.map(h => ({
      symbol: h.symbol,
      name: h.name,
      type: h.assetType || 'stock',
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      currentPrice: h.currentPrice || h.avgBuyPrice,
      currentValue: h.quantity * (h.currentPrice || h.avgBuyPrice),
      profitLoss: (h.quantity * (h.currentPrice || h.avgBuyPrice)) - (h.quantity * h.avgBuyPrice),
      profitLossPercent: (((h.currentPrice || h.avgBuyPrice) - h.avgBuyPrice) / h.avgBuyPrice * 100).toFixed(2)
    }));

    const totalValue = formattedHoldings.reduce((sum, h) => sum + h.currentValue, 0);

    console.log(`   Total holdings value: $${totalValue.toFixed(2)}`);
    console.log(`✅ Returning ${formattedHoldings.length} holdings\n`);

    res.json({
      success: true,
      holdings: formattedHoldings,
      totalValue: totalValue
    });

  } catch (error) {
    console.error('❌ Get holdings error:', error);
    res.status(500).json({ success: false, message: 'Error fetching holdings', error: error.message });
  }
});

// ============================================
// GET TRANSACTIONS
// ============================================
router.get('/transactions', auth, async (req, res) => {
  try {
    console.log('\n📝 GET TRANSACTIONS REQUEST');
    console.log(`   User ID: ${req.userId}`);

    const userIdToFind = typeof req.userId === 'string' 
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    const transactions = await Transaction.find({ userId: userIdToFind })
      .sort({ createdAt: -1 })
      .limit(100);

    console.log(`✅ Returning ${transactions.length} transactions\n`);

    res.json({
      success: true,
      transactions
    });

  } catch (error) {
    console.error('❌ Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Error fetching transactions' });
  }
});

// ============================================
// BUY ROUTE
// ============================================
router.post('/buy', auth, async (req, res) => {
  try {
    const { symbol, name, quantity, price, assetType } = req.body;

    console.log('\n💰 BUY REQUEST RECEIVED');
    console.log(`   User ID: ${req.userId}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Quantity: ${quantity}`);
    console.log(`   Price: $${price}`);

    // Convert userId to ObjectId
    const userIdToFind = typeof req.userId === 'string' 
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    // Find portfolio
    let portfolio = await Portfolio.findOne({ userId: userIdToFind });
    if (!portfolio) {
      console.log('❌ Portfolio not found');
      return res.status(404).json({ success: false, message: 'Portfolio not found' });
    }

    console.log(`   Current cash: $${portfolio.cashBalance.toFixed(2)}`);

    // Calculate total cost
    const totalCost = quantity * price;
    console.log(`   Total cost: $${totalCost.toFixed(2)}`);

    // Check if user has enough cash
    if (portfolio.cashBalance < totalCost) {
      console.log(`❌ Insufficient funds`);
      return res.status(400).json({
        success: false,
        message: `Insufficient funds. You have $${portfolio.cashBalance.toFixed(2)} but need $${totalCost.toFixed(2)}`
      });
    }

    // Deduct from cash balance
    portfolio.cashBalance -= totalCost;
    await portfolio.save();
    console.log(`   New cash balance: $${portfolio.cashBalance.toFixed(2)}`);

    // Update or create holding
    let holding = await Holding.findOne({ userId: userIdToFind, symbol });
    
    if (holding) {
      // Update existing holding with weighted average price
      const totalQuantity = holding.quantity + quantity;
      const totalCost = (holding.quantity * holding.avgBuyPrice) + (quantity * price);
      holding.avgBuyPrice = totalCost / totalQuantity;
      holding.quantity = totalQuantity;
      holding.currentPrice = price;
      await holding.save();
      console.log(`   Updated existing holding: ${totalQuantity} shares @ avg $${holding.avgBuyPrice.toFixed(2)}`);
    } else {
      // Create new holding
      holding = new Holding({
        userId: userIdToFind,
        symbol,
        name,
        quantity,
        avgBuyPrice: price,
        currentPrice: price,
        assetType: assetType || 'stock'
      });
      await holding.save();
      console.log(`   Created new holding: ${quantity} shares @ $${price.toFixed(2)}`);
    }

    // Record transaction
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
    console.log(`✅ Buy transaction recorded\n`);

    res.json({
      success: true,
      message: 'Purchase successful',
      portfolio,
      holding,
      transaction
    });

  } catch (error) {
    console.error('❌ Buy error:', error);
    res.status(500).json({ success: false, message: 'Error processing purchase', error: error.message });
  }
});

// ============================================
// SELL ROUTE - WITH REALIZED P&L
// ============================================
router.post('/sell', auth, async (req, res) => {
  try {
    const { symbol, name, quantity, price, assetType } = req.body;

    console.log('\n💵 SELL REQUEST RECEIVED');
    console.log(`   User ID: ${req.userId}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Quantity: ${quantity}`);
    console.log(`   Price: $${price}`);

    // Convert userId to ObjectId
    const userIdToFind = typeof req.userId === 'string' 
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    // Find portfolio
    let portfolio = await Portfolio.findOne({ userId: userIdToFind });
    if (!portfolio) {
      console.log('❌ Portfolio not found');
      return res.status(404).json({ success: false, message: 'Portfolio not found' });
    }

    // Find holding
    let holding = await Holding.findOne({ userId: userIdToFind, symbol });
    if (!holding) {
      console.log('❌ Holding not found');
      return res.status(404).json({ success: false, message: 'You do not own this asset' });
    }

    console.log(`   Current holding: ${holding.quantity} shares @ avg $${holding.avgBuyPrice.toFixed(2)}`);

    // Check if user has enough shares
    if (holding.quantity < quantity) {
      console.log(`❌ Insufficient shares`);
      return res.status(400).json({
        success: false,
        message: `Insufficient shares. You own ${holding.quantity} but trying to sell ${quantity}`
      });
    }

    // ============================================
    // CALCULATE REALIZED P&L
    // ============================================
    const totalSaleAmount = quantity * price;
    const costBasis = quantity * holding.avgBuyPrice;
    const realizedPL = totalSaleAmount - costBasis;
    const realizedPLPercent = (realizedPL / costBasis) * 100;

    console.log(`   Cost basis: $${costBasis.toFixed(2)}`);
    console.log(`   Sale amount: $${totalSaleAmount.toFixed(2)}`);
    console.log(`   Realized P&L: $${realizedPL.toFixed(2)} (${realizedPLPercent.toFixed(2)}%)`);

    // Add sale proceeds to cash balance
    portfolio.cashBalance += totalSaleAmount;
    await portfolio.save();
    console.log(`   New cash balance: $${portfolio.cashBalance.toFixed(2)}`);

    // Update holding
    holding.quantity -= quantity;
    
    if (holding.quantity === 0) {
      // Delete holding if all shares sold
      await Holding.deleteOne({ _id: holding._id });
      console.log(`   Deleted holding (all shares sold)`);
    } else {
      await holding.save();
      console.log(`   Updated holding: ${holding.quantity} shares remaining`);
    }

    // Record transaction WITH realized P&L
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
    console.log(`✅ Sell transaction recorded with P&L\n`);

    res.json({
      success: true,
      message: 'Sale successful',
      portfolio,
      holding: holding.quantity > 0 ? holding : null,
      transaction,
      realizedPL: {
        amount: realizedPL,
        percent: realizedPLPercent
      }
    });

  } catch (error) {
    console.error('❌ Sell error:', error);
    res.status(500).json({ success: false, message: 'Error processing sale', error: error.message });
  }
});

module.exports = router;