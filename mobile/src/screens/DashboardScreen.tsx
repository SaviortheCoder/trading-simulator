// ============================================
// DASHBOARD SCREEN - WITH TOKEN DEBUGGING
// ============================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import {
    logout,
    getWatchlist,
    removeFromWatchlist,
    getBulkPrices,
    getHoldings,
    getPortfolioHistory,
    getAssetHistory
} from '../services/api';
import PortfolioChart from '../components/PortfolioChart';
import Sparkline from '../components/Sparkline';
import { Timeframe } from '../components/TimeframeSelector';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface WatchlistItem {
    symbol: string;
    name: string;
    type: string;
    price?: number;
    change?: number;
    changePercent?: number;
    loading?: boolean;
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
    changePercent?: number;
}

export default function DashboardScreen({ navigation }: any) {
    const { user, clearAuth } = useAuthStore();
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [portfolioHistory, setPortfolioHistory] = useState<Array<{ timestamp: number; price: number }>>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [visibleWatchlistCount, setVisibleWatchlistCount] = useState(5);
    const [jwtErrorCount, setJwtErrorCount] = useState(0);
    const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

    // ✅ Debug tokens on mount
    useEffect(() => {
        const debugTokens = async () => {
            console.log('🔍 DashboardScreen - Checking tokens...');
            
            const allKeys = await AsyncStorage.getAllKeys();
            console.log('📦 Storage keys:', allKeys);
            
            const accessToken = await AsyncStorage.getItem('accessToken');
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            const userStr = await AsyncStorage.getItem('user');
            
            console.log('🔑 Access token:', accessToken ? 'EXISTS ✅' : 'MISSING ❌');
            console.log('🔑 Refresh token:', refreshToken ? 'EXISTS ✅' : 'MISSING ❌');
            console.log('👤 User data:', userStr ? 'EXISTS ✅' : 'MISSING ❌');
            
            if (accessToken) {
                console.log('📏 Access token length:', accessToken.length);
                console.log('🔑 Access token preview:', accessToken.substring(0, 50) + '...');
            }
            
            if (!accessToken || !refreshToken) {
                console.log('⚠️ MISSING TOKENS - Login might fail!');
            }
        };
        
        debugTokens();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadDashboard();
        }, [])
    );

    const loadDashboard = async (days: number = 30) => {
        setLoading(true);
        console.log('📊 Loading dashboard...');
        
        try {
            // Load holdings first
            try {
                console.log('📊 Fetching holdings...');
                const holdingsResponse = await getHoldings();
                
                if (holdingsResponse.success) {
                    const holdingsData = holdingsResponse.holdings || [];
                    console.log(`✅ Loaded ${holdingsData.length} holdings`);
                    setHoldings(holdingsData);

                    // Reset JWT error count on success
                    setJwtErrorCount(0);

                    // Load current prices for holdings to get today's change%
                    if (holdingsData.length > 0) {
                        await loadHoldingsPrices(holdingsData);
                    }
                }
            } catch (error: any) {
                console.error('❌ Error loading holdings:', error);
                
                // Check if it's a JWT error
                if (error.message?.includes('Invalid token') || 
                    error.message?.includes('jwt') ||
                    error.response?.data?.error?.includes('token')) {
                    
                    console.log('⚠️ JWT ERROR DETECTED!');
                    const newCount = jwtErrorCount + 1;
                    setJwtErrorCount(newCount);
                    
                    // After 3 JWT errors, auto-clear and logout
                    if (newCount >= 3) {
                        console.log('🚨 Too many JWT errors - clearing storage and logging out');
                        Alert.alert(
                            'Session Expired',
                            'Your session has expired. Please login again.',
                            [
                                {
                                    text: 'OK',
                                    onPress: async () => {
                                        await AsyncStorage.clear();
                                        await clearAuth();
                                    }
                                }
                            ]
                        );
                    }
                }
            }

            // Load portfolio history
            try {
                console.log('📈 Fetching portfolio history...');
                const historyResponse = await getPortfolioHistory(days);
                
                if (historyResponse.success) {
                    console.log(`✅ Loaded ${historyResponse.history?.length || 0} history points`);
                    setPortfolioHistory(historyResponse.history || []);
                    setJwtErrorCount(0);
                }
            } catch (error: any) {
                console.error('❌ Error loading portfolio history:', error);
            }

            // Load watchlist from backend
            try {
                console.log('⭐ Fetching watchlist...');
                const watchlistResponse = await getWatchlist();

                if (watchlistResponse.success && watchlistResponse.watchlist) {
                    const items = watchlistResponse.watchlist
                        .filter((item: any) => item && item.symbol)
                        .map((item: any) => ({
                            ...item,
                            loading: true,
                        }));
                    
                    console.log(`✅ Loaded ${items.length} watchlist items`);
                    setWatchlist(items);
                    setJwtErrorCount(0);

                    if (items.length > 0) {
                        await loadPricesAllAtOnce(items);
                        await loadSparklines(items);
                    }
                }
            } catch (error: any) {
                console.error('❌ Error loading watchlist:', error);
            }
        } catch (error: any) {
            console.error('❌ Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadHoldingsPrices = async (holdingsData: Holding[]) => {
        try {
            const symbols = holdingsData.map(h => ({
                symbol: h.symbol,
                type: h.type
            }));

            const response = await getBulkPrices(symbols);

            if (response.success && response.prices) {
                setHoldings((prev) =>
                    prev.map((holding) => {
                        const priceData = response.prices.find((p: any) => p.symbol === holding.symbol);
                        return {
                            ...holding,
                            changePercent: priceData?.changePercent,
                        };
                    })
                );
            }
        } catch (error) {
            console.error('Error loading holdings prices:', error);
        }
    };

    const handleTimeframeChange = (timeframe: Timeframe, days: number) => {
        console.log(`Loading ${days} days of data for ${timeframe}`);
        loadDashboard(days);
    };

    const loadPricesAllAtOnce = async (items: WatchlistItem[]) => {
        try {
            const symbols = items
                .filter(item => item && item.symbol)
                .map(item => ({
                    symbol: item.symbol,
                    type: item.type
                }));

            if (symbols.length === 0) {
                setWatchlist([]);
                return;
            }

            const response = await getBulkPrices(symbols);

            if (response.success && response.prices) {
                setWatchlist((prev) =>
                    prev.map((item) => {
                        const priceData = response.prices.find((p: any) => p.symbol === item.symbol);

                        return {
                            ...item,
                            price: priceData?.price,
                            change: priceData?.change,
                            changePercent: priceData?.changePercent,
                            loading: false,
                        };
                    })
                );
            } else {
                setWatchlist((prev) =>
                    prev.map((item) => ({ ...item, loading: false }))
                );
            }
        } catch (error) {
            console.error('Error loading prices:', error);
            setWatchlist((prev) =>
                prev.map((item) => ({ ...item, loading: false }))
            );
        }
    };

    const loadSparklines = async (items: WatchlistItem[]) => {
        const visibleItems = items.slice(0, visibleWatchlistCount);
        
        const sparklinePromises = visibleItems.map(async (item) => {
            try {
                const response = await getAssetHistory(item.symbol, item.type, 7);
                if (response.success && response.history) {
                    return {
                        symbol: item.symbol,
                        history: response.history.map((h: any) => h.price),
                    };
                }
            } catch (error) {
                console.error(`Error loading sparkline for ${item.symbol}:`, error);
            }
            return null;
        });

        const sparklineResults = await Promise.all(sparklinePromises);

        setWatchlist((prev) =>
            prev.map((item) => {
                const sparklineData = sparklineResults.find((s) => s?.symbol === item.symbol);
                return {
                    ...item,
                    history: sparklineData?.history || [],
                };
            })
        );
    };

    const handleLoadMore = async () => {
        const newCount = Math.min(visibleWatchlistCount + 5, watchlist.length);
        setVisibleWatchlistCount(newCount);
        
        const newItems = watchlist.slice(visibleWatchlistCount, newCount);
        if (newItems.length > 0) {
            await loadSparklines(watchlist);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        console.log('🔄 Refreshing dashboard...');
        await loadDashboard();
        setRefreshing(false);
    };

    const handleLogout = async () => {
        try {
            console.log('🔓 Logging out...');
            await logout();
            await clearAuth();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleAssetPress = (symbol: string, name: string, type: string) => {
        console.log('Navigating to:', symbol, name);
        navigation.navigate('AssetDetail', {
            symbol,
            name,
            type
        });
    };

    const handleDelete = async (symbol: string) => {
        try {
            await removeFromWatchlist(symbol);
            setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
        } catch (error) {
            console.error('Error removing from watchlist:', error);
        }
    };

    const renderRightActions = (
        progress: any,
        dragX: any,
        symbol: string
    ) => {
        return (
            <View style={styles.deleteAction}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(symbol)}
                >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (!user) return null;

    const portfolioValue = holdings.reduce((total, holding) => total + holding.currentValue, 0);
    const totalValue = portfolioValue + (user.cashBalance || 0);

    const initialValue = 100000;
    const profitLoss = totalValue - initialValue;
    const profitLossPercent = ((profitLoss / initialValue) * 100).toFixed(2);
    const isPositive = profitLoss >= 0;

    // Separate holdings into stocks and crypto
    const stockHoldings = holdings.filter(h => h.type === 'stock');
    const cryptoHoldings = holdings.filter(h => h.type === 'crypto');

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>Trading Simulator</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Text style={styles.logoutButton}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#00C805"
                    />
                }
            >
                {/* Portfolio Value */}
                <View style={styles.portfolioSection}>
                    <Text style={styles.portfolioValue}>
                        ${totalValue.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </Text>
                    <View style={styles.profitLossContainer}>
                        <Text
                            style={[
                                styles.profitLoss,
                                isPositive ? styles.positive : styles.negative,
                            ]}
                        >
                            {isPositive ? '+' : ''}$
                            {Math.abs(profitLoss).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </Text>
                        <Text
                            style={[
                                styles.profitLossPercent,
                                isPositive ? styles.positive : styles.negative,
                            ]}
                        >
                            ({isPositive ? '+' : ''}
                            {profitLossPercent}%)
                        </Text>
                        <Text style={styles.timeframe}>All Time</Text>
                    </View>
                </View>

                {/* Portfolio Chart */}
                <PortfolioChart
                    data={portfolioHistory}
                    isPositive={isPositive}
                    onTimeframeChange={handleTimeframeChange}
                />

                {/* Buying Power */}
                <View style={styles.buyingPowerCard}>
                    <Text style={styles.buyingPowerLabel}>Buying Power</Text>
                    <Text style={styles.buyingPowerValue}>
                        ${(user.cashBalance || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </Text>
                </View>

                {/* Holdings Section - SEPARATE HEADERS */}
                {holdings.length > 0 && (
                    <View style={styles.holdingsSection}>
                        {/* Stocks Section */}
                        {stockHoldings.length > 0 && (
                            <>
                                <Text style={styles.sectionTitle}>Stocks / ETFs</Text>
                                {stockHoldings.map((holding) => {
                                    const isPositive = (holding.profitLoss || 0) >= 0;
                                    
                                    return (
                                        <TouchableOpacity
                                            key={holding.symbol}
                                            style={styles.holdingCard}
                                            onPress={() => handleAssetPress(holding.symbol, holding.name, 'stock')}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.holdingRow}>
                                                <View style={styles.holdingLeft}>
                                                    <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                                                    <Text style={styles.holdingQuantity}>
                                                        {holding.quantity} share{holding.quantity !== 1 ? 's' : ''}
                                                    </Text>
                                                </View>

                                                <View style={styles.holdingRight}>
                                                    <Text style={styles.holdingPrice}>
                                                        ${(holding.currentPrice || 0).toLocaleString('en-US', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.holdingPercent,
                                                            isPositive ? styles.positive : styles.negative,
                                                        ]}
                                                    >
                                                        {isPositive ? '+' : ''}{holding.profitLossPercent || '0.00'}%
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </>
                        )}

                        {/* Crypto Section */}
                        {cryptoHoldings.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Crypto</Text>
                                {cryptoHoldings.map((holding) => {
                                    const isPositive = (holding.profitLoss || 0) >= 0;
                                    
                                    return (
                                        <TouchableOpacity
                                            key={holding.symbol}
                                            style={styles.holdingCard}
                                            onPress={() => handleAssetPress(holding.symbol, holding.name, 'crypto')}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.holdingRow}>
                                                <View style={styles.holdingLeft}>
                                                    <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                                                    <Text style={styles.holdingQuantity}>
                                                        {holding.quantity} coin{holding.quantity !== 1 ? 's' : ''}
                                                    </Text>
                                                </View>

                                                <View style={styles.holdingRight}>
                                                    <Text style={styles.holdingPrice}>
                                                        ${(holding.currentPrice || 0).toLocaleString('en-US', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.holdingPercent,
                                                            isPositive ? styles.positive : styles.negative,
                                                        ]}
                                                    >
                                                        {isPositive ? '+' : ''}{holding.profitLossPercent || '0.00'}%
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </>
                        )}
                    </View>
                )}

                {/* Watchlist Section - COLLAPSIBLE */}
                <View style={styles.watchlistSection}>
                    <Text style={styles.sectionTitle}>Watchlist</Text>
                    <Text style={styles.swipeHint}>Swipe left to remove</Text>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#00C805" />
                        </View>
                    ) : watchlist.length === 0 ? (
                        <View style={styles.emptyWatchlist}>
                            <Text style={styles.emptyText}>No stocks in watchlist</Text>
                            <TouchableOpacity
                                style={styles.addButton}
                                onPress={() => navigation.navigate('Search')}
                            >
                                <Text style={styles.addButtonText}>Add Stocks</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {watchlist.slice(0, visibleWatchlistCount).map((item) => {
                                const isUp = (item.changePercent || 0) >= 0;
                                return (
                                    <Swipeable
                                        key={item.symbol}
                                        ref={(ref) => {
                                            if (ref) swipeableRefs.current[item.symbol] = ref;
                                        }}
                                        renderRightActions={(progress, dragX) =>
                                            renderRightActions(progress, dragX, item.symbol)
                                        }
                                        overshootRight={false}
                                        friction={1.5}
                                        rightThreshold={40}
                                    >
                                        <TouchableOpacity
                                            style={styles.watchlistItem}
                                            onPress={() => handleAssetPress(item.symbol, item.name, item.type)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.itemLeft}>
                                                <Text style={styles.itemSymbol}>{item.symbol}</Text>
                                                <Text style={styles.itemName} numberOfLines={1}>
                                                    {item.name}
                                                </Text>
                                            </View>

                                            <View style={styles.watchlistRight}>
                                                {item.loading ? (
                                                    <ActivityIndicator size="small" color="#00C805" />
                                                ) : item.price ? (
                                                    <>
                                                        <View style={styles.sparklineWrapper}>
                                                            {item.history && item.history.length > 0 ? (
                                                                <Sparkline
                                                                    data={item.history}
                                                                    width={60}
                                                                    height={30}
                                                                    color={isUp ? '#00C805' : '#FF5000'}
                                                                />
                                                            ) : (
                                                                <View style={styles.sparklinePlaceholder}>
                                                                    <Text style={styles.sparklinePlaceholderText}>—</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                        <View style={styles.priceInfo}>
                                                            <Text style={styles.itemPrice}>
                                                                ${item.price.toLocaleString('en-US', {
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
                                                                {isUp ? '+' : ''}
                                                                {item.changePercent?.toFixed(2)}%
                                                            </Text>
                                                        </View>
                                                    </>
                                                ) : (
                                                    <Text style={styles.itemError}>---</Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    </Swipeable>
                                );
                            })}
                            
                            {/* Load More Button */}
                            {visibleWatchlistCount < watchlist.length && (
                                <TouchableOpacity
                                    style={styles.loadMoreButton}
                                    onPress={handleLoadMore}
                                >
                                    <Text style={styles.loadMoreText}>
                                        Load More ({watchlist.length - visibleWatchlistCount} remaining)
                                    </Text>
                                </TouchableOpacity>
                            )}
                            
                            {/* Show Less Button */}
                            {visibleWatchlistCount > 5 && (
                                <TouchableOpacity
                                    style={styles.collapseButton}
                                    onPress={() => setVisibleWatchlistCount(5)}
                                >
                                    <Text style={styles.collapseText}>Show Less</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>

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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    logo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00C805',
    },
    logoutButton: {
        fontSize: 14,
        color: '#999',
    },
    content: {
        flex: 1,
    },
    portfolioSection: {
        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 16,
    },
    portfolioValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    profitLossContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    profitLoss: {
        fontSize: 18,
        fontWeight: '600',
    },
    profitLossPercent: {
        fontSize: 18,
    },
    positive: {
        color: '#00C805',
    },
    negative: {
        color: '#FF5000',
    },
    timeframe: {
        fontSize: 14,
        color: '#666',
    },
    buyingPowerCard: {
        marginHorizontal: 16,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    buyingPowerLabel: {
        fontSize: 16,
        color: '#999',
    },
    buyingPowerValue: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    holdingsSection: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    holdingCard: {
        backgroundColor: '#0a0a0a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1a1a1a',
    },
    holdingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    holdingLeft: {
        flex: 1,
    },
    holdingSymbol: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    holdingQuantity: {
        fontSize: 14,
        color: '#666',
    },
    holdingRight: {
        alignItems: 'flex-end',
    },
    holdingPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    holdingPercent: {
        fontSize: 16,
        fontWeight: '600',
    },
    watchlistSection: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    swipeHint: {
        fontSize: 12,
        color: '#666',
        marginBottom: 16,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    watchlistItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 0,
        backgroundColor: '#000',
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    itemLeft: {
        flex: 1,
        minWidth: 60,
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
    watchlistRight: {
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
    sparklinePlaceholder: {
        width: 60,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 4,
    },
    sparklinePlaceholderText: {
        fontSize: 18,
        color: '#444',
        fontWeight: '300',
    },
    priceInfo: {
        alignItems: 'flex-end',
        width: 80,
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
    itemError: {
        fontSize: 14,
        color: '#666',
    },
    emptyWatchlist: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
    },
    addButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#00C805',
        borderRadius: 8,
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    loadMoreButton: {
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
    },
    loadMoreText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#00C805',
    },
    collapseButton: {
        marginTop: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    collapseText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    deleteAction: {
        width: SCREEN_WIDTH,
        backgroundColor: '#FF5000',
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    deleteButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    bottomSpacer: {
        height: 100,
    },
});