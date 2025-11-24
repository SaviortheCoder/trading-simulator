// ============================================
// TRANSACTION MODEL - Stores all buy/sell trades
// (buy/sell history)
// ============================================

const mongoose = require('mongoose');

// Define the Transaction schema
const transactionSchema = new mongoose.Schema({
  
  // ============================================
  // USER REFERENCE
  // ============================================
  
  // Reference to the User who made this transaction
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',              // References the User model
    required: [true, 'User ID is required'],
    index: true               // Index for faster queries
  },
  
  // ============================================
  // ASSET INFORMATION
  // ============================================
  
  // Stock/Crypto symbol (e.g., "AAPL", "BTCUSDT")
  symbol: { 
    type: String, 
    required: [true, 'Symbol is required'],
    uppercase: true,          // Store as uppercase
    trim: true,
    index: true               // Index for faster symbol lookups
  },
  
  // Human-readable name (e.g., "Apple Inc.", "Bitcoin")
  name: { 
    type: String, 
    required: [true, 'Asset name is required'],
    trim: true
  },
  
  // Type of asset: "stock" or "crypto"
  type: { 
    type: String, 
    enum: ['stock', 'crypto'],
    required: [true, 'Asset type is required']
  },
  
  // ============================================
  // TRANSACTION DETAILS
  // ============================================
  
  // Action type: "buy" or "sell"
  action: { 
    type: String, 
    enum: ['buy', 'sell'],
    required: [true, 'Action is required']
  },
  
  // Order type: how the trade was executed
  orderType: { 
    type: String, 
    enum: ['market', 'limit', 'stop-loss'],
    default: 'market'
    // market = instant execution at current price
    // limit = execute when price reaches target
    // stop-loss = sell when price drops to stop price
  },
  
  // Number of shares/coins traded
  quantity: { 
    type: Number, 
    required: [true, 'Quantity is required'],
    min: [0.00000001, 'Quantity must be positive']
  },
  
  // Price per unit at time of transaction
  price: { 
    type: Number, 
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  
  // Total amount (quantity * price)
  totalAmount: { 
    type: Number, 
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  
  // ============================================
  // ORDER STATUS
  // ============================================
  
  // Transaction status
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'cancelled', 'failed'],
    default: 'completed'
    // pending = waiting to execute (limit/stop-loss orders)
    // completed = successfully executed
    // cancelled = user cancelled the order
    // failed = execution failed (insufficient funds, etc.)
  },
  
  // ============================================
  // LIMIT & STOP-LOSS ORDER FIELDS
  // ============================================
  
  // Target price for limit orders
  // Order executes when market price reaches this level
  targetPrice: { 
    type: Number,
    default: null,
    min: [0, 'Target price cannot be negative']
  },
  
  // Stop price for stop-loss orders
  // Order executes when market price drops to this level
  stopPrice: { 
    type: Number,
    default: null,
    min: [0, 'Stop price cannot be negative']
  },
  
  // When does this order expire? (for pending orders)
  expiresAt: { 
    type: Date,
    default: null
  },
  
  // ============================================
  // ADDITIONAL DETAILS
  // ============================================
  
  // Trading fee (if any) - currently 0 for simulator
  fee: { 
    type: Number, 
    default: 0,
    min: [0, 'Fee cannot be negative']
  },
  
  // Optional notes about this transaction
  notes: { 
    type: String,
    default: '',
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  
  // ============================================
  // TIMESTAMPS
  // ============================================
  
  // When this transaction occurred
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true               // Index for sorting by date
  }
  
}, {
  // Mongoose options
  timestamps: true  // Automatically adds createdAt and updatedAt
});

// ============================================
// PRE-SAVE MIDDLEWARE (automatic calculations)
// ============================================

// Calculate total amount before saving
transactionSchema.pre('save', function(next) {
  // Only calculate if quantity or price changed
  if (this.isModified('quantity') || this.isModified('price')) {
    this.totalAmount = this.quantity * this.price;
  }
  next();
});

// ============================================
// METHODS (instance methods)
// ============================================

// Mark transaction as completed
transactionSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

// Cancel a pending transaction
transactionSchema.methods.cancel = function() {
  if (this.status !== 'pending') {
    throw new Error('Can only cancel pending transactions');
  }
  this.status = 'cancelled';
  return this.save();
};

// Mark transaction as failed
transactionSchema.methods.fail = function(reason) {
  this.status = 'failed';
  if (reason) {
    this.notes = reason;
  }
  return this.save();
};

// ============================================
// STATICS (model-level methods)
// ============================================

// Get all transactions for a user
transactionSchema.statics.getUserTransactions = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })  // Most recent first
    .limit(limit);
};

// Get transactions for a specific symbol
transactionSchema.statics.getSymbolTransactions = function(userId, symbol) {
  return this.find({ userId, symbol })
    .sort({ timestamp: -1 });
};

// Get user's buy transactions only
transactionSchema.statics.getUserBuys = function(userId) {
  return this.find({ userId, action: 'buy', status: 'completed' })
    .sort({ timestamp: -1 });
};

// Get user's sell transactions only
transactionSchema.statics.getUserSells = function(userId) {
  return this.find({ userId, action: 'sell', status: 'completed' })
    .sort({ timestamp: -1 });
};

// Get pending orders for a user
transactionSchema.statics.getPendingOrders = function(userId) {
  return this.find({ 
    userId, 
    status: 'pending',
    // Only get orders that haven't expired
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ timestamp: -1 });
};

// Get transactions within a date range
transactionSchema.statics.getTransactionsByDateRange = function(userId, startDate, endDate) {
  return this.find({
    userId,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

// Calculate total profit/loss for a symbol
transactionSchema.statics.calculateSymbolProfitLoss = async function(userId, symbol) {
  const transactions = await this.find({ 
    userId, 
    symbol, 
    status: 'completed' 
  });
  
  let totalBuyCost = 0;
  let totalSellRevenue = 0;
  
  transactions.forEach(transaction => {
    if (transaction.action === 'buy') {
      totalBuyCost += transaction.totalAmount;
    } else if (transaction.action === 'sell') {
      totalSellRevenue += transaction.totalAmount;
    }
  });
  
  return {
    totalBuyCost,
    totalSellRevenue,
    profitLoss: totalSellRevenue - totalBuyCost,
    profitLossPercent: totalBuyCost > 0 
      ? ((totalSellRevenue - totalBuyCost) / totalBuyCost * 100).toFixed(2)
      : 0
  };
};

// ============================================
// INDEXES (for faster queries)
// ============================================

// Compound index: userId + timestamp (for user's transaction history)
transactionSchema.index({ userId: 1, timestamp: -1 });

// Compound index: userId + symbol (for symbol-specific history)
transactionSchema.index({ userId: 1, symbol: 1, timestamp: -1 });

// Index for pending orders
transactionSchema.index({ status: 1, expiresAt: 1 });

// Index for action type
transactionSchema.index({ action: 1 });

// ============================================
// EXPORT MODEL
// ============================================

module.exports = mongoose.model('Transaction', transactionSchema);