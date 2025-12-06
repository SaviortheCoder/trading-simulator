// ============================================
// CRYPTO SCREEN - ENHANCED WITH COLLAPSEABLE HOLDINGS
// Fixed import path, collapseable section, better error handling
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { 
  getHoldings, 
  getCryptoPortfolioHistory, 
  getBulkPrices,
  getAssetHistory 
} from '../services/api';
import PortfolioChart from '../components/PortfolioChart';
import Sparkline from '../components/Sparkline';
import { Timeframe } from '../components/TimeframeSelector';
import { formatCurrency, formatPercent, formatCryptoQuantity } from '../utils/formatUtils';  // ✅ FIXED PATH

interface Holding {
  symbol: string;
  name: string;
  type: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: string;
  todaysReturn?: number;
  todaysReturnPercent?: string;
  totalReturn?: number;
  totalReturnPercent?: string;
}

interface CryptoPrice {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  history?: number[];
}

// All available cryptocurrencies
const CRYPTO_LIST = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'XRP', name: 'Ripple' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'AVAX', name: 'Avalanche' },
  { symbol: 'LINK', name: 'Chainlink' },
  { symbol: 'UNI', name: 'Uniswap' },
  { symbol: 'LTC', name: 'Litecoin' },
  { symbol: 'ATOM', name: 'Cosmos' },
  { symbol: 'TRX', name: 'TRON' },
];

const CryptoScreen = () => {
  const navigation = useNavigation<any>();
  
  const [cryptos, setCryptos] = useState<CryptoPrice[]>([]);
  const [cryptoHoldings, setCryptoHoldings] = useState<Holding[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<Array<{ timestamp: number; price: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingChart, setLoadingChart] = useState(true);
  
  // ✅ NEW: Collapseable state
  const [holdingsExpanded, setHoldingsExpanded] = useState(true);
  const [visibleCryptoCount, setVisibleCryptoCount] = useState(5);

  useFocusEffect(
    useCallback(() => {
      loadCryptos();
    }, [])
  );

  const loadCryptos = async (days: number = 30) => {
    setLoading(true);
    setLoadingChart(true);
    
    try {
      console.log('🔄 Loading crypto data...');
      
      // Load crypto holdings
      let cryptoOnly: Holding[] = [];
      try {
        const holdingsResponse = await getHoldings();
        
        if (holdingsResponse.success) {
          cryptoOnly = (holdingsResponse.holdings || []).filter((h: Holding) => h.type === 'crypto');
          console.log('₿ Crypto holdings found:', cryptoOnly.length);
          setCryptoHoldings(cryptoOnly);
        }
      } catch (error) {
        console.error('❌ Error loading crypto holdings:', error);
      }

      // Load crypto portfolio history if user has crypto
      if (cryptoOnly.length > 0) {
        try {
          console.log('📈 Loading crypto portfolio history...');
          const historyResponse = await getCryptoPortfolioHistory(days);
          
          if (historyResponse.success && historyResponse.history && historyResponse.history.length > 0) {
            console.log('✅ Portfolio history loaded:', historyResponse.history.length, 'points');
            setPortfolioHistory(historyResponse.history);
          } else {
            console.log('⚠️ No portfolio history data available');
            setPortfolioHistory([]);
          }
        } catch (error) {
          console.error('❌ Error loading crypto portfolio history:', error);
          setPortfolioHistory([]);
        }
      } else {
        console.log('ℹ️ No crypto holdings - skipping portfolio history');
        setPortfolioHistory([]);
      }
      setLoadingChart(false);
      
      // Get all crypto symbols
      const symbols = CRYPTO_LIST.map(c => ({
        symbol: c.symbol,
        type: 'crypto'
      }));
      
      // Load all prices using api.ts
      console.log('💰 Loading crypto prices...');
      const response = await getBulkPrices(symbols);
      
      if (response.success && response.prices) {
        console.log('✅ Prices loaded for', response.prices.length, 'cryptos');
        
        const cryptoData = CRYPTO_LIST.map(crypto => {
          const priceData = response.prices.find((p: any) => p.symbol === crypto.symbol);
          
          return {
            symbol: crypto.symbol,
            name: crypto.name,
            price: priceData?.price || 0,
            changePercent: priceData?.changePercent || 0,
          };
        });
        
        setCryptos(cryptoData);

        // Load sparklines
        await loadSparklines(cryptoData);
      }
    } catch (error) {
      console.error('❌ Error loading cryptos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSparklines = async (cryptoList: CryptoPrice[]) => {
    const visibleCryptos = cryptoList.slice(0, visibleCryptoCount);
    
    const sparklinePromises = visibleCryptos.map(async (crypto) => {
      try {
        const response = await getAssetHistory(crypto.symbol, 'crypto', 7);
        if (response.success && response.history) {
          return {
            symbol: crypto.symbol,
            history: response.history.map((h: any) => h.price),
          };
        }
      } catch (error) {
        console.error(`Error loading sparkline for ${crypto.symbol}:`, error);
      }
      return null;
    });

    const sparklineResults = await Promise.all(sparklinePromises);

    setCryptos((prev) =>
      prev.map((crypto) => {
        const sparklineData = sparklineResults.find((s) => s?.symbol === crypto.symbol);
        return {
          ...crypto,
          history: sparklineData?.history || [],
        };
      })
    );
  };

  const handleTimeframeChange = (timeframe: Timeframe, days: number) => {
    console.log(`Loading ${days} days of crypto portfolio data`);
    loadCryptos(days);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCryptos();
    setRefreshing(false);
  };

  const handleCryptoPress = (crypto: CryptoPrice) => {
    navigation.navigate('AssetDetail', { 
      symbol: crypto.symbol, 
      name: crypto.name,
      type: 'crypto'
    });
  };

  // ✅ NEW: Load more cryptos
  const handleLoadMore = async () => {
    const newCount = Math.min(visibleCryptoCount + 5, cryptos.length);
    setVisibleCryptoCount(newCount);
    
    // Load sparklines for newly visible cryptos
    await loadSparklines(cryptos);
  };

  const renderCryptoItem = ({ item }: { item: CryptoPrice }) => {
    const isPositive = item.changePercent >= 0;

    return (
      <TouchableOpacity
        style={styles.cryptoItem}
        onPress={() => handleCryptoPress(item)}
      >
        <View style={styles.cryptoInfo}>
          <Text style={styles.cryptoSymbol}>{item.symbol}</Text>
          <Text style={styles.cryptoName}>{item.name}</Text>
        </View>

        <View style={styles.cryptoRight}>
          {item.price > 0 ? (
            <>
              <View style={styles.sparklineWrapper}>
                {item.history && item.history.length > 0 && (
                  <Sparkline
                    data={item.history}
                    width={60}
                    height={30}
                    color={isPositive ? '#00C805' : '#FF5000'}
                  />
                )}
              </View>
              <View style={styles.priceInfo}>
                <Text style={styles.cryptoPrice}>
                  {formatCurrency(item.price)}
                </Text>
                <Text style={[styles.cryptoChange, isPositive ? styles.positive : styles.negative]}>
                  {formatPercent(item.changePercent)}
                </Text>
              </View>
            </>
          ) : (
            <ActivityIndicator size="small" color="#00C805" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Calculate crypto portfolio value
  const cryptoPortfolioValue = cryptoHoldings.reduce((total, holding) => total + holding.currentValue, 0);
  const cryptoInitialValue = cryptoHoldings.reduce((total, holding) => total + (holding.avgBuyPrice * holding.quantity), 0);
  const cryptoProfitLoss = cryptoPortfolioValue - cryptoInitialValue;
  const isPortfolioPositive = cryptoProfitLoss >= 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crypto</Text>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00C805" />
          <Text style={styles.loadingText}>Loading cryptocurrencies...</Text>
        </View>
      ) : (
        <FlatList
          data={cryptos.slice(0, visibleCryptoCount)}
          renderItem={renderCryptoItem}
          keyExtractor={(item) => item.symbol}
          ListHeaderComponent={
            <>
              {/* Crypto Portfolio Chart */}
              {cryptoHoldings.length > 0 && (
                <View style={styles.portfolioSection}>
                  <View style={styles.portfolioHeader}>
                    <Text style={styles.portfolioLabel}>Crypto Portfolio</Text>
                    <Text style={styles.portfolioValue}>
                      {formatCurrency(cryptoPortfolioValue)}
                    </Text>
                    <Text style={[
                      styles.portfolioProfitLoss,
                      isPortfolioPositive ? styles.positive : styles.negative
                    ]}>
                      {formatCurrency(Math.abs(cryptoProfitLoss), isPortfolioPositive)}
                    </Text>
                  </View>

                  {/* Chart */}
                  {loadingChart ? (
                    <View style={styles.chartLoadingContainer}>
                      <ActivityIndicator size="small" color="#00C805" />
                      <Text style={styles.chartLoadingText}>Loading chart...</Text>
                    </View>
                  ) : portfolioHistory.length > 0 ? (
                    <PortfolioChart 
                      data={portfolioHistory} 
                      isPositive={isPortfolioPositive}
                      onTimeframeChange={handleTimeframeChange}
                    />
                  ) : (
                    <View style={styles.chartPlaceholder}>
                      <Text style={styles.chartPlaceholderText}>Chart data unavailable</Text>
                      <Text style={styles.chartPlaceholderSubtext}>
                        Crypto historical data is temporarily unavailable.{'\n'}
                        This is due to API rate limits. Chart will load when data is available.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* ✅ NEW: COLLAPSEABLE Crypto Holdings */}
              {cryptoHoldings.length > 0 && (
                <View style={styles.holdingsSection}>
                  <TouchableOpacity 
                    style={styles.sectionHeader}
                    onPress={() => setHoldingsExpanded(!holdingsExpanded)}
                  >
                    <Text style={styles.sectionTitle}>Your Crypto ({cryptoHoldings.length})</Text>
                    <Text style={styles.expandIcon}>{holdingsExpanded ? '▼' : '▶'}</Text>
                  </TouchableOpacity>
                  
                  {holdingsExpanded && cryptoHoldings.map((holding) => {
                    const isProfitable = parseFloat(holding.profitLossPercent) >= 0;
                    return (
                      <TouchableOpacity
                        key={holding.symbol}
                        style={styles.holdingItem}
                        onPress={() => {
                          navigation.navigate('AssetDetail', {
                            symbol: holding.symbol,
                            name: holding.name,
                            type: 'crypto',
                          });
                        }}
                      >
                        <View style={styles.holdingInfo}>
                          <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                          <Text style={styles.holdingQuantity}>
                            {formatCryptoQuantity(holding.quantity)} {holding.quantity === 1 ? 'coin' : 'coins'}
                          </Text>
                        </View>
                        <View style={styles.holdingValues}>
                          <Text style={styles.holdingValue}>
                            {formatCurrency(holding.currentValue)}
                          </Text>
                          <Text style={[
                            styles.holdingProfit,
                            isProfitable ? styles.positive : styles.negative
                          ]}>
                            {formatCurrency(Math.abs(holding.profitLoss), isProfitable)} ({formatPercent(parseFloat(holding.profitLossPercent))})
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Section Title */}
              <View style={styles.listHeaderSection}>
                <Text style={styles.sectionTitle}>All Cryptocurrencies</Text>
              </View>
            </>
          }
          ListFooterComponent={
            <>
              {/* Load More Button */}
              {visibleCryptoCount < cryptos.length && (
                <TouchableOpacity
                  style={styles.loadMoreButton}
                  onPress={handleLoadMore}
                >
                  <Text style={styles.loadMoreText}>
                    Load More ({cryptos.length - visibleCryptoCount} remaining)
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* Show Less Button */}
              {visibleCryptoCount > 5 && (
                <TouchableOpacity
                  style={styles.showLessButton}
                  onPress={() => setVisibleCryptoCount(5)}
                >
                  <Text style={styles.showLessText}>Show Less</Text>
                </TouchableOpacity>
              )}
            </>
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#00C805"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  portfolioSection: {
    paddingTop: 16,
    marginBottom: 24,
  },
  portfolioHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  portfolioLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  portfolioProfitLoss: {
    fontSize: 16,
    fontWeight: '600',
  },
  chartLoadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  chartLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  chartPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 32,
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  chartPlaceholderSubtext: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    lineHeight: 18,
  },
  holdingsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  expandIcon: {
    fontSize: 16,
    color: '#00C805',
    fontWeight: 'bold',
  },
  holdingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  holdingInfo: {
    flex: 1,
  },
  holdingSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  holdingQuantity: {
    fontSize: 14,
    color: '#999',
  },
  holdingValues: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  holdingProfit: {
    fontSize: 14,
    fontWeight: '500',
  },
  collapseButton: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  collapseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  listHeaderSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    paddingBottom: 100,
  },
  cryptoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  cryptoInfo: {
    flex: 1,
  },
  cryptoSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cryptoName: {
    fontSize: 14,
    color: '#999',
  },
  cryptoRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sparklineWrapper: {
    width: 60,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  priceInfo: {
    alignItems: 'flex-end',
    width: 100,
  },
  cryptoPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cryptoChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadMoreButton: {
    marginTop: 16,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00C805',
  },
  showLessButton: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  showLessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  positive: {
    color: '#00C805',
  },
  negative: {
    color: '#FF5000',
  },
});

export default CryptoScreen;
