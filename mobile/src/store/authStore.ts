// ============================================
// AUTH STORE - FIXED TOKEN STORAGE
// ============================================

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  cashBalance: number;
  portfolioValue: number;
  totalValue: number;
  totalProfitLoss?: number;
  totalProfitLossPercent?: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  clearAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  setAuth: async (user, accessToken, refreshToken) => {
    console.log('✅ Storing auth tokens...');
    
    // Store with CORRECT keys that match api.ts
    await AsyncStorage.setItem('user', JSON.stringify(user));
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    
    console.log('✅ Tokens stored successfully');
    
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },

  setUser: async (user) => {
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  clearAuth: async () => {
    console.log('🔓 Clearing auth...');
    
    // Clear everything
    await AsyncStorage.clear();
    
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    
    console.log('✅ Auth cleared');
  },

  updateUser: async (updatedUser) => {
    set((state) => {
      if (!state.user) return state;
      const newUser = { ...state.user, ...updatedUser };
      AsyncStorage.setItem('user', JSON.stringify(newUser));
      return { user: newUser };
    });
  },

  loadFromStorage: async () => {
    try {
      console.log('📦 Loading auth from storage...');
      
      const userStr = await AsyncStorage.getItem('user');
      const accessToken = await AsyncStorage.getItem('accessToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (userStr && accessToken && refreshToken) {
        const user = JSON.parse(userStr);
        
        console.log('✅ Auth loaded from storage');
        console.log('👤 User:', user.email);
        console.log('🔑 Has access token:', accessToken ? 'YES' : 'NO');
        console.log('🔑 Has refresh token:', refreshToken ? 'YES' : 'NO');
        
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      } else {
        console.log('⚠️ No stored auth found');
      }
    } catch (error) {
      console.error('❌ Failed to load auth from storage:', error);
    }
  },
}));