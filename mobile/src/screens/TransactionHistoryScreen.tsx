// ============================================
// TRANSACTION HISTORY SCREEN - CRASH-PROOF
// Handles null P&L values, shows N/A
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { getTransactions } from '../services/api';

interface Transaction {
  _id: string;
  symbol: string;
  name: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  totalAmount: number;
  realizedPL?: number | null;
  realizedPLPercent?: number | null;
  createdAt: string;
}

export default function TransactionHistoryScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 10;
  const ITEMS_TO_LOAD = 5;

  // ✅ Safe P&L getter
  const getSafePL = (value: number | null | undefined): number | null => {
    return (typeof value === 'number' && !isNaN(value)) ? value : null;
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    loadMoreTransactions();
  }, [page]);

  const loadTransactions = async () => {
    try {
      const response = await getTransactions();
      
      if (response.success && response.transactions) {
        setAllTransactions(response.transactions);
        setDisplayedTransactions(response.transactions.slice(0, ITEMS_PER_PAGE));
        setHasMore(response.transactions.length > ITEMS_PER_PAGE);
        console.log(`📊 Loaded ${response.transactions.length} total transactions`);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTransactions = () => {
    if (page > 1) {
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_TO_LOAD;
      const moreItems = allTransactions.slice(startIndex, endIndex);
      
      setDisplayedTransactions([...displayedTransactions, ...moreItems]);
      setHasMore(endIndex < allTransactions.length);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage(page + 1);
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isSell = item.action === 'sell';
    const pl = getSafePL(item.realizedPL);
    const plPercent = getSafePL(item.realizedPLPercent);
    const hasPLData = pl !== null;
    const isProfit = hasPLData && pl >= 0;
    
    const date = new Date(item.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <Text style={styles.transactionSymbol}>
            {item.symbol} {item.action === 'buy' ? 'market buy' : 'market sell'}
          </Text>
          <Text style={styles.transactionDetails}>
            {item.quantity} share{item.quantity !== 1 ? 's' : ''} @ ${item.price.toFixed(2)}
          </Text>
          <Text style={styles.transactionDate}>
            {formattedDate} • {formattedTime}
          </Text>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[
            styles.transactionAmount,
            item.action === 'buy' ? styles.negative : styles.positive
          ]}>
            {item.action === 'buy' ? '-' : '+'}${item.totalAmount.toFixed(2)}
          </Text>
          {/* ✅ Show P&L only for sells, handle null */}
          {isSell && (
            <View style={styles.plContainer}>
              {hasPLData ? (
                <>
                  <Text style={[
                    styles.plAmount,
                    isProfit ? styles.positive : styles.negative
                  ]}>
                    {isProfit ? '+' : ''}${Math.abs(pl).toFixed(2)}
                  </Text>
                  {plPercent !== null && (
                    <Text style={[
                      styles.plPercent,
                      isProfit ? styles.positive : styles.negative
                    ]}>
                      {isProfit ? '+' : ''}{plPercent.toFixed(2)}%
                    </Text>
                  )}
                </>
              ) : (
                <Text style={styles.naText}>N/A</Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00C805" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Transaction List */}
      <FlatList
        data={displayedTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Start trading to see your history</Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          ) : displayedTransactions.length > 0 ? (
            <Text style={styles.endText}>That's all your transactions!</Text>
          ) : null
        }
      />

      {/* Summary Footer */}
      {displayedTransactions.length > 0 && (
        <View style={styles.summaryFooter}>
          <Text style={styles.summaryText}>
            {allTransactions.length} total transaction{allTransactions.length !== 1 ? 's' : ''}
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 28,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    paddingBottom: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  transactionLeft: {
    flex: 1,
  },
  transactionSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  transactionDetails: {
    fontSize: 14,
    color: '#999',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 13,
    color: '#666',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  plContainer: {
    alignItems: 'flex-end',
  },
  plAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  plPercent: {
    fontSize: 13,
  },
  naText: {
    fontSize: 14,
    color: '#666',
  },
  positive: {
    color: '#00C805',
  },
  negative: {
    color: '#FF5000',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  loadMoreButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  loadMoreText: {
    fontSize: 16,
    color: '#00C805',
    fontWeight: '600',
  },
  endText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  summaryFooter: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 13,
    color: '#666',
  },
});