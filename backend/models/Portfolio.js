// ============================================
// PORTFOLIO MODEL - Stores user's stock/crypto holdings
// (stock/crypto holdings)
// ============================================

const mongoose = require('mongoose');

// Define the Portfolio schema
const portfolioSchema = new mongoose.Schema({
  
  // ============================================
  // USER REFERENCE
  // ============================================
  
  // Reference to the User who owns this holding
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
    uppercase: true,          // Store as uppercase for consistency
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
  // HOLDING DETAILS
  // ============================================
  
  // Number of shares/coins owned
  quantity: { 
    type: Number, 
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  
  // Average price paid per unit (weighted average)
  // If you buy 10 shares at $100, then 10 more at $120,
  // avgBuyPrice = (10*100 + 10*120) / 20 = $110
  avgBuyPrice: { 
    type: Number, 
    required: [true, 'Average buy price is required'],
    min: [0, 'Average buy price cannot be negative']
  },
  
  // ============================================
  // CURRENT VALUES (updated in real-time)
  // ============================================
  
  // Current market price per unit
  currentPrice: { 
    type: Number, 
    required: [true, 'Current price is required'],
    min: [0, 'Current price cannot be negative']
  },
  
  // Total amount invested (quantity * avgBuyPrice)
  totalCost: { 
    type: Number,
    default: 0
  },
  
  // Current market value (quantity * currentPrice)
  currentValue: { 
    type: Number,
    default: 0
  },
  
  // Profit or loss in dollars (currentValue - totalCost)
  profitLoss: { 
    type: Number,
    default: 0
  },
  
  // Profit or loss as percentage ((profitLoss / totalCost) * 100)
  profitLossPercent: { 
    type: Number,
    default: 0
  },
  
  // ============================================
  // TIMESTAMPS
  // ============================================
  
  // When this holding was first created (first purchase)
  firstBoughtAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Last time this document was updated
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
  
}, {
  // Mongoose options
  timestamps: true  // Automatically manage createdAt and updatedAt
});

// ============================================
// PRE-SAVE MIDDLEWARE (automatic calculations)
// ============================================

// Calculate all values before saving
portfolioSchema.pre('save', function(next) {
  // Calculate total cost (what you paid)
  this.totalCost = this.quantity * this.avgBuyPrice;
  
  // Calculate current value (what it's worth now)
  this.currentValue = this.quantity * this.currentPrice;
  
  // Calculate profit/loss in dollars
  this.profitLoss = this.currentValue - this.totalCost;
  
  // Calculate profit/loss percentage
  if (this.totalCost > 0) {
    this.profitLossPercent = ((this.profitLoss / this.totalCost) * 100).toFixed(2);
  } else {
    this.profitLossPercent = 0;
  }
  
  // Update timestamp
  this.lastUpdated = new Date();
  
  next();
});

// ============================================
// METHODS (instance methods)
// ============================================

// Update current price and recalculate values
portfolioSchema.methods.updatePrice = function(newPrice) {
  this.currentPrice = newPrice;
  return this.save();  // This will trigger pre-save middleware
};

// Add more shares to this holding (buying more)
portfolioSchema.methods.addShares = function(quantity, price) {
  // Calculate new average buy price (weighted average)
  const totalInvested = (this.quantity * this.avgBuyPrice) + (quantity * price);
  const totalShares = this.quantity + quantity;
  
  this.avgBuyPrice = totalInvested / totalShares;
  this.quantity = totalShares;
  
  return this.save();
};

// Remove shares from this holding (selling)
portfolioSchema.methods.removeShares = function(quantity) {
  this.quantity -= quantity;
  
  // If quantity reaches 0, this holding should be deleted
  if (this.quantity <= 0) {
    return this.deleteOne();
  }
  
  return this.save();
};

// ============================================
// STATICS (model-level methods)
// ============================================

// Get user's entire portfolio
portfolioSchema.statics.getUserPortfolio = function(userId) {
  return this.find({ userId }).sort({ currentValue: -1 });
};

// Get user's total portfolio value
portfolioSchema.statics.getUserPortfolioValue = async function(userId) {
  const holdings = await this.find({ userId });
  return holdings.reduce((total, holding) => total + holding.currentValue, 0);
};

// ============================================
// INDEXES (for faster queries)
// ============================================

// Compound index: userId + symbol (unique combination)
// A user can only have one holding per symbol
portfolioSchema.index({ userId: 1, symbol: 1 }, { unique: true });

// Index for sorting by value
portfolioSchema.index({ currentValue: -1 });

// Index for filtering by type
portfolioSchema.index({ type: 1 });

// ============================================
// EXPORT MODEL
// ============================================

module.exports = mongoose.model('Portfolio', portfolioSchema);