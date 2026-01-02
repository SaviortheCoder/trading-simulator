const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Holding = require('../models/Holding');
const Transaction = require('../models/Transaction');
const Portfolio = require('../models/Portfolio');
const { generateHistoricalPrices } = require('../utils/priceGenerator');

console.log('📊 Historical routes loading with REAL value tracking & realistic portfolio graphs...');

// Base prices for price generation
const BASE_PRICES = {
  // Stocks
  'AAPL': 273.67, 'GOOGL': 140, 'MSFT': 350, 'TSLA': 250,
  'AMZN': 170, 'META': 480, 'NVDA': 875, 'AMD': 165,
  'NFLX': 600, 'DIS': 90, 'PFE': 28, 'JNJ': 160,
  'WMT': 95, 'MA': 550, 'HD': 420, 'PYPL': 85,
  'ADBE': 460, 'CRM': 380, 'CSCO': 60, 'NKE': 75,
  'INTC': 20, 'CMG': 3500, 'COST': 1020, 'BRK.B': 485,
  // Cryptos
  'BTC': 88000, 'ETH': 3200, 'BNB': 620, 'SOL': 200,
  'XRP': 2.10, 'ADA': 1.05, 'DOGE': 0.38, 'DOT': 7.50,
  'AVAX': 42, 'LINK': 23, 'UNI': 13, 'LTC': 105,
  'ATOM': 10, 'TRX': 0.25
};

// ============================================
// PORTFOLIO HISTORY - REALISTIC VALUE TRACKING
// Shows actual portfolio value changes as holdings gain/lose value
// ============================================
router.get('/portfolio', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const userId = req.userId;
    
    console.log(`\n📈 ===== GET PORTFOLIO HISTORY (REALISTIC VALUES) =====`);
    console.log(`📅 Days: ${days} (rolling window)`);
    console.log(`👤 User: ${userId}`);
    
    const portfolio = await Portfolio.findOne({ userId });
    const currentHoldings = await Holding.find({ userId });
    const allTransactions = (await Transaction.find({ userId }).sort({ createdAt: 1 })).map(tx => tx.toObject());
    
    console.log(`💰 Current cash: $${portfolio?.cashBalance.toFixed(2) || 0}`);
    console.log(`📊 Current holdings: ${currentHoldings.length}`);
    console.log(`📝 Total transactions: ${allTransactions.length}`);
    
    const INITIAL_BALANCE = 100000;
    const now = new Date();
    const history = [];
    const pointsPerDay = days === 1 ? 24 : 1;
    const totalPoints = days * pointsPerDay;
    
    // 🎨 PRE-GENERATE HISTORICAL PRICES FOR ALL SYMBOLS
    const uniqueSymbols = [...new Set(allTransactions.map(tx => tx.symbol))];
    const historicalPrices = {};
    
    uniqueSymbols.forEach(symbol => {
      const basePrice = BASE_PRICES[symbol] || 100;
      historicalPrices[symbol] = generateHistoricalPrices(symbol, basePrice, totalPoints);
    });
    
    console.log(`🎨 Generated historical prices for ${uniqueSymbols.length} symbols`);
    
    // Generate portfolio history with realistic market values
    for (let i = 0; i <= totalPoints; i++) {
      const pointTime = new Date(now.getTime() - ((totalPoints - i) * (days * 24 * 60 * 60 * 1000) / totalPoints));
      const txsUpToNow = allTransactions.filter(tx => new Date(tx.createdAt) <= pointTime);
      
      // 💰 Calculate cash at this point
      let cashAtPoint = INITIAL_BALANCE;
      txsUpToNow.forEach(tx => {
        const txAction = tx.action || tx.type;
        if (txAction === 'buy') {
          cashAtPoint -= tx.totalAmount;
        } else if (txAction === 'sell') {
          cashAtPoint += tx.totalAmount;
        }
      });
      
      // 📊 Calculate holdings at this point (quantity of each symbol)
      const holdingsAtPoint = {};
      txsUpToNow.forEach(tx => {
        const txAction = tx.action || tx.type;
        if (txAction === 'buy') {
          if (!holdingsAtPoint[tx.symbol]) {
            holdingsAtPoint[tx.symbol] = { quantity: 0, avgPrice: 0, totalCost: 0 };
          }
          const newTotalCost = holdingsAtPoint[tx.symbol].totalCost + tx.totalAmount;
          const newQuantity = holdingsAtPoint[tx.symbol].quantity + tx.quantity;
          holdingsAtPoint[tx.symbol].totalCost = newTotalCost;
          holdingsAtPoint[tx.symbol].quantity = newQuantity;
          holdingsAtPoint[tx.symbol].avgPrice = newTotalCost / newQuantity;
        } else if (txAction === 'sell') {
          if (holdingsAtPoint[tx.symbol]) {
            holdingsAtPoint[tx.symbol].quantity -= tx.quantity;
            const avgPrice = holdingsAtPoint[tx.symbol].avgPrice;
            holdingsAtPoint[tx.symbol].totalCost -= (avgPrice * tx.quantity);
            if (holdingsAtPoint[tx.symbol].quantity <= 0) {
              delete holdingsAtPoint[tx.symbol];
            }
          }
        }
      });
      
      // 💎 Calculate MARKET VALUE of holdings using historical prices
      let holdingsMarketValue = 0;
      Object.keys(holdingsAtPoint).forEach(symbol => {
        const holding = holdingsAtPoint[symbol];
        const historicalPrice = historicalPrices[symbol]?.[i] || holding.avgPrice;
        const marketValue = holding.quantity * historicalPrice;
        holdingsMarketValue += marketValue;
      });
      
      const totalValue = cashAtPoint + holdingsMarketValue;
      
      history.push({
        timestamp: pointTime.getTime(),
        price: totalValue,
        cash: cashAtPoint,
        holdings: holdingsMarketValue,
        date: pointTime.toISOString().split('T')[0]
      });
    }
    
    // 🎯 Update last point with ACTUAL current market values
    if (history.length > 0 && currentHoldings.length > 0) {
      const lastPoint = history[history.length - 1];
      let currentMarketValue = 0;
      currentHoldings.forEach(h => {
        currentMarketValue += h.currentValue || (h.quantity * h.currentPrice);
      });
      lastPoint.holdings = currentMarketValue;
      lastPoint.price = lastPoint.cash + currentMarketValue;
    }
    
    console.log(`✅ Generated ${history.length} REALISTIC portfolio data points`);
    console.log(`📊 First: $${history[0].price.toFixed(2)} (cash: $${history[0].cash.toFixed(2)}, holdings: $${history[0].holdings.toFixed(2)})`);
    console.log(`📊 Last: $${history[history.length - 1].price.toFixed(2)} (cash: $${history[history.length - 1].cash.toFixed(2)}, holdings: $${history[history.length - 1].holdings.toFixed(2)})`);
    
    if (allTransactions.length === 0) {
      console.log(`✅ No transactions - graph will be flat at $${INITIAL_BALANCE.toFixed(2)}`);
    } else {
      console.log(`✅ ${allTransactions.length} transactions - graph shows realistic market movement`);
    }
    
    res.json({
      success: true,
      history,
      stats: {
        initialValue: INITIAL_BALANCE,
        currentValue: history[history.length - 1].price,
        change: history[history.length - 1].price - INITIAL_BALANCE,
        changePercent: ((history[history.length - 1].price - INITIAL_BALANCE) / INITIAL_BALANCE * 100).toFixed(2),
        transactionCount: allTransactions.length
      }
    });
  } catch (error) {
    console.error('❌ Error generating portfolio history:', error);
    res.status(500).json({ success: false, message: 'Failed to generate portfolio history', error: error.message });
  }
});

// ============================================
// CRYPTO PORTFOLIO HISTORY - Crypto Holdings Only
// ============================================
router.get('/crypto-portfolio', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const userId = req.userId;
    
    console.log(`\n₿ ===== GET CRYPTO PORTFOLIO HISTORY (REALISTIC VALUES) =====`);
    console.log(`�� Days: ${days}`);
    
    const cryptoHoldings = await Holding.find({ userId, type: 'crypto' });
    const cryptoTxs = (await Transaction.find({ userId, assetType: 'crypto' }).sort({ createdAt: 1 })).map(tx => tx.toObject());
    
    console.log(`₿ ${cryptoHoldings.length} crypto holdings, ${cryptoTxs.length} transactions`);
    
    const now = new Date();
    const history = [];
    const pointsPerDay = days === 1 ? 24 : 1;
    const totalPoints = days * pointsPerDay;
    
    // Pre-generate historical prices for crypto symbols
    const uniqueCryptos = [...new Set(cryptoTxs.map(tx => tx.symbol))];
    const historicalPrices = {};
    
    uniqueCryptos.forEach(symbol => {
      const basePrice = BASE_PRICES[symbol] || 1000;
      historicalPrices[symbol] = generateHistoricalPrices(symbol, basePrice, totalPoints, 1000); // Different seed for crypto
    });
    
    for (let i = 0; i <= totalPoints; i++) {
      const pointTime = new Date(now.getTime() - ((totalPoints - i) * (days * 24 * 60 * 60 * 1000) / totalPoints));
      const txsUpToNow = cryptoTxs.filter(tx => new Date(tx.createdAt) <= pointTime);
      
      const cryptoHoldingsAtPoint = {};
      txsUpToNow.forEach(tx => {
        const txAction = tx.action || tx.type;
        if (txAction === 'buy') {
          if (!cryptoHoldingsAtPoint[tx.symbol]) {
            cryptoHoldingsAtPoint[tx.symbol] = { quantity: 0, avgPrice: 0, totalCost: 0 };
          }
          const newTotalCost = cryptoHoldingsAtPoint[tx.symbol].totalCost + tx.totalAmount;
          const newQuantity = cryptoHoldingsAtPoint[tx.symbol].quantity + tx.quantity;
          cryptoHoldingsAtPoint[tx.symbol].totalCost = newTotalCost;
          cryptoHoldingsAtPoint[tx.symbol].quantity = newQuantity;
          cryptoHoldingsAtPoint[tx.symbol].avgPrice = newTotalCost / newQuantity;
        } else if (txAction === 'sell') {
          if (cryptoHoldingsAtPoint[tx.symbol]) {
            cryptoHoldingsAtPoint[tx.symbol].quantity -= tx.quantity;
            const avgPrice = cryptoHoldingsAtPoint[tx.symbol].avgPrice;
            cryptoHoldingsAtPoint[tx.symbol].totalCost -= (avgPrice * tx.quantity);
            if (cryptoHoldingsAtPoint[tx.symbol].quantity <= 0) {
              delete cryptoHoldingsAtPoint[tx.symbol];
            }
          }
        }
      });
      
      let cryptoMarketValue = 0;
      Object.keys(cryptoHoldingsAtPoint).forEach(symbol => {
        const holding = cryptoHoldingsAtPoint[symbol];
        const historicalPrice = historicalPrices[symbol]?.[i] || holding.avgPrice;
        const marketValue = holding.quantity * historicalPrice;
        cryptoMarketValue += marketValue;
      });
      
      history.push({
        timestamp: pointTime.getTime(),
        price: cryptoMarketValue,
        date: pointTime.toISOString().split('T')[0]
      });
    }
    
    if (history.length > 0 && cryptoHoldings.length > 0) {
      const lastPoint = history[history.length - 1];
      let currentCryptoValue = 0;
      cryptoHoldings.forEach(h => {
        currentCryptoValue += h.currentValue || (h.quantity * h.currentPrice);
      });
      lastPoint.price = currentCryptoValue;
    }
    
    console.log(`✅ Generated ${history.length} crypto data points`);
    console.log(`₿ Value range: $${history[0].price.toFixed(2)} → $${history[history.length - 1].price.toFixed(2)}`);
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('❌ Error generating crypto history:', error);
    res.status(500).json({ success: false, message: 'Failed to generate crypto history' });
  }
});

// ============================================
// STOCK HISTORY - Individual Stock Price History
// 🎨 REALISTIC ROBINHOOD-STYLE MOVEMENT
// ============================================
router.get('/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days) || 7;
    
    console.log(`\n📈 GET STOCK HISTORY: ${symbol} (${days} days, realistic movement)`);
    
    const basePrice = BASE_PRICES[symbol] || 100;
    const now = new Date();
    const history = [];
    const pointsPerDay = days === 1 ? 24 : 1;
    const totalPoints = days * pointsPerDay;
    
    const prices = generateHistoricalPrices(symbol, basePrice, totalPoints);
    
    for (let i = 0; i <= totalPoints; i++) {
      const pointTime = new Date(now.getTime() - ((totalPoints - i) * (days * 24 * 60 * 60 * 1000) / totalPoints));
      
      history.push({
        timestamp: pointTime.getTime(),
        price: prices[i],
        date: pointTime.toISOString().split('T')[0]
      });
    }
    
    console.log(`✅ Generated ${history.length} realistic points for ${symbol}`);
    
    res.json({ success: true, symbol, history });
    
  } catch (error) {
    console.error(`❌ Error generating stock history for ${req.params.symbol}:`, error);
    res.status(500).json({ success: false, message: 'Failed to generate stock history' });
  }
});

// ============================================
// CRYPTO HISTORY - Individual Crypto Price History
// 🎨 REALISTIC ROBINHOOD-STYLE MOVEMENT (Higher Volatility)
// ============================================
router.get('/crypto/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days) || 7;
    
    console.log(`\n₿ GET CRYPTO HISTORY: ${symbol} (${days} days, realistic movement)`);
    
    const basePrice = BASE_PRICES[symbol] || 1000;
    const now = new Date();
    const history = [];
    const pointsPerDay = days === 1 ? 24 : 1;
    const totalPoints = days * pointsPerDay;
    
    // Use different seed for crypto (more volatile)
    const prices = generateHistoricalPrices(symbol, basePrice, totalPoints, 5000);
    
    for (let i = 0; i <= totalPoints; i++) {
      const pointTime = new Date(now.getTime() - ((totalPoints - i) * (days * 24 * 60 * 60 * 1000) / totalPoints));
      
      history.push({
        timestamp: pointTime.getTime(),
        price: prices[i],
        date: pointTime.toISOString().split('T')[0]
      });
    }
    
    console.log(`✅ Generated ${history.length} realistic points for ${symbol}`);
    
    res.json({ success: true, symbol, history });
    
  } catch (error) {
    console.error(`❌ Error generating crypto history for ${req.params.symbol}:`, error);
    res.status(500).json({ success: false, message: 'Failed to generate crypto history' });
  }
});

console.log('✅ Historical routes registered with REALISTIC portfolio tracking');

module.exports = router;
