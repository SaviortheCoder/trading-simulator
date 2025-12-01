// ============================================
// APP NAVIGATOR - Handle navigation & auth flow
// ============================================

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Robinhood-style Tab Icons
const HomeIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: 20, height: 18 }}>
      <View style={{ 
        position: 'absolute',
        width: 20,
        height: 10,
        top: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderBottomWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
      }} />
      <View style={{ 
        position: 'absolute',
        width: 16,
        height: 10,
        bottom: 0,
        left: 2,
        borderWidth: 2,
        borderColor: color,
        borderTopWidth: 0,
      }} />
    </View>
  </View>
);

const SearchIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ 
      width: 14, 
      height: 14, 
      borderRadius: 7, 
      borderWidth: 2, 
      borderColor: color,
    }} />
    <View style={{ 
      position: 'absolute',
      width: 6, 
      height: 2, 
      backgroundColor: color,
      bottom: 4,
      right: 4,
      transform: [{ rotate: '45deg' }]
    }} />
  </View>
);

const CryptoIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ 
      width: 16, 
      height: 18, 
      borderWidth: 2,
      borderColor: color,
      borderRadius: 8,
      borderLeftWidth: 0,
      position: 'relative',
    }}>
      <View style={{ 
        position: 'absolute',
        width: 16,
        height: 2,
        backgroundColor: color,
        top: 7,
        left: -2,
      }} />
    </View>
    <View style={{ 
      position: 'absolute',
      width: 2,
      height: 20,
      backgroundColor: color,
      left: 9,
    }} />
  </View>
);

const SettingsIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ 
      width: 16, 
      height: 16, 
      borderRadius: 8, 
      borderWidth: 2.5, 
      borderColor: color,
    }} />
    <View style={{ 
      position: 'absolute',
      width: 6, 
      height: 6, 
      borderRadius: 3, 
      backgroundColor: color,
    }} />
    {[0, 90, 180, 270].map((rotation, i) => (
      <View 
        key={i}
        style={{ 
          position: 'absolute',
          width: 4,
          height: 6,
          backgroundColor: color,
          transform: [
            { translateY: -11 },
            { rotate: `${rotation}deg` },
            { translateY: 11 },
          ]
        }} 
      />
    ))}
  </View>
);

// ✅ ADD THIS LINE - YOU WERE MISSING IT!
const HomeStack = createNativeStackNavigator();

function HomeStackScreen() {
    return (
      <HomeStack.Navigator screenOptions={{ headerShown: false }}>
        <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
        <HomeStack.Screen name="AssetDetail" component={AssetDetailScreen} />
        <HomeStack.Screen 
          name="SimplifiedTrade" 
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
      </HomeStack.Navigator>
    );
  }

const SearchStack = createNativeStackNavigator();

function SearchStackScreen() {
    return (
      <SearchStack.Navigator screenOptions={{ headerShown: false }}>
        <SearchStack.Screen name="SearchMain" component={SearchScreen} />
        <SearchStack.Screen name="AssetDetail" component={AssetDetailScreen} />
        <HomeStack.Screen 
          name="SimplifiedTrade" 
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
      </SearchStack.Navigator>
    );
  }

const CryptoStack = createNativeStackNavigator();

function CryptoStackScreen() {
    return (
      <CryptoStack.Navigator screenOptions={{ headerShown: false }}>
        <CryptoStack.Screen name="CryptoMain" component={CryptoScreen} />
        <CryptoStack.Screen name="AssetDetail" component={AssetDetailScreen} />
        <HomeStack.Screen 
          name="SimplifiedTrade" 
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
      </CryptoStack.Navigator>
    );
  }

// Bottom Tab Navigator
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
        name="Search"
        component={SearchStackScreen}
        options={{
          tabBarIcon: SearchIcon,
          tabBarLabel: 'Search',
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
        name="Settings"
        component={SettingsScreen}
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