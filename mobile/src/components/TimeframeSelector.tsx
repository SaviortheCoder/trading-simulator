import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type Timeframe = 'live' | '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

interface TimeframeSelectorProps {
  selected: Timeframe;
  onSelect: (timeframe: Timeframe) => void;
}

const timeframes: Timeframe[] = ['live', '1D', '1W', '1M', '3M', '6M', '1Y'];

export default function TimeframeSelector({ selected, onSelect }: TimeframeSelectorProps) {
  return (
    <View style={styles.container}>
      {timeframes.map((tf) => (
        <TouchableOpacity
          key={tf}
          style={[
            styles.button,
            selected === tf && styles.buttonActive,
          ]}
          onPress={() => onSelect(tf)}
        >
          <Text
            style={[
              styles.buttonText,
              selected === tf && styles.buttonTextActive,
            ]}
          >
            {tf}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  buttonActive: {
    backgroundColor: '#00C805',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  buttonTextActive: {
    color: '#000',
  },
});