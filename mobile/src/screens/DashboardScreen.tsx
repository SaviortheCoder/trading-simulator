// ============================================
// DASHBOARD SCREEN - Robinhood-style mobile
// ============================================

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuthStore } from '../store/authStore';
import { logout, getWatchlist, removeFromWatchlist, getBulkPrices } from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface WatchlistItem {
    symbol: string;
    name: string;
    type: string;
    price?: number;
    change?: number;
    changePercent?: number;
    loading?: boolean;
  }
  
  export default function DashboardScreen({ navigation }: any) {  // ← THIS LINE
    const { user, clearAuth } = useAuthStore();
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      // Load watchlist from backend
      const response = await getWatchlist();
      
      if (response.success) {
        const items = response.watchlist.map((item: any) => ({
          ...item,
          loading: true,
        }));
        setWatchlist(items);
        
        // Load all prices at once using bulk endpoint
        await loadPricesAllAtOnce(items);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPricesAllAtOnce = async (items: WatchlistItem[]) => {
    try {
      // Get all symbols
      const symbols = items.map(item => item.symbol);
      
      // Fetch all prices in one request (uses cache!)
      const response = await getBulkPrices(symbols);
      
      if (response.success) {
        // Update all items at once
        setWatchlist((prev) =>
          prev.map((item) => ({
            ...item,
            price: response.prices[item.symbol]?.price,
            change: response.prices[item.symbol]?.change,
            changePercent: response.prices[item.symbol]?.changePercent,
            loading: false,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading prices:', error);
      // Mark all as not loading
      setWatchlist((prev) =>
        prev.map((item) => ({ ...item, loading: false }))
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      await clearAuth();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAssetPress = (symbol: string, name: string) => {
    console.log('Navigating to:', symbol, name);
    navigation.navigate('AssetDetail', { 
      symbol, 
      name,
      type: 'stock' 
    });
  };

  const handleDelete = async (symbol: string) => {
    try {
      // Remove from backend
      await removeFromWatchlist(symbol);
      
      // Remove from state
      setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

  // Render full-width delete button on right swipe (Robinhood style)
  const renderRightActions = (
    progress: any,
    dragX: any,
    symbol: string
  ) => {
    return (
      <View style={styles.deleteAction}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(symbol)}  // ✅ CORRECT 
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!user) return null;

  const initialValue = 100000;
  const currentValue = user.totalValue || 100000;
  const profitLoss = currentValue - initialValue;
  const profitLossPercent = ((profitLoss / initialValue) * 100).toFixed(2);
  const isPositive = profitLoss >= 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Trading Simulator</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutButton}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#00C805"
          />
        }
      >
        {/* Portfolio Value */}
        <View style={styles.portfolioSection}>
          <Text style={styles.portfolioValue}>
            ${currentValue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View style={styles.profitLossContainer}>
            <Text
              style={[
                styles.profitLoss,
                isPositive ? styles.positive : styles.negative,
              ]}
            >
              {isPositive ? '+' : ''}$
              {Math.abs(profitLoss).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
            <Text
              style={[
                styles.profitLossPercent,
                isPositive ? styles.positive : styles.negative,
              ]}
            >
              ({isPositive ? '+' : ''}
              {profitLossPercent}%)
            </Text>
            <Text style={styles.timeframe}>Today</Text>
          </View>
        </View>

        {/* Placeholder for Chart */}
        <View
          style={[
            styles.chartPlaceholder,
            isPositive ? styles.chartPositive : styles.chartNegative,
          ]}
        >
          <Text style={styles.chartText}>Portfolio Chart Coming Soon</Text>
        </View>

        {/* Buying Power */}
        <View style={styles.buyingPowerCard}>
          <Text style={styles.buyingPowerLabel}>Buying Power</Text>
          <Text style={styles.buyingPowerValue}>
            ${(user.cashBalance || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>

        {/* Watchlist Section */}
        <View style={styles.watchlistSection}>
          <Text style={styles.sectionTitle}>Watchlist</Text>
          <Text style={styles.swipeHint}>Swipe left to remove</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00C805" />
            </View>
          ) : (
            watchlist.map((item) => {
              const isUp = (item.changePercent || 0) >= 0;
              return (
                <Swipeable
                  key={item.symbol}
                  ref={(ref) => {
                    if (ref) swipeableRefs.current[item.symbol] = ref;
                  }}
                  renderRightActions={(progress, dragX) =>
                    renderRightActions(progress, dragX, item.symbol)
                  }
                  overshootRight={false}
                  friction={1.5}
                  rightThreshold={40}
                >
                  <TouchableOpacity
                    style={styles.watchlistItem}
                    onPress={() => handleAssetPress(item.symbol, item.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemLeft}>
                      <Text style={styles.itemSymbol}>{item.symbol}</Text>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>

                    <View style={styles.itemRight}>
                      {item.loading ? (
                        <ActivityIndicator size="small" color="#00C805" />
                      ) : item.price ? (
                        <>
                          <Text style={styles.itemPrice}>
                            ${item.price.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                          <Text
                            style={[
                              styles.itemChange,
                              isUp ? styles.positive : styles.negative,
                            ]}
                          >
                            {isUp ? '+' : ''}
                            {item.changePercent?.toFixed(2)}%
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.itemError}>---</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              );
            })
          )}
        </View>

        {/* Bottom Spacer for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00C805',
  },
  logoutButton: {
    fontSize: 14,
    color: '#999',
  },
  content: {
    flex: 1,
  },
  portfolioSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  portfolioValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  profitLossContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profitLoss: {
    fontSize: 18,
    fontWeight: '600',
  },
  profitLossPercent: {
    fontSize: 18,
  },
  positive: {
    color: '#00C805',
  },
  negative: {
    color: '#FF5000',
  },
  timeframe: {
    fontSize: 14,
    color: '#666',
  },
  chartPlaceholder: {
    height: 200,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPositive: {
    backgroundColor: 'rgba(0, 200, 5, 0.1)',
  },
  chartNegative: {
    backgroundColor: 'rgba(255, 80, 0, 0.1)',
  },
  chartText: {
    color: '#666',
    fontSize: 16,
  },
  buyingPowerCard: {
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyingPowerLabel: {
    fontSize: 16,
    color: '#999',
  },
  buyingPowerValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  watchlistSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  swipeHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  watchlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 0,
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  itemLeft: {
    flex: 1,
  },
  itemSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    color: '#999',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  itemChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemError: {
    fontSize: 14,
    color: '#666',
  },
  deleteAction: {
    width: SCREEN_WIDTH,
    backgroundColor: '#FF5000',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomSpacer: {
    height: 100,
  },
});