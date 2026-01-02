// ============================================
// APP NAVIGATOR - WITH P&L SCREENS
// Home, Crypto, Search, Settings
// ============================================

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SearchScreen from '../screens/SearchScreen';
import CryptoScreen from '../screens/CryptoScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AssetDetailScreen from '../screens/AssetDetailScreen';
import TradeConfirmationScreen from '../screens/TradeConfirmationScreen';
import OrderConfirmationScreen from '../screens/OrderConfirmationScreen';
import RealizedPLScreen from '../screens/RealizedPLScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Robinhood-style Tab Icons (Clean & Professional)
const HomeIcon = ({ color }: { color: string }) => (
  <Ionicons name="home-outline" size={24} color={color} />
);

const CryptoIcon = ({ color }: { color: string }) => (
  <Ionicons name="logo-bitcoin" size={26} color={color} />
);

const SearchIcon = ({ color }: { color: string }) => (
  <Ionicons name="search-outline" size={24} color={color} />
);

const SettingsIcon = ({ color }: { color: string }) => (
  <Ionicons name="settings-outline" size={24} color={color} />
);

const HomeStack = createNativeStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
      <HomeStack.Screen name="AssetDetail" component={AssetDetailScreen} />
      <HomeStack.Screen 
        name="TradeConfirmation" 
        component={TradeConfirmationScreen}
        options={{ 
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
      <HomeStack.Screen 
        name="OrderConfirmation" 
        component={OrderConfirmationScreen}
        options={{ 
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
      <HomeStack.Screen 
        name="RealizedPL" 
        component={RealizedPLScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
}

const CryptoStack = createNativeStackNavigator();

function CryptoStackScreen() {
  return (
    <CryptoStack.Navigator screenOptions={{ headerShown: false }}>
      <CryptoStack.Screen name="CryptoMain" component={CryptoScreen} />
      <CryptoStack.Screen name="AssetDetail" component={AssetDetailScreen} />
      <CryptoStack.Screen 
        name="TradeConfirmation" 
        component={TradeConfirmationScreen}
        options={{ 
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
      <CryptoStack.Screen 
        name="OrderConfirmation" 
        component={OrderConfirmationScreen}
        options={{ 
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
    </CryptoStack.Navigator>
  );
}

const SearchStack = createNativeStackNavigator();

function SearchStackScreen() {
  return (
    <SearchStack.Navigator screenOptions={{ headerShown: false }}>
      <SearchStack.Screen name="SearchMain" component={SearchScreen} />
      <SearchStack.Screen name="AssetDetail" component={AssetDetailScreen} />
      <SearchStack.Screen 
        name="TradeConfirmation" 
        component={TradeConfirmationScreen}
        options={{ 
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
      <SearchStack.Screen 
        name="OrderConfirmation" 
        component={OrderConfirmationScreen}
        options={{ 
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
    </SearchStack.Navigator>
  );
}

const SettingsStack = createNativeStackNavigator();

function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} />
      <SettingsStack.Screen 
        name="TransactionHistory" 
        component={TransactionHistoryScreen}
        options={{ headerShown: false }}
      />
    </SettingsStack.Navigator>
  );
}

// ✅ TAB ORDER: Home, Crypto, Search, Settings
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#333',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          position: 'absolute',
        },
        tabBarActiveTintColor: '#00C805',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{
          tabBarIcon: HomeIcon,
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Crypto"
        component={CryptoStackScreen}
        options={{
          tabBarIcon: CryptoIcon,
          tabBarLabel: 'Crypto',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStackScreen}
        options={{
          tabBarIcon: SearchIcon,
          tabBarLabel: 'Search',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackScreen}
        options={{
          tabBarIcon: SettingsIcon,
          tabBarLabel: 'Settings',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loadFromStorage } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await loadFromStorage();
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00C805" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' },
        }}
      >
        {isAuthenticated ? (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
