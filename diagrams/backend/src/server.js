import { createServer } from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { initializeSocket } from './config/socket.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

// Connect to MongoDB and start listening
const startServer = async () => {
  try {
    await connectDB();

    httpServer.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`📡 HTTP:      http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO: ws://localhost:${PORT}`);
      console.log(`❤️  Health:    http://localhost:${PORT}/api/health`);
      console.log('═══════════════════════════════════════════');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

startServer();
