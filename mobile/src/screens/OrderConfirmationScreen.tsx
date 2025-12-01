// ============================================
// ORDER CONFIRMATION SCREEN - With Gesture Handler (RELIABLE SWIPE)
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { buyAsset, sellAsset } from '../services/api';

export default function OrderConfirmationScreen({ route, navigation }: any) {
  const { symbol, name, type, currentPrice, action, dollarAmount, shares, holding } = route.params;

  const [submitting, setSubmitting] = useState(false);
  const translateY = new Animated.Value(0);

  const buySpread = currentPrice * 0.0086; // 0.86% spread
  const finalTotal = dollarAmount;
  
  // Check if selling all shares (within 0.01% tolerance for floating point)
  const isSellingAll = action === 'sell' && holding && 
    Math.abs(shares - holding.quantity) / holding.quantity < 0.0001;

  // Handle order submission
  const handleSubmitOrder = async () => {
    if (submitting) return;
    
    console.log(`📝 Submitting ${action} order:`, {
      symbol,
      shares,
      currentPrice,
      dollarAmount,
      name,
      type,
      isSellingAll: isSellingAll || false,
    });
    
    setSubmitting(true);

    try {
      if (action === 'buy') {
        await buyAsset(symbol, shares, currentPrice, name, type);
        Alert.alert(
          'Order Complete',
          `Successfully bought ${shares.toFixed(6)} ${symbol}`,
          [{ 
            text: 'OK', 
            onPress: () => {
              // Navigate back to the root of the stack
              navigation.navigate('Home', { screen: 'Dashboard' });
            }
          }]
        );
      } else {
        await sellAsset(symbol, shares, currentPrice);
        const message = isSellingAll 
          ? `Successfully sold all ${shares.toFixed(6)} ${symbol} (100% of holdings)`
          : `Successfully sold ${shares.toFixed(6)} ${symbol}`;
        Alert.alert(
          'Order Complete',
          message,
          [{ 
            text: 'OK', 
            onPress: () => {
              // Navigate back to the root of the stack
              navigation.navigate('Home', { screen: 'Dashboard' });
            }
          }]
        );
      }
    } catch (error: any) {
      console.error('Order submission error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to complete order';
      Alert.alert('Error', errorMessage);
      setSubmitting(false);
    }
  };

  // Gesture handler for swipe up
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow upward movement (negative translationY)
      if (event.translationY < 0) {
        const distance = Math.abs(event.translationY);
        console.log(`Swiping UP: ${distance.toFixed(0)}px`);
        translateY.setValue(Math.min(distance, 150));
      }
    })
    .onEnd((event) => {
      const distance = Math.abs(event.translationY);
      console.log(`Swipe ended: ${distance.toFixed(0)}px, velocityY: ${event.velocityY}`);
      
      // Trigger if swiped up more than 80px OR fast swipe
      if (distance > 80 && event.translationY < 0) {
        console.log('✅ SWIPE SUCCESS - Submitting order!');
        // Animate to top
        Animated.timing(translateY, {
          toValue: 200,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          handleSubmitOrder();
        });
      } else {
        console.log('❌ Swipe too short - resetting');
        // Reset animation
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    })
    .runOnJS(true);

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

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
        {/* Dollar Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.dollarAmount}>${dollarAmount.toFixed(2)}</Text>
          <Text style={styles.oneTime}>One time</Text>
          {isSellingAll && (
            <View style={styles.sellingAllBadge}>
              <Text style={styles.sellingAllText}>Selling All ✓</Text>
            </View>
          )}
        </View>

        {/* Stock Price */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>
            {symbol} {action === 'buy' ? 'bid' : 'ask'} price
          </Text>
          <Text style={styles.priceValue}>${currentPrice.toFixed(2)}</Text>
        </View>

        {/* Order Details */}
        <View style={styles.detailsSection}>
          {/* Shares Amount */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{symbol} amount</Text>
            <Text style={styles.detailValue}>
              {shares.toFixed(6)} {symbol}
            </Text>
          </View>

          {/* Buy Spread */}
          {action === 'buy' && (
            <View style={styles.detailRow}>
              <View>
                <Text style={styles.detailLabel}>Buy spread (0.86%)</Text>
                <Text style={styles.detailSubtext}>Included in {symbol} price</Text>
              </View>
              <Text style={styles.detailValue}>${buySpread.toFixed(8)}</Text>
            </View>
          )}

          {/* Final Total */}
          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Final total</Text>
            <Text style={styles.totalValue}>${finalTotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryText}>
            Your order will be executed at the best available price after the market opens.
          </Text>
        </View>
      </ScrollView>

      {/* Swipe Up Area with Gesture Handler */}
      <GestureDetector gesture={panGesture}>
        <Animated.View 
          style={[
            styles.swipeArea,
            {
              transform: [{ 
                translateY: translateY.interpolate({
                  inputRange: [0, 150],
                  outputRange: [0, -150],
                  extrapolate: 'clamp',
                })
              }],
              opacity: translateY.interpolate({
                inputRange: [0, 80],
                outputRange: [1, 0.7],
                extrapolate: 'clamp',
              })
            }
          ]}
        >
          {/* Swipe Handle */}
          <View style={styles.swipeHandle} />
          
          {/* Swipe Text */}
          <Text style={styles.swipeText}>
            {submitting ? 'Submitting...' : 'Swipe up to submit'}
          </Text>
          
          {/* Helper text */}
          <Text style={styles.swipeHelperText}>
            Drag up about 2 inches
          </Text>
        </Animated.View>
      </GestureDetector>
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
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: 32,
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
  sellingAllBadge: {
    backgroundColor: '#00C805',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  sellingAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  priceSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    color: '#000',
    fontWeight: '500',
  },
  detailsSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#000',
    fontWeight: '400',
  },
  detailSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    color: '#000',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    color: '#000',
    fontWeight: '600',
  },
  summarySection: {
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  swipeArea: {
    backgroundColor: '#00C805',
    height: 180,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  swipeHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#fff',
    borderRadius: 2,
    marginBottom: 16,
  },
  swipeText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  swipeHelperText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '400',
  },
});