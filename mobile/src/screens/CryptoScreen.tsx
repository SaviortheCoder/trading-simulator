// ============================================
// CRYPTO SCREEN - Browse cryptocurrencies
// ============================================

import React, { useState, useEffect } from 'react';
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
import { getBulkPrices } from '../services/api';

interface Crypto {
  symbol: string;
  name: string;
  coinId: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

export default function CryptoScreen({ navigation }: any) {
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    loadCryptos();
  }, []);

  const loadCryptos = async () => {
    setLoading(true);
    
    try {
      console.log('Loading cryptos using BULK endpoint...');
      
      // Get all symbols
      const symbols = popularCryptos.map(c => c.symbol);
      
      // Load all prices at once using bulk endpoint
      const response = await getBulkPrices(symbols);
      
      if (response.success) {
        const cryptoData = popularCryptos.map(crypto => ({
          symbol: crypto.symbol,
          name: crypto.name,
          coinId: crypto.coinId,
          price: response.prices[crypto.symbol]?.price,
          change: response.prices[crypto.symbol]?.change,
          changePercent: response.prices[crypto.symbol]?.changePercent,
        }));
        
        setCryptos(cryptoData);
      }
    } catch (error) {
      console.error('Error loading cryptos:', error);
    } finally {
      setLoading(false);
    }
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

        {item.price ? (
          <View style={styles.cryptoRight}>
            <Text style={styles.cryptoPrice}>
              ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={[styles.cryptoChange, isPositive ? styles.positive : styles.negative]}>
              {isPositive ? '+' : ''}{item.changePercent?.toFixed(2)}%
            </Text>
          </View>
        ) : (
          <ActivityIndicator size="small" color="#00C805" />
        )}
      </TouchableOpacity>
    );
  };

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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  cryptoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
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
    alignItems: 'flex-end',
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