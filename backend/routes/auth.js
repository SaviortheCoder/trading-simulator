// ============================================
// AUTHENTICATION ROUTES - Register, Login, Logout
// UPDATED: Returns current Portfolio cash balance
// ============================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');  // ✅ ADDED
const Holding = require('../models/Holding');      // ✅ ADDED
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const authenticate = require('../middleware/auth');

// ============================================
// POST /api/auth/register - Create new user account
// ============================================

router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, device } = req.body;
    
    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email, password, first name, and last name are required'
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      cashBalance: 100000,
      portfolioValue: 0,
      totalValue: 100000
    });

    // ✅ CREATE PORTFOLIO FOR NEW USER
    const portfolio = await Portfolio.create({
      userId: user._id,
      cashBalance: 100000
    });
    
    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Save refresh token
    user.refreshTokens.push({
      token: refreshToken,
      device: device || 'web',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        cashBalance: portfolio.cashBalance,  // ✅ From Portfolio
        totalValue: portfolio.cashBalance     // ✅ From Portfolio
      },
      accessToken,
      refreshToken
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
});

// ============================================
// POST /api/auth/login - Login existing user
// ============================================

router.post('/login', async (req, res) => {
  try {
    const { email, password, device } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials'
      });
    }
    
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // ✅ GET CURRENT PORTFOLIO DATA
    let portfolio = await Portfolio.findOne({ userId: user._id });
    
    if (!portfolio) {
      // Create portfolio if it doesn't exist
      portfolio = await Portfolio.create({
        userId: user._id,
        cashBalance: 100000
      });
      console.log('✅ Created missing portfolio for user:', user._id);
    }

    // ✅ GET HOLDINGS FOR TOTAL VALUE
    const holdings = await Holding.find({ userId: user._id });
    const holdingsValue = holdings.reduce((total, holding) => {
      return total + (holding.quantity * holding.avgBuyPrice);
    }, 0);

    const totalValue = portfolio.cashBalance + holdingsValue;

    console.log(`💰 User ${user.email} portfolio:`, {
      cash: portfolio.cashBalance,
      holdings: holdingsValue,
      total: totalValue
    });
    
    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    // Save refresh token
    user.refreshTokens.push({
      token: refreshToken,
      device: device || 'web',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    user.lastLogin = new Date();
    await user.save();
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        cashBalance: portfolio.cashBalance,  // ✅ CURRENT VALUE FROM PORTFOLIO
        totalValue: totalValue                // ✅ REAL-TIME TOTAL
      },
      accessToken,
      refreshToken
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// ============================================
// POST /api/auth/refresh - Get new access token
// ============================================

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }
    
    const decoded = verifyRefreshToken(refreshToken);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
    
    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token not found'
      });
    }
    
    const newAccessToken = generateAccessToken(user._id);
    
    res.json({
      success: true,
      accessToken: newAccessToken
    });
    
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// ============================================
// POST /api/auth/logout - Logout user
// ============================================

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }
    
    const decoded = verifyRefreshToken(refreshToken);
    
    if (decoded) {
      await User.findByIdAndUpdate(decoded.userId, {
        $pull: { refreshTokens: { token: refreshToken } }
      });
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// ============================================
// GET /api/auth/me - Get current user info
// ============================================

router.get('/me', authenticate, async (req, res) => {
  try {
    // ✅ GET CURRENT PORTFOLIO DATA
    let portfolio = await Portfolio.findOne({ userId: req.user._id });
    
    if (!portfolio) {
      portfolio = await Portfolio.create({
        userId: req.user._id,
        cashBalance: 100000
      });
    }

    // ✅ GET HOLDINGS FOR TOTAL VALUE
    const holdings = await Holding.find({ userId: req.user._id });
    const holdingsValue = holdings.reduce((total, holding) => {
      return total + (holding.quantity * holding.avgBuyPrice);
    }, 0);

    const totalValue = portfolio.cashBalance + holdingsValue;

    res.json({
      success: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        cashBalance: portfolio.cashBalance,  // ✅ CURRENT VALUE
        totalValue: totalValue                // ✅ REAL-TIME TOTAL
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info'
    });
  }
});

// ============================================
// EXPORT ROUTER
// ============================================

module.exports = router;