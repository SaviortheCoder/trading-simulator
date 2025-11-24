// ============================================
// WATCHLIST MODEL - User's watched assets
// ============================================

const mongoose = require('mongoose');

const watchlistItemSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['stock', 'crypto'],
    default: 'stock',
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const watchlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  items: [watchlistItemSchema],
}, {
  timestamps: true,
});

// Get or create watchlist for user
watchlistSchema.statics.getOrCreate = async function(userId) {
  let watchlist = await this.findOne({ userId });
  
  if (!watchlist) {
    watchlist = new this({ userId, items: [] });
    await watchlist.save();
  }
  
  return watchlist;
};

// Check if symbol exists in watchlist
watchlistSchema.methods.hasSymbol = function(symbol) {
  return this.items.some(item => 
    item.symbol.toUpperCase() === symbol.toUpperCase()
  );
};

// Add item to watchlist
watchlistSchema.methods.addItem = function(symbol, name, type = 'stock') {
  if (!this.hasSymbol(symbol)) {
    this.items.push({
      symbol: symbol.toUpperCase(),
      name,
      type,
    });
  }
  return this;
};

// Remove item from watchlist
watchlistSchema.methods.removeItem = function(symbol) {
  this.items = this.items.filter(item => 
    item.symbol.toUpperCase() !== symbol.toUpperCase()
  );
  return this;
};

module.exports = mongoose.model('Watchlist', watchlistSchema);