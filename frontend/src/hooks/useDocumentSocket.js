import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook for real-time document collaboration via WebSocket.
 *
 * @param {string} documentId
 * @param {object} handlers - { onContentChange, onTitleChange }
 * @returns {{
 *   activeUsers: Array<{user_id, user_name}>,
 *   sendContentChange: (content: string) => void,
 *   sendTitleChange: (title: string) => void,
 *   connected: boolean,
 * }}
 */
export function useDocumentSocket(documentId, handlers) {
  const [activeUsers, setActiveUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const handlersRef = useRef(handlers);

  // Keep the latest handlers without re-connecting.
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!documentId) return undefined;
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const backend = process.env.REACT_APP_BACKEND_URL || '';
    const wsBase = backend.replace(/^http/, 'ws');
    const url = `${wsBase}/api/ws/documents/${documentId}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (_e) {
        return;
      }
      const h = handlersRef.current || {};
      switch (msg.type) {
        case 'active_users':
          setActiveUsers(msg.users || []);
          break;
        case 'content_change':
          if (h.onContentChange) h.onContentChange(msg.content, msg);
          break;
        case 'title_change':
          if (h.onTitleChange) h.onTitleChange(msg.title, msg);
          break;
        default:
          break;
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [documentId]);

  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  const sendContentChange = useCallback(
    (content) => send({ type: 'content_change', content }),
    [send]
  );
  const sendTitleChange = useCallback(
    (title) => send({ type: 'title_change', title }),
    [send]
  );

  return { activeUsers, sendContentChange, sendTitleChange, connected };
}
