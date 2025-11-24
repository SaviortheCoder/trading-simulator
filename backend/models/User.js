// ============================================
// USER MODEL - Stores user account information
// (user accounts & balances)
// ============================================

const mongoose = require('mongoose');

// Define the User schema
const userSchema = new mongoose.Schema({
  
  // ============================================
  // BASIC INFORMATION
  // ============================================
  
  // Email address (unique identifier for login)
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,         // No two users can have same email
    lowercase: true,      // Store as lowercase for consistency
    trim: true,           // Remove whitespace
    match: [              // Validate email format
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address'
    ]
  },
  
  // Password (will be hashed with bcrypt before storing)
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  
  // First name
  firstName: { 
    type: String, 
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  
  // Last name
  lastName: { 
    type: String, 
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  
  // Username (optional, for social features later)
  username: { 
    type: String, 
    unique: true,         // Must be unique if provided
    sparse: true,         // Allow multiple null values (for users without username)
    trim: true,
    lowercase: true
  },
  
  // ============================================
  // PROFILE INFORMATION
  // ============================================
  
  // Profile avatar URL (optional)
  avatar: { 
    type: String, 
    default: null 
  },
  
  // User bio/description (optional)
  bio: { 
    type: String, 
    default: '',
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  
  // ============================================
  // TRADING ACCOUNT INFORMATION
  // ============================================
  
  // Available cash balance (starts at $100,000)
  cashBalance: { 
    type: Number, 
    default: 100000,      // Starting virtual money
    min: [0, 'Cash balance cannot be negative']
  },
  
  // Total value of all stock/crypto holdings
  portfolioValue: { 
    type: Number, 
    default: 0,
    min: [0, 'Portfolio value cannot be negative']
  },
  
  // Total account value (cash + portfolio)
  // This is calculated automatically
  totalValue: { 
    type: Number, 
    default: 100000,
    min: [0, 'Total value cannot be negative']
  },
  
  // Total profit or loss since account creation
  totalProfitLoss: { 
    type: Number, 
    default: 0 
  },
  
  // Profit/Loss as a percentage
  totalProfitLossPercent: { 
    type: Number, 
    default: 0 
  },
  
  // ============================================
  // USER SETTINGS & PREFERENCES
  // ============================================
  
  notifications: {
    // Email notifications enabled/disabled
    email: { 
      type: Boolean, 
      default: true 
    },
    
    // Push notifications enabled/disabled (for mobile)
    push: { 
      type: Boolean, 
      default: true 
    },
    
    // Price alert notifications enabled/disabled
    priceAlerts: { 
      type: Boolean, 
      default: true 
    }
  },
  
  // ============================================
  // SECURITY & AUTHENTICATION
  // ============================================
  
  // Array of refresh tokens (allows login from multiple devices)
  refreshTokens: [{ 
    token: {
      type: String,
      required: true
    },
    device: {
      type: String,         // 'web', 'ios', 'android'
      enum: ['web', 'ios', 'android'],
      default: 'web'
    },
    expiresAt: {
      type: Date,
      required: true
    }
  }],
  
  // ============================================
  // ACCOUNT STATUS
  // ============================================
  
  // Is account active? (for soft delete)
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Has user verified their email?
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  
  // Last login timestamp
  lastLogin: { 
    type: Date,
    default: null
  },
  
  // ============================================
  // TIMESTAMPS
  // ============================================
  
  // Account creation date
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Last update date
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
  
}, {
  // Mongoose options
  timestamps: true  // Automatically manage createdAt and updatedAt
});

// ============================================
// VIRTUAL FIELDS (computed properties)
// ============================================

// Full name virtual field (combines firstName + lastName)
// Usage: user.fullName
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// ============================================
// METHODS (instance methods - called on a user document)
// ============================================

// Method to update total value whenever cash or portfolio changes
userSchema.methods.updateTotalValue = function() {
  this.totalValue = this.cashBalance + this.portfolioValue;
  
  // Calculate profit/loss (starting balance was $100,000)
  const startingBalance = 100000;
  this.totalProfitLoss = this.totalValue - startingBalance;
  this.totalProfitLossPercent = ((this.totalProfitLoss / startingBalance) * 100).toFixed(2);
  
  return this.save();
};

// Method to check if user has enough cash for a purchase
userSchema.methods.hasEnoughCash = function(amount) {
  return this.cashBalance >= amount;
};

// ============================================
// PRE-SAVE MIDDLEWARE (runs before saving)
// ============================================

// Automatically update totalValue before saving
userSchema.pre('save', function(next) {
  // Only calculate if cash or portfolio changed
  if (this.isModified('cashBalance') || this.isModified('portfolioValue')) {
    this.totalValue = this.cashBalance + this.portfolioValue;
    
    // Calculate P&L
    const startingBalance = 100000;
    this.totalProfitLoss = this.totalValue - startingBalance;
    this.totalProfitLossPercent = ((this.totalProfitLoss / startingBalance) * 100).toFixed(2);
  }
  
  // Update the updatedAt timestamp
  this.updatedAt = new Date();
  
  next();
});

// ============================================
// INDEXES (for faster queries)
// ============================================

// Index on email for fast login queries
userSchema.index({ email: 1 });

// Index on username for fast profile lookups
userSchema.index({ username: 1 });

// Compound index for active users
userSchema.index({ isActive: 1, createdAt: -1 });

// ============================================
// EXPORT MODEL
// ============================================

// Create and export the User model
module.exports = mongoose.model('User', userSchema);