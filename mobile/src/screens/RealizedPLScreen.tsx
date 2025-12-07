// ============================================
// REALIZED P&L SCREEN - ROBINHOOD STYLE
// Shows "N/A" for null values, red bars for losses
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
  FlatList,
} from 'react-native';
import { getTransactions } from '../services/api';

type Timeframe = '1W' | '1M' | '3M' | 'YTD' | 'MAX';

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

export default function RealizedPLScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [displayedTransactions, setDisplayedTransactions] = useState<Transaction[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [totalPL, setTotalPL] = useState<number | null>(null);
  const [totalPLPercent, setTotalPLPercent] = useState<number | null>(null);
  const [numTrades, setNumTrades] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const ITEMS_PER_PAGE = 10;
  const ITEMS_TO_LOAD = 5;

  // ✅ Check if value is valid number
  const isValidPL = (value: number | null | undefined): boolean => {
    return typeof value === 'number' && !isNaN(value);
  };

  // ✅ Safe getter with null for invalid
  const getSafePL = (value: number | null | undefined): number | null => {
    return isValidPL(value) ? value! : null;
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterByTimeframe();
  }, [timeframe, transactions]);

  useEffect(() => {
    loadMoreTransactions();
  }, [page]);

  const loadTransactions = async () => {
    try {
      const response = await getTransactions();
      
      if (response.success && response.transactions) {
        // Filter only sell transactions (realized P&L)
        const sells = response.transactions.filter((tx: any) => tx.action === 'sell');
        setTransactions(sells);
        console.log(`📊 Loaded ${sells.length} sell transactions`);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByTimeframe = () => {
    const now = new Date();
    let filtered = [...transactions];

    switch (timeframe) {
      case '1W':
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = transactions.filter(tx => new Date(tx.createdAt) >= oneWeekAgo);
        break;
      case '1M':
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filtered = transactions.filter(tx => new Date(tx.createdAt) >= oneMonthAgo);
        break;
      case '3M':
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        filtered = transactions.filter(tx => new Date(tx.createdAt) >= threeMonthsAgo);
        break;
      case 'YTD':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        filtered = transactions.filter(tx => new Date(tx.createdAt) >= yearStart);
        break;
      case 'MAX':
      default:
        // All transactions
        break;
    }

    // ✅ Calculate totals - return null if ANY transaction has no P&L
    let hasAllPLData = true;
    let total = 0;
    let totalPercent = 0;
    let validCount = 0;

    filtered.forEach(tx => {
      const pl = getSafePL(tx.realizedPL);
      const plPercent = getSafePL(tx.realizedPLPercent);
      
      if (pl === null) {
        hasAllPLData = false;
      } else {
        total += pl;
        if (plPercent !== null) {
          totalPercent += plPercent;
          validCount++;
        }
      }
    });

    setTotalPL(hasAllPLData && filtered.length > 0 ? total : null);
    setTotalPLPercent(hasAllPLData && validCount > 0 ? totalPercent / validCount : null);
    setNumTrades(filtered.length);

    // Reset pagination
    setPage(1);
    setDisplayedTransactions(filtered.slice(0, ITEMS_PER_PAGE));
    setHasMore(filtered.length > ITEMS_PER_PAGE);

    console.log(`📊 Filtered to ${filtered.length} transactions for ${timeframe}`);
    if (hasAllPLData) {
      console.log(`💰 Total P&L: $${total.toFixed(2)}`);
    } else {
      console.log(`⚠️ Some transactions missing P&L data`);
    }
  };

  const loadMoreTransactions = () => {
    const startIndex = page * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_TO_LOAD;
    const filtered = transactions.filter(tx => {
      // Apply timeframe filter
      const now = new Date();
      const txDate = new Date(tx.createdAt);
      
      switch (timeframe) {
        case '1W':
          return txDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '1M':
          return txDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        case '3M':
          return txDate >= new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        case 'YTD':
          return txDate >= new Date(now.getFullYear(), 0, 1);
        case 'MAX':
        default:
          return true;
      }
    });

    if (page > 1) {
      const moreItems = filtered.slice(startIndex, endIndex);
      setDisplayedTransactions([...displayedTransactions, ...moreItems]);
      setHasMore(endIndex < filtered.length);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage(page + 1);
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
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

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <Text style={styles.transactionSymbol}>{item.symbol} market sell</Text>
          <Text style={styles.transactionDate}>{formattedDate}</Text>
        </View>
        <View style={styles.transactionRight}>
          {hasPLData ? (
            <>
              <Text style={[
                styles.transactionPL,
                isProfit ? styles.positive : styles.negative
              ]}>
                {isProfit ? '+' : ''}${Math.abs(pl).toFixed(2)}
              </Text>
              {plPercent !== null && (
                <Text style={[
                  styles.transactionPercent,
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
        <Text style={styles.headerTitle}>Realized profit & loss</Text>
        <TouchableOpacity style={styles.infoButton}>
          <Text style={styles.infoText}>ⓘ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filter dropdown */}
        <View style={styles.filterRow}>
          <Text style={styles.filterText}>All ▼</Text>
        </View>

        {/* Timeframe Selector */}
        <View style={styles.timeframeSelector}>
          {(['1W', '1M', '3M', 'YTD', 'MAX'] as Timeframe[]).map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[
                styles.timeframeButton,
                timeframe === tf && styles.timeframeButtonActive
              ]}
              onPress={() => setTimeframe(tf)}
            >
              <Text style={[
                styles.timeframeText,
                timeframe === tf && styles.timeframeTextActive
              ]}>
                {tf}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.filterIconButton}>
            <Text style={styles.filterIcon}>≡</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ N/A or Real Data */}
        {totalPL === null ? (
          // Show N/A when no valid P&L data
          <View style={styles.naSection}>
            <Text style={styles.naValue}>N/A</Text>
            <Text style={styles.naLabel}>Past month</Text>
          </View>
        ) : (
          // Show real summary stats
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total profit & loss</Text>
              <Text style={[
                styles.summaryValue,
                totalPL >= 0 ? styles.positive : styles.negative
              ]}>
                {totalPL >= 0 ? '+' : ''}${Math.abs(totalPL).toFixed(2)} ({totalPLPercent?.toFixed(2) || '0.00'}%)
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Number of trades</Text>
              <Text style={styles.summaryValue}>{numTrades}</Text>
            </View>
          </View>
        )}

        {/* Chart or Empty State */}
        {displayedTransactions.length > 0 ? (
          <>
            {/* Date Range */}
            <Text style={styles.dateRange}>
              {new Date(displayedTransactions[displayedTransactions.length - 1].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(displayedTransactions[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>

            {/* Bar Chart */}
            <View style={styles.chartContainer}>
              {displayedTransactions.map((tx) => {
                const pl = getSafePL(tx.realizedPL);
                const validTransactions = displayedTransactions.filter(t => getSafePL(t.realizedPL) !== null);
                const maxPL = Math.max(...validTransactions.map(t => Math.abs(getSafePL(t.realizedPL)!)), 1);
                
                if (pl === null) {
                  // Small gray bar for N/A
                  return (
                    <View key={tx._id} style={styles.barContainer}>
                      <View style={[styles.bar, styles.barNA]} />
                    </View>
                  );
                }
                
                const height = Math.abs(pl) / maxPL * 200;
                const isProfit = pl >= 0;
                
                return (
                  <View key={tx._id} style={styles.barContainer}>
                    <View style={[
                      styles.bar,
                      {
                        height: Math.max(height, 10),
                        backgroundColor: isProfit ? '#00C805' : '#FF5000', // ✅ Red for losses
                      }
                    ]} />
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No closed trades last month</Text>
            <Text style={styles.emptySubtext}>Your closed trades will appear here</Text>
          </View>
        )}

        {/* Transaction List */}
        <FlatList
          data={displayedTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            ) : displayedTransactions.length > 0 ? (
              <Text style={styles.endText}>That's all your trades!</Text>
            ) : null
          }
        />
      </ScrollView>
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
  infoButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  infoText: {
    fontSize: 20,
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterText: {
    fontSize: 14,
    color: '#fff',
  },
  timeframeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  timeframeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
  },
  timeframeButtonActive: {
    backgroundColor: '#4a4a4a',
  },
  timeframeText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  timeframeTextActive: {
    color: '#fff',
  },
  filterIconButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
  },
  filterIcon: {
    fontSize: 16,
    color: '#999',
  },
  // ✅ N/A Section (like Robinhood)
  naSection: {
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  naValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  naLabel: {
    fontSize: 16,
    color: '#999',
  },
  summarySection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#999',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dateRange: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 250,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barNA: {
    height: 10,
    backgroundColor: '#333',
  },
  emptyContainer: {
    paddingVertical: 80,
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
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionPL: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionPercent: {
    fontSize: 14,
  },
  naText: {
    fontSize: 16,
    color: '#666',
  },
  positive: {
    color: '#00C805',
  },
  negative: {
    color: '#FF5000',
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
});