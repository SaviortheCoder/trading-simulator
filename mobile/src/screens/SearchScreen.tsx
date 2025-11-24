// ============================================
// SEARCH SCREEN - Search stocks/crypto
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { searchSymbols } from '../services/api';

interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
  region?: string;
}

export default function SearchScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Search for symbols as user types
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);

    try {
      const response = await searchSymbols(query);
      
      if (response.success && response.results) {
        setSearchResults(response.results);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetPress = (asset: SearchResult) => {
    console.log('Navigating to:', asset.symbol, asset.name);
    navigation.navigate('AssetDetail', { 
      symbol: asset.symbol, 
      name: asset.name,
      type: 'stock'  // Force type to stock for search results
    });
  };

  // Render individual search result
  const renderResultItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleAssetPress(item)}
    >
      <View style={styles.resultLeft}>
        <Text style={styles.resultSymbol}>{item.symbol}</Text>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      <View style={styles.resultRight}>
        {item.type && (
          <Text style={styles.resultType}>{item.type}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search stocks & crypto..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus={false}
          />
          {loading && (
            <ActivityIndicator
              size="small"
              color="#00C805"
              style={styles.searchLoader}
            />
          )}
        </View>
        <Text style={styles.searchHint}>
          Try searching for "AAPL", "Tesla", or "Bitcoin"
        </Text>
      </View>

      {/* Search Results */}
      {searchQuery.length >= 2 ? (
        <FlatList
          data={searchResults}
          renderItem={renderResultItem}
          keyExtractor={(item, index) => `${item.symbol}-${index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>
                  Try a different search term
                </Text>
              </View>
            ) : null
          }
        />
      ) : (
        // Empty state - show instructions
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
          </View>
          <Text style={styles.emptyStateTitle}>Search for Assets</Text>
          <Text style={styles.emptyStateText}>
            Search for stocks and cryptocurrencies{'\n'}to view prices and trade
          </Text>
          <View style={styles.examplesContainer}>
            <Text style={styles.examplesTitle}>Popular searches:</Text>
            <View style={styles.exampleChips}>
              {['AAPL', 'TSLA', 'NVDA', 'BTC', 'ETH'].map((symbol) => (
                <TouchableOpacity
                  key={symbol}
                  style={styles.exampleChip}
                  onPress={() => handleSearch(symbol)}
                >
                  <Text style={styles.exampleChipText}>{symbol}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchInputContainer: {
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  searchLoader: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  searchHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginLeft: 4,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  resultLeft: {
    flex: 1,
  },
  resultSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  resultName: {
    fontSize: 14,
    color: '#999',
  },
  resultRight: {
    alignItems: 'flex-end',
  },
  resultType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  examplesContainer: {
    width: '100%',
  },
  examplesTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  exampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  exampleChip: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exampleChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00C805',
  },
});