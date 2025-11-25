// ============================================
// SMART PRICE CACHE SERVICE
// Uses Finnhub (stocks) + CoinGecko (crypto)
// ============================================

const axios = require('axios');

// In-memory cache structure
const cache = {
  stocks: new Map(),
  crypto: new Map(),
  search: new Map(),
};

// Cache configuration
const CACHE_CONFIG = {
    FRESH_DURATION: 5 * 60 * 1000,      // 5 minutes for stocks
    FRESH_DURATION_CRYPTO: 10 * 60 * 1000, // 10 minutes for crypto (longer cache)
    STALE_DURATION: 60 * 60 * 1000,     // 1 hour = stale but usable
  };

// Crypto symbol mapping for CoinGecko
const CRYPTO_MAPPING = {
  'BTC': 'bitcoin',
  'BTCUSD': 'bitcoin',
  'BTCUSDT': 'bitcoin',
  'XBT': 'bitcoin',
  'ETH': 'ethereum',
  'ETHUSD': 'ethereum',
  'ETHUSDT': 'ethereum',
  'BNB': 'binancecoin',
  'BNBUSD': 'binancecoin',
  'BNBUSDT': 'binancecoin',
  'SOL': 'solana',
  'SOLUSD': 'solana',
  'SOLUSDT': 'solana',
  'XRP': 'ripple',
  'XRPUSD': 'ripple',
  'XRPUSDT': 'ripple',
  'ADA': 'cardano',
  'ADAUSD': 'cardano',
  'ADAUSDT': 'cardano',
  'DOGE': 'dogecoin',
  'DOGEUSD': 'dogecoin',
  'DOGEUSDT': 'dogecoin',
  'DOT': 'polkadot',
  'DOTUSD': 'polkadot',
  'DOTUSDT': 'polkadot',
  'AVAX': 'avalanche-2',
  'AVAXUSD': 'avalanche-2',
  'AVAXUSDT': 'avalanche-2',
  'LINK': 'chainlink',
  'LINKUSD': 'chainlink',
  'LINKUSDT': 'chainlink',
  'UNI': 'uniswap',
  'UNIUSD': 'uniswap',
  'UNIUSDT': 'uniswap',
  'LTC': 'litecoin',
  'LTCUSD': 'litecoin',
  'LTCUSDT': 'litecoin',
  'ATOM': 'cosmos',
  'ATOMUSD': 'cosmos',
  'ATOMUSDT': 'cosmos',
  'TRX': 'tron',
  'TRXUSD': 'tron',
  'TRXUSDT': 'tron',
};

// ============================================
// STOCK PRICE FUNCTIONS (Finnhub)
// ============================================

async function fetchStockPrice(symbol) {
  const apiKey = process.env.FINNHUB_KEY;
  
  // Get current quote from Finnhub
  const quoteResponse = await axios.get('https://finnhub.io/api/v1/quote', {
    params: {
      symbol: symbol.toUpperCase(),
      token: apiKey,
    },
    timeout: 10000,
  });

  const quote = quoteResponse.data;

  // Finnhub returns 0 for invalid symbols
  if (!quote.c || quote.c === 0) {
    throw new Error('Stock not found or market closed');
  }

  return {
    symbol: symbol.toUpperCase(),
    price: quote.c,              // Current price
    change: quote.d,             // Change
    changePercent: quote.dp,     // Change percent
    high: quote.h,               // High price of the day
    low: quote.l,                // Low price of the day
    open: quote.o,               // Open price of the day
    previousClose: quote.pc,     // Previous close price
    volume: 0,                   // Finnhub doesn't provide volume in quote endpoint
  };
}

async function getStockPrice(symbol) {
  const now = Date.now();
  const cached = cache.stocks.get(symbol.toUpperCase());

  // Return fresh cache
  if (cached && (now - cached.timestamp) < CACHE_CONFIG.FRESH_DURATION) {
    console.log(`📊 [CACHE HIT - FRESH] ${symbol}`);
    return {
      ...cached.data,
      cached: true,
      cacheAge: Math.floor((now - cached.timestamp) / 1000),
    };
  }

  // Try to fetch new price
  try {
    console.log(`📡 [FINNHUB API CALL] Fetching ${symbol}...`);
    const data = await fetchStockPrice(symbol);
    
    // Cache the new data
    cache.stocks.set(symbol.toUpperCase(), {
      data,
      timestamp: now,
    });

    return {
      ...data,
      cached: false,
      cacheAge: 0,
    };
  } catch (error) {
    console.error(`❌ [FINNHUB API ERROR] ${symbol}:`, error.message);

    // Return stale cache if available
    if (cached && (now - cached.timestamp) < CACHE_CONFIG.STALE_DURATION) {
      console.log(`📊 [CACHE HIT - STALE] ${symbol} (using old data)`);
      return {
        ...cached.data,
        cached: true,
        stale: true,
        cacheAge: Math.floor((now - cached.timestamp) / 1000),
      };
    }

    throw error;
  }
}

// ============================================
// CRYPTO PRICE FUNCTIONS (CoinGecko)
// ============================================

async function fetchCryptoPrice(symbol) {
  const coinId = CRYPTO_MAPPING[symbol.toUpperCase()];
  
  if (!coinId) {
    throw new Error(`Crypto symbol ${symbol} not supported`);
  }

  const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
    params: {
      ids: coinId,
      vs_currencies: 'usd',
      include_24hr_change: true,
      include_24hr_vol: true,
    },
    timeout: 10000,
  });

  if (!response.data[coinId]) {
    throw new Error('Crypto not found');
  }

  const data = response.data[coinId];

  return {
    symbol: symbol.toUpperCase(),
    price: data.usd,
    change: data.usd_24h_change || 0,
    changePercent: data.usd_24h_change || 0,
    volume: data.usd_24h_vol || 0,
  };
}

// Fetch multiple crypto prices in one call
async function fetchMultipleCryptoPrices(symbols) {
    // Get all coin IDs
    const coinIds = symbols
      .map(symbol => CRYPTO_MAPPING[symbol.toUpperCase()])
      .filter(id => id)
      .join(',');
  
    if (!coinIds) {
      return {};
    }
  
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: coinIds,
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_24hr_vol: true,
      },
      timeout: 10000,
    });
  
    // Map back to symbols
    const results = {};
    symbols.forEach(symbol => {
      const coinId = CRYPTO_MAPPING[symbol.toUpperCase()];
      if (coinId && response.data[coinId]) {
        const data = response.data[coinId];
        results[symbol.toUpperCase()] = {
          symbol: symbol.toUpperCase(),
          price: data.usd,
          change: data.usd_24h_change || 0,
          changePercent: data.usd_24h_change || 0,
          volume: data.usd_24h_vol || 0,
        };
      }
    });
  
    return results;
  }

async function getCryptoPrice(symbol) {
    const now = Date.now();
    const cached = cache.crypto.get(symbol.toUpperCase());
  
    // Return fresh cache (10 minutes for crypto)
    if (cached && (now - cached.timestamp) < CACHE_CONFIG.FRESH_DURATION_CRYPTO) {
      console.log(`₿ [CACHE HIT - FRESH] ${symbol}`);
      return {
        ...cached.data,
        cached: true,
        cacheAge: Math.floor((now - cached.timestamp) / 1000),
      };
    }
  
    // Try to fetch new price
    try {
      console.log(`📡 [COINGECKO API CALL] Fetching crypto ${symbol}...`);
      const data = await fetchCryptoPrice(symbol);
      
      // Cache the new data
      cache.crypto.set(symbol.toUpperCase(), {
        data,
        timestamp: now,
      });
  
      return {
        ...data,
        cached: false,
        cacheAge: 0,
      };
    } catch (error) {
      console.error(`❌ [COINGECKO API ERROR] ${symbol}:`, error.message);
  
      // ALWAYS return stale cache if available (even on 429 rate limit)
      if (cached) {
        console.log(`₿ [CACHE HIT - STALE] ${symbol} (using old data due to rate limit)`);
        return {
          ...cached.data,
          cached: true,
          stale: true,
          cacheAge: Math.floor((now - cached.timestamp) / 1000),
        };
      }
  
      // If no cache and rate limited, throw error
      throw error;
    }
  }

// ============================================
// BULK PRICE FUNCTIONS
// ============================================

async function getBulkPrices(symbols) {
    const results = {};
    
    // Separate stocks and cryptos
    const stocks = [];
    const cryptos = [];
    
    symbols.forEach((symbol) => {
      if (Object.keys(CRYPTO_MAPPING).includes(symbol.toUpperCase())) {
        cryptos.push(symbol);
      } else {
        stocks.push(symbol);
      }
    });
    
    // Load stocks in parallel (Finnhub can handle it)
    await Promise.all(
      stocks.map(async (symbol) => {
        try {
          results[symbol] = await getStockPrice(symbol);
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error.message);
          results[symbol] = null;
        }
      })
    );
    
    // Load ALL cryptos in ONE bulk call
    if (cryptos.length > 0) {
      try {
        console.log(`📡 [COINGECKO BULK CALL] Fetching ${cryptos.length} cryptos at once...`);
        const cryptoResults = await fetchMultipleCryptoPrices(cryptos);
        
        // Add to results and cache each one
        const now = Date.now();
        cryptos.forEach(symbol => {
          const symbolUpper = symbol.toUpperCase();
          if (cryptoResults[symbolUpper]) {
            results[symbol] = {
              ...cryptoResults[symbolUpper],
              cached: false,
              cacheAge: 0,
            };
            
            // Cache it
            cache.crypto.set(symbolUpper, {
              data: cryptoResults[symbolUpper],
              timestamp: now,
            });
          } else {
            results[symbol] = null;
          }
        });
      } catch (error) {
        console.error('Error fetching bulk crypto prices:', error.message);
        
        // Try to use cache for all cryptos
        cryptos.forEach(symbol => {
          const cached = cache.crypto.get(symbol.toUpperCase());
          if (cached) {
            console.log(`₿ [CACHE FALLBACK] ${symbol}`);
            results[symbol] = {
              ...cached.data,
              cached: true,
              stale: true,
              cacheAge: Math.floor((Date.now() - cached.timestamp) / 1000),
            };
          } else {
            results[symbol] = null;
          }
        });
      }
    }
  
    return results;
  }

// ============================================
// SEARCH FUNCTIONS (Finnhub)
// ============================================

// Popular stocks for search fallback
const POPULAR_SEARCH_RESULTS = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'Common Stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Common Stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'Common Stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Common Stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'Common Stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Common Stock' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'Common Stock' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', type: 'Common Stock' },
  { symbol: 'V', name: 'Visa Inc.', type: 'Common Stock' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'Common Stock' },
  { symbol: 'WMT', name: 'Walmart Inc.', type: 'Common Stock' },
  { symbol: 'MA', name: 'Mastercard Inc.', type: 'Common Stock' },
  { symbol: 'HD', name: 'The Home Depot Inc.', type: 'Common Stock' },
  { symbol: 'DIS', name: 'The Walt Disney Company', type: 'Common Stock' },
  { symbol: 'NFLX', name: 'Netflix Inc.', type: 'Common Stock' },
  { symbol: 'ADBE', name: 'Adobe Inc.', type: 'Common Stock' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', type: 'Common Stock' },
  { symbol: 'INTC', name: 'Intel Corporation', type: 'Common Stock' },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.', type: 'Common Stock' },
  { symbol: 'PFE', name: 'Pfizer Inc.', type: 'Common Stock' },
];

async function searchSymbols(query) {
  const cacheKey = query.toLowerCase();
  const now = Date.now();
  const cached = cache.search.get(cacheKey);

  // Return cached search results
  if (cached && (now - cached.timestamp) < CACHE_CONFIG.FRESH_DURATION) {
    console.log(`🔍 [SEARCH CACHE HIT] ${query}`);
    return cached.results;
  }

  // Try Finnhub search
  try {
    console.log(`📡 [FINNHUB SEARCH] ${query}`);
    const apiKey = process.env.FINNHUB_KEY;
    
    const response = await axios.get('https://finnhub.io/api/v1/search', {
      params: {
        q: query,
        token: apiKey,
      },
      timeout: 10000,
    });

    const results = (response.data.result || [])
  .filter((item) => {
    // Filter to US-listed common stocks only (like Robinhood)
    const symbol = item.symbol || '';
    const type = (item.type || '').toLowerCase();
    
    return (
      // Must be common stock
      (type === 'common stock' || type === 'equity' || type === '') &&
      // US exchanges only (no international exchanges)
      !symbol.includes('.') &&  // No foreign exchanges (.TO, .L, .MC, etc.)
      // Exclude preferred shares, warrants, units
      !symbol.includes('-') &&  // No preferred shares (BRK-A, BRK-B ok but BRK-A.PR not)
      !symbol.endsWith('W') &&  // No warrants
      !symbol.endsWith('U') &&  // No units
      // Reasonable symbol length
      symbol.length <= 5
    );
  })
  .slice(0, 10)
  .map((item) => ({
    symbol: item.symbol,
    name: item.description,
    type: 'Common Stock',
    region: 'United States',
  }));

    // Cache results
    cache.search.set(cacheKey, {
      results,
      timestamp: now,
    });

    return results;
  } catch (error) {
    console.error(`❌ [FINNHUB SEARCH ERROR]:`, error.message);

    // Return cached results if available (even if stale)
    if (cached) {
      console.log(`🔍 [SEARCH CACHE - STALE] ${query}`);
      return cached.results;
    }

    // Fallback to filtered popular results
    console.log(`🔍 [SEARCH FALLBACK] ${query}`);
    const filtered = POPULAR_SEARCH_RESULTS.filter(
      (item) =>
        item.symbol.toLowerCase().includes(query.toLowerCase()) ||
        item.name.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.slice(0, 10);
  }
}

// ============================================
// CACHE MANAGEMENT
// ============================================

function getCacheStats() {
  return {
    stocks: {
      count: cache.stocks.size,
      symbols: Array.from(cache.stocks.keys()),
    },
    crypto: {
      count: cache.crypto.size,
      symbols: Array.from(cache.crypto.keys()),
    },
    search: {
      count: cache.search.size,
      queries: Array.from(cache.search.keys()),
    },
  };
}

function clearCache() {
  cache.stocks.clear();
  cache.crypto.clear();
  cache.search.clear();
  console.log('🗑️  Cache cleared');
}

// Clear stale cache entries every hour
setInterval(() => {
  const now = Date.now();
  
  // Clear stale stock cache
  for (const [symbol, entry] of cache.stocks.entries()) {
    if (now - entry.timestamp > CACHE_CONFIG.STALE_DURATION) {
      cache.stocks.delete(symbol);
    }
  }
  
  // Clear stale crypto cache
  for (const [symbol, entry] of cache.crypto.entries()) {
    if (now - entry.timestamp > CACHE_CONFIG.STALE_DURATION) {
      cache.crypto.delete(symbol);
    }
  }

  // Clear stale search cache
  for (const [query, entry] of cache.search.entries()) {
    if (now - entry.timestamp > CACHE_CONFIG.STALE_DURATION) {
      cache.search.delete(query);
    }
  }
  
  console.log('🧹 Cleaned stale cache entries');
}, 60 * 60 * 1000); // Every hour

module.exports = {
  getStockPrice,
  getCryptoPrice,
  getBulkPrices,
  getCacheStats,
  clearCache,
  searchSymbols,
};