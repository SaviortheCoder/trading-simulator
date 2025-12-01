// ============================================
// ASSET DETAIL SCREEN - WITH BUY/SELL BUTTONS
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { 
  getStockPrice, 
  getCryptoPrice, 
  addToWatchlist, 
  getStockHistory,
  getCryptoHistory,
  getHolding,
  getSymbolTransactions
} from '../services/api';
import PortfolioChart from '../components/PortfolioChart';
import { Timeframe } from '../components/TimeframeSelector';

interface Transaction {
  _id: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalAmount: number;
  timestamp: string;
}

export default function AssetDetailScreen({ route, navigation }: any) {
  const { symbol, name, type } = route.params;
  const { user } = useAuthStore();
  
  const [assetData, setAssetData] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<Array<{ timestamp: number; price: number }>>([]);
  const [holding, setHolding] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssetData();
    loadHoldingData();
    loadTransactionHistory();
  }, []);

  const loadAssetData = async (days: number = 30) => {
    setLoading(true);
    try {
      console.log(`Loading ${type} asset: ${symbol}`);
      
      let response;
      if (type === 'crypto') {
        response = await getCryptoPrice(symbol);
      } else {
        response = await getStockPrice(symbol);
      }

      if (response.success && response.data) {
        setAssetData(response.data);
        await loadPriceHistory(days);
      } else {
        Alert.alert('Error', 'No price data available');
      }
    } catch (error) {
      console.error('Error loading asset:', error);
      Alert.alert('Error', 'Failed to load asset data');
    } finally {
      setLoading(false);
    }
  };

  const loadHoldingData = async () => {
    try {
      const response = await getHolding(symbol);
      if (response.success && response.holding) {
        setHolding(response.holding);
      }
    } catch (error) {
      console.error('Error loading holding:', error);
    }
  };

  const loadTransactionHistory = async () => {
    try {
      const response = await getSymbolTransactions(symbol);
      if (response.success && response.transactions) {
        setTransactions(response.transactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const loadPriceHistory = async (days: number) => {
    try {
      console.log(`Loading ${days} days of price history for ${symbol}`);
      
      let historyResponse;
      if (type === 'crypto') {
        historyResponse = await getCryptoHistory(symbol, days);
      } else {
        historyResponse = await getStockHistory(symbol, days);
      }

      if (historyResponse.success && historyResponse.history) {
        setPriceHistory(historyResponse.history);
      }
    } catch (error) {
      console.error('Error loading price history:', error);
    }
  };

  const handleTimeframeChange = (timeframe: Timeframe, days: number) => {
    console.log(`Loading ${days} days of data for ${timeframe}`);
    loadPriceHistory(days);
  };

  const handleAddToWatchlist = async () => {
    try {
      await addToWatchlist(symbol, name || symbol, type || 'stock');
      Alert.alert('Success', `${symbol} added to watchlist`);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      Alert.alert('Error', 'Failed to add to watchlist');
    }
  };

 // ✅ Handle Buy button - Go to simplified dollar entry screen
const handleBuy = () => {
    navigation.navigate('SimplifiedTrade', {
      symbol,
      name: name || symbol,
      type,
      currentPrice: assetData.price,
      action: 'buy',
      holding: holding || null
    });
  };
  
  // ✅ Handle Sell button - Go to simplified dollar entry screen
  const handleSell = () => {
    if (!holding || holding.quantity <= 0) {
      Alert.alert('Cannot Sell', `You don't own any ${symbol}`);
      return;
    }
    
    navigation.navigate('SimplifiedTrade', {
      symbol,
      name: name || symbol,
      type,
      currentPrice: assetData.price,
      action: 'sell',
      holding
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00C805" />
          <Text style={styles.loadingText}>Loading {symbol}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!assetData || !assetData.price) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerSymbol}>{symbol}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Price data not available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadAssetData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPositive = (assetData.changePercent || 0) >= 0;
  const totalPortfolioValue = (user?.cashBalance || 100000);
  const portfolioDiversity = holding ? ((holding.currentValue / totalPortfolioValue) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Price */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerPrice}>
            ${(assetData.price || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text style={styles.headerName}>{symbol}</Text>
        </View>
        <TouchableOpacity onPress={handleAddToWatchlist} style={styles.watchlistButton}>
          <Text style={styles.watchlistButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* News Headline */}
        <View style={styles.newsSection}>
          <Text style={styles.newsText}>
            {type === 'crypto' 
              ? `${name} continues to show strong market performance`
              : `${name} reports steady growth in recent quarters`
            }
          </Text>
          <Text style={[styles.newsChange, isPositive ? styles.positive : styles.negative]}>
            {symbol} {isPositive ? '+' : ''}{(assetData.changePercent || 0).toFixed(2)}%
          </Text>
          <Text style={styles.showMore}>Show more</Text>
        </View>

        {/* Price Chart */}
        <View style={styles.chartSpacing}>
          <PortfolioChart 
            data={priceHistory} 
            isPositive={isPositive}
            onTimeframeChange={handleTimeframeChange}
          />
        </View>

        {/* Your Position Section */}
        {holding && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your position</Text>
            
            <View style={styles.positionGrid}>
              <View style={styles.positionRow}>
                <View style={styles.positionItem}>
                  <Text style={styles.positionLabel}>Quantity</Text>
                  <Text style={styles.positionValue}>{holding.quantity}</Text>
                </View>
                <View style={styles.positionItem}>
                  <Text style={styles.positionLabel}>Value</Text>
                  <Text style={styles.positionValue}>
                    ${holding.currentValue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.positionRow}>
                <View style={styles.positionItem}>
                  <Text style={styles.positionLabel}>Avg cost</Text>
                  <Text style={styles.positionValue}>${holding.avgBuyPrice.toFixed(2)}</Text>
                </View>
                <View style={styles.positionItem}>
                  <Text style={styles.positionLabel}>Portfolio diversity</Text>
                  <Text style={styles.positionValue}>{portfolioDiversity.toFixed(2)}%</Text>
                </View>
              </View>

              <View style={styles.positionRowFull}>
                <View style={styles.positionItem}>
                  <Text style={styles.positionLabel}>Today's return</Text>
                  <Text style={[styles.positionValue, isPositive ? styles.positive : styles.negative]}>
                    {isPositive ? '+' : ''}${Math.abs(assetData.change * holding.quantity).toFixed(2)} ({isPositive ? '+' : ''}{assetData.changePercent.toFixed(2)}%)
                  </Text>
                </View>
              </View>

              <View style={styles.positionRowFull}>
                <View style={styles.positionItem}>
                  <Text style={styles.positionLabel}>Total return</Text>
                  <Text style={[
                    styles.positionValue,
                    parseFloat(holding.profitLossPercent) >= 0 ? styles.positive : styles.negative
                  ]}>
                    {parseFloat(holding.profitLossPercent) >= 0 ? '+' : ''}${holding.profitLoss.toFixed(2)} ({holding.profitLossPercent}%)
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>
            {type === 'crypto' 
              ? `${name} (${symbol}) is a cryptocurrency that can be traded 24/7 on our platform. ${symbol} was launched in ${symbol === 'BTC' ? '2009' : symbol === 'ETH' ? '2015' : '2017'} and is ${symbol === 'BTC' ? 'the first and most widely recognized cryptocurrency' : 'a popular digital asset'}.`
              : `${name} (${symbol}) is a publicly traded company. Shares can be bought and sold during market hours.`
            }
          </Text>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          
          <View style={styles.detailedStatsGrid}>
            <View style={styles.detailedStatRow}>
              <Text style={styles.detailedStatLabel}>Open</Text>
              <Text style={styles.detailedStatValue}>
                ${(assetData.price * 0.995).toFixed(2)}
              </Text>
            </View>

            <View style={styles.detailedStatRow}>
              <Text style={styles.detailedStatLabel}>High</Text>
              <Text style={styles.detailedStatValue}>
                ${(assetData.price * 1.015).toFixed(2)}
              </Text>
            </View>

            <View style={styles.detailedStatRow}>
              <Text style={styles.detailedStatLabel}>Low</Text>
              <Text style={styles.detailedStatValue}>
                ${(assetData.price * 0.985).toFixed(2)}
              </Text>
            </View>

            <View style={styles.detailedStatRow}>
              <Text style={styles.detailedStatLabel}>52 Week High</Text>
              <Text style={styles.detailedStatValue}>
                ${(assetData.price * 1.35).toFixed(2)}
              </Text>
            </View>

            <View style={styles.detailedStatRow}>
              <Text style={styles.detailedStatLabel}>52 Week Low</Text>
              <Text style={styles.detailedStatValue}>
                ${(assetData.price * 0.65).toFixed(2)}
              </Text>
            </View>

            <View style={styles.detailedStatRow}>
              <Text style={styles.detailedStatLabel}>Volume</Text>
              <Text style={styles.detailedStatValue}>
                {((assetData.price * 10000000) / 1000000).toFixed(2)}M
              </Text>
            </View>

            <View style={styles.detailedStatRow}>
              <Text style={styles.detailedStatLabel}>Market Cap</Text>
              <Text style={styles.detailedStatValue}>
                {type === 'crypto' ? '1.78T' : '2.51T'}
              </Text>
            </View>

            {type === 'stock' && (
              <>
                <View style={styles.detailedStatRow}>
                  <Text style={styles.detailedStatLabel}>P/E Ratio</Text>
                  <Text style={styles.detailedStatValue}>45.23</Text>
                </View>

                <View style={styles.detailedStatRow}>
                  <Text style={styles.detailedStatLabel}>Dividend Yield</Text>
                  <Text style={styles.detailedStatValue}>0.00%</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* History Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {transactions.length > 0 ? (
            transactions.map((tx) => (
              <View key={tx._id} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Text style={[
                    styles.historyAction,
                    tx.action === 'buy' ? styles.positive : styles.negative
                  ]}>
                    Market {tx.action}
                  </Text>
                  <Text style={styles.historyDate}>
                    {new Date(tx.timestamp).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[
                    styles.historyAmount,
                    tx.action === 'buy' ? styles.negative : styles.positive
                  ]}>
                    {tx.action === 'buy' ? '-' : '+'}${tx.totalAmount.toFixed(2)}
                  </Text>
                  <Text style={styles.historyDetails}>
                    {tx.quantity} at ${tx.price.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No transactions yet</Text>
          )}
        </View>

        <View style={styles.bottomSpacer} />
        </ScrollView>

{/* ✅ BUY/SELL BUTTONS - ALWAYS VISIBLE */}
<View style={styles.fixedTradeButtons}>
  <TouchableOpacity
    style={[styles.tradeButton, styles.buyButton]}
    onPress={handleBuy}
  >
    <Text style={styles.tradeButtonText}>Buy {symbol}</Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    style={[styles.tradeButton, styles.sellButton]}
    onPress={handleSell}
  >
    <Text style={styles.tradeButtonText}>Sell {symbol}</Text>
  </TouchableOpacity>
</View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  backButtonText: {
    fontSize: 28,
    color: '#00C805',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerName: {
    fontSize: 12,
    color: '#999',
  },
  headerSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  watchlistButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchlistButtonText: {
    fontSize: 24,
    color: '#00C805',
  },
  content: {
    flex: 1,
  },
  newsSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  newsText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 4,
  },
  newsChange: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  showMore: {
    fontSize: 14,
    color: '#00C805',
    fontWeight: '600',
  },
  chartSpacing: {
    marginTop: 32,
    marginBottom: 32,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  positionGrid: {
    gap: 12,
  },
  positionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  positionRowFull: {
    width: '100%',
  },
  positionItem: {
    flex: 1,
  },
  positionLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  positionValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  aboutText: {
    fontSize: 16,
    color: '#999',
    lineHeight: 24,
  },
  detailedStatsGrid: {
    gap: 0,
  },
  detailedStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  detailedStatLabel: {
    fontSize: 16,
    color: '#999',
  },
  detailedStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  historyLeft: {
    flex: 1,
  },
  historyAction: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#fff',
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDetails: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  positive: {
    color: '#00C805',
  },
  negative: {
    color: '#FF5000',
  },
  // ✅ BUY/SELL BUTTON STYLES
  fixedTradeButtons: {
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 100,  // Extra space for tab bar
    flexDirection: 'row',
    gap: 12,
  },
  tradeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: '#00C805',
  },
  sellButton: {
    backgroundColor: '#FF5000',
  },
  tradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#00C805',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacer: {
    height: 120,
  },
});
