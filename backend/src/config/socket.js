import { Server } from 'socket.io';

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

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join a room (e.g. for collaborative editing)
    socket.on('join:room', (roomId) => {
      socket.join(roomId);
      console.log(`👤 Socket ${socket.id} joined room: ${roomId}`);
      socket.to(roomId).emit('user:joined', { socketId: socket.id });
    });

    // Leave a room
    socket.on('leave:room', (roomId) => {
      socket.leave(roomId);
      console.log(`👤 Socket ${socket.id} left room: ${roomId}`);
      socket.to(roomId).emit('user:left', { socketId: socket.id });
    });

    // Handle document changes (collaborative editing)
    socket.on('document:change', ({ roomId, delta }) => {
      socket.to(roomId).emit('document:update', { delta, socketId: socket.id });
    });

    // Handle cursor position updates
    socket.on('cursor:move', ({ roomId, cursor }) => {
      socket.to(roomId).emit('cursor:update', { cursor, socketId: socket.id });
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
