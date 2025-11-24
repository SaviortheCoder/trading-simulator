// ============================================
// JWT UTILITY - Generate and verify JWT tokens
// ============================================

const jwt = require('jsonwebtoken');

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate an Access Token (short-lived, 15 minutes)
 * Used for authenticating API requests
 * 
 * @param {String} userId - MongoDB user ID
 * @returns {String} JWT token
 */
function generateAccessToken(userId) {
  // Create token payload (data stored inside token)
  const payload = {
    userId: userId,
    type: 'access'
  };
  
  // Sign the token with secret key and set expiration
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,           // Secret key from .env
    { expiresIn: '15m' }              // Expires in 15 minutes
  );
}

/**
 * Generate a Refresh Token (long-lived, 7 days)
 * Used to get new access tokens without logging in again
 * 
 * @param {String} userId - MongoDB user ID
 * @returns {String} JWT token
 */
function generateRefreshToken(userId) {
  // Create token payload
  const payload = {
    userId: userId,
    type: 'refresh'
  };
  
  // Sign the token with different secret key
  return jwt.sign(
    payload,
    process.env.REFRESH_TOKEN_SECRET,  // Different secret from .env
    { expiresIn: '7d' }                // Expires in 7 days
  );
}

// ============================================
// TOKEN VERIFICATION
// ============================================

/**
 * Verify a token (access or refresh)
 * Returns the decoded payload if valid, null if invalid
 * 
 * @param {String} token - JWT token to verify
 * @param {String} secret - Secret key to verify against
 * @returns {Object|null} Decoded payload or null
 */
function verifyToken(token, secret) {
  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, secret);
    return decoded;
  } catch (error) {
    // Token is invalid, expired, or malformed
    console.error('Token verification failed:', error.message);
    return null;
  }
}

/**
 * Verify an Access Token specifically
 * 
 * @param {String} token - Access token to verify
 * @returns {Object|null} Decoded payload or null
 */
function verifyAccessToken(token) {
  return verifyToken(token, process.env.JWT_SECRET);
}

/**
 * Verify a Refresh Token specifically
 * 
 * @param {String} token - Refresh token to verify
 * @returns {Object|null} Decoded payload or null
 */
function verifyRefreshToken(token) {
  return verifyToken(token, process.env.REFRESH_TOKEN_SECRET);
}

// ============================================
// TOKEN EXTRACTION
// ============================================

/**
 * Extract token from Authorization header
 * Header format: "Bearer <token>"
 * 
 * @param {String} authHeader - Authorization header value
 * @returns {String|null} Token or null
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }
  
  // Check if header starts with "Bearer "
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  // Extract token (remove "Bearer " prefix)
  const token = authHeader.substring(7);
  return token || null;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader
};