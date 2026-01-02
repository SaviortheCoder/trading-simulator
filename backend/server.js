// ============================================
// IMPORTS - External packages and modules
// ============================================

// Express: Web framework for building REST APIs
const express = require('express');

// Mongoose: MongoDB object modeling tool
const mongoose = require('mongoose');

// HTTP: Node.js built-in module for creating HTTP server
const http = require('http');

// Socket.io: Real-time bidirectional event-based communication
const socketIO = require('socket.io');

// CORS: Enable Cross-Origin Resource Sharing (allows web/mobile to call API)
const cors = require('cors');

// Dotenv: Load environment variables from .env file
require('dotenv').config();

// ============================================
// APP INITIALIZATION
// ============================================

// Create Express application instance
const app = express();

// Create HTTP server (needed for Socket.io)
const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = socketIO(server, {
  cors: {
    // Allow requests from Next.js (web) and Expo (mobile)
    origin: [
      'http://localhost:3000',  // Next.js web app
      'http://localhost:19006', // Expo web
      'http://localhost:19000', // Expo mobile
      'exp://localhost:19000'   // Expo mobile (alternate)
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ============================================
// MIDDLEWARE - Functions that process requests before routes
// ============================================

// CORS: Allow requests from web and mobile apps
app.use(cors({
  origin: [
    'http://localhost:3000',  // Next.js web app
    'http://localhost:19006', // Expo web
    'http://localhost:19000', // Expo mobile
    'exp://localhost:19000'   // Expo mobile (alternate)
  ],
  credentials: true
}));

// Body Parser: Parse incoming JSON requests (makes req.body available)
app.use(express.json());

// Body Parser: Parse URL-encoded data (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Request Logger: Log all incoming requests (helpful for debugging)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.ip;
  
  console.log(`[${timestamp}] ${method} ${path} - IP: ${ip}`);
  next(); // Pass control to next middleware
});

// ============================================
// DATABASE CONNECTION
// ============================================

// Connect to MongoDB using connection string from .env file
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,      // Use new MongoDB connection string parser
  useUnifiedTopology: true    // Use new Server Discovery and Monitoring engine
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
  console.log(`📦 Database: ${mongoose.connection.name}`);
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message);
  console.error('💡 Make sure MongoDB is running and connection string is correct');
  process.exit(1); // Exit process if database connection fails
});

// Monitor MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// ============================================
// SOCKET.IO - Real-time WebSocket connections
// ============================================

// Track connected clients
let connectedClients = 0;

// Handle new Socket.io connections
io.on('connection', (socket) => {
  connectedClients++;
  console.log(`🔌 New client connected: ${socket.id}`);
  console.log(`👥 Total connected clients: ${connectedClients}`);
  
  // Send welcome message to the connected client
  socket.emit('connected', {
    message: 'Connected to trading simulator server',
    clientId: socket.id,
    timestamp: new Date().toISOString()
  });
  
  // Handle client disconnect
  socket.on('disconnect', () => {
    connectedClients--;
    console.log(`🔌 Client disconnected: ${socket.id}`);
    console.log(`👥 Total connected clients: ${connectedClients}`);
  });
  
  // Handle subscription to price updates for specific symbols
  socket.on('subscribe', (symbols) => {
    if (!Array.isArray(symbols)) {
      socket.emit('error', { message: 'Symbols must be an array' });
      return;
    }
    
    console.log(`📊 Client ${socket.id} subscribed to: ${symbols.join(', ')}`);
    
    // Join socket rooms for each symbol (for targeted broadcasting)
    symbols.forEach(symbol => {
      socket.join(`price:${symbol}`);
    });
    
    // Send confirmation
    socket.emit('subscribed', { symbols, timestamp: new Date().toISOString() });
  });
  
  // Handle unsubscription from price updates
  socket.on('unsubscribe', (symbols) => {
    if (!Array.isArray(symbols)) {
      socket.emit('error', { message: 'Symbols must be an array' });
      return;
    }
    
    console.log(`📊 Client ${socket.id} unsubscribed from: ${symbols.join(', ')}`);
    
    // Leave socket rooms
    symbols.forEach(symbol => {
      socket.leave(`price:${symbol}`);
    });
    
    // Send confirmation
    socket.emit('unsubscribed', { symbols, timestamp: new Date().toISOString() });
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error from ${socket.id}:`, error);
  });
});

// Make io instance available globally (so routes can emit events)
app.set('io', io);

// Helper function to broadcast price updates (can be used by routes/services)
function broadcastPriceUpdate(symbol, data) {
  io.to(`price:${symbol}`).emit('priceUpdate', {
    symbol,
    ...data,
    timestamp: new Date().toISOString()
  });
}

// Make broadcast function available
app.set('broadcastPriceUpdate', broadcastPriceUpdate);

// ============================================
// ROUTES - API endpoints
// ============================================

// Root endpoint - API information
app.get('/', (req, res) => {
  res.json({
    name: 'Trading Simulator API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      status: '/api/status',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me'
      },
      portfolio: '/api/portfolio/*',
      trade: '/api/trade/*',
      prices: '/api/prices/*',
      watchlist: '/api/watchlist/*',
      historical: '/api/historical/*'
    },
    documentation: 'Coming soon...',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint (test if server is running)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    uptime: process.uptime(), // Server uptime in seconds
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    connectedClients: connectedClients,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    server: 'online',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    websocket: 'active',
    connectedClients: connectedClients,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// IMPORT ROUTES
// ============================================

const authRoutes = require('./routes/auth');
const priceRoutes = require('./routes/prices');
const tradeRoutes = require('./routes/trade');
const portfolioRoutes = require('./routes/portfolio');
const watchlistRoutes = require('./routes/watchlist');
const authMiddleware = require('./middleware/auth');
const historicalRoutes = require('./routes/historical');

// ============================================
// USE ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/trade', authMiddleware, tradeRoutes);
app.use('/api/portfolio', authMiddleware, portfolioRoutes);
app.use('/api/watchlist', authMiddleware, watchlistRoutes);
app.use('/api/historical', historicalRoutes);

// ============================================
// ERROR HANDLING - Catch-all error handlers
// ============================================

// 404 Handler: Route not found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
    message: `Cannot ${req.method} ${req.path}`,
    availableRoutes: {
      root: 'GET /',
      health: 'GET /health',
      status: 'GET /api/status',
      auth: 'POST /api/auth/register, POST /api/auth/login, etc.',
      historical: 'GET /api/historical/portfolio, GET /api/historical/stock/:symbol, etc.'
    },
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler: Catch all errors
app.use((err, req, res, next) => {
  // Log error details
  console.error('❌ Error caught by global handler:');
  console.error('   Path:', req.path);
  console.error('   Method:', req.method);
  console.error('   Error:', err.message);
  console.error('   Stack:', err.stack);
  
  // Send error response
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    path: req.path,
    method: req.method,
    // Only send stack trace in development mode (security)
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// ============================================
// START SERVER
// ============================================

// Use port 3001 (or from environment variable)
const PORT = process.env.PORT || 3001;

// Try to start server on specified port
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  🚀 Trading Simulator Server Started Successfully!        ║
║                                                            ║
║  📡 Server running on: http://localhost:${PORT}             ║
║  📱 Mobile access: http://10.0.0.5:${PORT}                  ║
║  🔌 WebSocket ready for connections                        ║
║  📊 Environment: ${(process.env.NODE_ENV || 'development').padEnd(37)} ║
║  📦 Database: ${mongoose.connection.name ? mongoose.connection.name.padEnd(43) : 'connecting...'.padEnd(43)} ║
║                                                            ║
║  Available endpoints:                                      ║
║  • GET  /              - API information                   ║
║  • GET  /health        - Health check                      ║
║  • GET  /api/status    - Detailed status                   ║
║  • POST /api/auth/*    - Authentication                    ║
║  • GET  /api/prices/*  - Price data                        ║
║  • POST /api/trade/*   - Trading operations                ║
║  • GET  /api/portfolio/* - Portfolio data                  ║
║  • GET  /api/watchlist/* - Watchlist operations            ║
║  • GET  /api/historical/* - Historical price data          ║
║                                                            ║
║  Press Ctrl+C to stop the server                           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
}).on('error', (err) => {
  // Handle port already in use error
  if (err.code === 'EADDRINUSE') {
    console.error(`
❌ ERROR: Port ${PORT} is already in use!
    
💡 Solutions:
   1. Kill the process using port ${PORT}:
      • macOS/Linux: lsof -ti:${PORT} | xargs kill -9
      • Windows: netstat -ano | findstr :${PORT} then taskkill /PID <PID> /F
   
   2. Use a different port by changing PORT in .env file
   
   3. Wait a moment and try again (port might be releasing)
`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});

// ============================================
// GRACEFUL SHUTDOWN - Clean up on exit
// ============================================

// Handle Ctrl+C (SIGINT)
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Received SIGINT (Ctrl+C). Shutting down gracefully...');
  
  try {
    // Close Socket.io connections
    io.close(() => {
      console.log('✅ All WebSocket connections closed');
    });
    
    // Close database connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    // Close server
    server.close(() => {
      console.log('✅ HTTP server closed');
      console.log('👋 Goodbye!\n');
      process.exit(0);
    });
    
    // Force close after 10 seconds
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle SIGTERM (e.g., from Heroku, Docker)
process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  
  try {
    io.close();
    await mongoose.connection.close();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Handle uncaught exceptions (unexpected errors)
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Stack trace:', error.stack);
  
  // Close server and exit
  server.close(() => {
    process.exit(1);
  });
  
  // Force exit after 1 second if server won't close
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections (promises without .catch())
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION! Shutting down...');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  
  // Close server and exit
  server.close(() => {
    process.exit(1);
  });
  
  // Force exit after 1 second if server won't close
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Export app and server for testing
module.exports = { app, server, io };