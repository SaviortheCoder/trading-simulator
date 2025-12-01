import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import TimeframeSelector, { Timeframe } from './TimeframeSelector';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PortfolioChartProps {
  onTimeframeChange?: (timeframe: Timeframe, days: number) => void;
  data: Array<{ timestamp: number; price: number }>;
  isPositive: boolean;
  showTimeframeSelector?: boolean;
}

export default function PortfolioChart({ 
  data, 
  isPositive,
  showTimeframeSelector = true,
  onTimeframeChange 
}: PortfolioChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1M');

  useEffect(() => {
    if (onTimeframeChange) {
      const daysMap = {
        'live': 1,
        '1D': 1,
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '6M': 180,
        '1Y': 365,
      };
      onTimeframeChange(selectedTimeframe, daysMap[selectedTimeframe]);
    }
  }, [selectedTimeframe]);

  if (!data || data.length < 2) {
    return (
      <View>
        {showTimeframeSelector && (
          <TimeframeSelector
            selected={selectedTimeframe}
            onSelect={setSelectedTimeframe}
          />
        )}
        <View style={[styles.placeholder, isPositive ? styles.chartPositive : styles.chartNegative]}>
          <Text style={styles.placeholderText}>Loading chart...</Text>
        </View>
      </View>
    );
  }

  const prices = data.map(d => d.price);
  const labels = data.map(d => {
    const date = new Date(d.timestamp);
    if (selectedTimeframe === 'live' || selectedTimeframe === '1D') {
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (selectedTimeframe === '1W') {
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  });

  // Show fewer labels to avoid crowding
  const labelInterval = Math.ceil(labels.length / 6);
  const displayLabels = labels.map((label, index) => 
    index % labelInterval === 0 ? label : ''
  );

  const chartData = {
    labels: displayLabels,
    datasets: [{
      data: prices,
      color: () => isPositive ? '#00C805' : '#FF5000',
      strokeWidth: 2,
    }],
  };

  return (
    <View>
      {showTimeframeSelector && (
        <TimeframeSelector
          selected={selectedTimeframe}
          onSelect={setSelectedTimeframe}
        />
      )}
      <View style={styles.container}>
        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 32}
          height={200}
          chartConfig={{
            backgroundColor: '#000',
            backgroundGradientFrom: '#000',
            backgroundGradientTo: '#000',
            decimalPlaces: 0,
            color: (opacity = 1) => isPositive ? `rgba(0, 200, 5, ${opacity})` : `rgba(255, 80, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '0',
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#1a1a1a',
              strokeWidth: 1,
            },
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          formatYLabel={(value) => `$${(parseFloat(value) / 1000).toFixed(0)}k`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chart: {
    borderRadius: 12,
  },
  placeholder: {
    height: 200,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPositive: {
    backgroundColor: 'rgba(0, 200, 5, 0.1)',
  },
  chartNegative: {
    backgroundColor: 'rgba(255, 80, 0, 0.1)',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
});