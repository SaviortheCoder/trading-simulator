// ============================================
// ASSET DETAIL SCREEN - View and trade individual assets
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
  TextInput,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { getStockPrice, getCryptoPrice, addToWatchlist } from '../services/api';

export default function AssetDetailScreen({ route, navigation }: any) {
  const { symbol, name, type } = route.params;
  const { user } = useAuthStore();
  
  const [assetData, setAssetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState('1');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');

  useEffect(() => {
    loadAssetData();
  }, []);

  const loadAssetData = async () => {
    setLoading(true);
    try {
      console.log(`Loading ${type} asset: ${symbol}`);
      
      let response;
      if (type === 'crypto') {
        response = await getCryptoPrice(symbol);
      } else {
        response = await getStockPrice(symbol);
      }

      console.log('Asset data response:', response);

      if (response.success && response.data) {
        setAssetData(response.data);
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

  const handleAddToWatchlist = async () => {
    try {
      await addToWatchlist(symbol, name || symbol, type || 'stock');
      Alert.alert('Success', `${symbol} added to watchlist`);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      Alert.alert('Error', 'Failed to add to watchlist');
    }
  };

  const handleBuy = () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!assetData || !assetData.price) {
      Alert.alert('Error', 'Price data not available');
      return;
    }

    const totalCost = assetData.price * qty;
    if (totalCost > (user?.cashBalance || 0)) {
      Alert.alert('Insufficient Funds', `You need $${totalCost.toFixed(2)} but only have $${user?.cashBalance.toFixed(2)}`);
      return;
    }

    Alert.alert(
      'Confirm Purchase',
      `Buy ${qty} ${qty === 1 ? 'share' : 'shares'} of ${symbol} for $${totalCost.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => executeTrade('buy', qty),
        },
      ]
    );
  };

  const handleSell = () => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!assetData || !assetData.price) {
      Alert.alert('Error', 'Price data not available');
      return;
    }

    // TODO: Check if user owns this stock
    Alert.alert(
      'Confirm Sale',
      `Sell ${qty} ${qty === 1 ? 'share' : 'shares'} of ${symbol} for $${(assetData.price * qty).toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sell',
          onPress: () => executeTrade('sell', qty),
        },
      ]
    );
  };

  const executeTrade = async (action: 'buy' | 'sell', qty: number) => {
    // TODO: Implement trading API calls
    console.log(`Execute ${action} ${qty} shares of ${symbol} at $${assetData.price}`);
    Alert.alert('Coming Soon', 'Trading functionality will be implemented next!');
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
          <TouchableOpacity style={styles.retryButton} onPress={loadAssetData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPositive = (assetData.changePercent || 0) >= 0;
  const totalCost = (assetData.price || 0) * parseInt(quantity || '0');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSymbol}>{symbol}</Text>
          <Text style={styles.headerName}>{name || symbol}</Text>
        </View>
        <TouchableOpacity onPress={handleAddToWatchlist} style={styles.watchlistButton}>
          <Text style={styles.watchlistButtonText}>+ Watch</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={styles.price}>
            ${(assetData.price || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View style={styles.changeContainer}>
            <Text style={[styles.change, isPositive ? styles.positive : styles.negative]}>
              {isPositive ? '+' : ''}${Math.abs(assetData.change || 0).toFixed(2)}
            </Text>
            <Text style={[styles.changePercent, isPositive ? styles.positive : styles.negative]}>
              ({isPositive ? '+' : ''}{(assetData.changePercent || 0).toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* Chart Placeholder */}
        <View style={[styles.chartPlaceholder, isPositive ? styles.chartPositive : styles.chartNegative]}>
          <Text style={styles.chartText}>Price Chart Coming Soon</Text>
        </View>

        {/* Trade Section */}
        <View style={styles.tradeSection}>
          <Text style={styles.sectionTitle}>Trade</Text>

          {/* Buy/Sell Toggle */}
          <View style={styles.tradeToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, tradeType === 'buy' && styles.toggleButtonActive]}
              onPress={() => setTradeType('buy')}
            >
              <Text style={[styles.toggleButtonText, tradeType === 'buy' && styles.toggleButtonTextActive]}>
                Buy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, tradeType === 'sell' && styles.toggleButtonActive]}
              onPress={() => setTradeType('sell')}
            >
              <Text style={[styles.toggleButtonText, tradeType === 'sell' && styles.toggleButtonTextActive]}>
                Sell
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quantity Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Shares</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#666"
            />
          </View>

          {/* Total Cost */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>
              {tradeType === 'buy' ? 'Total Cost' : 'Total Value'}
            </Text>
            <Text style={styles.totalValue}>
              ${(totalCost || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>

          {/* Buying Power */}
          <View style={styles.buyingPowerContainer}>
            <Text style={styles.buyingPowerLabel}>Buying Power</Text>
            <Text style={styles.buyingPowerValue}>
              ${(user?.cashBalance || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>

          {/* Trade Button */}
          <TouchableOpacity
            style={[styles.tradeButton, tradeType === 'buy' ? styles.buyButton : styles.sellButton]}
            onPress={tradeType === 'buy' ? handleBuy : handleSell}
          >
            <Text style={styles.tradeButtonText}>
              {tradeType === 'buy' ? 'Review Buy Order' : 'Review Sell Order'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacer */}
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
  headerSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerName: {
    fontSize: 12,
    color: '#999',
  },
  watchlistButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#00C805',
    borderRadius: 16,
    width: 70,
    alignItems: 'center',
  },
  watchlistButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00C805',
  },
  content: {
    flex: 1,
  },
  priceSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  change: {
    fontSize: 18,
    fontWeight: '600',
  },
  changePercent: {
    fontSize: 18,
  },
  positive: {
    color: '#00C805',
  },
  negative: {
    color: '#FF5000',
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
  tradeSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  tradeToggle: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#00C805',
    borderColor: '#00C805',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  toggleButtonTextActive: {
    color: '#000',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: '#999',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  buyingPowerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  buyingPowerLabel: {
    fontSize: 14,
    color: '#999',
  },
  buyingPowerValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  tradeButton: {
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
    height: 100,
  },
});