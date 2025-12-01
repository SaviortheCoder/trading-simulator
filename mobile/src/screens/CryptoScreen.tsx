// ============================================
// CRYPTO SCREEN - Browse cryptocurrencies
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getBulkPrices, getHoldings, getCryptoPortfolioHistory, getAssetHistory } from '../services/api';
import PortfolioChart from '../components/PortfolioChart';
import Sparkline from '../components/Sparkline';
import { Timeframe } from '../components/TimeframeSelector';

interface Crypto {
  symbol: string;
  name: string;
  coinId: string;
  price?: number;
  change?: number;
  changePercent?: number;
  history?: number[];
}

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
}

export default function CryptoScreen({ navigation }: any) {
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [cryptoHoldings, setCryptoHoldings] = useState<Holding[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<Array<{ timestamp: number; price: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingChart, setLoadingChart] = useState(true);

  // All available cryptocurrencies for trading
  const popularCryptos = [
    { symbol: 'BTC', name: 'Bitcoin', coinId: 'bitcoin' },
    { symbol: 'ETH', name: 'Ethereum', coinId: 'ethereum' },
    { symbol: 'BNB', name: 'BNB', coinId: 'binancecoin' },
    { symbol: 'SOL', name: 'Solana', coinId: 'solana' },
    { symbol: 'XRP', name: 'Ripple', coinId: 'ripple' },
    { symbol: 'ADA', name: 'Cardano', coinId: 'cardano' },
    { symbol: 'DOGE', name: 'Dogecoin', coinId: 'dogecoin' },
    { symbol: 'DOT', name: 'Polkadot', coinId: 'polkadot' },
    { symbol: 'AVAX', name: 'Avalanche', coinId: 'avalanche-2' },
    { symbol: 'LINK', name: 'Chainlink', coinId: 'chainlink' },
    { symbol: 'UNI', name: 'Uniswap', coinId: 'uniswap' },
    { symbol: 'LTC', name: 'Litecoin', coinId: 'litecoin' },
    { symbol: 'ATOM', name: 'Cosmos', coinId: 'cosmos' },
    { symbol: 'TRX', name: 'TRON', coinId: 'tron' },
  ];

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
      
      // Load crypto holdings FIRST
      let cryptoOnly: Holding[] = [];
      try {
        const holdingsResponse = await getHoldings();
        console.log('📊 Holdings response:', holdingsResponse);
        
        if (holdingsResponse.success) {
          cryptoOnly = (holdingsResponse.holdings || []).filter((h: Holding) => h.type === 'crypto');
          console.log('₿ Crypto holdings found:', cryptoOnly.length, cryptoOnly.map(h => h.symbol));
          setCryptoHoldings(cryptoOnly);
        }
      } catch (error) {
        console.error('❌ Error loading crypto holdings:', error);
      }

      // Load crypto portfolio history if user has crypto
      if (cryptoOnly.length > 0) {
        console.log('📈 Loading crypto portfolio history...');
        try {
          const historyResponse = await getCryptoPortfolioHistory(days);
          console.log('📊 Portfolio history response:', historyResponse);
          
          if (historyResponse.success && historyResponse.history) {
            console.log('✅ Portfolio history loaded:', historyResponse.history.length, 'data points');
            setPortfolioHistory(historyResponse.history);
          } else {
            console.log('⚠️ No portfolio history data');
          }
        } catch (error) {
          console.error('❌ Error loading crypto portfolio history:', error);
        }
      } else {
        console.log('ℹ️ No crypto holdings - skipping portfolio chart');
      }
      setLoadingChart(false);
      
      // Get all symbols with type
      const symbols = popularCryptos.map(c => ({
        symbol: c.symbol,
        type: 'crypto'
      }));
      
      // Load all prices at once using bulk endpoint
      console.log('💰 Loading crypto prices...');
      const response = await getBulkPrices(symbols);
      
      if (response.success && response.prices) {
        console.log('✅ Prices loaded for', response.prices.length, 'cryptos');
        
        const cryptoData = popularCryptos.map(crypto => {
          const priceData = response.prices.find((p: any) => p.symbol === crypto.symbol);
          
          return {
            symbol: crypto.symbol,
            name: crypto.name,
            coinId: crypto.coinId,
            price: priceData?.price,
            change: priceData?.change,
            changePercent: priceData?.changePercent,
          };
        });
        
        setCryptos(cryptoData);

        // Load sparklines for each crypto
        await loadSparklines(cryptoData);
      }
    } catch (error) {
      console.error('❌ Error loading cryptos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSparklines = async (cryptoList: Crypto[]) => {
    const sparklinePromises = cryptoList.map(async (crypto) => {
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
    console.log(`📅 Loading ${days} days of crypto portfolio data for ${timeframe}`);
    loadCryptos(days);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCryptos();
    setRefreshing(false);
  };

  const handleCryptoPress = (crypto: Crypto) => {
    console.log('Navigating to crypto:', crypto.symbol, crypto.name);
    navigation.navigate('AssetDetail', { 
      symbol: crypto.symbol, 
      name: crypto.name,
      type: 'crypto'
    });
  };

  const renderCryptoItem = ({ item }: { item: Crypto }) => {
    const isPositive = (item.changePercent || 0) >= 0;

    return (
      <TouchableOpacity
        style={styles.cryptoItem}
        onPress={() => handleCryptoPress(item)}
      >
        <View style={styles.cryptoLeft}>
          <Text style={styles.cryptoSymbol}>{item.symbol}</Text>
          <Text style={styles.cryptoName}>{item.name}</Text>
        </View>

        <View style={styles.cryptoRight}>
          {item.price ? (
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
                  ${item.price.toLocaleString('en-US', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </Text>
                <Text style={[styles.cryptoChange, isPositive ? styles.positive : styles.negative]}>
                  {isPositive ? '+' : ''}{item.changePercent?.toFixed(2)}%
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

  console.log('🎨 Render state:', {
    hasCryptoHoldings: cryptoHoldings.length > 0,
    portfolioHistoryLength: portfolioHistory.length,
    loadingChart,
    cryptoPortfolioValue,
    cryptoHoldings: cryptoHoldings.map(h => `${h.symbol}: ${h.quantity}`)
  });

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
          data={cryptos}
          renderItem={renderCryptoItem}
          keyExtractor={(item) => item.symbol}
          ListHeaderComponent={
            <>
              {/* Crypto Portfolio Chart - Show if user has crypto holdings */}
              {cryptoHoldings.length > 0 && (
                <View style={styles.portfolioSection}>
                  <View style={styles.portfolioHeader}>
                    <View>
                      <Text style={styles.portfolioLabel}>Crypto Portfolio</Text>
                      <Text style={styles.portfolioValue}>
                        ${cryptoPortfolioValue.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Text>
                      <Text style={[
                        styles.portfolioProfitLoss,
                        isPortfolioPositive ? styles.positive : styles.negative
                      ]}>
                        {isPortfolioPositive ? '+' : ''}${Math.abs(cryptoProfitLoss).toFixed(2)}
                      </Text>
                    </View>
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
                    </View>
                  )}
                </View>
              )}

              {/* Crypto Holdings */}
              {cryptoHoldings.length > 0 && (
                <View style={styles.holdingsSection}>
                  <Text style={styles.sectionTitle}>My Crypto</Text>
                  {cryptoHoldings.map((holding) => {
                    const isUp = parseFloat(holding.profitLossPercent) >= 0;
                    return (
                      <TouchableOpacity
                        key={holding.symbol}
                        style={styles.holdingItem}
                        onPress={() => navigation.navigate('AssetDetail', { 
                          symbol: holding.symbol, 
                          name: holding.name,
                          type: holding.type 
                        })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemLeft}>
                          <Text style={styles.itemSymbol}>{holding.symbol}</Text>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {holding.quantity} {holding.quantity === 1 ? 'coin' : 'coins'}
                          </Text>
                        </View>

                        <View style={styles.itemRight}>
                          <Text style={styles.itemPrice}>
                            ${holding.currentValue.toLocaleString('en-US', {
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
                            {isUp ? '+' : ''}${Math.abs(holding.profitLoss).toFixed(2)} (
                            {isUp ? '+' : ''}{holding.profitLossPercent}%)
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Section Title for All Cryptos */}
              <View style={styles.listHeaderSection}>
                <Text style={styles.sectionTitle}>All Cryptocurrencies</Text>
              </View>
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
}

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
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#666',
  },
  holdingsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  holdingItem: {
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
  cryptoLeft: {
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
    gap: 16,
  },
  sparklineWrapper: {
    width: 60,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceInfo: {
    alignItems: 'flex-end',
    width: 80,
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
  positive: {
    color: '#00C805',
  },
  negative: {
    color: '#FF5000',
  },
});