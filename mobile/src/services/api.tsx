// ============================================
// API SERVICE - Backend communication
// ============================================

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API URL - your Mac's local IP
const API_URL = 'http://10.0.0.5:3001';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// ============================================
// PORTFOLIO FUNCTIONS
// ============================================

export async function getPortfolio() {
    const response = await apiClient.get('/api/portfolio');
    return response.data;
  }
  
  export async function getHolding(symbol: string) {
    const response = await apiClient.get(`/api/portfolio/${symbol}`);
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

  export async function getBulkPrices(symbols: string[]) {
    const response = await apiClient.post('/api/prices/bulk', { symbols });
    return response.data;
  }

export default apiClient;