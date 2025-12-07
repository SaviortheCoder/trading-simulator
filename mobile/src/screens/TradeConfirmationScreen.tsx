// ============================================
// TRADE CONFIRMATION SCREEN - FIXED CASH BALANCE
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { getHoldings } from '../services/api';

export default function TradeConfirmationScreen({ route, navigation }: any) {
  const { symbol, name, type, currentPrice, action, holding } = route.params;
  const { user } = useAuthStore();

  const [dollarAmount, setDollarAmount] = useState('0');
  const [actualCashBalance, setActualCashBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // ✅ FETCH ACTUAL CASH BALANCE ON MOUNT
  useEffect(() => {
    fetchActualCash();
  }, []);

  const fetchActualCash = async () => {
    try {
      // Get all holdings to calculate total holdings value
      const response = await getHoldings();
      if (response.success && response.holdings) {
        const holdingsValue = response.holdings.reduce(
          (sum: number, h: any) => sum + (h.currentValue || 0),
          0
        );
        
        // Total portfolio = holdings + cash
        const totalPortfolio = (user?.cashBalance || 0) + holdingsValue;
        
        // Cash balance = total - holdings
        const currentCash = totalPortfolio - holdingsValue;
        
        setActualCashBalance(currentCash);
        console.log(`💰 Actual cash balance: $${currentCash.toFixed(2)}`);
        console.log(`   Holdings value: $${holdingsValue.toFixed(2)}`);
        console.log(`   Total portfolio: $${totalPortfolio.toFixed(2)}`);
      } else {
        // Fallback to user cash balance
        setActualCashBalance(user?.cashBalance || 0);
      }
    } catch (error) {
      console.error('Error fetching cash balance:', error);
      // Fallback to user cash balance
      setActualCashBalance(user?.cashBalance || 0);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Use actual cash balance, not hardcoded value
  const availableBalance = action === 'buy' 
    ? actualCashBalance 
    : (holding?.quantity || 0) * currentPrice;

  // Handle number pad input
  const handleNumberPress = (num: string) => {
    if (dollarAmount === '0') {
      setDollarAmount(num);
    } else {
      // Prevent multiple decimal points
      if (num === '.' && dollarAmount.includes('.')) return;
      setDollarAmount(dollarAmount + num);
    }
  };

  // Handle backspace
  const handleBackspace = () => {
    if (dollarAmount.length === 1) {
      setDollarAmount('0');
    } else {
      setDollarAmount(dollarAmount.slice(0, -1));
    }
  };

  // Handle review button
  const handleReview = () => {
    const amount = parseFloat(dollarAmount);
    if (amount <= 0) return;

    // Calculate shares
    let shares = amount / currentPrice;

    // VALIDATION: Check if trying to sell more than owned
    if (action === 'sell') {
      const ownedShares = holding?.quantity || 0;
      
      // Smart rounding: If within 0.1% of owned shares, sell exactly owned amount
      const percentDifference = Math.abs(shares - ownedShares) / ownedShares;
      if (percentDifference <= 0.001) {
        console.log(`📊 Smart rounding: ${shares.toFixed(6)} → ${ownedShares.toFixed(6)} (selling all)`);
        shares = ownedShares;
      }
      
      // Now check if still trying to sell more than owned
      if (shares > ownedShares) {
        Alert.alert(
          'Invalid Amount',
          `You only own ${ownedShares.toFixed(6)} ${symbol}. Maximum sell value: $${(ownedShares * currentPrice).toFixed(2)}`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // VALIDATION: Check if trying to buy more than available balance
    if (action === 'buy' && amount > availableBalance) {
      Alert.alert(
        'Insufficient Funds',
        `You only have $${availableBalance.toFixed(2)} available. You tried to spend $${amount.toFixed(2)}.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to confirmation
    navigation.navigate('OrderConfirmation', {
      symbol,
      name,
      type,
      currentPrice,
      action,
      dollarAmount: amount,
      shares,
      holding,
    });
  };

  // Handle Max button
  const handleMax = () => {
    if (action === 'sell' && holding) {
      const maxValue = (holding.quantity * currentPrice).toFixed(2);
      setDollarAmount(maxValue);
    } else if (action === 'buy') {
      setDollarAmount(availableBalance.toFixed(2));
    }
  };

  const isReviewDisabled = parseFloat(dollarAmount) <= 0 || loading;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.orderType}>Market order</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content - Dollar Amount Centered */}
      <View style={styles.content}>
        <View style={styles.amountContainer}>
          <Text style={styles.dollarAmount}>${dollarAmount}</Text>
          <Text style={styles.oneTime}>One time</Text>
        </View>
      </View>

      {/* Bottom Section - Available + Review + Keypad */}
      <View style={styles.bottomSection}>
        {/* Available Balance with Max Button */}
        <View style={styles.availableRow}>
          <Text style={styles.availableText}>
            {loading ? 'Loading...' : (
              action === 'buy' 
                ? `$${availableBalance.toFixed(2)} available`
                : `${(holding?.quantity || 0).toFixed(6)} ${symbol} ($${availableBalance.toFixed(2)}) available`
            )}
          </Text>
          <TouchableOpacity 
            style={styles.maxButton} 
            onPress={handleMax}
            disabled={loading}
          >
            <Text style={styles.maxButtonText}>Max</Text>
          </TouchableOpacity>
        </View>

        {/* Review Button */}
        <TouchableOpacity
          style={[styles.reviewButton, isReviewDisabled && styles.reviewButtonDisabled]}
          onPress={handleReview}
          disabled={isReviewDisabled}
        >
          <Text style={styles.reviewButtonText}>
            {loading ? 'Loading...' : 'Review'}
          </Text>
        </TouchableOpacity>

        {/* Number Pad */}
        <View style={styles.numberPad}>
          {/* Row 1 */}
          <View style={styles.numberRow}>
            <TouchableOpacity style={styles.numberKey} onPress={() => handleNumberPress('1')}>
              <Text style={styles.numberText}>1</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numberKey} onPress={() => handleNumberPress('2')}>
              <Text style={styles.numberText}>2</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numberKey} onPress={() => handleNumberPress('3')}>
              <Text style={styles.numberText}>3</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={styles.numberRow}>
            <TouchableOpacity style={styles.numberKey} onPress={() => handleNumberPress('4')}>
              <Text style={styles.numberText}>4</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numberKey} onPress={() => handleNumberPress('5')}>
              <Text style={styles.numberText}>5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numberKey} onPress={() => handleNumberPress('6')}>
              <Text style={styles.numberText}>6</Text>
            </TouchableOpacity>
          </View>

          {/* Row 3 */}
          <View style={styles.numberRow}>
            <TouchableOpacity style={styles.numberKey} onPress={() => handleNumberPress('7')}>
              <Text style={styles.numberText}>7</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numberKey} onPress={() => handleNumberPress('8')}>
              <Text style={styles.numberText}>8</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numberKey} onPress={() => handleNumberPress('9')}>
              <Text style={styles.numberText}>9</Text>
            </TouchableOpacity>
          </View>

          {/* Row 4 */}
          <View style={styles.numberRow}>
            <TouchableOpacity style={styles.numberKey} onPress={() => handleNumberPress('.')}>
              <Text style={styles.numberText}>.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numberKey} onPress={() => handleNumberPress('0')}>
              <Text style={styles.numberText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.numberKey} onPress={handleBackspace}>
              <Text style={styles.numberText}>←</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 28,
    color: '#00C805',
    fontWeight: '300',
  },
  orderType: {
    fontSize: 16,
    color: '#00C805',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  amountContainer: {
    alignItems: 'center',
  },
  dollarAmount: {
    fontSize: 64,
    fontWeight: '300',
    color: '#000',
    marginBottom: 8,
  },
  oneTime: {
    fontSize: 16,
    color: '#666',
    fontWeight: '400',
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 12,
  },
  availableText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  maxButton: {
    backgroundColor: '#00C805',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  maxButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewButton: {
    backgroundColor: '#00C805',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewButtonDisabled: {
    backgroundColor: '#ccc',
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  numberPad: {
    width: '100%',
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  numberKey: {
    flex: 1,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  numberText: {
    fontSize: 32,
    color: '#00C805',
    fontWeight: '400',
  },
});