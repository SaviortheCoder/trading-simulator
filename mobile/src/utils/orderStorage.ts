// ============================================
// ORDER STORAGE - Save/Load Custom Order
// Manages persistent custom ordering for watchlist and crypto
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const WATCHLIST_ORDER_KEY = '@watchlist_order';
const CRYPTO_ORDER_KEY = '@crypto_order';

/**
 * Save watchlist order to AsyncStorage
 * @param symbols - Array of symbols in desired order ['AAPL', 'TSLA', ...]
 */
export const saveWatchlistOrder = async (symbols: string[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(WATCHLIST_ORDER_KEY, JSON.stringify(symbols));
    console.log('✅ Watchlist order saved:', symbols);
  } catch (error) {
    console.error('❌ Error saving watchlist order:', error);
  }
};

/**
 * Load watchlist order from AsyncStorage
 * @returns Array of symbols in saved order, or null if no order saved
 */
export const loadWatchlistOrder = async (): Promise<string[] | null> => {
  try {
    const order = await AsyncStorage.getItem(WATCHLIST_ORDER_KEY);
    if (order) {
      const parsed = JSON.parse(order);
      console.log('✅ Watchlist order loaded:', parsed);
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('❌ Error loading watchlist order:', error);
    return null;
  }
};

/**
 * Save crypto list order to AsyncStorage
 * @param symbols - Array of crypto symbols in desired order ['BTC', 'ETH', ...]
 */
export const saveCryptoOrder = async (symbols: string[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(CRYPTO_ORDER_KEY, JSON.stringify(symbols));
    console.log('✅ Crypto order saved:', symbols);
  } catch (error) {
    console.error('❌ Error saving crypto order:', error);
  }
};

/**
 * Load crypto list order from AsyncStorage
 * @returns Array of symbols in saved order, or null if no order saved
 */
export const loadCryptoOrder = async (): Promise<string[] | null> => {
  try {
    const order = await AsyncStorage.getItem(CRYPTO_ORDER_KEY);
    if (order) {
      const parsed = JSON.parse(order);
      console.log('✅ Crypto order loaded:', parsed);
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('❌ Error loading crypto order:', error);
    return null;
  }
};

/**
 * Clear watchlist order (reset to default)
 */
export const clearWatchlistOrder = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(WATCHLIST_ORDER_KEY);
    console.log('✅ Watchlist order cleared');
  } catch (error) {
    console.error('❌ Error clearing watchlist order:', error);
  }
};

/**
 * Clear crypto order (reset to default)
 */
export const clearCryptoOrder = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CRYPTO_ORDER_KEY);
    console.log('✅ Crypto order cleared');
  } catch (error) {
    console.error('❌ Error clearing crypto order:', error);
  }
};

/**
 * Apply custom order to an array of items
 * @param items - Array of items with 'symbol' property
 * @param customOrder - Array of symbols in desired order
 * @returns Reordered array
 */
export function applyCustomOrder<T extends { symbol: string }>(
  items: T[],
  customOrder: string[] | null
): T[] {
  if (!customOrder || customOrder.length === 0) {
    return items; // Return original order if no custom order
  }

  // Create a map for quick lookup
  const itemMap = new Map<string, T>();
  items.forEach(item => itemMap.set(item.symbol, item));

  // Build ordered array based on custom order
  const orderedItems: T[] = [];
  const addedSymbols = new Set<string>();

  // Add items in custom order
  customOrder.forEach(symbol => {
    const item = itemMap.get(symbol);
    if (item) {
      orderedItems.push(item);
      addedSymbols.add(symbol);
    }
  });

  // Add any new items that aren't in the custom order (at the end)
  items.forEach(item => {
    if (!addedSymbols.has(item.symbol)) {
      orderedItems.push(item);
    }
  });

  return orderedItems;
}