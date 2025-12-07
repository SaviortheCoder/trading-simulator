// ============================================
// UPDATED TRANSACTION MODEL - With Realized P&L
// ============================================
// Location: backend/models/Transaction.js
// Replace your existing Transaction.js with this file

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    enum: ['buy', 'sell'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  assetType: {
    type: String,
    enum: ['stock', 'crypto'],
    default: 'stock',
  },
  // NEW FIELDS FOR REALIZED P&L
  realizedPL: {
    type: Number,
    default: null,  // Only populated for sell transactions
  },
  realizedPLPercent: {
    type: Number,
    default: null,  // Only populated for sell transactions
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Transaction', transactionSchema);
