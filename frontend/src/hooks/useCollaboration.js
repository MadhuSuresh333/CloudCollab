import { useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext.jsx';

/**
 * Custom hook to manage socket events for collaborative editing.
 * @param {string} roomId - The room/document ID to join
 * @param {object} handlers - Event handler callbacks
 */
const useCollaboration = (roomId, handlers = {}) => {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !roomId) return;

    socket.emit('join:room', roomId);

    if (handlers.onUserJoined) socket.on('user:joined', handlers.onUserJoined);
    if (handlers.onUserLeft) socket.on('user:left', handlers.onUserLeft);
    if (handlers.onDocumentUpdate) socket.on('document:update', handlers.onDocumentUpdate);
    if (handlers.onCursorUpdate) socket.on('cursor:update', handlers.onCursorUpdate);

    return () => {
      socket.emit('leave:room', roomId);
      socket.off('user:joined');
      socket.off('user:left');
      socket.off('document:update');
      socket.off('cursor:update');
    };
  }, [socket, isConnected, roomId]);

  const sendChange = useCallback(
    (delta) => {
      if (socket && isConnected) {
        socket.emit('document:change', { roomId, delta });
      }
    },
    [socket, isConnected, roomId]
  );

  const sendCursor = useCallback(
    (cursor) => {
      if (socket && isConnected) {
        socket.emit('cursor:move', { roomId, cursor });
      }
    },
    [socket, isConnected, roomId]
  );

  return { sendChange, sendCursor, isConnected };
};

export default useCollaboration;
