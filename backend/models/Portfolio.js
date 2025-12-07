// ============================================
// PORTFOLIO MODEL - User's Cash Balance ONLY
// This tracks how much cash the user has available
// ============================================

const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,  // One portfolio per user
    index: true
  },
  
  // Cash available for trading
  cashBalance: {
    type: Number,
    required: true,
    default: 100000,  // Starting balance: $100,000
    min: 0
  }
}, {
  timestamps: true  // createdAt, updatedAt
});

// Method to check if user can afford a purchase
portfolioSchema.methods.canAfford = function(amount) {
  return this.cashBalance >= amount;
};

// Method to deduct cash (when buying)
portfolioSchema.methods.deductCash = function(amount) {
  if (!this.canAfford(amount)) {
    throw new Error('Insufficient funds');
  }
  this.cashBalance -= amount;
  return this.save();
};

// Method to add cash (when selling)
portfolioSchema.methods.addCash = function(amount) {
  this.cashBalance += amount;
  return this.save();
};

module.exports = mongoose.model('Portfolio', portfolioSchema);