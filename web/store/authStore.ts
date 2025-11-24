// ============================================
// AUTH STORE - Global authentication state
// ============================================

import { create } from 'zustand';

// User type definition
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

// Auth store state interface
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  loadFromStorage: () => void;
}

// Create auth store
export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  // Set authentication (after login/register)
  setAuth: (user, accessToken, refreshToken) => {
    // Save to localStorage
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    // Update state
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },

  // Clear authentication (logout)
  clearAuth: () => {
    // Remove from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    // Update state
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  // Update user info (after profile changes, balance updates, etc.)
  updateUser: (updatedUser) => {
    set((state) => {
      if (!state.user) return state;

      const newUser = { ...state.user, ...updatedUser };
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(newUser));

      return { user: newUser };
    });
  },

  // Load auth data from localStorage (on app start)
  loadFromStorage: () => {
    try {
      const userStr = localStorage.getItem('user');
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');

      if (userStr && accessToken && refreshToken) {
        const user = JSON.parse(userStr);
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Failed to load auth from storage:', error);
    }
  },
}));