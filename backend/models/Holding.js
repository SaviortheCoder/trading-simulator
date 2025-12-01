// ============================================
// HOLDING MODEL - User's stock/crypto positions
// ============================================

const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema({
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
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  avgBuyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  currentPrice: {
    type: Number,
    required: true,
    min: 0
  },
  currentValue: {
    type: Number,
    required: true,
    min: 0
  },
  profitLoss: {
    type: Number,
    required: true
  },
  profitLossPercent: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Compound index for user + symbol lookup
holdingSchema.index({ userId: 1, symbol: 1 }, { unique: true });

// Index for user + type lookup (for crypto/stock filtering)
holdingSchema.index({ userId: 1, type: 1 });

module.exports = mongoose.model('Holding', holdingSchema);