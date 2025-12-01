// ============================================
// HISTORICAL DATA ROUTES - OPTIMIZED API USAGE
// ============================================
// Strategy:
// - Alpha Vantage: Stock historical data (free tier supports this)
// - Finnhub: Real-time stock prices (already working)
// - CoinGecko: Crypto historical & current prices (working)
// ============================================

const express = require('express');
const router = express.Router();
const axios = require('axios');
const Portfolio = require('../models/Portfolio'); // FIXED: Use Portfolio not Holding

// API Keys
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;
const COINGECKO_KEY = process.env.COINGECKO_API_KEY;

// Crypto ID mapping for CoinGecko
const CRYPTO_IDS = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'LTC': 'litecoin',
  'ATOM': 'cosmos',
  'TRX': 'tron'
};

// Cache for Alpha Vantage calls (25/day limit)
const alphaVantageCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/historical/stock/:symbol
 * Get REAL stock price history from Alpha Vantage
 * Alpha Vantage free tier: 25 calls/day, 5 calls/minute
 */
router.get('/stock/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days) || 30;
    
    console.log(`📊 [ALPHA VANTAGE] Fetching historical data for ${symbol} (${days} days)`);
    
    // Check cache first (save API calls)
    const cacheKey = `${symbol}-${days}`;
    const cached = alphaVantageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 [CACHE HIT] ${symbol} - ${cached.data.length} points`);
      return res.json({ success: true, history: cached.data });
    }
    
    // Fetch from Alpha Vantage (TIME_SERIES_DAILY)
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol,
        apikey: ALPHA_VANTAGE_KEY,
        outputsize: days > 100 ? 'full' : 'compact'
      },
      timeout: 10000
    });
    
    // Check for API limit or error
    if (response.data['Note']) {
      console.log(`⚠️ Alpha Vantage rate limit hit - using cache fallback`);
      return res.json({ success: true, history: [] });
    }
    
    if (response.data['Error Message']) {
      console.log(`⚠️ Alpha Vantage error: ${response.data['Error Message']}`);
      return res.json({ success: true, history: [] });
    }
    
    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) {
      console.log(`⚠️ No time series data for ${symbol}`);
      return res.json({ success: true, history: [] });
    }
    
    // Convert to our format
    const history = Object.entries(timeSeries)
      .slice(0, days) // Get only the requested number of days
      .map(([date, data]) => ({
        timestamp: new Date(date).getTime(),
        price: parseFloat(data['4. close']) // Closing price
      }))
      .reverse(); // Oldest first
    
    // Cache the result
    alphaVantageCache.set(cacheKey, {
      timestamp: Date.now(),
      data: history
    });
    
    console.log(`✅ [ALPHA VANTAGE] Fetched ${history.length} data points for ${symbol}`);
    
    res.json({ success: true, history });
  } catch (error) {
    console.error(`Error fetching stock history from Alpha Vantage:`, error.message);
    
    // Return empty instead of error to prevent app crashes
    res.json({ success: true, history: [] });
  }
});

/**
 * GET /api/historical/crypto/:symbol
 * Get REAL crypto price history from CoinGecko
 * CoinGecko free tier: 10-50 calls/minute
 */
router.get('/crypto/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days) || 30;
    
    const coinId = CRYPTO_IDS[symbol];
    if (!coinId) {
      return res.status(404).json({ success: false, error: 'Crypto not found' });
    }
    
    console.log(`₿ [COINGECKO] Fetching historical data for ${symbol} (${coinId}, ${days} days)`);
    
    // Fetch market chart from CoinGecko
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: days,
        interval: days <= 1 ? 'hourly' : 'daily'
      },
      timeout: 10000
    });
    
    if (!response.data.prices) {
      console.log(`⚠️ No historical data for ${symbol}`);
      return res.json({ success: true, history: [] });
    }
    
    // Convert to our format
    const history = response.data.prices.map(([timestamp, price]) => ({
      timestamp,
      price: Math.round(price * 100) / 100
    }));
    
    console.log(`✅ [COINGECKO] Fetched ${history.length} data points for ${symbol}`);
    
    res.json({ success: true, history });
  } catch (error) {
    console.error(`Error fetching crypto history from CoinGecko:`, error.message);
    
    // If rate limited, return empty instead of error
    if (error.response?.status === 429) {
      console.log('⚠️ CoinGecko rate limit - returning empty history');
      return res.json({ success: true, history: [] });
    }
    
    res.json({ success: true, history: [] });
  }
});

/**
 * GET /api/historical/portfolio
 * Get portfolio value history using REAL prices
 * Optimized: Uses Alpha Vantage for stocks, CoinGecko for crypto
 */
router.get('/portfolio', async (req, res) => {
  try {
    const userId = req.userId;
    const days = parseInt(req.query.days) || 30;
    
    console.log(`📈 Calculating REAL portfolio history for ${days} days`);
    
    // Get all user's holdings - FIXED: Use Portfolio model
    const holdings = await Portfolio.find({ userId });
    
    if (holdings.length === 0) {
      console.log('⚠️ No holdings found for portfolio history');
      return res.json({ success: true, history: [] });
    }
    
    console.log(`📊 Found ${holdings.length} holdings to calculate history`);
    
    // Fetch historical data for each holding (with rate limiting)
    const historicalDataPromises = holdings.map(async (holding, index) => {
      try {
        // Add delay between requests to avoid rate limits
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
        }
        
        let historyData;
        
        if (holding.type === 'crypto') {
          // Use CoinGecko for crypto
          const coinId = CRYPTO_IDS[holding.symbol];
          if (!coinId) return null;
          
          const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
            params: { vs_currency: 'usd', days: days, interval: days <= 1 ? 'hourly' : 'daily' },
            timeout: 10000
          });
          
          historyData = response.data.prices.map(([timestamp, price]) => ({
            timestamp,
            price: price * holding.quantity // Value of this holding
          }));
          
          console.log(`  ✅ ${holding.symbol}: ${historyData.length} crypto points`);
        } else {
          // Use Alpha Vantage for stocks
          const cacheKey = `${holding.symbol}-${days}`;
          const cached = alphaVantageCache.get(cacheKey);
          
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`  📦 ${holding.symbol}: Using cached data`);
            historyData = cached.data.map(point => ({
              timestamp: point.timestamp,
              price: point.price * holding.quantity
            }));
          } else {
            const response = await axios.get('https://www.alphavantage.co/query', {
              params: {
                function: 'TIME_SERIES_DAILY',
                symbol: holding.symbol,
                apikey: ALPHA_VANTAGE_KEY,
                outputsize: days > 100 ? 'full' : 'compact'
              },
              timeout: 10000
            });
            
            if (response.data['Note'] || response.data['Error Message']) {
              console.log(`  ⚠️ ${holding.symbol}: Alpha Vantage limit/error`);
              return null;
            }
            
            const timeSeries = response.data['Time Series (Daily)'];
            if (!timeSeries) return null;
            
            const rawHistory = Object.entries(timeSeries)
              .slice(0, days)
              .map(([date, data]) => ({
                timestamp: new Date(date).getTime(),
                price: parseFloat(data['4. close'])
              }))
              .reverse();
            
            // Cache it
            alphaVantageCache.set(cacheKey, {
              timestamp: Date.now(),
              data: rawHistory
            });
            
            historyData = rawHistory.map(point => ({
              timestamp: point.timestamp,
              price: point.price * holding.quantity
            }));
            
            console.log(`  ✅ ${holding.symbol}: ${historyData.length} stock points`);
          }
        }
        
        return { symbol: holding.symbol, history: historyData };
      } catch (error) {
        console.error(`  ❌ Error fetching history for ${holding.symbol}:`, error.message);
        return null;
      }
    });
    
    const historicalResults = await Promise.all(historicalDataPromises);
    const validResults = historicalResults.filter(r => r !== null && r.history);
    
    if (validResults.length === 0) {
      console.log('⚠️ No valid historical data for any holdings');
      return res.json({ success: true, history: [] });
    }
    
    console.log(`📊 Got valid data for ${validResults.length}/${holdings.length} holdings`);
    
    // Combine all holdings into portfolio value at each timestamp
    const timestampMap = new Map();
    
    validResults.forEach(result => {
      result.history.forEach(point => {
        if (!timestampMap.has(point.timestamp)) {
          timestampMap.set(point.timestamp, 0);
        }
        timestampMap.set(point.timestamp, timestampMap.get(point.timestamp) + point.price);
      });
    });
    
    // Convert to array and sort by timestamp
    const history = Array.from(timestampMap.entries())
      .map(([timestamp, price]) => ({
        timestamp,
        price: Math.round(price * 100) / 100
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`✅ Calculated ${history.length} portfolio value points from ${validResults.length} holdings`);
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error calculating portfolio history:', error);
    res.json({ success: true, history: [] });
  }
});

/**
 * GET /api/historical/crypto-portfolio
 * Get crypto-only portfolio value history using CoinGecko
 */
router.get('/crypto-portfolio', async (req, res) => {
  try {
    const userId = req.userId;
    const days = parseInt(req.query.days) || 30;
    
    console.log(`₿ Calculating REAL crypto portfolio history for ${days} days`);
    
    // Get only crypto holdings - FIXED: Use Portfolio model
    const cryptoHoldings = await Portfolio.find({ userId, type: 'crypto' });
    
    if (cryptoHoldings.length === 0) {
      console.log('⚠️ No crypto holdings found');
      return res.json({ success: true, history: [] });
    }
    
    console.log(`₿ Found ${cryptoHoldings.length} crypto holdings`);
    
    // Fetch historical data for each crypto holding (with delays)
    const historicalDataPromises = cryptoHoldings.map(async (holding, index) => {
      try {
        // Add delay to avoid rate limits
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay for crypto
        }
        
        const coinId = CRYPTO_IDS[holding.symbol];
        if (!coinId) return null;
        
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
          params: { 
            vs_currency: 'usd', 
            days: days,
            interval: days <= 1 ? 'hourly' : 'daily'
          },
          timeout: 10000
        });
        
        const historyData = response.data.prices.map(([timestamp, price]) => ({
          timestamp,
          price: price * holding.quantity
        }));
        
        console.log(`  ✅ ${holding.symbol}: ${historyData.length} points`);
        
        return { symbol: holding.symbol, history: historyData };
      } catch (error) {
        console.error(`  ❌ Error fetching history for ${holding.symbol}:`, error.message);
        return null;
      }
    });
    
    const historicalResults = await Promise.all(historicalDataPromises);
    const validResults = historicalResults.filter(r => r !== null);
    
    if (validResults.length === 0) {
      console.log('⚠️ No valid crypto data');
      return res.json({ success: true, history: [] });
    }
    
    // Combine all crypto holdings
    const timestampMap = new Map();
    
    validResults.forEach(result => {
      result.history.forEach(point => {
        if (!timestampMap.has(point.timestamp)) {
          timestampMap.set(point.timestamp, 0);
        }
        timestampMap.set(point.timestamp, timestampMap.get(point.timestamp) + point.price);
      });
    });
    
    const history = Array.from(timestampMap.entries())
      .map(([timestamp, price]) => ({
        timestamp,
        price: Math.round(price * 100) / 100
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`✅ Calculated ${history.length} crypto portfolio points from ${validResults.length} holdings`);
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error calculating crypto portfolio history:', error);
    res.json({ success: true, history: [] });
  }
});

module.exports = router;