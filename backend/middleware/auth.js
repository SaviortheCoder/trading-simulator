// ============================================
// AUTHENTICATION MIDDLEWARE - Protect routes
// ============================================

const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt');
const User = require('../models/User');

// ============================================
// MAIN AUTH MIDDLEWARE
// ============================================

/**
 * Middleware to verify user is authenticated
 * Checks for valid access token in Authorization header
 * Attaches user object to req.user if valid
 * 
 * Usage: app.get('/protected-route', authenticate, (req, res) => { ... })
 */
async function authenticate(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No access token provided'
      });
    }
    
    // Verify token
    const decoded = verifyAccessToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        message: 'Please login again'
      });
    }
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }
    
    // Check if user account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account deactivated',
        message: 'Your account has been deactivated'
      });
    }
    
    // Attach user to request object (available in route handlers)
    req.user = user;
    req.userId = user._id;
    
    // Continue to next middleware/route handler
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
}

// ============================================
// OPTIONAL AUTH MIDDLEWARE
// ============================================

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block if invalid
 * Useful for routes that work with or without authentication
 * 
 * Usage: app.get('/public-or-private-route', optionalAuth, (req, res) => { ... })
 */
async function optionalAuth(req, res, next) {
  try {
    // Extract token
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    // If no token, continue without user
    if (!token) {
      req.user = null;
      req.userId = null;
      return next();
    }
    
    // Verify token
    const decoded = verifyAccessToken(token);
    
    // If invalid token, continue without user
    if (!decoded) {
      req.user = null;
      req.userId = null;
      return next();
    }
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isActive) {
      req.user = user;
      req.userId = user._id;
    } else {
      req.user = null;
      req.userId = null;
    }
    
    next();
    
  } catch (error) {
    // On error, continue without user
    console.error('Optional auth error:', error);
    req.user = null;
    req.userId = null;
    next();
  }
}

// ============================================
// ROLE-BASED AUTHORIZATION
// ============================================

/**
 * Check if user has admin role (for future use)
 * Note: We haven't added roles to User model yet,
 * but this is here for when we need it
 * 
 * Usage: app.delete('/admin-only', authenticate, requireAdmin, (req, res) => { ... })
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  // Check if user has admin role (you'd add this field to User model)
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }
  
  next();
}

// ============================================
// EMAIL VERIFICATION CHECK
// ============================================

/**
 * Require user to have verified email
 * 
 * Usage: app.post('/verified-users-only', authenticate, requireVerified, (req, res) => { ... })
 */
function requireVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      error: 'Email verification required',
      message: 'Please verify your email address'
    });
  }
  
  next();
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
  requireVerified
};