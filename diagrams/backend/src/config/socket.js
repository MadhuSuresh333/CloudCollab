import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let io;

/**
 * Initialize Socket.IO with the HTTP server.
 * @param {import('http').Server} httpServer
 * @returns {Server} The Socket.IO server instance
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Authenticate every socket connection using the same JWT used for REST calls
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id} (${socket.user?.name})`);

    // Join a room (e.g. for collaborative editing, a project board, or a workspace)
    socket.on('join:room', (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit('user:joined', {
        socketId: socket.id,
        user: { _id: socket.user._id, name: socket.user.name, avatar: socket.user.avatar },
      });
    });

    // Leave a room
    socket.on('leave:room', (roomId) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user:left', { socketId: socket.id, user: { _id: socket.user._id } });
    });

    // Handle document changes (collaborative editing)
    socket.on('document:change', ({ roomId, delta }) => {
      socket.to(roomId).emit('document:update', { delta, socketId: socket.id });
    });

    // Handle cursor position updates
    socket.on('cursor:move', ({ roomId, cursor }) => {
      socket.to(roomId).emit('cursor:update', { cursor, socketId: socket.id });
    });

    // Typing indicator for chat / comment threads
    socket.on('typing:start', ({ roomId }) => {
      socket.to(roomId).emit('typing:update', {
        userId: socket.user._id,
        name: socket.user.name,
        typing: true,
      });
    });

    socket.on('typing:stop', ({ roomId }) => {
      socket.to(roomId).emit('typing:update', {
        userId: socket.user._id,
        name: socket.user.name,
        typing: false,
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('🔌 Socket.IO initialized');
  return io;
};

/**
 * Get the current Socket.IO instance.
 * @returns {Server}
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Call initializeSocket first.');
  }
  return io;
};

export { initializeSocket, getIO };
