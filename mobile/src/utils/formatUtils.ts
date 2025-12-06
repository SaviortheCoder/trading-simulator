// ============================================
// FORMAT UTILS - Number and currency formatting
// ============================================

/**
 * Format a number as currency with commas and 2 decimal places
 * @param value - The number to format
 * @param includeSign - Whether to include + for positive numbers
 * @returns Formatted string like "$1,234.56" or "+$1,234.56"
 */
export const formatCurrency = (value: number, includeSign: boolean = false): string => {
    const formatted = value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    if (includeSign && value > 0) {
      return `+$${formatted}`;
    }
    
    return `$${formatted}`;
  };
  
  /**
   * Format a number with commas (no dollar sign)
   * @param value - The number to format
   * @param decimals - Number of decimal places (default 2)
   * @returns Formatted string like "1,234.56"
   */
  export const formatNumber = (value: number, decimals: number = 2): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };
  
  /**
   * Format a percentage
   * @param value - The percentage value (e.g., 5.5 for 5.5%)
   * @param includeSign - Whether to include + for positive numbers
   * @returns Formatted string like "+5.50%" or "-5.50%"
   */
  export const formatPercent = (value: number, includeSign: boolean = true): string => {
    const sign = includeSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };
  
  /**
   * Format crypto quantity (up to 8 decimals, removes trailing zeros)
   * @param value - The quantity to format
   * @returns Formatted string like "0.12345678" or "1.5"
   */
  export const formatCryptoQuantity = (value: number): string => {
    // Format to 8 decimals, then remove trailing zeros
    return value.toFixed(8).replace(/\.?0+$/, '');
  };
  
  /**
   * Format large numbers with K, M, B suffixes
   * @param value - The number to format
   * @returns Formatted string like "1.2K", "5.3M", "2.1B"
   */
  export const formatCompact = (value: number): string => {
    if (value >= 1e9) {
      return `${(value / 1e9).toFixed(1)}B`;
    }
    if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    }
    if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };