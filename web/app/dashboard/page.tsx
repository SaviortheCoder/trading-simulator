// ============================================
// DASHBOARD PAGE - Robinhood-style design
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { logout } from '@/lib/api';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth, loadFromStorage } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Load auth from localStorage on mount
  useEffect(() => {
    loadFromStorage();
    setLoading(false);
  }, [loadFromStorage]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      clearAuth();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Show loading state
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Calculate profit/loss
  const initialValue = 100000; // Starting balance
  const currentValue = user.totalValue || 100000;
  const profitLoss = currentValue - initialValue;
  const profitLossPercent = ((profitLoss / initialValue) * 100).toFixed(2);
  const isPositive = profitLoss >= 0;

  // Mock chart data (we'll make this real later with actual portfolio history)
  const chartData = [
    { value: initialValue },
    { value: initialValue + (profitLoss * 0.2) },
    { value: initialValue + (profitLoss * 0.4) },
    { value: initialValue + (profitLoss * 0.6) },
    { value: initialValue + (profitLoss * 0.8) },
    { value: currentValue },
  ];

  // Mock watchlist (we'll make this real later)
  const watchlist = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 178.32, change: 2.45, changePercent: 1.39 },
    { symbol: 'TSLA', name: 'Tesla, Inc.', price: 245.67, change: -5.23, changePercent: -2.08 },
    { symbol: 'BTCUSDT', name: 'Bitcoin', price: 43250.00, change: 1250.50, changePercent: 2.98 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 495.22, change: 12.15, changePercent: 2.51 },
    { symbol: 'ETHUSD', name: 'Ethereum', price: 2280.45, change: -45.20, changePercent: -1.94 },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Navbar */}
      <nav className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <Link href="/dashboard" className="text-xl font-bold text-[#00C805]">
              Trading Simulator
            </Link>

            {/* Right Menu */}
            <div className="flex items-center space-x-6">
              <span className="text-sm text-gray-400">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Portfolio Value Section */}
        <div className="mb-8">
          {/* Large Portfolio Value */}
          <div className="mb-4">
            <h1 className="text-4xl font-bold mb-1">
              ${currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h1>
            <div className="flex items-center space-x-2">
              <span className={`text-lg font-medium ${isPositive ? 'text-[#00C805]' : 'text-red-500'}`}>
                {isPositive ? '+' : ''}${Math.abs(profitLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-lg ${isPositive ? 'text-[#00C805]' : 'text-red-500'}`}>
                ({isPositive ? '+' : ''}{profitLossPercent}%)
              </span>
              <span className="text-sm text-gray-500">Today</span>
            </div>
          </div>

          {/* Portfolio Graph */}
          <div className="h-48 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? '#00C805' : '#FF5000'}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Time Period Buttons */}
          <div className="flex space-x-4 text-sm mb-8">
            <button className="text-[#00C805] font-medium">1D</button>
            <button className="text-gray-500 hover:text-white transition">1W</button>
            <button className="text-gray-500 hover:text-white transition">1M</button>
            <button className="text-gray-500 hover:text-white transition">3M</button>
            <button className="text-gray-500 hover:text-white transition">1Y</button>
            <button className="text-gray-500 hover:text-white transition">ALL</button>
          </div>

          {/* Buying Power */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Buying Power</span>
              <span className="text-xl font-semibold">
                ${(user.cashBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Watchlist Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Watchlist</h2>
          
          {/* Watchlist Items */}
          <div className="space-y-0">
            {watchlist.map((item) => {
              const itemIsPositive = item.change >= 0;
              return (
                <Link
                  key={item.symbol}
                  href={`/trade/${item.symbol}`}
                  className="block border-b border-zinc-800 hover:bg-zinc-900 transition"
                >
                  <div className="py-4 px-2 flex items-center justify-between">
                    {/* Left: Symbol and Name */}
                    <div className="flex-1">
                      <p className="font-semibold text-white">{item.symbol}</p>
                      <p className="text-sm text-gray-500">{item.name}</p>
                    </div>

                    {/* Middle: Mini Chart (placeholder) */}
                    <div className="flex-1 flex justify-center">
                      <div className="h-12 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={[
                              { v: 100 },
                              { v: 105 },
                              { v: 103 },
                              { v: 108 },
                              { v: 106 },
                              { v: 100 + item.changePercent },
                            ]}
                          >
                            <Line
                              type="monotone"
                              dataKey="v"
                              stroke={itemIsPositive ? '#00C805' : '#FF5000'}
                              strokeWidth={1.5}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Right: Price and Change */}
                    <div className="flex-1 text-right">
                      <p className="font-semibold text-white">
                        ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className={`text-sm font-medium ${itemIsPositive ? 'text-[#00C805]' : 'text-red-500'}`}>
                        {itemIsPositive ? '+' : ''}{item.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Add to Watchlist Button */}
          <button className="w-full mt-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[#00C805] font-medium transition">
            + Add to Watchlist
          </button>
        </div>

        {/* Bottom Spacer */}
        <div className="h-20"></div>
      </div>

      {/* Bottom Navigation (Mobile-style) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around items-center h-16">
            <Link
              href="/dashboard"
              className="flex flex-col items-center space-y-1 text-[#00C805]"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span className="text-xs font-medium">Home</span>
            </Link>
            <Link
              href="/portfolio"
              className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-xs">Portfolio</span>
            </Link>
            <Link
              href="/watchlist"
              className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="text-xs">Watchlist</span>
            </Link>
            <Link
              href="/profile"
              className="flex flex-col items-center space-y-1 text-gray-500 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs">Profile</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}