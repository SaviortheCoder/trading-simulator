// ============================================
// TRANSACTION MODEL - Trade history
// ============================================

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['stock', 'crypto'],
    required: true
  },
  action: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
transactionSchema.index({ userId: 1, symbol: 1 });
transactionSchema.index({ userId: 1, timestamp: -1 });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get all transactions for a specific user and symbol
 * @param {ObjectId} userId - User's ID
 * @param {String} symbol - Stock/Crypto symbol
 * @returns {Promise<Array>} - Array of transactions
 */
transactionSchema.statics.getSymbolTransactions = function(userId, symbol) {
  return this.find({ userId, symbol })
    .sort({ timestamp: -1 }) // Most recent first
    .exec();
};

/**
 * Get all transactions for a user
 * @param {ObjectId} userId - User's ID
 * @returns {Promise<Array>} - Array of transactions
 */
transactionSchema.statics.getUserTransactions = function(userId) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .exec();
};

module.exports = mongoose.model('Transaction', transactionSchema);