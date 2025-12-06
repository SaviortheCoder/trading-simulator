// ============================================
// LOGIN SCREEN - WITH TOKEN CLEARING & VERIFICATION
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { login } from '../services/api';

export default function LoginScreen({ navigation }: any) {
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ CRITICAL: Clear any corrupted tokens on mount
  useEffect(() => {
    const clearOldTokens = async () => {
      console.log('🧹 Clearing any existing storage on LoginScreen mount...');
      await AsyncStorage.clear();
      console.log('✅ Storage cleared - fresh start');
    };
    
    clearOldTokens();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      console.log('🔐 Starting login process...');
      console.log('📧 Email:', email);
      
      // Step 1: Clear storage before login
      console.log('🧹 Clearing storage before login...');
      await AsyncStorage.clear();
      
      // Step 2: Login (api.ts will store tokens)
      console.log('📡 Calling login API...');
      const response = await login({ email, password });
      
      console.log('✅ Login API response received');
      console.log('👤 User:', response.user.email);
      
      // Step 3: Verify tokens were stored by api.ts
      const storedAccessToken = await AsyncStorage.getItem('accessToken');
      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      
      console.log('🔍 Verifying stored tokens...');
      console.log('Access token stored:', storedAccessToken ? 'YES ✅' : 'NO ❌');
      console.log('Refresh token stored:', storedRefreshToken ? 'YES ✅' : 'NO ❌');
      
      if (!storedAccessToken || !storedRefreshToken) {
        console.log('❌ CRITICAL: Tokens were not stored by api.ts!');
        throw new Error('Token storage failed. Please check api.ts');
      }
      
      console.log('🔑 Access token preview:', storedAccessToken.substring(0, 50) + '...');
      console.log('📏 Access token length:', storedAccessToken.length);
      
      // Step 4: Update auth store (tokens already stored by api.ts)
      console.log('💾 Updating auth store...');
      await setAuth(response.user, response.accessToken, response.refreshToken);
      
      console.log('✅ Login complete - auth store updated');
      
      // Navigation happens automatically via navigation setup
    } catch (err: any) {
      console.error('❌ Login error:', err);
      
      // Clear storage on error
      await AsyncStorage.clear();
      
      setError(err.response?.data?.error || err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo/Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Trading Simulator</Text>
          <Text style={styles.subtitle}>Practice trading without the risk</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#666"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Debug Button (OPTIONAL - Remove in production) */}
        <TouchableOpacity
          style={styles.debugButton}
          onPress={async () => {
            const allKeys = await AsyncStorage.getAllKeys();
            const allData = await AsyncStorage.multiGet(allKeys);
            
            console.log('📦 ALL STORAGE KEYS:', allKeys);
            console.log('📦 ALL STORAGE DATA:', allData);
            
            Alert.alert(
              'Storage Debug',
              `Keys: ${allKeys.length}\n${allKeys.join('\n')}`
            );
          }}
        >
          <Text style={styles.debugText}>🔍 Debug Storage</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Demo account starts with $100,000 virtual cash
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00C805',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  formContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 80, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FF5000',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF5000',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ccc',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#fff',
  },
  button: {
    backgroundColor: '#00C805',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#444',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#444',
  },
  dividerText: {
    color: '#666',
    fontSize: 14,
    marginHorizontal: 16,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signupText: {
    color: '#999',
    fontSize: 14,
  },
  signupLink: {
    color: '#00C805',
    fontSize: 14,
    fontWeight: '600',
  },
  debugButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  debugText: {
    color: '#666',
    fontSize: 12,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});