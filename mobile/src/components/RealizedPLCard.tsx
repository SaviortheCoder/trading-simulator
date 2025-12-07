// ============================================
// REALIZED P&L CARD - CRASH-PROOF VERSION
// Handles null/undefined P&L values gracefully
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { getTransactions } from '../services/api';

interface RealizedPLCardProps {
  onPress: () => void;
}

export default function RealizedPLCard({ onPress }: RealizedPLCardProps) {
  const [loading, setLoading] = useState(true);
  const [pastMonth, setPastMonth] = useState(0);
  const [yearToDate, setYearToDate] = useState(0);

  // ✅ SAFE P&L VALUE GETTER
  const getSafePL = (value: number | null | undefined): number => {
    return (typeof value === 'number' && !isNaN(value)) ? value : 0;
  };

  useEffect(() => {
    loadRealizedPL();
  }, []);

  const loadRealizedPL = async () => {
    try {
      const response = await getTransactions();
      
      if (response.success && response.transactions) {
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const yearStart = new Date(now.getFullYear(), 0, 1);

        let monthPL = 0;
        let yearPL = 0;

        // Calculate realized P&L from sell transactions
        response.transactions.forEach((tx: any) => {
          if (tx.action === 'sell') {
            const txDate = new Date(tx.createdAt || tx.timestamp);
            const profit = getSafePL(tx.realizedPL); // ✅ Safe getter
            
            if (txDate >= oneMonthAgo) {
              monthPL += profit;
            }
            if (txDate >= yearStart) {
              yearPL += profit;
            }
          }
        });

        setPastMonth(monthPL);
        setYearToDate(yearPL);
        
        console.log(`📊 P&L Card: Past month = $${monthPL.toFixed(2)}, YTD = $${yearPL.toFixed(2)}`);
      }
    } catch (error) {
      console.error('Error loading realized P&L:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#00C805" />
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Realized profit & loss</Text>
          <Text style={styles.subtitle}>For options, stocks & ETFs, and crypto</Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Past month</Text>
          <Text style={[
            styles.statValue,
            pastMonth >= 0 ? styles.positive : styles.negative
          ]}>
            {pastMonth >= 0 ? '+' : ''}${Math.abs(pastMonth).toFixed(2)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Year to date</Text>
          <Text style={[
            styles.statValue,
            yearToDate >= 0 ? styles.positive : styles.negative
          ]}>
            {yearToDate >= 0 ? '+' : ''}${Math.abs(yearToDate).toFixed(2)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
  },
  arrow: {
    fontSize: 24,
    color: '#666',
    marginTop: -4,
  },
  stats: {
    gap: 0,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 16,
    color: '#fff',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  positive: {
    color: '#00C805',
  },
  negative: {
    color: '#FF5000',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
  },
});