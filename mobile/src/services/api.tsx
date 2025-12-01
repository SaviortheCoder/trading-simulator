// ============================================
// API SERVICE - Backend communication
// ============================================

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ========== EASY TOGGLE ==========
// Set to true for ngrok testing, false for local
const USE_NGROK = false;

const LOCAL_URL = 'http://10.0.0.5:3001';
const NGROK_URL = 'https://hedgingly-unsenescent-davida.ngrok-free.dev'; 

const API_URL = USE_NGROK ? NGROK_URL : LOCAL_URL;
// =================================

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ... rest of your code stays the same

// Request interceptor: Add access token
apiClient.interceptors.request.use(
  async (config) => {
    const accessToken = await AsyncStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;
        await AsyncStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// AUTH FUNCTIONS
// ============================================

export async function register(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const response = await apiClient.post('/api/auth/register', data);
  return response.data;
}

export async function login(data: { email: string; password: string }) {
  const response = await apiClient.post('/api/auth/login', data);
  return response.data;
}

export async function getCurrentUser() {
  const response = await apiClient.get('/api/auth/me');
  return response.data;
}

export async function logout() {
  const refreshToken = await AsyncStorage.getItem('refreshToken');
  
  if (refreshToken) {
    await apiClient.post('/api/auth/logout', { refreshToken });
  }
  
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
}

// ============================================
// PRICE FUNCTIONS
// ============================================

export async function getStockPrice(symbol: string) {
  const response = await apiClient.get(`/api/prices/stock/${symbol}`);
  return response.data;
}

export async function getCryptoPrice(symbol: string) {
  const response = await apiClient.get(`/api/prices/crypto/${symbol}`);
  return response.data;
}

export async function searchSymbols(query: string) {
  const response = await apiClient.get(`/api/prices/search/${query}`);
  return response.data;
}

export async function getBulkPrices(symbols: string[] | Array<{symbol: string; type: string}>) {
    // Normalize to object format if strings are passed
    const normalizedSymbols = symbols.map(s => 
      typeof s === 'string' ? { symbol: s, type: 'stock' } : s
    );
    
    const response = await apiClient.post('/api/prices/bulk', { symbols: normalizedSymbols });
    return response.data;
  }

// ============================================
// PORTFOLIO FUNCTIONS
// ============================================

export async function getPortfolio() {
  const response = await apiClient.get('/api/portfolio');
  return response.data;
}

// ============================================
// WATCHLIST FUNCTIONS
// ============================================

export async function getWatchlist() {
  const response = await apiClient.get('/api/watchlist');
  return response.data;
}

export async function addToWatchlist(symbol: string, name: string, type: string = 'stock') {
  const response = await apiClient.post('/api/watchlist', { symbol, name, type });
  return response.data;
}

export async function removeFromWatchlist(symbol: string) {
  const response = await apiClient.delete(`/api/watchlist/${symbol}`);
  return response.data;
}

// ============================================
// TRADING FUNCTIONS
// ============================================

export async function buyAsset(symbol: string, quantity: number, price: number, name: string, type: string) {
  const response = await apiClient.post('/api/trade/buy', {
    symbol,
    quantity,
    price,
    name,
    type,
  });
  return response.data;
}

export async function sellAsset(symbol: string, quantity: number, price: number) {
  const response = await apiClient.post('/api/trade/sell', {
    symbol,
    quantity,
    price,
  });
  return response.data;
}

export async function getHoldings() {
  const response = await apiClient.get('/api/trade/holdings');
  return response.data;
}

export async function getHolding(symbol: string) {
  const response = await apiClient.get(`/api/trade/holding/${symbol}`);
  return response.data;
}

export async function getTransactions() {
  const response = await apiClient.get('/api/trade/transactions');
  return response.data;
}

export async function getSymbolTransactions(symbol: string) {
  const response = await apiClient.get(`/api/trade/transactions/${symbol}`);
  return response.data;
}

// Historical price data for charts
export async function getPortfolioHistory(days: number = 30) {
    const response = await apiClient.get(`/api/historical/portfolio?days=${days}`);
    return response.data;
  }
  
  export async function getCryptoPortfolioHistory(days: number = 30) {
    const response = await apiClient.get(`/api/historical/crypto-portfolio?days=${days}`);
    return response.data;
  }
  
  export async function getStockHistory(symbol: string, days: number = 30) {
    const response = await apiClient.get(`/api/historical/stock/${symbol}?days=${days}`);
    return response.data;
  }
  
  export async function getCryptoHistory(symbol: string, days: number = 30) {
    const response = await apiClient.get(`/api/historical/crypto/${symbol}?days=${days}`);
    return response.data;
  }
  
  export async function getAssetHistory(symbol: string, type: string, days: number = 7) {
    const endpoint = type === 'crypto' ? 'crypto' : 'stock';
    const response = await apiClient.get(`/api/historical/${endpoint}/${symbol}?days=${days}`);
    return response.data;
  }  

export default apiClient;